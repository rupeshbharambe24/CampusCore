// CampusCore Service Worker — minimal version
// Purposely does NOT cache pages (Next.js middleware handles redirects that break SW caching).
// Will be expanded with Workbox when offline support is implemented.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear any previously cached pages
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Pass all requests through to the network — no interception
// This ensures middleware redirects work correctly
