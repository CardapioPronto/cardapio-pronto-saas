
import { processCardPayment } from './cardPayment';
import { processBoletoPayment } from './boletoPayment';
import { processPixPayment } from './pixPayment';
import { pagarmeRequest, config } from './config';
import { SubscriptionRequest, SubscriptionResponse } from './types';

// Criar assinatura
export const createSubscription = async (
  request: SubscriptionRequest
): Promise<SubscriptionResponse> => {
  try {
    console.log(`Criando assinatura para plano: ${request.planId}`);
    
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
    console.error("Erro ao processar pagamento:", error);
    throw error;
  }
};

// Cancelar assinatura
export const cancelSubscription = async (subscriptionId: string): Promise<boolean> => {
  console.log(`[Pagar.me] Cancelando assinatura: ${subscriptionId}`);
  
  if (config.apiKey === 'test_api_key') {
    console.warn('[Pagar.me] Usando chave de API de teste padrão. Configure uma chave válida para integração real.');
    
    // Simulação para desenvolvimento
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }
  
  try {
    await pagarmeRequest(`subscriptions/${subscriptionId}`, 'DELETE');
    return true;
  } catch (error) {
    console.error('[Pagar.me] Erro ao cancelar assinatura:', error);
    throw new Error(`Falha ao cancelar assinatura: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

// Obter dados da assinatura
export const getSubscriptionDetails = async (subscriptionId: string): Promise<SubscriptionResponse | null> => {
  console.log(`[Pagar.me] Buscando detalhes da assinatura: ${subscriptionId}`);
  
  if (config.apiKey === 'test_api_key') {
    console.warn('[Pagar.me] Usando chave de API de teste padrão. Configure uma chave válida para integração real.');
    
    // Simulação para desenvolvimento
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
    const response = await pagarmeRequest(`subscriptions/${subscriptionId}`, 'GET');
    
    if (!response) {
      return null;
    }
    
    return {
      id: response.id,
      status: response.status === 'active' ? 'active' as const : 
              response.status === 'pending' ? 'pending' as const : 'canceled' as const,
      nextBilling: new Date(response.next_billing_at),
      planInfo: {
        name: response.plan?.name || 'Desconhecido',
        price: response.plan?.price || 0
      }
    };
  } catch (error) {
    console.error('[Pagar.me] Erro ao obter detalhes da assinatura:', error);
    throw new Error(`Falha ao obter detalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

// Verificar status da integração com Pagar.me
export const checkPaymentIntegrationStatus = async (): Promise<{ status: 'ok' | 'error', message: string }> => {
  try {
    console.log(`[Pagar.me] Verificando status da integração`);
    console.log(`[Pagar.me] API Key: ${config.apiKey.substring(0, 5)}...`);
    
    if (config.apiKey === 'test_api_key') {
      return { 
        status: 'error', 
        message: 'Chave de API não configurada. Use configurePaymentService() para definir suas credenciais.'
      };
    }
    
    // Tenta fazer uma requisição simples para verificar a conexão
    try {
      // Endpoint específico para verificar o status da chave de API
      await pagarmeRequest('customers?page=1&size=1', 'GET');
      
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
