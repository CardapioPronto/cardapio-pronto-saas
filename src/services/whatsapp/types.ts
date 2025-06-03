
export interface WhatsAppIntegration {
  restaurant_id: string;
  phone_number: string;
  api_token?: string | null;
  webhook_url?: string | null;
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

export interface WhatsAppWebhookPayload {
  from: string;
  body: string;
  timestamp: string;
}
