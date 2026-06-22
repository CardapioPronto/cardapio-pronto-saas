const STORAGE_KEY = "pubfy:local-device:v1";

export type LocalDeviceInfo = {
  id: string;
  label: string;
  platform: string;
  browser: string;
  createdAt: string;
  lastSeenAt: string;
};

const createDeviceId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const detectPlatform = (userAgent: string) => {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/macintosh|mac os/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Navegador";
};

const detectBrowser = (userAgent: string) => {
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/OPR\//.test(userAgent)) return "Opera";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Safari\//.test(userAgent)) return "Safari";
  return "Browser";
};

const isValidDeviceInfo = (value: unknown): value is LocalDeviceInfo => {
  if (!value || typeof value !== "object") return false;
  const device = value as Partial<LocalDeviceInfo>;

  return typeof device.id === "string"
    && typeof device.label === "string"
    && typeof device.platform === "string"
    && typeof device.browser === "string"
    && typeof device.createdAt === "string";
};

export function getLocalDeviceInfo(): LocalDeviceInfo | null {
  if (typeof window === "undefined") return null;

  const now = new Date().toISOString();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isValidDeviceInfo(parsed)) {
        const next = { ...parsed, lastSeenAt: now };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      }
    }
  } catch {
    // Recreate the identifier below if localStorage contains invalid data.
  }

  const userAgent = window.navigator.userAgent;
  const platform = detectPlatform(userAgent);
  const browser = detectBrowser(userAgent);
  const device: LocalDeviceInfo = {
    id: createDeviceId(),
    label: `${platform} - ${browser}`,
    platform,
    browser,
    createdAt: now,
    lastSeenAt: now,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(device));
  } catch {
    return device;
  }

  return device;
}

export function getShortDeviceId(deviceId: string | null | undefined) {
  if (!deviceId) return "sem-id";
  return deviceId.slice(0, 8);
}
