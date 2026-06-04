-- Centraliza as credenciais do aplicativo iFood do SaaS no Super Admin.
-- A configuração por restaurante passa a guardar apenas a loja/merchant vinculada.

ALTER TABLE public.ifood_integration
  ALTER COLUMN client_id DROP NOT NULL,
  ALTER COLUMN client_secret DROP NOT NULL;

COMMENT ON COLUMN public.ifood_integration.client_id IS
  'Legado: credencial por restaurante. Usar public.system_settings.ifood_saas_app.';
COMMENT ON COLUMN public.ifood_integration.client_secret IS
  'Legado: segredo por restaurante. Usar public.system_settings.ifood_saas_app.';

INSERT INTO public.system_settings (key, value, description)
VALUES (
  'ifood_saas_app',
  jsonb_build_object(
    'app_name', 'Pubfy iFood',
    'app_url', '',
    'client_id', '',
    'client_secret', '',
    'distribution_model', 'centralized_saas',
    'category', 'Food',
    'visibility', 'private',
    'modules', jsonb_build_array('authentication', 'merchant', 'order', 'events'),
    'notes', ''
  ),
  'Credenciais globais do aplicativo iFood SaaS Centralizado usado pelo Pubfy.'
)
ON CONFLICT (key) DO NOTHING;
