const CACHE_NAME = "quiz-pwa-v7-mobile-hero-tune";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./quiz-data.js",
  "./manifest.webmanifest",
  "./reset-cache.html",
  "./assets/hero.webp",
  "./assets/football-hero.webp",
  "./assets/icons/favicon.ico",
  "./assets/icons/favicon-16x16.png",
  "./assets/icons/favicon-32x32.png",
  "./assets/icons/favicon-48x48.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-72x72.png",
  "./assets/icons/icon-96x96.png",
  "./assets/icons/icon-128x128.png",
  "./assets/icons/icon-144x144.png",
  "./assets/icons/icon-152x152.png",
  "./assets/icons/icon-192x192.png",
  "./assets/icons/icon-384x384.png",
  "./assets/icons/icon-512x512.png",
  "./assets/icons/maskable-icon-192x192.png",
  "./assets/icons/maskable-icon-512x512.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  if (["script", "style", "document"].includes(request.destination)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) return cache.match(fallbackUrl);
    throw new Error("No network response and no cached fallback available.");
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}
