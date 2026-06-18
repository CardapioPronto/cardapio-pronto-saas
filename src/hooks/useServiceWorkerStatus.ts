import { useCallback, useEffect, useState } from "react";

import {
  PWA_UPDATE_AVAILABLE_EVENT,
  type ServiceWorkerUpdateDetail,
  activateWaitingServiceWorker,
} from "@/lib/serviceWorkerRegistration";

const STATUS_TIMEOUT_MS = 3_000;

type ServiceWorkerPWAStatus = {
  serviceWorkerVersion: string;
  appShellCache: string;
  staticAssetCache: string;
  appShellUrls: string[];
};

type ServiceWorkerStatus = {
  supported: boolean;
  registered: boolean;
  controlled: boolean;
  scope: string | null;
  updateAvailable: boolean;
  activatingUpdate: boolean;
  checkedAt: string | null;
  pwaStatus: ServiceWorkerPWAStatus | null;
};

const initialStatus: ServiceWorkerStatus = {
  supported: typeof navigator !== "undefined" && "serviceWorker" in navigator,
  registered: false,
  controlled: false,
  scope: null,
  updateAvailable: false,
  activatingUpdate: false,
  checkedAt: null,
  pwaStatus: null,
};

const requestPWAStatus = async (
  worker: ServiceWorker | null,
): Promise<ServiceWorkerPWAStatus | null> => {
  if (!worker) return null;

  return new Promise((resolve) => {
    const requestId = `pwa-status-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = new MessageChannel();
    const timeoutId = window.setTimeout(() => {
      channel.port1.close();
      resolve(null);
    }, STATUS_TIMEOUT_MS);

    channel.port1.onmessage = (event: MessageEvent) => {
      if (event.data?.type !== "PWA_STATUS" || event.data?.requestId !== requestId) return;

      window.clearTimeout(timeoutId);
      channel.port1.close();
      resolve(event.data.payload as ServiceWorkerPWAStatus);
    };

    worker.postMessage({ type: "GET_PWA_STATUS", requestId }, [channel.port2]);
  });
};

export function useServiceWorkerStatus() {
  const [status, setStatus] = useState<ServiceWorkerStatus>(initialStatus);

  const refreshStatus = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      setStatus((current) => ({
        ...current,
        supported: false,
        registered: false,
        controlled: false,
        checkedAt: new Date().toISOString(),
      }));
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    const worker = navigator.serviceWorker.controller ?? registration?.active ?? null;
    const pwaStatus = await requestPWAStatus(worker);

    setStatus((current) => ({
      ...current,
      supported: true,
      registered: Boolean(registration),
      controlled: Boolean(navigator.serviceWorker.controller),
      scope: registration?.scope ?? null,
      updateAvailable: Boolean(registration?.waiting) || current.updateAvailable,
      checkedAt: new Date().toISOString(),
      pwaStatus: pwaStatus ?? current.pwaStatus,
    }));
  }, []);

  const activateUpdate = useCallback(() => {
    setStatus((current) => ({ ...current, activatingUpdate: true }));
    activateWaitingServiceWorker();
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleUpdateAvailable = (event: Event) => {
      const detail = (event as CustomEvent<ServiceWorkerUpdateDetail>).detail;
      setStatus((current) => ({
        ...current,
        registered: true,
        scope: detail?.registration?.scope ?? current.scope,
        updateAvailable: true,
      }));
    };

    const handleControllerChange = () => {
      void refreshStatus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshStatus();
    };

    window.addEventListener(PWA_UPDATE_AVAILABLE_EVENT, handleUpdateAvailable);
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void navigator.serviceWorker.ready.then(() => refreshStatus());
    void refreshStatus();

    return () => {
      window.removeEventListener(PWA_UPDATE_AVAILABLE_EVENT, handleUpdateAvailable);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshStatus]);

  useEffect(() => {
    if (!status.activatingUpdate) return;

    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange, {
      once: true,
    });

    return () => {
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
    };
  }, [status.activatingUpdate]);

  return {
    ...status,
    refreshStatus,
    activateUpdate,
  };
}
