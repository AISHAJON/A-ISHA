// A'ISHAJON — service worker: кэширует иконки/манифест и медиа для офлайна.
// Главный HTML всегда берём СНАЧАЛА из сети (чтобы новые версии сайта появлялись сразу),
// и только если сети нет — отдаём сохранённую копию.
const SHELL_CACHE = "aishajon-shell-v3";
const MEDIA_CACHE = "aishajon-media-v3";

const APP_SHELL = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
  "./favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isMedia =
    url.hostname.includes("supabase.co") ||
    /\.(mp3|m4a|aac|ogg|wav|mp4|mov|webm|jpg|jpeg|png|webp|gif)$/i.test(url.pathname);

  const isHTML =
    req.mode === "navigate" ||
    url.pathname.endsWith("index.html") ||
    url.pathname.endsWith("/");

  // Главная страница: сеть в приоритете, кэш — только как запасной вариант офлайн.
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            caches.open(SHELL_CACHE).then((cache) => cache.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => caches.open(SHELL_CACHE).then((cache) => cache.match(req)))
    );
    return;
  }

  // Фото/видео/музыка: кэш в приоритете (чтобы играло при плохом интернете), обновляем в фоне.
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

  // Иконки/манифест: кэш в приоритете, обновляем в фоне.
  if (APP_SHELL.some((f) => url.pathname.endsWith(f.replace("./", "")))) {
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
