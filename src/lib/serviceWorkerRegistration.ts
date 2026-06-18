import { createLogger } from "./log";

const log = createLogger("service-worker");

export const PWA_UPDATE_AVAILABLE_EVENT = "pubfy:pwa-update-available";

export type ServiceWorkerUpdateDetail = {
  registration: ServiceWorkerRegistration;
};

let currentRegistration: ServiceWorkerRegistration | null = null;

const notifyUpdateAvailable = (registration: ServiceWorkerRegistration) => {
  window.dispatchEvent(
    new CustomEvent<ServiceWorkerUpdateDetail>(PWA_UPDATE_AVAILABLE_EVENT, {
      detail: { registration },
    }),
  );
};

const watchForUpdates = (registration: ServiceWorkerRegistration) => {
  currentRegistration = registration;

  if (registration.waiting && navigator.serviceWorker.controller) {
    notifyUpdateAvailable(registration);
  }

  registration.addEventListener("updatefound", () => {
    const nextWorker = registration.installing;
    if (!nextWorker) return;

    nextWorker.addEventListener("statechange", () => {
      if (nextWorker.state === "installed" && navigator.serviceWorker.controller) {
        notifyUpdateAvailable(registration);
      }
    });
  });
};

export function activateWaitingServiceWorker() {
  currentRegistration?.waiting?.postMessage({ type: "SKIP_WAITING" });
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        watchForUpdates(registration);
        log.debug("service worker registrado", { scope: registration.scope });
      })
      .catch((error) => {
        log.warn("service worker nao registrado", { error });
      });
  });
}
