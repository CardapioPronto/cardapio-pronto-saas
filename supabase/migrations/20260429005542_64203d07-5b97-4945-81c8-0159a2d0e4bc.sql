ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS trial_start timestamp with time zone,
  ADD COLUMN IF NOT EXISTS current_period_start timestamp with time zone,
  ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_billing_cycle_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_billing_cycle_check
      CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly','yearly'));
  END IF;
END$$;

-- Índice para webhook lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_pagarme_subscription_id
  ON public.subscriptions(pagarme_subscription_id);

-- Índice único parcial: apenas uma assinatura "viva" por restaurante
CREATE UNIQUE INDEX IF NOT EXISTS uniq_subscriptions_active_per_restaurant
  ON public.subscriptions(restaurant_id)
  WHERE status IN ('active','trialing','past_due');

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER update_subscriptions_updated_at
      BEFORE UPDATE ON public.subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;