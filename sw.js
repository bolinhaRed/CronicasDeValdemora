/* Service worker: guarda os ficheiros para jogar sem internet. */
const CACHE = 'cronicas-v4';
const FICHEIROS = ['./', 'index.html', 'css/style.css', 'js/rng.js', 'js/data.js', 'js/gen.js', 'js/engine.js', 'js/save.js', 'js/ui.js', 'js/art.js', 'js/sfx.js', 'js/fichas.js', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHEIROS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    if (resp.ok && new URL(e.request.url).origin === location.origin) { const c = resp.clone(); caches.open(CACHE).then(cc => cc.put(e.request, c)); }
    return resp;
  }).catch(() => caches.match('index.html'))));
});
