export type WhatsAppAIStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QRCODE';

export interface WhatsAppAIConfig {
  id: string;
  restaurant_id: string;
  instance_name: string;
  status: WhatsAppAIStatus;
  bot_name: string;
  ai_persona: string;
  additional_instructions: string | null;
  use_menu_knowledge: boolean;
  active: boolean;
  qrcode_base64: string | null;
  phone_connected: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppChatMessage {
  id: string;
  restaurant_id: string;
  config_id: string | null;
  remote_jid: string;
  customer_name: string | null;
  customer_phone: string;
  message_content: string;
  message_type: 'incoming' | 'outgoing';
  is_from_ai: boolean;
  created_at: string;
}

export interface CreateWhatsAppAIConfig {
  restaurant_id: string;
  instance_name: string;
  bot_name?: string;
  ai_persona?: string;
  additional_instructions?: string;
  use_menu_knowledge?: boolean;
}

export interface UpdateWhatsAppAIConfig {
  bot_name?: string;
  ai_persona?: string;
  additional_instructions?: string;
  use_menu_knowledge?: boolean;
  active?: boolean;
}

export type EvolutionAction = 
  | 'create_instance' 
  | 'connect' 
  | 'get_qrcode' 
  | 'disconnect' 
  | 'delete_instance' 
  | 'get_status'
  | 'set_webhook';

export interface EvolutionResponse {
  instance?: {
    instanceName: string;
    status: string;
    phoneConnected?: string;
  };
  base64?: string;
  state?: string;
  error?: string;
}

export interface ChatConversation {
  remoteJid: string;
  customerPhone: string;
  customerName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: WhatsAppChatMessage[];
}