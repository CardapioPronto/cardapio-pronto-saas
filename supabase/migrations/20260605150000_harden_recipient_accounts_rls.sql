-- QA-2: Harden restaurant_recipient_accounts — reads only for authorized staff;
-- writes exclusively via edge functions (service_role).

REVOKE ALL ON public.restaurant_recipient_accounts FROM anon;
GRANT SELECT ON public.restaurant_recipient_accounts TO authenticated;

DROP POLICY IF EXISTS "Restaurant can manage own recipient account"
  ON public.restaurant_recipient_accounts;

DROP POLICY IF EXISTS "Restaurant can view own recipient account"
  ON public.restaurant_recipient_accounts;

CREATE POLICY "Restaurant can view own recipient account"
  ON public.restaurant_recipient_accounts
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR restaurant_id = public.get_user_restaurant_id()
    OR public.user_has_restaurant_permission(
      restaurant_id, 'settings_integrations_manage'::public.permission_type
    )
    OR public.user_has_restaurant_permission(
      restaurant_id, 'settings_manage'::public.permission_type
    )
  );

COMMENT ON TABLE public.restaurant_recipient_accounts IS
  'KYC + bank data for Pagar.me recipients. SELECT for owner/managers; INSERT/UPDATE/DELETE only via service_role (edge functions).';
