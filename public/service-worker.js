const SERVICE_WORKER_VERSION = "2026-06-18.pwa-advanced.1";
const APP_SHELL_CACHE = `pubfy-app-shell-${SERVICE_WORKER_VERSION}`;
const STATIC_ASSET_CACHE = `pubfy-static-assets-${SERVICE_WORKER_VERSION}`;
const MANAGED_CACHE_PREFIXES = ["pubfy-app-shell-", "pubfy-static-assets-"];

const APP_SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon-pubfy.png",
  "/pubfy-favicon.png",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) =>
              MANAGED_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix))
              && ![APP_SHELL_CACHE, STATIC_ASSET_CACHE].includes(cacheName),
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedRoot = await caches.match("/");
        return cachedRoot || Response.error();
      }),
    );
    return;
  }

  if (["script", "style", "font", "image", "manifest"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;

          const responseToCache = networkResponse.clone();
          caches.open(STATIC_ASSET_CACHE).then((cache) => {
            void cache.put(request, responseToCache);
          });

          return networkResponse;
        });
      }),
    );
  }
});

self.addEventListener("message", (event) => {
  const message = event.data || {};

  if (message.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (message.type !== "GET_PWA_STATUS") return;

  const response = {
    type: "PWA_STATUS",
    requestId: message.requestId,
    payload: {
      serviceWorkerVersion: SERVICE_WORKER_VERSION,
      appShellCache: APP_SHELL_CACHE,
      staticAssetCache: STATIC_ASSET_CACHE,
      appShellUrls: APP_SHELL_URLS,
    },
  };

  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage(response);
    return;
  }

  if (event.source) {
    event.source.postMessage(response);
  }
});
