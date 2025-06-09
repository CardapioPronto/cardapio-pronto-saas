
import { WhatsAppIntegrationService } from "./integrationService";
import { WhatsAppMessageService } from "./messageService";

export class WhatsAppTemplateService {
  static async sendOrderConfirmation(
    restaurantId: string,
    phoneNumber: string,
    orderId: string
  ): Promise<boolean> {
    try {
      const integration = await WhatsAppIntegrationService.getIntegration(restaurantId);
      
      if (!integration || !integration.is_enabled || !integration.auto_send_orders) {
        console.log('Integração WhatsApp não habilitada ou envio automático desabilitado');
        return false;
      }

      const message = integration.order_confirmation_message;
      return await WhatsAppMessageService.sendMessage(restaurantId, phoneNumber, message, orderId);
    } catch (error) {
      console.error('Erro ao enviar confirmação de pedido:', error);
      return false;
    }
  }

  static async sendWelcomeMessage(
    restaurantId: string,
    phoneNumber: string
  ): Promise<boolean> {
    try {
      const integration = await WhatsAppIntegrationService.getIntegration(restaurantId);
      
      if (!integration || !integration.is_enabled) {
        console.log('Integração WhatsApp não habilitada');
        return false;
      }

      const message = integration.welcome_message;
      return await WhatsAppMessageService.sendMessage(restaurantId, phoneNumber, message);
    } catch (error) {
      console.error('Erro ao enviar mensagem de boas-vindas:', error);
      return false;
    }
  }
}
