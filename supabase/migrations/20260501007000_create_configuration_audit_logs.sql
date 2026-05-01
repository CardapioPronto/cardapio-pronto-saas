CREATE TABLE IF NOT EXISTS public.configuration_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  area text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  changed_fields text[] NOT NULL DEFAULT '{}',
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_configuration_audit_restaurant_created
  ON public.configuration_audit_logs (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_configuration_audit_actor
  ON public.configuration_audit_logs (actor_user_id, created_at DESC);

ALTER TABLE public.configuration_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view configuration audit logs" ON public.configuration_audit_logs;
CREATE POLICY "Members can view configuration audit logs"
ON public.configuration_audit_logs
FOR SELECT
TO authenticated
USING (
  public.user_has_restaurant_permission(restaurant_id, 'settings_audit_view'::public.permission_type)
  OR public.user_has_restaurant_permission(restaurant_id, 'settings_manage'::public.permission_type)
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.audit_changed_fields(
  old_data jsonb,
  new_data jsonb,
  ignored_fields text[] DEFAULT ARRAY[]::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  field_name text;
  result jsonb := '{}'::jsonb;
BEGIN
  FOR field_name IN SELECT jsonb_object_keys(new_data)
  LOOP
    IF field_name = ANY(ignored_fields) THEN
      CONTINUE;
    END IF;

    IF old_data -> field_name IS DISTINCT FROM new_data -> field_name THEN
      result := result || jsonb_build_object(
        field_name,
        jsonb_build_object('from', old_data -> field_name, 'to', new_data -> field_name)
      );
    END IF;
  END LOOP;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_configuration_audit_log(
  p_restaurant_id uuid,
  p_area text,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_changes jsonb,
  p_target_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  audit_id uuid;
  changed_keys text[];
BEGIN
  IF p_changes IS NULL OR p_changes = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::text[])
  INTO changed_keys
  FROM jsonb_object_keys(p_changes) AS key;

  INSERT INTO public.configuration_audit_logs (
    restaurant_id,
    actor_user_id,
    target_user_id,
    area,
    action,
    entity_type,
    entity_id,
    changed_fields,
    changes,
    metadata
  )
  VALUES (
    p_restaurant_id,
    auth.uid(),
    p_target_user_id,
    p_area,
    p_action,
    p_entity_type,
    p_entity_id,
    changed_keys,
    p_changes,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_configuration_audit_event(
  target_restaurant_id uuid,
  event_area text,
  event_action text,
  event_entity_type text,
  event_entity_id text,
  event_changes jsonb,
  event_target_user_id uuid DEFAULT NULL,
  event_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF target_restaurant_id IS DISTINCT FROM public.get_user_restaurant_id()
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Usuário sem acesso ao restaurante informado';
  END IF;

  RETURN public.insert_configuration_audit_log(
    target_restaurant_id,
    event_area,
    event_action,
    event_entity_type,
    event_entity_id,
    event_changes,
    event_target_user_id,
    event_metadata
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_restaurant_configuration_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  changes jsonb;
BEGIN
  changes := public.audit_changed_fields(
    to_jsonb(OLD),
    to_jsonb(NEW),
    ARRAY['id', 'owner_id', 'created_at', 'updated_at']
  );

  PERFORM public.insert_configuration_audit_log(
    NEW.id,
    'establishment',
    'update',
    'restaurant',
    NEW.id::text,
    changes,
    NULL,
    '{}'::jsonb
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_system_configuration_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  changes jsonb;
BEGIN
  changes := public.audit_changed_fields(
    to_jsonb(OLD),
    to_jsonb(NEW),
    ARRAY['id', 'restaurant_id', 'created_at', 'updated_at']
  );

  PERFORM public.insert_configuration_audit_log(
    NEW.restaurant_id,
    'system',
    'update',
    'system_configurations',
    NEW.id::text,
    changes,
    NULL,
    '{}'::jsonb
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_user_configuration_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  changes jsonb;
BEGIN
  changes := public.audit_changed_fields(
    to_jsonb(OLD),
    to_jsonb(NEW),
    ARRAY['id', 'created_at', 'updated_at']
  );

  PERFORM public.insert_configuration_audit_log(
    COALESCE(NEW.restaurant_id, OLD.restaurant_id),
    'user',
    'update',
    'user',
    NEW.id::text,
    changes,
    NEW.id,
    '{}'::jsonb
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_restaurant_configuration_audit ON public.restaurants;
CREATE TRIGGER trg_restaurant_configuration_audit
  AFTER UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.log_restaurant_configuration_audit();

DROP TRIGGER IF EXISTS trg_system_configuration_audit ON public.system_configurations;
CREATE TRIGGER trg_system_configuration_audit
  AFTER UPDATE ON public.system_configurations
  FOR EACH ROW EXECUTE FUNCTION public.log_system_configuration_audit();

DROP TRIGGER IF EXISTS trg_user_configuration_audit ON public.users;
CREATE TRIGGER trg_user_configuration_audit
  AFTER UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.log_user_configuration_audit();
