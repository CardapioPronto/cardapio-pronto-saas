-- Bloco 10: custo unitario opcional e margem estimada por produto.
-- Custos ficam separados do catalogo para nao serem expostos a usuarios
-- com permissao apenas de visualizacao de produtos.

CREATE TABLE IF NOT EXISTS public.product_financial_settings (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  cost_price numeric(10, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_financial_settings_cost_price_check CHECK (cost_price >= 0)
);

ALTER TABLE public.product_financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_financial_settings FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_product_financial_settings_restaurant
  ON public.product_financial_settings (restaurant_id, product_id);

DROP POLICY IF EXISTS "Financial viewers can view product costs"
  ON public.product_financial_settings;
CREATE POLICY "Financial viewers can view product costs"
ON public.product_financial_settings FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'orders_metrics_view'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'reports_view'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'products_manage'::public.permission_type)
);

DROP POLICY IF EXISTS "Product managers can manage product costs"
  ON public.product_financial_settings;
CREATE POLICY "Product managers can manage product costs"
ON public.product_financial_settings FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'products_manage'::public.permission_type)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'products_manage'::public.permission_type)
);

DROP TRIGGER IF EXISTS update_product_financial_settings_updated_at
  ON public.product_financial_settings;
CREATE TRIGGER update_product_financial_settings_updated_at
BEFORE UPDATE ON public.product_financial_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.product_financial_settings IS
  'Custos unitarios opcionais protegidos por permissoes financeiras e de gestao de produtos.';

CREATE OR REPLACE FUNCTION public.get_restaurant_financial_dashboard(
  p_restaurant_id uuid,
  p_from timestamptz,
  p_to timestamptz
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
    WITH settings AS (
      SELECT
        coalesce(s.ifood_fee_percent, 0)::float8 AS ifood_fee_percent,
        coalesce(s.gateway_fee_percent, 0)::float8 AS gateway_fee_percent
      FROM (SELECT 1) seed
      LEFT JOIN public.restaurant_financial_settings s
        ON s.restaurant_id = p_restaurant_id
    ),
    finalized_orders AS (
      SELECT
        o.id,
        CASE
          WHEN o.source = 'ifood' THEN 'ifood'
          WHEN o.source = 'cardapio' THEN 'cardapio'
          WHEN o.source = 'whatsapp' THEN 'whatsapp'
          WHEN o.source IN ('app', 'pdv') THEN 'pdv'
          WHEN o.order_type IN ('mesa', 'balcao') THEN 'pdv'
          ELSE 'outros'
        END AS channel,
        coalesce(o.total, 0)::numeric AS total,
        (
          o.payment_provider = 'pagarme'
          OR o.payment_method IN ('pix_online', 'credit_card_online')
        ) AS uses_gateway
      FROM public.orders o
      WHERE o.restaurant_id = p_restaurant_id
        AND o.created_at >= p_from
        AND o.created_at <= p_to
        AND o.status = 'finalizado'
    ),
    channel_catalog AS (
      SELECT *
      FROM (VALUES
        ('pdv'::text, 'PDV'::text, 1),
        ('cardapio'::text, 'Cardápio próprio'::text, 2),
        ('whatsapp'::text, 'WhatsApp'::text, 3),
        ('ifood'::text, 'iFood'::text, 4),
        ('outros'::text, 'Outros'::text, 5)
      ) AS channels(code, name, sort_order)
    ),
    channel_metrics AS (
      SELECT
        c.code,
        c.name,
        c.sort_order,
        count(o.id)::int AS orders,
        coalesce(sum(o.total), 0)::float8 AS revenue,
        coalesce(sum(o.total) FILTER (WHERE o.uses_gateway), 0)::float8 AS gateway_revenue
      FROM channel_catalog c
      LEFT JOIN finalized_orders o ON o.channel = c.code
      GROUP BY c.code, c.name, c.sort_order
    ),
    channel_financials AS (
      SELECT
        m.code,
        m.name,
        m.sort_order,
        m.orders,
        m.revenue,
        CASE
          WHEN m.code = 'ifood'
            THEN m.revenue * (SELECT ifood_fee_percent FROM settings) / 100
          ELSE m.gateway_revenue * (SELECT gateway_fee_percent FROM settings) / 100
        END::float8 AS estimated_fees
      FROM channel_metrics m
    ),
    totals AS (
      SELECT
        coalesce(sum(revenue), 0)::float8 AS total_revenue,
        coalesce(sum(orders), 0)::int AS total_orders,
        coalesce(sum(estimated_fees), 0)::float8 AS estimated_fees,
        coalesce(sum(revenue) FILTER (WHERE code <> 'ifood'), 0)::float8 AS own_channel_revenue,
        coalesce(sum(estimated_fees) FILTER (WHERE code <> 'ifood'), 0)::float8 AS own_channel_fees,
        coalesce(sum(revenue) FILTER (WHERE code = 'ifood'), 0)::float8 AS ifood_revenue
      FROM channel_financials
    ),
    all_item_revenue AS (
      SELECT coalesce(sum(oi.quantity * oi.price::numeric), 0)::float8 AS revenue
      FROM public.order_items oi
      INNER JOIN finalized_orders fo ON fo.id = oi.order_id
    ),
    product_margin_rows AS (
      SELECT
        p.id,
        p.name,
        sum(oi.quantity)::float8 AS quantity,
        count(DISTINCT oi.order_id)::int AS orders,
        sum(oi.quantity * oi.price::numeric)::float8 AS revenue,
        sum(oi.quantity * pfs.cost_price)::float8 AS estimated_cost
      FROM public.order_items oi
      INNER JOIN finalized_orders fo ON fo.id = oi.order_id
      INNER JOIN public.products p
        ON p.id = oi.product_id
        AND p.restaurant_id = p_restaurant_id
      INNER JOIN public.product_financial_settings pfs
        ON pfs.product_id = p.id
        AND pfs.restaurant_id = p_restaurant_id
      GROUP BY p.id, p.name
    ),
    product_margin_totals AS (
      SELECT
        coalesce(sum(revenue), 0)::float8 AS covered_revenue,
        coalesce(sum(estimated_cost), 0)::float8 AS estimated_cost
      FROM product_margin_rows
    )
    SELECT jsonb_build_object(
      'settings', jsonb_build_object(
        'ifoodFeePercent', (SELECT ifood_fee_percent FROM settings),
        'gatewayFeePercent', (SELECT gateway_fee_percent FROM settings)
      ),
      'summary', jsonb_build_object(
        'totalRevenue', t.total_revenue,
        'totalOrders', t.total_orders,
        'averageTicket',
          CASE WHEN t.total_orders = 0 THEN 0::float8 ELSE t.total_revenue / t.total_orders END,
        'estimatedFees', t.estimated_fees,
        'estimatedNetRevenue', t.total_revenue - t.estimated_fees,
        'ownChannelRevenue', t.own_channel_revenue,
        'ifoodRevenue', t.ifood_revenue,
        'ownChannelShare',
          CASE
            WHEN t.total_revenue = 0 THEN 0::float8
            ELSE t.own_channel_revenue / t.total_revenue * 100
          END,
        'estimatedOwnChannelSavings',
          greatest(
            (
              t.own_channel_revenue * (SELECT ifood_fee_percent FROM settings) / 100
            ) - t.own_channel_fees,
            0
          )::float8,
        'marginCoveredRevenue', pmt.covered_revenue,
        'estimatedProductCost', pmt.estimated_cost,
        'estimatedGrossMargin', pmt.covered_revenue - pmt.estimated_cost,
        'estimatedGrossMarginPercent',
          CASE
            WHEN pmt.covered_revenue = 0 THEN 0::float8
            ELSE (pmt.covered_revenue - pmt.estimated_cost) / pmt.covered_revenue * 100
          END,
        'costCoveragePercent',
          CASE
            WHEN air.revenue = 0 THEN 0::float8
            ELSE pmt.covered_revenue / air.revenue * 100
          END
      ),
      'channels', coalesce((
        SELECT jsonb_agg(
          jsonb_build_object(
            'code', f.code,
            'name', f.name,
            'orders', f.orders,
            'revenue', f.revenue,
            'averageTicket',
              CASE WHEN f.orders = 0 THEN 0::float8 ELSE f.revenue / f.orders END,
            'estimatedFees', f.estimated_fees,
            'estimatedNetRevenue', f.revenue - f.estimated_fees,
            'revenueShare',
              CASE
                WHEN t.total_revenue = 0 THEN 0::float8
                ELSE f.revenue / t.total_revenue * 100
              END
          )
          ORDER BY f.sort_order
        )
        FROM channel_financials f
        WHERE f.orders > 0 OR f.code IN ('pdv', 'cardapio', 'whatsapp', 'ifood')
      ), '[]'::jsonb),
      'products', coalesce((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'quantity', p.quantity,
            'orders', p.orders,
            'revenue', p.revenue,
            'estimatedCost', p.estimated_cost,
            'estimatedGrossMargin', p.revenue - p.estimated_cost,
            'estimatedGrossMarginPercent',
              CASE
                WHEN p.revenue = 0 THEN 0::float8
                ELSE (p.revenue - p.estimated_cost) / p.revenue * 100
              END
          )
          ORDER BY p.revenue DESC, p.name
        )
        FROM (
          SELECT *
          FROM product_margin_rows
          ORDER BY revenue DESC, name
          LIMIT 10
        ) p
      ), '[]'::jsonb)
    )
    FROM totals t
    CROSS JOIN all_item_revenue air
    CROSS JOIN product_margin_totals pmt
  );
END;
$$;

COMMENT ON FUNCTION public.get_restaurant_financial_dashboard(uuid, timestamptz, timestamptz) IS
  'Retorna receita por canal, taxas, economia e margem estimada para produtos com custo cadastrado.';
