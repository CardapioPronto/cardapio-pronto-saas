
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";

export const useDashboardData = (restaurantId: string | null) => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);

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

      // Generate placeholder data for recent sales and popular products
      generateMockData();
      
      setLoading(false);
    };

    const generateMockData = () => {
      // Mock data for recent sales
      const mockSales = [1, 2, 3, 4].map((i) => ({
        id: i,
        table: i,
        commandaNumber: 1000 + i,
        time: new Date().toLocaleTimeString(),
        value: Math.random() * 100 + 50,
      }));
      
      setRecentSales(mockSales);
      
      // Mock data for popular products
      const productNames = ["X-Tudo", "Porção de batatas", "Cerveja", "Refrigerante"];
      const mockProducts = productNames.map((name, i) => ({
        id: i + 1,
        name,
        popularity: 90 - i * 15,
        units: 90 - i * 15,
      }));
      
      setPopularProducts(mockProducts);
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
