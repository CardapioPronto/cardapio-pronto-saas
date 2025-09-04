-- Habilitar RLS na tabela demos e criar política apropriada
ALTER TABLE public.demos ENABLE ROW LEVEL SECURITY;

-- A tabela demos é para solicitações de demonstração, então deve permitir inserção pública
-- mas apenas admins podem visualizar
CREATE POLICY "Anyone can request demo" 
ON public.demos 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Super admins can view all demo requests" 
ON public.demos 
FOR SELECT 
USING (is_super_admin(auth.uid()));