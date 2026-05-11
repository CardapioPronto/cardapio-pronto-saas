
import { PagarmeConfig } from './types';
import { createLogger } from '@/lib/log';

const log = createLogger('pagarme');

// Configuração de ambiente. `debug` segue o modo do build: em produção fica
// desligado por padrão para evitar logs sensíveis de pagamento no console.
export const config: PagarmeConfig = {
  apiKey: 'test_api_key',
  isLive: false,
  apiUrl: 'https://api.pagar.me/core/v5',
  debug: import.meta.env.DEV,
};

// Funções auxiliares para obter informações de plano
export const getPlanName = (planId: string): string => {
  switch (planId) {
    case 'premium': return 'Premium';
    case 'standard': return 'Padrão';
    default: return 'Básico';
  }
};

export const getPlanPrice = (planId: string, billingType: 'monthly' | 'yearly'): number => {
  let basePrice: number;
  
  switch (planId) {
    case 'premium': basePrice = 149.90; break;
    case 'standard': basePrice = 99.90; break; 
    default: basePrice = 49.90;
  }
  
  return billingType === 'yearly' ? basePrice * 10 : basePrice;
};

// Configurar as chaves de API
export const configurePaymentService = (apiKey: string, isLive = false) => {
  config.apiKey = apiKey;
  config.isLive = isLive;
  log.debug('configurado', { ambiente: isLive ? 'producao' : 'homologacao' });
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Função para fazer requisições à API do Pagar.me
export const pagarmeRequest = async <T = unknown>(endpoint: string, method: string, data?: unknown): Promise<T> => {
  try {
    const url = `${config.apiUrl}/${endpoint}`;
    
    if (config.debug) {
      log.debug('request', { method, endpoint, hasData: !!data });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(config.apiKey + ':')}`,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData: unknown = await response.json();

    if (config.debug) {
      log.debug('response', { status: response.status });
    }

    if (!response.ok) {
      const message = isRecord(responseData) && typeof responseData.message === 'string'
        ? responseData.message
        : response.statusText;
      throw new Error(`Erro na API Pagar.me: ${message}`);
    }

    return responseData as T;
  } catch (error) {
    log.capture(error, { endpoint, method });
    throw error;
  }
};
