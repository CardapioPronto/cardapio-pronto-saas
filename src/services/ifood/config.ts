
import { IfoodConfig, IfoodCredentials } from './types';

// Configurações padrão
export const ifoodConfig: IfoodConfig = {
  credentials: null,
  apiUrl: 'https://merchant-api.ifood.com.br',
  isEnabled: false,
  webhookUrl: null,
  pollingEnabled: true,
  pollingInterval: 60 // 60 segundos
};

export const saveIfoodConfig = (config: IfoodConfig): void => {
  const safeConfig = {
    ...config,
    credentials: config.credentials
      ? {
          clientId: config.credentials.clientId,
          clientSecret: '',
          merchantId: config.credentials.merchantId,
          restaurantId: config.credentials.restaurantId,
        }
      : null,
  };
  localStorage.setItem('ifoodConfig', JSON.stringify(safeConfig));
};

// Carregar configurações do localStorage
export const loadIfoodConfig = (): IfoodConfig => {
  const savedConfig = localStorage.getItem('ifoodConfig');
  if (savedConfig) {
    try {
      return { ...ifoodConfig, ...JSON.parse(savedConfig) };
    } catch (error) {
      console.error('Erro ao carregar configurações do iFood:', error);
    }
  }
  return ifoodConfig;
};

// Configurar credenciais do iFood
export const configureIfoodCredentials = (credentials: IfoodCredentials): void => {
  const currentConfig = loadIfoodConfig();
  saveIfoodConfig({
    ...currentConfig,
    credentials
  });
};

// Verificar se as credenciais estão configuradas
export const hasIfoodCredentials = (): boolean => {
  const config = loadIfoodConfig();
  return !!(config.credentials?.clientId && config.credentials?.merchantId);
};

// Habilitar ou desabilitar integração
export const setIfoodIntegrationEnabled = (enabled: boolean): void => {
  const currentConfig = loadIfoodConfig();
  saveIfoodConfig({
    ...currentConfig,
    isEnabled: enabled
  });
};

// Configurar webhook
export const configureIfoodWebhook = (webhookUrl: string | null): void => {
  const currentConfig = loadIfoodConfig();
  saveIfoodConfig({
    ...currentConfig,
    webhookUrl
  });
};

// Configurar polling
export const configureIfoodPolling = (enabled: boolean, interval?: number): void => {
  const currentConfig = loadIfoodConfig();
  saveIfoodConfig({
    ...currentConfig,
    pollingEnabled: enabled,
    pollingInterval: interval || currentConfig.pollingInterval
  });
};
