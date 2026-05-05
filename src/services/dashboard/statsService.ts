
import { supabase } from '@/lib/supabase';
import { DashboardStats } from './types';

const db = supabase as any;
const OPEN_ORDER_STATUSES = ['pendente', 'preparo', 'em-andamento', 'pending', 'preparing'];

const isCanceled = (status?: string | null) => status === 'cancelado' || status === 'cancelled' || status === 'canceled';

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

    const recentValidOrders = (recentOrders || []).filter((order: any) => !isCanceled(order.status));
    const previousValidOrders = (previousOrders || []).filter((order: any) => !isCanceled(order.status));
    const totalPedidos = recentOrders?.length || 0;
    const pedidosAbertos = (recentOrders || []).filter((order: any) => OPEN_ORDER_STATUSES.includes(order.status)).length;
    const faturamento = includeFinancials
      ? recentValidOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0)
      : 0;
    
    const previousTotalPedidos = previousOrders?.length || 0;
    const previousFaturamento = includeFinancials
      ? previousValidOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0)
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

    const itensVendidos = (soldItems || [])
      .filter((item: any) => !isCanceled(item.orders?.status))
      .reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);

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
