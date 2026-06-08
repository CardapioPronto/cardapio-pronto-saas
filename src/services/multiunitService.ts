import { supabase } from "@/lib/supabase";
import type {
  CreateRestaurantUnitInput,
  CreatedRestaurantUnit,
  MultiunitConsolidatedReport,
  RestaurantAccess,
  RestaurantAccessType,
  SyncGroupMenuInput,
  SyncGroupMenuResult,
} from "@/types/multiunit";

type RpcError = { message: string } | null;

type RpcClient = {
  (fn: "get_my_restaurant_access", args?: Record<string, never>): Promise<{
    data: unknown;
    error: RpcError;
  }>;
  (fn: "set_active_restaurant", args: { p_restaurant_id: string }): Promise<{
    data: unknown;
    error: RpcError;
  }>;
  (
    fn: "get_multiunit_consolidated_report",
    args: {
      p_restaurant_ids: string[] | null;
      p_from: string;
      p_to: string;
      p_include_financials: boolean;
    },
  ): Promise<{ data: unknown; error: RpcError }>;
  (
    fn: "set_restaurant_group_menu_matrix",
    args: {
      p_group_id: string;
      p_master_restaurant_id: string;
      p_menu_sync_enabled: boolean;
    },
  ): Promise<{ data: unknown; error: RpcError }>;
  (
    fn: "create_multiunit_restaurant",
    args: {
      p_group_id: string;
      p_name: string;
      p_phone: string | null;
      p_address: string | null;
      p_cnpj: string | null;
      p_category: string | null;
      p_email: string | null;
    },
  ): Promise<{ data: unknown; error: RpcError }>;
  (
    fn: "sync_restaurant_group_menu",
    args: {
      p_group_id: string;
      p_target_restaurant_ids: string[] | null;
      p_overwrite_existing: boolean;
    },
  ): Promise<{ data: unknown; error: RpcError }>;
};

const rpc = supabase.rpc.bind(supabase) as unknown as RpcClient;

const accessTypes = new Set<RestaurantAccessType>(["owner", "manager", "employee", "viewer"]);

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? value as Record<string, unknown> : {};

const asStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const asAccessType = (value: unknown): RestaurantAccessType =>
  typeof value === "string" && accessTypes.has(value as RestaurantAccessType)
    ? value as RestaurantAccessType
    : "employee";

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : [];

const optionalText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeAccess = (value: unknown): RestaurantAccess => {
  const row = asRecord(value);
  return {
    restaurant_id: String(row.restaurant_id ?? ""),
    restaurant_name: String(row.restaurant_name ?? "Restaurante"),
    restaurant_slug: asStringOrNull(row.restaurant_slug),
    access_type: asAccessType(row.access_type),
    is_active_unit: Boolean(row.is_active_unit),
    group_id: asStringOrNull(row.group_id),
    group_name: asStringOrNull(row.group_name),
    is_group_master: Boolean(row.is_group_master),
    menu_sync_enabled: Boolean(row.menu_sync_enabled),
    permissions: asStringArray(row.permissions),
  };
};

const normalizeReport = (value: unknown): MultiunitConsolidatedReport => {
  const row = asRecord(value);
  const summary = asRecord(row.summary);
  const period = asRecord(row.period);

  return {
    period: {
      from: String(period.from ?? ""),
      to: String(period.to ?? ""),
    },
    summary: {
      units: Number(summary.units ?? 0),
      revenue: Number(summary.revenue ?? 0),
      totalOrders: Number(summary.totalOrders ?? 0),
      finalizedOrders: Number(summary.finalizedOrders ?? 0),
      openOrders: Number(summary.openOrders ?? 0),
      activeProducts: Number(summary.activeProducts ?? 0),
      averageTicket: Number(summary.averageTicket ?? 0),
    },
    units: Array.isArray(row.units)
      ? row.units.map((unit) => {
          const item = asRecord(unit);
          return {
            id: String(item.id ?? ""),
            name: String(item.name ?? "Restaurante"),
            slug: asStringOrNull(item.slug),
            revenue: Number(item.revenue ?? 0),
            totalOrders: Number(item.totalOrders ?? 0),
            finalizedOrders: Number(item.finalizedOrders ?? 0),
            averageTicket: Number(item.averageTicket ?? 0),
            openOrders: Number(item.openOrders ?? 0),
            activeProducts: Number(item.activeProducts ?? 0),
          };
        })
      : [],
    daily: Array.isArray(row.daily)
      ? row.daily.map((daily) => {
          const item = asRecord(daily);
          return {
            date: String(item.date ?? ""),
            revenue: Number(item.revenue ?? 0),
            orders: Number(item.orders ?? 0),
          };
        })
      : [],
  };
};

export const getMyRestaurantAccess = async (): Promise<RestaurantAccess[]> => {
  const { data, error } = await rpc("get_my_restaurant_access", {});
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []).map(normalizeAccess).filter((item) => item.restaurant_id);
};

export const setActiveRestaurant = async (restaurantId: string): Promise<void> => {
  const { error } = await rpc("set_active_restaurant", { p_restaurant_id: restaurantId });
  if (error) throw new Error(error.message);
};

export const getMultiunitConsolidatedReport = async (input: {
  restaurantIds: string[] | null;
  from: Date;
  to: Date;
  includeFinancials?: boolean;
}): Promise<MultiunitConsolidatedReport> => {
  const { data, error } = await rpc("get_multiunit_consolidated_report", {
    p_restaurant_ids: input.restaurantIds,
    p_from: input.from.toISOString(),
    p_to: input.to.toISOString(),
    p_include_financials: input.includeFinancials ?? true,
  });

  if (error) throw new Error(error.message);
  return normalizeReport(data);
};

export const setRestaurantGroupMenuMatrix = async (input: {
  groupId: string;
  masterRestaurantId: string;
  menuSyncEnabled: boolean;
}): Promise<void> => {
  const { error } = await rpc("set_restaurant_group_menu_matrix", {
    p_group_id: input.groupId,
    p_master_restaurant_id: input.masterRestaurantId,
    p_menu_sync_enabled: input.menuSyncEnabled,
  });

  if (error) throw new Error(error.message);
};

export const createRestaurantUnit = async (
  input: CreateRestaurantUnitInput,
): Promise<CreatedRestaurantUnit> => {
  const { data, error } = await rpc("create_multiunit_restaurant", {
    p_group_id: input.groupId,
    p_name: input.name.trim(),
    p_phone: optionalText(input.phone),
    p_address: optionalText(input.address),
    p_cnpj: optionalText(input.cnpj),
    p_category: optionalText(input.category),
    p_email: optionalText(input.email),
  });

  if (error) throw new Error(error.message);

  const row = asRecord(data);
  const created: CreatedRestaurantUnit = {
    restaurant_id: String(row.restaurant_id ?? ""),
    restaurant_name: String(row.restaurant_name ?? input.name),
    group_id: asStringOrNull(row.group_id),
    group_name: asStringOrNull(row.group_name),
    owner_id: asStringOrNull(row.owner_id),
    created_by: asStringOrNull(row.created_by),
  };

  if (!created.restaurant_id) {
    throw new Error("A unidade foi criada, mas o retorno veio incompleto.");
  }

  return created;
};

export const syncRestaurantGroupMenu = async (
  input: SyncGroupMenuInput,
): Promise<SyncGroupMenuResult> => {
  const { data, error } = await rpc("sync_restaurant_group_menu", {
    p_group_id: input.groupId,
    p_target_restaurant_ids: input.targetRestaurantIds,
    p_overwrite_existing: input.overwriteExisting,
  });

  if (error) throw new Error(error.message);

  const row = asRecord(data);
  return {
    group_id: asStringOrNull(row.group_id),
    master_restaurant_id: asStringOrNull(row.master_restaurant_id),
    units_synced: Number(row.units_synced ?? 0),
    categories_created: Number(row.categories_created ?? 0),
    categories_updated: Number(row.categories_updated ?? 0),
    products_created: Number(row.products_created ?? 0),
    products_updated: Number(row.products_updated ?? 0),
    costs_synced: Number(row.costs_synced ?? 0),
    overwrite_existing: Boolean(row.overwrite_existing),
  };
};
