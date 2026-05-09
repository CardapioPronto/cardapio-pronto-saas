
import { PagarmeConfig } from './types';

// Configuração de ambiente
export const config: PagarmeConfig = {
  apiKey: 'test_api_key', // Default value
  isLive: false,          // Default to sandbox environment
  apiUrl: 'https://api.pagar.me/core/v5',
  debug: true // Habilita logs detalhados para depuração
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
  console.log(`Pagar.me configurado: ${isLive ? 'Produção' : 'Homologação'}`);
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Função para fazer requisições à API do Pagar.me
export const pagarmeRequest = async <T = unknown>(endpoint: string, method: string, data?: unknown): Promise<T> => {
  try {
    const url = `${config.apiUrl}/${endpoint}`;
    
    if (config.debug) {
      console.log(`[Pagar.me] Requisição ${method} para ${endpoint}`);
      console.log(`[Pagar.me] Dados:`, data ? JSON.stringify(data).substring(0, 100) + '...' : 'Nenhum');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(config.apiKey + ':')}`
    };
    
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined
    });
    
    const responseData: unknown = await response.json();
    
    if (config.debug) {
      console.log(`[Pagar.me] Status da resposta: ${response.status}`);
      console.log(`[Pagar.me] Resposta:`, responseData);
    }
    
    if (!response.ok) {
      const message = isRecord(responseData) && typeof responseData.message === 'string'
        ? responseData.message
        : response.statusText;
      throw new Error(`Erro na API Pagar.me: ${message}`);
    }
    
    return responseData as T;
  } catch (error) {
    console.error('[Pagar.me] Erro na requisição:', error);
    throw error;
  }
};
