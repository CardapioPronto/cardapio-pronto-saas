const STORAGE_PREFIX = "pubfy_checkout_pending:";

export type PendingCheckout = {
  client_request_id: string;
  order_id: string;
  tracking_id: string;
  delivery_order_id: string | null;
  order_number: string | null;
  fulfillment_type: string;
  total?: number;
};

export function createClientRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function storageKey(restaurantId: string) {
  return `${STORAGE_PREFIX}${restaurantId}`;
}

export function readPendingCheckout(restaurantId: string): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(storageKey(restaurantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckout;
    if (!parsed?.client_request_id || !parsed?.order_id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingCheckout(restaurantId: string, pending: PendingCheckout): void {
  try {
    sessionStorage.setItem(storageKey(restaurantId), JSON.stringify(pending));
  } catch {
    // sessionStorage indisponível — segue sem cache local
  }
}

export function clearPendingCheckout(restaurantId: string): void {
  try {
    sessionStorage.removeItem(storageKey(restaurantId));
  } catch {
    // ignore
  }
}
