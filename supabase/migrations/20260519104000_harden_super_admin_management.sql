-- Hardening do módulo de super admins.
-- A escrita em system_admins passa a ser feita somente por Edge Function
-- com service role, validações de negócio e auditoria.

ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_admins FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_admins super admin manage" ON public.system_admins;

DROP POLICY IF EXISTS "system_admins super admin select" ON public.system_admins;
CREATE POLICY "system_admins super admin select"
  ON public.system_admins
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
  );

COMMENT ON TABLE public.system_admins IS
  'Super administradores globais. Escrita deve ocorrer via Edge Function admin-super-admins com service_role, validações e auditoria.';
