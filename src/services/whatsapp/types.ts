
export interface WhatsAppIntegration {
  restaurant_id: string;
  phone_number: string;
  provider: 'twilio' | 'ultramsg';
  // Twilio credentials
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  // UltraMsg credentials (legacy)
  ultramsg_instance_id?: string;
  ultramsg_token?: string;
  // n8n integration
  n8n_webhook_url?: string;
  n8n_enabled: boolean;
  // AI integration
  ai_provider?: 'chatgpt' | 'gemini';
  ai_enabled: boolean;
  ai_system_prompt?: string;
  // General settings
  api_token?: string;
  webhook_url?: string;
  is_enabled: boolean;
  auto_send_orders: boolean;
  welcome_message: string;
  order_confirmation_message: string;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppMessage {
  id?: string;
  restaurant_id: string;
  order_id?: string | null;
  phone_number: string;
  message_type: 'incoming' | 'outgoing' | 'auto';
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  created_at?: string;
}
