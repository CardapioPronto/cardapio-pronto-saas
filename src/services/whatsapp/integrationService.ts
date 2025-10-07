
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppIntegration } from "./types";
import { toast } from "sonner";

export class WhatsAppIntegrationService {
  static async getIntegration(restaurantId: string): Promise<WhatsAppIntegration | null> {
    try {
      const data: any = await supabase
        .from('whatsapp_integration')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();

      if (data.error && data.error.code !== 'PGRST116') {
        console.error('Erro ao buscar integração WhatsApp:', data.error);
        return null;
      }

      if (!data.data) return null;

      const record = data.data as any;

      return {
        restaurant_id: record.restaurant_id,
        phone_number: record.phone_number,
        provider: (record.provider as 'twilio' | 'ultramsg') || 'ultramsg',
        twilio_account_sid: record.twilio_account_sid || undefined,
        twilio_auth_token: record.twilio_auth_token || undefined,
        twilio_phone_number: record.twilio_phone_number || undefined,
        ultramsg_instance_id: record.ultramsg_instance_id || undefined,
        ultramsg_token: record.ultramsg_token || undefined,
        n8n_webhook_url: record.n8n_webhook_url || undefined,
        n8n_enabled: record.n8n_enabled || false,
        ai_provider: (record.ai_provider as 'chatgpt' | 'gemini') || undefined,
        ai_enabled: record.ai_enabled || false,
        ai_system_prompt: record.ai_system_prompt || undefined,
        api_token: record.api_token || undefined,
        webhook_url: record.webhook_url || undefined,
        is_enabled: record.is_enabled,
        auto_send_orders: record.auto_send_orders,
        welcome_message: record.welcome_message,
        order_confirmation_message: record.order_confirmation_message,
        created_at: record.created_at,
        updated_at: record.updated_at
      };
    } catch (error) {
      console.error('Erro ao buscar integração WhatsApp:', error);
      return null;
    }
  }

  static async saveIntegration(integration: WhatsAppIntegration): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('whatsapp_integration')
        .upsert({
          restaurant_id: integration.restaurant_id,
          phone_number: integration.phone_number,
          provider: integration.provider || 'ultramsg',
          twilio_account_sid: integration.twilio_account_sid || null,
          twilio_auth_token: integration.twilio_auth_token || null,
          twilio_phone_number: integration.twilio_phone_number || null,
          ultramsg_instance_id: integration.ultramsg_instance_id || null,
          ultramsg_token: integration.ultramsg_token || null,
          n8n_webhook_url: integration.n8n_webhook_url || null,
          n8n_enabled: integration.n8n_enabled || false,
          ai_provider: integration.ai_provider || null,
          ai_enabled: integration.ai_enabled || false,
          ai_system_prompt: integration.ai_system_prompt || null,
          api_token: integration.api_token || null,
          webhook_url: integration.webhook_url || null,
          is_enabled: integration.is_enabled,
          auto_send_orders: integration.auto_send_orders,
          welcome_message: integration.welcome_message,
          order_confirmation_message: integration.order_confirmation_message,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'restaurant_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Erro ao salvar integração WhatsApp:', error);
        toast.error('Erro ao salvar configurações do WhatsApp');
        return false;
      }

      toast.success('Configurações do WhatsApp salvas com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao salvar integração WhatsApp:', error);
      toast.error('Erro ao salvar configurações do WhatsApp');
      return false;
    }
  }
}
