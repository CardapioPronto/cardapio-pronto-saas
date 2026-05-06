-- Professional email operations foundation: templates, send logs, webhook events,
-- contacts and campaign scaffolding.

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'transactional',
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT email_templates_category_check CHECK (category IN ('transactional', 'operational', 'marketing')),
  CONSTRAINT email_templates_scope_unique UNIQUE NULLS NOT DISTINCT (restaurant_id, template_key)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_templates_restaurant
  ON public.email_templates(restaurant_id, category);

DROP POLICY IF EXISTS "Super admins can manage global email templates" ON public.email_templates;
CREATE POLICY "Super admins can manage global email templates"
ON public.email_templates FOR ALL
TO authenticated
USING (restaurant_id IS NULL AND public.is_super_admin(auth.uid()))
WITH CHECK (restaurant_id IS NULL AND public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Restaurant staff can view own email templates" ON public.email_templates;
CREATE POLICY "Restaurant staff can view own email templates"
ON public.email_templates FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR (restaurant_id IS NULL AND public.is_super_admin(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Restaurant staff can manage own email templates" ON public.email_templates;
CREATE POLICY "Restaurant staff can manage own email templates"
ON public.email_templates FOR ALL
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.email_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  template_key text,
  email_type text NOT NULL DEFAULT 'transactional',
  context_type text,
  context_id uuid,
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  recipient_email text NOT NULL,
  recipient_name text,
  from_email text,
  from_name text,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  diagnostic_status text,
  diagnostic_message text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_event_at timestamp with time zone,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  bounced_at timestamp with time zone,
  complained_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_send_logs_type_check CHECK (email_type IN ('transactional', 'operational', 'marketing', 'test')),
  CONSTRAINT email_send_logs_status_check CHECK (
    status IN ('queued', 'sent', 'delivered', 'delivery_delayed', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'canceled')
  )
);

ALTER TABLE public.email_send_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_send_logs_restaurant_created
  ON public.email_send_logs(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_provider_message
  ON public.email_send_logs(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_context
  ON public.email_send_logs(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_status
  ON public.email_send_logs(status);

DROP POLICY IF EXISTS "Super admins can view all email logs" ON public.email_send_logs;
CREATE POLICY "Super admins can view all email logs"
ON public.email_send_logs FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Restaurant staff can view own email logs" ON public.email_send_logs;
CREATE POLICY "Restaurant staff can view own email logs"
ON public.email_send_logs FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

CREATE TRIGGER update_email_send_logs_updated_at
BEFORE UPDATE ON public.email_send_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.email_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  svix_id text UNIQUE,
  provider text NOT NULL DEFAULT 'resend',
  event_type text NOT NULL,
  provider_message_id text,
  email_log_id uuid REFERENCES public.email_send_logs(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_webhook_events_message
  ON public.email_webhook_events(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_email_webhook_events_created
  ON public.email_webhook_events(created_at DESC);

DROP POLICY IF EXISTS "Super admins can view email webhook events" ON public.email_webhook_events;
CREATE POLICY "Super admins can view email webhook events"
ON public.email_webhook_events FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.restaurant_email_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  phone text,
  source text NOT NULL DEFAULT 'manual',
  accepts_marketing boolean NOT NULL DEFAULT false,
  unsubscribed_at timestamp with time zone,
  last_order_id uuid,
  last_order_at timestamp with time zone,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_email_contacts_email_check CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT restaurant_email_contacts_unique UNIQUE (restaurant_id, email)
);

ALTER TABLE public.restaurant_email_contacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_restaurant_email_contacts_restaurant
  ON public.restaurant_email_contacts(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restaurant_email_contacts_marketing
  ON public.restaurant_email_contacts(restaurant_id, accepts_marketing)
  WHERE accepts_marketing = true AND unsubscribed_at IS NULL;

DROP POLICY IF EXISTS "Restaurant staff can manage own email contacts" ON public.restaurant_email_contacts;
CREATE POLICY "Restaurant staff can manage own email contacts"
ON public.restaurant_email_contacts FOR ALL
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

CREATE TRIGGER update_restaurant_email_contacts_updated_at
BEFORE UPDATE ON public.restaurant_email_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_campaigns_status_check CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'canceled', 'failed'))
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_campaigns_restaurant
  ON public.email_campaigns(restaurant_id, created_at DESC);

DROP POLICY IF EXISTS "Restaurant staff can manage own email campaigns" ON public.email_campaigns;
CREATE POLICY "Restaurant staff can manage own email campaigns"
ON public.email_campaigns FOR ALL
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

CREATE TRIGGER update_email_campaigns_updated_at
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS customer_email text;

CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer_email
  ON public.delivery_orders(restaurant_id, customer_email)
  WHERE customer_email IS NOT NULL;

INSERT INTO public.email_templates (
  restaurant_id,
  template_key,
  name,
  description,
  category,
  subject,
  html_content,
  text_content,
  variables,
  is_system
)
VALUES
(
  NULL,
  'contact_notification',
  'Notificação interna de contato',
  'Aviso para destinatários administrativos quando alguém envia o formulário de contato.',
  'operational',
  'Nova mensagem de contato: {{subject}}',
  '<h2>Nova mensagem de contato</h2><p><strong>Nome:</strong> {{name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Telefone:</strong> {{phone}}</p><p><strong>Assunto:</strong> {{subject}}</p><hr><p style="white-space:pre-wrap">{{message}}</p>',
  'Nova mensagem de contato de {{name}} ({{email}}): {{message}}',
  '["name","email","phone","subject","message"]'::jsonb,
  true
),
(
  NULL,
  'contact_confirmation',
  'Confirmação de contato recebido',
  'Confirma ao visitante que a mensagem foi recebida.',
  'transactional',
  'Recebemos sua mensagem!',
  '<h2>Mensagem recebida com sucesso!</h2><p>Olá {{name}},</p><p>Recebemos sua mensagem e entraremos em contato o mais breve possível.</p><p><strong>Assunto:</strong> {{subject}}</p><p style="white-space:pre-wrap">{{message}}</p><p>Atenciosamente,<br><strong>Equipe Pubfy</strong></p>',
  'Olá {{name}}, recebemos sua mensagem sobre {{subject}} e entraremos em contato em breve.',
  '["name","subject","message"]'::jsonb,
  true
),
(
  NULL,
  'order_confirmation',
  'Confirmação de pedido do cardápio',
  'Confirma ao cliente final que o pedido entrou no painel do restaurante.',
  'transactional',
  'Pedido {{order_number}} recebido',
  '<h2>Pedido recebido</h2><p>Olá {{customer_name}},</p><p>Seu pedido {{order_number}} foi enviado para <strong>{{restaurant_name}}</strong>.</p><p><strong>Total:</strong> {{total}}</p><p><strong>Status:</strong> recebido.</p><p><a href="{{tracking_url}}">Acompanhar pedido</a></p>',
  'Olá {{customer_name}}, seu pedido {{order_number}} foi enviado para {{restaurant_name}}. Acompanhe: {{tracking_url}}',
  '["customer_name","order_number","restaurant_name","total","tracking_url"]'::jsonb,
  true
),
(
  NULL,
  'subscription_created',
  'Assinatura criada',
  'Confirma contratação ou atualização de assinatura do Pubfy.',
  'transactional',
  'Assinatura Pubfy ativada',
  '<h2>Assinatura ativada</h2><p>Olá {{customer_name}},</p><p>Sua assinatura do plano <strong>{{plan_name}}</strong> foi criada com sucesso.</p><p>Status: {{status}}</p>',
  'Olá {{customer_name}}, sua assinatura do plano {{plan_name}} foi criada. Status: {{status}}.',
  '["customer_name","plan_name","status"]'::jsonb,
  true
),
(
  NULL,
  'subscription_receipt',
  'Comprovante de assinatura',
  'Envia resumo de cobrança/recibo de assinatura.',
  'transactional',
  'Comprovante Pubfy - {{plan_name}}',
  '<h2>Comprovante de assinatura</h2><p>Plano: <strong>{{plan_name}}</strong></p><p>Valor: {{amount}}</p><p>Status: {{status}}</p><p>Data: {{paid_at}}</p>',
  'Comprovante Pubfy: {{plan_name}}, {{amount}}, status {{status}}, data {{paid_at}}.',
  '["plan_name","amount","status","paid_at"]'::jsonb,
  true
),
(
  NULL,
  'campaign_basic',
  'Campanha simples',
  'Modelo inicial para campanhas comerciais do restaurante.',
  'marketing',
  '{{restaurant_name}} tem novidades para você',
  '<h2>{{title}}</h2><p>{{message}}</p><p><strong>{{coupon}}</strong></p>',
  '{{title}} - {{message}} {{coupon}}',
  '["restaurant_name","title","message","coupon"]'::jsonb,
  true
)
ON CONFLICT (restaurant_id, template_key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  variables = EXCLUDED.variables,
  is_system = true,
  updated_at = now();
