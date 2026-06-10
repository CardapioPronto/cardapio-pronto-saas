const REF_CODE_KEY = "pubfy_ref";
const REF_AT_KEY = "pubfy_ref_at";
const REF_COOKIE_MAX_AGE_DAYS = 90;

export type StoredReferralAttribution = {
  code: string;
  firstClickAt: string;
};

function normalizeReferralCode(raw: string | null | undefined) {
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return cleaned.length >= 4 ? cleaned : null;
}

function setCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === "undefined") return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const match = document.cookie.split("; ").find((row) => row.startsWith(prefix));
  if (!match) return null;
  return decodeURIComponent(match.slice(prefix.length));
}

export function persistReferralAttribution(code: string) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;

  const firstClickAt = new Date().toISOString();
  const payload: StoredReferralAttribution = { code: normalized, firstClickAt };

  try {
    localStorage.setItem(REF_CODE_KEY, normalized);
    localStorage.setItem(REF_AT_KEY, firstClickAt);
  } catch {
    // ignore quota / private mode
  }

  setCookie(REF_CODE_KEY, normalized, REF_COOKIE_MAX_AGE_DAYS);
  setCookie(REF_AT_KEY, firstClickAt, REF_COOKIE_MAX_AGE_DAYS);

  return payload;
}

export function readReferralAttribution(): StoredReferralAttribution | null {
  let code: string | null = null;
  let firstClickAt: string | null = null;

  try {
    code = localStorage.getItem(REF_CODE_KEY);
    firstClickAt = localStorage.getItem(REF_AT_KEY);
  } catch {
    // ignore
  }

  code = code ?? readCookie(REF_CODE_KEY);
  firstClickAt = firstClickAt ?? readCookie(REF_AT_KEY);

  const normalized = normalizeReferralCode(code);
  if (!normalized || !firstClickAt) return null;

  return { code: normalized, firstClickAt };
}

export function captureReferralFromSearch(search: string) {
  const params = new URLSearchParams(search);
  const ref = params.get("ref");
  if (!ref) return readReferralAttribution();
  return persistReferralAttribution(ref);
}

export function getReferralSignupMetadata(): Record<string, string> | null {
  const stored = readReferralAttribution();
  if (!stored) return null;
  return {
    referral_code: stored.code,
    referral_first_click_at: stored.firstClickAt,
  };
}

export function buildRestaurantSignupUrl(referralCode: string, origin = window.location.origin) {
  const code = normalizeReferralCode(referralCode);
  if (!code) return `${origin}/cadastro`;
  return `${origin}/cadastro?ref=${encodeURIComponent(code)}`;
}

export function applyReferralTemplate(
  template: string,
  values: { refLink: string; refCode: string },
) {
  return template
    .replaceAll("{{ref_link}}", values.refLink)
    .replaceAll("{{ref_code}}", values.refCode);
}
