const CACHE_NAME = 'prompt-claude-v2';
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

// Logic for persistent notifications
let nagInterval = null;
let mainTimer = null;

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  stopAllNagging();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data.action === 'scheduleNotification') {
    const { delay, pattern } = event.data;
    
    // Clear any existing timers first (Fixes Zombie bug)
    stopAllNagging();

    mainTimer = setTimeout(() => {
      showNotification(pattern);
    }, delay);
  }

  if (event.data.action === 'cancelNotification') {
    stopAllNagging();
  }
});

function stopAllNagging() {
  if (mainTimer) {
    clearTimeout(mainTimer);
    mainTimer = null;
  }
  if (nagInterval) {
    clearInterval(nagInterval);
    nagInterval = null;
  }
}

async function showNotification(pattern) {
  const options = {
    body: 'Prompt Claude',
    icon: '/logo.png',
    vibrate: pattern || [200, 100, 200],
    tag: 'prompt-claude-reminder',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'interact', title: 'I did it!' }
    ]
  };

  await self.registration.showNotification('Prompt Claude!', options);

  // Start nagging every 10 minutes if not already nagging
  if (!nagInterval) {
    nagInterval = setInterval(async () => {
      await self.registration.showNotification('Prompt Claude!', {
        ...options,
        body: 'Prompt Claude (STILL WAITING)',
        vibrate: options.vibrate,
      });
    }, 10 * 60 * 1000); // 10 minutes
  }
}

self.addEventListener('notificationclose', (event) => {
  // We keep nagging until they click or interact
});
