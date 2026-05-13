import { useCallback, useEffect, useRef } from "react";
import { createLogger } from "@/lib/log";
import { getTurnstileSiteKey, loadTurnstile } from "@/lib/turnstile";

const log = createLogger("turnstile");

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void;
  action?: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  className?: string;
};

/**
 * Renderiza o widget Cloudflare Turnstile e devolve o token ao pai
 * via `onToken`. O token vira `null` quando expira/falha — quem chamou
 * pode bloquear o submit nesse caso.
 */
export function TurnstileWidget({
  onToken,
  action,
  theme = "auto",
  size = "flexible",
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const emitToken = useCallback((token: string | null) => {
    onTokenRef.current(token);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let removeId: string | null = null;

    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: getTurnstileSiteKey(),
          action,
          theme,
          size,
          callback: (token) => emitToken(token),
          "error-callback": () => emitToken(null),
          "expired-callback": () => emitToken(null),
          "timeout-callback": () => emitToken(null),
        });
        removeId = widgetIdRef.current;
      })
      .catch((error) => {
        log.capture(error, { action: "turnstile_load" });
      });

    return () => {
      cancelled = true;
      if (removeId && window.turnstile) {
        try {
          window.turnstile.remove(removeId);
        } catch (error) {
          log.capture(error, { action: "turnstile_remove" });
        }
      }
      widgetIdRef.current = null;
    };
  }, [action, theme, size, emitToken]);

  return <div ref={containerRef} className={className} />;
}
