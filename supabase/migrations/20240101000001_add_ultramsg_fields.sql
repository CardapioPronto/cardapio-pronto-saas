
-- Adicionar campos para credenciais UltraMsg na tabela whatsapp_integration
ALTER TABLE whatsapp_integration 
ADD COLUMN IF NOT EXISTS ultramsg_instance_id TEXT,
ADD COLUMN IF NOT EXISTS ultramsg_token TEXT;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_integration_restaurant_id ON whatsapp_integration(restaurant_id);
