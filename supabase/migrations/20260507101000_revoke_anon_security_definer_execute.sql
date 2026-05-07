-- SECURITY DEFINER functions are powerful enough to bypass caller RLS, so avoid
-- exposing internal helpers as public RPCs. Keep only intentionally public,
-- sanitized menu/order endpoints executable by anon.

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Public RPCs used by the storefront/checkout without a signed-in account.
REVOKE EXECUTE ON FUNCTION public.create_public_menu_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_menu_order(jsonb) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_public_order_tracking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_tracking(uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_public_restaurant_payment_settings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_payment_settings(uuid) TO anon, authenticated;

-- Authenticated RPCs and RLS helper functions.
REVOKE EXECUTE ON FUNCTION public.can_manage_restaurant_employees(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_restaurant_employees(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_default_employee_permissions(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_default_employee_permissions(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_basic_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_basic_info(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_restaurant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_restaurant_id() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_users_basic_info(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_users_basic_info(uuid[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_owner_or_manager(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner_or_manager(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_super_admin_v2(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin_v2(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_active(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.log_admin_activity(uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_admin_activity(uuid, text, text, text, jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.record_configuration_audit_event(uuid, text, text, text, text, jsonb, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_configuration_audit_event(uuid, text, text, text, text, jsonb, uuid, jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.user_can_access_conversation_realtime_topic(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_access_conversation_realtime_topic(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.user_has_restaurant_permission(uuid, public.permission_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_restaurant_permission(uuid, public.permission_type) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.user_has_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_role(uuid, text) TO authenticated, service_role;

-- Internal implementation helpers and trigger functions are not public RPCs.
REVOKE EXECUTE ON FUNCTION public.delete_user_avatar_storage_objects() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.insert_configuration_audit_log(uuid, text, text, text, text, jsonb, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_delivery_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_restaurant_configuration_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_system_configuration_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_user_configuration_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_demo_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_employee_restaurant_id() FROM PUBLIC, anon, authenticated;
