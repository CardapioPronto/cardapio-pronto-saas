-- Permite usuário já existente (ex.: fidelidade/afiliado) criar restaurante e virar dono.
-- Não altera fluxo de funcionários nem o cadastro padrão de novo dono.

CREATE OR REPLACE FUNCTION public.complete_existing_user_owner_signup(
  p_restaurant_name text,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_cnpj text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.users%ROWTYPE;
  v_restaurant_id uuid;
  v_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_profile
  FROM public.users
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuário não encontrado';
  END IF;

  IF v_profile.restaurant_id IS NOT NULL THEN
    IF v_profile.user_type = 'owner' THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_owner', true,
        'restaurant_id', v_profile.restaurant_id
      );
    END IF;

    RAISE EXCEPTION 'Sua conta já está vinculada a outro restaurante';
  END IF;

  v_name := nullif(trim(coalesce(p_restaurant_name, '')), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Nome do restaurante é obrigatório';
  END IF;

  INSERT INTO public.restaurants (
    name,
    owner_id,
    phone,
    address,
    cnpj,
    logo_url,
    category,
    email
  )
  VALUES (
    v_name,
    v_user_id,
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_cnpj, '')), ''),
    nullif(trim(coalesce(p_logo_url, '')), ''),
    nullif(trim(coalesce(p_category, '')), ''),
    v_profile.email
  )
  RETURNING id INTO v_restaurant_id;

  UPDATE public.users
  SET
    restaurant_id = v_restaurant_id,
    role = 'restaurant_owner',
    user_type = 'owner'::public.user_type,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_owner', false,
    'restaurant_id', v_restaurant_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_existing_user_owner_signup(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_existing_user_owner_signup(text, text, text, text, text, text) TO authenticated;
