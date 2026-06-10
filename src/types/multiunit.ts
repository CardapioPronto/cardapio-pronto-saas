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

export type MultiunitStaffUnit = {
  employee_id: string;
  restaurant_id: string;
  restaurant_name: string;
  user_type: RestaurantAccessType;
  is_active: boolean;
  permissions: string[];
};

export type MultiunitStaffMember = {
  user_id: string;
  source_employee_id: string;
  employee_name: string;
  employee_email: string;
  user_type: RestaurantAccessType;
  source_restaurant_id: string;
  source_restaurant_name: string;
  permissions: string[];
  units: MultiunitStaffUnit[];
};

export type RestaurantGroupStaff = {
  group_id: string | null;
  group_name: string | null;
  staff: MultiunitStaffMember[];
};

export type ApplyStaffAccessInput = {
  groupId: string;
  sourceEmployeeId: string;
  targetRestaurantIds: string[];
  isActive?: boolean;
};

export type ApplyStaffAccessResult = {
  group_id: string | null;
  source_employee_id: string | null;
  targets_count: number;
  employees_created: number;
  employees_updated: number;
  permissions_synced: number;
};

export type MultiunitReadinessStatus = "ready" | "attention" | "critical";

export type MultiunitReadinessCheck = {
  ok: boolean;
  label: string;
  detail: string;
};

export type MultiunitUnitReadiness = {
  restaurant_id: string;
  restaurant_name: string;
  score: number;
  status: MultiunitReadinessStatus;
  missing: string[];
  checks: Record<string, MultiunitReadinessCheck>;
};

export type MultiunitReadiness = {
  group_id: string | null;
  group_name: string | null;
  summary: {
    units: number;
    ready_units: number;
    attention_units: number;
    critical_units: number;
    average_score: number;
  };
  units: MultiunitUnitReadiness[];
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
