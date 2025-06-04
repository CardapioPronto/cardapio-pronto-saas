
import { supabase } from '@/lib/supabase';
import { getCurrentRestaurantId } from '@/lib/supabase';
import { RecentSale } from './types';

export const getRecentSales = async (): Promise<RecentSale[]> => {
  try {
    const restaurantId = await getCurrentRestaurantId();
    if (!restaurantId) {
      throw new Error('Restaurant ID not found');
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, customer_name, total, status, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return orders?.map(order => ({
      id: order.id,
      customer: order.customer_name,
      amount: Number(order.total),
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
