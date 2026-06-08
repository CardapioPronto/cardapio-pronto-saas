import { useSyncExternalStore } from "react";
import { supabase, supabaseAnonKey, supabaseUrl } from "@/integrations/supabase/client";

const CHECK_INTERVAL_MS = 15_000;
const CHECK_TIMEOUT_MS = 5_000;

type NetworkStatusSnapshot = {
  isOnline: boolean;
  isChecking: boolean;
  lastCheckedAt: string | null;
};

const listeners = new Set<() => void>();
let status: NetworkStatusSnapshot = {
  isOnline: false,
  isChecking: true,
  lastCheckedAt: null,
};
let intervalId: number | null = null;
let currentCheck: Promise<boolean> | null = null;

const emit = () => {
  listeners.forEach((listener) => listener());
};

const updateStatus = (next: Partial<NetworkStatusSnapshot>) => {
  const updated = { ...status, ...next };
  const shouldDisconnectRealtime = next.isOnline === false;
  const shouldReconnectRealtime = next.isOnline === true && status.isOnline === false;

  if (shouldDisconnectRealtime) {
    void supabase.realtime.disconnect();
  } else if (shouldReconnectRealtime) {
    supabase.realtime.connect();
  }

  if (
    updated.isOnline === status.isOnline
    && updated.isChecking === status.isChecking
    && updated.lastCheckedAt === status.lastCheckedAt
  ) {
    return;
  }

  status = updated;
  emit();
};

export function checkNetworkConnectivity(): Promise<boolean> {
  if (currentCheck) return currentCheck;

  updateStatus({ isChecking: true });

  currentCheck = (async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/health?ts=${Date.now()}`, {
        method: "GET",
        headers: {
          apikey: supabaseAnonKey,
        },
        cache: "no-store",
        signal: controller.signal,
      });
      const isOnline = response.ok;
      updateStatus({
        isOnline,
        isChecking: false,
        lastCheckedAt: new Date().toISOString(),
      });
      return isOnline;
    } catch {
      updateStatus({
        isOnline: false,
        isChecking: false,
        lastCheckedAt: new Date().toISOString(),
      });
      return false;
    } finally {
      window.clearTimeout(timeoutId);
      currentCheck = null;
    }
  })();

  return currentCheck;
}

const handleOffline = () => {
  updateStatus({
    isOnline: false,
    isChecking: false,
    lastCheckedAt: new Date().toISOString(),
  });
};

const handlePotentialReconnect = () => {
  void checkNetworkConnectivity();
};

const handleVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    void checkNetworkConnectivity();
  }
};

const startMonitoring = () => {
  if (typeof window === "undefined" || intervalId !== null) return;

  window.addEventListener("online", handlePotentialReconnect);
  window.addEventListener("offline", handleOffline);
  window.addEventListener("focus", handlePotentialReconnect);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  intervalId = window.setInterval(() => {
    void checkNetworkConnectivity();
  }, CHECK_INTERVAL_MS);

  void checkNetworkConnectivity();
};

const stopMonitoring = () => {
  if (typeof window === "undefined" || intervalId === null) return;

  window.clearInterval(intervalId);
  intervalId = null;
  window.removeEventListener("online", handlePotentialReconnect);
  window.removeEventListener("offline", handleOffline);
  window.removeEventListener("focus", handlePotentialReconnect);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  startMonitoring();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopMonitoring();
  };
};

const getSnapshot = () => status;

const getServerSnapshot = (): NetworkStatusSnapshot => ({
  isOnline: false,
  isChecking: true,
  lastCheckedAt: null,
});

export function useNetworkStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
