const CACHE_NAME = 'icu-guardian-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Network-first strategy — always try live data, fall back to cache
self.addEventListener('fetch', (event) => {
  // Don't cache API calls (we want live data)
  if (event.request.url.includes('/patients') || event.request.url.includes('/health')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
