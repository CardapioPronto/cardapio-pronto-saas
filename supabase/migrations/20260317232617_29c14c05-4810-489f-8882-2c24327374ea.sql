-- Tornar públicos apenas os planos ativos para a landing page
DROP POLICY IF EXISTS "Authenticated users can view plans" ON public.plans;
CREATE POLICY "Public can view active plans"
ON public.plans
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Tornar públicas apenas as features de planos ativos para exibição na landing
DROP POLICY IF EXISTS "Authenticated users can view plan features" ON public.plan_features;
CREATE POLICY "Public can view features of active plans"
ON public.plan_features
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.plans p
    WHERE p.id = plan_features.plan_id
      AND p.is_active = true
  )
);