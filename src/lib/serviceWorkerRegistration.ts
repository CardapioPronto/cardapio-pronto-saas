import { createLogger } from "./log";

const log = createLogger("service-worker");

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        log.debug("service worker registrado", { scope: registration.scope });
      })
      .catch((error) => {
        log.warn("service worker nao registrado", { error });
      });
  });
}
