-- =====================================================================
-- B6 — RPC agregada de resumo de pedidos.
--
-- Substitui a query `select id, status, total` sem paginação que era
-- feita em paralelo com `listarPedidos` para calcular totais do header.
-- A nova RPC retorna os mesmos números (totalPedidos, totalVendido,
-- pedidosAbertos, cancelados) em uma única linha agregada, evitando
-- trafegar centenas/milhares de pedidos para o frontend.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_orders_summary(
  p_restaurant_id uuid,
  p_data_inicio timestamptz DEFAULT NULL,
  p_data_fim timestamptz DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total_pedidos integer := 0;
  v_total_vendido numeric := 0;
  v_pedidos_abertos integer := 0;
  v_cancelados integer := 0;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id required';
  END IF;

  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(total) FILTER (WHERE status = 'finalizado'), 0)::numeric,
    COUNT(*) FILTER (
      WHERE status IN ('pendente', 'preparo', 'em-andamento', 'pronto')
    )::integer,
    COUNT(*) FILTER (WHERE status = 'cancelado')::integer
  INTO v_total_pedidos, v_total_vendido, v_pedidos_abertos, v_cancelados
  FROM public.orders
  WHERE restaurant_id = p_restaurant_id
    AND (p_data_inicio IS NULL OR created_at >= p_data_inicio)
    AND (p_data_fim    IS NULL OR created_at <= p_data_fim)
    AND (p_status IS NULL OR p_status = 'todos' OR status = p_status);

  RETURN jsonb_build_object(
    'totalPedidos', v_total_pedidos,
    'totalVendido', v_total_vendido,
    'pedidosAbertos', v_pedidos_abertos,
    'cancelados', v_cancelados
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_orders_summary(uuid, timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_orders_summary(uuid, timestamptz, timestamptz, text) TO authenticated;

COMMENT ON FUNCTION public.get_orders_summary(uuid, timestamptz, timestamptz, text) IS
  'B6 — Resumo agregado de pedidos (total, faturamento, abertos, cancelados) respeitando RLS do invoker.';
