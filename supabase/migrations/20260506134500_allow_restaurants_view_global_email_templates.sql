DROP POLICY IF EXISTS "Authenticated users can view global email templates" ON public.email_templates;
CREATE POLICY "Authenticated users can view global email templates"
ON public.email_templates FOR SELECT
TO authenticated
USING (restaurant_id IS NULL AND is_enabled = true);
