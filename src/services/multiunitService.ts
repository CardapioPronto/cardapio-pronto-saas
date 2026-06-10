import { supabase } from "@/lib/supabase";
import type {
  ApplyStaffAccessInput,
  ApplyStaffAccessResult,
  CreateRestaurantUnitInput,
  CreatedRestaurantUnit,
  MultiunitConsolidatedReport,
  MultiunitReadiness,
  MultiunitReadinessCheck,
  MultiunitReadinessStatus,
  MultiunitStaffMember,
  RestaurantGroupStaff,
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
  (
    fn: "get_restaurant_group_staff",
    args: { p_group_id: string },
  ): Promise<{ data: unknown; error: RpcError }>;
  (
    fn: "apply_restaurant_group_staff_access",
    args: {
      p_group_id: string;
      p_source_employee_id: string;
      p_target_restaurant_ids: string[];
      p_is_active: boolean;
    },
  ): Promise<{ data: unknown; error: RpcError }>;
  (
    fn: "get_restaurant_group_readiness",
    args: { p_group_id: string },
  ): Promise<{ data: unknown; error: RpcError }>;
};

const rpc = supabase.rpc.bind(supabase) as unknown as RpcClient;

const accessTypes = new Set<RestaurantAccessType>(["owner", "manager", "employee", "viewer"]);
const readinessStatuses = new Set<MultiunitReadinessStatus>(["ready", "attention", "critical"]);

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

const asReadinessStatus = (value: unknown): MultiunitReadinessStatus =>
  typeof value === "string" && readinessStatuses.has(value as MultiunitReadinessStatus)
    ? value as MultiunitReadinessStatus
    : "critical";

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

const normalizeStaffMember = (value: unknown): MultiunitStaffMember => {
  const row = asRecord(value);
  return {
    user_id: String(row.user_id ?? ""),
    source_employee_id: String(row.source_employee_id ?? ""),
    employee_name: String(row.employee_name ?? "Colaborador"),
    employee_email: String(row.employee_email ?? ""),
    user_type: asAccessType(row.user_type),
    source_restaurant_id: String(row.source_restaurant_id ?? ""),
    source_restaurant_name: String(row.source_restaurant_name ?? "Unidade"),
    permissions: asStringArray(row.permissions),
    units: Array.isArray(row.units)
      ? row.units.map((unit) => {
          const item = asRecord(unit);
          return {
            employee_id: String(item.employee_id ?? ""),
            restaurant_id: String(item.restaurant_id ?? ""),
            restaurant_name: String(item.restaurant_name ?? "Unidade"),
            user_type: asAccessType(item.user_type),
            is_active: Boolean(item.is_active),
            permissions: asStringArray(item.permissions),
          };
        }).filter((unit) => unit.employee_id && unit.restaurant_id)
      : [],
  };
};

const normalizeReadinessCheck = (value: unknown): MultiunitReadinessCheck => {
  const row = asRecord(value);
  return {
    ok: Boolean(row.ok),
    label: String(row.label ?? "Item"),
    detail: String(row.detail ?? ""),
  };
};

const normalizeReadiness = (value: unknown): MultiunitReadiness => {
  const row = asRecord(value);
  const summary = asRecord(row.summary);

  return {
    group_id: asStringOrNull(row.group_id),
    group_name: asStringOrNull(row.group_name),
    summary: {
      units: Number(summary.units ?? 0),
      ready_units: Number(summary.ready_units ?? 0),
      attention_units: Number(summary.attention_units ?? 0),
      critical_units: Number(summary.critical_units ?? 0),
      average_score: Number(summary.average_score ?? 0),
    },
    units: Array.isArray(row.units)
      ? row.units.map((unit) => {
          const item = asRecord(unit);
          const checksRecord = asRecord(item.checks);
          const checks = Object.fromEntries(
            Object.entries(checksRecord).map(([key, check]) => [key, normalizeReadinessCheck(check)]),
          );

          return {
            restaurant_id: String(item.restaurant_id ?? ""),
            restaurant_name: String(item.restaurant_name ?? "Unidade"),
            score: Number(item.score ?? 0),
            status: asReadinessStatus(item.status),
            missing: asStringArray(item.missing),
            checks,
          };
        }).filter((unit) => unit.restaurant_id)
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

export const getRestaurantGroupStaff = async (groupId: string): Promise<RestaurantGroupStaff> => {
  const { data, error } = await rpc("get_restaurant_group_staff", {
    p_group_id: groupId,
  });

  if (error) throw new Error(error.message);

  const row = asRecord(data);
  return {
    group_id: asStringOrNull(row.group_id),
    group_name: asStringOrNull(row.group_name),
    staff: Array.isArray(row.staff)
      ? row.staff.map(normalizeStaffMember).filter((member) => member.source_employee_id)
      : [],
  };
};

export const applyRestaurantGroupStaffAccess = async (
  input: ApplyStaffAccessInput,
): Promise<ApplyStaffAccessResult> => {
  const { data, error } = await rpc("apply_restaurant_group_staff_access", {
    p_group_id: input.groupId,
    p_source_employee_id: input.sourceEmployeeId,
    p_target_restaurant_ids: input.targetRestaurantIds,
    p_is_active: input.isActive ?? true,
  });

  if (error) throw new Error(error.message);

  const row = asRecord(data);
  return {
    group_id: asStringOrNull(row.group_id),
    source_employee_id: asStringOrNull(row.source_employee_id),
    targets_count: Number(row.targets_count ?? 0),
    employees_created: Number(row.employees_created ?? 0),
    employees_updated: Number(row.employees_updated ?? 0),
    permissions_synced: Number(row.permissions_synced ?? 0),
  };
};

export const getRestaurantGroupReadiness = async (groupId: string): Promise<MultiunitReadiness> => {
  const { data, error } = await rpc("get_restaurant_group_readiness", {
    p_group_id: groupId,
  });

  if (error) throw new Error(error.message);
  return normalizeReadiness(data);
};
