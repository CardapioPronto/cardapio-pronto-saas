-- Pagamentos pendentes (PIX/boleto) devem ser visíveis, mas não podem substituir
-- o entitlement vigente até a confirmação do pagamento.

UPDATE public.subscriptions s
SET
  status = 'trialing',
  end_date = NULL,
  updated_at = now()
WHERE s.status = 'canceled'
  AND COALESCE(s.is_trial, false) = true
  AND s.trial_ends_at IS NOT NULL
  AND s.trial_ends_at > now()
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscriptions active_sub
    WHERE active_sub.restaurant_id = s.restaurant_id
      AND active_sub.id <> s.id
      AND active_sub.status IN ('active', 'trialing', 'past_due')
  );

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
    AND (
      s.status IN ('active', 'trialing', 'past_due', 'pending')
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
      WHEN s.status = 'trialing' THEN 1
      WHEN s.status = 'past_due' THEN 2
      WHEN s.status = 'canceled' AND s.trial_ends_at > now() THEN 3
      WHEN s.status = 'pending' THEN 4
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
      ELSE v_subscription.status
    END,
    'is_trial', COALESCE(v_subscription.is_trial, false),
    'trial_ends_at', v_subscription.trial_ends_at,
    'current_period_end', v_subscription.current_period_end,
    'next_billing_at', v_subscription.next_billing_at
  );
END;
$$;

COMMENT ON FUNCTION public.get_restaurant_subscription_entitlement(uuid) IS
  'Entitlement de acesso: prefere assinatura/trial/grace vigente e deixa pending apenas como fallback sem acesso.';
