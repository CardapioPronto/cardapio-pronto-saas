
import { supabase } from '@/lib/supabase';
import { RecentSale } from './types';

const db = supabase;

type RecentOrderRow = {
  id: string;
  customer_name: string | null;
  total?: number | null;
  status: string | null;
  created_at: string | null;
};

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

    const orderRows = (orders || []) as unknown as RecentOrderRow[];

    return orderRows.map(order => ({
      id: order.id,
      customer: order.customer_name || 'Cliente',
      amount: includeFinancials ? Number(order.total || 0) : null,
      status: order.status || 'pendente',
      time: new Date(order.created_at || Date.now()).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }));
  } catch (error) {
    console.error('Erro ao buscar vendas recentes:', error);
    return [];
  }
};
