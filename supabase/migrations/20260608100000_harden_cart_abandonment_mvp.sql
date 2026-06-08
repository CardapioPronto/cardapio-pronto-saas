-- Bloco 12: hardening de permissões, métricas e atribuição de recuperação.

DROP POLICY IF EXISTS "Restaurant staff can view own cart abandonment settings" ON public.cart_abandonment_settings;
CREATE POLICY "Restaurant staff can view own cart abandonment settings"
ON public.cart_abandonment_settings FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.restaurant_id = cart_abandonment_settings.restaurant_id
      AND u.user_type = 'owner'::public.user_type
  )
  OR public.user_has_restaurant_permission(restaurant_id, 'reports_view'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'orders_metrics_view'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_system_manage'::public.permission_type)
);

DROP POLICY IF EXISTS "Restaurant managers can manage own cart abandonment settings" ON public.cart_abandonment_settings;
CREATE POLICY "Restaurant managers can manage own cart abandonment settings"
ON public.cart_abandonment_settings FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.restaurant_id = cart_abandonment_settings.restaurant_id
      AND u.user_type = 'owner'::public.user_type
  )
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_system_manage'::public.permission_type)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.restaurant_id = cart_abandonment_settings.restaurant_id
      AND u.user_type = 'owner'::public.user_type
  )
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_system_manage'::public.permission_type)
);

CREATE OR REPLACE FUNCTION public.mark_cart_abandonment_recovered(
  p_restaurant_id uuid,
  p_session_token text,
  p_phone_normalized text,
  p_order_id uuid,
  p_total numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_settings public.cart_abandonment_settings%ROWTYPE;
  v_abandonment_minutes integer := 30;
  v_recovery_window_hours integer := 72;
BEGIN
  IF p_restaurant_id IS NULL OR p_order_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_settings
  FROM public.cart_abandonment_settings
  WHERE restaurant_id = p_restaurant_id;

  v_abandonment_minutes := COALESCE(v_settings.abandonment_minutes, 30);
  v_recovery_window_hours := COALESCE(v_settings.recovery_window_hours, 72);

  IF p_session_token IS NOT NULL AND btrim(p_session_token) <> '' THEN
    SELECT id INTO v_session_id
    FROM public.cart_abandonment_sessions
    WHERE restaurant_id = p_restaurant_id
      AND session_token = btrim(p_session_token)
      AND status IN ('active', 'abandoned', 'reminded')
      AND (
        status IN ('abandoned', 'reminded')
        OR last_activity_at <= now() - make_interval(mins => v_abandonment_minutes)
      )
    ORDER BY
      CASE status WHEN 'reminded' THEN 0 WHEN 'abandoned' THEN 1 ELSE 2 END,
      last_activity_at DESC
    LIMIT 1;
  END IF;

  IF v_session_id IS NULL AND p_phone_normalized IS NOT NULL THEN
    SELECT s.id INTO v_session_id
    FROM public.cart_abandonment_sessions s
    WHERE s.restaurant_id = p_restaurant_id
      AND s.phone_normalized = p_phone_normalized
      AND s.status IN ('active', 'abandoned', 'reminded')
      AND s.last_activity_at >= now() - make_interval(hours => v_recovery_window_hours)
      AND (
        s.status IN ('abandoned', 'reminded')
        OR s.last_activity_at <= now() - make_interval(mins => v_abandonment_minutes)
      )
    ORDER BY
      CASE s.status WHEN 'reminded' THEN 0 WHEN 'abandoned' THEN 1 ELSE 2 END,
      s.last_activity_at DESC
    LIMIT 1;
  END IF;

  IF v_session_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.cart_abandonment_sessions
  SET
    status = 'recovered',
    recovered_at = now(),
    recovered_order_id = p_order_id,
    recovered_revenue = GREATEST(COALESCE(p_total, 0), 0),
    updated_at = now()
  WHERE id = v_session_id
    AND status <> 'recovered';
END;
$$;

CREATE OR REPLACE FUNCTION public.save_cart_abandonment_settings(
  p_restaurant_id uuid,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.cart_abandonment_settings%ROWTYPE;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado.';
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
    OR public.user_has_restaurant_permission(p_restaurant_id, 'settings_manage'::public.permission_type)
    OR public.user_has_restaurant_permission(p_restaurant_id, 'settings_system_manage'::public.permission_type)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para alterar recuperação de carrinho.';
  END IF;

  INSERT INTO public.cart_abandonment_settings (restaurant_id)
  VALUES (p_restaurant_id)
  ON CONFLICT (restaurant_id) DO NOTHING;

  UPDATE public.cart_abandonment_settings
  SET
    enabled = COALESCE((p_patch->>'enabled')::boolean, enabled),
    abandonment_minutes = COALESCE(NULLIF(p_patch->>'abandonment_minutes', '')::integer, abandonment_minutes),
    remind_via_email = COALESCE((p_patch->>'remind_via_email')::boolean, remind_via_email),
    remind_via_whatsapp = COALESCE((p_patch->>'remind_via_whatsapp')::boolean, remind_via_whatsapp),
    recovery_coupon_code = CASE
      WHEN p_patch ? 'recovery_coupon_code' THEN NULLIF(upper(btrim(COALESCE(p_patch->>'recovery_coupon_code', ''))), '')
      ELSE recovery_coupon_code
    END,
    reminder_cooldown_days = COALESCE(NULLIF(p_patch->>'reminder_cooldown_days', '')::integer, reminder_cooldown_days),
    recovery_window_hours = COALESCE(NULLIF(p_patch->>'recovery_window_hours', '')::integer, recovery_window_hours),
    updated_at = now()
  WHERE restaurant_id = p_restaurant_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.save_cart_abandonment_settings(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_cart_abandonment_settings(uuid, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_cart_abandonment_dashboard(
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
    WITH settings_row AS (
      SELECT COALESCE(
        (
          SELECT to_jsonb(s.*)
          FROM public.cart_abandonment_settings s
          WHERE s.restaurant_id = p_restaurant_id
        ),
        jsonb_build_object(
          'restaurant_id', p_restaurant_id,
          'enabled', false,
          'abandonment_minutes', 30,
          'remind_via_email', true,
          'remind_via_whatsapp', false,
          'recovery_coupon_code', null,
          'reminder_cooldown_days', 7,
          'recovery_window_hours', 72
        )
      ) AS settings
    ),
    filtered AS (
      SELECT *
      FROM public.cart_abandonment_sessions s
      WHERE s.restaurant_id = p_restaurant_id
        AND s.created_at >= p_from
        AND s.created_at <= p_to
    ),
    metrics AS (
      SELECT
        count(*) FILTER (WHERE status IN ('abandoned', 'reminded', 'recovered', 'expired'))::integer AS tracked_abandonments,
        count(*) FILTER (WHERE reminded_at IS NOT NULL)::integer AS reminded,
        count(*) FILTER (WHERE status = 'recovered')::integer AS recovered,
        COALESCE(sum(recovered_revenue) FILTER (WHERE status = 'recovered'), 0)::numeric AS recovered_revenue,
        count(*) FILTER (WHERE status = 'active')::integer AS active_sessions
      FROM filtered
    ),
    recent AS (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'customerName', s.customer_name,
        'customerPhone', s.phone_normalized,
        'status', s.status,
        'cartSubtotal', s.cart_subtotal,
        'itemCount', s.item_count,
        'reminderChannel', s.reminder_channel,
        'recoveredRevenue', s.recovered_revenue,
        'lastActivityAt', s.last_activity_at,
        'abandonedAt', s.abandoned_at,
        'remindedAt', s.reminded_at,
        'recoveredAt', s.recovered_at
      ) ORDER BY s.last_activity_at DESC), '[]'::jsonb) AS items
      FROM (
        SELECT * FROM filtered ORDER BY last_activity_at DESC LIMIT 20
      ) s
    )
    SELECT jsonb_build_object(
      'settings', (SELECT settings FROM settings_row),
      'metrics', jsonb_build_object(
        'trackedAbandonments', m.tracked_abandonments,
        'reminded', m.reminded,
        'recovered', m.recovered,
        'recoveredRevenue', m.recovered_revenue,
        'activeSessions', m.active_sessions,
        'recoveryRate', CASE
          WHEN m.tracked_abandonments = 0 THEN 0
          ELSE round((m.recovered::numeric / m.tracked_abandonments::numeric) * 100, 1)
        END
      ),
      'recent', r.items
    )
    FROM metrics m
    CROSS JOIN recent r
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_cart_abandonment_dashboard(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cart_abandonment_dashboard(uuid, timestamptz, timestamptz) TO authenticated, service_role;
