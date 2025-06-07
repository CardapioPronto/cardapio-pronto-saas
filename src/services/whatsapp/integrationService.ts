
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppIntegration } from "./types";
import { toast } from "sonner";

export class WhatsAppIntegrationService {
  static async getIntegration(restaurantId: string): Promise<WhatsAppIntegration | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_integration')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar integração WhatsApp:', error);
        return null;
      }

      if (!data) return null;

      return {
        restaurant_id: data.restaurant_id,
        phone_number: data.phone_number,
        ultramsg_instance_id: data.ultramsg_instance_id || undefined,
        ultramsg_token: data.ultramsg_token || undefined,
        api_token: data.api_token,
        webhook_url: data.webhook_url,
        is_enabled: data.is_enabled,
        auto_send_orders: data.auto_send_orders,
        welcome_message: data.welcome_message,
        order_confirmation_message: data.order_confirmation_message,
        created_at: data.created_at,
        updated_at: data.updated_at
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
          ultramsg_instance_id: integration.ultramsg_instance_id || null,
          ultramsg_token: integration.ultramsg_token || null,
          api_token: integration.api_token,
          webhook_url: integration.webhook_url,
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
