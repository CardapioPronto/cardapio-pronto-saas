
// Serviço de pagamento para integração com o Pagar.me

interface PaymentMethod {
  type: 'credit_card' | 'boleto' | 'pix';
  cardDetails?: {
    number: string;
    name: string;
    expiry: string;
    cvc: string;
  };
}

interface CustomerInfo {
  name: string;
  email: string;
  document: string;
  phone: string;
}

interface SubscriptionRequest {
  planId: string;
  customer: CustomerInfo;
  paymentMethod: PaymentMethod;
  billingType: 'monthly' | 'yearly';
}

interface SubscriptionResponse {
  id: string;
  status: 'active' | 'pending' | 'canceled';
  nextBilling: Date;
  planInfo: {
    name: string;
    price: number;
  };
}

// Configuração de ambiente
const config = {
  apiKey: process.env.PAGARME_API_KEY || 'test_api_key',
  isLive: process.env.NODE_ENV === 'production',
  apiUrl: 'https://api.pagar.me/core/v5',
  debug: true // Habilita logs detalhados para depuração
};

// Configurar as chaves de API
export const configurePaymentService = (apiKey: string, isLive = false) => {
  config.apiKey = apiKey;
  config.isLive = isLive;
  console.log(`Pagar.me configurado: ${isLive ? 'Produção' : 'Homologação'}`);
};

// Função para fazer requisições à API do Pagar.me
const pagarmeRequest = async (endpoint: string, method: string, data?: any) => {
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
    
    const responseData = await response.json();
    
    if (config.debug) {
      console.log(`[Pagar.me] Status da resposta: ${response.status}`);
      console.log(`[Pagar.me] Resposta:`, responseData);
    }
    
    if (!response.ok) {
      throw new Error(`Erro na API Pagar.me: ${responseData.message || response.statusText}`);
    }
    
    return responseData;
  } catch (error) {
    console.error('[Pagar.me] Erro na requisição:', error);
    throw error;
  }
};

// Função para processar pagamentos com cartão
const processCardPayment = async (subscriptionData: SubscriptionRequest) => {
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

// Função para processar pagamentos com boleto
const processBoletoPayment = async (subscriptionData: SubscriptionRequest) => {
  console.log(`[Pagar.me] Gerando boleto`);
  
  if (config.apiKey === 'test_api_key') {
    console.warn('[Pagar.me] Usando chave de API de teste padrão. Configure uma chave válida para integração real.');
    
    // Retorno simulado para desenvolvimento sem API configurada
    await new Promise(resolve => setTimeout(resolve, 1000));
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
    // Implementação similar ao cartão, mas com método de pagamento boleto
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
    
    const subscriptionResponse = await pagarmeRequest('subscriptions', 'POST', {
      plan_id: subscriptionData.planId,
      customer_id: customerResponse.id,
      payment_method: "boleto",
      currency: "BRL",
      interval: subscriptionData.billingType === 'monthly' ? 'month' : 'year',
      interval_count: 1,
      billing_type: "exact_day",
      billing_day: new Date().getDate(),
      boleto: {
        instructions: "Pagar até a data de vencimento",
        due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
    
    return {
      id: subscriptionResponse.id,
      status: 'pending' as const,
      nextBilling: new Date(subscriptionResponse.next_billing_at),
      planInfo: {
        name: getPlanName(subscriptionData.planId),
        price: getPlanPrice(subscriptionData.planId, subscriptionData.billingType)
      }
    };
  } catch (error) {
    console.error('[Pagar.me] Erro ao gerar boleto:', error);
    throw new Error(`Falha ao processar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

// Função para processar pagamentos com PIX
const processPixPayment = async (subscriptionData: SubscriptionRequest) => {
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
    
    const subscriptionResponse = await pagarmeRequest('subscriptions', 'POST', {
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
      }
    };
  } catch (error) {
    console.error('[Pagar.me] Erro ao gerar PIX:', error);
    throw new Error(`Falha ao processar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

// Funções auxiliares para obter informações de plano
const getPlanName = (planId: string): string => {
  switch (planId) {
    case 'premium': return 'Premium';
    case 'standard': return 'Padrão';
    default: return 'Básico';
  }
};

const getPlanPrice = (planId: string, billingType: 'monthly' | 'yearly'): number => {
  let basePrice: number;
  
  switch (planId) {
    case 'premium': basePrice = 149.90; break;
    case 'standard': basePrice = 99.90; break; 
    default: basePrice = 49.90;
  }
  
  return billingType === 'yearly' ? basePrice * 10 : basePrice;
};

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
