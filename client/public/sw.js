// Trend Pilot Service Worker - PWA Support
// Bump CACHE_NAME on any logic change so old cached shells are dropped.
const CACHE_NAME = 'trend-pilot-v6';
const urlsToCache = ['/manifest.json', '/favicon.png'];

// Install service worker and cache lightweight static assets only (not HTML —
// HTML must stay fresh so new JS bundles load after each deploy).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log('Service Worker: Cache failed', err);
      })
  );
  self.skipWaiting();
});

// Activate service worker and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.port === '24678' || url.pathname.includes('@vite')) {
    return;
  }

  // API: always hit the network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  const isDocument =
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    (request.headers.get('accept') || '').includes('text/html');

  // HTML / SPA shell: network-first so deploys show the new UI immediately
  if (isDocument) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Hashed JS/CSS/images: cache-first for offline/speed
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch((error) => {
          console.warn('Service Worker fetch failed:', error);
          throw error;
        });
    })
  );
});
