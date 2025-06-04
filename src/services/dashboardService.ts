
import { supabase } from '@/lib/supabase';
import { getCurrentRestaurantId } from '@/lib/supabase';

export interface DashboardStats {
  totalPedidos: number;
  faturamento: number;
  produtosMaisVendidos: number;
  avaliacaoMedia: number;
  crescimentoPedidos: number;
  crescimentoFaturamento: number;
}

export interface RecentSale {
  id: string;
  customer: string;
  amount: number;
  status: string;
  time: string;
}

export interface PopularProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  category: string;
}

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

export const getPopularProducts = async (): Promise<PopularProduct[]> => {
  try {
    const restaurantId = await getCurrentRestaurantId();
    if (!restaurantId) {
      throw new Error('Restaurant ID not found');
    }

    // Buscar produtos mais vendidos dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: productSales, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        product_name,
        quantity,
        price,
        products!inner(name, category_id),
        orders!inner(restaurant_id, created_at)
      `)
      .eq('orders.restaurant_id', restaurantId)
      .gte('orders.created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    // Agrupar por produto e calcular totais
    const productMap = new Map();
    
    productSales?.forEach(item => {
      const productId = item.product_id;
      if (productMap.has(productId)) {
        const existing = productMap.get(productId);
        existing.sales += item.quantity;
        existing.revenue += item.quantity * Number(item.price);
      } else {
        productMap.set(productId, {
          id: productId,
          name: item.product_name,
          sales: item.quantity,
          revenue: item.quantity * Number(item.price),
          category: 'Produto' // Pode buscar da categoria se necessário
        });
      }
    });

    // Converter para array e ordenar por vendas
    return Array.from(productMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  } catch (error) {
    console.error('Erro ao buscar produtos populares:', error);
    return [];
  }
};
