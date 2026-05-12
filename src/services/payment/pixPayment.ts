
import { config, pagarmeRequest, getPlanName, getPlanPrice } from './config';
import { SubscriptionRequest, SubscriptionResponse } from './types';

type PagarmeResponse = {
  id?: string;
  status?: string;
  next_billing_at?: string;
  [key: string]: unknown;
};

// Função para processar pagamentos com PIX
export const processPixPayment = async (subscriptionData: SubscriptionRequest): Promise<SubscriptionResponse> => {
  console.log(`[Pagar.me] Gerando QR Code PIX`);
  
  if (config.apiKey === 'test_api_key') {
    console.warn('[Pagar.me] Usando chave de API de teste padrão. Configure uma chave válida para integração real.');
    
    // Retorno simulado para desenvolvimento sem API configurada
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      id: `sub_${Math.random().toString(36).substring(2, 11)}`,
      status: 'pending' as const,
      nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      planInfo: {
        name: getPlanName(subscriptionData.planId),
        price: getPlanPrice(subscriptionData.planId, subscriptionData.billingType)
      }
    };
  }
  
  try {
    // Implementação similar ao boleto, mas com método de pagamento pix
    const customerResponse = await pagarmeRequest<PagarmeResponse>('customers', 'POST', {
      name: subscriptionData.customer.name,
      email: subscriptionData.customer.email,
      document: subscriptionData.customer.document,
      type: 'individual',
      phones: {
        mobile_phone: {
          country_code: '55',
          area_code: subscriptionData.customer.phone.substring(0, 2),
          number: subscriptionData.customer.phone.substring(2)
        }
      }
    });
    
    const subscriptionResponse = await pagarmeRequest<PagarmeResponse>('subscriptions', 'POST', {
      plan_id: subscriptionData.planId,
      customer_id: customerResponse.id,
      payment_method: "pix",
      currency: "BRL",
      interval: subscriptionData.billingType === 'monthly' ? 'month' : 'year',
      interval_count: 1,
      billing_type: "exact_day",
      billing_day: new Date().getDate(),
      pix: {
        expires_in: 86400 // 24 horas
      }
    });
    
    return {
      id: subscriptionResponse.id,
      status: 'pending' as const,
      nextBilling: new Date(subscriptionResponse.next_billing_at),
      planInfo: {
        name: getPlanName(subscriptionData.planId),
        price: getPlanPrice(subscriptionData.planId, subscriptionData.billingType)
      },
      pagarmeSubscriptionId: subscriptionResponse.id,
      pagarmeCustomerId: customerResponse.id,
    };
  } catch (error) {
    console.error('[Pagar.me] Erro ao gerar PIX:', error);
    throw new Error(`Falha ao processar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};
