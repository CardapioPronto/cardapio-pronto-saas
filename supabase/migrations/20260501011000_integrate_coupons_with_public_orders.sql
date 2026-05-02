-- Integrate public checkout coupons with operational orders.

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
  v_payment_method text;
  v_change_for numeric;
  v_notes text;
  v_delivery_fee numeric := 0;
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
  v_delivery_enabled boolean := true;
  v_pickup_enabled boolean := true;
  v_table_valid boolean := false;
  v_coupon_code text;
  v_coupon public.coupons%ROWTYPE;
BEGIN
  v_restaurant_id := NULLIF(payload->>'restaurant_id', '')::uuid;
  v_fulfillment_type := COALESCE(NULLIF(payload->>'fulfillment_type', ''), 'delivery');
  v_table_id := NULLIF(payload->>'table_id', '')::uuid;
  v_customer_name := btrim(COALESCE(payload->>'customer_name', ''));
  v_customer_phone := NULLIF(btrim(COALESCE(payload->>'customer_phone', '')), '');
  v_payment_method := NULLIF(payload->>'payment_method', '');
  v_change_for := NULLIF(payload->>'change_for', '')::numeric;
  v_notes := NULLIF(btrim(COALESCE(payload->>'notes', '')), '');
  v_delivery_fee := COALESCE(NULLIF(payload->>'delivery_fee', '')::numeric, 0);
  v_estimated_minutes := NULLIF(payload->>'estimated_delivery_minutes', '')::integer;
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

  v_delivery_enabled := COALESCE((v_delivery_config->>'delivery_enabled')::boolean, true);
  v_pickup_enabled := COALESCE((v_delivery_config->>'pickup_enabled')::boolean, true);

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

  INSERT INTO public.orders (
    restaurant_id,
    customer_name,
    customer_phone,
    order_type,
    table_id,
    status,
    total,
    payment_method,
    source
  )
  VALUES (
    v_restaurant_id,
    v_customer_name,
    v_customer_phone,
    CASE
      WHEN v_fulfillment_type = 'table' THEN 'mesa'
      WHEN v_fulfillment_type = 'delivery' THEN 'delivery'
      ELSE 'balcao'
    END,
    CASE WHEN v_fulfillment_type = 'table' THEN v_table_id ELSE NULL END,
    'pendente',
    v_total,
    v_payment_method,
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

  IF v_fulfillment_type = 'table' AND v_table_id IS NOT NULL THEN
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
      v_change_for,
      v_notes,
      v_estimated_minutes,
      'pending',
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
    'total', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_menu_order(jsonb) TO anon, authenticated;
