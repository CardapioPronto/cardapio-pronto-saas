-- Add Pagar.me sync columns to plans table
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS pagarme_plan_id_monthly text,
  ADD COLUMN IF NOT EXISTS pagarme_plan_id_yearly text,
  ADD COLUMN IF NOT EXISTS pagarme_synced_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS pagarme_sync_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pagarme_sync_error text;

-- Constraint: status válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plans_pagarme_sync_status_check'
  ) THEN
    ALTER TABLE public.plans
      ADD CONSTRAINT plans_pagarme_sync_status_check
      CHECK (pagarme_sync_status IN ('pending','synced','error'));
  END IF;
END$$;

-- Trigger updated_at se ainda não existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_plans_updated_at'
  ) THEN
    CREATE TRIGGER update_plans_updated_at
      BEFORE UPDATE ON public.plans
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- Seed do plano padrão "Plano Pubfy" (apenas se não existir nenhum plano com esse nome)
INSERT INTO public.plans (name, price_monthly, price_yearly, is_active, description, trial_days, pagarme_sync_status)
SELECT 'Plano Pubfy', 59.90, 49.00, true,
       'Assinatura única do Pubfy com todos os recursos inclusos.',
       14, 'pending'
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Plano Pubfy');