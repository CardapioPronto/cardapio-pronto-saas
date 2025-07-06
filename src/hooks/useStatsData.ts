
import { useState } from "react";
import { DollarSign, ShoppingCart, TrendingUp, Users, LucideIcon } from "lucide-react";
import { formatarMoeda } from "@/utils/dashboardUtils";

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

  const updateStats = (dashboardStats: any) => {
    const { 
      totalPedidos, 
      faturamento, 
      produtosMaisVendidos, 
      crescimentoPedidos, 
      crescimentoFaturamento 
    } = dashboardStats;

    const pedidosChange = crescimentoPedidos > 0 ? `+${crescimentoPedidos.toFixed(0)}%` : `${crescimentoPedidos.toFixed(0)}%`;
    const faturamentoChange = crescimentoFaturamento > 0 ? `+${crescimentoFaturamento.toFixed(0)}%` : `${crescimentoFaturamento.toFixed(0)}%`;

    setStats([
      {
        title: "Pedidos (30 dias)",
        value: totalPedidos.toString(),
        change: pedidosChange,
        icon: ShoppingCart,
        color: "bg-orange/10 text-orange",
      },
      {
        title: "Faturamento (30 dias)",
        value: formatarMoeda(faturamento),
        change: faturamentoChange,
        icon: DollarSign,
        color: "bg-green/10 text-green",
      },
      {
        title: "Produtos Vendidos",
        value: produtosMaisVendidos.toString(),
        change: "0%",
        icon: TrendingUp,
        color: "bg-navy/10 text-navy",
      },
      {
        title: "Avaliação Média",
        value: "4.5",
        change: "0%",
        icon: Users,
        color: "bg-beige/30 text-navy",
      },
    ]);
  };

  return { stats, updateStats };
};
