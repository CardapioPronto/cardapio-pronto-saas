
import { WhatsAppIntegrationService } from "./integrationService";
import { WhatsAppMessageService } from "./messageService";
import { WhatsAppTemplateService } from "./templateService";

// Re-export all functionality from the service for backward compatibility
export class WhatsAppService {
  // Integration methods
  static getIntegration = WhatsAppIntegrationService.getIntegration;
  static saveIntegration = WhatsAppIntegrationService.saveIntegration;

  // Message methods
  static sendMessage = WhatsAppMessageService.sendMessage;
  static logMessage = WhatsAppMessageService.logMessage;
  static getMessages = WhatsAppMessageService.getMessages;

  // Template methods
  static sendOrderConfirmation = WhatsAppTemplateService.sendOrderConfirmation;
  static sendWelcomeMessage = WhatsAppTemplateService.sendWelcomeMessage;
}
