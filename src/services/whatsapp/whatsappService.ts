import { WhatsAppIntegrationService } from "./integrationService";
import { WhatsAppMessageService } from "./messageService";
import { WhatsAppTemplateService } from "./templateService";
import { WhatsAppTemplateManagementService } from "./templateManagementService";
import { OrderTemplateService } from "./orderTemplateService";

// Re-export all functionality from the service for backward compatibility
export class WhatsAppService {
  // Integration methods
  static getIntegration = WhatsAppIntegrationService.getIntegration;
  static saveIntegration = WhatsAppIntegrationService.saveIntegration;

  // Message methods
  static sendMessage = WhatsAppMessageService.sendMessage;
  static logMessage = WhatsAppMessageService.logMessage;
  static getMessages = WhatsAppMessageService.getMessages;

  // Template methods (legacy)
  static sendOrderConfirmation = WhatsAppTemplateService.sendOrderConfirmation;
  static sendWelcomeMessage = WhatsAppTemplateService.sendWelcomeMessage;

  // Template management methods
  static getTemplates = WhatsAppTemplateManagementService.getTemplates;
  static getTemplateByType = WhatsAppTemplateManagementService.getTemplateByType;
  static createTemplate = WhatsAppTemplateManagementService.createTemplate;
  static updateTemplate = WhatsAppTemplateManagementService.updateTemplate;
  static deleteTemplate = WhatsAppTemplateManagementService.deleteTemplate;
  static createDefaultTemplates = WhatsAppTemplateManagementService.createDefaultTemplates;
  static processTemplateVariables = WhatsAppTemplateManagementService.processTemplateVariables;
  static sendTemplateMessage = WhatsAppTemplateManagementService.sendTemplateMessage;

  // Order template methods
  static sendOrderConfirmed = OrderTemplateService.sendOrderConfirmed;
  static sendOrderPreparing = OrderTemplateService.sendOrderPreparing;
  static sendOrderReady = OrderTemplateService.sendOrderReady;
  static sendOrderCancelled = OrderTemplateService.sendOrderCancelled;
  static sendOrderDelivered = OrderTemplateService.sendOrderDelivered;
  static sendOrderStatusMessage = OrderTemplateService.sendOrderStatusMessage;
}
