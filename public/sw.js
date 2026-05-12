const CACHE_NAME = 'prompt-claude-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/style.css',
  '/logo.png',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  // Dynamic caching for fonts
  if (event.request.url.includes('fonts.gstatic.com') || event.request.url.includes('fonts.googleapis.com')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchRes) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

// Primary notification logic has been moved to native Capacitor LocalNotifications plugin
// in src/main.js for better reliability on Android.
