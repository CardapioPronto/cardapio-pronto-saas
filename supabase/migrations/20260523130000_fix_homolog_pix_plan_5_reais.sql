-- Ajusta plano de homologação: Pagar.me rejeita planos < R$ 5,00 (500 centavos).
-- R$ 5,00/mês também é o teto prático do simulador PIX em sk_test (amount ≤ 500).
UPDATE public.plans
SET
  name = 'Pubfy Teste PIX R$ 5',
  description = 'Homologação PIX: R$ 5,00/mês (500 centavos). Sincronize no Admin e use ciclo mensal + PIX.',
  price_monthly = 5.00,
  price_yearly = 5.00,
  pagarme_sync_status = 'pending',
  pagarme_plan_id_monthly = NULL,
  pagarme_plan_id_yearly = NULL,
  pagarme_synced_at = NULL,
  pagarme_sync_error = NULL
WHERE name IN ('Pubfy Teste PIX R$ 1', 'Pubfy Teste PIX R$ 5');
