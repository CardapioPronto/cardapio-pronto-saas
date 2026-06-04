-- Landing testimonials controlled from Super Admin and submitted by authenticated restaurants.

CREATE TABLE IF NOT EXISTS public.landing_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_admin uuid REFERENCES public.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  author_name text NOT NULL,
  author_role text,
  restaurant_name text NOT NULL,
  avatar_url text,
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  source text NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'super_admin', 'external', 'imported')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected', 'archived')),
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  public_note text,
  internal_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landing_testimonials_message_length CHECK (char_length(trim(message)) BETWEEN 20 AND 700),
  CONSTRAINT landing_testimonials_author_length CHECK (char_length(trim(author_name)) BETWEEN 2 AND 120),
  CONSTRAINT landing_testimonials_restaurant_name_length CHECK (char_length(trim(restaurant_name)) BETWEEN 2 AND 160)
);

CREATE INDEX IF NOT EXISTS landing_testimonials_public_idx
  ON public.landing_testimonials (status, is_featured DESC, display_order ASC, published_at DESC);

CREATE INDEX IF NOT EXISTS landing_testimonials_restaurant_idx
  ON public.landing_testimonials (restaurant_id, created_at DESC);

ALTER TABLE public.landing_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant users can view own testimonials" ON public.landing_testimonials;
CREATE POLICY "Restaurant users can view own testimonials"
ON public.landing_testimonials
FOR SELECT
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Restaurant users can submit own testimonials" ON public.landing_testimonials;
CREATE POLICY "Restaurant users can submit own testimonials"
ON public.landing_testimonials
FOR INSERT
WITH CHECK (
  (
    restaurant_id = public.get_user_restaurant_id()
    AND created_by = auth.uid()
    AND source = 'app'
    AND status = 'pending'
  )
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Only super admins can manage testimonials" ON public.landing_testimonials;
CREATE POLICY "Only super admins can manage testimonials"
ON public.landing_testimonials
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_landing_testimonials_updated_at ON public.landing_testimonials;
CREATE TRIGGER update_landing_testimonials_updated_at
BEFORE UPDATE ON public.landing_testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.system_settings (key, value, description)
VALUES (
  'landing_testimonials_visible',
  'true'::jsonb,
  'Controla se a secao de depoimentos reais aparece na landing page publica.'
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_public_landing_testimonials(p_limit integer DEFAULT 6)
RETURNS TABLE (
  id uuid,
  message text,
  author_name text,
  author_role text,
  restaurant_name text,
  avatar_url text,
  rating integer,
  public_note text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visible boolean := true;
BEGIN
  SELECT COALESCE(NULLIF(BTRIM(ss.value::text, '"'), '')::boolean, true)
    INTO v_visible
  FROM public.system_settings ss
  WHERE ss.key = 'landing_testimonials_visible';

  v_visible := COALESCE(v_visible, true);

  IF NOT v_visible THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    lt.id,
    lt.message,
    lt.author_name,
    lt.author_role,
    lt.restaurant_name,
    lt.avatar_url,
    lt.rating,
    lt.public_note
  FROM public.landing_testimonials lt
  WHERE lt.status = 'published'
  ORDER BY lt.is_featured DESC, lt.display_order ASC, lt.published_at DESC NULLS LAST, lt.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 6), 1), 12);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_landing_testimonial(
  p_message text,
  p_author_name text DEFAULT NULL,
  p_author_role text DEFAULT NULL,
  p_rating integer DEFAULT 5
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_restaurant_id uuid;
  v_user_name text;
  v_restaurant_name text;
  v_logo_url text;
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  v_restaurant_id := public.get_user_restaurant_id();
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sem restaurante vinculado';
  END IF;

  SELECT u.name INTO v_user_name
  FROM public.users u
  WHERE u.id = v_user_id;

  SELECT r.name, r.logo_url INTO v_restaurant_name, v_logo_url
  FROM public.restaurants r
  WHERE r.id = v_restaurant_id;

  IF v_restaurant_name IS NULL THEN
    RAISE EXCEPTION 'Restaurante nao encontrado';
  END IF;

  INSERT INTO public.landing_testimonials (
    restaurant_id,
    created_by,
    message,
    author_name,
    author_role,
    restaurant_name,
    avatar_url,
    rating,
    source,
    status
  )
  VALUES (
    v_restaurant_id,
    v_user_id,
    trim(p_message),
    COALESCE(NULLIF(trim(p_author_name), ''), NULLIF(trim(v_user_name), ''), v_restaurant_name),
    COALESCE(NULLIF(trim(p_author_role), ''), 'Cliente Pubfy'),
    v_restaurant_name,
    v_logo_url,
    LEAST(GREATEST(COALESCE(p_rating, 5), 1), 5),
    'app',
    'pending'
  )
  RETURNING landing_testimonials.id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_landing_testimonials()
RETURNS TABLE (
  id uuid,
  message text,
  status text,
  rating integer,
  submitted_at timestamptz,
  published_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  v_restaurant_id := public.get_user_restaurant_id();
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sem restaurante vinculado';
  END IF;

  RETURN QUERY
  SELECT
    lt.id,
    lt.message,
    lt.status,
    lt.rating,
    lt.submitted_at,
    lt.published_at
  FROM public.landing_testimonials lt
  WHERE lt.restaurant_id = v_restaurant_id
  ORDER BY lt.created_at DESC
  LIMIT 5;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_search_testimonial_clients(
  p_search text DEFAULT '',
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  restaurant_id uuid,
  name text,
  email text,
  owner_name text,
  owner_email text,
  logo_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := '%' || lower(COALESCE(trim(p_search), '')) || '%';
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas super admins podem pesquisar clientes';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.email,
    u.name,
    u.email,
    r.logo_url
  FROM public.restaurants r
  LEFT JOIN public.users u ON u.id = r.owner_id
  WHERE
    COALESCE(trim(p_search), '') = ''
    OR lower(r.name) LIKE v_search
    OR lower(COALESCE(r.email, '')) LIKE v_search
    OR lower(COALESCE(u.name, '')) LIKE v_search
    OR lower(COALESCE(u.email, '')) LIKE v_search
  ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_landing_testimonials(p_status text DEFAULT 'todos')
RETURNS TABLE (
  id uuid,
  restaurant_id uuid,
  message text,
  author_name text,
  author_role text,
  restaurant_name text,
  avatar_url text,
  rating integer,
  source text,
  status text,
  is_featured boolean,
  display_order integer,
  public_note text,
  internal_notes text,
  submitted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  client_name text,
  client_email text,
  created_by_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas super admins podem listar depoimentos';
  END IF;

  RETURN QUERY
  SELECT
    lt.id,
    lt.restaurant_id,
    lt.message,
    lt.author_name,
    lt.author_role,
    lt.restaurant_name,
    lt.avatar_url,
    lt.rating,
    lt.source,
    lt.status,
    lt.is_featured,
    lt.display_order,
    lt.public_note,
    lt.internal_notes,
    lt.submitted_at,
    lt.published_at,
    lt.created_at,
    lt.updated_at,
    r.name,
    r.email,
    u.name
  FROM public.landing_testimonials lt
  LEFT JOIN public.restaurants r ON r.id = lt.restaurant_id
  LEFT JOIN public.users u ON u.id = lt.created_by
  WHERE p_status = 'todos' OR lt.status = p_status
  ORDER BY lt.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_landing_testimonial(
  p_id uuid DEFAULT NULL,
  p_restaurant_id uuid DEFAULT NULL,
  p_message text DEFAULT '',
  p_author_name text DEFAULT '',
  p_author_role text DEFAULT NULL,
  p_rating integer DEFAULT 5,
  p_source text DEFAULT 'super_admin',
  p_status text DEFAULT 'published',
  p_is_featured boolean DEFAULT false,
  p_display_order integer DEFAULT 0,
  p_public_note text DEFAULT NULL,
  p_internal_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_restaurant_name text;
  v_logo_url text;
  v_id uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_super_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Apenas super admins podem salvar depoimentos';
  END IF;

  IF p_restaurant_id IS NOT NULL THEN
    SELECT r.name, r.logo_url INTO v_restaurant_name, v_logo_url
    FROM public.restaurants r
    WHERE r.id = p_restaurant_id;

    IF v_restaurant_name IS NULL THEN
      RAISE EXCEPTION 'Cliente nao encontrado';
    END IF;
  END IF;

  IF v_restaurant_name IS NULL THEN
    v_restaurant_name := 'Cliente Pubfy';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.landing_testimonials (
      restaurant_id,
      created_by_admin,
      message,
      author_name,
      author_role,
      restaurant_name,
      avatar_url,
      rating,
      source,
      status,
      is_featured,
      display_order,
      public_note,
      internal_notes,
      published_at
    )
    VALUES (
      p_restaurant_id,
      v_admin_id,
      trim(p_message),
      COALESCE(NULLIF(trim(p_author_name), ''), v_restaurant_name),
      NULLIF(trim(p_author_role), ''),
      v_restaurant_name,
      v_logo_url,
      LEAST(GREATEST(COALESCE(p_rating, 5), 1), 5),
      CASE WHEN p_source IN ('super_admin', 'external', 'imported') THEN p_source ELSE 'super_admin' END,
      CASE WHEN p_status IN ('pending', 'published', 'rejected', 'archived') THEN p_status ELSE 'published' END,
      COALESCE(p_is_featured, false),
      COALESCE(p_display_order, 0),
      NULLIF(trim(p_public_note), ''),
      NULLIF(trim(p_internal_notes), ''),
      CASE WHEN p_status = 'published' THEN now() ELSE NULL END
    )
    RETURNING landing_testimonials.id INTO v_id;
  ELSE
    UPDATE public.landing_testimonials lt
    SET
      restaurant_id = p_restaurant_id,
      created_by_admin = v_admin_id,
      message = trim(p_message),
      author_name = COALESCE(NULLIF(trim(p_author_name), ''), v_restaurant_name),
      author_role = NULLIF(trim(p_author_role), ''),
      restaurant_name = v_restaurant_name,
      avatar_url = COALESCE(v_logo_url, lt.avatar_url),
      rating = LEAST(GREATEST(COALESCE(p_rating, lt.rating), 1), 5),
      source = CASE WHEN p_source IN ('app', 'super_admin', 'external', 'imported') THEN p_source ELSE lt.source END,
      status = CASE WHEN p_status IN ('pending', 'published', 'rejected', 'archived') THEN p_status ELSE lt.status END,
      is_featured = COALESCE(p_is_featured, false),
      display_order = COALESCE(p_display_order, 0),
      public_note = NULLIF(trim(p_public_note), ''),
      internal_notes = NULLIF(trim(p_internal_notes), ''),
      published_at = CASE
        WHEN p_status = 'published' THEN COALESCE(lt.published_at, now())
        ELSE NULL
      END
    WHERE lt.id = p_id
    RETURNING lt.id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Depoimento nao encontrado';
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_landing_testimonials(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_landing_testimonials(integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_landing_testimonial(text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_landing_testimonial(text, text, text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_landing_testimonials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_landing_testimonials() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_search_testimonial_clients(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_search_testimonial_clients(text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_list_landing_testimonials(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_landing_testimonials(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_upsert_landing_testimonial(uuid, uuid, text, text, text, integer, text, text, boolean, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_landing_testimonial(uuid, uuid, text, text, text, integer, text, text, boolean, integer, text, text) TO authenticated, service_role;

COMMENT ON TABLE public.landing_testimonials IS
  'Depoimentos reais exibidos na landing page, enviados por restaurantes autenticados ou cadastrados pelo Super Admin.';
