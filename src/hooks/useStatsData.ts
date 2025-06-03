
import { useState } from "react";
import { DollarSign, ShoppingCart, TrendingUp, Users, LucideIcon } from "lucide-react";
import { calcularPercentual, formatarMoeda } from "@/utils/dashboardUtils";

interface StatItem {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color: string;
}

export const useStatsData = () => {
  const [stats, setStats] = useState<StatItem[]>([
    {
      title: "Vendas hoje",
      value: "R$ 0,00",
      change: "+0%",
      icon: DollarSign,
      color: "bg-green/10 text-green",
    },
    {
      title: "Pedidos",
      value: "0",
      change: "0%",
      icon: ShoppingCart,
      color: "bg-orange/10 text-orange",
    },
    {
      title: "Clientes",
      value: "0",
      change: "0%",
      icon: Users,
      color: "bg-navy/10 text-navy",
    },
    {
      title: "Faturamento mensal",
      value: "R$ 0,00",
      change: "0%",
      icon: TrendingUp,
      color: "bg-beige/30 text-navy",
    },
  ]);

  const updateStats = (ordersData: any) => {
    const { salesToday, ordersThisMonth, ordersLastMonth } = ordersData;

    const pedidosAtual = ordersThisMonth?.length || 0;
    const pedidosAnterior = ordersLastMonth?.length || 0;
    const pedidosChange = calcularPercentual(pedidosAnterior, pedidosAtual);

    const validCustomersThisMonth = ordersThisMonth?.filter((o: any) => o.customer_name !== null) || [];
    const validCustomersLastMonth = ordersLastMonth?.filter((o: any) => o.customer_name !== null) || [];
    
    const clientesUnicos = new Set(validCustomersThisMonth.map((o: any) => o.customer_name)).size;
    const clientesAnteriores = new Set(validCustomersLastMonth.map((o: any) => o.customer_name)).size;
    const clientesChange = calcularPercentual(clientesAnteriores, clientesUnicos);

    const faturamentoAtual = ordersThisMonth?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;
    const faturamentoAnterior = ordersLastMonth?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;
    const faturamentoChange = calcularPercentual(faturamentoAnterior, faturamentoAtual);

    setStats([
      {
        title: "Vendas hoje",
        value: formatarMoeda(salesToday),
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
  };

  return { stats, updateStats };
};
