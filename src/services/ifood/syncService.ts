
import { getIfoodPendingOrders, getIfoodOrderDetails, updateIfoodOrderStatus } from './api';
import { loadIfoodConfig } from './config';
import { IfoodOrder } from './types';
import { toast } from '@/components/ui/sonner';

let pollingInterval: ReturnType<typeof setInterval> | null = null;

// Converter pedido do iFood para o formato do sistema
const convertIfoodOrderToSystemOrder = (ifoodOrder: IfoodOrder): any => {
  // Esta função deve converter o formato de pedido do iFood para o formato usado no seu sistema
  return {
    id: ifoodOrder.id,
    externalId: ifoodOrder.reference,
    shortReference: ifoodOrder.shortReference,
    source: 'ifood',
    cliente: ifoodOrder.customer.name,
    valorTotal: ifoodOrder.total,
    data: new Date(ifoodOrder.createdAt),
    status: mapIfoodStatusToSystemStatus(ifoodOrder.status),
    itens: ifoodOrder.items.map(item => ({
      nome: item.name,
      quantidade: item.quantity,
      precoUnitario: item.price / item.quantity,
      observacoes: item.observations
    })),
    endereco: ifoodOrder.customer.address ? {
      rua: ifoodOrder.customer.address.streetName,
      numero: ifoodOrder.customer.address.streetNumber,
      bairro: ifoodOrder.customer.address.neighborhood,
      cidade: ifoodOrder.customer.address.city,
      estado: ifoodOrder.customer.address.state,
      complemento: ifoodOrder.customer.address.complement,
      cep: ifoodOrder.customer.address.postalCode
    } : undefined,
    telefone: ifoodOrder.customer.phone,
    tipoPagamento: mapIfoodPaymentToSystemPayment(ifoodOrder.payments[0]?.method),
    metodoPagamento: ifoodOrder.payments[0]?.prepaid ? 'pago' : 'a pagar',
    tipoEntrega: ifoodOrder.type === 'DELIVERY' ? 'entrega' : 'retirada'
  };
};

// Mapear status do iFood para status do sistema
const mapIfoodStatusToSystemStatus = (ifoodStatus: string): 'pendente' | 'preparo' | 'concluido' | 'cancelado' => {
  switch (ifoodStatus) {
    case 'PLACED':
      return 'pendente';
    case 'ACCEPTED':
    case 'DISPATCHED':
    case 'READY_TO_DELIVER':
      return 'preparo';
    case 'CONCLUDED':
      return 'concluido';
    case 'CANCELLED':
      return 'cancelado';
    default:
      return 'pendente';
  }
};

// Mapear método de pagamento do iFood para o sistema
const mapIfoodPaymentToSystemPayment = (method?: string): string => {
  switch (method) {
    case 'CREDIT':
      return 'cartão de crédito';
    case 'DEBIT':
      return 'cartão de débito';
    case 'MEAL_VOUCHER':
    case 'FOOD_VOUCHER':
      return 'vale refeição';
    case 'CASH':
      return 'dinheiro';
    case 'PIX':
      return 'pix';
    default:
      return 'outro';
  }
};

// Verificar se já temos o pedido no sistema
const isOrderAlreadyInSystem = (ifoodOrderId: string): boolean => {
  // Aqui você implementaria a lógica para verificar se o pedido já está registrado no seu sistema
  // Por simplicidade, estamos apenas retornando false por enquanto
  return false;
};

// Processar pedidos pendentes
export const syncIfoodPendingOrders = async (): Promise<void> => {
  const config = loadIfoodConfig();
  
  if (!config.isEnabled || !config.credentials) {
    return;
  }
  
  try {
    const pendingOrders = await getIfoodPendingOrders();
    let newOrderCount = 0;
    
    for (const order of pendingOrders) {
      if (!isOrderAlreadyInSystem(order.id)) {
        // Converter o pedido para o formato do sistema
        const systemOrder = convertIfoodOrderToSystemOrder(order);
        
        // Aqui você adicionaria o pedido ao seu sistema
        // Por exemplo: adicionarPedidoAoSistema(systemOrder);
        console.log('Adicionando pedido iFood ao sistema:', systemOrder);
        
        newOrderCount++;
      }
    }
    
    if (newOrderCount > 0) {
      toast.success(`${newOrderCount} ${newOrderCount === 1 ? 'novo pedido' : 'novos pedidos'} do iFood sincronizado${newOrderCount === 1 ? '' : 's'}.`);
    }
  } catch (error) {
    console.error('Erro ao sincronizar pedidos pendentes do iFood:', error);
  }
};

// Iniciar sincronização periódica
export const startIfoodSync = (): void => {
  const config = loadIfoodConfig();
  
  // Parar sincronização existente se houver
  stopIfoodSync();
  
  if (config.isEnabled && config.pollingEnabled) {
    // Executar imediatamente a primeira sincronização
    syncIfoodPendingOrders();
    
    // Configurar intervalo para sincronizações periódicas
    pollingInterval = setInterval(
      syncIfoodPendingOrders, 
      config.pollingInterval * 1000
    );
    
    console.log(`Sincronização iFood iniciada com intervalo de ${config.pollingInterval} segundos.`);
  }
};

// Parar sincronização periódica
export const stopIfoodSync = (): void => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('Sincronização iFood interrompida.');
  }
};

// Atualizar status de um pedido no iFood
export const updateOrderStatusInIfood = async (systemOrderId: string, systemStatus: string, ifoodOrderId: string): Promise<boolean> => {
  let ifoodStatus: 'ACCEPTED' | 'DISPATCHED' | 'READY_TO_DELIVER' | 'CONCLUDED' | 'CANCELLED';
  
  switch (systemStatus) {
    case 'preparo':
      ifoodStatus = 'ACCEPTED';
      break;
    case 'concluido':
      ifoodStatus = 'CONCLUDED';
      break;
    case 'cancelado':
      ifoodStatus = 'CANCELLED';
      break;
    default:
      console.error(`Status do sistema não mapeável para iFood: ${systemStatus}`);
      return false;
  }
  
  return await updateIfoodOrderStatus(ifoodOrderId, ifoodStatus);
};
