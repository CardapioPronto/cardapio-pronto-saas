
import { supabase } from '@/lib/supabase';
import { PopularProduct } from './types';

const db = supabase;
const isCanceled = (status?: string | null) => status === 'cancelado' || status === 'cancelled' || status === 'canceled';

type ProductSaleRow = {
  product_id: string | null;
  product_name: string | null;
  quantity: number | null;
  price?: number | null;
  orders?: { status?: string | null } | { status?: string | null }[] | null;
};

const getJoinedOrderStatus = (item: ProductSaleRow) => {
  const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
  return order?.status || null;
};

export const getPopularProducts = async (
  restaurantId: string,
  includeFinancials = false
): Promise<PopularProduct[]> => {
  try {
    if (!restaurantId) {
      throw new Error('Restaurant ID not found');
    }

    // Buscar produtos mais vendidos dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const itemColumns = includeFinancials
      ? `
        product_id,
        product_name,
        quantity,
        price,
        orders!inner(restaurant_id, created_at, status)
      `
      : `
        product_id,
        product_name,
        quantity,
        orders!inner(restaurant_id, created_at, status)
      `;

    const { data: productSales, error } = await db
      .from('order_items')
      .select(itemColumns)
      .eq('orders.restaurant_id', restaurantId)
      .gte('orders.created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    // Agrupar por produto e calcular totais
    const productMap = new Map<string, PopularProduct>();
    
    const productSaleRows = (productSales || []) as unknown as ProductSaleRow[];

    productSaleRows
      .filter((item) => !isCanceled(getJoinedOrderStatus(item)))
      .forEach((item) => {
        const productId = item.product_id || item.product_name || 'produto-sem-id';
        const quantity = Number(item.quantity || 0);
        const revenue = includeFinancials ? quantity * Number(item.price || 0) : 0;
        const existing = productMap.get(productId);

        if (existing) {
          existing.sales += quantity;
          existing.revenue += revenue;
          return;
        }

        productMap.set(productId, {
          id: productId,
          name: item.product_name || 'Produto',
          sales: quantity,
          revenue,
          category: 'Produto',
        });
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
