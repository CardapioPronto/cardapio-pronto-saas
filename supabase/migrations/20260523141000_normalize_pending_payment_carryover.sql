-- Normaliza pendentes criados antes da regra nova: pending guarda apenas o fim
-- do entitlement vigente para calcular crédito quando o pagamento confirmar.

WITH pending_carryover AS (
  SELECT
    p.id AS pending_id,
    (
      SELECT
        CASE
          WHEN e.status = 'trialing' OR COALESCE(e.is_trial, false)
            THEN e.trial_ends_at
          ELSE e.current_period_end
        END
      FROM public.subscriptions e
      WHERE e.restaurant_id = p.restaurant_id
        AND e.id <> p.id
        AND (
          e.status IN ('active', 'trialing', 'past_due')
          OR (
            e.status = 'canceled'
            AND COALESCE(e.is_trial, false) = true
            AND e.trial_ends_at IS NOT NULL
            AND e.trial_ends_at > now()
          )
        )
      ORDER BY
        CASE
          WHEN e.status = 'active' THEN 0
          WHEN e.status = 'trialing' THEN 1
          WHEN e.status = 'past_due' THEN 2
          WHEN e.status = 'canceled' AND e.trial_ends_at > now() THEN 3
          ELSE 9
        END,
        e.created_at DESC
      LIMIT 1
    ) AS carry_until
  FROM public.subscriptions p
  WHERE p.status = 'pending'
)
UPDATE public.subscriptions p
SET
  current_period_end = pc.carry_until,
  next_billing_at = pc.carry_until,
  updated_at = now()
FROM pending_carryover pc
WHERE p.id = pc.pending_id
  AND (
    p.current_period_end IS DISTINCT FROM pc.carry_until
    OR p.next_billing_at IS DISTINCT FROM pc.carry_until
  );
