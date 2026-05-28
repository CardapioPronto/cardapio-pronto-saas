-- CRM MVP: customer summaries derived from orders and marketing contacts,
-- plus a small profile table for tags, notes and manual enrichment.

CREATE OR REPLACE FUNCTION public.normalize_customer_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'), '');
$$;

CREATE TABLE IF NOT EXISTS public.crm_customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone_normalized text NOT NULL,
  name text,
  email text,
  birth_date date,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  notes text,
  accepts_marketing boolean,
  source text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_customer_profiles_phone_check CHECK (phone_normalized ~ '^\d{8,15}$'),
  CONSTRAINT crm_customer_profiles_unique_phone UNIQUE (restaurant_id, phone_normalized)
);

ALTER TABLE public.crm_customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customer_profiles FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_crm_customer_profiles_restaurant_updated
  ON public.crm_customer_profiles (restaurant_id, updated_at DESC);

DROP POLICY IF EXISTS "Restaurant staff can view own CRM customer profiles" ON public.crm_customer_profiles;
CREATE POLICY "Restaurant staff can view own CRM customer profiles"
ON public.crm_customer_profiles FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Restaurant staff can manage own CRM customer profiles" ON public.crm_customer_profiles;
CREATE POLICY "Restaurant staff can manage own CRM customer profiles"
ON public.crm_customer_profiles FOR ALL
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP TRIGGER IF EXISTS update_crm_customer_profiles_updated_at ON public.crm_customer_profiles;
CREATE TRIGGER update_crm_customer_profiles_updated_at
BEFORE UPDATE ON public.crm_customer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.assert_crm_access(p_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante nao informado.';
  END IF;

  IF public.is_super_admin(auth.uid()) THEN
    RETURN;
  END IF;

  IF public.user_has_restaurant_permission(p_restaurant_id, 'orders_view'::public.permission_type)
    OR public.user_has_restaurant_permission(p_restaurant_id, 'reports_view'::public.permission_type)
    OR public.user_has_restaurant_permission(p_restaurant_id, 'orders_metrics_view'::public.permission_type)
  THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Sem permissao para acessar o CRM.';
END;
$$;

REVOKE ALL ON FUNCTION public.assert_crm_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_crm_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_restaurant_crm_customers(
  p_restaurant_id uuid,
  p_search text DEFAULT NULL,
  p_segment text DEFAULT 'all',
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_search text := NULLIF(btrim(COALESCE(p_search, '')), '');
  v_segment text := COALESCE(NULLIF(btrim(p_segment), ''), 'all');
  v_result jsonb;
BEGIN
  PERFORM public.assert_crm_access(p_restaurant_id);

  WITH order_customers AS (
    SELECT
      o.restaurant_id,
      public.normalize_customer_phone(o.customer_phone) AS phone_normalized,
      (array_agg(NULLIF(btrim(o.customer_name), '') ORDER BY o.created_at DESC))[1] AS order_name,
      (array_agg(NULLIF(lower(btrim(o.customer_email)), '') ORDER BY o.created_at DESC)
        FILTER (WHERE o.customer_email IS NOT NULL AND btrim(o.customer_email) <> ''))[1] AS order_email,
      count(*) FILTER (WHERE o.status <> 'cancelado')::integer AS orders_count,
      count(*) FILTER (WHERE o.status = 'finalizado')::integer AS finalized_orders_count,
      COALESCE(sum(o.total) FILTER (WHERE o.status = 'finalizado'), 0)::numeric AS total_spent,
      min(o.created_at) AS first_order_at,
      max(o.created_at) AS last_order_at,
      (array_agg(COALESCE(o.source, o.order_type, 'pdv') ORDER BY o.created_at DESC))[1] AS last_source,
      array_remove(array_agg(DISTINCT COALESCE(o.source, o.order_type, 'pdv')), NULL) AS sources
    FROM public.orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND public.normalize_customer_phone(o.customer_phone) IS NOT NULL
    GROUP BY o.restaurant_id, public.normalize_customer_phone(o.customer_phone)
  ),
  contact_customers AS (
    SELECT
      c.restaurant_id,
      public.normalize_customer_phone(c.phone) AS phone_normalized,
      (array_agg(NULLIF(btrim(c.name), '') ORDER BY c.updated_at DESC))[1] AS contact_name,
      (array_agg(lower(c.email) ORDER BY c.updated_at DESC))[1] AS contact_email,
      bool_or(c.accepts_marketing AND c.unsubscribed_at IS NULL) AS accepts_marketing,
      (array_agg(c.source ORDER BY c.updated_at DESC))[1] AS contact_source
    FROM public.restaurant_email_contacts c
    WHERE c.restaurant_id = p_restaurant_id
      AND public.normalize_customer_phone(c.phone) IS NOT NULL
    GROUP BY c.restaurant_id, public.normalize_customer_phone(c.phone)
  ),
  keys AS (
    SELECT restaurant_id, phone_normalized FROM order_customers
    UNION
    SELECT restaurant_id, phone_normalized FROM contact_customers
    UNION
    SELECT restaurant_id, phone_normalized FROM public.crm_customer_profiles WHERE restaurant_id = p_restaurant_id
  ),
  base AS (
    SELECT
      k.phone_normalized,
      COALESCE(p.name, o.order_name, c.contact_name, 'Cliente') AS name,
      COALESCE(p.email, o.order_email, c.contact_email) AS email,
      COALESCE(p.accepts_marketing, c.accepts_marketing, false) AS accepts_marketing,
      COALESCE(p.tags, '{}'::text[]) AS tags,
      p.notes,
      p.birth_date,
      COALESCE(p.source, c.contact_source, o.last_source, 'pedido') AS source,
      COALESCE(o.orders_count, 0) AS orders_count,
      COALESCE(o.finalized_orders_count, 0) AS finalized_orders_count,
      COALESCE(o.total_spent, 0) AS total_spent,
      CASE
        WHEN COALESCE(o.finalized_orders_count, 0) > 0
          THEN COALESCE(o.total_spent, 0) / o.finalized_orders_count
        ELSE 0
      END AS avg_ticket,
      o.first_order_at,
      o.last_order_at,
      o.last_source,
      COALESCE(o.sources, '{}'::text[]) AS sources,
      p.updated_at AS profile_updated_at
    FROM keys k
    LEFT JOIN order_customers o
      ON o.restaurant_id = k.restaurant_id AND o.phone_normalized = k.phone_normalized
    LEFT JOIN contact_customers c
      ON c.restaurant_id = k.restaurant_id AND c.phone_normalized = k.phone_normalized
    LEFT JOIN public.crm_customer_profiles p
      ON p.restaurant_id = k.restaurant_id AND p.phone_normalized = k.phone_normalized
  ),
  filtered AS (
    SELECT *
    FROM base
    WHERE (
      v_search IS NULL
      OR name ILIKE '%' || v_search || '%'
      OR COALESCE(email, '') ILIKE '%' || v_search || '%'
      OR phone_normalized ILIKE '%' || regexp_replace(v_search, '\D', '', 'g') || '%'
      OR EXISTS (SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE '%' || v_search || '%')
    )
    AND (
      v_segment = 'all'
      OR (v_segment = 'new' AND orders_count = 1 AND last_order_at >= now() - interval '30 days')
      OR (v_segment = 'recurring' AND orders_count >= 2)
      OR (v_segment = 'inactive' AND last_order_at < now() - interval '30 days')
      OR (v_segment = 'high_ticket' AND (total_spent >= 300 OR avg_ticket >= 80))
      OR (v_segment = 'marketing' AND accepts_marketing = true)
      OR (v_segment = 'no_orders' AND orders_count = 0)
    )
  ),
  numbered AS (
    SELECT *, count(*) OVER () AS total_count
    FROM filtered
    ORDER BY last_order_at DESC NULLS LAST, name ASC
    LIMIT v_limit OFFSET v_offset
  )
  SELECT jsonb_build_object(
    'total', COALESCE(max(numbered.total_count), 0),
    'customers', COALESCE(jsonb_agg(to_jsonb(numbered) - 'total_count'), '[]'::jsonb),
    'metrics', (
      SELECT jsonb_build_object(
        'total_customers', count(*),
        'with_marketing_opt_in', count(*) FILTER (WHERE accepts_marketing),
        'recurring_customers', count(*) FILTER (WHERE orders_count >= 2),
        'inactive_customers', count(*) FILTER (WHERE last_order_at < now() - interval '30 days'),
        'total_spent', COALESCE(sum(total_spent), 0),
        'average_ticket', COALESCE(avg(NULLIF(avg_ticket, 0)), 0)
      )
      FROM filtered
    )
  )
  INTO v_result
  FROM numbered;

  RETURN COALESCE(v_result, jsonb_build_object(
    'total', 0,
    'customers', '[]'::jsonb,
    'metrics', jsonb_build_object(
      'total_customers', 0,
      'with_marketing_opt_in', 0,
      'recurring_customers', 0,
      'inactive_customers', 0,
      'total_spent', 0,
      'average_ticket', 0
    )
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.get_restaurant_crm_customers(uuid, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_restaurant_crm_customers(uuid, text, text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_restaurant_crm_customer_detail(
  p_restaurant_id uuid,
  p_phone_normalized text,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := public.normalize_customer_phone(p_phone_normalized);
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  v_result jsonb;
BEGIN
  PERFORM public.assert_crm_access(p_restaurant_id);

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Telefone do cliente nao informado.';
  END IF;

  WITH customer_orders AS (
    SELECT o.*
    FROM public.orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND public.normalize_customer_phone(o.customer_phone) = v_phone
    ORDER BY o.created_at DESC
    LIMIT v_limit
  ),
  profile AS (
    SELECT *
    FROM public.crm_customer_profiles
    WHERE restaurant_id = p_restaurant_id
      AND phone_normalized = v_phone
  ),
  contact AS (
    SELECT
      (array_agg(NULLIF(btrim(name), '') ORDER BY updated_at DESC))[1] AS name,
      (array_agg(lower(email) ORDER BY updated_at DESC))[1] AS email,
      bool_or(accepts_marketing AND unsubscribed_at IS NULL) AS accepts_marketing
    FROM public.restaurant_email_contacts
    WHERE restaurant_id = p_restaurant_id
      AND public.normalize_customer_phone(phone) = v_phone
  ),
  order_summary AS (
    SELECT
      (array_agg(NULLIF(btrim(customer_name), '') ORDER BY created_at DESC))[1] AS name,
      (array_agg(NULLIF(lower(btrim(customer_email)), '') ORDER BY created_at DESC)
        FILTER (WHERE customer_email IS NOT NULL AND btrim(customer_email) <> ''))[1] AS email,
      count(*) FILTER (WHERE status <> 'cancelado')::integer AS orders_count,
      count(*) FILTER (WHERE status = 'finalizado')::integer AS finalized_orders_count,
      COALESCE(sum(total) FILTER (WHERE status = 'finalizado'), 0)::numeric AS total_spent,
      min(created_at) AS first_order_at,
      max(created_at) AS last_order_at
    FROM public.orders
    WHERE restaurant_id = p_restaurant_id
      AND public.normalize_customer_phone(customer_phone) = v_phone
  )
  SELECT jsonb_build_object(
    'customer', jsonb_build_object(
      'phone_normalized', v_phone,
      'name', COALESCE(profile.name, order_summary.name, contact.name, 'Cliente'),
      'email', COALESCE(profile.email, order_summary.email, contact.email),
      'birth_date', profile.birth_date,
      'tags', COALESCE(profile.tags, '{}'::text[]),
      'notes', profile.notes,
      'accepts_marketing', COALESCE(profile.accepts_marketing, contact.accepts_marketing, false),
      'orders_count', COALESCE(order_summary.orders_count, 0),
      'finalized_orders_count', COALESCE(order_summary.finalized_orders_count, 0),
      'total_spent', COALESCE(order_summary.total_spent, 0),
      'avg_ticket', CASE
        WHEN COALESCE(order_summary.finalized_orders_count, 0) > 0
          THEN COALESCE(order_summary.total_spent, 0) / order_summary.finalized_orders_count
        ELSE 0
      END,
      'first_order_at', order_summary.first_order_at,
      'last_order_at', order_summary.last_order_at
    ),
    'orders', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'order_number', o.order_number,
          'created_at', o.created_at,
          'status', o.status,
          'total', o.total,
          'source', o.source,
          'order_type', o.order_type,
          'payment_method', o.payment_method,
          'items', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', oi.id,
                'product_name', oi.product_name,
                'quantity', oi.quantity,
                'price', oi.price,
                'observations', oi.observations
              )
              ORDER BY oi.created_at ASC
            )
            FROM public.order_items oi
            WHERE oi.order_id = o.id
          ), '[]'::jsonb)
        )
        ORDER BY o.created_at DESC
      )
      FROM customer_orders o
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM order_summary
  CROSS JOIN contact
  LEFT JOIN profile ON true;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_restaurant_crm_customer_detail(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_restaurant_crm_customer_detail(uuid, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_crm_customer_profile(
  p_restaurant_id uuid,
  p_phone_normalized text,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := public.normalize_customer_phone(p_phone_normalized);
  v_tags text[] := '{}'::text[];
  v_saved public.crm_customer_profiles%ROWTYPE;
BEGIN
  PERFORM public.assert_crm_access(p_restaurant_id);

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Telefone do cliente nao informado.';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT btrim(value)), '{}'::text[])
  INTO v_tags
  FROM jsonb_array_elements_text(COALESCE(p_patch->'tags', '[]'::jsonb)) AS value
  WHERE btrim(value) <> '';

  INSERT INTO public.crm_customer_profiles (
    restaurant_id,
    phone_normalized,
    name,
    email,
    birth_date,
    tags,
    notes,
    accepts_marketing,
    source,
    metadata
  )
  VALUES (
    p_restaurant_id,
    v_phone,
    NULLIF(btrim(COALESCE(p_patch->>'name', '')), ''),
    NULLIF(lower(btrim(COALESCE(p_patch->>'email', ''))), ''),
    NULLIF(p_patch->>'birth_date', '')::date,
    COALESCE(v_tags, '{}'::text[]),
    NULLIF(btrim(COALESCE(p_patch->>'notes', '')), ''),
    CASE WHEN p_patch ? 'accepts_marketing' THEN (p_patch->>'accepts_marketing')::boolean ELSE NULL END,
    COALESCE(NULLIF(btrim(p_patch->>'source'), ''), 'manual'),
    COALESCE(p_patch->'metadata', '{}'::jsonb)
  )
  ON CONFLICT (restaurant_id, phone_normalized) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    birth_date = EXCLUDED.birth_date,
    tags = EXCLUDED.tags,
    notes = EXCLUDED.notes,
    accepts_marketing = EXCLUDED.accepts_marketing,
    source = EXCLUDED.source,
    metadata = public.crm_customer_profiles.metadata || EXCLUDED.metadata,
    updated_at = now()
  RETURNING * INTO v_saved;

  RETURN to_jsonb(v_saved);
END;
$$;

REVOKE ALL ON FUNCTION public.update_crm_customer_profile(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_crm_customer_profile(uuid, text, jsonb) TO authenticated;

COMMENT ON TABLE public.crm_customer_profiles IS
  'Enriquecimento manual do CRM por telefone normalizado. Os indicadores continuam derivados de pedidos e contatos.';
