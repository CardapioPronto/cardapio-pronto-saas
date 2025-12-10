-- Tabela de configuração do WhatsApp AI por estabelecimento
CREATE TABLE public.whatsapp_ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DISCONNECTED' CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'CONNECTING', 'QRCODE')),
  bot_name TEXT DEFAULT 'Atendente Virtual',
  ai_persona TEXT DEFAULT 'Você é um atendente virtual simpático e profissional. Responda de forma clara e objetiva.',
  additional_instructions TEXT,
  use_menu_knowledge BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  qrcode_base64 TEXT,
  phone_connected TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(restaurant_id)
);

-- Tabela de histórico de conversas
CREATE TABLE public.whatsapp_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  config_id UUID REFERENCES public.whatsapp_ai_config(id) ON DELETE CASCADE,
  remote_jid TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  message_content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('incoming', 'outgoing')),
  is_from_ai BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_chat_history_restaurant ON public.whatsapp_chat_history(restaurant_id);
CREATE INDEX idx_chat_history_remote_jid ON public.whatsapp_chat_history(remote_jid);
CREATE INDEX idx_chat_history_created_at ON public.whatsapp_chat_history(created_at DESC);
CREATE INDEX idx_whatsapp_ai_config_restaurant ON public.whatsapp_ai_config(restaurant_id);

-- Enable RLS
ALTER TABLE public.whatsapp_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies para whatsapp_ai_config
CREATE POLICY "Users can view their restaurant's WhatsApp AI config"
ON public.whatsapp_ai_config FOR SELECT
USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can insert WhatsApp AI config for their restaurant"
ON public.whatsapp_ai_config FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can update their restaurant's WhatsApp AI config"
ON public.whatsapp_ai_config FOR UPDATE
USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can delete their restaurant's WhatsApp AI config"
ON public.whatsapp_ai_config FOR DELETE
USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Super admins can access all WhatsApp AI configs"
ON public.whatsapp_ai_config FOR ALL
USING (is_super_admin(auth.uid()));

-- RLS Policies para whatsapp_chat_history
CREATE POLICY "Users can view their restaurant's chat history"
ON public.whatsapp_chat_history FOR SELECT
USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can insert chat history for their restaurant"
ON public.whatsapp_chat_history FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Super admins can access all chat history"
ON public.whatsapp_chat_history FOR ALL
USING (is_super_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_ai_config_updated_at
BEFORE UPDATE ON public.whatsapp_ai_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime para chat_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_chat_history;