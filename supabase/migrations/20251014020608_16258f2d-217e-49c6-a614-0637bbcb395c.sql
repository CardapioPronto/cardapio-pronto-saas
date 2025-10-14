-- Adicionar coluna employee_id à tabela orders para rastrear qual funcionário criou o pedido
ALTER TABLE public.orders 
ADD COLUMN employee_id uuid REFERENCES public.users(id);

-- Criar índice para melhorar performance de consultas por funcionário
CREATE INDEX idx_orders_employee_id ON public.orders(employee_id);

-- Comentário explicativo
COMMENT ON COLUMN public.orders.employee_id IS 'ID do funcionário/usuário que criou o pedido';