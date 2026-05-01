CREATE OR REPLACE FUNCTION public.user_has_restaurant_permission(
  target_restaurant_id uuid,
  required_permission public.permission_type
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF target_restaurant_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.restaurant_id = target_restaurant_id
      AND u.user_type = 'owner'::public.user_type
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.employee_permissions ep ON ep.employee_id = e.id
    WHERE e.user_id = auth.uid()
      AND e.restaurant_id = target_restaurant_id
      AND e.is_active = true
      AND ep.permission IN (required_permission, 'settings_manage'::public.permission_type)
  );
END;
$function$;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their restaurant profile" ON public.restaurants;
DROP POLICY IF EXISTS "Members can update restaurant establishment settings" ON public.restaurants;

CREATE POLICY "Members can view their restaurant profile"
ON public.restaurants
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR id = public.get_user_restaurant_id()
);

CREATE POLICY "Members can update restaurant establishment settings"
ON public.restaurants
FOR UPDATE
TO authenticated
USING (
  public.user_has_restaurant_permission(id, 'settings_establishment_manage'::public.permission_type)
)
WITH CHECK (
  public.user_has_restaurant_permission(id, 'settings_establishment_manage'::public.permission_type)
);

ALTER TABLE public.system_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their restaurant system settings" ON public.system_configurations;
DROP POLICY IF EXISTS "Members can insert restaurant system settings" ON public.system_configurations;
DROP POLICY IF EXISTS "Members can update restaurant system settings" ON public.system_configurations;

CREATE POLICY "Members can view their restaurant system settings"
ON public.system_configurations
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR restaurant_id = public.get_user_restaurant_id()
);

CREATE POLICY "Members can insert restaurant system settings"
ON public.system_configurations
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_restaurant_permission(restaurant_id, 'settings_system_manage'::public.permission_type)
);

CREATE POLICY "Members can update restaurant system settings"
ON public.system_configurations
FOR UPDATE
TO authenticated
USING (
  public.user_has_restaurant_permission(restaurant_id, 'settings_system_manage'::public.permission_type)
)
WITH CHECK (
  public.user_has_restaurant_permission(restaurant_id, 'settings_system_manage'::public.permission_type)
);
