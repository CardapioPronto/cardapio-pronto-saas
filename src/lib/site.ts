/** URL canônico do site (sem barra final). Configure `VITE_PUBLIC_SITE_URL` em deploy self-hosted. */
export function getSiteOrigin(): string {
  const fromEnv = typeof import.meta.env.VITE_PUBLIC_SITE_URL === "string"
    ? import.meta.env.VITE_PUBLIC_SITE_URL.trim().replace(/\/$/, "")
    : "";
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://pubfy.com.br";
}

export function absoluteUrl(path: string): string {
  const base = getSiteOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
