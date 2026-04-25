export type EvolutionAction =
  | "create"
  | "connect"
  | "status"
  | "disconnect"
  | "delete"
  | "qrcode"
  | "send";

export interface EvolutionResponse {
  success: boolean;
  data?: any;
  error?: string;
  qrcode?: string;
  status?: string;
  [key: string]: any;
}

export interface WhatsAppAIConfig {
  id: string;
  restaurant_id: string;
  instance_name: string;
  status: string;
  active?: boolean | null;
  bot_name?: string | null;
  ai_persona?: string | null;
  additional_instructions?: string | null;
  use_menu_knowledge?: boolean | null;
  phone_connected?: string | null;
  qrcode_base64?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type CreateWhatsAppAIConfig = Omit<
  WhatsAppAIConfig,
  "id" | "created_at" | "updated_at"
>;

export type UpdateWhatsAppAIConfig = Partial<
  Omit<WhatsAppAIConfig, "id" | "restaurant_id" | "created_at" | "updated_at">
>;

export interface WhatsAppChatMessage {
  id: string;
  restaurant_id: string;
  config_id?: string | null;
  remote_jid: string;
  customer_phone: string;
  customer_name?: string | null;
  message_content: string;
  message_type: string;
  is_from_ai?: boolean | null;
  created_at?: string | null;
}

export interface ChatConversation {
  remote_jid: string;
  customer_phone: string;
  customer_name?: string | null;
  messages: WhatsAppChatMessage[];
  last_message_at?: string | null;
  last_message_preview?: string;
}
