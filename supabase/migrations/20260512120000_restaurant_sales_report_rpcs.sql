-- Bloco 6: agregações de relatório no servidor + índices + permissão reports_view.

ALTER TYPE public.permission_type ADD VALUE IF NOT EXISTS 'reports_view';

CREATE OR REPLACE FUNCTION public.assert_restaurant_report_access(p_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado';
  END IF;

  IF NOT (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.restaurant_id = p_restaurant_id
        AND u.user_type = 'owner'::public.user_type
    )
    OR public.user_has_restaurant_permission(p_restaurant_id, 'orders_metrics_view'::public.permission_type)
    OR public.user_has_restaurant_permission(p_restaurant_id, 'reports_view'::public.permission_type)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para relatórios deste restaurante';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_restaurant_report_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_restaurant_report_access(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_restaurant_sales_report(
  p_restaurant_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_status text DEFAULT 'todos',
  p_canal text DEFAULT 'todos',
  p_produtos_sort text DEFAULT 'receita'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
BEGIN
  PERFORM public.assert_restaurant_report_access(p_restaurant_id);

  IF p_to < p_from THEN
    RAISE EXCEPTION 'A data inicial não pode ser maior que a data final';
  END IF;

  v_days := (p_to::date - p_from::date) + 1;
  IF v_days > 366 OR v_days < 1 THEN
    RAISE EXCEPTION 'Período inválido (máximo 366 dias)';
  END IF;

  RETURN (
    WITH fo AS (
      SELECT o.*
      FROM public.orders o
      WHERE o.restaurant_id = p_restaurant_id
        AND o.created_at >= p_from
        AND o.created_at <= p_to
        AND (p_status = 'todos' OR o.status = p_status)
        AND (
          p_canal = 'todos'
          OR (
            split_part(p_canal, ':', 1) = 'source'
            AND o.source IS NOT DISTINCT FROM split_part(p_canal, ':', 2)
          )
          OR (
            split_part(p_canal, ':', 1) = 'tipo'
            AND o.order_type IS NOT DISTINCT FROM split_part(p_canal, ':', 2)
          )
        )
    ),
    finalized AS (
      SELECT * FROM fo WHERE status = 'finalizado'
    ),
    daily AS (
      SELECT
        ((f.created_at AT TIME ZONE 'UTC')::date) AS d,
        sum(f.total)::float8 AS vendas,
        count(*)::int AS pedidos
      FROM finalized f
      GROUP BY 1
    ),
    dense_days AS (
      SELECT gs::date AS d
      FROM generate_series(p_from::date, p_to::date, interval '1 day') AS gs
    ),
    graficos AS (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'data', dd.d::text,
            'vendas', coalesce(daily.vendas, 0::float8),
            'pedidos', coalesce(daily.pedidos, 0)
          )
          ORDER BY dd.d
        ),
        '[]'::jsonb
      ) AS data
      FROM dense_days dd
      LEFT JOIN daily ON daily.d = dd.d
    ),
    produtos AS (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'nome', p.nome,
            'quantidade', p.quantidade,
            'receita', p.receita,
            'pedidos', p.pedidos
          )
          ORDER BY p.sort_key DESC
        ),
        '[]'::jsonb
      ) AS data
      FROM (
        SELECT
          max(oi.product_name) AS nome,
          sum(oi.quantity)::bigint AS quantidade,
          sum((oi.quantity * oi.price::numeric))::float8 AS receita,
          count(DISTINCT oi.order_id)::int AS pedidos,
          CASE
            WHEN coalesce(nullif(trim(p_produtos_sort), ''), 'receita') = 'quantidade'
              THEN sum(oi.quantity)::numeric
            ELSE sum((oi.quantity * oi.price::numeric))
          END AS sort_key
        FROM public.order_items oi
        INNER JOIN finalized f ON f.id = oi.order_id
        GROUP BY coalesce(oi.product_id::text, oi.product_name)
        ORDER BY sort_key DESC
        LIMIT 10
      ) p
    ),
    status_rows AS (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'status', s.status,
            'pedidos', s.pedidos,
            'total', s.total
          )
          ORDER BY s.status
        ),
        '[]'::jsonb
      ) AS data
      FROM (
        SELECT
          fo2.status,
          count(*)::int AS pedidos,
          sum(fo2.total)::float8 AS total
        FROM fo fo2
        GROUP BY fo2.status
      ) s
    ),
    resumo AS (
      SELECT jsonb_build_object(
        'totalVendas', coalesce((SELECT sum(f2.total)::float8 FROM finalized f2), 0::float8),
        'totalPedidos', (SELECT count(*)::int FROM fo),
        'pedidosFaturados', (SELECT count(*)::int FROM finalized),
        'ticketMedio',
          CASE
            WHEN (SELECT count(*) FROM finalized) = 0 THEN 0::float8
            ELSE (
              (SELECT coalesce(sum(f3.total), 0)::float8 FROM finalized f3)
              / NULLIF((SELECT count(*)::float8 FROM finalized), 0)
            )
          END,
        'pedidosCancelados', (SELECT count(*)::int FROM fo WHERE status = 'cancelado'),
        'faturamentoCancelado', coalesce(
          (SELECT sum(fo3.total)::float8 FROM fo fo3 WHERE fo3.status = 'cancelado'),
          0::float8
        )
      ) AS data
    )
    SELECT jsonb_build_object(
      'graficos', (SELECT graficos.data FROM graficos),
      'produtos', (SELECT produtos.data FROM produtos),
      'resumo', (SELECT resumo.data FROM resumo),
      'status', (SELECT status_rows.data FROM status_rows)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_restaurant_sales_report(uuid, timestamptz, timestamptz, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_restaurant_sales_report(uuid, timestamptz, timestamptz, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_restaurant_sales_period_metrics(
  p_restaurant_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_canal text DEFAULT 'todos'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
BEGIN
  PERFORM public.assert_restaurant_report_access(p_restaurant_id);

  IF p_to < p_from THEN
    RAISE EXCEPTION 'A data inicial não pode ser maior que a data final';
  END IF;

  v_days := (p_to::date - p_from::date) + 1;
  IF v_days > 366 OR v_days < 1 THEN
    RAISE EXCEPTION 'Período inválido (máximo 366 dias)';
  END IF;

  RETURN (
    WITH fin AS (
      SELECT o.*
      FROM public.orders o
      WHERE o.restaurant_id = p_restaurant_id
        AND o.status = 'finalizado'
        AND o.created_at >= p_from
        AND o.created_at <= p_to
        AND (
          p_canal = 'todos'
          OR (
            split_part(p_canal, ':', 1) = 'source'
            AND o.source IS NOT DISTINCT FROM split_part(p_canal, ':', 2)
          )
          OR (
            split_part(p_canal, ':', 1) = 'tipo'
            AND o.order_type IS NOT DISTINCT FROM split_part(p_canal, ':', 2)
          )
        )
    ),
    daily AS (
      SELECT
        ((f.created_at AT TIME ZONE 'UTC')::date) AS d,
        sum(f.total)::float8 AS faturamento,
        count(*)::int AS pedidos
      FROM fin f
      GROUP BY 1
    ),
    dense_days AS (
      SELECT gs::date AS d
      FROM generate_series(p_from::date, p_to::date, interval '1 day') AS gs
    ),
    evolucao AS (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'data', dd.d::text,
            'faturamento', coalesce(daily.faturamento, 0::float8),
            'pedidos', coalesce(daily.pedidos, 0)
          )
          ORDER BY dd.d
        ),
        '[]'::jsonb
      ) AS data
      FROM dense_days dd
      LEFT JOIN daily ON daily.d = dd.d
    ),
    totals AS (
      SELECT
        coalesce((SELECT sum(f2.total)::float8 FROM fin f2), 0::float8) AS faturamento,
        (SELECT count(*)::bigint FROM fin) AS pedidos,
        coalesce((
          SELECT sum(oi.quantity)::bigint
          FROM public.order_items oi
          INNER JOIN fin f3 ON f3.id = oi.order_id
        ), 0::bigint) AS produtos_vendidos
    )
    SELECT jsonb_build_object(
      'faturamento', (SELECT faturamento FROM totals),
      'pedidos', (SELECT pedidos FROM totals)::int,
      'ticketMedio',
        CASE
          WHEN (SELECT pedidos FROM totals) = 0 THEN 0::float8
          ELSE (SELECT faturamento FROM totals) / NULLIF((SELECT pedidos FROM totals)::float8, 0)
        END,
      'produtosVendidos', (SELECT produtos_vendidos FROM totals)::int,
      'evolucao', (SELECT evolucao.data FROM evolucao)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_restaurant_sales_period_metrics(uuid, timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_restaurant_sales_period_metrics(uuid, timestamptz, timestamptz, text) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created_finalizado
  ON public.orders (restaurant_id, created_at DESC)
  WHERE status = 'finalizado';

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created_status_source_type
  ON public.orders (restaurant_id, created_at DESC, status, source, order_type);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items (order_id);
