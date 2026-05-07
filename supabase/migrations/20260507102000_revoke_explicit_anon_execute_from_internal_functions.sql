-- Some internal SECURITY DEFINER helpers had explicit anon EXECUTE grants in
-- addition to PUBLIC defaults. Remove those grants without changing the
-- authenticated/service_role grants required by RLS and app RPC calls.

REVOKE EXECUTE ON FUNCTION public.can_manage_restaurant_employees(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_default_employee_permissions(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_basic_info(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_restaurant_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_users_basic_info(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_owner_or_manager(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin_v2(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_admin_activity(uuid, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_configuration_audit_event(uuid, text, text, text, text, jsonb, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_can_access_conversation_realtime_topic(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_restaurant_permission(uuid, public.permission_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_role(uuid, text) FROM anon;
