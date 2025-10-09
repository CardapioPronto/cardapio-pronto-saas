-- Tabela para armazenar mensagens de contato
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Tabela para armazenar emails destinatários
CREATE TABLE public.contact_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_recipients ENABLE ROW LEVEL SECURITY;

-- Policies para contact_messages
CREATE POLICY "Anyone can insert contact messages"
ON public.contact_messages
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Super admins can view all contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update contact messages"
ON public.contact_messages
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete contact messages"
ON public.contact_messages
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Policies para contact_recipients
CREATE POLICY "Super admins can manage recipients"
ON public.contact_recipients
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- Criar índices
CREATE INDEX idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX idx_contact_recipients_active ON public.contact_recipients(is_active) WHERE is_active = true;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_contact_recipients_updated_at
BEFORE UPDATE ON public.contact_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();