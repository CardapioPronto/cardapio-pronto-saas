-- Fix ambiguous parameter references in security helper functions using positional args
-- This keeps the same function signatures (param names) so frontend RPC calls remain unchanged

-- is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.system_admins s
    WHERE s.user_id = $1
  );
END;
$$;

-- is_super_admin_v2 (kept for compatibility)
CREATE OR REPLACE FUNCTION public.is_super_admin_v2(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = $1 AND u.role = 'super_admin'
  );
END;
$$;

-- user_has_role
CREATE OR REPLACE FUNCTION public.user_has_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = $1 AND u.role = $2
  );
END;
$$;