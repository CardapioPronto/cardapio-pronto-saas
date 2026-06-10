CREATE TABLE IF NOT EXISTS public.public_menu_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  event_type text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  path text,
  referrer text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_menu_analytics_events_type_check CHECK (
    event_type IN (
      'menu_view',
      'product_click',
      'add_to_cart',
      'checkout_started',
      'order_completed'
    )
  ),
  CONSTRAINT public_menu_analytics_events_session_check CHECK (
    char_length(session_id) BETWEEN 16 AND 128
  )
);

CREATE INDEX IF NOT EXISTS idx_public_menu_analytics_events_restaurant_time
  ON public.public_menu_analytics_events (restaurant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_menu_analytics_events_restaurant_type_time
  ON public.public_menu_analytics_events (restaurant_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_menu_analytics_events_restaurant_source_time
  ON public.public_menu_analytics_events (restaurant_id, source, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_menu_analytics_events_product_time
  ON public.public_menu_analytics_events (restaurant_id, product_id, occurred_at DESC)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_public_menu_analytics_events_order
  ON public.public_menu_analytics_events (restaurant_id, order_id)
  WHERE order_id IS NOT NULL;

ALTER TABLE public.public_menu_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_menu_analytics_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant staff can view own public menu analytics events"
  ON public.public_menu_analytics_events;
CREATE POLICY "Restaurant staff can view own public menu analytics events"
ON public.public_menu_analytics_events FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.get_user_restaurant_id() = restaurant_id
  OR public.user_has_restaurant_permission(restaurant_id, 'reports_view'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'orders_metrics_view'::public.permission_type)
);

DROP POLICY IF EXISTS "Service role can manage public menu analytics events"
  ON public.public_menu_analytics_events;
CREATE POLICY "Service role can manage public menu analytics events"
ON public.public_menu_analytics_events FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

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
    'order_completed'
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
          FILTER (WHERE event_type = 'order_completed')::integer AS orders_completed
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
    )
    SELECT jsonb_build_object(
      'summary', jsonb_build_object(
        'menuViews', c.menu_views,
        'productClicks', c.product_clicks,
        'addToCart', c.add_to_cart,
        'checkoutStarted', c.checkout_started,
        'ordersCompleted', c.orders_completed,
        'viewToProductRate', CASE WHEN c.menu_views = 0 THEN 0 ELSE round((c.product_clicks::numeric / c.menu_views::numeric) * 100, 1) END,
        'productToCartRate', CASE WHEN c.product_clicks = 0 THEN 0 ELSE round((c.add_to_cart::numeric / c.product_clicks::numeric) * 100, 1) END,
        'cartToCheckoutRate', CASE WHEN c.add_to_cart = 0 THEN 0 ELSE round((c.checkout_started::numeric / c.add_to_cart::numeric) * 100, 1) END,
        'checkoutToOrderRate', CASE WHEN c.checkout_started = 0 THEN 0 ELSE round((c.orders_completed::numeric / c.checkout_started::numeric) * 100, 1) END,
        'viewToOrderRate', CASE WHEN c.menu_views = 0 THEN 0 ELSE round((c.orders_completed::numeric / c.menu_views::numeric) * 100, 1) END
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

COMMENT ON TABLE public.public_menu_analytics_events IS
  'Eventos anonimos do cardapio publico para funil de conversao por restaurante e origem.';
