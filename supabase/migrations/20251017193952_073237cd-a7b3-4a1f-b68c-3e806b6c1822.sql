-- Adicionar campos de trial à tabela subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false;

-- Criar tabela para configurações do PagarMe (somente super admins)
CREATE TABLE IF NOT EXISTS public.pagarme_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text NOT NULL,
  is_live boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- RLS para pagarme_config
ALTER TABLE public.pagarme_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage PagarMe config"
ON public.pagarme_config
FOR ALL
USING (is_super_admin(auth.uid()));

-- Inserir 3 planos padrão se não existirem
INSERT INTO public.plans (name, price_monthly, price_yearly, is_active)
VALUES 
  ('Básico', 97.00, 970.00, true),
  ('Profissional', 197.00, 1970.00, true),
  ('Empresarial', 397.00, 3970.00, true)
ON CONFLICT DO NOTHING;

-- Inserir features padrão para cada plano
DO $$
DECLARE
  plano_basico_id uuid;
  plano_prof_id uuid;
  plano_emp_id uuid;
BEGIN
  -- Buscar IDs dos planos
  SELECT id INTO plano_basico_id FROM public.plans WHERE name = 'Básico' LIMIT 1;
  SELECT id INTO plano_prof_id FROM public.plans WHERE name = 'Profissional' LIMIT 1;
  SELECT id INTO plano_emp_id FROM public.plans WHERE name = 'Empresarial' LIMIT 1;
  
  -- Features Plano Básico
  INSERT INTO public.plan_features (plan_id, feature, is_enabled) VALUES
    (plano_basico_id, 'Cardápio Digital Básico', true),
    (plano_basico_id, 'Até 50 produtos', true),
    (plano_basico_id, 'PDV Simples', true),
    (plano_basico_id, 'Controle de Mesas', true),
    (plano_basico_id, 'Relatórios Básicos', true),
    (plano_basico_id, 'Suporte por Email', true)
  ON CONFLICT DO NOTHING;
  
  -- Features Plano Profissional
  INSERT INTO public.plan_features (plan_id, feature, is_enabled) VALUES
    (plano_prof_id, 'Cardápio Digital Completo', true),
    (plano_prof_id, 'Produtos Ilimitados', true),
    (plano_prof_id, 'PDV Completo', true),
    (plano_prof_id, 'Gestão de Funcionários', true),
    (plano_prof_id, 'Controle de Áreas e Mesas', true),
    (plano_prof_id, 'Relatórios Avançados', true),
    (plano_prof_id, 'Integração WhatsApp', true),
    (plano_prof_id, 'Suporte Prioritário', true)
  ON CONFLICT DO NOTHING;
  
  -- Features Plano Empresarial
  INSERT INTO public.plan_features (plan_id, feature, is_enabled) VALUES
    (plano_emp_id, 'Tudo do Profissional', true),
    (plano_emp_id, 'Multi-Estabelecimentos', true),
    (plano_emp_id, 'Integração iFood', true),
    (plano_emp_id, 'API Completa', true),
    (plano_emp_id, 'Customização Avançada', true),
    (plano_emp_id, 'Gerente de Conta Dedicado', true),
    (plano_emp_id, 'Suporte 24/7', true),
    (plano_emp_id, 'Treinamento Personalizado', true)
  ON CONFLICT DO NOTHING;
END $$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_pagarme_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pagarme_config_updated_at
  BEFORE UPDATE ON public.pagarme_config
  FOR EACH ROW
  EXECUTE FUNCTION update_pagarme_config_updated_at();