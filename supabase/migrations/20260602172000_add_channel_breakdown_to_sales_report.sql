-- Bloco 6: relatório iFood x canal próprio dentro do relatório de vendas.

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
    finalized_all_channels AS (
      SELECT o.*
      FROM public.orders o
      WHERE o.restaurant_id = p_restaurant_id
        AND o.created_at >= p_from
        AND o.created_at <= p_to
        AND o.status = 'finalizado'
    ),
    channel_base AS (
      SELECT
        CASE
          WHEN source = 'ifood' THEN 'ifood'
          WHEN source = 'cardapio' THEN 'cardapio'
          WHEN source = 'whatsapp' THEN 'whatsapp'
          WHEN source = 'app' THEN 'pdv'
          WHEN order_type = 'mesa' THEN 'mesa'
          WHEN order_type = 'balcao' THEN 'balcao'
          WHEN order_type = 'delivery' THEN 'delivery'
          ELSE 'outros'
        END AS canal,
        total
      FROM finalized_all_channels
    ),
    channel_rollup AS (
      SELECT
        'ifood'::text AS codigo,
        'iFood'::text AS nome,
        'marketplace'::text AS grupo,
        coalesce(count(*) FILTER (WHERE canal = 'ifood'), 0)::int AS pedidos,
        coalesce(sum(total) FILTER (WHERE canal = 'ifood'), 0)::float8 AS faturamento
      FROM channel_base
      UNION ALL
      SELECT
        'proprio'::text AS codigo,
        'Canal próprio'::text AS nome,
        'proprio'::text AS grupo,
        coalesce(count(*) FILTER (WHERE canal <> 'ifood'), 0)::int AS pedidos,
        coalesce(sum(total) FILTER (WHERE canal <> 'ifood'), 0)::float8 AS faturamento
      FROM channel_base
      UNION ALL
      SELECT
        canal AS codigo,
        CASE canal
          WHEN 'cardapio' THEN 'Cardápio digital'
          WHEN 'whatsapp' THEN 'WhatsApp'
          WHEN 'pdv' THEN 'PDV'
          WHEN 'mesa' THEN 'Mesa'
          WHEN 'balcao' THEN 'Balcão'
          WHEN 'delivery' THEN 'Delivery'
          ELSE 'Outros'
        END AS nome,
        'detalhe_proprio'::text AS grupo,
        count(*)::int AS pedidos,
        coalesce(sum(total), 0)::float8 AS faturamento
      FROM channel_base
      WHERE canal <> 'ifood'
      GROUP BY canal
    ),
    channel_totals AS (
      SELECT
        coalesce(sum(faturamento) FILTER (WHERE grupo IN ('marketplace', 'proprio')), 0::float8) AS faturamento_total,
        coalesce(sum(pedidos) FILTER (WHERE grupo IN ('marketplace', 'proprio')), 0) AS pedidos_total
      FROM channel_rollup
    ),
    canais AS (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'codigo', c.codigo,
            'nome', c.nome,
            'grupo', c.grupo,
            'pedidos', c.pedidos,
            'faturamento', c.faturamento,
            'ticketMedio',
              CASE WHEN c.pedidos = 0 THEN 0::float8 ELSE c.faturamento / NULLIF(c.pedidos::float8, 0) END,
            'participacaoFaturamento',
              CASE
                WHEN (SELECT faturamento_total FROM channel_totals) = 0 THEN 0::float8
                ELSE (c.faturamento / NULLIF((SELECT faturamento_total FROM channel_totals), 0)) * 100
              END,
            'participacaoPedidos',
              CASE
                WHEN (SELECT pedidos_total FROM channel_totals) = 0 THEN 0::float8
                ELSE (c.pedidos::float8 / NULLIF((SELECT pedidos_total FROM channel_totals)::float8, 0)) * 100
              END
          )
          ORDER BY
            CASE c.grupo
              WHEN 'marketplace' THEN 1
              WHEN 'proprio' THEN 2
              ELSE 3
            END,
            c.faturamento DESC,
            c.nome
        ),
        '[]'::jsonb
      ) AS data
      FROM channel_rollup c
      WHERE c.pedidos > 0 OR c.grupo IN ('marketplace', 'proprio')
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
      'status', (SELECT status_rows.data FROM status_rows),
      'canais', (SELECT canais.data FROM canais)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_restaurant_sales_report(uuid, timestamptz, timestamptz, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_restaurant_sales_report(uuid, timestamptz, timestamptz, text, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_restaurant_sales_report(uuid, timestamptz, timestamptz, text, text, text) IS
  'Relatório de vendas por período com resumo, produtos, status, gráficos e comparativo iFood x canal próprio.';
