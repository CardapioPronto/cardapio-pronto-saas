
-- Add whatsapp_manage permission type
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'whatsapp_manage';

-- WhatsApp Instances (multi-instance per restaurant)
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  phone_number text,
  status text NOT NULL DEFAULT 'DISCONNECTED',
  qrcode_base64 text,
  evolution_instance_id text,
  webhook_url text,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Instance Events Log
CREATE TABLE public.whatsapp_instance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Conversation Threads
CREATE TABLE public.conversation_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  remote_jid text NOT NULL,
  customer_phone text NOT NULL,
  customer_name text,
  status text NOT NULL DEFAULT 'bot_active',
  assigned_to uuid,
  unread_count integer DEFAULT 0,
  last_message_at timestamptz,
  last_message_preview text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversation Messages
CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  sender_type text NOT NULL,
  sender_id uuid,
  content text NOT NULL,
  message_type text DEFAULT 'text',
  media_url text,
  is_internal boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Conversation Assignments
CREATE TABLE public.conversation_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL,
  assigned_by uuid,
  action text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Conversation Notes
CREATE TABLE public.conversation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Automation Settings (per instance)
CREATE TABLE public.automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE UNIQUE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ai_enabled boolean DEFAULT true,
  ai_persona text DEFAULT 'Você é um atendente virtual simpático e profissional.',
  bot_name text DEFAULT 'Atendente Virtual',
  welcome_message text DEFAULT 'Olá! Como posso ajudá-lo?',
  use_menu_knowledge boolean DEFAULT true,
  auto_handoff_enabled boolean DEFAULT false,
  auto_handoff_confidence_threshold numeric DEFAULT 0.3,
  business_hours_only boolean DEFAULT false,
  business_hours jsonb,
  additional_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Handoff Rules
CREATE TABLE public.ai_handoff_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rule_type text NOT NULL,
  rule_value text,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_handoff_rules ENABLE ROW LEVEL SECURITY;

-- RLS: whatsapp_instances
CREATE POLICY "Users can view their restaurant instances" ON public.whatsapp_instances FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Users can insert instances to their restaurant" ON public.whatsapp_instances FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Users can update their restaurant instances" ON public.whatsapp_instances FOR UPDATE USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Users can delete their restaurant instances" ON public.whatsapp_instances FOR DELETE USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Super admins can access all instances" ON public.whatsapp_instances FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS: whatsapp_instance_events
CREATE POLICY "Users can view their restaurant instance events" ON public.whatsapp_instance_events FOR SELECT USING (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE restaurant_id = public.get_user_restaurant_id()));
CREATE POLICY "Users can insert instance events" ON public.whatsapp_instance_events FOR INSERT WITH CHECK (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE restaurant_id = public.get_user_restaurant_id()));
CREATE POLICY "Super admins can access all instance events" ON public.whatsapp_instance_events FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS: conversation_threads
CREATE POLICY "Users can view their restaurant threads" ON public.conversation_threads FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Users can insert threads to their restaurant" ON public.conversation_threads FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Users can update their restaurant threads" ON public.conversation_threads FOR UPDATE USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Super admins can access all threads" ON public.conversation_threads FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS: conversation_messages
CREATE POLICY "Users can view their restaurant messages" ON public.conversation_messages FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Users can insert messages to their restaurant" ON public.conversation_messages FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Super admins can access all messages" ON public.conversation_messages FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS: conversation_assignments
CREATE POLICY "Users can view their restaurant assignments" ON public.conversation_assignments FOR SELECT USING (thread_id IN (SELECT id FROM public.conversation_threads WHERE restaurant_id = public.get_user_restaurant_id()));
CREATE POLICY "Users can insert assignments" ON public.conversation_assignments FOR INSERT WITH CHECK (thread_id IN (SELECT id FROM public.conversation_threads WHERE restaurant_id = public.get_user_restaurant_id()));
CREATE POLICY "Super admins can access all assignments" ON public.conversation_assignments FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS: conversation_notes
CREATE POLICY "Users can view their restaurant notes" ON public.conversation_notes FOR SELECT USING (thread_id IN (SELECT id FROM public.conversation_threads WHERE restaurant_id = public.get_user_restaurant_id()));
CREATE POLICY "Users can insert notes" ON public.conversation_notes FOR INSERT WITH CHECK (thread_id IN (SELECT id FROM public.conversation_threads WHERE restaurant_id = public.get_user_restaurant_id()));
CREATE POLICY "Users can update their own notes" ON public.conversation_notes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own notes" ON public.conversation_notes FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Super admins can access all notes" ON public.conversation_notes FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS: automation_settings
CREATE POLICY "Users can view their restaurant automation" ON public.automation_settings FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Users can insert automation for their restaurant" ON public.automation_settings FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Users can update their restaurant automation" ON public.automation_settings FOR UPDATE USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Super admins can access all automation" ON public.automation_settings FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS: ai_handoff_rules
CREATE POLICY "Users can view their restaurant handoff rules" ON public.ai_handoff_rules FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Users can insert handoff rules" ON public.ai_handoff_rules FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Users can update their restaurant handoff rules" ON public.ai_handoff_rules FOR UPDATE USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Users can delete their restaurant handoff rules" ON public.ai_handoff_rules FOR DELETE USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "Super admins can access all handoff rules" ON public.ai_handoff_rules FOR ALL USING (public.is_super_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversation_threads_updated_at BEFORE UPDATE ON public.conversation_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_automation_settings_updated_at BEFORE UPDATE ON public.automation_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_handoff_rules_updated_at BEFORE UPDATE ON public.ai_handoff_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversation_notes_updated_at BEFORE UPDATE ON public.conversation_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages and threads
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_threads;
