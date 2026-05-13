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
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function resolveTurnstileApi(resolve: (api: TurnstileApi) => void, reject: (e: Error) => void) {
  let settled = false;
  const ok = (api: TurnstileApi) => {
    if (settled) return;
    settled = true;
    resolve(api);
  };
  const fail = (message: string) => {
    if (settled) return;
    settled = true;
    reject(new Error(message));
  };

  const tryAttach = (): boolean => {
    const api = window.turnstile;
    if (api?.render) {
      ok(api as TurnstileApi);
      return true;
    }
    return false;
  };

  queueMicrotask(() => {
    if (tryAttach()) return;
    requestAnimationFrame(() => {
      if (tryAttach()) return;
      window.setTimeout(() => {
        if (tryAttach()) return;
        fail("Turnstile não inicializou após carregar o script.");
      }, 50);
    });
  });
}

/**
 * Cloudflare documenta que não se deve usar `turnstile.ready()` se o script
 * `api.js` for carregado com `async` ou `defer`. Carregamos sem esses atributos
 * e, após o evento `load`, resolvemos assim que `window.turnstile.render` existir.
 *
 * Referência: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile só pode ser carregado no browser."));
  }
  if (window.turnstile?.render) return Promise.resolve(window.turnstile as TurnstileApi);

  const staleLoader = document.querySelector<HTMLScriptElement>(
    'script[data-turnstile-loader="true"]',
  );
  if (staleLoader && (staleLoader.async || staleLoader.defer)) {
    staleLoader.remove();
    scriptPromise = null;
  }

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile-loader="true"]',
    );

    const afterScriptLoaded = () => {
      resolveTurnstileApi(resolve, reject);
    };

    if (existing) {
      if (window.turnstile?.render) {
        resolve(window.turnstile as TurnstileApi);
        return;
      }
      existing.addEventListener("load", afterScriptLoaded, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Falha ao carregar Turnstile.")),
        { once: true },
      );
      queueMicrotask(afterScriptLoaded);
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.dataset.turnstileLoader = "true";
    script.addEventListener("load", afterScriptLoaded, { once: true });
    script.addEventListener("error", () => reject(new Error("Falha ao carregar Turnstile.")), {
      once: true,
    });
    document.head.appendChild(script);
  });

  return scriptPromise.catch((err) => {
    scriptPromise = null;
    throw err;
  });
}
