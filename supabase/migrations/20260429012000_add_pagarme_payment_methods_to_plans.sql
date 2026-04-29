-- Store the Pagar.me plan payment methods selected per local plan.
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS pagarme_payment_methods text[] NOT NULL
  DEFAULT ARRAY['credit_card', 'boleto'];

UPDATE public.plans
SET pagarme_payment_methods = ARRAY['credit_card', 'boleto']
WHERE pagarme_payment_methods IS NULL
   OR array_length(pagarme_payment_methods, 1) IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plans_pagarme_payment_methods_check'
  ) THEN
    ALTER TABLE public.plans
      ADD CONSTRAINT plans_pagarme_payment_methods_check
      CHECK (
        array_length(pagarme_payment_methods, 1) > 0
        AND pagarme_payment_methods <@ ARRAY['credit_card', 'debit_card', 'cash', 'boleto']::text[]
      );
  END IF;
END$$;
