
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";

// Interface para vendas recentes
interface SaleItem {
  id: number;
  table: number;
  commandaNumber: number;
  time: string;
  value: number;
}

// Interface para produtos populares
interface PopularProduct {
  id: number;
  name: string;
  popularity: number;
  units: number;
}

export const useDashboardData = (restaurantId: string | null) => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recentSales, setRecentSales] = useState<SaleItem[]>([]);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchStats = async () => {
      setLoading(true);
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

      const totalToday = salesToday?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

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

      const pedidosAtual = ordersThisMonth?.length || 0;
      const pedidosAnterior = ordersLastMonth?.length || 0;
      const pedidosChange = calcularPercentual(pedidosAnterior, pedidosAtual);

      // Filter out null customer names to avoid TypeScript error
      const validCustomersThisMonth = ordersThisMonth?.filter(o => o.customer_name !== null) || [];
      const validCustomersLastMonth = ordersLastMonth?.filter(o => o.customer_name !== null) || [];
      
      const clientesUnicos = new Set(validCustomersThisMonth.map(o => o.customer_name)).size;
      const clientesAnteriores = new Set(validCustomersLastMonth.map(o => o.customer_name)).size;
      const clientesChange = calcularPercentual(clientesAnteriores, clientesUnicos);

      const faturamentoAtual = ordersThisMonth?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const faturamentoAnterior = ordersLastMonth?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const faturamentoChange = calcularPercentual(faturamentoAnterior, faturamentoAtual);

      setStats([
        {
          title: "Vendas hoje",
          value: formatarMoeda(totalToday),
          change: "+0%",
          icon: DollarSign,
          color: "bg-green/10 text-green",
        },
        {
          title: "Pedidos",
          value: pedidosAtual.toString(),
          change: pedidosChange,
          icon: ShoppingCart,
          color: "bg-orange/10 text-orange",
        },
        {
          title: "Clientes",
          value: clientesUnicos.toString(),
          change: clientesChange,
          icon: Users,
          color: "bg-navy/10 text-navy",
        },
        {
          title: "Faturamento mensal",
          value: formatarMoeda(faturamentoAtual),
          change: faturamentoChange,
          icon: TrendingUp,
          color: "bg-beige/30 text-navy",
        },
      ]);

      // Buscar vendas recentes reais do banco de dados
      await fetchRecentSales(restaurantId);
      
      // Buscar produtos mais populares reais do banco de dados
      await fetchPopularProducts(restaurantId);
      
      setLoading(false);
    };

    // Função para buscar as vendas recentes
    const fetchRecentSales = async (restId: string) => {
      const { data: recentOrders, error } = await supabase
        .from("orders")
        .select("id, total, table_number, created_at, order_number")
        .eq("restaurant_id", restId)
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) {
        console.error("Erro ao buscar vendas recentes:", error);
        return;
      }

      // Transformar os dados para o formato esperado pelo componente RecentSales
      const formattedSales: SaleItem[] = recentOrders.map((order, index) => ({
        id: index + 1, 
        table: parseInt(order.table_number || "0"),
        commandaNumber: parseInt(order.order_number.replace('ORD-', '') || "0"),
        time: new Date(order.created_at).toLocaleTimeString(),
        value: order.total,
      }));

      setRecentSales(formattedSales);
    };

    // Função para buscar os produtos mais populares
    const fetchPopularProducts = async (restId: string) => {
      // Primeiro, buscar os itens dos pedidos
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, product_name, quantity")
        .eq("order_id", supabase.from("orders").select("id").eq("restaurant_id", restId));

      if (itemsError) {
        console.error("Erro ao buscar itens de pedidos:", itemsError);
        return;
      }

      // Agrupar por produto e calcular a quantidade total vendida
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

      // Converter para array, ordenar por quantidade e pegar os 4 primeiros
      const topProducts = Array.from(productStats.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4);

      // Calcular o total de vendas para percentuais
      const totalSales = topProducts.reduce((sum, [_, stats]) => sum + stats.count, 0);

      // Formatar para o componente PopularProducts
      const formattedProducts: PopularProduct[] = topProducts.map(([id, stats], index) => {
        const popularity = Math.round((stats.count / totalSales) * 100);
        return {
          id: index + 1,
          name: stats.name,
          popularity: popularity,
          units: stats.count,
        };
      });

      setPopularProducts(formattedProducts);
    };

    fetchStats();
  }, [restaurantId]);

  const calcularPercentual = (anterior: number, atual: number) => {
    if (anterior === 0 && atual > 0) return "+100%";
    if (anterior === 0 && atual === 0) return "0%";
    const diff = ((atual - anterior) / anterior) * 100;
    const prefix = diff > 0 ? "+" : "";
    return `${prefix}${diff.toFixed(0)}%`;
  };

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return { stats, loading, recentSales, popularProducts };
};
