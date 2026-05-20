-- Assinaturas pagas com período curto (legado trial no Pagar.me): normalizar para 1 mês / 1 ano.

UPDATE public.subscriptions s
SET
  current_period_end = CASE s.billing_cycle
    WHEN 'yearly' THEN s.current_period_start + interval '1 year'
    ELSE s.current_period_start + interval '1 month'
  END,
  next_billing_at = CASE s.billing_cycle
    WHEN 'yearly' THEN s.current_period_start + interval '1 year'
    ELSE s.current_period_start + interval '1 month'
  END,
  updated_at = now()
WHERE s.status = 'active'
  AND COALESCE(s.is_trial, false) = false
  AND s.pagarme_subscription_id IS NOT NULL
  AND s.current_period_start IS NOT NULL
  AND s.current_period_end IS NOT NULL
  AND s.current_period_end < CASE s.billing_cycle
    WHEN 'yearly' THEN s.current_period_start + interval '20 days'
    ELSE s.current_period_start + interval '20 days'
  END;
