-- Make POS order creation and order status updates atomic.
-- Totals and product availability are validated server-side.

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created_status
  ON public.orders(restaurant_id, created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_table_status
  ON public.orders(restaurant_id, table_id, status)
  WHERE table_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_pos_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_order_type text;
  v_table_id uuid;
  v_customer_name text;
  v_customer_phone text;
  v_items jsonb;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_observations text;
  v_total numeric := 0;
  v_order_id uuid;
  v_order_number text;
BEGIN
  v_restaurant_id := NULLIF(payload->>'restaurant_id', '')::uuid;
  v_order_type := COALESCE(NULLIF(payload->>'order_type', ''), 'balcao');
  v_table_id := NULLIF(payload->>'table_id', '')::uuid;
  v_customer_name := NULLIF(btrim(COALESCE(payload->>'customer_name', '')), '');
  v_customer_phone := NULLIF(btrim(COALESCE(payload->>'customer_phone', '')), '');
  v_items := payload->'items';

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado.';
  END IF;

  IF v_order_type NOT IN ('mesa', 'balcao') THEN
    RAISE EXCEPTION 'Tipo de pedido inválido.';
  END IF;

  IF NOT public.user_has_restaurant_permission(v_restaurant_id, 'pdv_access'::public.permission_type) THEN
    RAISE EXCEPTION 'Sem permissão para criar pedidos no PDV.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = v_restaurant_id
      AND COALESCE(r.active, true) = true
  ) THEN
    RAISE EXCEPTION 'Restaurante indisponível.';
  END IF;

  IF v_order_type = 'mesa' THEN
    IF v_table_id IS NULL THEN
      RAISE EXCEPTION 'Mesa não informada.';
    END IF;

    PERFORM 1
    FROM public.mesas m
    WHERE m.id = v_table_id
      AND m.restaurant_id = v_restaurant_id
      AND m.is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Mesa inválida ou indisponível.';
    END IF;
  ELSE
    v_table_id := NULL;
  END IF;

  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Adicione ao menos um item ao pedido.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_quantity := COALESCE(NULLIF(v_item->>'quantity', '')::integer, 0);

    IF v_quantity < 1 THEN
      RAISE EXCEPTION 'Quantidade inválida no pedido.';
    END IF;

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

    v_total := v_total + (v_product.price * v_quantity);
  END LOOP;

  INSERT INTO public.orders (
    restaurant_id,
    employee_id,
    customer_name,
    customer_phone,
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
    auth.uid(),
    COALESCE(v_customer_name, CASE WHEN v_order_type = 'mesa' THEN 'Cliente local' ELSE 'Cliente balcão' END),
    v_customer_phone,
    v_order_type,
    v_table_id,
    'pendente',
    v_total,
    NULL,
    'not_required',
    'app'
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_quantity := COALESCE(NULLIF(v_item->>'quantity', '')::integer, 0);
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
      '[]'::jsonb
    );
  END LOOP;

  IF v_order_type = 'mesa' AND v_table_id IS NOT NULL THEN
    UPDATE public.mesas
    SET status = 'ocupada',
        updated_at = now()
    WHERE id = v_table_id
      AND restaurant_id = v_restaurant_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'restaurant_id', v_restaurant_id,
    'order_type', v_order_type,
    'table_id', v_table_id,
    'status', 'pendente',
    'total', v_total,
    'source', 'app'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_pos_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pos_order(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_open_statuses text[] := ARRAY['pendente', 'preparo', 'em-andamento', 'pronto', 'aguardando_pagamento'];
  v_allowed_next_statuses text[];
  v_has_other_open_orders boolean := false;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Pedido não informado.';
  END IF;

  IF p_status NOT IN (
    'aguardando_pagamento',
    'pagamento_falhou',
    'pendente',
    'preparo',
    'em-andamento',
    'pronto',
    'finalizado',
    'cancelado'
  ) THEN
    RAISE EXCEPTION 'Status de pedido inválido.';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  IF NOT public.user_has_restaurant_permission(v_order.restaurant_id, 'orders_manage'::public.permission_type) THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar pedidos.';
  END IF;

  IF v_order.status = p_status THEN
    RETURN jsonb_build_object(
      'id', v_order.id,
      'restaurant_id', v_order.restaurant_id,
      'status', v_order.status,
      'table_id', v_order.table_id,
      'table_status', NULL
    );
  END IF;

  IF v_order.status IN ('finalizado', 'cancelado') THEN
    RAISE EXCEPTION 'Pedidos finalizados ou cancelados não podem ser reabertos por este fluxo.';
  END IF;

  v_allowed_next_statuses := CASE v_order.status
    WHEN 'aguardando_pagamento' THEN ARRAY['pendente', 'pagamento_falhou', 'cancelado']
    WHEN 'pagamento_falhou' THEN ARRAY['aguardando_pagamento', 'cancelado']
    WHEN 'pendente' THEN ARRAY['preparo', 'em-andamento', 'pronto', 'cancelado']
    WHEN 'preparo' THEN ARRAY['pendente', 'em-andamento', 'pronto', 'cancelado']
    WHEN 'em-andamento' THEN ARRAY['pendente', 'preparo', 'pronto', 'cancelado']
    WHEN 'pronto' THEN ARRAY['preparo', 'finalizado', 'cancelado']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_status = ANY(v_allowed_next_statuses)) THEN
    RAISE EXCEPTION 'Transição de status inválida: % -> %.', v_order.status, p_status;
  END IF;

  UPDATE public.orders
  SET status = p_status,
      updated_at = now()
  WHERE id = v_order.id;

  IF v_order.order_type = 'mesa' AND v_order.table_id IS NOT NULL THEN
    PERFORM 1
    FROM public.mesas m
    WHERE m.id = v_order.table_id
      AND m.restaurant_id = v_order.restaurant_id
    FOR UPDATE;

    IF p_status = ANY(v_open_statuses) THEN
      UPDATE public.mesas
      SET status = 'ocupada',
          updated_at = now()
      WHERE id = v_order.table_id
        AND restaurant_id = v_order.restaurant_id;
    ELSE
      SELECT EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.restaurant_id = v_order.restaurant_id
          AND o.table_id = v_order.table_id
          AND o.id <> v_order.id
          AND o.status = ANY(v_open_statuses)
      ) INTO v_has_other_open_orders;

      UPDATE public.mesas
      SET status = CASE WHEN v_has_other_open_orders THEN 'ocupada' ELSE 'livre' END,
          updated_at = now()
      WHERE id = v_order.table_id
        AND restaurant_id = v_order.restaurant_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'restaurant_id', v_order.restaurant_id,
    'status', p_status,
    'table_id', v_order.table_id,
    'table_status', CASE
      WHEN v_order.order_type <> 'mesa' OR v_order.table_id IS NULL THEN NULL
      WHEN p_status = ANY(v_open_statuses) THEN 'ocupada'
      WHEN v_has_other_open_orders THEN 'ocupada'
      ELSE 'livre'
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text) TO authenticated, service_role;
