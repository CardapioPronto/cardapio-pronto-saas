-- Harden public checkout integrity:
-- - delivery fee, minimum order and ETA come from restaurant settings
-- - payment methods and online payment availability are validated server-side
-- - simple business hours setting is enforced when configured
-- - public EXECUTE grants are removed from internal helper functions

CREATE OR REPLACE FUNCTION public.create_public_menu_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_fulfillment_type text;
  v_table_id uuid;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_payment_method text;
  v_change_for numeric;
  v_notes text;
  v_delivery_fee numeric := 0;
  v_min_order_value numeric := 0;
  v_estimated_minutes integer;
  v_items jsonb;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_observations text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_delivery_order_id uuid;
  v_order_number text;
  v_delivery_config jsonb := '{}'::jsonb;
  v_hours_config jsonb := '{}'::jsonb;
  v_delivery_enabled boolean := true;
  v_pickup_enabled boolean := true;
  v_allowed_payment_methods text[] := ARRAY['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']::text[];
  v_table_valid boolean := false;
  v_coupon_code text;
  v_coupon public.coupons%ROWTYPE;
  v_requires_online_payment boolean := false;
  v_payment_status text := 'not_required';
  v_online_enabled boolean := false;
  v_online_onboarding_status text;
  v_online_enabled_methods text[] := ARRAY[]::text[];
  v_online_allow_delivery boolean := false;
  v_online_allow_pickup boolean := false;
  v_online_allow_table boolean := false;
  v_online_allow_counter boolean := false;
  v_opening_time time;
  v_closing_time time;
  v_current_time time;
  v_is_open boolean := true;
BEGIN
  v_restaurant_id := NULLIF(payload->>'restaurant_id', '')::uuid;
  v_fulfillment_type := COALESCE(NULLIF(payload->>'fulfillment_type', ''), 'delivery');
  v_table_id := NULLIF(payload->>'table_id', '')::uuid;
  v_customer_name := btrim(COALESCE(payload->>'customer_name', ''));
  v_customer_phone := NULLIF(btrim(COALESCE(payload->>'customer_phone', '')), '');
  v_customer_email := NULLIF(lower(btrim(COALESCE(payload->>'customer_email', ''))), '');
  v_payment_method := NULLIF(payload->>'payment_method', '');
  v_change_for := NULLIF(payload->>'change_for', '')::numeric;
  v_notes := NULLIF(btrim(COALESCE(payload->>'notes', '')), '');
  v_coupon_code := upper(NULLIF(btrim(COALESCE(payload->>'coupon_code', '')), ''));
  v_items := payload->'items';

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado.';
  END IF;

  IF v_fulfillment_type NOT IN ('delivery', 'pickup', 'table', 'counter') THEN
    RAISE EXCEPTION 'Tipo de atendimento inválido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = v_restaurant_id
      AND COALESCE(r.active, true) = true
  ) THEN
    RAISE EXCEPTION 'Restaurante indisponível.';
  END IF;

  SELECT COALESCE(rs.setting_value, '{}'::jsonb)
  INTO v_delivery_config
  FROM public.restaurant_settings rs
  WHERE rs.restaurant_id = v_restaurant_id
    AND rs.setting_key = 'delivery_config';

  SELECT COALESCE(rs.setting_value, '{}'::jsonb)
  INTO v_hours_config
  FROM public.restaurant_settings rs
  WHERE rs.restaurant_id = v_restaurant_id
    AND rs.setting_key = 'hours';

  v_delivery_enabled := COALESCE((v_delivery_config->>'delivery_enabled')::boolean, true);
  v_pickup_enabled := COALESCE((v_delivery_config->>'pickup_enabled')::boolean, true);
  v_delivery_fee := GREATEST(COALESCE(NULLIF(v_delivery_config->>'delivery_fee', '')::numeric, 0), 0);
  v_min_order_value := GREATEST(COALESCE(NULLIF(v_delivery_config->>'min_order_value', '')::numeric, 0), 0);
  v_estimated_minutes := GREATEST(COALESCE(NULLIF(v_delivery_config->>'estimated_delivery_minutes', '')::integer, 45), 0);

  SELECT COALESCE(array_agg(method), ARRAY[]::text[])
  INTO v_allowed_payment_methods
  FROM jsonb_array_elements_text(COALESCE(v_delivery_config->'payment_methods', '[]'::jsonb)) AS method;

  IF COALESCE(array_length(v_allowed_payment_methods, 1), 0) = 0 THEN
    v_allowed_payment_methods := ARRAY['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']::text[];
  END IF;

  IF COALESCE(v_hours_config->>'opening_time', '') <> ''
     AND COALESCE(v_hours_config->>'closing_time', '') <> '' THEN
    v_opening_time := (v_hours_config->>'opening_time')::time;
    v_closing_time := (v_hours_config->>'closing_time')::time;
    v_current_time := (timezone('America/Sao_Paulo', now()))::time;

    IF v_opening_time <> v_closing_time THEN
      IF v_opening_time < v_closing_time THEN
        v_is_open := v_current_time >= v_opening_time AND v_current_time < v_closing_time;
      ELSE
        v_is_open := v_current_time >= v_opening_time OR v_current_time < v_closing_time;
      END IF;

      IF NOT v_is_open THEN
        RAISE EXCEPTION 'Restaurante fechado no momento.';
      END IF;
    END IF;
  END IF;

  IF v_fulfillment_type = 'delivery' AND NOT v_delivery_enabled THEN
    RAISE EXCEPTION 'Delivery indisponível no momento.';
  END IF;

  IF v_fulfillment_type IN ('pickup', 'counter') AND NOT v_pickup_enabled THEN
    RAISE EXCEPTION 'Retirada/balcão indisponível no momento.';
  END IF;

  IF v_customer_name = '' THEN
    v_customer_name := CASE
      WHEN v_fulfillment_type = 'table' THEN 'Cliente da mesa'
      WHEN v_fulfillment_type = 'counter' THEN 'Cliente balcão'
      ELSE 'Cliente'
    END;
  END IF;

  IF v_fulfillment_type IN ('delivery', 'pickup') AND COALESCE(v_customer_phone, '') = '' THEN
    RAISE EXCEPTION 'Telefone do cliente é obrigatório.';
  END IF;

  IF v_fulfillment_type = 'delivery' THEN
    IF btrim(COALESCE(payload#>>'{address,zip_code}', '')) = ''
       OR btrim(COALESCE(payload#>>'{address,street}', '')) = ''
       OR btrim(COALESCE(payload#>>'{address,number}', '')) = ''
       OR btrim(COALESCE(payload#>>'{address,neighborhood}', '')) = ''
       OR btrim(COALESCE(payload#>>'{address,city}', '')) = ''
       OR btrim(COALESCE(payload#>>'{address,state}', '')) = '' THEN
      RAISE EXCEPTION 'Endereço de entrega incompleto.';
    END IF;
  END IF;

  IF v_payment_method IS NULL THEN
    v_payment_method := CASE
      WHEN v_fulfillment_type IN ('table', 'counter') THEN 'local'
      ELSE v_allowed_payment_methods[1]
    END;
  END IF;

  v_requires_online_payment := v_payment_method IN ('pix_online', 'credit_card_online');
  v_payment_status := CASE WHEN v_requires_online_payment THEN 'pending' ELSE 'not_required' END;

  IF v_requires_online_payment AND v_payment_method = 'credit_card_online' THEN
    RAISE EXCEPTION 'Pagamento online por cartão ainda não está liberado neste checkout.';
  END IF;

  IF v_requires_online_payment THEN
    SELECT
      is_enabled,
      onboarding_status,
      enabled_methods,
      allow_delivery,
      allow_pickup,
      allow_table,
      allow_counter
    INTO
      v_online_enabled,
      v_online_onboarding_status,
      v_online_enabled_methods,
      v_online_allow_delivery,
      v_online_allow_pickup,
      v_online_allow_table,
      v_online_allow_counter
    FROM public.restaurant_payment_settings
    WHERE restaurant_id = v_restaurant_id;

    IF NOT COALESCE(v_online_enabled, false)
       OR v_online_onboarding_status <> 'approved' THEN
      RAISE EXCEPTION 'Pagamento online indisponível para este restaurante.';
    END IF;

    IF v_payment_method = 'pix_online'
       AND NOT ('pix' = ANY(COALESCE(v_online_enabled_methods, ARRAY[]::text[]))) THEN
      RAISE EXCEPTION 'PIX online indisponível para este restaurante.';
    END IF;

    IF (v_fulfillment_type = 'delivery' AND NOT COALESCE(v_online_allow_delivery, false))
       OR (v_fulfillment_type = 'pickup' AND NOT COALESCE(v_online_allow_pickup, false))
       OR (v_fulfillment_type = 'table' AND NOT COALESCE(v_online_allow_table, false))
       OR (v_fulfillment_type = 'counter' AND NOT COALESCE(v_online_allow_counter, false)) THEN
      RAISE EXCEPTION 'Pagamento online indisponível para este tipo de atendimento.';
    END IF;
  ELSE
    IF v_fulfillment_type IN ('table', 'counter') AND v_payment_method <> 'local' THEN
      RAISE EXCEPTION 'Forma de pagamento inválida para pedidos locais.';
    END IF;

    IF v_fulfillment_type IN ('delivery', 'pickup')
       AND NOT (v_payment_method = ANY(v_allowed_payment_methods)) THEN
      RAISE EXCEPTION 'Forma de pagamento indisponível.';
    END IF;
  END IF;

  IF v_requires_online_payment AND COALESCE(v_customer_phone, '') = '' THEN
    RAISE EXCEPTION 'Telefone é obrigatório para pagamento online.';
  END IF;

  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Adicione ao menos um item ao pedido.';
  END IF;

  IF v_fulfillment_type = 'table' THEN
    IF v_table_id IS NULL THEN
      RAISE EXCEPTION 'Mesa não informada.';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.mesas m
      WHERE m.id = v_table_id
        AND m.restaurant_id = v_restaurant_id
        AND m.is_active = true
    ) INTO v_table_valid;

    IF NOT v_table_valid THEN
      RAISE EXCEPTION 'Mesa inválida ou indisponível.';
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_quantity := GREATEST(COALESCE(NULLIF(v_item->>'quantity', '')::integer, 1), 1);

    SELECT p.id, p.name, p.price, p.available
    INTO v_product
    FROM public.products p
    WHERE p.id = NULLIF(v_item->>'product_id', '')::uuid
      AND p.restaurant_id = v_restaurant_id
    LIMIT 1;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Produto inválido no pedido.';
    END IF;

    IF v_product.available = false THEN
      RAISE EXCEPTION 'O produto "%" não está disponível.', v_product.name;
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  END LOOP;

  IF v_fulfillment_type = 'delivery' AND v_min_order_value > 0 AND v_subtotal < v_min_order_value THEN
    RAISE EXCEPTION 'Pedido mínimo para delivery não atingido.';
  END IF;

  IF v_coupon_code IS NOT NULL THEN
    SELECT *
    INTO v_coupon
    FROM public.coupons
    WHERE restaurant_id = v_restaurant_id
      AND code = v_coupon_code
    FOR UPDATE;

    IF v_coupon.id IS NULL THEN
      RAISE EXCEPTION 'Cupom não encontrado.';
    END IF;

    IF COALESCE(v_coupon.is_active, false) = false THEN
      RAISE EXCEPTION 'Cupom inativo.';
    END IF;

    IF now() < v_coupon.valid_from OR now() > v_coupon.valid_until THEN
      RAISE EXCEPTION 'Cupom fora do período de validade.';
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.usage_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'Cupom esgotado.';
    END IF;

    IF v_coupon.minimum_order_value IS NOT NULL AND v_subtotal < v_coupon.minimum_order_value THEN
      RAISE EXCEPTION 'Pedido mínimo não atingido para este cupom.';
    END IF;

    IF v_coupon.discount_type = 'percentage' THEN
      v_discount := LEAST(v_subtotal, round((v_subtotal * v_coupon.discount_value / 100)::numeric, 2));
    ELSE
      v_discount := LEAST(v_subtotal, v_coupon.discount_value);
    END IF;
  END IF;

  IF v_fulfillment_type <> 'delivery' THEN
    v_delivery_fee := 0;
  END IF;

  v_total := GREATEST(v_subtotal - v_discount, 0) + v_delivery_fee;

  IF v_payment_method = 'dinheiro'
     AND v_change_for IS NOT NULL
     AND v_change_for < v_total THEN
    RAISE EXCEPTION 'Valor para troco menor que o total do pedido.';
  END IF;

  IF v_payment_method <> 'dinheiro' THEN
    v_change_for := NULL;
  END IF;

  INSERT INTO public.orders (
    restaurant_id,
    customer_name,
    customer_phone,
    customer_email,
    order_type,
    table_id,
    status,
    total,
    payment_method,
    payment_status,
    source
  )
  VALUES (
    v_restaurant_id,
    v_customer_name,
    v_customer_phone,
    v_customer_email,
    CASE
      WHEN v_fulfillment_type = 'table' THEN 'mesa'
      WHEN v_fulfillment_type = 'delivery' THEN 'delivery'
      ELSE 'balcao'
    END,
    CASE WHEN v_fulfillment_type = 'table' THEN v_table_id ELSE NULL END,
    CASE WHEN v_requires_online_payment THEN 'aguardando_pagamento' ELSE 'pendente' END,
    v_total,
    v_payment_method,
    v_payment_status,
    'cardapio'
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_quantity := GREATEST(COALESCE(NULLIF(v_item->>'quantity', '')::integer, 1), 1);
    v_observations := NULLIF(btrim(COALESCE(v_item->>'observations', '')), '');

    SELECT p.id, p.name, p.price
    INTO v_product
    FROM public.products p
    WHERE p.id = NULLIF(v_item->>'product_id', '')::uuid
      AND p.restaurant_id = v_restaurant_id
    LIMIT 1;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      price,
      observations,
      addons
    )
    VALUES (
      v_order_id,
      v_product.id,
      v_product.name,
      v_quantity,
      v_product.price,
      v_observations,
      COALESCE(v_item->'addons', '[]'::jsonb)
    );
  END LOOP;

  IF v_coupon.id IS NOT NULL AND v_discount > 0 THEN
    INSERT INTO public.coupon_usage (
      coupon_id,
      order_id,
      customer_phone,
      discount_amount
    )
    VALUES (
      v_coupon.id,
      v_order_id,
      v_customer_phone,
      v_discount
    );

    UPDATE public.coupons
    SET usage_count = usage_count + 1,
        updated_at = now()
    WHERE id = v_coupon.id;
  END IF;

  IF v_fulfillment_type = 'table' AND v_table_id IS NOT NULL AND NOT v_requires_online_payment THEN
    UPDATE public.mesas
    SET status = 'ocupada', updated_at = now()
    WHERE id = v_table_id
      AND restaurant_id = v_restaurant_id;
  END IF;

  IF v_fulfillment_type = 'delivery' THEN
    INSERT INTO public.delivery_orders (
      restaurant_id,
      order_id,
      customer_name,
      customer_phone,
      customer_email,
      zip_code,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      reference_point,
      delivery_fee,
      subtotal,
      total,
      payment_method,
      payment_status,
      change_for,
      notes,
      estimated_delivery_minutes,
      status,
      fulfillment_type
    )
    VALUES (
      v_restaurant_id,
      v_order_id,
      v_customer_name,
      COALESCE(v_customer_phone, ''),
      v_customer_email,
      btrim(COALESCE(payload#>>'{address,zip_code}', '')),
      btrim(COALESCE(payload#>>'{address,street}', '')),
      btrim(COALESCE(payload#>>'{address,number}', '')),
      NULLIF(btrim(COALESCE(payload#>>'{address,complement}', '')), ''),
      btrim(COALESCE(payload#>>'{address,neighborhood}', '')),
      btrim(COALESCE(payload#>>'{address,city}', '')),
      btrim(COALESCE(payload#>>'{address,state}', '')),
      NULLIF(btrim(COALESCE(payload#>>'{address,reference_point}', '')), ''),
      v_delivery_fee,
      v_subtotal,
      v_total,
      v_payment_method,
      v_payment_status,
      v_change_for,
      v_notes,
      v_estimated_minutes,
      CASE WHEN v_requires_online_payment THEN 'awaiting_payment' ELSE 'pending' END,
      'delivery'
    )
    RETURNING id INTO v_delivery_order_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'delivery_order_id', v_delivery_order_id,
    'tracking_id', COALESCE(v_delivery_order_id, v_order_id),
    'order_number', v_order_number,
    'fulfillment_type', v_fulfillment_type,
    'coupon_code', CASE WHEN v_coupon.id IS NULL THEN NULL ELSE v_coupon.code END,
    'discount_amount', v_discount,
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'payment_status', v_payment_status,
    'requires_online_payment', v_requires_online_payment
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_menu_order(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_restaurant_subscription_entitlement(p_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member boolean := false;
  v_subscription record;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado.';
  END IF;

  SELECT (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.restaurant_id = p_restaurant_id
        AND u.user_type = 'owner'::public.user_type
    )
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.user_id = auth.uid()
        AND e.restaurant_id = p_restaurant_id
        AND e.is_active = true
    )
  ) INTO v_is_member;

  IF NOT COALESCE(v_is_member, false) THEN
    RAISE EXCEPTION 'Sem permissão para consultar assinatura deste restaurante.';
  END IF;

  SELECT
    s.plan_id,
    s.status,
    s.is_trial,
    s.trial_ends_at,
    s.current_period_end,
    p.name AS plan_name
  INTO v_subscription
  FROM public.subscriptions s
  LEFT JOIN public.plans p ON p.id = s.plan_id
  WHERE s.restaurant_id = p_restaurant_id
    AND s.status IN ('active', 'trialing', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_subscription', false,
      'plan_id', NULL,
      'plan_name', NULL,
      'status', NULL,
      'is_trial', false,
      'trial_ends_at', NULL,
      'current_period_end', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'has_subscription', true,
    'plan_id', v_subscription.plan_id,
    'plan_name', v_subscription.plan_name,
    'status', v_subscription.status,
    'is_trial', COALESCE(v_subscription.is_trial, false),
    'trial_ends_at', v_subscription.trial_ends_at,
    'current_period_end', v_subscription.current_period_end
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_restaurant_subscription_entitlement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_restaurant_subscription_entitlement(uuid) TO authenticated, service_role;

DO $$
BEGIN
  IF to_regprocedure('public.audit_changed_fields(jsonb,jsonb)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.audit_changed_fields(jsonb,jsonb) FROM PUBLIC, anon;
  END IF;

  IF to_regprocedure('public.normalize_coupon_code()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.normalize_coupon_code() FROM PUBLIC, anon;
  END IF;

  IF to_regprocedure('public.sync_delivery_order_status_from_order()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.sync_delivery_order_status_from_order() FROM PUBLIC, anon;
  END IF;

  IF to_regprocedure('public.update_pagarme_config_updated_at()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.update_pagarme_config_updated_at() FROM PUBLIC, anon;
  END IF;

  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;
  END IF;
END;
$$;
