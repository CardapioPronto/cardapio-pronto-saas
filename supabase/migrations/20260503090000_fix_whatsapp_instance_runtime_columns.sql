ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS automation_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_connection_update_at timestamptz;

UPDATE public.whatsapp_instances
SET automation_enabled = true
WHERE automation_enabled IS NULL;

