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

export type CreateRestaurantUnitInput = {
  groupId: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  cnpj?: string | null;
  category?: string | null;
  email?: string | null;
};

export type CreatedRestaurantUnit = {
  restaurant_id: string;
  restaurant_name: string;
  group_id: string | null;
  group_name: string | null;
  owner_id: string | null;
  created_by: string | null;
};

export type SyncGroupMenuInput = {
  groupId: string;
  targetRestaurantIds: string[] | null;
  overwriteExisting: boolean;
};

export type SyncGroupMenuResult = {
  group_id: string | null;
  master_restaurant_id: string | null;
  units_synced: number;
  categories_created: number;
  categories_updated: number;
  products_created: number;
  products_updated: number;
  costs_synced: number;
  overwrite_existing: boolean;
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
