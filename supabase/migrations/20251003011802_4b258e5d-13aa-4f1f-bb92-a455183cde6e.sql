-- Add new columns to whatsapp_integration table for Twilio, n8n, and AI features

-- Add provider column (default to 'ultramsg' for existing records)
ALTER TABLE whatsapp_integration 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'ultramsg' CHECK (provider IN ('twilio', 'ultramsg'));

-- Add Twilio credentials columns
ALTER TABLE whatsapp_integration 
ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT,
ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;

-- Add n8n integration columns
ALTER TABLE whatsapp_integration 
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS n8n_enabled BOOLEAN DEFAULT FALSE;

-- Add AI integration columns
ALTER TABLE whatsapp_integration 
ADD COLUMN IF NOT EXISTS ai_provider TEXT CHECK (ai_provider IN ('chatgpt', 'gemini')),
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_system_prompt TEXT;

-- Create index for faster lookups by Twilio phone number
CREATE INDEX IF NOT EXISTS idx_whatsapp_integration_twilio_phone 
ON whatsapp_integration(twilio_phone_number) 
WHERE twilio_phone_number IS NOT NULL;

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Users can view their restaurant's WhatsApp integration" ON whatsapp_integration;
DROP POLICY IF EXISTS "Users can update their restaurant's WhatsApp integration" ON whatsapp_integration;
DROP POLICY IF EXISTS "Users can insert their restaurant's WhatsApp integration" ON whatsapp_integration;

CREATE POLICY "Users can view their restaurant's WhatsApp integration"
ON whatsapp_integration FOR SELECT
TO authenticated
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their restaurant's WhatsApp integration"
ON whatsapp_integration FOR UPDATE
TO authenticated
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert their restaurant's WhatsApp integration"
ON whatsapp_integration FOR INSERT
TO authenticated
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id FROM users WHERE id = auth.uid()
  )
);
