-- Corrigir restaurant_id para funcionários existentes
-- Sincronizar restaurant_id da tabela employees para a tabela users

UPDATE public.users u
SET restaurant_id = e.restaurant_id
FROM public.employees e
WHERE u.id = e.user_id 
  AND u.restaurant_id IS NULL 
  AND u.user_type = 'employee';

-- Criar trigger para manter restaurant_id sincronizado no futuro
-- Este trigger garante que quando um funcionário é criado/atualizado,
-- o restaurant_id na tabela users também é atualizado

CREATE OR REPLACE FUNCTION public.sync_employee_restaurant_id()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET restaurant_id = NEW.restaurant_id
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger que dispara após INSERT ou UPDATE na tabela employees
DROP TRIGGER IF EXISTS sync_employee_restaurant_id_trigger ON public.employees;

CREATE TRIGGER sync_employee_restaurant_id_trigger
  AFTER INSERT OR UPDATE OF restaurant_id ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_employee_restaurant_id();