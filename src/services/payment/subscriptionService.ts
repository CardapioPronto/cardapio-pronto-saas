
import { processCardPayment } from './cardPayment';
import { processBoletoPayment } from './boletoPayment';
import { processPixPayment } from './pixPayment';
import { pagarmeRequest, config } from './config';
import { SubscriptionRequest, SubscriptionResponse } from './types';
import { createLogger } from '@/lib/log';

const log = createLogger('payment.subscription');

type PagarmeSubscriptionResponse = {
  id?: string;
  status?: string;
  next_billing_at?: string;
  plan?: { name?: string; price?: number };
  [key: string]: unknown;
};

export const createSubscription = async (
  request: SubscriptionRequest
): Promise<SubscriptionResponse> => {
  try {
    log.debug(`Criando assinatura para plano: ${request.planId}`);
    
    // Processar o pagamento baseado no método selecionado
    switch (request.paymentMethod.type) {
      case 'credit_card':
        return await processCardPayment(request);
      case 'boleto': 
        return await processBoletoPayment(request);
      case 'pix':
        return await processPixPayment(request);
      default:
        throw new Error("Método de pagamento não suportado");
    }
  } catch (error) {
    log.error("Erro ao processar pagamento:", error);
    throw error;
  }
};

export const cancelSubscription = async (subscriptionId: string): Promise<boolean> => {
  log.debug(`[Pagar.me] Cancelando assinatura: ${subscriptionId}`);

  if (config.apiKey === 'test_api_key') {
    log.warn('[Pagar.me] Usando chave de API de teste padrão. Configure uma chave válida para integração real.');

    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }

  try {
    await pagarmeRequest<PagarmeSubscriptionResponse>(`subscriptions/${subscriptionId}`, 'DELETE');
    return true;
  } catch (error) {
    log.error('[Pagar.me] Erro ao cancelar assinatura:', error);
    throw new Error(`Falha ao cancelar assinatura: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

export const getSubscriptionDetails = async (subscriptionId: string): Promise<SubscriptionResponse | null> => {
  log.debug(`[Pagar.me] Buscando detalhes da assinatura: ${subscriptionId}`);

  if (config.apiKey === 'test_api_key') {
    log.warn('[Pagar.me] Usando chave de API de teste padrão. Configure uma chave válida para integração real.');

    await new Promise(resolve => setTimeout(resolve, 800));
    const status = Math.random() > 0.2 ? 'active' as const : 'canceled' as const;
    
    return {
      id: subscriptionId,
      status: status,
      nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      planInfo: {
        name: Math.random() > 0.5 ? 'Premium' : 'Padrão',
        price: Math.random() > 0.5 ? 149.90 : 99.90
      }
    };
  }
  
  try {
    const response = await pagarmeRequest<PagarmeSubscriptionResponse>(`subscriptions/${subscriptionId}`, 'GET');

    if (!response || !response.id) {
      return null;
    }

    return {
      id: response.id,
      status: response.status === 'active' ? 'active' as const :
              response.status === 'pending' ? 'pending' as const : 'canceled' as const,
      nextBilling: new Date(response.next_billing_at ?? Date.now()),
      planInfo: {
        name: response.plan?.name || 'Desconhecido',
        price: response.plan?.price || 0
      }
    };
  } catch (error) {
    log.error('[Pagar.me] Erro ao obter detalhes da assinatura:', error);
    throw new Error(`Falha ao obter detalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

export const checkPaymentIntegrationStatus = async (): Promise<{ status: 'ok' | 'error', message: string }> => {
  try {
    log.debug(`[Pagar.me] Verificando status da integração`);
    log.debug(`[Pagar.me] API Key configurada (comprimento=${config.apiKey?.length ?? 0})`);

    if (config.apiKey === 'test_api_key') {
      return { 
        status: 'error', 
        message: 'Chave de API não configurada. Use configurePaymentService() para definir suas credenciais.'
      };
    }
    
    // Tenta fazer uma requisição simples para verificar a conexão
    try {
      // Endpoint específico para verificar o status da chave de API
      await pagarmeRequest<PagarmeSubscriptionResponse>('customers?page=1&size=1', 'GET');
      
      return { 
        status: 'ok', 
        message: `Integração ${config.isLive ? 'de produção' : 'de homologação'} funcionando corretamente.`
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Erro na conexão com Pagar.me: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Erro na conexão com Pagar.me: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
};
