
import { supabase } from '@/lib/supabase';
import { getCurrentRestaurantId } from '@/lib/supabase';
import { PopularProduct } from './types';

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
