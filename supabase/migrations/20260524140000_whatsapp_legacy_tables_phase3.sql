-- Fase 3: remover tabelas legado WhatsApp (UltraMsg, templates antigos, AI config duplicado).
-- Pré-requisito: Fase 2 aplicada (prompts em automation_settings).
-- Operacional mantido: whatsapp_instances, automation_settings, conversation_*, n8n edges.

-- Histórico legado estava na publicação realtime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_chat_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_chat_history;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DROP TABLE IF EXISTS public.whatsapp_chat_history CASCADE;
DROP TABLE IF EXISTS public.whatsapp_ai_config CASCADE;
DROP TABLE IF EXISTS public.whatsapp_messages CASCADE;
DROP TABLE IF EXISTS public.whatsapp_message_templates CASCADE;
DROP TABLE IF EXISTS public.whatsapp_integration CASCADE;
