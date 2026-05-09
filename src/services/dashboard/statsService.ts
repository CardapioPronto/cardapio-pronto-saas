
import { supabase } from '@/lib/supabase';
import { DashboardStats } from './types';

const db = supabase;
const OPEN_ORDER_STATUSES = ['pendente', 'preparo', 'em-andamento', 'pending', 'preparing'];

const isCanceled = (status?: string | null) => status === 'cancelado' || status === 'cancelled' || status === 'canceled';

type DashboardOrderRow = {
  id: string;
  total?: number | null;
  status: string | null;
  created_at: string | null;
};

type SoldItemRow = {
  quantity: number | null;
  orders?: { status?: string | null } | { status?: string | null }[] | null;
};

const getJoinedOrderStatus = (item: SoldItemRow) => {
  const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
  return order?.status || null;
};

const calculateGrowth = (current: number, previous: number) => {
  if (previous > 0) return ((current - previous) / previous) * 100;
  return current > 0 ? 100 : 0;
};

export const getDashboardStats = async (
  restaurantId: string,
  includeFinancials = false
): Promise<DashboardStats> => {
  try {
    if (!restaurantId) {
      throw new Error('Restaurant ID not found');
    }

    // Calcular data de 30 dias atrás para comparação
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const orderColumns = includeFinancials ? 'id, total, status, created_at' : 'id, status, created_at';

    const { data: recentOrders, error: recentError } = await db
      .from('orders')
      .select(orderColumns)
      .eq('restaurant_id', restaurantId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (recentError) throw recentError;

    const { data: previousOrders, error: previousError } = await db
      .from('orders')
      .select(orderColumns)
      .eq('restaurant_id', restaurantId)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (previousError) throw previousError;

    const recentOrderRows = (recentOrders || []) as DashboardOrderRow[];
    const previousOrderRows = (previousOrders || []) as DashboardOrderRow[];
    const recentValidOrders = recentOrderRows.filter((order) => !isCanceled(order.status));
    const previousValidOrders = previousOrderRows.filter((order) => !isCanceled(order.status));
    const totalPedidos = recentOrders?.length || 0;
    const pedidosAbertos = recentOrderRows.filter((order) => OPEN_ORDER_STATUSES.includes(order.status || '')).length;
    const faturamento = includeFinancials
      ? recentValidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
      : 0;
    
    const previousTotalPedidos = previousOrders?.length || 0;
    const previousFaturamento = includeFinancials
      ? previousValidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
      : 0;

    const crescimentoPedidos = calculateGrowth(totalPedidos, previousTotalPedidos);
    const crescimentoFaturamento = includeFinancials ? calculateGrowth(faturamento, previousFaturamento) : 0;

    const { data: soldItems, error: productsError } = await db
      .from('order_items')
      .select(`
        quantity,
        orders!inner(restaurant_id, created_at, status)
      `)
      .eq('orders.restaurant_id', restaurantId)
      .gte('orders.created_at', thirtyDaysAgo.toISOString());

    if (productsError) throw productsError;

    const soldItemRows = (soldItems || []) as SoldItemRow[];
    const itensVendidos = soldItemRows
      .filter((item) => !isCanceled(getJoinedOrderStatus(item)))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    const ticketMedio = includeFinancials && recentValidOrders.length > 0
      ? faturamento / recentValidOrders.length
      : 0;

    return {
      totalPedidos,
      faturamento,
      itensVendidos,
      pedidosAbertos,
      ticketMedio,
      crescimentoPedidos,
      crescimentoFaturamento,
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    // Retornar dados padrão em caso de erro
    return {
      totalPedidos: 0,
      faturamento: 0,
      itensVendidos: 0,
      pedidosAbertos: 0,
      ticketMedio: 0,
      crescimentoPedidos: 0,
      crescimentoFaturamento: 0,
    };
  }
};
