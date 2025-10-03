
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppMessage } from "./types";
import { UltraMsgService, UltraMsgCredentials } from "./ultraMsgService";
import { TwilioService, TwilioCredentials } from "./twilioService";
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
      const integration = await WhatsAppIntegrationService.getIntegration(restaurantId);
      
      if (!integration) {
        console.error('Integração WhatsApp não configurada');
        toast.error('Configure a integração WhatsApp primeiro');
        return false;
      }

      const provider = integration.provider || 'ultramsg';
      let result: { success?: boolean; sent?: boolean; error?: string; message?: string } = {};

      if (provider === 'twilio') {
        // Validar credenciais Twilio
        if (!integration.twilio_account_sid || !integration.twilio_auth_token || !integration.twilio_phone_number) {
          console.error('Credenciais Twilio não configuradas');
          toast.error('Configure as credenciais do Twilio primeiro');
          return false;
        }

        if (!TwilioService.validatePhoneNumber(phoneNumber)) {
          console.error('Número de telefone inválido:', phoneNumber);
          toast.error('Número de telefone inválido');
          return false;
        }

        const credentials: TwilioCredentials = {
          accountSid: integration.twilio_account_sid,
          authToken: integration.twilio_auth_token,
          phoneNumber: integration.twilio_phone_number
        };

        result = await TwilioService.sendMessage(credentials, phoneNumber, message);

      } else {
        // Legacy UltraMsg support
        if (!integration.ultramsg_instance_id || !integration.ultramsg_token) {
          console.error('Credenciais UltraMsg não configuradas');
          toast.error('Configure as credenciais do UltraMsg primeiro');
          return false;
        }

        if (!UltraMsgService.validatePhoneNumber(phoneNumber)) {
          console.error('Número de telefone inválido:', phoneNumber);
          toast.error('Número de telefone inválido');
          return false;
        }

        const credentials: UltraMsgCredentials = {
          instanceId: integration.ultramsg_instance_id,
          token: integration.ultramsg_token
        };

        result = await UltraMsgService.sendMessage(credentials, phoneNumber, message);
      }
      
      const success = result.success || result.sent || false;

      // Log message
      await this.logMessage({
        restaurant_id: restaurantId,
        order_id: orderId || null,
        phone_number: phoneNumber,
        message_type: 'outgoing',
        content: message,
        status: success ? 'sent' : 'failed'
      });

      if (success) {
        console.log(`Mensagem WhatsApp enviada com sucesso via ${provider}`);
        toast.success('Mensagem WhatsApp enviada com sucesso!');
        return true;
      } else {
        const errorMsg = result.error || result.message || 'Falha desconhecida';
        console.error(`Falha no envio via ${provider}:`, errorMsg);
        toast.error(`Erro ao enviar mensagem: ${errorMsg}`);
        return false;
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      
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
