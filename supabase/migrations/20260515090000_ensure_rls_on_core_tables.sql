-- =====================================================================
-- B1 — Garantir RLS habilitado nas tabelas core multi-tenant.
--
-- Migrations antigas criaram políticas em `orders`, `products`,
-- `subscriptions`, `users`, `system_admins`, `plans` e
-- `restaurant_settings`, mas em alguns arquivos o ALTER TABLE ...
-- ENABLE ROW LEVEL SECURITY não estava presente. Esta migration é
-- idempotente: ENABLE ROW LEVEL SECURITY é um no-op se já estiver
-- ligado, e o FORCE garante que a tabela siga RLS inclusive para o
-- dono da tabela (apenas as roles `bypassrls` — como `service_role` da
-- Supabase — continuam ignorando, comportamento desejado).
--
-- Também:
--   * cria política mínima para `system_admins` (SELECT pelo próprio
--     usuário ou super admin), que não existia.
--   * cria política mínima para `coupon_usage` SELECT pelo super admin
--     (a política existente filtra por `restaurant_id` do dono).
-- =====================================================================

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'orders',
    'order_items',
    'order_payments',
    'products',
    'categories',
    'mesas',
    'areas',
    'subscriptions',
    'plans',
    'users',
    'system_admins',
    'restaurants',
    'restaurant_settings',
    'restaurant_payment_settings',
    'restaurant_delivery_config',
    'restaurant_email_contacts',
    'coupons',
    'coupon_usage',
    'promotions',
    'pagarme_webhook_events',
    'email_send_logs',
    'email_webhook_events',
    'email_campaigns',
    'ifood_integrations',
    'ifood_orders'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
        v_table
      );
      EXECUTE format(
        'ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',
        v_table
      );
    END IF;
  END LOOP;
END$$;

-- system_admins: garantir que apenas o próprio usuário ou super admin
-- conseguem ler. Criado de forma idempotente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'system_admins'
  ) THEN
    DROP POLICY IF EXISTS "system_admins self read" ON public.system_admins;
    CREATE POLICY "system_admins self read"
      ON public.system_admins
      FOR SELECT
      TO authenticated
      USING (
        user_id = auth.uid()
        OR public.is_super_admin(auth.uid())
      );

    DROP POLICY IF EXISTS "system_admins super admin manage" ON public.system_admins;
    CREATE POLICY "system_admins super admin manage"
      ON public.system_admins
      FOR ALL
      TO authenticated
      USING (public.is_super_admin(auth.uid()))
      WITH CHECK (public.is_super_admin(auth.uid()));
  END IF;
END$$;

-- View utilitária para auditoria de RLS. Permite a super admins
-- inspecionarem rapidamente quais tabelas têm RLS habilitado/forçado e
-- quantas políticas têm. Use:
--   SELECT * FROM public.rls_audit_report ORDER BY relname;
CREATE OR REPLACE VIEW public.rls_audit_report
WITH (security_invoker = true)
AS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  (
    SELECT count(*) FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )::integer AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r';

REVOKE ALL ON public.rls_audit_report FROM PUBLIC;
GRANT SELECT ON public.rls_audit_report TO authenticated;

COMMENT ON VIEW public.rls_audit_report IS
  'Diagnóstico de RLS por tabela em public. Use junto a is_super_admin(auth.uid()) para auditoria.';
