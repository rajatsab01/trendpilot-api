// Trend Pilot Service Worker - PWA Support
const CACHE_NAME = 'trend-pilot-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
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
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Network-first strategy for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests to prevent breaking 3rd party scripts (Phone.Email, Razorpay, etc)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip Vite HMR websocket connecting path
  if (url.port === '24678' || url.pathname.includes('@vite')) {
    return;
  }

  // API: always hit the network — never cache /api (stale tokens, saved lists, user profile).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request)
          .then((response) => {
            // Don't cache if not a valid response
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
            // Return a basic fallback response or just fail gracefully
            throw error;
          });
      })
  );
});
