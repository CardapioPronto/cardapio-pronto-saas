-- Bloco 9: idempotência para pedidos do PDV criados a partir da fila offline.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_order_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_restaurant_client_order_id
  ON public.orders (restaurant_id, client_order_id)
  WHERE client_order_id IS NOT NULL;

COMMENT ON COLUMN public.orders.client_order_id IS
  'Identificador gerado pelo dispositivo do PDV para impedir pedidos duplicados em sincronizações e retries.';

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
  v_client_order_id text;
  v_existing_order record;
  v_items jsonb;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_observations text;
  v_total numeric := 0;
  v_order_id uuid;
  v_order_number text;
  v_allow_negative boolean;
  v_negative_reason text;
BEGIN
  v_restaurant_id := NULLIF(payload->>'restaurant_id', '')::uuid;
  v_order_type := COALESCE(NULLIF(payload->>'order_type', ''), 'balcao');
  v_table_id := NULLIF(payload->>'table_id', '')::uuid;
  v_customer_name := NULLIF(btrim(COALESCE(payload->>'customer_name', '')), '');
  v_customer_phone := NULLIF(btrim(COALESCE(payload->>'customer_phone', '')), '');
  v_client_order_id := NULLIF(btrim(COALESCE(payload->>'client_order_id', '')), '');
  v_items := payload->'items';
  v_allow_negative := COALESCE((payload->>'allow_negative_override')::boolean, false);
  v_negative_reason := NULLIF(btrim(COALESCE(payload->>'negative_override_reason', '')), '');

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado.';
  END IF;

  IF v_order_type NOT IN ('mesa', 'balcao') THEN
    RAISE EXCEPTION 'Tipo de pedido inválido.';
  END IF;

  IF NOT public.user_has_restaurant_permission(v_restaurant_id, 'pdv_access'::public.permission_type) THEN
    RAISE EXCEPTION 'Sem permissão para criar pedidos no PDV.';
  END IF;

  IF v_client_order_id IS NOT NULL THEN
    SELECT o.id, o.order_number, o.order_type, o.table_id, o.status, o.total, o.source
    INTO v_existing_order
    FROM public.orders o
    WHERE o.restaurant_id = v_restaurant_id
      AND o.client_order_id = v_client_order_id
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'id', v_existing_order.id,
        'order_id', v_existing_order.id,
        'order_number', v_existing_order.order_number,
        'restaurant_id', v_restaurant_id,
        'order_type', v_existing_order.order_type,
        'table_id', v_existing_order.table_id,
        'status', v_existing_order.status,
        'total', v_existing_order.total,
        'source', v_existing_order.source,
        'client_order_id', v_client_order_id,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  IF v_allow_negative THEN
    IF NOT public.user_has_restaurant_permission(v_restaurant_id, 'products_manage'::public.permission_type) THEN
      RAISE EXCEPTION 'Sem permissão para vender sem saldo.';
    END IF;
    IF v_negative_reason IS NULL THEN
      RAISE EXCEPTION 'Informe o motivo da venda sem saldo.';
    END IF;
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

  BEGIN
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
      source,
      client_order_id
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
      'app',
      v_client_order_id
    )
    RETURNING id, order_number INTO v_order_id, v_order_number;
  EXCEPTION
    WHEN unique_violation THEN
      IF v_client_order_id IS NULL THEN
        RAISE;
      END IF;

      SELECT o.id, o.order_number, o.order_type, o.table_id, o.status, o.total, o.source
      INTO v_existing_order
      FROM public.orders o
      WHERE o.restaurant_id = v_restaurant_id
        AND o.client_order_id = v_client_order_id
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE;
      END IF;

      RETURN jsonb_build_object(
        'id', v_existing_order.id,
        'order_id', v_existing_order.id,
        'order_number', v_existing_order.order_number,
        'restaurant_id', v_restaurant_id,
        'order_type', v_existing_order.order_type,
        'table_id', v_existing_order.table_id,
        'status', v_existing_order.status,
        'total', v_existing_order.total,
        'source', v_existing_order.source,
        'client_order_id', v_client_order_id,
        'idempotent_replay', true
      );
  END;

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

  PERFORM public.apply_stock_for_order(v_order_id, v_allow_negative);

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
    'source', 'app',
    'client_order_id', v_client_order_id,
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_pos_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pos_order(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_pos_order(jsonb) IS
  'Cria pedido transacional do PDV com baixa de estoque opcional e idempotência por client_order_id.';
