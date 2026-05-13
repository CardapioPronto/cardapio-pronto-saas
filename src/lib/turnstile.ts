/**
 * Helpers para Cloudflare Turnstile (captcha invisível).
 *
 * O site key é público por design (o segredo fica na Edge Function via
 * `TURNSTILE_SECRET_KEY`). Por isso embutimos o valor no bundle, igual
 * fazemos com o DSN público do Sentry e a anon key do Supabase. Quando
 * `VITE_TURNSTILE_SITE_KEY` está definida (ex.: deploy self-hosted ou
 * outro ambiente), ela tem prioridade.
 *
 * Documentação: https://developers.cloudflare.com/turnstile/
 */

const PUBFY_TURNSTILE_SITE_KEY = "0x4AAAAAADOIDZPsdtgjL24I";

export const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function getTurnstileSiteKey(): string {
  const fromEnv = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  if (fromEnv) return fromEnv;
  return PUBFY_TURNSTILE_SITE_KEY;
}

type TurnstileOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible" | "invisible";
  appearance?: "always" | "execute" | "interaction-only";
  action?: string;
};

type TurnstileApi = {
  render: (container: HTMLElement | string, options: TurnstileOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
  ready: (cb: () => void) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile só pode ser carregado no browser."));
  }
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile-loader="true"]',
    );
    const handleReady = () => {
      if (!window.turnstile) {
        reject(new Error("Turnstile não inicializou após carregar o script."));
        return;
      }
      window.turnstile.ready(() => resolve(window.turnstile as TurnstileApi));
    };

    if (existing) {
      existing.addEventListener("load", handleReady, { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar Turnstile.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.turnstileLoader = "true";
    script.addEventListener("load", handleReady, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Falha ao carregar Turnstile.")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return scriptPromise;
}
