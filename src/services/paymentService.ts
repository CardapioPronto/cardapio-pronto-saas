
/**
 * @deprecated Use `@/services/pagarmeSubscriptionService` para assinaturas Pagar.me
 * (Edge Functions server-side). Este módulo mantém apenas reexports legados para
 * compatibilidade; não chama a API Pagar.me no browser.
 */

export * from './payment/types';

export {
  configurePaymentService,
  getPlanName,
  getPlanPrice,
} from './payment/config';

export {
  createSubscription,
  cancelSubscription,
  getSubscriptionDetails,
  checkPaymentIntegrationStatus,
} from './payment/subscriptionService';
