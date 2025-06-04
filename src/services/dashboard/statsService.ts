
import { supabase } from '@/lib/supabase';
import { getCurrentRestaurantId } from '@/lib/supabase';
import { DashboardStats } from './types';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const restaurantId = await getCurrentRestaurantId();
    if (!restaurantId) {
      throw new Error('Restaurant ID not found');
    }

    // Calcular data de 30 dias atrás para comparação
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Buscar pedidos dos últimos 30 dias
    const { data: recentOrders, error: recentError } = await supabase
      .from('orders')
      .select('total, created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (recentError) throw recentError;

    // Buscar pedidos de 30-60 dias atrás para comparação
    const { data: previousOrders, error: previousError } = await supabase
      .from('orders')
      .select('total, created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (previousError) throw previousError;

    // Calcular estatísticas
    const totalPedidos = recentOrders?.length || 0;
    const faturamento = recentOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
    
    const previousTotalPedidos = previousOrders?.length || 0;
    const previousFaturamento = previousOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;

    // Calcular crescimento
    const crescimentoPedidos = previousTotalPedidos > 0 
      ? ((totalPedidos - previousTotalPedidos) / previousTotalPedidos) * 100 
      : totalPedidos > 0 ? 100 : 0;

    const crescimentoFaturamento = previousFaturamento > 0 
      ? ((faturamento - previousFaturamento) / previousFaturamento) * 100 
      : faturamento > 0 ? 100 : 0;

    // Buscar produtos mais vendidos
    const { data: topProducts, error: productsError } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        orders!inner(restaurant_id, created_at)
      `)
      .eq('orders.restaurant_id', restaurantId)
      .gte('orders.created_at', thirtyDaysAgo.toISOString());

    if (productsError) throw productsError;

    const produtosMaisVendidos = topProducts?.length || 0;

    return {
      totalPedidos,
      faturamento,
      produtosMaisVendidos,
      avaliacaoMedia: 4.5, // Pode ser implementado com sistema de avaliação
      crescimentoPedidos,
      crescimentoFaturamento,
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    // Retornar dados padrão em caso de erro
    return {
      totalPedidos: 0,
      faturamento: 0,
      produtosMaisVendidos: 0,
      avaliacaoMedia: 0,
      crescimentoPedidos: 0,
      crescimentoFaturamento: 0,
    };
  }
};
