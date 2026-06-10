ALTER TABLE public.public_menu_analytics_events
  DROP CONSTRAINT IF EXISTS public_menu_analytics_events_type_check;

ALTER TABLE public.public_menu_analytics_events
  ADD CONSTRAINT public_menu_analytics_events_type_check CHECK (
    event_type IN (
      'menu_view',
      'product_click',
      'add_to_cart',
      'checkout_started',
      'order_completed',
      'search_performed',
      'search_no_results'
    )
  );

CREATE INDEX IF NOT EXISTS idx_public_menu_analytics_events_search_terms
  ON public.public_menu_analytics_events (restaurant_id, event_type, occurred_at DESC)
  WHERE event_type IN ('search_performed', 'search_no_results');

CREATE OR REPLACE FUNCTION public.track_public_menu_event(
  p_restaurant_id uuid,
  p_session_id text,
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_session_id text := left(trim(COALESCE(p_session_id, '')), 128);
  v_event_id uuid;
  v_product_id uuid;
  v_order_id uuid;
  v_source text;
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  PERFORM public._enforce_public_rate_limit('public_menu_analytics', 120, 60);

  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'Restaurante inválido';
  END IF;

  IF char_length(v_session_id) < 16 THEN
    RAISE EXCEPTION 'Sessão inválida';
  END IF;

  IF p_event_type NOT IN (
    'menu_view',
    'product_click',
    'add_to_cart',
    'checkout_started',
    'order_completed',
    'search_performed',
    'search_no_results'
  ) THEN
    RAISE EXCEPTION 'Evento inválido';
  END IF;

  IF COALESCE(v_payload->>'product_id', '') ~* v_uuid_pattern THEN
    v_product_id := (v_payload->>'product_id')::uuid;
    IF NOT EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = v_product_id
        AND p.restaurant_id = p_restaurant_id
    ) THEN
      v_product_id := NULL;
    END IF;
  END IF;

  IF COALESCE(v_payload->>'order_id', '') ~* v_uuid_pattern THEN
    v_order_id := (v_payload->>'order_id')::uuid;
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = v_order_id
        AND o.restaurant_id = p_restaurant_id
    ) THEN
      v_order_id := NULL;
    END IF;
  END IF;

  v_source := COALESCE(
    NULLIF(left(trim(v_payload->>'source'), 80), ''),
    NULLIF(left(trim(v_payload->>'utm_source'), 80), ''),
    'direct'
  );

  INSERT INTO public.public_menu_analytics_events (
    restaurant_id,
    session_id,
    event_type,
    product_id,
    order_id,
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    path,
    referrer,
    metadata
  )
  VALUES (
    p_restaurant_id,
    v_session_id,
    p_event_type,
    v_product_id,
    v_order_id,
    v_source,
    NULLIF(left(trim(v_payload->>'utm_source'), 80), ''),
    NULLIF(left(trim(v_payload->>'utm_medium'), 80), ''),
    NULLIF(left(trim(v_payload->>'utm_campaign'), 120), ''),
    NULLIF(left(trim(v_payload->>'utm_term'), 120), ''),
    NULLIF(left(trim(v_payload->>'utm_content'), 120), ''),
    NULLIF(left(trim(v_payload->>'path'), 500), ''),
    NULLIF(left(trim(v_payload->>'referrer'), 500), ''),
    (
      v_payload
      - 'product_id'
      - 'order_id'
      - 'source'
      - 'utm_source'
      - 'utm_medium'
      - 'utm_campaign'
      - 'utm_term'
      - 'utm_content'
      - 'path'
      - 'referrer'
    )
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.track_public_menu_event(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_public_menu_event(uuid, text, text, jsonb)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_menu_conversion_funnel(
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
      SELECT
        e.*,
        COALESCE(NULLIF(e.source, ''), 'direct') AS normalized_source
      FROM public.public_menu_analytics_events e
      WHERE e.restaurant_id = p_restaurant_id
        AND e.occurred_at >= p_from
        AND e.occurred_at <= p_to
    ),
    counts AS (
      SELECT
        count(DISTINCT session_id) FILTER (WHERE event_type = 'menu_view')::integer AS menu_views,
        count(DISTINCT session_id) FILTER (WHERE event_type = 'product_click')::integer AS product_clicks,
        count(DISTINCT session_id) FILTER (WHERE event_type = 'add_to_cart')::integer AS add_to_cart,
        count(DISTINCT session_id) FILTER (WHERE event_type = 'checkout_started')::integer AS checkout_started,
        count(DISTINCT COALESCE(order_id::text, session_id))
          FILTER (WHERE event_type = 'order_completed')::integer AS orders_completed,
        count(*) FILTER (WHERE event_type IN ('search_performed', 'search_no_results'))::integer AS searches,
        count(*) FILTER (WHERE event_type = 'search_no_results')::integer AS searches_without_results
      FROM filtered
    ),
    step_order AS (
      SELECT * FROM (
        VALUES
          (1, 'menu_view', 'Visualizações do cardápio'),
          (2, 'product_click', 'Cliques em produto'),
          (3, 'add_to_cart', 'Produtos adicionados'),
          (4, 'checkout_started', 'Checkouts iniciados'),
          (5, 'order_completed', 'Pedidos concluídos')
      ) AS step(position, event_type, label)
    ),
    step_metrics AS (
      SELECT
        s.position,
        s.event_type,
        s.label,
        CASE s.event_type
          WHEN 'menu_view' THEN c.menu_views
          WHEN 'product_click' THEN c.product_clicks
          WHEN 'add_to_cart' THEN c.add_to_cart
          WHEN 'checkout_started' THEN c.checkout_started
          ELSE c.orders_completed
        END AS total
      FROM step_order s
      CROSS JOIN counts c
    ),
    source_counts AS (
      SELECT
        normalized_source AS source,
        count(DISTINCT session_id) FILTER (WHERE event_type = 'menu_view')::integer AS menu_views,
        count(DISTINCT session_id) FILTER (WHERE event_type = 'product_click')::integer AS product_clicks,
        count(DISTINCT session_id) FILTER (WHERE event_type = 'add_to_cart')::integer AS add_to_cart,
        count(DISTINCT session_id) FILTER (WHERE event_type = 'checkout_started')::integer AS checkout_started,
        count(DISTINCT COALESCE(order_id::text, session_id))
          FILTER (WHERE event_type = 'order_completed')::integer AS orders_completed
      FROM filtered
      GROUP BY normalized_source
    ),
    completed_orders AS (
      SELECT DISTINCT ON (f.order_id)
        f.order_id,
        f.normalized_source AS source,
        COALESCE(o.total, 0)::numeric AS total
      FROM filtered f
      LEFT JOIN public.orders o ON o.id = f.order_id
      WHERE f.event_type = 'order_completed'
        AND f.order_id IS NOT NULL
      ORDER BY f.order_id, f.occurred_at DESC
    ),
    source_rows AS (
      SELECT
        sc.source,
        sc.menu_views,
        sc.product_clicks,
        sc.add_to_cart,
        sc.checkout_started,
        sc.orders_completed,
        COALESCE(sum(co.total), 0)::numeric AS revenue,
        CASE
          WHEN sc.menu_views = 0 THEN 0
          ELSE round((sc.orders_completed::numeric / sc.menu_views::numeric) * 100, 1)
        END AS conversion_rate
      FROM source_counts sc
      LEFT JOIN completed_orders co ON co.source = sc.source
      GROUP BY
        sc.source,
        sc.menu_views,
        sc.product_clicks,
        sc.add_to_cart,
        sc.checkout_started,
        sc.orders_completed
    ),
    product_events AS (
      SELECT
        product_id,
        count(DISTINCT session_id) FILTER (WHERE event_type = 'product_click')::integer AS product_clicks,
        count(DISTINCT session_id) FILTER (WHERE event_type = 'add_to_cart')::integer AS add_to_cart
      FROM filtered
      WHERE product_id IS NOT NULL
        AND event_type IN ('product_click', 'add_to_cart')
      GROUP BY product_id
    ),
    completed_order_items AS (
      SELECT
        oi.product_id,
        sum(oi.quantity)::integer AS sold_quantity,
        count(DISTINCT oi.order_id)::integer AS orders_completed,
        COALESCE(sum((oi.quantity * oi.price)::numeric), 0)::numeric AS revenue
      FROM completed_orders co
      JOIN public.order_items oi ON oi.order_id = co.order_id
      WHERE oi.product_id IS NOT NULL
      GROUP BY oi.product_id
    ),
    product_rows AS (
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        c.name AS category_name,
        COALESCE(pe.product_clicks, 0) AS product_clicks,
        COALESCE(pe.add_to_cart, 0) AS add_to_cart,
        COALESCE(coi.orders_completed, 0) AS orders_completed,
        COALESCE(coi.sold_quantity, 0) AS sold_quantity,
        COALESCE(coi.revenue, 0) AS revenue,
        CASE
          WHEN COALESCE(pe.product_clicks, 0) = 0 THEN 0
          ELSE round((COALESCE(pe.add_to_cart, 0)::numeric / pe.product_clicks::numeric) * 100, 1)
        END AS click_to_cart_rate,
        CASE
          WHEN COALESCE(pe.add_to_cart, 0) = 0 THEN 0
          ELSE round((COALESCE(coi.orders_completed, 0)::numeric / pe.add_to_cart::numeric) * 100, 1)
        END AS cart_to_order_rate,
        CASE
          WHEN COALESCE(pe.product_clicks, 0) >= 3
            AND COALESCE(pe.add_to_cart, 0) = 0
            THEN 'clicked_not_added'
          WHEN COALESCE(pe.product_clicks, 0) >= 3
            AND COALESCE(pe.add_to_cart, 0)::numeric / GREATEST(pe.product_clicks, 1)::numeric < 0.35
            THEN 'low_cart_conversion'
          WHEN COALESCE(pe.add_to_cart, 0) >= 3
            AND COALESCE(coi.orders_completed, 0)::numeric / GREATEST(pe.add_to_cart, 1)::numeric < 0.5
            THEN 'low_order_conversion'
          WHEN COALESCE(pe.product_clicks, 0) >= 3
            AND COALESCE(coi.orders_completed, 0) = 0
            THEN 'interest_without_sale'
          ELSE 'healthy'
        END AS diagnostic_code
      FROM public.products p
      LEFT JOIN public.categories c ON c.id = p.category_id
      LEFT JOIN product_events pe ON pe.product_id = p.id
      LEFT JOIN completed_order_items coi ON coi.product_id = p.id
      WHERE p.restaurant_id = p_restaurant_id
        AND (
          COALESCE(pe.product_clicks, 0) > 0
          OR COALESCE(pe.add_to_cart, 0) > 0
          OR COALESCE(coi.orders_completed, 0) > 0
        )
    ),
    search_rows AS (
      SELECT
        lower(left(trim(COALESCE(metadata->>'query', '')), 120)) AS query,
        count(*)::integer AS searches,
        count(*) FILTER (WHERE event_type = 'search_no_results')::integer AS no_results,
        max(
          CASE
            WHEN COALESCE(metadata->>'result_count', '') ~ '^\d+$'
              THEN (metadata->>'result_count')::integer
            ELSE 0
          END
        ) AS max_result_count
      FROM filtered
      WHERE event_type IN ('search_performed', 'search_no_results')
        AND COALESCE(metadata->>'query', '') <> ''
      GROUP BY lower(left(trim(COALESCE(metadata->>'query', '')), 120))
    )
    SELECT jsonb_build_object(
      'summary', jsonb_build_object(
        'menuViews', c.menu_views,
        'productClicks', c.product_clicks,
        'addToCart', c.add_to_cart,
        'checkoutStarted', c.checkout_started,
        'ordersCompleted', c.orders_completed,
        'searches', c.searches,
        'searchesWithoutResults', c.searches_without_results,
        'viewToProductRate', CASE WHEN c.menu_views = 0 THEN 0 ELSE round((c.product_clicks::numeric / c.menu_views::numeric) * 100, 1) END,
        'productToCartRate', CASE WHEN c.product_clicks = 0 THEN 0 ELSE round((c.add_to_cart::numeric / c.product_clicks::numeric) * 100, 1) END,
        'cartToCheckoutRate', CASE WHEN c.add_to_cart = 0 THEN 0 ELSE round((c.checkout_started::numeric / c.add_to_cart::numeric) * 100, 1) END,
        'checkoutToOrderRate', CASE WHEN c.checkout_started = 0 THEN 0 ELSE round((c.orders_completed::numeric / c.checkout_started::numeric) * 100, 1) END,
        'viewToOrderRate', CASE WHEN c.menu_views = 0 THEN 0 ELSE round((c.orders_completed::numeric / c.menu_views::numeric) * 100, 1) END,
        'searchNoResultRate', CASE WHEN c.searches = 0 THEN 0 ELSE round((c.searches_without_results::numeric / c.searches::numeric) * 100, 1) END
      ),
      'steps', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'position', sm.position,
          'eventType', sm.event_type,
          'label', sm.label,
          'total', sm.total,
          'rateFromPrevious', CASE
            WHEN sm.position = 1 THEN 100
            WHEN prev.total = 0 THEN 0
            ELSE round((sm.total::numeric / prev.total::numeric) * 100, 1)
          END
        ) ORDER BY sm.position), '[]'::jsonb)
        FROM step_metrics sm
        LEFT JOIN step_metrics prev ON prev.position = sm.position - 1
      ),
      'sources', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'source', sr.source,
          'menuViews', sr.menu_views,
          'productClicks', sr.product_clicks,
          'addToCart', sr.add_to_cart,
          'checkoutStarted', sr.checkout_started,
          'ordersCompleted', sr.orders_completed,
          'revenue', sr.revenue,
          'conversionRate', sr.conversion_rate
        ) ORDER BY sr.menu_views DESC, sr.orders_completed DESC, sr.source), '[]'::jsonb)
        FROM source_rows sr
      ),
      'products', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'productId', pr.product_id,
          'productName', pr.product_name,
          'categoryName', pr.category_name,
          'productClicks', pr.product_clicks,
          'addToCart', pr.add_to_cart,
          'ordersCompleted', pr.orders_completed,
          'soldQuantity', pr.sold_quantity,
          'revenue', pr.revenue,
          'clickToCartRate', pr.click_to_cart_rate,
          'cartToOrderRate', pr.cart_to_order_rate,
          'diagnosticCode', pr.diagnostic_code
        ) ORDER BY
          CASE pr.diagnostic_code
            WHEN 'clicked_not_added' THEN 1
            WHEN 'low_cart_conversion' THEN 2
            WHEN 'low_order_conversion' THEN 3
            WHEN 'interest_without_sale' THEN 4
            ELSE 5
          END,
          pr.product_clicks DESC,
          pr.add_to_cart DESC,
          pr.revenue DESC
        ), '[]'::jsonb)
        FROM (
          SELECT *
          FROM product_rows
          ORDER BY
            CASE diagnostic_code
              WHEN 'clicked_not_added' THEN 1
              WHEN 'low_cart_conversion' THEN 2
              WHEN 'low_order_conversion' THEN 3
              WHEN 'interest_without_sale' THEN 4
              ELSE 5
            END,
            product_clicks DESC,
            add_to_cart DESC,
            revenue DESC
          LIMIT 12
        ) pr
      ),
      'searches', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'query', sr.query,
          'searches', sr.searches,
          'noResults', sr.no_results,
          'maxResultCount', sr.max_result_count,
          'noResultRate', CASE
            WHEN sr.searches = 0 THEN 0
            ELSE round((sr.no_results::numeric / sr.searches::numeric) * 100, 1)
          END
        ) ORDER BY sr.no_results DESC, sr.searches DESC, sr.query), '[]'::jsonb)
        FROM (
          SELECT *
          FROM search_rows
          ORDER BY no_results DESC, searches DESC, query
          LIMIT 10
        ) sr
      )
    )
    FROM counts c
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_menu_conversion_funnel(uuid, timestamptz, timestamptz)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_menu_conversion_funnel(uuid, timestamptz, timestamptz)
  TO authenticated, service_role;
