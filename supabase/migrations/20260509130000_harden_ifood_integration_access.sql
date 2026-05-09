-- Keep iFood secrets backend-only. Owners and employees configure iFood through
-- the ifood-integration Edge Function, which uses the service role and never
-- returns client_secret to the browser.

ALTER TABLE public.ifood_integration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can access all ifood integrations" ON public.ifood_integration;
DROP POLICY IF EXISTS "Members can view own ifood integration" ON public.ifood_integration;
DROP POLICY IF EXISTS "Members can insert own ifood integration" ON public.ifood_integration;
DROP POLICY IF EXISTS "Members can update own ifood integration" ON public.ifood_integration;
DROP POLICY IF EXISTS "Restaurant owners can manage ifood integration" ON public.ifood_integration;
DROP POLICY IF EXISTS "Users can view their restaurant's ifood integration" ON public.ifood_integration;
DROP POLICY IF EXISTS "Users can update their restaurant's ifood integration" ON public.ifood_integration;

CREATE POLICY "Super admins can access all ifood integrations"
ON public.ifood_integration
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
