
import { supabase } from "@/lib/supabase";

export const fetchOrdersData = async (restaurantId: string) => {
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString();

  const { data: salesToday } = await supabase
    .from("orders")
    .select("total")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", startOfToday);

  const { data: ordersThisMonth } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", startOfMonth);

  const { data: ordersLastMonth } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", startOfLastMonth)
    .lte("created_at", endOfLastMonth);

  return {
    salesToday: salesToday?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
    ordersThisMonth: ordersThisMonth || [],
    ordersLastMonth: ordersLastMonth || []
  };
};

export const fetchRecentSales = async (restaurantId: string) => {
  const { data: recentOrders, error } = await supabase
    .from("orders")
    .select("id, total, table_number, created_at, order_number")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(4);

  if (error) {
    console.error("Erro ao buscar vendas recentes:", error);
    return [];
  }

  if (!recentOrders || recentOrders.length === 0) {
    return [];
  }

  return recentOrders.map((order, index) => ({
    id: index + 1, 
    table: parseInt(order.table_number || "0"),
    commandaNumber: order.order_number.replace('ORD-', '') || "0",
    time: new Date(order.created_at).toLocaleTimeString(),
    value: order.total,
  }));
};

export const fetchPopularProducts = async (restaurantId: string) => {
  const { data: restaurantOrders, error: ordersError } = await supabase
    .from("orders")
    .select("id")
    .eq("restaurant_id", restaurantId);
  
  if (ordersError) {
    console.error("Erro ao buscar pedidos do restaurante:", ordersError);
    return [];
  }
  
  if (!restaurantOrders || restaurantOrders.length === 0) {
    return [];
  }
  
  const orderIds = restaurantOrders.map(order => order.id);
  
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, product_name, quantity")
    .in("order_id", orderIds);

  if (itemsError) {
    console.error("Erro ao buscar itens de pedidos:", itemsError);
    return [];
  }

  if (!orderItems || orderItems.length === 0) {
    return [];
  }

  const productStats = new Map<string, { name: string, count: number }>();
  
  orderItems?.forEach(item => {
    if (!productStats.has(item.product_id)) {
      productStats.set(item.product_id, { name: item.product_name, count: 0 });
    }
    
    const currentStat = productStats.get(item.product_id);
    if (currentStat) {
      currentStat.count += item.quantity;
      productStats.set(item.product_id, currentStat);
    }
  });

  const topProducts = Array.from(productStats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4);

  if (topProducts.length === 0) {
    return [];
  }

  const totalSales = topProducts.reduce((sum, [_, stats]) => sum + stats.count, 0);

  return topProducts.map(([id, stats], index) => {
    const popularity = Math.round((stats.count / totalSales) * 100);
    return {
      id: index + 1,
      name: stats.name,
      popularity: popularity,
      units: stats.count,
    };
  });
};
