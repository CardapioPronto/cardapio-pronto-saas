-- Remove public reads of raw Pagar.me settings and expose only sanitized availability data.

DROP POLICY IF EXISTS "Restaurant can view own payment settings" ON public.restaurant_payment_settings;
CREATE POLICY "Restaurant can view own payment settings"
ON public.restaurant_payment_settings
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR restaurant_id = public.get_user_restaurant_id()
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_integrations_manage'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
);

CREATE OR REPLACE FUNCTION public.get_public_restaurant_payment_settings(p_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.restaurant_payment_settings%ROWTYPE;
  v_allowed text[] := ARRAY[]::text[];
BEGIN
  SELECT *
  INTO v_settings
  FROM public.restaurant_payment_settings
  WHERE restaurant_id = p_restaurant_id
    AND is_enabled = true
    AND onboarding_status = 'approved'
  LIMIT 1;

  IF v_settings.restaurant_id IS NULL THEN
    RETURN jsonb_build_object(
      'enabled', false,
      'methods', '[]'::jsonb,
      'allowedFulfillment', '[]'::jsonb,
      'onboardingStatus', 'not_started'
    );
  END IF;

  IF COALESCE(v_settings.allow_delivery, false) THEN
    v_allowed := array_append(v_allowed, 'delivery');
  END IF;
  IF COALESCE(v_settings.allow_pickup, false) THEN
    v_allowed := array_append(v_allowed, 'pickup');
  END IF;
  IF COALESCE(v_settings.allow_table, false) THEN
    v_allowed := array_append(v_allowed, 'table');
  END IF;
  IF COALESCE(v_settings.allow_counter, false) THEN
    v_allowed := array_append(v_allowed, 'counter');
  END IF;

  RETURN jsonb_build_object(
    'enabled', true,
    'methods', to_jsonb(COALESCE(v_settings.enabled_methods, ARRAY['pix']::text[])),
    'allowedFulfillment', to_jsonb(v_allowed),
    'onboardingStatus', v_settings.onboarding_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_restaurant_payment_settings(uuid) TO anon, authenticated;
