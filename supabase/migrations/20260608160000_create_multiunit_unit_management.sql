-- Bloco 15: cadastro de unidades dentro de uma rede existente.
-- Unidades adicionais usam o mesmo dono da rede e nao geram atribuicao automatica
-- no programa de indicacoes; essa regra comercial deve ser decidida separadamente.

DROP FUNCTION IF EXISTS public.create_multiunit_restaurant(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
);

CREATE OR REPLACE FUNCTION public.create_multiunit_restaurant(
  p_group_id uuid,
  p_name text,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_cnpj text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group public.restaurant_groups%ROWTYPE;
  v_creator_id uuid := auth.uid();
  v_is_super_admin boolean := false;
  v_can_manage boolean := false;
  v_restaurant_id uuid;
  v_name text;
  v_phone text;
  v_address text;
  v_cnpj text;
  v_category text;
  v_email text;
BEGIN
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  SELECT rg.*
  INTO v_group
  FROM public.restaurant_groups rg
  WHERE rg.id = p_group_id;

  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Rede nao encontrada';
  END IF;

  v_name := nullif(trim(coalesce(p_name, '')), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Nome da unidade e obrigatorio';
  END IF;

  v_is_super_admin := public.is_super_admin(v_creator_id);
  v_can_manage := v_is_super_admin
    OR v_group.owner_id = v_creator_id
    OR EXISTS (
      SELECT 1
      FROM public.restaurant_group_units rgu
      WHERE rgu.group_id = v_group.id
        AND rgu.is_active = true
        AND (
          public.user_has_restaurant_permission(
            rgu.restaurant_id,
            'settings_manage'::public.permission_type
          )
          OR public.user_has_restaurant_permission(
            rgu.restaurant_id,
            'settings_establishment_manage'::public.permission_type
          )
        )
    );

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Sem permissao para cadastrar unidades nesta rede';
  END IF;

  v_phone := nullif(trim(coalesce(p_phone, '')), '');
  v_address := nullif(trim(coalesce(p_address, '')), '');
  v_cnpj := nullif(trim(coalesce(p_cnpj, '')), '');
  v_category := nullif(trim(coalesce(p_category, '')), '');
  v_email := nullif(trim(coalesce(p_email, '')), '');

  IF v_email IS NULL THEN
    SELECT u.email
    INTO v_email
    FROM public.users u
    WHERE u.id = v_group.owner_id;
  END IF;

  INSERT INTO public.restaurants (
    name,
    owner_id,
    phone,
    address,
    cnpj,
    category,
    email,
    active
  )
  VALUES (
    v_name,
    v_group.owner_id,
    v_phone,
    v_address,
    v_cnpj,
    v_category,
    v_email,
    true
  )
  RETURNING id INTO v_restaurant_id;

  INSERT INTO public.restaurant_group_units (
    group_id,
    restaurant_id,
    is_active
  )
  VALUES (
    v_group.id,
    v_restaurant_id,
    true
  )
  ON CONFLICT (restaurant_id) DO UPDATE
  SET group_id = EXCLUDED.group_id,
      is_active = true;

  INSERT INTO public.restaurant_user_access (
    user_id,
    restaurant_id,
    access_type,
    label,
    is_active,
    granted_by
  )
  VALUES (
    v_group.owner_id,
    v_restaurant_id,
    'owner',
    'Dono',
    true,
    v_creator_id
  )
  ON CONFLICT (user_id, restaurant_id) DO UPDATE
  SET access_type = 'owner',
      label = 'Dono',
      is_active = true,
      granted_by = EXCLUDED.granted_by,
      updated_at = now();

  IF v_creator_id <> v_group.owner_id AND NOT v_is_super_admin THEN
    INSERT INTO public.restaurant_user_access (
      user_id,
      restaurant_id,
      access_type,
      label,
      is_active,
      granted_by
    )
    VALUES (
      v_creator_id,
      v_restaurant_id,
      'manager',
      'Gestor da rede',
      true,
      v_creator_id
    )
    ON CONFLICT (user_id, restaurant_id) DO UPDATE
    SET access_type = CASE
          WHEN public.restaurant_user_access.access_type = 'owner' THEN 'owner'
          ELSE 'manager'
        END,
        label = CASE
          WHEN public.restaurant_user_access.access_type = 'owner' THEN public.restaurant_user_access.label
          ELSE 'Gestor da rede'
        END,
        is_active = true,
        granted_by = EXCLUDED.granted_by,
        updated_at = now();
  END IF;

  UPDATE public.restaurant_groups
  SET master_restaurant_id = coalesce(master_restaurant_id, v_restaurant_id),
      updated_at = now()
  WHERE id = v_group.id;

  RETURN jsonb_build_object(
    'restaurant_id', v_restaurant_id,
    'restaurant_name', v_name,
    'group_id', v_group.id,
    'group_name', v_group.name,
    'owner_id', v_group.owner_id,
    'created_by', v_creator_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_multiunit_restaurant(uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_multiunit_restaurant(uuid, text, text, text, text, text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_multiunit_restaurant(uuid, text, text, text, text, text, text) IS
  'Cria uma nova unidade dentro de uma rede multiunidade existente, mantendo isolamento por unidade e sem atribuir indicacao automaticamente.';
