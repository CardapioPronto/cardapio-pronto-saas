ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS email_campaigns_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_campaign_monthly_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_campaign_contact_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_custom_templates_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS text_content text,
  ADD COLUMN IF NOT EXISTS recipient_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.restaurant_email_contacts
  ADD COLUMN IF NOT EXISTS unsubscribe_token text;

UPDATE public.restaurant_email_contacts
SET unsubscribe_token = md5(random()::text || clock_timestamp()::text || id::text)
WHERE unsubscribe_token IS NULL;

ALTER TABLE public.restaurant_email_contacts
  ALTER COLUMN unsubscribe_token SET DEFAULT md5(random()::text || clock_timestamp()::text);

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_email_contacts_unsubscribe_token
  ON public.restaurant_email_contacts(unsubscribe_token)
  WHERE unsubscribe_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_send_logs_campaign
  ON public.email_send_logs(context_id, status)
  WHERE context_type = 'campaign';

UPDATE public.plans
SET
  email_campaigns_enabled = false,
  email_campaign_monthly_limit = 0,
  email_campaign_contact_limit = 0,
  email_custom_templates_enabled = true
WHERE name ILIKE '%básico%' OR name ILIKE '%basico%' OR name ILIKE '%basic%';

UPDATE public.plans
SET
  email_campaigns_enabled = true,
  email_campaign_monthly_limit = 1000,
  email_campaign_contact_limit = 150,
  email_custom_templates_enabled = true
WHERE name ILIKE '%profissional%' OR name ILIKE '%professional%';

UPDATE public.plans
SET
  email_campaigns_enabled = true,
  email_campaign_monthly_limit = 5000,
  email_campaign_contact_limit = 250,
  email_custom_templates_enabled = true
WHERE name ILIKE '%empresarial%'
   OR name ILIKE '%enterprise%'
   OR name ILIKE '%empresa%';

UPDATE public.plans
SET
  email_campaigns_enabled = true,
  email_campaign_monthly_limit = 1000,
  email_campaign_contact_limit = 150,
  email_custom_templates_enabled = true
WHERE lower(name) = 'plano pubfy';
