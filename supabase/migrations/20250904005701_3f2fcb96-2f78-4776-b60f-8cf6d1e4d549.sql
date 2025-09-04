-- Corrigir as últimas duas funções com search_path inseguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_demo_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  destinatario text := 'jc.falcao@hotmail.com';
BEGIN
  -- Note: Esta função precisa ser implementada com um serviço de email real
  -- Por agora, apenas faz log da tentativa
  RAISE LOG 'Demo email request: Name=%, Email=%, Phone=%, Establishment=%, Date=%, Message=%', 
    NEW.name, NEW.email, NEW.phone, NEW.stablishment, NEW.date, NEW.message;
  
  RETURN NEW;
END;
$$;

-- Verificar qual tabela ainda não tem RLS e corrigir
-- Primeiro vamos verificar se a tabela demos tem RLS
SELECT pg_class.relname as table_name,
       CASE 
         WHEN pg_class.relrowsecurity = true THEN 'enabled'
         ELSE 'disabled'
       END as rls_status
FROM pg_class
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND pg_class.relkind = 'r'
  AND pg_class.relname = 'demos';