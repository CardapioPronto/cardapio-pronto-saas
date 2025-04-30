
// Arquivo principal que exporta todas as funções do serviço de pagamento
// Este arquivo serve como ponto de entrada para o serviço

// Re-exportar os tipos
export * from './payment/types';

// Exportar funções de configuração
export { 
  configurePaymentService,
  getPlanName,
  getPlanPrice
} from './payment/config';

// Exportar funções de assinatura
export {
  createSubscription,
  cancelSubscription,
  getSubscriptionDetails,
  checkPaymentIntegrationStatus
} from './payment/subscriptionService';
