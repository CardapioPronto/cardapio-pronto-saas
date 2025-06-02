
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppIntegration, WhatsAppMessage } from "./types";
import { toast } from "sonner";

export class WhatsAppService {
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

  static async sendMessage(
    restaurantId: string,
    phoneNumber: string,
    message: string,
    orderId?: string
  ): Promise<boolean> {
    try {
      await this.logMessage({
        restaurant_id: restaurantId,
        order_id: orderId || null,
        phone_number: phoneNumber,
        message_type: 'outgoing',
        content: message,
        status: 'sent'
      });

      console.log('Enviando mensagem WhatsApp:', {
        to: phoneNumber,
        message,
        restaurantId,
        orderId
      });

      const { error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          restaurantId,
          phoneNumber,
          message,
          orderId
        }
      });

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      return false;
    }
  }

  static async logMessage(message: WhatsAppMessage): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          restaurant_id: message.restaurant_id,
          order_id: message.order_id,
          phone_number: message.phone_number,
          message_type: message.message_type,
          content: message.content,
          status: message.status
        });

      if (error) {
        console.error('Erro ao registrar mensagem:', error);
      }
    } catch (error) {
      console.error('Erro ao registrar mensagem:', error);
    }
  }

  static async getMessages(restaurantId: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        return [];
      }

      return data?.map(msg => ({
        id: msg.id,
        restaurant_id: msg.restaurant_id,
        order_id: msg.order_id,
        phone_number: msg.phone_number,
        message_type: msg.message_type as 'incoming' | 'outgoing' | 'auto',
        content: msg.content,
        status: msg.status as 'sent' | 'delivered' | 'read' | 'failed',
        created_at: msg.created_at
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  static async sendOrderConfirmation(
    restaurantId: string,
    phoneNumber: string,
    orderId: string
  ): Promise<boolean> {
    try {
      const integration = await this.getIntegration(restaurantId);
      
      if (!integration || !integration.is_enabled || !integration.auto_send_orders) {
        return false;
      }

      const message = integration.order_confirmation_message;
      return await this.sendMessage(restaurantId, phoneNumber, message, orderId);
    } catch (error) {
      console.error('Erro ao enviar confirmação de pedido:', error);
      return false;
    }
  }
}
