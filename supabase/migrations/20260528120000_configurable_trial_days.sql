-- Permite controlar o trial comercial pelo Admin.
-- trial_days = 0 desativa o teste grátis para novos cadastros; assinaturas já
-- existentes mantêm suas datas.

ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_trial_days_range;

ALTER TABLE public.plans
  ADD CONSTRAINT plans_trial_days_range
  CHECK (trial_days BETWEEN 0 AND 365);

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

  v_trial_days := LEAST(365, GREATEST(0, COALESCE(v_plan.trial_days, 14)));
  v_trial_start := COALESCE(NEW.created_at, now());
  v_trial_end := v_trial_start + make_interval(days => v_trial_days);
  v_status := CASE WHEN v_trial_days > 0 AND v_trial_end > now() THEN 'trialing' ELSE 'canceled' END;

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

CREATE OR REPLACE FUNCTION public.repair_missing_restaurant_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  WITH default_plan AS (
    SELECT p.id, LEAST(365, GREATEST(0, COALESCE(p.trial_days, 14))) AS trial_days
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
    CASE WHEN trial_days > 0 AND trial_end > now() THEN 'trialing' ELSE 'canceled' END,
    true,
    'monthly',
    trial_start,
    trial_start,
    trial_end,
    trial_start,
    trial_end,
    CASE WHEN trial_days = 0 OR trial_end <= now() THEN trial_end ELSE NULL END
  FROM orphan_restaurants
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.repair_missing_restaurant_subscriptions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repair_missing_restaurant_subscriptions() TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_plan_summaries()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'price_monthly', p.price_monthly,
        'price_yearly', p.price_yearly,
        'is_active', p.is_active,
        'trial_days', p.trial_days,
        'email_campaigns_enabled', COALESCE(p.email_campaigns_enabled, false),
        'email_campaign_monthly_limit', COALESCE(p.email_campaign_monthly_limit, 0),
        'email_campaign_contact_limit', COALESCE(p.email_campaign_contact_limit, 0),
        'email_custom_templates_enabled', COALESCE(p.email_custom_templates_enabled, false),
        'features', COALESCE(features.features, '[]'::jsonb)
      )
      ORDER BY
        CASE p.name
          WHEN 'Plano Pubfy' THEN 0
          WHEN 'Profissional' THEN 1
          WHEN 'Básico' THEN 2
          ELSE 99
        END,
        p.price_monthly ASC NULLS LAST
    ),
    '[]'::jsonb
  )
  FROM public.plans p
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'feature', pf.feature,
        'is_enabled', COALESCE(pf.is_enabled, false)
      )
      ORDER BY pf.feature
    ) AS features
    FROM public.plan_features pf
    WHERE pf.plan_id = p.id
  ) features ON true
  WHERE p.is_active = true;
$$;

REVOKE ALL ON FUNCTION public.get_public_plan_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_plan_summaries() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_checkout_plan_summaries()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'price_monthly', p.price_monthly,
        'price_yearly', p.price_yearly,
        'is_active', p.is_active,
        'trial_days', p.trial_days,
        'pagarme_plan_id_monthly', p.pagarme_plan_id_monthly,
        'pagarme_plan_id_yearly', p.pagarme_plan_id_yearly,
        'pagarme_sync_status', p.pagarme_sync_status,
        'pagarme_payment_methods', COALESCE(p.pagarme_payment_methods, ARRAY['credit_card','boleto']::text[]),
        'email_campaigns_enabled', COALESCE(p.email_campaigns_enabled, false),
        'email_campaign_monthly_limit', COALESCE(p.email_campaign_monthly_limit, 0),
        'email_campaign_contact_limit', COALESCE(p.email_campaign_contact_limit, 0),
        'email_custom_templates_enabled', COALESCE(p.email_custom_templates_enabled, false),
        'features', COALESCE(features.features, '[]'::jsonb)
      )
      ORDER BY
        CASE p.name
          WHEN 'Plano Pubfy' THEN 0
          WHEN 'Profissional' THEN 1
          WHEN 'Básico' THEN 2
          ELSE 99
        END,
        p.price_monthly ASC NULLS LAST
    ),
    '[]'::jsonb
  )
  FROM public.plans p
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'feature', pf.feature,
        'is_enabled', COALESCE(pf.is_enabled, false)
      )
      ORDER BY pf.feature
    ) AS features
    FROM public.plan_features pf
    WHERE pf.plan_id = p.id
  ) features ON true
  WHERE p.is_active = true;
$$;

REVOKE ALL ON FUNCTION public.get_checkout_plan_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_checkout_plan_summaries() TO authenticated;
