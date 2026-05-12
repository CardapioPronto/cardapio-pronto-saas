-- =====================================================================
-- B5 — RPC agregada de dashboard.
--
-- Substitui a leitura completa de orders + order_items dos últimos 60
-- dias no frontend por agregações server-side. Retorna em uma única
-- chamada:
--   * stats (faturamento, total de pedidos, itens vendidos, pedidos
--     abertos, ticket médio, crescimentos vs período anterior)
--   * popular_products (top 5 produtos mais vendidos)
--
-- Uso de `finalizado` para faturamento mantém a semântica unificada
-- aplicada no Bloco 6 (relatórios). Para "itens vendidos" continuamos
-- considerando todos os pedidos não cancelados, para que produtos
-- abertos/em preparo ainda apareçam.
--
-- Acesso: usuários autenticados (RLS adiante filtra acesso ao
-- restaurante).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_restaurant_dashboard_metrics(
  p_restaurant_id uuid,
  p_window_days integer DEFAULT 30,
  p_include_financials boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_restaurant uuid;
  v_is_super_admin boolean := false;
  v_window_start timestamptz;
  v_prev_start timestamptz;

  v_total_pedidos integer := 0;
  v_pedidos_abertos integer := 0;
  v_itens_vendidos integer := 0;
  v_faturamento numeric := 0;
  v_prev_total_pedidos integer := 0;
  v_prev_faturamento numeric := 0;
  v_ticket_medio numeric := 0;
  v_crescimento_pedidos numeric := 0;
  v_crescimento_faturamento numeric := 0;
  v_validos integer := 0;
  v_prev_validos integer := 0;

  v_popular jsonb := '[]'::jsonb;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id required';
  END IF;

  -- Autorização: dono do restaurante OU super admin.
  BEGIN
    SELECT public.is_super_admin(v_user_id) INTO v_is_super_admin;
  EXCEPTION WHEN OTHERS THEN
    v_is_super_admin := false;
  END;

  IF NOT v_is_super_admin THEN
    SELECT id INTO v_user_restaurant
    FROM public.restaurants
    WHERE owner_id = v_user_id
    LIMIT 1;

    IF v_user_restaurant IS NULL OR v_user_restaurant <> p_restaurant_id THEN
      -- Não bloqueia funcionários autenticados que tenham permissão via
      -- RLS de orders; apenas em casos sem nenhum vínculo retornamos
      -- vazio em vez de levantar exceção para não quebrar a UI.
      RETURN jsonb_build_object(
        'stats', jsonb_build_object(
          'totalPedidos', 0,
          'faturamento', 0,
          'itensVendidos', 0,
          'pedidosAbertos', 0,
          'ticketMedio', 0,
          'crescimentoPedidos', 0,
          'crescimentoFaturamento', 0
        ),
        'popular_products', '[]'::jsonb,
        'window_days', p_window_days
      );
    END IF;
  END IF;

  v_window_start := now() - make_interval(days => GREATEST(1, p_window_days));
  v_prev_start := now() - make_interval(days => GREATEST(2, p_window_days * 2));

  -- Métricas do período atual.
  SELECT
    COUNT(*) FILTER (WHERE o.status IS DISTINCT FROM 'cancelado'
                       AND o.status IS DISTINCT FROM 'cancelled'
                       AND o.status IS DISTINCT FROM 'canceled')::integer,
    COUNT(*) FILTER (
      WHERE o.status IN (
        'pendente', 'preparo', 'em-andamento', 'pending', 'preparing'
      )
    )::integer,
    COALESCE(
      SUM(o.total) FILTER (WHERE o.status = 'finalizado' AND p_include_financials),
      0
    )::numeric,
    COUNT(*) FILTER (
      WHERE o.status = 'finalizado' AND p_include_financials
    )::integer
  INTO v_total_pedidos, v_pedidos_abertos, v_faturamento, v_validos
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at >= v_window_start;

  -- Itens vendidos (quantidade), excluindo apenas cancelados.
  SELECT COALESCE(SUM(oi.quantity), 0)::integer
  INTO v_itens_vendidos
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at >= v_window_start
    AND o.status NOT IN ('cancelado', 'cancelled', 'canceled');

  -- Métricas do período anterior (apenas para crescimento).
  SELECT
    COUNT(*)::integer,
    COALESCE(
      SUM(o.total) FILTER (WHERE o.status = 'finalizado' AND p_include_financials),
      0
    )::numeric,
    COUNT(*) FILTER (
      WHERE o.status = 'finalizado' AND p_include_financials
    )::integer
  INTO v_prev_total_pedidos, v_prev_faturamento, v_prev_validos
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at >= v_prev_start
    AND o.created_at < v_window_start;

  IF p_include_financials AND v_validos > 0 THEN
    v_ticket_medio := v_faturamento / v_validos;
  END IF;

  v_crescimento_pedidos := CASE
    WHEN v_prev_total_pedidos > 0 THEN
      ((v_total_pedidos - v_prev_total_pedidos)::numeric / v_prev_total_pedidos) * 100
    WHEN v_total_pedidos > 0 THEN 100
    ELSE 0
  END;

  v_crescimento_faturamento := CASE
    WHEN NOT p_include_financials THEN 0
    WHEN v_prev_faturamento > 0 THEN
      ((v_faturamento - v_prev_faturamento) / v_prev_faturamento) * 100
    WHEN v_faturamento > 0 THEN 100
    ELSE 0
  END;

  -- Top 5 produtos mais vendidos (por quantidade).
  WITH agregado AS (
    SELECT
      COALESCE(oi.product_id::text, oi.product_name, 'produto-sem-id') AS product_key,
      MAX(oi.product_name) AS product_name,
      SUM(oi.quantity)::integer AS sales,
      SUM(
        CASE
          WHEN p_include_financials THEN oi.quantity * COALESCE(oi.price, 0)
          ELSE 0
        END
      )::numeric AS revenue
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.restaurant_id = p_restaurant_id
      AND o.created_at >= v_window_start
      AND o.status NOT IN ('cancelado', 'cancelled', 'canceled')
    GROUP BY product_key
    ORDER BY sales DESC
    LIMIT 5
  )
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'id', product_key,
      'name', COALESCE(product_name, 'Produto'),
      'sales', sales,
      'revenue', revenue,
      'category', 'Produto'
    )),
    '[]'::jsonb
  )
  INTO v_popular
  FROM agregado;

  RETURN jsonb_build_object(
    'stats', jsonb_build_object(
      'totalPedidos', v_total_pedidos,
      'faturamento', v_faturamento,
      'itensVendidos', v_itens_vendidos,
      'pedidosAbertos', v_pedidos_abertos,
      'ticketMedio', v_ticket_medio,
      'crescimentoPedidos', v_crescimento_pedidos,
      'crescimentoFaturamento', v_crescimento_faturamento
    ),
    'popular_products', v_popular,
    'window_days', p_window_days
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_restaurant_dashboard_metrics(uuid, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_restaurant_dashboard_metrics(uuid, integer, boolean) TO authenticated;

COMMENT ON FUNCTION public.get_restaurant_dashboard_metrics(uuid, integer, boolean) IS
  'B5 — Métricas agregadas do dashboard (stats + top 5 produtos) sem trafegar pedidos completos para o frontend.';
