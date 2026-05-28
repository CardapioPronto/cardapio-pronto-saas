export type CrmSegment =
  | "all"
  | "new"
  | "recurring"
  | "inactive"
  | "high_ticket"
  | "marketing"
  | "no_orders";

export interface CrmCustomer {
  phone_normalized: string;
  name: string;
  email: string | null;
  accepts_marketing: boolean;
  tags: string[];
  notes: string | null;
  birth_date: string | null;
  source: string | null;
  orders_count: number;
  finalized_orders_count: number;
  total_spent: number;
  avg_ticket: number;
  first_order_at: string | null;
  last_order_at: string | null;
  last_source: string | null;
  sources: string[];
}

export interface CrmMetrics {
  total_customers: number;
  with_marketing_opt_in: number;
  recurring_customers: number;
  inactive_customers: number;
  total_spent: number;
  average_ticket: number;
}

export interface CrmCustomersResponse {
  total: number;
  customers: CrmCustomer[];
  metrics: CrmMetrics;
}

export interface CrmOrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  observations: string | null;
}

export interface CrmCustomerOrder {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total: number;
  source: string | null;
  order_type: string;
  payment_method: string | null;
  items: CrmOrderItem[];
}

export interface CrmCustomerDetail {
  customer: CrmCustomer;
  orders: CrmCustomerOrder[];
}

export interface CrmCustomerProfilePatch {
  name?: string | null;
  email?: string | null;
  birth_date?: string | null;
  tags?: string[];
  notes?: string | null;
  accepts_marketing?: boolean | null;
  source?: string;
}

export interface CrmLeadCaptureResult {
  captured: boolean;
  reason?: string;
  order_id?: string;
  source?: string;
}
