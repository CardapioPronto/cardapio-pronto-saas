
// Types for dashboard data
export interface DashboardStats {
  totalPedidos: number;
  faturamento: number;
  itensVendidos: number;
  pedidosAbertos: number;
  ticketMedio: number;
  crescimentoPedidos: number;
  crescimentoFaturamento: number;
}

export interface RecentSale {
  id: string;
  customer: string;
  amount: number | null;
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

export interface DashboardOverview {
  restaurantName: string;
  isRestaurantActive: boolean | null;
  publicMenuSlug: string | null;
  totalProducts: number;
  availableProducts: number;
  unavailableProducts: number;
  totalCategories: number;
  openOrders: number;
  openOrdersToday: number;
  overdueOpenOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  totalTables: number;
  occupiedTables: number;
  reservedTables: number;
  unavailableTables: number;
  activeCoupons: number;
  expiringCoupons: number;
  activePromotions: number;
  whatsappInstances: number;
  whatsappConnectedInstances: number;
  whatsappNeedsAttention: number;
  waitingHuman: number;
  unreadMessages: number;
  menuThemeConfigured: boolean;
}
