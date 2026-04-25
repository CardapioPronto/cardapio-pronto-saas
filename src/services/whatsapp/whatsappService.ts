import { WhatsAppIntegrationService } from "./integrationService";
import { WhatsAppMessageService } from "./messageService";
import { WhatsAppTemplateService } from "./templateService";

export class WhatsAppService {
  static getIntegration = WhatsAppIntegrationService.getIntegration;
  static saveIntegration = WhatsAppIntegrationService.saveIntegration;

  static sendMessage = WhatsAppMessageService.sendMessage;
  static logMessage = WhatsAppMessageService.logMessage;
  static getMessages = WhatsAppMessageService.getMessages;

  static sendOrderConfirmation = WhatsAppTemplateService.sendOrderConfirmation;
  static sendWelcomeMessage = WhatsAppTemplateService.sendWelcomeMessage;
}
