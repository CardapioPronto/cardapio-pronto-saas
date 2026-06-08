const STORAGE_PREFIX = "pubfy_cart_session:";

function createSessionToken() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getCartAbandonmentSessionToken(restaurantId: string): string {
  if (typeof window === "undefined") return "";

  const key = `${STORAGE_PREFIX}${restaurantId}`;
  const existing = sessionStorage.getItem(key);
  if (existing && existing.length >= 8) return existing;

  return rotateCartAbandonmentSessionToken(restaurantId);
}

export function rotateCartAbandonmentSessionToken(restaurantId: string): string {
  if (typeof window === "undefined") return "";

  const key = `${STORAGE_PREFIX}${restaurantId}`;
  const token = createSessionToken();
  try {
    sessionStorage.setItem(key, token);
  } catch {
    /* ignore */
  }

  return token;
}
