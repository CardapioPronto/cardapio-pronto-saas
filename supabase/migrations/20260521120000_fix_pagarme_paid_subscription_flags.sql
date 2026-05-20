-- Assinaturas com vínculo Pagar.me não devem permanecer como trial local duplicado.

UPDATE public.subscriptions
SET
  is_trial = false,
  trial_start = NULL,
  trial_ends_at = NULL,
  status = CASE
    WHEN status = 'trialing' AND pagarme_subscription_id IS NOT NULL THEN 'active'
    ELSE status
  END,
  updated_at = now()
WHERE pagarme_subscription_id IS NOT NULL
  AND (is_trial = true OR status = 'trialing');

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
    p.name AS plan_name
  INTO v_subscription
  FROM public.subscriptions s
  LEFT JOIN public.plans p ON p.id = s.plan_id
  WHERE s.restaurant_id = p_restaurant_id
    AND s.status IN ('active', 'trialing', 'past_due', 'pending')
  ORDER BY
    CASE s.status
      WHEN 'active' THEN 0
      WHEN 'pending' THEN 1
      WHEN 'past_due' THEN 2
      WHEN 'trialing' THEN 3
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
    'status', v_subscription.status,
    'is_trial', COALESCE(v_subscription.is_trial, false),
    'trial_ends_at', v_subscription.trial_ends_at,
    'current_period_end', v_subscription.current_period_end,
    'next_billing_at', v_subscription.next_billing_at
  );
END;
$$;
