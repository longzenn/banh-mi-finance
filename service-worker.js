const CACHE_NAME = 'banhmi-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install event - caching core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clearing old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serving assets with Cache First / Network Fallback, ignoring API calls
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do not intercept Supabase database API requests (we handle offline syncing in app.js)
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/rest/v1/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not cached, fetch from network
      return fetch(event.request).then((response) => {
        // Only cache valid GET responses
        if (!response || response.status !== 200 || (response.type !== 'basic' && !event.request.url.includes('fonts.cdnfonts.com'))) {
          return response;
        }

        // Clone response and cache it dynamically
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch((err) => {
        console.error('[Service Worker] Fetch failed:', err);
        // If it's a page navigation request, return index.html fallback
        if (event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
      });
    })
  );
});
