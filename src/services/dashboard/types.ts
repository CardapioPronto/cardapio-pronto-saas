
// Types for dashboard data
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
