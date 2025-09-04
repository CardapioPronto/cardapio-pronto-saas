-- Corrigir problemas de RLS nas tabelas órfãs
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Políticas para plans (somente super admins podem gerenciar)
CREATE POLICY "Super admins can access all plans" 
ON public.plans 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Políticas para plan_features (somente super admins podem gerenciar)
CREATE POLICY "Super admins can access all plan features" 
ON public.plan_features 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Permitir leitura pública dos planos para usuários logados
CREATE POLICY "Authenticated users can view plans" 
ON public.plans 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view plan features" 
ON public.plan_features 
FOR SELECT 
TO authenticated
USING (true);

-- Corrigir função que pode estar com search_path inseguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, name, user_type)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'restaurant_owner'),
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    COALESCE((new.raw_user_meta_data->>'user_type')::user_type, 'owner'::user_type)
  );
  RETURN new;
END;
$$;

-- Corrigir outras funções com search_path inseguro
CREATE OR REPLACE FUNCTION public.user_has_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = required_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin_v2(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'super_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.system_admins WHERE system_admins.user_id = user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_admin_activity(admin_id uuid, action text, entity_type text, entity_id text, details jsonb DEFAULT NULL::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.admin_activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (admin_id, action, entity_type, entity_id, details)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_employee_permissions(employee_id_param uuid, granted_by_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permissões padrão para funcionário de salão/caixa
  INSERT INTO public.employee_permissions (employee_id, permission, granted_by)
  VALUES 
    (employee_id_param, 'pdv_access', granted_by_param),
    (employee_id_param, 'orders_view', granted_by_param),
    (employee_id_param, 'orders_manage', granted_by_param),
    (employee_id_param, 'products_view', granted_by_param)
  ON CONFLICT (employee_id, permission) DO NOTHING;
END;
$$;