const CACHE_NAME = "masol-bombas-pwa-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20260901-intuitive-controls",
  "./auth.css?v=20260826-shared-login",
  "./pwa.js?v=20260901-pwa-controls",
  "./auth.js?v=20260901-cfplus-alarm-13",
  "./manifest.webmanifest",
  "./app-icon.svg?v=20260901-corporate-pump",
  "./assets/masol-cartagena-biofuel.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))),
  );
});
