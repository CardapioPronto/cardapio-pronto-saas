
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppIntegration, WhatsAppMessage } from "./types";
import { toast } from "sonner";

export class WhatsAppService {
  // Obter configurações do WhatsApp do restaurante
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

      return data;
    } catch (error) {
      console.error('Erro ao buscar integração WhatsApp:', error);
      return null;
    }
  }

  // Salvar/atualizar configurações do WhatsApp
  static async saveIntegration(integration: Partial<WhatsAppIntegration>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('whatsapp_integration')
        .upsert(integration, { 
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

  // Enviar mensagem via WhatsApp (simulação)
  static async sendMessage(
    restaurantId: string,
    phoneNumber: string,
    message: string,
    orderId?: string
  ): Promise<boolean> {
    try {
      // Registrar a mensagem no histórico
      await this.logMessage({
        restaurant_id: restaurantId,
        order_id: orderId,
        phone_number: phoneNumber,
        message_type: 'outgoing',
        content: message,
        status: 'sent'
      });

      // Aqui você integraria com uma API real do WhatsApp
      // Por exemplo: WhatsApp Business API, Twilio, etc.
      console.log('Enviando mensagem WhatsApp:', {
        to: phoneNumber,
        message,
        restaurantId,
        orderId
      });

      // Simular envio via edge function
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

  // Registrar mensagem no histórico
  static async logMessage(message: Partial<WhatsAppMessage>): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert(message);

      if (error) {
        console.error('Erro ao registrar mensagem:', error);
      }
    } catch (error) {
      console.error('Erro ao registrar mensagem:', error);
    }
  }

  // Buscar histórico de mensagens
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

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  // Enviar confirmação de pedido automaticamente
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
