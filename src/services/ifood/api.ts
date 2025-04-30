
import { ifoodConfig, loadIfoodConfig } from './config';
import { IfoodAuthResponse, IfoodOrder, IfoodWebhookEvent } from './types';
import { toast } from '@/components/ui/sonner';

// Cache para o token de acesso
let cachedToken: { token: string; expiresAt: number } | null = null;

// Obter um token de autenticação
const getAuthToken = async (): Promise<string> => {
  const config = loadIfoodConfig();
  
  if (!config.credentials) {
    throw new Error('Credenciais do iFood não configuradas');
  }

  // Verificar se o token em cache ainda é válido
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  try {
    const response = await fetch(`${config.apiUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.credentials.clientId,
        client_secret: config.credentials.clientSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Falha na autenticação: ${response.status}`);
    }

    const data: IfoodAuthResponse = await response.json();
    
    // Armazenar token em cache (expira 5 minutos antes do tempo real para evitar problemas)
    cachedToken = {
      token: data.accessToken,
      expiresAt: Date.now() + ((data.expiresIn - 300) * 1000)
    };

    return cachedToken.token;
  } catch (error) {
    console.error('Erro ao obter token de autenticação do iFood:', error);
    toast.error('Falha ao autenticar com o iFood');
    throw error;
  }
};

// Fazer requisição para a API do iFood
const ifoodRequest = async (endpoint: string, method: string = 'GET', data?: any): Promise<any> => {
  const config = loadIfoodConfig();
  
  if (!config.isEnabled) {
    throw new Error('Integração com iFood está desativada');
  }

  try {
    const token = await getAuthToken();
    const url = `${config.apiUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const options: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Erro na requisição iFood: ${response.status} - ${error.message || response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Erro na requisição iFood (${endpoint}):`, error);
    throw error;
  }
};

// Verificar conexão com a API do iFood
export const testIfoodConnection = async (): Promise<boolean> => {
  try {
    await getAuthToken();
    return true;
  } catch (error) {
    console.error('Falha no teste de conexão com iFood:', error);
    return false;
  }
};

// Obter pedidos pendentes
export const getIfoodPendingOrders = async (): Promise<IfoodOrder[]> => {
  const config = loadIfoodConfig();
  
  if (!config.credentials?.merchantId) {
    throw new Error('ID do comerciante não configurado');
  }
  
  try {
    const endpoint = `/v3/orders/merchant/${config.credentials.merchantId}/pending`;
    return await ifoodRequest(endpoint);
  } catch (error) {
    console.error('Erro ao obter pedidos pendentes:', error);
    toast.error('Falha ao obter pedidos do iFood');
    return [];
  }
};

// Obter detalhes de um pedido específico
export const getIfoodOrderDetails = async (orderId: string): Promise<IfoodOrder | null> => {
  try {
    const endpoint = `/v3/orders/${orderId}`;
    return await ifoodRequest(endpoint);
  } catch (error) {
    console.error(`Erro ao obter detalhes do pedido ${orderId}:`, error);
    toast.error(`Falha ao obter detalhes do pedido ${orderId}`);
    return null;
  }
};

// Atualizar status de um pedido
export const updateIfoodOrderStatus = async (
  orderId: string, 
  status: 'ACCEPTED' | 'DISPATCHED' | 'READY_TO_DELIVER' | 'CONCLUDED' | 'CANCELLED',
  reason?: string
): Promise<boolean> => {
  try {
    const endpoint = `/v3/orders/${orderId}/statuses`;
    
    const data: any = { status };
    if (reason && status === 'CANCELLED') {
      data.reason = reason;
    }
    
    await ifoodRequest(endpoint, 'POST', data);
    toast.success(`Pedido ${orderId} atualizado para ${status}`);
    return true;
  } catch (error) {
    console.error(`Erro ao atualizar status do pedido ${orderId}:`, error);
    toast.error(`Falha ao atualizar status do pedido ${orderId}`);
    return false;
  }
};

// Processar evento de webhook
export const processIfoodWebhookEvent = async (event: IfoodWebhookEvent): Promise<void> => {
  console.log('Evento do iFood recebido:', event);
  
  // Se for um novo pedido, obtém os detalhes e o adiciona ao sistema
  if (event.eventType === 'ORDER_PLACED') {
    try {
      const orderDetails = await getIfoodOrderDetails(event.orderId);
      if (orderDetails) {
        // Aqui você integraria com seu sistema de pedidos
        console.log('Novo pedido recebido do iFood:', orderDetails);
        toast.success(`Novo pedido iFood recebido: #${orderDetails.shortReference}`);
      }
    } catch (error) {
      console.error('Erro ao processar novo pedido:', error);
    }
  }
  
  // TODO: Implementar lógica para outros tipos de eventos
};
