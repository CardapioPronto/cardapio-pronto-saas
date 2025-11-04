-- Drop and recreate the function to handle both owners and employees
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_restaurant_id uuid;
BEGIN
  -- Primeiro tenta pegar da tabela users (para owners)
  SELECT restaurant_id INTO user_restaurant_id
  FROM public.users
  WHERE id = auth.uid();
  
  -- Se não encontrou, tenta buscar da tabela employees (para funcionários)
  IF user_restaurant_id IS NULL THEN
    SELECT restaurant_id INTO user_restaurant_id
    FROM public.employees
    WHERE user_id = auth.uid() AND is_active = true;
  END IF;
  
  RETURN user_restaurant_id;
END;
$function$;