const CACHE_NAME = 'co2-footprint-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/daten.html',
  '/kontakt.html',
  '/styles.css',
  '/script.js',
  '/security.js',
  '/assets/logo.svg'
];

// Installation des Service Workers
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Aktivierung und Cache-Cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch-Strategie: Network-First mit Cache-Fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
}); 