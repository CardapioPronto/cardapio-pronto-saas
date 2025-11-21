-- Criar tabela de templates de mensagens WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN ('order_confirmed', 'order_preparing', 'order_ready', 'order_cancelled', 'order_delivered', 'custom')),
  template_name TEXT NOT NULL,
  message_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  variables JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, template_type, template_name)
);

-- Índices para melhor performance
CREATE INDEX idx_whatsapp_templates_restaurant ON public.whatsapp_message_templates(restaurant_id);
CREATE INDEX idx_whatsapp_templates_type ON public.whatsapp_message_templates(template_type);
CREATE INDEX idx_whatsapp_templates_active ON public.whatsapp_message_templates(is_active);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver templates do seu restaurante
CREATE POLICY "Users can view their restaurant templates"
  ON public.whatsapp_message_templates
  FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());

-- Usuários podem inserir templates no seu restaurante
CREATE POLICY "Users can insert templates to their restaurant"
  ON public.whatsapp_message_templates
  FOR INSERT
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- Usuários podem atualizar templates do seu restaurante
CREATE POLICY "Users can update their restaurant templates"
  ON public.whatsapp_message_templates
  FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id());

-- Usuários podem deletar templates do seu restaurante
CREATE POLICY "Users can delete their restaurant templates"
  ON public.whatsapp_message_templates
  FOR DELETE
  USING (restaurant_id = get_user_restaurant_id());

-- Super admins podem fazer tudo
CREATE POLICY "Super admins can access all templates"
  ON public.whatsapp_message_templates
  FOR ALL
  USING (is_super_admin(auth.uid()));

-- Inserir templates padrão (exemplo)
-- Estes serão criados automaticamente quando um restaurante configurar WhatsApp
COMMENT ON TABLE public.whatsapp_message_templates IS 'Templates de mensagens WhatsApp personalizáveis para eventos de pedidos';