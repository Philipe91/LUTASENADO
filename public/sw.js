// Service worker do República Kombat (só no site próprio / PWA; nos portais não é registrado).
// O build (plugin rk-sw do vite.config.js) troca a versão e a lista de precache.
//   · página: rede primeiro (versão nova assim que publicar), cache se offline
//   · JS/CSS com hash: cache primeiro (o nome muda quando o conteúdo muda)
//   · resto (GLB, retratos, draco, fontes): devolve do cache e atualiza por trás (stale-while-revalidate)
const VERSION = '__RK_VERSION__';
const CACHE = `rk-${VERSION}`;
const PRECACHE = [/*__RK_PRECACHE__*/];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rk-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // SDKs de portal, anúncios: nunca passam pelo cache
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return res; })
      .catch(() => caches.match('./')));
    return;
  }
  const hashed = /\/assets\/[^/]+-[\w-]{8,}\.(js|css)$/.test(url.pathname);
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req);
    const net = fetch(req).then((res) => { if (res.ok && res.status === 200) c.put(req, res.clone()); return res; });
    if (hit) { if (!hashed) net.catch(() => {}); return hit; }
    return net;
  }));
});
