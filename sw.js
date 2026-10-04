// Offline cache for both apps. Bump VERSION after deploying changes.
const VERSION = 'larp-v3';
const FILES = [
  './',
  './index.html',
  './shared/ios.css',
  './shared/ios.js',
  './nebula/',
  './nebula/app.css',
  './nebula/app.js',
  './nebula/manifest.webmanifest',
  './nebula/icon-180.png',
  './nebula/icon-192.png',
  './nebula/icon-512.png',
  './pocket/',
  './pocket/app.css',
  './pocket/app.js',
  './pocket/manifest.webmanifest',
  './pocket/icon-180.png',
  './pocket/icon-192.png',
  './pocket/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Serve from cache right away, then refresh the cache from the network in the background.
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(request, { ignoreSearch: true }).then(hit => {
      const fresh = fetch(request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || fresh;
    }),
  );
});
