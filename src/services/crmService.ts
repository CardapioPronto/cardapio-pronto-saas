import { supabase, getCurrentRestaurantId } from "@/lib/supabase";
import {
  CrmCustomerDetail,
  CrmLeadCaptureResult,
  CrmCustomerProfilePatch,
  CrmCustomersResponse,
  CrmSegment,
} from "@/types/crm";

const EMPTY_METRICS = {
  total_customers: 0,
  with_marketing_opt_in: 0,
  recurring_customers: 0,
  inactive_customers: 0,
  total_spent: 0,
  average_ticket: 0,
};

function normalizeCustomersResponse(value: unknown): CrmCustomersResponse {
  const data = (value ?? {}) as Partial<CrmCustomersResponse>;

  return {
    total: Number(data.total ?? 0),
    customers: Array.isArray(data.customers) ? data.customers : [],
    metrics: {
      ...EMPTY_METRICS,
      ...(data.metrics ?? {}),
    },
  };
}

function normalizeCustomerDetail(value: unknown): CrmCustomerDetail {
  const data = value as Partial<CrmCustomerDetail> | null;
  if (!data?.customer) {
    throw new Error("Cliente não encontrado.");
  }

  return {
    customer: data.customer,
    orders: Array.isArray(data.orders) ? data.orders : [],
  };
}

async function requireRestaurantId() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    throw new Error("Restaurante não encontrado.");
  }
  return restaurantId;
}

export async function listCrmCustomers(params: {
  search?: string;
  segment?: CrmSegment;
  limit?: number;
  offset?: number;
} = {}): Promise<CrmCustomersResponse> {
  const restaurantId = await requireRestaurantId();
  const { data, error } = await supabase.rpc("get_restaurant_crm_customers", {
    p_restaurant_id: restaurantId,
    p_search: params.search || null,
    p_segment: params.segment || "all",
    p_limit: params.limit ?? 100,
    p_offset: params.offset ?? 0,
  });

  if (error) throw error;
  return normalizeCustomersResponse(data);
}

export async function getCrmCustomerDetail(phoneNormalized: string): Promise<CrmCustomerDetail> {
  const restaurantId = await requireRestaurantId();
  const { data, error } = await supabase.rpc("get_restaurant_crm_customer_detail", {
    p_restaurant_id: restaurantId,
    p_phone_normalized: phoneNormalized,
    p_limit: 20,
  });

  if (error) throw error;
  return normalizeCustomerDetail(data);
}

export async function updateCrmCustomerProfile(
  phoneNormalized: string,
  patch: CrmCustomerProfilePatch,
) {
  const restaurantId = await requireRestaurantId();
  const { data, error } = await supabase.rpc("update_crm_customer_profile", {
    p_restaurant_id: restaurantId,
    p_phone_normalized: phoneNormalized,
    p_patch: patch as unknown as Record<string, unknown>,
  });

  if (error) throw error;
  return data;
}

export async function captureCrmLeadFromOrder(
  orderId: string,
  options: { acceptsMarketing?: boolean | null; source?: string | null } = {},
): Promise<CrmLeadCaptureResult> {
  const { data, error } = await supabase.rpc("capture_crm_lead_from_order", {
    p_order_id: orderId,
    p_accepts_marketing: options.acceptsMarketing ?? null,
    p_source: options.source ?? null,
  });

  if (error) throw error;
  return data as unknown as CrmLeadCaptureResult;
}
