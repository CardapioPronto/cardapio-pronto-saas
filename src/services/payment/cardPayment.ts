
import { config, pagarmeRequest, getPlanName, getPlanPrice } from './config';
import { SubscriptionRequest, SubscriptionResponse } from './types';

// Função para processar pagamentos com cartão
export const processCardPayment = async (subscriptionData: SubscriptionRequest): Promise<SubscriptionResponse> => {
  if (!subscriptionData.paymentMethod.cardDetails) {
    throw new Error("Detalhes do cartão necessários para este tipo de pagamento");
  }
  
  console.log(`[Pagar.me] Processando pagamento com cartão`);
  
  if (config.apiKey === 'test_api_key') {
    console.warn('[Pagar.me] Usando chave de API de teste padrão. Configure uma chave válida para integração real.');
    
    // Retorno simulado para desenvolvimento sem API configurada
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      id: `sub_${Math.random().toString(36).substring(2, 11)}`,
      status: 'active' as const,
      nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      planInfo: {
        name: getPlanName(subscriptionData.planId),
        price: getPlanPrice(subscriptionData.planId, subscriptionData.billingType)
      }
    };
  }
  
  try {
    // Implementação real para integração com Pagar.me
    // 1. Criar cliente se não existir
    const customerResponse = await pagarmeRequest('customers', 'POST', {
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
    
    // 2. Criar cartão de crédito
    const cardDetails = subscriptionData.paymentMethod.cardDetails;
    const cardResponse = await pagarmeRequest('customers/' + customerResponse.id + '/cards', 'POST', {
      number: cardDetails.number,
      holder_name: cardDetails.name,
      exp_month: cardDetails.expiry.split('/')[0],
      exp_year: '20' + cardDetails.expiry.split('/')[1],
      cvv: cardDetails.cvc
    });
    
    // 3. Criar assinatura
    const subscriptionResponse = await pagarmeRequest('subscriptions', 'POST', {
      plan_id: subscriptionData.planId,
      customer_id: customerResponse.id,
      card_id: cardResponse.id,
      payment_method: "credit_card",
      currency: "BRL",
      interval: subscriptionData.billingType === 'monthly' ? 'month' : 'year',
      interval_count: 1,
      billing_type: "exact_day",
      billing_day: new Date().getDate(),
      installments: 1
    });
    
    // Formatar resposta no formato esperado pela aplicação
    return {
      id: subscriptionResponse.id,
      status: subscriptionResponse.status === 'active' ? 'active' as const : 
              subscriptionResponse.status === 'pending' ? 'pending' as const : 'canceled' as const,
      nextBilling: new Date(subscriptionResponse.next_billing_at),
      planInfo: {
        name: getPlanName(subscriptionData.planId),
        price: getPlanPrice(subscriptionData.planId, subscriptionData.billingType)
      }
    };
  } catch (error) {
    console.error('[Pagar.me] Erro ao processar pagamento com cartão:', error);
    throw new Error(`Falha ao processar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};
