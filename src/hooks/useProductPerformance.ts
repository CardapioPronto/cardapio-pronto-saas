import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ProductPerformanceData {
  productId: string;
  productName: string;
  quantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  orderCount: number;
}

export interface CategoryPerformanceData {
  categoryId: string;
  categoryName: string;
  quantitySold: number;
  totalRevenue: number;
  orderCount: number;
  productCount: number;
}

export interface PerformancePeriod {
  period: string; // 'today', 'week', 'month', 'year'
  label: string;
  daysAgo: number;
}

const PERFORMANCE_PERIODS: PerformancePeriod[] = [
  { period: 'today', label: 'Hoje', daysAgo: 0 },
  { period: 'week', label: 'Última Semana', daysAgo: 7 },
  { period: 'month', label: 'Último Mês', daysAgo: 30 },
  { period: 'year', label: 'Último Ano', daysAgo: 365 },
];

export function useProductPerformance(
  restaurantId: string,
  period: PerformancePeriod = PERFORMANCE_PERIODS[2] // Default: month
) {
  return useQuery({
    queryKey: ['product-performance', restaurantId, period.period],
    queryFn: async () => {
      if (!restaurantId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period.daysAgo);
      startDate.setHours(0, 0, 0, 0);

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('source', 'cardapio')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        return [];
      }

      const orderIds = orders.map((o) => o.id);

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('id, order_id, product_id, product_name, quantity, price')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      type ProductMapRecord = {
        data: ProductPerformanceData;
        orderIds: Set<string>;
      };

      const productMap = new Map<string, ProductMapRecord>();

      (orderItems || []).forEach((item) => {
        const key = item.product_id || 'unknown';
        const orderId = item.order_id || 'unknown';
        const revenue = item.quantity * item.price;
        const existing = productMap.get(key);

        if (existing) {
          existing.data.quantitySold += item.quantity;
          existing.data.totalRevenue += revenue;
          existing.orderIds.add(orderId);
          productMap.set(key, existing);
        } else {
          productMap.set(key, {
            data: {
              productId: key,
              productName: item.product_name || 'Produto desconhecido',
              quantitySold: item.quantity,
              totalRevenue: revenue,
              averagePrice: item.price,
              orderCount: 1,
            },
            orderIds: new Set([orderId]),
          });
        }
      });

      const products = Array.from(productMap.values()).map((record) => ({
        ...record.data,
        orderCount: record.orderIds.size,
        averagePrice: record.data.quantitySold > 0
          ? record.data.totalRevenue / record.data.quantitySold
          : 0,
      }));

      return products
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 20); // Top 20
    },
    enabled: !!restaurantId,
  });
}

export function useCategoryPerformance(
  restaurantId: string,
  period: PerformancePeriod = PERFORMANCE_PERIODS[2] // Default: month
) {
  return useQuery({
    queryKey: ['category-performance', restaurantId, period.period],
    queryFn: async () => {
      if (!restaurantId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period.daysAgo);
      startDate.setHours(0, 0, 0, 0);

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('source', 'cardapio')
        .gte('created_at', startDate.toISOString());

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        return [];
      }

      const orderIds = orders.map((o) => o.id);

      // Get order items with product info
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('id, order_id, product_id, quantity, price')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      if (!orderItems || orderItems.length === 0) {
        return [];
      }

      const productIds = orderItems.map((oi) => oi.product_id).filter(Boolean);

      if (productIds.length === 0) {
        return [];
      }

      // Get product category info
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, category_id')
        .in('id', productIds);

      if (productsError) throw productsError;

      // Get category names
      const categoryIds = products
        ?.map((p) => p.category_id)
        .filter(Boolean) as string[];

      if (categoryIds.length === 0) {
        return [];
      }

      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', categoryIds);

      if (categoriesError) throw categoriesError;

      // Build product to category map
      const productToCategoryMap = new Map<string, { categoryId: string; categoryName: string }>();
      products?.forEach((p) => {
        const category = categories?.find((c) => c.id === p.category_id);
        if (category) {
          productToCategoryMap.set(p.id, {
            categoryId: category.id,
            categoryName: category.name,
          });
        }
      });

      // Group by category
      type CategoryMapRecord = {
        data: CategoryPerformanceData;
        orderIds: Set<string>;
      };

      const categoryMap = new Map<string, CategoryMapRecord>();

      orderItems.forEach((item) => {
        const categoryInfo = productToCategoryMap.get(item.product_id);
        if (!categoryInfo) return;

        const { categoryId, categoryName } = categoryInfo;
        const revenue = item.quantity * item.price;
        const orderId = item.order_id || 'unknown';

        const existing = categoryMap.get(categoryId);

        if (existing) {
          existing.data.quantitySold += item.quantity;
          existing.data.totalRevenue += revenue;
          existing.data.orderCount = existing.orderIds.add(orderId).size;
          categoryMap.set(categoryId, existing);
        } else {
          categoryMap.set(categoryId, {
            data: {
              categoryId,
              categoryName,
              quantitySold: item.quantity,
              totalRevenue: revenue,
              orderCount: 1,
              productCount: 1,
            },
            orderIds: new Set([orderId]),
          });
        }
      });

      const categoryPerformanceData = Array.from(categoryMap.values()).map((record) => record.data);

      return categoryPerformanceData
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10); // Top 10
    },
    enabled: !!restaurantId,
  });
}

export function usePerformanceSummary(
  restaurantId: string,
  period: PerformancePeriod = PERFORMANCE_PERIODS[2]
) {
  return useQuery({
    queryKey: ['performance-summary', restaurantId, period.period],
    queryFn: async () => {
      if (!restaurantId) return null;

      const periodStart = new Date();
      const periodDays = Math.max(period.daysAgo || 1, 1);
      periodStart.setDate(periodStart.getDate() - period.daysAgo);
      periodStart.setHours(0, 0, 0, 0);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('source', 'cardapio')
        .gte('created_at', periodStart.toISOString());

      if (error) throw error;

      if (!orders || orders.length === 0) {
        return {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          topPeriod: 'Sem dados',
          growth: 0,
        };
      }

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
      const averageOrderValue = totalRevenue / totalOrders;

      // Find peak period
      const ordersByDay = new Map<string, number>();
      orders.forEach((o) => {
        const day = new Date(o.created_at).toLocaleDateString();
        ordersByDay.set(day, (ordersByDay.get(day) || 0) + 1);
      });

      const topPeriod = Array.from(ordersByDay.entries()).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];

      // Calculate growth (compare with previous 30 days)
      const previousStart = new Date(periodStart);
      previousStart.setDate(previousStart.getDate() - periodDays);

      const { data: previousOrders } = await supabase
        .from('orders')
        .select('id, total')
        .eq('restaurant_id', restaurantId)
        .eq('source', 'cardapio')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', periodStart.toISOString());

      const previousRevenue =
        previousOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
      const growth =
        previousRevenue > 0
          ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
          : 100;

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        topPeriod: topPeriod || 'Sem dados',
        growth: Math.round(growth * 10) / 10,
      };
    },
    enabled: !!restaurantId,
  });
}

export { PERFORMANCE_PERIODS };
