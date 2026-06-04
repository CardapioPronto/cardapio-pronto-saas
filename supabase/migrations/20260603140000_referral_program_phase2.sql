-- Programa de indicações — fase 2: comissões, saques, materiais (admin), dashboard afiliado.

INSERT INTO storage.buckets (id, name, public)
VALUES ('affiliate-campaign-assets', 'affiliate-campaign-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read affiliate campaign assets" ON storage.objects;
CREATE POLICY "Public read affiliate campaign assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'affiliate-campaign-assets');

DROP POLICY IF EXISTS "Super admins manage affiliate campaign assets" ON storage.objects;
CREATE POLICY "Super admins manage affiliate campaign assets"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'affiliate-campaign-assets'
  AND public.is_super_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'affiliate-campaign-assets'
  AND public.is_super_admin(auth.uid())
);

CREATE OR REPLACE FUNCTION public.mature_referral_commissions(p_referrer_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold_days integer;
  v_updated integer;
BEGIN
  SELECT hold_days_before_approval INTO v_hold_days
  FROM public.referral_program_settings
  WHERE id = 'default';

  v_hold_days := coalesce(v_hold_days, 30);

  UPDATE public.referral_commission_ledger l
  SET
    status = 'approved',
    approved_at = now()
  WHERE l.status = 'pending'
    AND l.restaurant_paid_at IS NOT NULL
    AND l.restaurant_paid_at + make_interval(days => v_hold_days) <= now()
    AND (p_referrer_user_id IS NULL OR l.referrer_user_id = p_referrer_user_id);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.mature_referral_commissions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mature_referral_commissions(uuid) TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.accrue_referral_commission_for_payment(
  p_subscription_id uuid,
  p_pagarme_reference text,
  p_gross_amount_cents bigint,
  p_restaurant_paid_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.referral_program_settings%ROWTYPE;
  v_sub record;
  v_referral public.restaurant_referrals%ROWTYPE;
  v_rate numeric(5, 2);
  v_commission_cents bigint;
  v_ledger_id uuid;
BEGIN
  IF p_subscription_id IS NULL OR p_pagarme_reference IS NULL OR trim(p_pagarme_reference) = '' THEN
    RETURN jsonb_build_object('accrued', false, 'reason', 'invalid_input');
  END IF;

  IF coalesce(p_gross_amount_cents, 0) <= 0 THEN
    RETURN jsonb_build_object('accrued', false, 'reason', 'zero_amount');
  END IF;

  SELECT * INTO v_settings FROM public.referral_program_settings WHERE id = 'default';
  IF NOT coalesce(v_settings.program_enabled, false) OR NOT coalesce(v_settings.accrual_enabled, false) THEN
    RETURN jsonb_build_object('accrued', false, 'reason', 'program_disabled');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.referral_commission_ledger
    WHERE pagarme_reference = trim(p_pagarme_reference)
  ) THEN
    RETURN jsonb_build_object('accrued', false, 'reason', 'duplicate_reference');
  END IF;

  SELECT s.id, s.restaurant_id, s.billing_cycle, s.current_period_start, s.current_period_end
  INTO v_sub
  FROM public.subscriptions s
  WHERE s.id = p_subscription_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('accrued', false, 'reason', 'subscription_not_found');
  END IF;

  SELECT * INTO v_referral
  FROM public.restaurant_referrals
  WHERE restaurant_id = v_sub.restaurant_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('accrued', false, 'reason', 'no_referral');
  END IF;

  v_rate := CASE
    WHEN v_sub.billing_cycle = 'yearly' THEN v_settings.default_commission_percent_yearly
    ELSE v_settings.default_commission_percent_monthly
  END;

  v_commission_cents := floor(p_gross_amount_cents::numeric * v_rate / 100)::bigint;

  IF v_commission_cents <= 0 THEN
    RETURN jsonb_build_object('accrued', false, 'reason', 'zero_commission');
  END IF;

  INSERT INTO public.referral_commission_ledger (
    restaurant_id,
    referrer_user_id,
    subscription_id,
    pagarme_reference,
    billing_cycle,
    gross_amount_cents,
    commission_rate,
    commission_amount_cents,
    status,
    period_start,
    period_end,
    restaurant_paid_at
  )
  VALUES (
    v_sub.restaurant_id,
    v_referral.referrer_user_id,
    v_sub.id,
    trim(p_pagarme_reference),
    v_sub.billing_cycle,
    p_gross_amount_cents,
    v_rate,
    v_commission_cents,
    'pending',
    v_sub.current_period_start,
    v_sub.current_period_end,
    coalesce(p_restaurant_paid_at, now())
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'accrued', true,
    'ledger_id', v_ledger_id,
    'commission_amount_cents', v_commission_cents,
    'referrer_user_id', v_referral.referrer_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accrue_referral_commission_for_payment(uuid, text, bigint, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accrue_referral_commission_for_payment(uuid, text, bigint, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.reverse_referral_commission_for_payment(p_pagarme_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF p_pagarme_reference IS NULL OR trim(p_pagarme_reference) = '' THEN
    RETURN jsonb_build_object('reversed', false, 'reason', 'invalid_reference');
  END IF;

  UPDATE public.referral_commission_ledger
  SET status = 'reversed'
  WHERE pagarme_reference = trim(p_pagarme_reference)
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('reversed', v_updated > 0, 'rows', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_referral_commission_for_payment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverse_referral_commission_for_payment(text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_affiliate_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.affiliate_profiles%ROWTYPE;
  v_settings public.referral_program_settings%ROWTYPE;
  v_pending_cents bigint := 0;
  v_approved_cents bigint := 0;
  v_paid_cents bigint := 0;
  v_open_request record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  PERFORM public.mature_referral_commissions(v_user_id);

  SELECT * INTO v_profile FROM public.affiliate_profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('has_profile', false);
  END IF;

  SELECT * INTO v_settings FROM public.referral_program_settings WHERE id = 'default';

  SELECT coalesce(sum(commission_amount_cents), 0) INTO v_pending_cents
  FROM public.referral_commission_ledger
  WHERE referrer_user_id = v_user_id AND status = 'pending';

  SELECT coalesce(sum(commission_amount_cents), 0) INTO v_approved_cents
  FROM public.referral_commission_ledger
  WHERE referrer_user_id = v_user_id AND status = 'approved';

  SELECT coalesce(sum(commission_amount_cents), 0) INTO v_paid_cents
  FROM public.referral_commission_ledger
  WHERE referrer_user_id = v_user_id AND status = 'paid';

  SELECT id, amount_cents, status, requested_at
  INTO v_open_request
  FROM public.affiliate_payout_requests
  WHERE user_id = v_user_id AND status IN ('requested', 'processing')
  ORDER BY requested_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'has_profile', true,
    'profile', jsonb_build_object(
      'referral_code', v_profile.referral_code,
      'display_name', v_profile.display_name,
      'payout_pix_key', v_profile.payout_pix_key,
      'document_cpf', v_profile.document_cpf,
      'status', v_profile.status
    ),
    'balances', jsonb_build_object(
      'pending_cents', v_pending_cents,
      'approved_cents', v_approved_cents,
      'paid_cents', v_paid_cents,
      'min_payout_cents', floor(coalesce(v_settings.min_payout_amount, 50) * 100)::bigint
    ),
    'open_payout_request', CASE
      WHEN v_open_request.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_open_request.id,
        'amount_cents', v_open_request.amount_cents,
        'status', v_open_request.status,
        'requested_at', v_open_request.requested_at
      )
    END,
    'referrals', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'restaurant_id', r.restaurant_id,
        'restaurant_name', rest.name,
        'attributed_at', r.attributed_at,
        'referral_code', r.referral_code,
        'subscription_status', sub.status,
        'billing_cycle', sub.billing_cycle
      ) ORDER BY r.attributed_at DESC)
      FROM public.restaurant_referrals r
      JOIN public.restaurants rest ON rest.id = r.restaurant_id
      LEFT JOIN LATERAL (
        SELECT s.status, s.billing_cycle
        FROM public.subscriptions s
        WHERE s.restaurant_id = r.restaurant_id
        ORDER BY s.created_at DESC
        LIMIT 1
      ) sub ON true
      WHERE r.referrer_user_id = v_user_id AND r.status = 'active'
    ), '[]'::jsonb),
    'recent_commissions', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id,
        'restaurant_id', l.restaurant_id,
        'commission_amount_cents', l.commission_amount_cents,
        'status', l.status,
        'billing_cycle', l.billing_cycle,
        'restaurant_paid_at', l.restaurant_paid_at,
        'created_at', l.created_at
      ) ORDER BY l.created_at DESC)
      FROM (
        SELECT * FROM public.referral_commission_ledger
        WHERE referrer_user_id = v_user_id
        ORDER BY created_at DESC
        LIMIT 20
      ) l
    ), '[]'::jsonb),
    'payout_history', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'amount_cents', p.amount_cents,
        'status', p.status,
        'requested_at', p.requested_at,
        'paid_at', p.paid_at
      ) ORDER BY p.requested_at DESC)
      FROM (
        SELECT * FROM public.affiliate_payout_requests
        WHERE user_id = v_user_id
        ORDER BY requested_at DESC
        LIMIT 10
      ) p
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_affiliate_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affiliate_dashboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_affiliate_payout_profile(
  p_document_cpf text DEFAULT NULL,
  p_payout_pix_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  UPDATE public.affiliate_profiles
  SET
    document_cpf = nullif(trim(coalesce(p_document_cpf, document_cpf)), ''),
    payout_pix_key = nullif(trim(coalesce(p_payout_pix_key, payout_pix_key)), ''),
    updated_at = now()
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de afiliado não encontrado';
  END IF;

  RETURN (SELECT jsonb_build_object(
    'document_cpf', document_cpf,
    'payout_pix_key', payout_pix_key
  ) FROM public.affiliate_profiles WHERE user_id = v_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.update_affiliate_payout_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_affiliate_payout_profile(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_affiliate_payout()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_settings public.referral_program_settings%ROWTYPE;
  v_profile public.affiliate_profiles%ROWTYPE;
  v_approved_cents bigint := 0;
  v_min_cents bigint;
  v_request_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_settings FROM public.referral_program_settings WHERE id = 'default';
  IF NOT coalesce(v_settings.program_enabled, false) THEN
    RAISE EXCEPTION 'Programa de indicações desativado';
  END IF;

  SELECT * INTO v_profile FROM public.affiliate_profiles WHERE user_id = v_user_id;
  IF NOT FOUND OR v_profile.status <> 'active' THEN
    RAISE EXCEPTION 'Perfil de afiliado inválido';
  END IF;

  IF v_profile.payout_pix_key IS NULL OR trim(v_profile.payout_pix_key) = '' THEN
    RAISE EXCEPTION 'Informe sua chave PIX antes de solicitar saque';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.affiliate_payout_requests
    WHERE user_id = v_user_id AND status IN ('requested', 'processing')
  ) THEN
    RAISE EXCEPTION 'Já existe uma solicitação de saque em aberto';
  END IF;

  PERFORM public.mature_referral_commissions(v_user_id);

  SELECT coalesce(sum(commission_amount_cents), 0) INTO v_approved_cents
  FROM public.referral_commission_ledger
  WHERE referrer_user_id = v_user_id AND status = 'approved';

  v_min_cents := floor(coalesce(v_settings.min_payout_amount, 50) * 100)::bigint;

  IF v_approved_cents < v_min_cents THEN
    RAISE EXCEPTION 'Saldo aprovado abaixo do mínimo para saque';
  END IF;

  INSERT INTO public.affiliate_payout_requests (user_id, amount_cents, status)
  VALUES (v_user_id, v_approved_cents, 'requested')
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'request_id', v_request_id,
    'amount_cents', v_approved_cents
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_affiliate_payout() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_affiliate_payout() TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_affiliate_payout_request(
  p_request_id uuid,
  p_mark_paid boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.affiliate_payout_requests%ROWTYPE;
  v_remaining bigint;
  v_row record;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_super_admin(v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO v_request
  FROM public.affiliate_payout_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  IF NOT p_mark_paid THEN
    UPDATE public.affiliate_payout_requests SET status = 'rejected' WHERE id = p_request_id;
    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  END IF;

  UPDATE public.affiliate_payout_requests
  SET status = 'paid', paid_at = now()
  WHERE id = p_request_id;

  v_remaining := v_request.amount_cents;

  FOR v_row IN
    SELECT l.id, l.commission_amount_cents
    FROM public.referral_commission_ledger l
    WHERE l.referrer_user_id = v_request.user_id
      AND l.status = 'approved'
    ORDER BY l.created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    IF v_row.commission_amount_cents <= v_remaining THEN
      UPDATE public.referral_commission_ledger
      SET status = 'paid', paid_at = now()
      WHERE id = v_row.id;
      v_remaining := v_remaining - v_row.commission_amount_cents;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'status', 'paid');
END;
$$;

CREATE OR REPLACE FUNCTION public.list_referral_admin_snapshot()
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

  PERFORM public.mature_referral_commissions(NULL);

  RETURN jsonb_build_object(
    'pending_payouts', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'user_id', r.user_id,
        'amount_cents', r.amount_cents,
        'status', r.status,
        'requested_at', r.requested_at,
        'affiliate_code', ap.referral_code,
        'pix_key', ap.payout_pix_key
      ) ORDER BY r.requested_at ASC)
      FROM public.affiliate_payout_requests r
      LEFT JOIN public.affiliate_profiles ap ON ap.user_id = r.user_id
      WHERE r.status IN ('requested', 'processing')
    ), '[]'::jsonb),
    'recent_commissions', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id,
        'referrer_user_id', l.referrer_user_id,
        'referral_code', ap.referral_code,
        'restaurant_id', l.restaurant_id,
        'commission_amount_cents', l.commission_amount_cents,
        'status', l.status,
        'restaurant_paid_at', l.restaurant_paid_at,
        'created_at', l.created_at
      ) ORDER BY l.created_at DESC)
      FROM (
        SELECT * FROM public.referral_commission_ledger
        ORDER BY created_at DESC
        LIMIT 50
      ) l
      LEFT JOIN public.affiliate_profiles ap ON ap.user_id = l.referrer_user_id
    ), '[]'::jsonb),
    'materials', coalesce((
      SELECT jsonb_agg(to_jsonb(m) ORDER BY m.sort_order ASC, m.created_at DESC)
      FROM public.affiliate_campaign_materials m
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.list_referral_admin_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_referral_admin_snapshot() TO authenticated;

CREATE OR REPLACE FUNCTION public.save_affiliate_campaign_material(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_super_admin(v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_id := nullif(p_payload->>'id', '')::uuid;

  IF v_id IS NULL THEN
    INSERT INTO public.affiliate_campaign_materials (
      title,
      description,
      category,
      material_type,
      storage_path,
      external_url,
      copy_template,
      sort_order,
      is_active,
      visible_from,
      visible_until,
      updated_by
    )
    VALUES (
      trim(p_payload->>'title'),
      nullif(trim(p_payload->>'description'), ''),
      coalesce(nullif(trim(p_payload->>'category'), ''), 'general'),
      coalesce(nullif(trim(p_payload->>'material_type'), ''), 'copy'),
      nullif(trim(p_payload->>'storage_path'), ''),
      nullif(trim(p_payload->>'external_url'), ''),
      nullif(trim(p_payload->>'copy_template'), ''),
      coalesce((p_payload->>'sort_order')::integer, 0),
      coalesce((p_payload->>'is_active')::boolean, true),
      (p_payload->>'visible_from')::timestamptz,
      (p_payload->>'visible_until')::timestamptz,
      v_user_id
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.affiliate_campaign_materials
    SET
      title = coalesce(nullif(trim(p_payload->>'title'), ''), title),
      description = coalesce(nullif(trim(p_payload->>'description'), ''), description),
      category = coalesce(nullif(trim(p_payload->>'category'), ''), category),
      material_type = coalesce(nullif(trim(p_payload->>'material_type'), ''), material_type),
      storage_path = coalesce(nullif(trim(p_payload->>'storage_path'), ''), storage_path),
      external_url = coalesce(nullif(trim(p_payload->>'external_url'), ''), external_url),
      copy_template = coalesce(nullif(trim(p_payload->>'copy_template'), ''), copy_template),
      sort_order = coalesce((p_payload->>'sort_order')::integer, sort_order),
      is_active = coalesce((p_payload->>'is_active')::boolean, is_active),
      visible_from = CASE WHEN p_payload ? 'visible_from' THEN (p_payload->>'visible_from')::timestamptz ELSE visible_from END,
      visible_until = CASE WHEN p_payload ? 'visible_until' THEN (p_payload->>'visible_until')::timestamptz ELSE visible_until END,
      updated_at = now(),
      updated_by = v_user_id
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_affiliate_campaign_material(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_affiliate_campaign_material(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_affiliate_campaign_material(p_material_id uuid)
RETURNS boolean
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

  DELETE FROM public.affiliate_campaign_materials WHERE id = p_material_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_affiliate_campaign_material(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_affiliate_campaign_material(uuid) TO authenticated;

DROP POLICY IF EXISTS "Super admins read all campaign materials" ON public.affiliate_campaign_materials;
CREATE POLICY "Super admins read all campaign materials"
ON public.affiliate_campaign_materials FOR SELECT
USING (public.is_super_admin(auth.uid()));

REVOKE ALL ON FUNCTION public.complete_affiliate_payout_request(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_affiliate_payout_request(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.accrue_referral_commission_for_payment IS
  'Registra comissão pendente após pagamento de assinatura plataforma (idempotente por pagarme_reference).';
