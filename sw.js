// Offline cache for the budget app. Bump VERSION after changing any app file.
const VERSION = 'budget-v4';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Serve the app from the cache first so it opens with no signal, and refresh
// the cache in the background when online. Requests to Google are not touched.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Only the app's own files; anything else goes straight to the network.
  const scope = new URL(self.registration.scope).pathname;
  const rel = './' + url.pathname.slice(scope.length);
  if (req.mode !== 'navigate' && !FILES.includes(rel)) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, {ignoreSearch: true}) ||
                   (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    const network = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});
