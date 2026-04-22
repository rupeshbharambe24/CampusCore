/**
 * CampusCore Service Worker
 *
 * Strategy:
 * - Precache the app shell (handled by Next.js build output)
 * - Runtime cache API GETs with stale-while-revalidate (5 min TTL)
 * - Skip cache for POST/PUT/DELETE/PATCH
 * - Offline fallback: serve cached pages when network fails
 */

const CACHE_NAME = 'campuscore-v1';
const API_CACHE = 'campuscore-api-v1';
const API_BASE = '/api/';

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/login',
        '/dashboard',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: stale-while-revalidate for API GETs, cache-first for app shell
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Skip non-GET (attendance submissions etc.)
  if (request.method !== 'GET') return;

  // API requests: stale-while-revalidate
  if (url.pathname.startsWith(API_BASE)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // App shell: cache-first, fallback to network
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).catch(() => {
        // For navigation requests, serve the cached root page
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
