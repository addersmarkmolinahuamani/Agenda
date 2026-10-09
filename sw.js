// Service Worker con estrategia Network-First para actualizaciones inmediatas
const CACHE_NAME = 'agenda-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=2',
  './app.js?v=2',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Ignorar peticiones a Supabase o CDN
  if (e.request.url.includes('supabase.co') || e.request.url.includes('jsdelivr')) {
    return;
  }

  // Network-First: busca siempre la versión más reciente en GitHub
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(e.request))
  );
});
