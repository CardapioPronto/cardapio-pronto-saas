const STORAGE_PREFIX = "pubfy_cart_session:";

export function getCartAbandonmentSessionToken(restaurantId: string): string {
  if (typeof window === "undefined") return "";

  const key = `${STORAGE_PREFIX}${restaurantId}`;
  const existing = localStorage.getItem(key);
  if (existing && existing.length >= 8) return existing;

  const token = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

  try {
    localStorage.setItem(key, token);
  } catch {
    /* ignore */
  }

  return token;
}
