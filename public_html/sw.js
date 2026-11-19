// Service Worker para cache mínimo offline (somente leitura) conforme PRD v2.1
const SHELL_CACHE = 'btc-shell-v17';
const API_CACHE = 'btc-api-v2';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/css/style.css',
  '/assets/js/boot.js',
  '/assets/js/app.js',
  '/assets/js/core/device.js',
  '/assets/js/core/embassies-data.js',
  '/assets/js/core/html.js',
  '/assets/js/core/store.js',
  '/assets/js/core/api.js',
  '/assets/js/core/i18n.js',
  '/assets/js/core/router.js',
  '/assets/js/core/destinations-data.js',
  '/assets/js/views/brazil-map-svg.js',
  '/assets/js/views/home.js',
  '/assets/js/views/phrase-card.js',
  '/assets/js/views/phrasebook.js',
  '/assets/js/views/emergency.js',
  '/assets/js/views/itineraries.js',
  '/assets/js/views/arrival.js',
  '/assets/js/views/money.js',
  '/assets/js/views/entry.js',
  '/assets/js/views/food.js',
  '/assets/js/views/ebook.js',
  '/assets/js/views/concierge.js',
  '/assets/js/views/auth.js',
  '/assets/js/views/account.js',
  '/assets/js/views/soon.js',
  '/assets/i18n/en.json',
  '/assets/i18n/es.json',
  '/assets/i18n/pt.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== SHELL_CACHE && k !== API_CACHE) {
            return caches.delete(k);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Apenas métodos GET são cacheados
  if (e.request.method !== 'GET') {
    return;
  }

  // Rotas de conteúdo da API que o turista pode precisar offline:
  // /api/phrasebook, /api/itineraries, /api/rates, /api/guides/*, /api/food-guide
  if (
    url.pathname.startsWith('/api/phrasebook') ||
    url.pathname.startsWith('/api/itineraries') ||
    url.pathname.startsWith('/api/rates') ||
    url.pathname.startsWith('/api/guides') ||
    url.pathname.startsWith('/api/food-guide')
  ) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(API_CACHE).then((cache) => cache.put(e.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(e.request);
          if (cached) {
            // Adiciona header sinalizando origem do cache
            const headers = new Headers(cached.headers);
            headers.set('X-From-Cache', '1');
            return new Response(cached.body, {
              status: cached.status,
              statusText: cached.statusText,
              headers,
            });
          }
          return new Response(JSON.stringify({ error: { code: 'offline' } }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }

  // Demais requisições de API não são cacheadas (ex: /api/me, /api/auth)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Assets do app shell (Network First para desenvolvimento/atualizações com fallback para cache offline)
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse.ok && (url.pathname.startsWith('/assets/') || url.pathname === '/' || url.pathname === '/index.html')) {
          const clone = networkResponse.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(e.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(e.request))
  );
});

