
import { useCallback, useState } from "react";
import { DollarSign, PackageCheck, ShoppingCart, TrendingUp, LucideIcon } from "lucide-react";
import { formatarMoeda } from "@/utils/dashboardUtils";
import { DashboardStats } from "@/services/dashboardService";

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
      title: "Pedidos (30 dias)",
      value: "0",
      change: "Aguardando dados",
      icon: ShoppingCart,
      color: "bg-orange/10 text-orange",
    },
    {
      title: "Faturamento (30 dias)",
      value: "R$ 0,00",
      change: "Aguardando dados",
      icon: DollarSign,
      color: "bg-green/10 text-green",
    },
    {
      title: "Itens vendidos",
      value: "0",
      change: "Últimos 30 dias",
      icon: PackageCheck,
      color: "bg-navy/10 text-navy",
    },
    {
      title: "Pedidos em aberto",
      value: "0",
      change: "Operação atual",
      icon: TrendingUp,
      color: "bg-beige/30 text-navy",
    },
  ]);

  const updateStats = useCallback((dashboardStats: DashboardStats, canViewFinancials: boolean) => {
    const { 
      totalPedidos, 
      faturamento, 
      itensVendidos,
      pedidosAbertos,
      ticketMedio,
      crescimentoPedidos, 
      crescimentoFaturamento 
    } = dashboardStats;

    const pedidosChange = crescimentoPedidos > 0 ? `+${crescimentoPedidos.toFixed(0)}%` : `${crescimentoPedidos.toFixed(0)}%`;
    const faturamentoChange = crescimentoFaturamento > 0 ? `+${crescimentoFaturamento.toFixed(0)}%` : `${crescimentoFaturamento.toFixed(0)}%`;

    setStats([
      {
        title: "Pedidos (30 dias)",
        value: totalPedidos.toString(),
        change: `${pedidosChange} vs. período anterior`,
        icon: ShoppingCart,
        color: "bg-orange/10 text-orange",
      },
      {
        title: "Faturamento (30 dias)",
        value: canViewFinancials ? formatarMoeda(faturamento) : "Restrito",
        change: canViewFinancials ? `${faturamentoChange} vs. período anterior` : "Permissão financeira necessária",
        icon: DollarSign,
        color: "bg-green/10 text-green",
      },
      {
        title: "Itens vendidos",
        value: itensVendidos.toString(),
        change: canViewFinancials ? `Ticket médio ${formatarMoeda(ticketMedio)}` : "Últimos 30 dias",
        icon: PackageCheck,
        color: "bg-navy/10 text-navy",
      },
      {
        title: "Pedidos em aberto",
        value: pedidosAbertos.toString(),
        change: pedidosAbertos > 0 ? "Precisam de acompanhamento" : "Operação em dia",
        icon: TrendingUp,
        color: "bg-beige/30 text-navy",
      },
    ]);
  }, []);

  return { stats, updateStats };
};
