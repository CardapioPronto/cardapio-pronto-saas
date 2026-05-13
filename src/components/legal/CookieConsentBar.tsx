import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "pubfy_cookie_consent_v1";

export function CookieConsentBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore quota */
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      data-testid="cookie-consent"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-beige bg-white/95 px-4 py-4 shadow-lg backdrop-blur md:px-6"
    >
      <div className="container mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green/15 text-green">
            <Cookie className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p id="cookie-consent-title" className="font-semibold text-navy">
              Cookies e dados no seu navegador
            </p>
            <p id="cookie-consent-desc" className="mt-1 text-sm leading-relaxed text-navy/70">
              Usamos cookies e armazenamento local necessários para sessão, segurança e
              experiência (ex.: confirmação de preferências). Saiba mais na nossa{" "}
              <Link to="/cookies" className="font-medium text-green underline-offset-4 hover:underline">
                Política de Cookies
              </Link>{" "}
              e{" "}
              <Link to="/privacidade" className="font-medium text-green underline-offset-4 hover:underline">
                Privacidade
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/cookies">Detalhes</Link>
          </Button>
          <Button type="button" size="sm" className="bg-green text-white hover:bg-green-dark" onClick={accept}>
            Entendi e continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
