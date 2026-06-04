-- Programa de indicações Pubfy — fundação (schema, RLS, RPCs).
-- Flag padrão: program_enabled = false até ativação comercial.

CREATE TABLE IF NOT EXISTS public.referral_program_settings (
  id text PRIMARY KEY DEFAULT 'default',
  program_enabled boolean NOT NULL DEFAULT false,
  accepting_new_referrals boolean NOT NULL DEFAULT true,
  accrual_enabled boolean NOT NULL DEFAULT true,
  paused_message text,
  paused_until timestamptz,
  default_commission_percent_monthly numeric(5, 2) NOT NULL DEFAULT 10,
  default_commission_percent_yearly numeric(5, 2) NOT NULL DEFAULT 10,
  attribution_window_days integer NOT NULL DEFAULT 90,
  hold_days_before_approval integer NOT NULL DEFAULT 30,
  min_payout_amount numeric(10, 2) NOT NULL DEFAULT 50,
  terms_version text NOT NULL DEFAULT '1',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT referral_program_settings_singleton CHECK (id = 'default'),
  CONSTRAINT referral_program_settings_monthly_pct CHECK (
    default_commission_percent_monthly >= 0 AND default_commission_percent_monthly <= 100
  ),
  CONSTRAINT referral_program_settings_yearly_pct CHECK (
    default_commission_percent_yearly >= 0 AND default_commission_percent_yearly <= 100
  ),
  CONSTRAINT referral_program_settings_attribution_days CHECK (
    attribution_window_days >= 1 AND attribution_window_days <= 365
  ),
  CONSTRAINT referral_program_settings_hold_days CHECK (
    hold_days_before_approval >= 0 AND hold_days_before_approval <= 180
  ),
  CONSTRAINT referral_program_settings_min_payout CHECK (min_payout_amount >= 0)
);

INSERT INTO public.referral_program_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  display_name text,
  document_cpf text,
  payout_pix_key text,
  terms_accepted_at timestamptz,
  terms_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_profiles_code_format CHECK (referral_code ~ '^[A-Z0-9][A-Z0-9-]{3,31}$'),
  CONSTRAINT affiliate_profiles_status_check CHECK (status IN ('active', 'suspended')),
  CONSTRAINT affiliate_profiles_referral_code_key UNIQUE (referral_code)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_code
  ON public.affiliate_profiles (referral_code);

CREATE TABLE IF NOT EXISTS public.restaurant_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  referral_code text NOT NULL,
  attributed_at timestamptz NOT NULL DEFAULT now(),
  first_click_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  CONSTRAINT restaurant_referrals_restaurant_unique UNIQUE (restaurant_id),
  CONSTRAINT restaurant_referrals_status_check CHECK (status IN ('active', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_restaurant_referrals_referrer
  ON public.restaurant_referrals (referrer_user_id, attributed_at DESC);

CREATE TABLE IF NOT EXISTS public.referral_commission_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  pagarme_reference text,
  billing_cycle text,
  gross_amount_cents bigint NOT NULL DEFAULT 0,
  commission_rate numeric(5, 2) NOT NULL DEFAULT 0,
  commission_amount_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  period_start timestamptz,
  period_end timestamptz,
  restaurant_paid_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_commission_ledger_status_check CHECK (
    status IN ('pending', 'approved', 'paid', 'reversed')
  ),
  CONSTRAINT referral_commission_ledger_pagarme_ref_unique UNIQUE (pagarme_reference)
);

CREATE INDEX IF NOT EXISTS idx_referral_commission_ledger_referrer
  ON public.referral_commission_ledger (referrer_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.affiliate_campaign_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  material_type text NOT NULL DEFAULT 'copy',
  storage_path text,
  external_url text,
  copy_template text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  visible_from timestamptz,
  visible_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT affiliate_campaign_materials_type_check CHECK (
    material_type IN ('image', 'pdf', 'copy', 'video_link')
  )
);

CREATE INDEX IF NOT EXISTS idx_affiliate_campaign_materials_active
  ON public.affiliate_campaign_materials (is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.affiliate_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  requested_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  admin_notes text,
  CONSTRAINT affiliate_payout_requests_amount_check CHECK (amount_cents > 0),
  CONSTRAINT affiliate_payout_requests_status_check CHECK (
    status IN ('requested', 'processing', 'paid', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payout_requests_user
  ON public.affiliate_payout_requests (user_id, requested_at DESC);

-- RLS
ALTER TABLE public.referral_program_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_program_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_referrals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commission_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_campaign_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_campaign_materials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payout_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage referral program settings" ON public.referral_program_settings;
CREATE POLICY "Super admins manage referral program settings"
ON public.referral_program_settings FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users read referral program settings" ON public.referral_program_settings;
CREATE POLICY "Authenticated users read referral program settings"
ON public.referral_program_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users manage own affiliate profile" ON public.affiliate_profiles;
CREATE POLICY "Users manage own affiliate profile"
ON public.affiliate_profiles FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins manage affiliate profiles" ON public.affiliate_profiles;
CREATE POLICY "Super admins manage affiliate profiles"
ON public.affiliate_profiles FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Referrers view own restaurant referrals" ON public.restaurant_referrals;
CREATE POLICY "Referrers view own restaurant referrals"
ON public.restaurant_referrals FOR SELECT
USING (referrer_user_id = auth.uid() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins manage restaurant referrals" ON public.restaurant_referrals;
CREATE POLICY "Super admins manage restaurant referrals"
ON public.restaurant_referrals FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Referrers view own commission ledger" ON public.referral_commission_ledger;
CREATE POLICY "Referrers view own commission ledger"
ON public.referral_commission_ledger FOR SELECT
USING (referrer_user_id = auth.uid() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins manage commission ledger" ON public.referral_commission_ledger;
CREATE POLICY "Super admins manage commission ledger"
ON public.referral_commission_ledger FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Affiliates read active campaign materials" ON public.affiliate_campaign_materials;
CREATE POLICY "Affiliates read active campaign materials"
ON public.affiliate_campaign_materials FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (visible_from IS NULL OR visible_from <= now())
  AND (visible_until IS NULL OR visible_until >= now())
);

DROP POLICY IF EXISTS "Super admins manage campaign materials" ON public.affiliate_campaign_materials;
CREATE POLICY "Super admins manage campaign materials"
ON public.affiliate_campaign_materials FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users manage own payout requests" ON public.affiliate_payout_requests;
CREATE POLICY "Users manage own payout requests"
ON public.affiliate_payout_requests FOR ALL
USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- Helpers
CREATE OR REPLACE FUNCTION public.normalize_referral_code(p_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(regexp_replace(trim(coalesce(p_raw, '')), '[^A-Za-z0-9-]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.generate_affiliate_referral_code(p_user_id uuid, p_seed text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix integer := 0;
BEGIN
  v_base := upper(substring(regexp_replace(coalesce(p_seed, ''), '[^A-Za-z0-9]', '', 'g') from 1 for 8));
  IF v_base IS NULL OR length(v_base) < 3 THEN
    v_base := upper(substring(replace(p_user_id::text, '-', '') from 1 for 8));
  END IF;

  LOOP
    IF v_suffix = 0 THEN
      v_candidate := v_base || '-' || upper(substring(md5(p_user_id::text || clock_timestamp()::text) from 1 for 4));
    ELSE
      v_candidate := v_base || '-' || lpad(v_suffix::text, 4, '0');
    END IF;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.affiliate_profiles ap WHERE ap.referral_code = v_candidate
    );

    v_suffix := v_suffix + 1;
    IF v_suffix > 9999 THEN
      RAISE EXCEPTION 'Não foi possível gerar código de indicação único';
    END IF;
  END LOOP;

  RETURN v_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referral_program_public_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.referral_program_settings%ROWTYPE;
  v_show_pause_message boolean;
BEGIN
  SELECT * INTO v_settings FROM public.referral_program_settings WHERE id = 'default';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'program_enabled', false,
      'accepting_new_referrals', false,
      'show_pause_message', true,
      'paused_message', 'Programa indisponível no momento.',
      'paused_until', NULL,
      'attribution_window_days', 90,
      'min_payout_amount', 50
    );
  END IF;

  v_show_pause_message := NOT v_settings.program_enabled OR NOT v_settings.accepting_new_referrals;

  RETURN jsonb_build_object(
    'program_enabled', v_settings.program_enabled,
    'accepting_new_referrals', v_settings.accepting_new_referrals,
    'show_pause_message', v_show_pause_message,
    'paused_message', v_settings.paused_message,
    'paused_until', v_settings.paused_until,
    'attribution_window_days', v_settings.attribution_window_days,
    'min_payout_amount', v_settings.min_payout_amount,
    'default_commission_percent_monthly', v_settings.default_commission_percent_monthly,
    'default_commission_percent_yearly', v_settings.default_commission_percent_yearly
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_referral_program_public_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_referral_program_public_settings() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_referral_program_admin_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_settings public.referral_program_settings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_super_admin(v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO v_settings FROM public.referral_program_settings WHERE id = 'default';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'program_enabled', false,
      'accepting_new_referrals', true,
      'accrual_enabled', true,
      'paused_message', null,
      'paused_until', null,
      'default_commission_percent_monthly', 10,
      'default_commission_percent_yearly', 10,
      'attribution_window_days', 90,
      'hold_days_before_approval', 30,
      'min_payout_amount', 50,
      'terms_version', '1'
    );
  END IF;

  RETURN jsonb_build_object(
    'program_enabled', v_settings.program_enabled,
    'accepting_new_referrals', v_settings.accepting_new_referrals,
    'accrual_enabled', v_settings.accrual_enabled,
    'paused_message', v_settings.paused_message,
    'paused_until', v_settings.paused_until,
    'default_commission_percent_monthly', v_settings.default_commission_percent_monthly,
    'default_commission_percent_yearly', v_settings.default_commission_percent_yearly,
    'attribution_window_days', v_settings.attribution_window_days,
    'hold_days_before_approval', v_settings.hold_days_before_approval,
    'min_payout_amount', v_settings.min_payout_amount,
    'terms_version', v_settings.terms_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_referral_program_admin_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_referral_program_admin_settings() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_affiliate_profile(
  p_display_name text DEFAULT NULL,
  p_accept_terms boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_settings public.referral_program_settings%ROWTYPE;
  v_profile public.affiliate_profiles%ROWTYPE;
  v_terms_version text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_settings FROM public.referral_program_settings WHERE id = 'default';
  IF NOT v_settings.program_enabled THEN
    RAISE EXCEPTION 'Programa de indicações desativado';
  END IF;

  IF NOT v_settings.accepting_new_referrals THEN
    RAISE EXCEPTION 'No momento não estamos aceitando novos afiliados';
  END IF;

  SELECT * INTO v_profile FROM public.affiliate_profiles WHERE user_id = v_user_id;
  v_terms_version := v_settings.terms_version;

  IF NOT FOUND THEN
    IF coalesce(p_accept_terms, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Aceite os termos do programa para continuar';
    END IF;

    INSERT INTO public.affiliate_profiles (
      user_id,
      referral_code,
      display_name,
      terms_accepted_at,
      terms_version
    )
    VALUES (
      v_user_id,
      public.generate_affiliate_referral_code(v_user_id, p_display_name),
      nullif(trim(coalesce(p_display_name, '')), ''),
      now(),
      v_terms_version
    )
    RETURNING * INTO v_profile;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_profile.user_id,
    'referral_code', v_profile.referral_code,
    'status', v_profile.status,
    'display_name', v_profile.display_name,
    'terms_accepted_at', v_profile.terms_accepted_at,
    'payout_pix_key', v_profile.payout_pix_key
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_affiliate_profile(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_affiliate_profile(text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.attribute_restaurant_referral(
  p_restaurant_id uuid,
  p_referral_code text,
  p_first_click_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.referral_program_settings%ROWTYPE;
  v_code text;
  v_referrer public.affiliate_profiles%ROWTYPE;
  v_owner_id uuid;
  v_existing public.restaurant_referrals%ROWTYPE;
  v_new_referral_id uuid;
  v_click_at timestamptz;
  v_window interval;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'missing_restaurant');
  END IF;

  v_code := public.normalize_referral_code(p_referral_code);
  IF v_code IS NULL OR length(v_code) < 4 THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'invalid_code');
  END IF;

  SELECT * INTO v_existing
  FROM public.restaurant_referrals
  WHERE restaurant_id = p_restaurant_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'attributed', true,
      'already_exists', true,
      'referral_id', v_existing.id,
      'referrer_user_id', v_existing.referrer_user_id
    );
  END IF;

  SELECT * INTO v_settings FROM public.referral_program_settings WHERE id = 'default';
  IF NOT coalesce(v_settings.program_enabled, false) THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'program_disabled');
  END IF;

  IF NOT coalesce(v_settings.accepting_new_referrals, false) THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'not_accepting_referrals');
  END IF;

  SELECT * INTO v_referrer
  FROM public.affiliate_profiles
  WHERE referral_code = v_code AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'code_not_found');
  END IF;

  SELECT owner_id INTO v_owner_id FROM public.restaurants WHERE id = p_restaurant_id;
  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'restaurant_not_found');
  END IF;

  IF v_referrer.user_id = v_owner_id THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'self_referral');
  END IF;

  v_click_at := coalesce(p_first_click_at, now());
  v_window := make_interval(days => coalesce(v_settings.attribution_window_days, 90));

  IF v_click_at < (now() - v_window) THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'attribution_expired');
  END IF;

  INSERT INTO public.restaurant_referrals (
    restaurant_id,
    referrer_user_id,
    referral_code,
    first_click_at
  )
  VALUES (
    p_restaurant_id,
    v_referrer.user_id,
    v_code,
    v_click_at
  )
  RETURNING id INTO v_new_referral_id;

  RETURN jsonb_build_object(
    'attributed', true,
    'referral_id', v_new_referral_id,
    'referrer_user_id', v_referrer.user_id,
    'referral_code', v_code
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('attributed', false, 'reason', 'already_attributed');
END;
$$;

REVOKE ALL ON FUNCTION public.attribute_restaurant_referral(uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attribute_restaurant_referral(uuid, text, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.save_referral_program_settings(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT public.is_super_admin(v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.referral_program_settings
  SET
    program_enabled = coalesce((p_payload->>'program_enabled')::boolean, program_enabled),
    accepting_new_referrals = coalesce((p_payload->>'accepting_new_referrals')::boolean, accepting_new_referrals),
    accrual_enabled = coalesce((p_payload->>'accrual_enabled')::boolean, accrual_enabled),
    paused_message = coalesce(nullif(trim(p_payload->>'paused_message'), ''), paused_message),
    paused_until = CASE
      WHEN p_payload ? 'paused_until' THEN (p_payload->>'paused_until')::timestamptz
      ELSE paused_until
    END,
    default_commission_percent_monthly = coalesce(
      (p_payload->>'default_commission_percent_monthly')::numeric,
      default_commission_percent_monthly
    ),
    default_commission_percent_yearly = coalesce(
      (p_payload->>'default_commission_percent_yearly')::numeric,
      default_commission_percent_yearly
    ),
    attribution_window_days = coalesce((p_payload->>'attribution_window_days')::integer, attribution_window_days),
    hold_days_before_approval = coalesce((p_payload->>'hold_days_before_approval')::integer, hold_days_before_approval),
    min_payout_amount = coalesce((p_payload->>'min_payout_amount')::numeric, min_payout_amount),
    terms_version = coalesce(nullif(trim(p_payload->>'terms_version'), ''), terms_version),
    updated_at = now(),
    updated_by = v_user_id
  WHERE id = 'default';

  RETURN public.get_referral_program_public_settings();
END;
$$;

REVOKE ALL ON FUNCTION public.save_referral_program_settings(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_referral_program_settings(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_affiliate_campaign_materials()
RETURNS SETOF public.affiliate_campaign_materials
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT m.*
  FROM public.affiliate_campaign_materials m
  WHERE m.is_active = true
    AND (m.visible_from IS NULL OR m.visible_from <= now())
    AND (m.visible_until IS NULL OR m.visible_until >= now())
  ORDER BY m.sort_order ASC, m.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_affiliate_campaign_materials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_affiliate_campaign_materials() TO authenticated;

COMMENT ON TABLE public.referral_program_settings IS
  'Configuração global do programa de indicações (singleton default).';
COMMENT ON TABLE public.affiliate_profiles IS
  'Perfil de afiliado vinculado a auth.users com código de indicação.';
COMMENT ON TABLE public.restaurant_referrals IS
  'Atribuição imutável de restaurante indicado por afiliado.';
COMMENT ON FUNCTION public.get_referral_program_public_settings() IS
  'Settings públicas do programa para landing e painel.';
COMMENT ON FUNCTION public.attribute_restaurant_referral(uuid, text, timestamptz) IS
  'Atribui indicação no cadastro do restaurante; chamada com service_role no finalize-owner-signup.';
