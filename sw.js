// A'ISHAJON — service worker: кэширует оболочку приложения и медиа для работы при плохом интернете
const SHELL_CACHE = "aishajon-shell-v1";
const MEDIA_CACHE = "aishajon-media-v1";

const SHELL_FILES = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
  "./favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== MEDIA_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Стратегия: оболочка — cache-first с обновлением в фоне.
// Медиа с Firebase Storage (фото/музыка) — cache-first, чтобы играло даже при плохом интернете.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isMedia =
    url.hostname.includes("firebasestorage") ||
    url.hostname.includes("firebasestorage.googleapis.com") ||
    /\.(mp3|m4a|aac|ogg|wav|jpg|jpeg|png|webp|gif)$/i.test(url.pathname);

  if (isMedia) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) {
          fetch(req)
            .then((res) => res && res.ok && cache.put(req, res.clone()))
            .catch(() => {});
          return cached;
        }
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        } catch (e) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  if (SHELL_FILES.some((f) => url.pathname.endsWith(f.replace("./", "")))) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
