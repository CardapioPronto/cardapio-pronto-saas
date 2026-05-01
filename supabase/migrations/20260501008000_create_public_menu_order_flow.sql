-- Public Menu order flow hardening and integration with operational orders.
-- Creates safe RPCs for public checkout/tracking and removes broad public reads.

ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS table_id uuid REFERENCES public.mesas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_orders_order_id ON public.delivery_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_table_id ON public.delivery_orders(table_id);

DROP POLICY IF EXISTS "Anyone can create delivery orders" ON public.delivery_orders;
DROP POLICY IF EXISTS "Anyone can view delivery order by id" ON public.delivery_orders;
DROP POLICY IF EXISTS "Anyone can view status history" ON public.delivery_order_status_history;

DROP POLICY IF EXISTS "Restaurant can view own delivery orders" ON public.delivery_orders;
CREATE POLICY "Restaurant can view own delivery orders"
ON public.delivery_orders FOR SELECT
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Restaurant can view own delivery status history" ON public.delivery_order_status_history;
CREATE POLICY "Restaurant can view own delivery status history"
ON public.delivery_order_status_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.delivery_orders d
    WHERE d.id = delivery_order_status_history.delivery_order_id
      AND (d.restaurant_id = public.get_user_restaurant_id() OR public.is_super_admin(auth.uid()))
  )
);

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
  v_total numeric := 0;
  v_order_id uuid;
  v_delivery_order_id uuid;
  v_order_number text;
  v_delivery_config jsonb := '{}'::jsonb;
  v_delivery_enabled boolean := true;
  v_pickup_enabled boolean := true;
  v_table_valid boolean := false;
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

  IF v_fulfillment_type <> 'delivery' THEN
    v_delivery_fee := 0;
  END IF;

  v_total := v_subtotal + v_delivery_fee;

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
    'fulfillment_type', v_fulfillment_type
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_order_tracking(p_tracking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.delivery_orders%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_restaurant jsonb;
  v_items jsonb;
  v_history jsonb;
  v_status text;
  v_fulfillment_type text;
BEGIN
  SELECT *
  INTO v_delivery
  FROM public.delivery_orders
  WHERE id = p_tracking_id;

  IF v_delivery.id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id = v_delivery.order_id;
    v_status := COALESCE(v_delivery.status, 'pending');
    v_fulfillment_type := COALESCE(v_delivery.fulfillment_type, 'delivery');
  ELSE
    SELECT * INTO v_order FROM public.orders WHERE id = p_tracking_id;
    v_status := CASE v_order.status
      WHEN 'pendente' THEN 'pending'
      WHEN 'preparo' THEN 'preparing'
      WHEN 'em-andamento' THEN 'preparing'
      WHEN 'finalizado' THEN 'delivered'
      WHEN 'cancelado' THEN 'cancelled'
      ELSE 'pending'
    END;
    v_fulfillment_type := CASE v_order.order_type
      WHEN 'mesa' THEN 'table'
      WHEN 'delivery' THEN 'delivery'
      ELSE 'pickup'
    END;
  END IF;

  IF v_order.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'phone_whatsapp', r.phone_whatsapp,
    'phone', r.phone,
    'logo_url', r.logo_url
  )
  INTO v_restaurant
  FROM public.restaurants r
  WHERE r.id = v_order.restaurant_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', oi.id,
    'product_id', oi.product_id,
    'name', oi.product_name,
    'quantity', oi.quantity,
    'price', oi.price,
    'observations', oi.observations,
    'addons', oi.addons
  ) ORDER BY oi.created_at), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  IF v_delivery.id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.created_at), '[]'::jsonb)
    INTO v_history
    FROM public.delivery_order_status_history h
    WHERE h.delivery_order_id = v_delivery.id;
  ELSE
    v_history := jsonb_build_array(jsonb_build_object(
      'id', v_order.id,
      'delivery_order_id', NULL,
      'previous_status', NULL,
      'new_status', 'pending',
      'created_at', v_order.created_at
    ));
  END IF;

  RETURN jsonb_build_object(
    'id', COALESCE(v_delivery.id, v_order.id),
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'status', v_status,
    'fulfillment_type', v_fulfillment_type,
    'restaurant', v_restaurant,
    'items', v_items,
    'history', v_history,
    'customer_name', COALESCE(v_delivery.customer_name, v_order.customer_name),
    'customer_phone', COALESCE(v_delivery.customer_phone, v_order.customer_phone),
    'payment_method', COALESCE(v_delivery.payment_method, v_order.payment_method),
    'change_for', v_delivery.change_for,
    'notes', COALESCE(v_delivery.notes, NULL),
    'subtotal', COALESCE(v_delivery.subtotal, v_order.total),
    'delivery_fee', COALESCE(v_delivery.delivery_fee, 0),
    'total', COALESCE(v_delivery.total, v_order.total),
    'estimated_delivery_minutes', v_delivery.estimated_delivery_minutes,
    'zip_code', v_delivery.zip_code,
    'street', v_delivery.street,
    'number', v_delivery.number,
    'complement', v_delivery.complement,
    'neighborhood', v_delivery.neighborhood,
    'city', v_delivery.city,
    'state', v_delivery.state,
    'reference_point', v_delivery.reference_point,
    'table_id', v_order.table_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_menu_order(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_order_tracking(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_delivery_order_status_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_status text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_delivery_status := CASE NEW.status
    WHEN 'pendente' THEN 'pending'
    WHEN 'preparo' THEN 'preparing'
    WHEN 'em-andamento' THEN 'preparing'
    WHEN 'finalizado' THEN 'delivered'
    WHEN 'cancelado' THEN 'cancelled'
    ELSE NULL
  END;

  IF v_delivery_status IS NOT NULL THEN
    UPDATE public.delivery_orders
    SET status = v_delivery_status,
        updated_at = now()
    WHERE order_id = NEW.id
      AND status IS DISTINCT FROM v_delivery_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_delivery_order_status_from_order ON public.orders;
CREATE TRIGGER trg_sync_delivery_order_status_from_order
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_delivery_order_status_from_order();
