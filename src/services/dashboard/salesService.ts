
import { supabase } from '@/lib/supabase';
import { RecentSale } from './types';

const db = supabase as any;

export const getRecentSales = async (
  restaurantId: string,
  includeFinancials = false
): Promise<RecentSale[]> => {
  try {
    if (!restaurantId) {
      throw new Error('Restaurant ID not found');
    }

    const columns = includeFinancials
      ? 'id, customer_name, total, status, created_at'
      : 'id, customer_name, status, created_at';

    const { data: orders, error } = await db
      .from('orders')
      .select(columns)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return orders?.map(order => ({
      id: order.id,
      customer: order.customer_name,
      amount: includeFinancials ? Number(order.total || 0) : null,
      status: order.status,
      time: new Date(order.created_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    })) || [];
  } catch (error) {
    console.error('Erro ao buscar vendas recentes:', error);
    return [];
  }
};
