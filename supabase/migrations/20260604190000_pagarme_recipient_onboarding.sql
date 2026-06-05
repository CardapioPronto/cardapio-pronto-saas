-- Pagar.me recipient onboarding.
-- Stores restaurant holder + bank account data used to create a Pagar.me recipient
-- (the marketplace "recebedor") so PIX order revenue can be settled automatically
-- to the restaurant. PII is isolated in a dedicated table with strict RLS.

-- 1) Recipient status mirror on payment settings (no PII here, safe for admin lists).
ALTER TABLE public.restaurant_payment_settings
  ADD COLUMN IF NOT EXISTS recipient_status text NOT NULL DEFAULT 'not_created',
  ADD COLUMN IF NOT EXISTS recipient_synced_at timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'restaurant_payment_settings_recipient_status_check'
  ) THEN
    ALTER TABLE public.restaurant_payment_settings
      ADD CONSTRAINT restaurant_payment_settings_recipient_status_check
      CHECK (recipient_status IN (
        'not_created', 'registration', 'affiliation', 'active',
        'refused', 'suspended', 'blocked', 'inactive', 'unknown'
      ));
  END IF;
END$$;

-- 2) Dedicated table for holder + bank account data (PII).
CREATE TABLE IF NOT EXISTS public.restaurant_recipient_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'pagarme',

  -- Holder / KYC
  holder_name text NOT NULL,
  holder_document text NOT NULL,            -- digits only (CPF/CNPJ)
  holder_document_type text NOT NULL,       -- 'cpf' | 'cnpj'
  email text NOT NULL,
  phone text,                               -- digits only
  birthdate date,                           -- individual KYC (optional)
  mother_name text,                         -- individual KYC (optional)

  -- Bank account
  bank_code text NOT NULL,                  -- e.g. '341'
  branch_number text NOT NULL,
  branch_check_digit text,
  account_number text NOT NULL,
  account_check_digit text NOT NULL,
  account_type text NOT NULL DEFAULT 'checking', -- 'checking' | 'savings'

  -- Pagar.me linkage
  recipient_id text,
  recipient_status text NOT NULL DEFAULT 'not_created',
  bank_account_id text,
  kyc_status text,
  last_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  synced_at timestamp with time zone,

  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT restaurant_recipient_accounts_provider_check
    CHECK (provider IN ('pagarme')),
  CONSTRAINT restaurant_recipient_accounts_doc_type_check
    CHECK (holder_document_type IN ('cpf', 'cnpj')),
  CONSTRAINT restaurant_recipient_accounts_account_type_check
    CHECK (account_type IN ('checking', 'savings')),
  CONSTRAINT restaurant_recipient_accounts_status_check
    CHECK (recipient_status IN (
      'not_created', 'registration', 'affiliation', 'active',
      'refused', 'suspended', 'blocked', 'inactive', 'unknown'
    ))
);

CREATE INDEX IF NOT EXISTS idx_restaurant_recipient_accounts_restaurant
  ON public.restaurant_recipient_accounts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_recipient_accounts_recipient
  ON public.restaurant_recipient_accounts(recipient_id)
  WHERE recipient_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_restaurant_recipient_accounts_updated_at
  ON public.restaurant_recipient_accounts;
CREATE TRIGGER update_restaurant_recipient_accounts_updated_at
  BEFORE UPDATE ON public.restaurant_recipient_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.restaurant_recipient_accounts ENABLE ROW LEVEL SECURITY;

-- Owners/managers and super admins can read their own restaurant's recipient data.
DROP POLICY IF EXISTS "Restaurant can view own recipient account"
  ON public.restaurant_recipient_accounts;
CREATE POLICY "Restaurant can view own recipient account"
  ON public.restaurant_recipient_accounts FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR restaurant_id = get_user_restaurant_id()
  );

-- Writes go through the edge function (service role). We still allow managers to
-- upsert so the UI can persist drafts; the edge function uses service role anyway.
DROP POLICY IF EXISTS "Restaurant can manage own recipient account"
  ON public.restaurant_recipient_accounts;
CREATE POLICY "Restaurant can manage own recipient account"
  ON public.restaurant_recipient_accounts FOR ALL
  USING (
    is_super_admin(auth.uid())
    OR user_has_restaurant_permission(restaurant_id, 'settings_integrations_manage'::public.permission_type)
    OR user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR user_has_restaurant_permission(restaurant_id, 'settings_integrations_manage'::public.permission_type)
    OR user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
  );

DROP POLICY IF EXISTS "Service role can manage recipient accounts"
  ON public.restaurant_recipient_accounts;
CREATE POLICY "Service role can manage recipient accounts"
  ON public.restaurant_recipient_accounts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
