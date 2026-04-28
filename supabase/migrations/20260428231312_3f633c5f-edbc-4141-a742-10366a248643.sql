-- Add Pagar.me tracking fields and webhook log table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pagarme_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS pagarme_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_payment_status TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_pagarme_subscription_id
  ON public.subscriptions(pagarme_subscription_id);

-- Webhook event log (for audit + idempotency)
CREATE TABLE IF NOT EXISTS public.pagarme_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  pagarme_subscription_id TEXT,
  pagarme_customer_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processing_error TEXT,
  signature_valid BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_pagarme_webhook_events_type
  ON public.pagarme_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pagarme_webhook_events_subscription
  ON public.pagarme_webhook_events(pagarme_subscription_id);

ALTER TABLE public.pagarme_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view webhook events"
  ON public.pagarme_webhook_events FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Service role can manage webhook events"
  ON public.pagarme_webhook_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);