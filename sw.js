const CACHE_NAME = "bombas-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles.css",
  "./ui-overrides.css",
  "./auth.css",
  "./pump-documents.css",
  "./auth.js",
  "./pwa-controls.js",
  "./app.js",
  "./flow-config-autosave.js",
  "./alert-notifications.js",
  "./spanish-date-fix.js",
  "./plant-notes-actions.js",
  "./incident-actions.js",
  "./predictive-engine.js",
  "./predictive-chat.js",
  "./pump-upload-only.js",
  "./assets/masol-cartagena-biofuel.png",
  "./assets/pwa-icon-192.png",
  "./assets/pwa-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("bombas-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match("./index.html");
        throw new Error("Recurso no disponible sin conexión.");
      }),
  );
});
