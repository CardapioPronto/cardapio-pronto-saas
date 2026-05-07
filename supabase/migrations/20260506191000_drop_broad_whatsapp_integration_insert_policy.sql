-- Remove broad insert access to WhatsApp credentials.
-- Owner-scoped INSERT policies remain in place for legitimate restaurant users.

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.whatsapp_integration;
