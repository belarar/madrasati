// Service Worker for Ben Naama School Digital Platform
const CACHE_NAME = 'ben-naama-v6';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/favicon.ico',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first for HTML, JS, CSS, and bypass SW completely for live /api/ requests
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Let browser handle live API calls directly without Service Worker wrapping
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Only use Cache-First for static image/icon/font/manifest assets
  const isStaticMedia =
    url.pathname === '/manifest.json' ||
    /\.(?:png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf)$/i.test(url.pathname);

  if (isStaticMedia) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation, HTML, JS, TS, CSS: always Network-First
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
