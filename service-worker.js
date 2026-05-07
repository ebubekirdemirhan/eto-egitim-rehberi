/* ETO Rehber v1.6 — güncel HTML her zaman ağdan denenir; çevrimdışı yedek cache. */
const CACHE = 'eto-rehber-v1.6';

const PRECACHE = [
  './eto-egitim-rehberi.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './screenshot-mobile-1.png',
  './screenshot-mobile-2.png',
  './screenshot-desktop-1.png',
  './robots.txt',
  './sitemap.xml',
];

function isHtmlNavigation(req) {
  if (req.mode === 'navigate') return true;
  if (req.destination === 'document') return true;
  const accept = req.headers.get('accept');
  if (accept && accept.includes('text/html')) return true;
  try {
    const p = new URL(req.url).pathname;
    return /\.html?$/i.test(p);
  } catch (e) {
    return false;
  }
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('generativelanguage.googleapis.com')) return;
  if (e.request.url.includes('aistudio.google.com')) return;

  // Sayfa / HTML: önce ağ, başarısızsa cache (offline destek)
  if (isHtmlNavigation(e.request)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(cached => cached || new Response('Çevrimdışı', { status: 503 }))
        )
    );
    return;
  }

  // Diğer asset'ler: cache-first, sonra ağ (gemide net yokken yine açılsın)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
