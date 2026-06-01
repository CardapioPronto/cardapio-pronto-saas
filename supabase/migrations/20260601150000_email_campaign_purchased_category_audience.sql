-- Bloco 3: purchased-category audience for campaign automation.

CREATE OR REPLACE FUNCTION public.get_email_campaign_recipients(
  p_restaurant_id uuid,
  p_audience_filter jsonb DEFAULT '{}'::jsonb,
  p_limit integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text := COALESCE(NULLIF(p_audience_filter->>'type', ''), 'marketing_opt_in');
  v_days integer := LEAST(GREATEST(COALESCE(NULLIF(p_audience_filter->>'days', '')::integer, 90), 1), 3650);
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 500), 1), 1000);
  v_category_id uuid := CASE
    WHEN COALESCE(p_audience_filter->>'categoryId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (p_audience_filter->>'categoryId')::uuid
    ELSE NULL
  END;
  v_result jsonb;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante nao informado.';
  END IF;

  WITH contact_base AS (
    SELECT
      c.id,
      c.restaurant_id,
      lower(c.email) AS email,
      c.name,
      c.unsubscribe_token,
      c.last_order_at AS contact_last_order_at,
      public.normalize_customer_phone(c.phone) AS phone_normalized,
      c.created_at
    FROM public.restaurant_email_contacts c
    WHERE c.restaurant_id = p_restaurant_id
      AND c.accepts_marketing = true
      AND c.unsubscribed_at IS NULL
  ),
  enriched AS (
    SELECT
      c.id,
      c.email,
      c.name,
      c.unsubscribe_token,
      COALESCE(o.last_order_at, c.contact_last_order_at) AS last_order_at,
      COALESCE(o.finalized_orders_count, 0) AS finalized_orders_count,
      COALESCE(o.total_spent, 0) AS total_spent,
      CASE
        WHEN COALESCE(o.finalized_orders_count, 0) > 0
          THEN COALESCE(o.total_spent, 0) / o.finalized_orders_count
        ELSE 0
      END AS avg_ticket,
      COALESCE(l.balance, 0) AS loyalty_balance,
      COALESCE(cat.category_orders_count, 0) AS category_orders_count,
      cat.category_last_order_at,
      c.created_at
    FROM contact_base c
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE o.status = 'finalizado')::integer AS finalized_orders_count,
        COALESCE(sum(o.total) FILTER (WHERE o.status = 'finalizado'), 0)::numeric AS total_spent,
        max(o.created_at) AS last_order_at
      FROM public.orders o
      WHERE o.restaurant_id = c.restaurant_id
        AND (
          (
            c.phone_normalized IS NOT NULL
            AND public.normalize_customer_phone(o.customer_phone) = c.phone_normalized
          )
          OR (
            c.phone_normalized IS NULL
            AND c.email IS NOT NULL
            AND lower(o.customer_email) = c.email
          )
        )
    ) o ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(lt.amount), 0)::numeric AS balance
      FROM public.loyalty_transactions lt
      WHERE lt.restaurant_id = c.restaurant_id
        AND c.phone_normalized IS NOT NULL
        AND lt.phone_normalized = c.phone_normalized
        AND (lt.expires_at IS NULL OR lt.expires_at > now())
    ) l ON true
    LEFT JOIN LATERAL (
      SELECT
        count(DISTINCT o.id)::integer AS category_orders_count,
        max(o.created_at) AS category_last_order_at
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      JOIN public.products p ON p.id = oi.product_id
      WHERE v_category_id IS NOT NULL
        AND o.restaurant_id = c.restaurant_id
        AND p.restaurant_id = c.restaurant_id
        AND p.category_id = v_category_id
        AND o.status = 'finalizado'
        AND o.created_at >= now() - make_interval(days => v_days)
        AND (
          (
            c.phone_normalized IS NOT NULL
            AND public.normalize_customer_phone(o.customer_phone) = c.phone_normalized
          )
          OR (
            c.phone_normalized IS NULL
            AND c.email IS NOT NULL
            AND lower(o.customer_email) = c.email
          )
        )
    ) cat ON true
  ),
  filtered AS (
    SELECT *
    FROM enriched
    WHERE CASE v_type
      WHEN 'recent_customers' THEN last_order_at >= now() - make_interval(days => v_days)
      WHEN 'inactive_customers' THEN last_order_at IS NOT NULL AND last_order_at <= now() - make_interval(days => v_days)
      WHEN 'first_order_no_repurchase' THEN finalized_orders_count = 1 AND last_order_at >= now() - make_interval(days => v_days)
      WHEN 'high_ticket' THEN total_spent >= 300 OR avg_ticket >= 80
      WHEN 'loyalty_balance' THEN loyalty_balance > 0
      WHEN 'purchased_category' THEN v_category_id IS NOT NULL AND category_orders_count > 0
      ELSE true
    END
  ),
  ranked AS (
    SELECT *
    FROM filtered
    ORDER BY
      CASE WHEN v_type = 'loyalty_balance' THEN loyalty_balance ELSE 0 END DESC,
      CASE WHEN v_type = 'high_ticket' THEN total_spent ELSE 0 END DESC,
      CASE WHEN v_type = 'purchased_category' THEN category_orders_count ELSE 0 END DESC,
      CASE WHEN v_type = 'purchased_category' THEN category_last_order_at ELSE NULL END DESC NULLS LAST,
      last_order_at DESC NULLS LAST,
      created_at DESC
    LIMIT v_limit
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'email', email,
        'name', name,
        'unsubscribe_token', unsubscribe_token,
        'last_order_at', last_order_at
      )
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM ranked;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_email_campaign_recipients(uuid, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_campaign_recipients(uuid, jsonb, integer) TO service_role;

COMMENT ON FUNCTION public.get_email_campaign_recipients(uuid, jsonb, integer) IS
  'Seleciona destinatarios de campanhas por comportamento, categoria comprada, opt-in e descadastro.';
