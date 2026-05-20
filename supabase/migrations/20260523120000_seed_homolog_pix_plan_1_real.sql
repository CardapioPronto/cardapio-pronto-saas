-- Plano de homologação PIX: R$ 1,00/mês (100 centavos no Pagar.me — dentro do limite do simulador).
INSERT INTO public.plans (
  name,
  description,
  price_monthly,
  price_yearly,
  is_active,
  trial_days,
  pagarme_sync_status,
  pagarme_payment_methods,
  email_campaigns_enabled,
  email_campaign_monthly_limit,
  email_campaign_contact_limit,
  email_custom_templates_enabled
)
SELECT
  'Pubfy Teste PIX R$ 1',
  'Plano temporário para homologação PIX no simulador Pagar.me (amount = 100 centavos). Use ciclo mensal. Sincronize no Admin antes do checkout.',
  1.00,
  0.09,
  true,
  0,
  'pending',
  ARRAY['credit_card', 'boleto', 'pix']::text[],
  false,
  0,
  0,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM public.plans WHERE name = 'Pubfy Teste PIX R$ 1'
);
