-- Corrige assinaturas pendentes com current_period_start após current_period_end
-- (bug: start_at futuro do Pagar.me + fim do trial local no pending).

UPDATE public.subscriptions s
SET
  current_period_start = COALESCE(s.trial_start, s.start_date, s.created_at),
  start_date = COALESCE(s.trial_start, s.start_date, s.created_at),
  current_period_end = COALESCE(s.trial_ends_at, s.current_period_end),
  next_billing_at = COALESCE(s.trial_ends_at, s.next_billing_at),
  updated_at = now()
WHERE s.status = 'pending'
  AND COALESCE(s.is_trial, false) = false
  AND s.current_period_start IS NOT NULL
  AND s.current_period_end IS NOT NULL
  AND s.current_period_end < s.current_period_start;
