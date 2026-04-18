
CREATE OR REPLACE FUNCTION public.get_user_basic_info(_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  user_type public.user_type
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_restaurant_id uuid;
  target_restaurant_id uuid;
  caller_is_super_admin boolean;
BEGIN
  SELECT public.is_super_admin(auth.uid()) INTO caller_is_super_admin;

  SELECT u.restaurant_id INTO caller_restaurant_id
  FROM public.users u WHERE u.id = auth.uid();

  IF caller_restaurant_id IS NULL THEN
    SELECT e.restaurant_id INTO caller_restaurant_id
    FROM public.employees e
    WHERE e.user_id = auth.uid() AND e.is_active = true
    LIMIT 1;
  END IF;

  SELECT u.restaurant_id INTO target_restaurant_id
  FROM public.users u WHERE u.id = _user_id;

  IF NOT caller_is_super_admin
     AND (caller_restaurant_id IS NULL
          OR target_restaurant_id IS DISTINCT FROM caller_restaurant_id)
     AND _user_id <> auth.uid() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, u.name, u.email, u.user_type
  FROM public.users u
  WHERE u.id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_users_basic_info(_user_ids uuid[])
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  user_type public.user_type
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_restaurant_id uuid;
  caller_is_super_admin boolean;
BEGIN
  SELECT public.is_super_admin(auth.uid()) INTO caller_is_super_admin;

  SELECT u.restaurant_id INTO caller_restaurant_id
  FROM public.users u WHERE u.id = auth.uid();

  IF caller_restaurant_id IS NULL THEN
    SELECT e.restaurant_id INTO caller_restaurant_id
    FROM public.employees e
    WHERE e.user_id = auth.uid() AND e.is_active = true
    LIMIT 1;
  END IF;

  IF caller_is_super_admin THEN
    RETURN QUERY
    SELECT u.id, u.name, u.email, u.user_type
    FROM public.users u
    WHERE u.id = ANY(_user_ids);
  ELSE
    RETURN QUERY
    SELECT u.id, u.name, u.email, u.user_type
    FROM public.users u
    WHERE u.id = ANY(_user_ids)
      AND (u.restaurant_id = caller_restaurant_id OR u.id = auth.uid());
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_owner_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = _user_id
      AND u.user_type IN ('owner'::public.user_type, 'manager'::public.user_type)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.id = _user_id AND u.user_type = 'owner'::public.user_type) THEN true
    WHEN EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id = _user_id AND e.is_active = true) THEN true
    WHEN public.is_super_admin(_user_id) THEN true
    ELSE false
  END;
$$;

DROP POLICY IF EXISTS "Restaurant owners can view their team users" ON public.users;
CREATE POLICY "Restaurant owners can view their team users"
ON public.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.owner_id = auth.uid()
      AND public.users.restaurant_id = r.id
  )
);
