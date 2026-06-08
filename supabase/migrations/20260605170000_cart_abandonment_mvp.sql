-- Bloco 12: abandono de carrinho no cardápio público.

CREATE TABLE IF NOT EXISTS public.cart_abandonment_settings (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  abandonment_minutes integer NOT NULL DEFAULT 30,
  remind_via_email boolean NOT NULL DEFAULT true,
  remind_via_whatsapp boolean NOT NULL DEFAULT false,
  recovery_coupon_code text,
  reminder_cooldown_days integer NOT NULL DEFAULT 7,
  recovery_window_hours integer NOT NULL DEFAULT 72,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_abandonment_abandonment_minutes_check
    CHECK (abandonment_minutes BETWEEN 5 AND 1440),
  CONSTRAINT cart_abandonment_reminder_cooldown_days_check
    CHECK (reminder_cooldown_days BETWEEN 1 AND 30),
  CONSTRAINT cart_abandonment_recovery_window_hours_check
    CHECK (recovery_window_hours BETWEEN 1 AND 168)
);

CREATE TABLE IF NOT EXISTS public.cart_abandonment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  phone_normalized text NOT NULL,
  customer_name text,
  customer_email text,
  accepts_email_marketing boolean NOT NULL DEFAULT false,
  accepts_whatsapp_reminder boolean NOT NULL DEFAULT false,
  fulfillment_type text,
  cart_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  cart_subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  abandoned_at timestamptz,
  reminded_at timestamptz,
  reminder_channel text,
  recovered_at timestamptz,
  recovered_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  recovered_revenue numeric(10, 2),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_abandonment_sessions_token_unique UNIQUE (restaurant_id, session_token),
  CONSTRAINT cart_abandonment_sessions_phone_check CHECK (phone_normalized ~ '^\d{8,15}$'),
  CONSTRAINT cart_abandonment_sessions_status_check CHECK (
    status IN ('active', 'abandoned', 'reminded', 'recovered', 'expired')
  ),
  CONSTRAINT cart_abandonment_sessions_channel_check CHECK (
    reminder_channel IS NULL OR reminder_channel IN ('email', 'whatsapp')
  )
);

CREATE INDEX IF NOT EXISTS idx_cart_abandonment_sessions_restaurant_status_activity
  ON public.cart_abandonment_sessions (restaurant_id, status, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_cart_abandonment_sessions_restaurant_phone
  ON public.cart_abandonment_sessions (restaurant_id, phone_normalized, created_at DESC);

ALTER TABLE public.cart_abandonment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_abandonment_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cart_abandonment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_abandonment_sessions FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_cart_abandonment_settings_updated_at ON public.cart_abandonment_settings;
CREATE TRIGGER update_cart_abandonment_settings_updated_at
  BEFORE UPDATE ON public.cart_abandonment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cart_abandonment_sessions_updated_at ON public.cart_abandonment_sessions;
CREATE TRIGGER update_cart_abandonment_sessions_updated_at
  BEFORE UPDATE ON public.cart_abandonment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Restaurant staff can view own cart abandonment settings" ON public.cart_abandonment_settings;
CREATE POLICY "Restaurant staff can view own cart abandonment settings"
ON public.cart_abandonment_settings FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'reports_view'::public.permission_type)
);

DROP POLICY IF EXISTS "Restaurant managers can manage own cart abandonment settings" ON public.cart_abandonment_settings;
CREATE POLICY "Restaurant managers can manage own cart abandonment settings"
ON public.cart_abandonment_settings FOR ALL
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
)
WITH CHECK (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
);

DROP POLICY IF EXISTS "Restaurant staff can view own cart abandonment sessions" ON public.cart_abandonment_sessions;
CREATE POLICY "Restaurant staff can view own cart abandonment sessions"
ON public.cart_abandonment_sessions FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
  OR public.user_has_restaurant_permission(restaurant_id, 'reports_view'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'orders_metrics_view'::public.permission_type)
);

DROP POLICY IF EXISTS "Service role can manage cart abandonment sessions" ON public.cart_abandonment_sessions;
CREATE POLICY "Service role can manage cart abandonment sessions"
ON public.cart_abandonment_sessions FOR ALL
TO service_role
USING (true) WITH CHECK (true);

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
BEGIN
  IF p_restaurant_id IS NULL OR p_order_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_settings
  FROM public.cart_abandonment_settings
  WHERE restaurant_id = p_restaurant_id;

  IF p_session_token IS NOT NULL AND btrim(p_session_token) <> '' THEN
    SELECT id INTO v_session_id
    FROM public.cart_abandonment_sessions
    WHERE restaurant_id = p_restaurant_id
      AND session_token = btrim(p_session_token)
      AND status IN ('active', 'abandoned', 'reminded')
    ORDER BY last_activity_at DESC
    LIMIT 1;
  END IF;

  IF v_session_id IS NULL AND p_phone_normalized IS NOT NULL THEN
    SELECT s.id INTO v_session_id
    FROM public.cart_abandonment_sessions s
    WHERE s.restaurant_id = p_restaurant_id
      AND s.phone_normalized = p_phone_normalized
      AND s.status IN ('active', 'abandoned', 'reminded')
      AND s.last_activity_at >= now() - make_interval(hours => COALESCE(v_settings.recovery_window_hours, 72))
    ORDER BY s.last_activity_at DESC
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

CREATE OR REPLACE FUNCTION public.trigger_orders_mark_cart_abandonment_recovered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source = 'cardapio' AND COALESCE(NEW.customer_phone, '') <> '' THEN
    PERFORM public.mark_cart_abandonment_recovered(
      NEW.restaurant_id,
      NULL,
      public.normalize_customer_phone(NEW.customer_phone),
      NEW.id,
      NEW.total
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_mark_cart_abandonment_recovered ON public.orders;
CREATE TRIGGER trg_orders_mark_cart_abandonment_recovered
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_orders_mark_cart_abandonment_recovered();

CREATE OR REPLACE FUNCTION public.upsert_public_cart_abandonment_session(
  p_restaurant_id uuid,
  p_session_token text,
  p_phone text,
  p_customer_name text DEFAULT NULL,
  p_customer_email text DEFAULT NULL,
  p_accepts_email boolean DEFAULT false,
  p_accepts_whatsapp boolean DEFAULT false,
  p_fulfillment_type text DEFAULT NULL,
  p_cart_snapshot jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_settings public.cart_abandonment_settings%ROWTYPE;
  v_subtotal numeric := 0;
  v_item_count integer := 0;
  v_session_id uuid;
BEGIN
  PERFORM public._enforce_public_rate_limit('cart_abandonment_upsert', 30, 60);

  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado.';
  END IF;

  IF p_session_token IS NULL OR char_length(btrim(p_session_token)) < 8 THEN
    RAISE EXCEPTION 'Sessão inválida.';
  END IF;

  v_phone := public.normalize_customer_phone(p_phone);
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Telefone inválido.';
  END IF;

  SELECT * INTO v_settings
  FROM public.cart_abandonment_settings
  WHERE restaurant_id = p_restaurant_id;

  IF NOT COALESCE(v_settings.enabled, false) THEN
    RETURN jsonb_build_object('success', true, 'tracked', false, 'reason', 'disabled');
  END IF;

  v_subtotal := GREATEST(COALESCE(NULLIF(p_cart_snapshot->>'subtotal', '')::numeric, 0), 0);
  v_item_count := GREATEST(COALESCE(NULLIF(p_cart_snapshot->>'item_count', '')::integer, 0), 0);

  IF v_item_count <= 0 THEN
    RETURN jsonb_build_object('success', true, 'tracked', false, 'reason', 'empty_cart');
  END IF;

  INSERT INTO public.cart_abandonment_sessions (
    restaurant_id,
    session_token,
    phone_normalized,
    customer_name,
    customer_email,
    accepts_email_marketing,
    accepts_whatsapp_reminder,
    fulfillment_type,
    cart_snapshot,
    cart_subtotal,
    item_count,
    status,
    last_activity_at
  )
  VALUES (
    p_restaurant_id,
    btrim(p_session_token),
    v_phone,
    NULLIF(btrim(COALESCE(p_customer_name, '')), ''),
    NULLIF(btrim(COALESCE(p_customer_email, '')), ''),
    COALESCE(p_accepts_email, false),
    COALESCE(p_accepts_whatsapp, false),
    NULLIF(btrim(COALESCE(p_fulfillment_type, '')), ''),
    COALESCE(p_cart_snapshot, '{}'::jsonb),
    v_subtotal,
    v_item_count,
    'active',
    now()
  )
  ON CONFLICT (restaurant_id, session_token) DO UPDATE
  SET
    phone_normalized = EXCLUDED.phone_normalized,
    customer_name = COALESCE(EXCLUDED.customer_name, public.cart_abandonment_sessions.customer_name),
    customer_email = COALESCE(EXCLUDED.customer_email, public.cart_abandonment_sessions.customer_email),
    accepts_email_marketing = EXCLUDED.accepts_email_marketing,
    accepts_whatsapp_reminder = EXCLUDED.accepts_whatsapp_reminder,
    fulfillment_type = EXCLUDED.fulfillment_type,
    cart_snapshot = EXCLUDED.cart_snapshot,
    cart_subtotal = EXCLUDED.cart_subtotal,
    item_count = EXCLUDED.item_count,
    status = CASE
      WHEN public.cart_abandonment_sessions.status IN ('recovered', 'expired') THEN public.cart_abandonment_sessions.status
      ELSE 'active'
    END,
    abandoned_at = CASE
      WHEN public.cart_abandonment_sessions.status IN ('recovered', 'expired') THEN public.cart_abandonment_sessions.abandoned_at
      ELSE NULL
    END,
    reminded_at = CASE
      WHEN public.cart_abandonment_sessions.status IN ('recovered', 'expired') THEN public.cart_abandonment_sessions.reminded_at
      ELSE NULL
    END,
    reminder_channel = CASE
      WHEN public.cart_abandonment_sessions.status IN ('recovered', 'expired') THEN public.cart_abandonment_sessions.reminder_channel
      ELSE NULL
    END,
    last_activity_at = now(),
    updated_at = now()
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'tracked', true,
    'session_id', v_session_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_public_cart_abandonment_session(
  uuid, text, text, text, text, boolean, boolean, text, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_public_cart_abandonment_session(
  uuid, text, text, text, text, boolean, boolean, text, jsonb
) TO anon, authenticated, service_role;

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
    OR p_restaurant_id = public.get_user_restaurant_id()
    OR public.user_has_restaurant_permission(p_restaurant_id, 'settings_manage'::public.permission_type)
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
BEGIN
  PERFORM public.assert_restaurant_report_access(p_restaurant_id);

  IF p_to < p_from THEN
    RAISE EXCEPTION 'A data inicial não pode ser maior que a data final';
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
        count(*) FILTER (WHERE status IN ('abandoned', 'reminded', 'recovered'))::integer AS tracked_abandonments,
        count(*) FILTER (WHERE status = 'reminded')::integer AS reminded,
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

INSERT INTO public.email_templates (
  restaurant_id,
  template_key,
  name,
  description,
  category,
  subject,
  html_content,
  text_content,
  variables,
  is_system
)
VALUES (
  NULL,
  'cart_abandonment_recovery',
  'Recuperação de carrinho',
  'Lembrete enviado ao cliente que abandonou o carrinho no cardápio público.',
  'transactional',
  'Seu pedido em {{restaurant_name}} está quase pronto',
  '<h2>Seu carrinho está esperando</h2><p>Olá {{customer_name}},</p><p>Você deixou itens no cardápio de <strong>{{restaurant_name}}</strong> ({{item_count}} itens — {{cart_subtotal}}).</p><p>{{coupon_message}}</p><p><a href="{{menu_url}}">Voltar ao cardápio e finalizar pedido</a></p><p style="font-size:12px;color:#666;">Você recebeu este lembrete porque informou contato no checkout. Para parar, responda ou ignore.</p>',
  'Olá {{customer_name}}, você deixou {{item_count}} itens ({{cart_subtotal}}) no cardápio de {{restaurant_name}}. {{coupon_message}} Finalize em: {{menu_url}}',
  '["customer_name","restaurant_name","item_count","cart_subtotal","coupon_message","menu_url"]'::jsonb,
  true
)
ON CONFLICT (restaurant_id, template_key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  variables = EXCLUDED.variables,
  is_system = EXCLUDED.is_system,
  updated_at = now();

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $cron$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'cart-abandonment-cron-every-5-min'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'cart-abandonment-cron-every-5-min',
    '*/5 * * * *',
    $job$
    SELECT net.http_post(
      url := 'https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/cart-abandonment-cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', coalesce(
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1),
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
          ''
        )
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $job$
  );
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron/pg_net indisponível; agende cart-abandonment-cron manualmente.';
  WHEN OTHERS THEN
    RAISE NOTICE 'cart-abandonment cron não agendado: %', SQLERRM;
END;
$cron$;
