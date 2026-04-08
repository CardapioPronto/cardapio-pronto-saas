
-- The previous migration partially applied. Only the trigger creation failed.
-- Drop and recreate trigger safely
DROP TRIGGER IF EXISTS update_whatsapp_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER update_whatsapp_instances_updated_at
BEFORE UPDATE ON public.whatsapp_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
