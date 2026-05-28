-- CRM 1.1: capture leads from real orders with opt-in and source metadata.

CREATE OR REPLACE FUNCTION public.capture_crm_lead_from_order(
  p_order_id uuid,
  p_accepts_marketing boolean DEFAULT NULL,
  p_source text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_phone text;
  v_source text;
  v_email text;
  v_profile public.crm_customer_profiles%ROWTYPE;
  v_can_manage boolean := false;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Pedido nao informado.';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido nao encontrado.';
  END IF;

  IF auth.role() = 'authenticated' THEN
    v_can_manage :=
      public.is_super_admin(auth.uid())
      OR public.user_has_restaurant_permission(v_order.restaurant_id, 'pdv_access'::public.permission_type)
      OR public.user_has_restaurant_permission(v_order.restaurant_id, 'orders_view'::public.permission_type)
      OR public.user_has_restaurant_permission(v_order.restaurant_id, 'orders_metrics_view'::public.permission_type);

    IF NOT v_can_manage THEN
      RAISE EXCEPTION 'Sem permissao para capturar cliente deste pedido.';
    END IF;
  ELSIF auth.role() = 'anon' THEN
    IF v_order.source IS DISTINCT FROM 'cardapio'
       OR v_order.created_at < now() - interval '2 hours' THEN
      RAISE EXCEPTION 'Pedido publico indisponivel para captura de lead.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Sem permissao para capturar cliente.';
  END IF;

  v_phone := public.normalize_customer_phone(v_order.customer_phone);

  IF v_phone IS NULL THEN
    RETURN jsonb_build_object(
      'captured', false,
      'reason', 'missing_phone',
      'order_id', v_order.id
    );
  END IF;

  v_source := COALESCE(NULLIF(btrim(p_source), ''), v_order.source, v_order.order_type, 'pedido');
  v_email := NULLIF(lower(btrim(COALESCE(v_order.customer_email, ''))), '');

  INSERT INTO public.crm_customer_profiles (
    restaurant_id,
    phone_normalized,
    name,
    email,
    accepts_marketing,
    source,
    metadata
  )
  VALUES (
    v_order.restaurant_id,
    v_phone,
    NULLIF(btrim(COALESCE(v_order.customer_name, '')), ''),
    v_email,
    CASE WHEN p_accepts_marketing IS TRUE THEN true ELSE NULL END,
    v_source,
    jsonb_build_object(
      'last_order_id', v_order.id,
      'last_order_source', v_source,
      'last_captured_at', now()
    )
  )
  ON CONFLICT (restaurant_id, phone_normalized) DO UPDATE
  SET
    name = COALESCE(EXCLUDED.name, public.crm_customer_profiles.name),
    email = COALESCE(EXCLUDED.email, public.crm_customer_profiles.email),
    accepts_marketing = CASE
      WHEN EXCLUDED.accepts_marketing IS TRUE THEN true
      ELSE public.crm_customer_profiles.accepts_marketing
    END,
    source = COALESCE(EXCLUDED.source, public.crm_customer_profiles.source),
    metadata = public.crm_customer_profiles.metadata || EXCLUDED.metadata,
    updated_at = now()
  RETURNING * INTO v_profile;

  IF v_email IS NOT NULL THEN
    INSERT INTO public.restaurant_email_contacts (
      restaurant_id,
      email,
      name,
      phone,
      source,
      accepts_marketing,
      last_order_at
    )
    VALUES (
      v_order.restaurant_id,
      v_email,
      NULLIF(btrim(COALESCE(v_order.customer_name, '')), ''),
      v_order.customer_phone,
      v_source,
      COALESCE(p_accepts_marketing, false),
      v_order.created_at
    )
    ON CONFLICT (restaurant_id, email) DO UPDATE
    SET
      name = COALESCE(EXCLUDED.name, public.restaurant_email_contacts.name),
      phone = COALESCE(EXCLUDED.phone, public.restaurant_email_contacts.phone),
      source = EXCLUDED.source,
      accepts_marketing = public.restaurant_email_contacts.accepts_marketing OR EXCLUDED.accepts_marketing,
      last_order_at = GREATEST(
        COALESCE(public.restaurant_email_contacts.last_order_at, EXCLUDED.last_order_at),
        EXCLUDED.last_order_at
      ),
      updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'captured', true,
    'profile', to_jsonb(v_profile),
    'order_id', v_order.id,
    'source', v_source
  );
END;
$$;

REVOKE ALL ON FUNCTION public.capture_crm_lead_from_order(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_crm_lead_from_order(uuid, boolean, text) TO anon, authenticated;

COMMENT ON FUNCTION public.capture_crm_lead_from_order(uuid, boolean, text) IS
  'Captura ou enriquece um cliente do CRM a partir de um pedido real, preservando opt-ins ja concedidos.';
