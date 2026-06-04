-- Permite criar conta apenas de afiliado (sem restaurante) sem afetar dono/funcionários.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup_intent text := coalesce(new.raw_user_meta_data->>'signup_intent', '');
  v_role text;
  v_user_type public.user_type;
BEGIN
  v_role := coalesce(
    new.raw_user_meta_data->>'role',
    CASE
      WHEN v_signup_intent = 'affiliate_signup' THEN 'affiliate'
      ELSE 'restaurant_owner'
    END
  );

  v_user_type := CASE
    WHEN v_signup_intent = 'affiliate_signup' THEN NULL
    ELSE COALESCE((new.raw_user_meta_data->>'user_type')::public.user_type, 'owner'::public.user_type)
  END;

  INSERT INTO public.users (id, email, role, name, user_type)
  VALUES (
    new.id,
    new.email,
    v_role,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    v_user_type
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    user_type = EXCLUDED.user_type,
    updated_at = now();

  RETURN new;
END;
$$;
