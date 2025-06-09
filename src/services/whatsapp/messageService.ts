
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppMessage } from "./types";
import { UltraMsgService, UltraMsgCredentials } from "./ultraMsgService";
import { WhatsAppIntegrationService } from "./integrationService";
import { toast } from "sonner";

export class WhatsAppMessageService {
  static async sendMessage(
    restaurantId: string,
    phoneNumber: string,
    message: string,
    orderId?: string
  ): Promise<boolean> {
    try {
      // Buscar credenciais do restaurante
      const integration = await WhatsAppIntegrationService.getIntegration(restaurantId);
      
      if (!integration || !integration.ultramsg_instance_id || !integration.ultramsg_token) {
        console.error('Credenciais UltraMsg não configuradas para o restaurante');
        toast.error('Configure as credenciais do UltraMsg primeiro');
        return false;
      }

      // Validar número de telefone
      if (!UltraMsgService.validatePhoneNumber(phoneNumber)) {
        console.error('Número de telefone inválido:', phoneNumber);
        toast.error('Número de telefone inválido');
        return false;
      }

      const credentials: UltraMsgCredentials = {
        instanceId: integration.ultramsg_instance_id,
        token: integration.ultramsg_token
      };

      // Enviar mensagem via UltraMsg
      const result = await UltraMsgService.sendMessage(credentials, phoneNumber, message);
      
      // Registrar log da mensagem no banco
      await this.logMessage({
        restaurant_id: restaurantId,
        order_id: orderId || null,
        phone_number: phoneNumber,
        message_type: 'outgoing',
        content: message,
        status: result.sent ? 'sent' : 'failed'
      });

      if (result.sent) {
        console.log('Mensagem WhatsApp enviada com sucesso via UltraMsg');
        toast.success('Mensagem WhatsApp enviada com sucesso!');
        return true;
      } else {
        console.error('Falha no envio via UltraMsg:', result.message);
        toast.error(`Erro ao enviar mensagem: ${result.message || 'Falha desconhecida'}`);
        return false;
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      
      // Registrar log de erro
      try {
        await this.logMessage({
          restaurant_id: restaurantId,
          order_id: orderId || null,
          phone_number: phoneNumber,
          message_type: 'outgoing',
          content: message,
          status: 'failed'
        });
      } catch (logError) {
        console.error('Erro ao registrar log de erro:', logError);
      }
      
      toast.error('Erro ao enviar mensagem WhatsApp');
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
}
