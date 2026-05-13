-- =====================================================================
-- Complemento B1 — FORÇAR RLS onde já está ENABLED (resto do schema).
--
-- Após B1 apenas ~25 tabelas tinham FORCE. Outras tabelas ficaram com
-- ENABLE ROW LEVEL SECURITY sem FORCE, aparecendo como WARN na view
-- rls_audit_report. Aqui repetimos ALTER ... FORCE ROW LEVEL SECURITY
-- para qualquer heap em public onde relrowsecurity = true e
-- relforcerowsecurity = false.
--
-- email_settings criou RLS em 20260506123000 sem políticas; o cliente
-- acessa muito via Edge Function (service_role), mas autenticação direta
-- precisa de políticas explícitas. Espelho do padrão de
-- restaurant_payment_settings / integrações.
-- =====================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname::text AS tname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relispartition
      AND c.relrowsecurity = true
      AND NOT c.relforcerowsecurity
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',
      r.tname
    );
  END LOOP;
END$$;

-- ---------------------------------------------------------------------
-- email_settings — políticas mínimas para authenticated (Edge continua ok)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'email_settings'
  ) THEN
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "email_settings_super_admin_all" ON public.email_settings;
  CREATE POLICY "email_settings_super_admin_all"
    ON public.email_settings
    FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

  DROP POLICY IF EXISTS "email_settings_restaurant_manage" ON public.email_settings;
  CREATE POLICY "email_settings_restaurant_manage"
    ON public.email_settings
    FOR ALL
    TO authenticated
    USING (
      restaurant_id IS NOT NULL
      AND restaurant_id = public.get_user_restaurant_id()
      AND (
        public.user_has_restaurant_permission(
          restaurant_id,
          'settings_integrations_manage'::public.permission_type
        )
        OR public.user_has_restaurant_permission(
          restaurant_id,
          'settings_manage'::public.permission_type
        )
      )
    )
    WITH CHECK (
      restaurant_id IS NOT NULL
      AND restaurant_id = public.get_user_restaurant_id()
      AND (
        public.user_has_restaurant_permission(
          restaurant_id,
          'settings_integrations_manage'::public.permission_type
        )
        OR public.user_has_restaurant_permission(
          restaurant_id,
          'settings_manage'::public.permission_type
        )
      )
    );
END$$;
