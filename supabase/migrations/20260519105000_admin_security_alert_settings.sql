-- Configuracoes globais do modulo de administracao.
-- A tela /admin/settings ja permite editar essa chave manualmente e, no futuro,
-- pode ser substituida por uma UI especifica para alertas de seguranca.

INSERT INTO public.system_settings (key, value, description)
VALUES (
  'admin.security_alerts',
  jsonb_build_object(
    'enabled', true,
    'emails', jsonb_build_array('juniorfalcao.jc@gmail.com')
  ),
  'Destinatarios dos alertas de seguranca para criacao/remocao de super administradores.'
)
ON CONFLICT (key) DO UPDATE
SET
  description = EXCLUDED.description,
  updated_at = now()
WHERE public.system_settings.description IS DISTINCT FROM EXCLUDED.description;
