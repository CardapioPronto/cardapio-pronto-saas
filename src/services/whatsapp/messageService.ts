
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppMessage } from "./types";
import { toast } from "sonner";

export class WhatsAppMessageService {
  // Método legado - agora o envio operacional usa Atendimento WhatsApp/n8n.
  static async sendMessage(
    restaurantId: string,
    phoneNumber: string,
    message: string,
    orderId?: string
  ): Promise<boolean> {
    console.warn('WhatsApp messaging now uses Atendimento WhatsApp/n8n.');
    return false;
  }

  static formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/[\s\-()]/g, '');
    if (!cleaned.startsWith('+') && !cleaned.startsWith('55')) {
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = '55' + cleaned;
    }
    return cleaned;
  }

  static async logMessage(message: WhatsAppMessage): Promise<void> {
    try {
      const orderIdToInsert = message.order_id && this.isValidUUID(message.order_id) 
        ? message.order_id 
        : null;

      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          restaurant_id: message.restaurant_id,
          order_id: orderIdToInsert,
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

  private static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
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
