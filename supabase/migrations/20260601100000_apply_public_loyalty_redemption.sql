-- Bloco 2: apply loyalty redemption to public checkout orders after creation.
-- This keeps create_public_menu_order stable and updates the total before
-- online payment is generated.

CREATE OR REPLACE FUNCTION public.apply_public_loyalty_redemption(
  p_order_id uuid,
  p_requested_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_delivery_order_id uuid;
  v_delivery_fee numeric := 0;
  v_phone text;
  v_settings public.loyalty_program_settings%ROWTYPE;
  v_existing_redeem numeric := 0;
  v_balance numeric := 0;
  v_requested numeric := GREATEST(COALESCE(p_requested_amount, 0), 0);
  v_eligible_amount numeric := 0;
  v_max_redeem numeric := 0;
  v_discount numeric := 0;
  v_original_total numeric := 0;
  v_new_total numeric := 0;
BEGIN
  IF p_order_id IS NULL OR v_requested <= 0 THEN
    RETURN jsonb_build_object(
      'applied', false,
      'discount_amount', 0,
      'total', null,
      'reason', 'invalid_amount'
    );
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido nao encontrado.';
  END IF;

  IF auth.role() = 'anon' THEN
    IF v_order.source IS DISTINCT FROM 'cardapio'
       OR v_order.created_at < now() - interval '2 hours' THEN
      RAISE EXCEPTION 'Pedido publico indisponivel para resgate.';
    END IF;
  ELSIF auth.role() = 'authenticated' THEN
    IF NOT (
      public.is_super_admin(auth.uid())
      OR public.user_has_restaurant_permission(v_order.restaurant_id, 'orders_manage'::public.permission_type)
      OR public.user_has_restaurant_permission(v_order.restaurant_id, 'pdv_access'::public.permission_type)
    ) THEN
      RAISE EXCEPTION 'Sem permissao para aplicar resgate.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Sem permissao para aplicar resgate.';
  END IF;

  IF v_order.status IN ('finalizado', 'cancelado')
     OR v_order.payment_status IN ('paid', 'refunded', 'canceled') THEN
    RAISE EXCEPTION 'Pedido nao permite resgate neste status.';
  END IF;

  SELECT COALESCE(abs(sum(amount)), 0)
  INTO v_existing_redeem
  FROM public.loyalty_transactions
  WHERE restaurant_id = v_order.restaurant_id
    AND order_id = v_order.id
    AND type = 'redeem';

  IF v_existing_redeem > 0 THEN
    RETURN jsonb_build_object(
      'applied', true,
      'discount_amount', v_existing_redeem,
      'total', v_order.total,
      'idempotent_replay', true
    );
  END IF;

  v_phone := public.normalize_customer_phone(v_order.customer_phone);

  IF v_phone IS NULL THEN
    RETURN jsonb_build_object(
      'applied', false,
      'discount_amount', 0,
      'total', v_order.total,
      'reason', 'missing_phone'
    );
  END IF;

  SELECT *
  INTO v_settings
  FROM public.loyalty_program_settings
  WHERE restaurant_id = v_order.restaurant_id
    AND enabled = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'applied', false,
      'discount_amount', 0,
      'total', v_order.total,
      'reason', 'program_disabled'
    );
  END IF;

  SELECT d.id, COALESCE(d.delivery_fee, 0)
  INTO v_delivery_order_id, v_delivery_fee
  FROM public.delivery_orders d
  WHERE d.order_id = v_order.id
  LIMIT 1;

  SELECT COALESCE(sum(amount), 0)::numeric
  INTO v_balance
  FROM public.loyalty_transactions
  WHERE restaurant_id = v_order.restaurant_id
    AND phone_normalized = v_phone
    AND (expires_at IS NULL OR expires_at > now());

  v_original_total := COALESCE(v_order.total, 0);
  v_eligible_amount := GREATEST(v_original_total - COALESCE(v_delivery_fee, 0), 0);

  IF v_eligible_amount < COALESCE(v_settings.min_order_value, 0) THEN
    RETURN jsonb_build_object(
      'applied', false,
      'discount_amount', 0,
      'total', v_order.total,
      'reason', 'below_min_order'
    );
  END IF;

  v_max_redeem := LEAST(
    GREATEST(v_balance, 0),
    v_eligible_amount,
    round((v_eligible_amount * COALESCE(v_settings.max_redeem_percent, 0) / 100)::numeric, 2)
  );

  v_discount := LEAST(v_requested, v_max_redeem);

  IF v_discount <= 0 THEN
    RETURN jsonb_build_object(
      'applied', false,
      'discount_amount', 0,
      'total', v_order.total,
      'reason', 'no_balance'
    );
  END IF;

  v_new_total := GREATEST(v_original_total - v_discount, COALESCE(v_delivery_fee, 0));

  UPDATE public.orders
  SET total = v_new_total,
      updated_at = now()
  WHERE id = v_order.id;

  IF v_delivery_order_id IS NOT NULL THEN
    UPDATE public.delivery_orders
    SET total = v_new_total,
        updated_at = now()
    WHERE id = v_delivery_order_id;
  END IF;

  INSERT INTO public.loyalty_transactions (
    restaurant_id,
    phone_normalized,
    order_id,
    type,
    amount,
    description,
    metadata
  )
  VALUES (
    v_order.restaurant_id,
    v_phone,
    v_order.id,
    'redeem',
    -v_discount,
    'Resgate no checkout publico',
    jsonb_build_object(
      'original_total', v_original_total,
      'new_total', v_new_total,
      'delivery_fee', v_delivery_fee,
      'requested_amount', v_requested,
      'max_redeem_percent', v_settings.max_redeem_percent
    )
  );

  RETURN jsonb_build_object(
    'applied', true,
    'discount_amount', v_discount,
    'total', v_new_total,
    'original_total', v_original_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_public_loyalty_redemption(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_public_loyalty_redemption(uuid, numeric) TO anon, authenticated;

COMMENT ON FUNCTION public.apply_public_loyalty_redemption(uuid, numeric) IS
  'Aplica resgate de fidelidade em pedido publico recente, atualizando total antes do pagamento online.';
