-- Planos ativos com metadados mínimos para checkout (autenticado).
-- Não expõe chaves secretas; apenas IDs de plano Pagar.me já necessários na contratação.

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
      ORDER BY p.price_monthly ASC
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

COMMENT ON FUNCTION public.get_checkout_plan_summaries() IS
  'Planos ativos com IDs Pagar.me para checkout do dono (autenticado).';
