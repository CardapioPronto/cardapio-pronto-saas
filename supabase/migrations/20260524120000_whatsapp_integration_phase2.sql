-- Fase 2: migrar prompts legados (whatsapp_integration) para automation_settings (por instância).

-- 1) Copiar ai_system_prompt -> ai_persona e welcome_message legado -> welcome_message
INSERT INTO public.automation_settings (
  instance_id,
  restaurant_id,
  ai_persona,
  welcome_message,
  ai_enabled
)
SELECT DISTINCT ON (wi.id)
  wi.id AS instance_id,
  wi.restaurant_id,
  NULLIF(trim(wint.ai_system_prompt), '') AS ai_persona,
  NULLIF(trim(wint.welcome_message), '') AS welcome_message,
  COALESCE(wint.ai_enabled, true) AS ai_enabled
FROM public.whatsapp_instances wi
INNER JOIN public.whatsapp_integration wint ON wint.restaurant_id = wi.restaurant_id
WHERE wi.is_active = true
  AND (
    (wint.ai_system_prompt IS NOT NULL AND trim(wint.ai_system_prompt) <> '')
    OR (wint.welcome_message IS NOT NULL AND trim(wint.welcome_message) <> '')
  )
ORDER BY wi.id, wi.updated_at DESC
ON CONFLICT (instance_id) DO UPDATE SET
  ai_persona = COALESCE(
    NULLIF(trim(public.automation_settings.ai_persona), ''),
    EXCLUDED.ai_persona
  ),
  welcome_message = COALESCE(
    NULLIF(trim(public.automation_settings.welcome_message), ''),
    EXCLUDED.welcome_message
  ),
  ai_enabled = COALESCE(public.automation_settings.ai_enabled, EXCLUDED.ai_enabled),
  updated_at = now();

-- 2) Marcar colunas legadas (não remover até Fase 3)
COMMENT ON TABLE public.whatsapp_integration IS
  'Legado UltraMsg/Twilio. Prompts de IA migrados para automation_settings (Fase 2). Não usar em código novo.';

COMMENT ON COLUMN public.whatsapp_integration.provider IS 'LEGADO: ultramsg/twilio. Não configurar em produção nova.';
COMMENT ON COLUMN public.whatsapp_integration.ultramsg_instance_id IS 'LEGADO UltraMsg. Remoção prevista Fase 3.';
COMMENT ON COLUMN public.whatsapp_integration.ultramsg_token IS 'LEGADO UltraMsg. Remoção prevista Fase 3.';
COMMENT ON COLUMN public.whatsapp_integration.twilio_account_sid IS 'LEGADO Twilio. Remoção prevista Fase 3.';
COMMENT ON COLUMN public.whatsapp_integration.twilio_auth_token IS 'LEGADO Twilio. Remoção prevista Fase 3.';
COMMENT ON COLUMN public.whatsapp_integration.twilio_phone_number IS 'LEGADO Twilio. Remoção prevista Fase 3.';
COMMENT ON COLUMN public.whatsapp_integration.ai_system_prompt IS
  'LEGADO: preferir automation_settings.ai_persona. Mantido como fallback temporário no generate-ai-response.';
COMMENT ON COLUMN public.whatsapp_integration.n8n_webhook_url IS
  'LEGADO: fluxo n8n usa instâncias Evolution. Remoção prevista Fase 3.';
COMMENT ON COLUMN public.whatsapp_integration.n8n_enabled IS 'LEGADO n8n na tabela antiga. Remoção prevista Fase 3.';
