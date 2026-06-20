const CACHE_NAME = 'iub-portal-v1';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Installs and caches assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activates the service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fallback fetch handler to satisfy PWA installation criteria
self.addEventListener('fetch', (event) => {
  // Let Supabase API traffic and standard app routing bypass local caching
  if (event.request.url.includes('supabase.co') || event.request.mode === 'navigate') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
