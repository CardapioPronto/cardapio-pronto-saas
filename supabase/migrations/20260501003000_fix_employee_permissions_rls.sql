CREATE OR REPLACE FUNCTION public.can_manage_restaurant_employees(target_restaurant_id uuid)
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
    WHERE e.user_id = auth.uid()
      AND e.restaurant_id = target_restaurant_id
      AND e.is_active = true
      AND (
        e.user_type = 'manager'::public.user_type
        OR EXISTS (
          SELECT 1
          FROM public.employee_permissions ep
          WHERE ep.employee_id = e.id
            AND ep.permission = 'employees_manage'::public.permission_type
        )
      )
  );
END;
$function$;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
DROP POLICY IF EXISTS "Restaurant owners can manage their employees" ON public.employees;
DROP POLICY IF EXISTS "Members can view their restaurant employees" ON public.employees;
DROP POLICY IF EXISTS "Members can manage their restaurant employees" ON public.employees;

CREATE POLICY "Members can view their restaurant employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_manage_restaurant_employees(restaurant_id)
);

CREATE POLICY "Members can manage their restaurant employees"
ON public.employees
FOR ALL
TO authenticated
USING (public.can_manage_restaurant_employees(restaurant_id))
WITH CHECK (public.can_manage_restaurant_employees(restaurant_id));

DROP POLICY IF EXISTS "Employees can view their own permissions" ON public.employee_permissions;
DROP POLICY IF EXISTS "Restaurant owners can manage employee permissions" ON public.employee_permissions;
DROP POLICY IF EXISTS "Members can view employee permissions" ON public.employee_permissions;
DROP POLICY IF EXISTS "Members can manage employee permissions" ON public.employee_permissions;

CREATE POLICY "Members can view employee permissions"
ON public.employee_permissions
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT e.id
    FROM public.employees e
    WHERE e.user_id = auth.uid()
       OR public.can_manage_restaurant_employees(e.restaurant_id)
  )
);

CREATE POLICY "Members can manage employee permissions"
ON public.employee_permissions
FOR ALL
TO authenticated
USING (
  employee_id IN (
    SELECT e.id
    FROM public.employees e
    WHERE public.can_manage_restaurant_employees(e.restaurant_id)
  )
)
WITH CHECK (
  employee_id IN (
    SELECT e.id
    FROM public.employees e
    WHERE public.can_manage_restaurant_employees(e.restaurant_id)
  )
);
