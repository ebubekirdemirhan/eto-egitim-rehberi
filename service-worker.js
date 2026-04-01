/* ETO Rehber v1.2 — güncel HTML her zaman ağdan denenir; çevrimdışı yedek cache. */
const CACHE = 'eto-rehber-v1.2';

const PRECACHE = ['./eto-egitim-rehberi.html', './manifest.json'];

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

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('generativelanguage.googleapis.com')) return;

  // Sayfa / HTML: önce ağ (yeni asistan özellikleri güncellenince mobil de görür), yoksa cache
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
