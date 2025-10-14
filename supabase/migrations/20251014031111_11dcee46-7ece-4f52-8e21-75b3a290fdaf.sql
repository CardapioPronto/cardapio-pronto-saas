-- Add new permission types for fine-grained access to dashboard and subscriptions
DO $$ BEGIN
  ALTER TYPE public.permission_type ADD VALUE IF NOT EXISTS 'dashboard_view';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.permission_type ADD VALUE IF NOT EXISTS 'subscription_view';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional: backfill default permissions for owners (handled in app logic)
