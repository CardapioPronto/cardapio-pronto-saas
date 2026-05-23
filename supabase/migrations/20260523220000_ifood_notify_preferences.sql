-- Preferências de notificação iFood (toasts no painel quando a equipe está logada)

ALTER TABLE public.ifood_integration
  ADD COLUMN IF NOT EXISTS notify_new_orders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_status_changes boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ifood_integration.notify_new_orders IS
  'Exibe toast no painel quando o polling importa pedido novo do iFood.';
COMMENT ON COLUMN public.ifood_integration.notify_status_changes IS
  'Exibe toast quando o polling atualiza status de pedido iFood já importado.';
