-- Orders (or_/ord_) are checkout/payment references, not Pagar.me recurring
-- subscription records. Keep management actions enabled only for real sub_* IDs.

CREATE OR REPLACE FUNCTION public.get_my_subscription_summaries(p_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_access boolean := false;
  v_result jsonb := '[]'::jsonb;
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
  ) INTO v_can_access;

  IF NOT COALESCE(v_can_access, false) THEN
    RAISE EXCEPTION 'Sem permissão para consultar assinaturas deste restaurante.';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'restaurant_id', s.restaurant_id,
      'plan_id', s.plan_id,
      'status', s.status,
      'billing_cycle', s.billing_cycle,
      'is_trial', s.is_trial,
      'trial_start', s.trial_start,
      'trial_ends_at', s.trial_ends_at,
      'current_period_start', s.current_period_start,
      'current_period_end', s.current_period_end,
      'next_billing_at', s.next_billing_at,
      'last_payment_at', s.last_payment_at,
      'last_payment_status', s.last_payment_status,
      'start_date', s.start_date,
      'end_date', s.end_date,
      'created_at', s.created_at,
      'has_pagarme_subscription', s.pagarme_subscription_id LIKE 'sub_%',
      'plan', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'price_monthly', p.price_monthly,
        'price_yearly', p.price_yearly,
        'trial_days', p.trial_days,
        'pagarme_payment_methods', COALESCE(p.pagarme_payment_methods, ARRAY['credit_card','boleto']::text[])
      ) END
    )
    ORDER BY s.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.subscriptions s
  LEFT JOIN public.plans p ON p.id = s.plan_id
  WHERE s.restaurant_id = p_restaurant_id
    AND s.status IN ('active', 'trialing', 'past_due', 'pending');

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_subscription_summaries(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_subscription_summaries(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_my_subscription_summaries(uuid) IS
  'Resumo das assinaturas vigentes ou pendentes do restaurante, sem histórico de tentativas canceladas; has_pagarme_subscription indica vínculo recorrente sub_ no Pagar.me.';
