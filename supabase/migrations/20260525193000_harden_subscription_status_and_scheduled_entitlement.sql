-- Fecha o fluxo trial -> cartão agendado:
-- 1) status de assinatura passam a ser canônicos em inglês;
-- 2) pendentes agendados no Pagar.me (sub_ + future/scheduled) entram em
--    tolerância quando o trial termina e o webhook ainda não sincronizou;
-- 3) pendentes antigos com período invertido voltam a carregar o período do
--    entitlement anterior.

BEGIN;

UPDATE public.subscriptions
SET
  status = CASE lower(trim(status))
    WHEN 'ativa' THEN 'active'
    WHEN 'ativo' THEN 'active'
    WHEN 'active' THEN 'active'
    WHEN 'trial' THEN 'trialing'
    WHEN 'trialing' THEN 'trialing'
    WHEN 'teste' THEN 'trialing'
    WHEN 'em_teste' THEN 'trialing'
    WHEN 'em teste' THEN 'trialing'
    WHEN 'past_due' THEN 'past_due'
    WHEN 'atraso' THEN 'past_due'
    WHEN 'em_atraso' THEN 'past_due'
    WHEN 'em atraso' THEN 'past_due'
    WHEN 'pendente' THEN 'pending'
    WHEN 'pending' THEN 'pending'
    WHEN 'cancelada' THEN 'canceled'
    WHEN 'cancelado' THEN 'canceled'
    WHEN 'canceled' THEN 'canceled'
    WHEN 'inativa' THEN 'canceled'
    WHEN 'inativo' THEN 'canceled'
    WHEN 'inactive' THEN 'canceled'
    ELSE lower(trim(status))
  END,
  updated_at = now()
WHERE status IS DISTINCT FROM CASE lower(trim(status))
    WHEN 'ativa' THEN 'active'
    WHEN 'ativo' THEN 'active'
    WHEN 'active' THEN 'active'
    WHEN 'trial' THEN 'trialing'
    WHEN 'trialing' THEN 'trialing'
    WHEN 'teste' THEN 'trialing'
    WHEN 'em_teste' THEN 'trialing'
    WHEN 'em teste' THEN 'trialing'
    WHEN 'past_due' THEN 'past_due'
    WHEN 'atraso' THEN 'past_due'
    WHEN 'em_atraso' THEN 'past_due'
    WHEN 'em atraso' THEN 'past_due'
    WHEN 'pendente' THEN 'pending'
    WHEN 'pending' THEN 'pending'
    WHEN 'cancelada' THEN 'canceled'
    WHEN 'cancelado' THEN 'canceled'
    WHEN 'canceled' THEN 'canceled'
    WHEN 'inativa' THEN 'canceled'
    WHEN 'inativo' THEN 'canceled'
    WHEN 'inactive' THEN 'canceled'
    ELSE lower(trim(status))
  END;

WITH pending_carryover AS (
  SELECT
    p.id AS pending_id,
    prior.carry_start,
    prior.carry_until
  FROM public.subscriptions p
  LEFT JOIN LATERAL (
    SELECT
      CASE
        WHEN e.status = 'trialing' OR COALESCE(e.is_trial, false)
          THEN COALESCE(e.trial_start, e.current_period_start, e.start_date, e.created_at)
        ELSE COALESCE(e.current_period_start, e.start_date, e.created_at)
      END AS carry_start,
      CASE
        WHEN e.status = 'trialing' OR COALESCE(e.is_trial, false)
          THEN COALESCE(e.trial_ends_at, e.current_period_end)
        ELSE e.current_period_end
      END AS carry_until
    FROM public.subscriptions e
    WHERE e.restaurant_id = p.restaurant_id
      AND e.id <> p.id
      AND (
        e.status IN ('active', 'trialing', 'past_due')
        OR (
          e.status = 'canceled'
          AND COALESCE(e.current_period_end, e.end_date) IS NOT NULL
        )
      )
    ORDER BY
      CASE
        WHEN e.status = 'active' THEN 0
        WHEN e.status = 'trialing' THEN 1
        WHEN e.status = 'past_due' THEN 2
        WHEN e.status = 'canceled'
          AND COALESCE(e.current_period_end, e.end_date) > now() THEN 3
        WHEN e.status = 'canceled'
          AND COALESCE(e.is_trial, false)
          AND e.trial_ends_at > now() THEN 4
        ELSE 9
      END,
      e.created_at DESC
    LIMIT 1
  ) prior ON true
  WHERE p.status = 'pending'
)
UPDATE public.subscriptions p
SET
  start_date = CASE
    WHEN pc.carry_start IS NOT NULL
      AND (
        p.current_period_start IS NULL
        OR p.current_period_end IS NULL
        OR p.current_period_end < p.current_period_start
      )
    THEN pc.carry_start
    ELSE p.start_date
  END,
  current_period_start = CASE
    WHEN pc.carry_start IS NOT NULL
      AND (
        p.current_period_start IS NULL
        OR p.current_period_end IS NULL
        OR p.current_period_end < p.current_period_start
      )
    THEN pc.carry_start
    ELSE p.current_period_start
  END,
  current_period_end = COALESCE(pc.carry_until, p.current_period_end),
  next_billing_at = COALESCE(pc.carry_until, p.next_billing_at),
  updated_at = now()
FROM pending_carryover pc
WHERE p.id = pc.pending_id
  AND pc.carry_until IS NOT NULL
  AND (
    p.current_period_end IS DISTINCT FROM pc.carry_until
    OR p.next_billing_at IS DISTINCT FROM pc.carry_until
    OR p.current_period_start IS NULL
    OR p.current_period_end < p.current_period_start
  );

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_canonical_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_canonical_check
  CHECK (status IN ('active', 'trialing', 'past_due', 'pending', 'canceled'))
  NOT VALID;

CREATE OR REPLACE FUNCTION public.get_restaurant_subscription_entitlement(p_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member boolean := false;
  v_subscription record;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não informado.';
  END IF;

  SELECT (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.restaurant_id = p_restaurant_id
        AND u.user_type = 'owner'::public.user_type
    )
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.user_id = auth.uid()
        AND e.restaurant_id = p_restaurant_id
        AND e.is_active = true
    )
  ) INTO v_is_member;

  IF NOT COALESCE(v_is_member, false) THEN
    RAISE EXCEPTION 'Sem permissão para consultar assinatura deste restaurante.';
  END IF;

  SELECT
    s.plan_id,
    s.status,
    s.is_trial,
    s.trial_ends_at,
    s.current_period_end,
    s.next_billing_at,
    s.pagarme_subscription_id,
    s.last_payment_status,
    p.name AS plan_name
  INTO v_subscription
  FROM public.subscriptions s
  LEFT JOIN public.plans p ON p.id = s.plan_id
  WHERE s.restaurant_id = p_restaurant_id
    AND (
      s.status IN ('active', 'trialing', 'past_due', 'pending')
      OR (
        s.status = 'canceled'
        AND COALESCE(s.current_period_end, s.end_date) IS NOT NULL
        AND COALESCE(s.current_period_end, s.end_date) > now()
      )
      OR (
        s.status = 'canceled'
        AND COALESCE(s.is_trial, false) = true
        AND s.trial_ends_at IS NOT NULL
        AND s.trial_ends_at > now()
      )
    )
  ORDER BY
    CASE
      WHEN s.status = 'active' THEN 0
      WHEN s.status = 'trialing'
        AND (s.trial_ends_at IS NULL OR s.trial_ends_at > now()) THEN 1
      WHEN s.status = 'past_due' THEN 2
      WHEN s.status = 'canceled'
        AND COALESCE(s.current_period_end, s.end_date) > now() THEN 3
      WHEN s.status = 'canceled'
        AND COALESCE(s.is_trial, false)
        AND s.trial_ends_at > now() THEN 4
      WHEN s.status = 'pending'
        AND s.pagarme_subscription_id LIKE 'sub_%'
        AND lower(COALESCE(s.last_payment_status, '')) IN ('future', 'scheduled') THEN 5
      WHEN s.status = 'pending' THEN 6
      WHEN s.status = 'trialing' THEN 7
      ELSE 9
    END,
    s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_subscription', false,
      'plan_id', NULL,
      'plan_name', NULL,
      'status', NULL,
      'is_trial', false,
      'trial_ends_at', NULL,
      'current_period_end', NULL,
      'next_billing_at', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'has_subscription', true,
    'plan_id', v_subscription.plan_id,
    'plan_name', v_subscription.plan_name,
    'status', CASE
      WHEN v_subscription.status = 'canceled'
        AND COALESCE(v_subscription.is_trial, false)
        AND v_subscription.trial_ends_at > now()
      THEN 'trialing'
      WHEN v_subscription.status = 'canceled'
        AND v_subscription.current_period_end IS NOT NULL
        AND v_subscription.current_period_end > now()
      THEN 'active'
      WHEN v_subscription.status = 'pending'
        AND v_subscription.pagarme_subscription_id LIKE 'sub_%'
        AND lower(COALESCE(v_subscription.last_payment_status, '')) IN ('future', 'scheduled')
        AND COALESCE(v_subscription.current_period_end, v_subscription.next_billing_at) IS NOT NULL
        AND COALESCE(v_subscription.current_period_end, v_subscription.next_billing_at) <= now()
      THEN 'past_due'
      ELSE v_subscription.status
    END,
    'is_trial', COALESCE(v_subscription.is_trial, false),
    'trial_ends_at', v_subscription.trial_ends_at,
    'current_period_end', v_subscription.current_period_end,
    'next_billing_at', v_subscription.next_billing_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_restaurant_subscription_entitlement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_restaurant_subscription_entitlement(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_restaurant_subscription_entitlement(uuid) IS
  'Entitlement: status canônico; trial/ativo/past_due; pendente agendado no cartão entra em tolerância quando o trial termina e o webhook ainda não sincronizou.';

COMMIT;
