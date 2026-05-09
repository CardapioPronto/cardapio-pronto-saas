-- Ensure every restaurant created for an owner receives exactly one trial record.
-- The trial window is anchored to the restaurant creation timestamp so delayed
-- repairs do not grant extra free days.

CREATE OR REPLACE FUNCTION public.create_trial_subscription_for_restaurant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_trial_days integer;
  v_trial_start timestamptz;
  v_trial_end timestamptz;
  v_status text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.restaurant_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT p.id, p.trial_days
  INTO v_plan
  FROM public.plans p
  WHERE p.is_active = true
  ORDER BY
    CASE p.name
      WHEN 'Plano Pubfy' THEN 0
      WHEN 'Profissional' THEN 1
      WHEN 'Básico' THEN 2
      ELSE 99
    END,
    p.price_monthly ASC NULLS LAST
  LIMIT 1;

  IF v_plan.id IS NULL THEN
    RETURN NEW;
  END IF;

  v_trial_days := GREATEST(1, COALESCE(v_plan.trial_days, 14));
  v_trial_start := COALESCE(NEW.created_at, now());
  v_trial_end := v_trial_start + make_interval(days => v_trial_days);
  v_status := CASE WHEN v_trial_end >= now() THEN 'trialing' ELSE 'canceled' END;

  INSERT INTO public.subscriptions (
    restaurant_id,
    plan_id,
    status,
    is_trial,
    billing_cycle,
    start_date,
    trial_start,
    trial_ends_at,
    current_period_start,
    current_period_end,
    end_date
  )
  VALUES (
    NEW.id,
    v_plan.id,
    v_status,
    true,
    'monthly',
    v_trial_start,
    v_trial_start,
    v_trial_end,
    v_trial_start,
    v_trial_end,
    CASE WHEN v_status = 'canceled' THEN v_trial_end ELSE NULL END
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_trial_subscription_for_restaurant() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_create_trial_subscription_for_new_restaurant ON public.restaurants;
CREATE TRIGGER trg_create_trial_subscription_for_new_restaurant
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription_for_restaurant();

WITH default_plan AS (
  SELECT p.id, GREATEST(1, COALESCE(p.trial_days, 14)) AS trial_days
  FROM public.plans p
  WHERE p.is_active = true
  ORDER BY
    CASE p.name
      WHEN 'Plano Pubfy' THEN 0
      WHEN 'Profissional' THEN 1
      WHEN 'Básico' THEN 2
      ELSE 99
    END,
    p.price_monthly ASC NULLS LAST
  LIMIT 1
),
orphan_restaurants AS (
  SELECT
    r.id AS restaurant_id,
    dp.id AS plan_id,
    dp.trial_days,
    COALESCE(r.created_at, now()) AS trial_start,
    COALESCE(r.created_at, now()) + make_interval(days => dp.trial_days) AS trial_end
  FROM public.restaurants r
  CROSS JOIN default_plan dp
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.restaurant_id = r.id
  )
)
INSERT INTO public.subscriptions (
  restaurant_id,
  plan_id,
  status,
  is_trial,
  billing_cycle,
  start_date,
  trial_start,
  trial_ends_at,
  current_period_start,
  current_period_end,
  end_date
)
SELECT
  restaurant_id,
  plan_id,
  CASE WHEN trial_end >= now() THEN 'trialing' ELSE 'canceled' END,
  true,
  'monthly',
  trial_start,
  trial_start,
  trial_end,
  trial_start,
  trial_end,
  CASE WHEN trial_end < now() THEN trial_end ELSE NULL END
FROM orphan_restaurants
ON CONFLICT DO NOTHING;

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
    p.name AS plan_name
  INTO v_subscription
  FROM public.subscriptions s
  LEFT JOIN public.plans p ON p.id::text = s.plan_id
  WHERE s.restaurant_id = p_restaurant_id
    AND s.status IN ('active', 'trialing', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_subscription', false,
      'plan_id', NULL,
      'plan_name', NULL,
      'status', NULL,
      'is_trial', false,
      'trial_ends_at', NULL,
      'current_period_end', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'has_subscription', true,
    'plan_id', v_subscription.plan_id,
    'plan_name', v_subscription.plan_name,
    'status', v_subscription.status,
    'is_trial', COALESCE(v_subscription.is_trial, false),
    'trial_ends_at', v_subscription.trial_ends_at,
    'current_period_end', v_subscription.current_period_end
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_restaurant_subscription_entitlement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_restaurant_subscription_entitlement(uuid) TO authenticated, service_role;
