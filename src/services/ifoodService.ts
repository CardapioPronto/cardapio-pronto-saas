
// Serviço principal que exporta todas as funcionalidades de integração com iFood

// Re-exportar os tipos
export * from './ifood/types';

// Exportar funções de configuração
export { 
  loadIfoodConfig,
  saveIfoodConfig,
  configureIfoodCredentials,
  hasIfoodCredentials,
  setIfoodIntegrationEnabled,
  configureIfoodWebhook,
  configureIfoodPolling
} from './ifood/config';

// Exportar funções da API
export {
  testIfoodConnection,
  getIfoodPendingOrders,
  getIfoodOrderDetails,
  updateIfoodOrderStatus,
  processIfoodWebhookEvent
} from './ifood/api';

// Exportar funções de sincronização
export {
  syncIfoodPendingOrders,
  startIfoodSync,
  stopIfoodSync,
  updateOrderStatusInIfood
} from './ifood/syncService';
