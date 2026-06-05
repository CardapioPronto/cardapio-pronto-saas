-- KYC fields for Pagar.me recipient register_information (PF/PJ).
-- Required for production recipient creation per API v5 (Bacen Circular 3.978/20).

ALTER TABLE public.restaurant_recipient_accounts
  ADD COLUMN IF NOT EXISTS professional_occupation text,
  ADD COLUMN IF NOT EXISTS monthly_income numeric,
  ADD COLUMN IF NOT EXISTS annual_revenue numeric,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS trading_name text,
  ADD COLUMN IF NOT EXISTS addr_street text,
  ADD COLUMN IF NOT EXISTS addr_number text,
  ADD COLUMN IF NOT EXISTS addr_complement text,
  ADD COLUMN IF NOT EXISTS addr_neighborhood text,
  ADD COLUMN IF NOT EXISTS addr_city text,
  ADD COLUMN IF NOT EXISTS addr_state text,
  ADD COLUMN IF NOT EXISTS addr_zip_code text,
  ADD COLUMN IF NOT EXISTS addr_reference_point text,
  ADD COLUMN IF NOT EXISTS managing_partners jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.restaurant_recipient_accounts.monthly_income IS
  'Renda mensal estimada (PF) em reais; enviada ao Pagar.me em centavos.';
COMMENT ON COLUMN public.restaurant_recipient_accounts.annual_revenue IS
  'Faturamento anual estimado (PJ) em reais; enviado ao Pagar.me em centavos.';
COMMENT ON COLUMN public.restaurant_recipient_accounts.managing_partners IS
  'Array JSON de sócios/representantes legais (PJ) com KYC exigido pelo Pagar.me.';
