CREATE OR REPLACE FUNCTION public.get_public_menu_segment_diagnostics(
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
BEGIN
  PERFORM public.assert_restaurant_report_access(p_restaurant_id);

  IF p_to < p_from THEN
    RAISE EXCEPTION 'A data inicial não pode ser maior que a data final';
  END IF;

  IF (p_to::date - p_from::date) + 1 > 366 THEN
    RAISE EXCEPTION 'Período máximo de 366 dias para relatórios';
  END IF;

  RETURN (
    WITH filtered AS (
      SELECT e.*
      FROM public.public_menu_analytics_events e
      WHERE e.restaurant_id = p_restaurant_id
        AND e.occurred_at >= p_from
        AND e.occurred_at <= p_to
    ),
    completed_orders AS (
      SELECT DISTINCT ON (f.order_id)
        f.order_id,
        f.occurred_at,
        COALESCE(o.total, 0)::numeric AS total
      FROM filtered f
      LEFT JOIN public.orders o ON o.id = f.order_id
      WHERE f.event_type = 'order_completed'
        AND f.order_id IS NOT NULL
      ORDER BY f.order_id, f.occurred_at DESC
    ),
    category_events AS (
      SELECT
        p.category_id,
        COALESCE(c.name, 'Sem categoria') AS category_name,
        count(DISTINCT e.session_id) FILTER (WHERE e.event_type = 'product_click')::integer AS product_clicks,
        count(DISTINCT e.session_id) FILTER (WHERE e.event_type = 'add_to_cart')::integer AS add_to_cart
      FROM filtered e
      JOIN public.products p ON p.id = e.product_id
      LEFT JOIN public.categories c ON c.id = p.category_id
      WHERE e.product_id IS NOT NULL
        AND e.event_type IN ('product_click', 'add_to_cart')
      GROUP BY p.category_id, COALESCE(c.name, 'Sem categoria')
    ),
    category_orders AS (
      SELECT
        p.category_id,
        COALESCE(c.name, 'Sem categoria') AS category_name,
        count(DISTINCT oi.order_id)::integer AS orders_completed,
        COALESCE(sum(oi.quantity), 0)::integer AS sold_quantity,
        COALESCE(sum((oi.quantity * oi.price)::numeric), 0)::numeric AS revenue
      FROM completed_orders co
      JOIN public.order_items oi ON oi.order_id = co.order_id
      JOIN public.products p ON p.id = oi.product_id
      LEFT JOIN public.categories c ON c.id = p.category_id
      WHERE oi.product_id IS NOT NULL
      GROUP BY p.category_id, COALESCE(c.name, 'Sem categoria')
    ),
    category_rows AS (
      SELECT
        COALESCE(ce.category_id, cat_orders.category_id) AS category_id,
        COALESCE(ce.category_name, cat_orders.category_name, 'Sem categoria') AS category_name,
        COALESCE(ce.product_clicks, 0) AS product_clicks,
        COALESCE(ce.add_to_cart, 0) AS add_to_cart,
        COALESCE(cat_orders.orders_completed, 0) AS orders_completed,
        COALESCE(cat_orders.sold_quantity, 0) AS sold_quantity,
        COALESCE(cat_orders.revenue, 0) AS revenue,
        CASE
          WHEN COALESCE(ce.product_clicks, 0) = 0 THEN 0
          ELSE round((COALESCE(ce.add_to_cart, 0)::numeric / ce.product_clicks::numeric) * 100, 1)
        END AS click_to_cart_rate,
        CASE
          WHEN COALESCE(ce.add_to_cart, 0) = 0 THEN 0
          ELSE round((COALESCE(cat_orders.orders_completed, 0)::numeric / ce.add_to_cart::numeric) * 100, 1)
        END AS cart_to_order_rate,
        CASE
          WHEN COALESCE(ce.product_clicks, 0) >= 5
            AND COALESCE(ce.add_to_cart, 0) = 0
            THEN 'interest_without_cart'
          WHEN COALESCE(ce.product_clicks, 0) >= 5
            AND COALESCE(ce.add_to_cart, 0)::numeric / GREATEST(ce.product_clicks, 1)::numeric < 0.35
            THEN 'low_cart_conversion'
          WHEN COALESCE(ce.add_to_cart, 0) >= 3
            AND COALESCE(cat_orders.orders_completed, 0)::numeric / GREATEST(ce.add_to_cart, 1)::numeric < 0.5
            THEN 'low_order_conversion'
          ELSE 'healthy'
        END AS diagnostic_code
      FROM category_events ce
      FULL OUTER JOIN category_orders cat_orders
        ON cat_orders.category_id IS NOT DISTINCT FROM ce.category_id
    ),
    hourly_events AS (
      SELECT
        EXTRACT(HOUR FROM (f.occurred_at AT TIME ZONE 'America/Sao_Paulo'))::integer AS hour_of_day,
        count(DISTINCT f.session_id) FILTER (WHERE f.event_type = 'menu_view')::integer AS menu_views,
        count(DISTINCT f.session_id) FILTER (WHERE f.event_type = 'product_click')::integer AS product_clicks,
        count(DISTINCT f.session_id) FILTER (WHERE f.event_type = 'add_to_cart')::integer AS add_to_cart,
        count(DISTINCT f.session_id) FILTER (WHERE f.event_type = 'checkout_started')::integer AS checkout_started
      FROM filtered f
      WHERE f.event_type IN ('menu_view', 'product_click', 'add_to_cart', 'checkout_started')
      GROUP BY EXTRACT(HOUR FROM (f.occurred_at AT TIME ZONE 'America/Sao_Paulo'))::integer
    ),
    hourly_orders AS (
      SELECT
        EXTRACT(HOUR FROM (co.occurred_at AT TIME ZONE 'America/Sao_Paulo'))::integer AS hour_of_day,
        count(DISTINCT co.order_id)::integer AS orders_completed,
        COALESCE(sum(co.total), 0)::numeric AS revenue
      FROM completed_orders co
      GROUP BY EXTRACT(HOUR FROM (co.occurred_at AT TIME ZONE 'America/Sao_Paulo'))::integer
    ),
    hourly_rows AS (
      SELECT
        COALESCE(he.hour_of_day, ho.hour_of_day) AS hour_of_day,
        COALESCE(he.menu_views, 0) AS menu_views,
        COALESCE(he.product_clicks, 0) AS product_clicks,
        COALESCE(he.add_to_cart, 0) AS add_to_cart,
        COALESCE(he.checkout_started, 0) AS checkout_started,
        COALESCE(ho.orders_completed, 0) AS orders_completed,
        COALESCE(ho.revenue, 0) AS revenue,
        CASE
          WHEN COALESCE(he.menu_views, 0) = 0 THEN 0
          ELSE round((COALESCE(ho.orders_completed, 0)::numeric / he.menu_views::numeric) * 100, 1)
        END AS conversion_rate
      FROM hourly_events he
      FULL OUTER JOIN hourly_orders ho ON ho.hour_of_day = he.hour_of_day
    )
    SELECT jsonb_build_object(
      'categories', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'categoryId', cr.category_id,
          'categoryName', cr.category_name,
          'productClicks', cr.product_clicks,
          'addToCart', cr.add_to_cart,
          'ordersCompleted', cr.orders_completed,
          'soldQuantity', cr.sold_quantity,
          'revenue', cr.revenue,
          'clickToCartRate', cr.click_to_cart_rate,
          'cartToOrderRate', cr.cart_to_order_rate,
          'diagnosticCode', cr.diagnostic_code
        ) ORDER BY
          CASE cr.diagnostic_code
            WHEN 'interest_without_cart' THEN 1
            WHEN 'low_cart_conversion' THEN 2
            WHEN 'low_order_conversion' THEN 3
            ELSE 4
          END,
          cr.product_clicks DESC,
          cr.revenue DESC,
          cr.category_name
        ), '[]'::jsonb)
        FROM (
          SELECT *
          FROM category_rows
          ORDER BY
            CASE diagnostic_code
              WHEN 'interest_without_cart' THEN 1
              WHEN 'low_cart_conversion' THEN 2
              WHEN 'low_order_conversion' THEN 3
              ELSE 4
            END,
            product_clicks DESC,
            revenue DESC,
            category_name
          LIMIT 10
        ) cr
      ),
      'hourly', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'hour', hr.hour_of_day,
          'label', lpad(hr.hour_of_day::text, 2, '0') || ':00',
          'menuViews', hr.menu_views,
          'productClicks', hr.product_clicks,
          'addToCart', hr.add_to_cart,
          'checkoutStarted', hr.checkout_started,
          'ordersCompleted', hr.orders_completed,
          'revenue', hr.revenue,
          'conversionRate', hr.conversion_rate
        ) ORDER BY hr.hour_of_day), '[]'::jsonb)
        FROM hourly_rows hr
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_menu_segment_diagnostics(uuid, timestamptz, timestamptz)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_menu_segment_diagnostics(uuid, timestamptz, timestamptz)
  TO authenticated, service_role;
