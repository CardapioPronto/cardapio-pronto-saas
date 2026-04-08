export type InstanceStatus = 'CREATED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export type ThreadStatus = 'bot_active' | 'waiting_human' | 'human_active' | 'closed';

export type SenderType = 'customer' | 'bot' | 'human';

export type AssignmentAction = 'assigned' | 'released' | 'transferred';

export type HandoffRuleType = 'keyword' | 'low_confidence' | 'customer_request' | 'timeout';

export interface WhatsAppInstance {
  id: string;
  restaurant_id: string;
  instance_name: string;
  phone_number: string | null;
  status: InstanceStatus;
  qrcode_base64: string | null;
  evolution_instance_id: string | null;
  webhook_url: string | null;
  is_active: boolean;
  automation_enabled: boolean;
  last_connection_update_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InstanceEvent {
  id: string;
  instance_id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface ConversationThread {
  id: string;
  restaurant_id: string;
  instance_id: string;
  remote_jid: string;
  customer_phone: string;
  customer_name: string | null;
  status: ThreadStatus;
  assigned_to: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  thread_id: string;
  restaurant_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  content: string;
  message_type: string;
  media_url: string | null;
  is_internal: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ConversationAssignment {
  id: string;
  thread_id: string;
  assigned_to: string;
  assigned_by: string | null;
  action: AssignmentAction;
  notes: string | null;
  created_at: string;
}

export interface ConversationNote {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationSettings {
  id: string;
  instance_id: string;
  restaurant_id: string;
  ai_enabled: boolean;
  ai_persona: string;
  bot_name: string;
  welcome_message: string;
  use_menu_knowledge: boolean;
  auto_handoff_enabled: boolean;
  auto_handoff_confidence_threshold: number;
  business_hours_only: boolean;
  business_hours: Record<string, unknown> | null;
  additional_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIHandoffRule {
  id: string;
  instance_id: string;
  restaurant_id: string;
  rule_type: HandoffRuleType;
  rule_value: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CreateInstanceInput {
  instance_name: string;
  restaurant_id: string;
  created_by: string;
}

export interface UpdateAutomationInput {
  ai_enabled?: boolean;
  ai_persona?: string;
  bot_name?: string;
  welcome_message?: string;
  use_menu_knowledge?: boolean;
  auto_handoff_enabled?: boolean;
  auto_handoff_confidence_threshold?: number;
  business_hours_only?: boolean;
  business_hours?: Record<string, unknown> | null;
  additional_instructions?: string | null;
}
