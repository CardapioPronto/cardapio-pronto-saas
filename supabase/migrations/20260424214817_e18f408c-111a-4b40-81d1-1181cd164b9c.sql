
-- Add retry/failure tracking columns to delivery_orders
ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS whatsapp_send_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_last_error text,
  ADD COLUMN IF NOT EXISTS whatsapp_last_attempt_at timestamptz;
