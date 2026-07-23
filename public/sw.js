const CACHE_NAME = 'cashmoney-pwa-v3';

// Hanya cache asset statis, BUKAN halaman HTML
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/maskable_icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore jika ada asset yang gagal diload saat install
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // JANGAN intercept:
  // 1. Request non-GET
  // 2. File internal Next.js (_next/) - selalu ambil dari network
  // 3. Dokumen HTML (navigasi halaman)
  // 4. API call
  // 5. Chrome extension / external URLs
  if (
    event.request.method !== 'GET' ||
    url.includes('/_next/') ||
    url.includes('/api/') ||
    !url.startsWith(self.location.origin) ||
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    return; // Biarkan browser handle sendiri (network-first)
  }

  // Untuk asset statis non-HTML (gambar, manifest, icons): cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
            return networkResponse;
          }
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback silent jika offline dan tidak ada cache
          return new Response('', { status: 408 });
        });
    })
  );
});
