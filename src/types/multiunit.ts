export type RestaurantAccessType = "owner" | "manager" | "employee" | "viewer";

export type RestaurantAccess = {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string | null;
  access_type: RestaurantAccessType;
  is_active_unit: boolean;
  group_id: string | null;
  group_name: string | null;
  is_group_master: boolean;
  menu_sync_enabled: boolean;
  permissions: string[];
};

export type MultiunitSummary = {
  units: number;
  revenue: number;
  totalOrders: number;
  finalizedOrders: number;
  openOrders: number;
  activeProducts: number;
  averageTicket: number;
};

export type MultiunitUnitReport = {
  id: string;
  name: string;
  slug: string | null;
  revenue: number;
  totalOrders: number;
  finalizedOrders: number;
  averageTicket: number;
  openOrders: number;
  activeProducts: number;
};

export type MultiunitDailyReport = {
  date: string;
  revenue: number;
  orders: number;
};

export type MultiunitConsolidatedReport = {
  period: {
    from: string;
    to: string;
  };
  summary: MultiunitSummary;
  units: MultiunitUnitReport[];
  daily: MultiunitDailyReport[];
};
