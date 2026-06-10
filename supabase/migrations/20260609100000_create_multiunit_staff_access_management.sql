-- Bloco 15: gestao de acesso da equipe em redes multiunidade.
-- Replica o vinculo de employees/employee_permissions por unidade para preservar
-- o modelo granular de permissoes ja usado pelo painel.

DROP FUNCTION IF EXISTS public.user_can_manage_restaurant_group_staff(uuid);
DROP FUNCTION IF EXISTS public.get_restaurant_group_staff(uuid);
DROP FUNCTION IF EXISTS public.apply_restaurant_group_staff_access(uuid, uuid, uuid[], boolean);

CREATE OR REPLACE FUNCTION public.user_can_manage_restaurant_group_staff(p_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group public.restaurant_groups%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR p_group_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT rg.*
  INTO v_group
  FROM public.restaurant_groups rg
  WHERE rg.id = p_group_id;

  IF v_group.id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin(v_user_id) OR v_group.owner_id = v_user_id THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.restaurant_group_units rgu
    WHERE rgu.group_id = p_group_id
      AND rgu.is_active = true
      AND (
        public.can_manage_restaurant_employees(rgu.restaurant_id)
        OR public.user_has_restaurant_permission(
          rgu.restaurant_id,
          'settings_manage'::public.permission_type
        )
      )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_restaurant_group_staff(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group public.restaurant_groups%ROWTYPE;
  v_payload jsonb;
BEGIN
  SELECT rg.*
  INTO v_group
  FROM public.restaurant_groups rg
  WHERE rg.id = p_group_id;

  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Rede nao encontrada';
  END IF;

  IF NOT public.user_can_manage_restaurant_group_staff(p_group_id) THEN
    RAISE EXCEPTION 'Sem permissao para gerenciar equipe desta rede';
  END IF;

  WITH employee_rows AS (
    SELECT
      e.id,
      e.user_id,
      e.employee_name,
      e.employee_email,
      e.user_type::text AS user_type,
      e.is_active,
      e.restaurant_id,
      r.name AS restaurant_name,
      e.created_at,
      coalesce((
        SELECT array_agg(DISTINCT ep.permission::text ORDER BY ep.permission::text)
        FROM public.employee_permissions ep
        WHERE ep.employee_id = e.id
      ), ARRAY[]::text[]) AS permissions
    FROM public.employees e
    JOIN public.restaurant_group_units rgu
      ON rgu.restaurant_id = e.restaurant_id
     AND rgu.group_id = p_group_id
     AND rgu.is_active = true
    JOIN public.restaurants r ON r.id = e.restaurant_id
  ),
  source_rows AS (
    SELECT DISTINCT ON (er.user_id)
      er.user_id,
      er.id AS source_employee_id,
      er.employee_name,
      er.employee_email,
      er.user_type,
      er.restaurant_id AS source_restaurant_id,
      er.restaurant_name AS source_restaurant_name,
      er.permissions
    FROM employee_rows er
    ORDER BY
      er.user_id,
      er.is_active DESC,
      CASE er.user_type WHEN 'manager' THEN 0 ELSE 1 END,
      er.created_at ASC
  ),
  staff_rows AS (
    SELECT
      sr.user_id,
      sr.source_employee_id,
      sr.employee_name,
      sr.employee_email,
      sr.user_type,
      sr.source_restaurant_id,
      sr.source_restaurant_name,
      sr.permissions,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'employee_id', er.id,
            'restaurant_id', er.restaurant_id,
            'restaurant_name', er.restaurant_name,
            'user_type', er.user_type,
            'is_active', er.is_active,
            'permissions', er.permissions
          )
          ORDER BY er.restaurant_name
        )
        FROM employee_rows er
        WHERE er.user_id = sr.user_id
      ) AS units
    FROM source_rows sr
  )
  SELECT jsonb_build_object(
    'group_id', v_group.id,
    'group_name', v_group.name,
    'staff', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id', staff_rows.user_id,
          'source_employee_id', staff_rows.source_employee_id,
          'employee_name', staff_rows.employee_name,
          'employee_email', staff_rows.employee_email,
          'user_type', staff_rows.user_type,
          'source_restaurant_id', staff_rows.source_restaurant_id,
          'source_restaurant_name', staff_rows.source_restaurant_name,
          'permissions', staff_rows.permissions,
          'units', staff_rows.units
        )
        ORDER BY staff_rows.employee_name
      ),
      '[]'::jsonb
    )
  )
  INTO v_payload
  FROM staff_rows;

  RETURN coalesce(
    v_payload,
    jsonb_build_object(
      'group_id', v_group.id,
      'group_name', v_group.name,
      'staff', '[]'::jsonb
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_restaurant_group_staff_access(
  p_group_id uuid,
  p_source_employee_id uuid,
  p_target_restaurant_ids uuid[],
  p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group public.restaurant_groups%ROWTYPE;
  v_source public.employees%ROWTYPE;
  v_target_restaurant_id uuid;
  v_target_employee_id uuid;
  v_created_count integer := 0;
  v_updated_count integer := 0;
  v_permissions_synced integer := 0;
  v_permissions_inserted integer := 0;
  v_targets_count integer := 0;
  v_actor_id uuid := auth.uid();
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  IF p_target_restaurant_ids IS NULL OR cardinality(p_target_restaurant_ids) = 0 THEN
    RAISE EXCEPTION 'Selecione pelo menos uma unidade de destino';
  END IF;

  SELECT rg.*
  INTO v_group
  FROM public.restaurant_groups rg
  WHERE rg.id = p_group_id;

  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Rede nao encontrada';
  END IF;

  IF NOT public.user_can_manage_restaurant_group_staff(p_group_id) THEN
    RAISE EXCEPTION 'Sem permissao para gerenciar equipe desta rede';
  END IF;

  SELECT e.*
  INTO v_source
  FROM public.employees e
  JOIN public.restaurant_group_units rgu
    ON rgu.restaurant_id = e.restaurant_id
   AND rgu.group_id = p_group_id
   AND rgu.is_active = true
  WHERE e.id = p_source_employee_id;

  IF v_source.id IS NULL THEN
    RAISE EXCEPTION 'Colaborador de origem nao encontrado nesta rede';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_target_restaurant_ids) AS requested(restaurant_id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.restaurant_group_units rgu
      WHERE rgu.group_id = p_group_id
        AND rgu.restaurant_id = requested.restaurant_id
        AND rgu.is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Todas as unidades de destino precisam pertencer a rede';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM unnest(p_target_restaurant_ids) AS requested(restaurant_id)
    WHERE requested.restaurant_id <> v_source.restaurant_id
  ) THEN
    RAISE EXCEPTION 'Selecione ao menos uma filial diferente da unidade de origem';
  END IF;

  FOR v_target_restaurant_id IN
    SELECT DISTINCT requested.restaurant_id
    FROM unnest(p_target_restaurant_ids) AS requested(restaurant_id)
    WHERE requested.restaurant_id <> v_source.restaurant_id
  LOOP
    SELECT e.id
    INTO v_target_employee_id
    FROM public.employees e
    WHERE e.user_id = v_source.user_id
      AND e.restaurant_id = v_target_restaurant_id
    ORDER BY e.created_at ASC
    LIMIT 1;

    IF v_target_employee_id IS NULL THEN
      INSERT INTO public.employees (
        user_id,
        restaurant_id,
        employee_name,
        employee_email,
        user_type,
        is_active,
        created_by
      )
      VALUES (
        v_source.user_id,
        v_target_restaurant_id,
        v_source.employee_name,
        v_source.employee_email,
        v_source.user_type,
        coalesce(p_is_active, true),
        v_actor_id
      )
      RETURNING id INTO v_target_employee_id;

      v_created_count := v_created_count + 1;
    ELSE
      UPDATE public.employees
      SET employee_name = v_source.employee_name,
          employee_email = v_source.employee_email,
          user_type = v_source.user_type,
          is_active = coalesce(p_is_active, true),
          updated_at = now()
      WHERE id = v_target_employee_id;

      v_updated_count := v_updated_count + 1;
    END IF;

    DELETE FROM public.employee_permissions
    WHERE employee_id = v_target_employee_id;

    INSERT INTO public.employee_permissions (
      employee_id,
      permission,
      granted_by
    )
    SELECT
      v_target_employee_id,
      ep.permission,
      v_actor_id
    FROM public.employee_permissions ep
    WHERE ep.employee_id = v_source.id
    ON CONFLICT (employee_id, permission) DO NOTHING;

    GET DIAGNOSTICS v_permissions_inserted = ROW_COUNT;
    v_permissions_synced := v_permissions_synced + v_permissions_inserted;
    v_targets_count := v_targets_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'group_id', p_group_id,
    'source_employee_id', p_source_employee_id,
    'targets_count', v_targets_count,
    'employees_created', v_created_count,
    'employees_updated', v_updated_count,
    'permissions_synced', v_permissions_synced
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.user_can_manage_restaurant_group_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_restaurant_group_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_restaurant_group_staff_access(uuid, uuid, uuid[], boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.user_can_manage_restaurant_group_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_restaurant_group_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_restaurant_group_staff_access(uuid, uuid, uuid[], boolean) TO authenticated, service_role;

COMMENT ON FUNCTION public.apply_restaurant_group_staff_access(uuid, uuid, uuid[], boolean) IS
  'Replica o acesso de um colaborador para unidades da mesma rede, copiando cargo e permissoes granulares.';
