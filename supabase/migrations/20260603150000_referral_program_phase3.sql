-- Programa de indicações — fase 3: notificações e mature com retorno detalhado.

ALTER TABLE public.referral_commission_ledger
  ADD COLUMN IF NOT EXISTS approval_notified_at timestamptz;

-- A fase 2 criou esta função retornando integer. Postgres não permite trocar
-- o tipo de retorno via CREATE OR REPLACE, então recriamos a assinatura.
DROP FUNCTION IF EXISTS public.mature_referral_commissions(uuid);

CREATE OR REPLACE FUNCTION public.mature_referral_commissions(p_referrer_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold_days integer;
  v_matured jsonb;
BEGIN
  SELECT hold_days_before_approval INTO v_hold_days
  FROM public.referral_program_settings
  WHERE id = 'default';

  v_hold_days := coalesce(v_hold_days, 30);

  WITH updated AS (
    UPDATE public.referral_commission_ledger l
    SET
      status = 'approved',
      approved_at = now()
    WHERE l.status = 'pending'
      AND l.restaurant_paid_at IS NOT NULL
      AND l.restaurant_paid_at + make_interval(days => v_hold_days) <= now()
      AND (p_referrer_user_id IS NULL OR l.referrer_user_id = p_referrer_user_id)
    RETURNING l.id, l.referrer_user_id, l.commission_amount_cents, l.approval_notified_at
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'ledger_id', u.id,
    'referrer_user_id', u.referrer_user_id,
    'commission_amount_cents', u.commission_amount_cents
  )), '[]'::jsonb)
  INTO v_matured
  FROM updated u
  WHERE u.approval_notified_at IS NULL;

  RETURN jsonb_build_object(
    'matured_count', jsonb_array_length(v_matured),
    'entries', v_matured
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mature_referral_commissions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mature_referral_commissions(uuid) TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.mark_referral_commissions_notified(p_ledger_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.referral_commission_ledger
  SET approval_notified_at = now()
  WHERE id = ANY(p_ledger_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_referral_commissions_notified(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_referral_commissions_notified(uuid[]) TO service_role;

COMMENT ON COLUMN public.referral_commission_ledger.approval_notified_at IS
  'Quando o e-mail de comissão aprovada foi enviado ao afiliado.';
