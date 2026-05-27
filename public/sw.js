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

// Primary notification logic for web/PWA is handled via Service Worker messaging.
// The Service Worker now supports scheduling and cancelling notifications for the web version.

// Global ID for the scheduled timeout (used for "nagging" reminders)
let nagTimeoutId = null;

// Simple IndexedDB wrapper for persisting nag state
const DB_NAME = 'nag-db';
const STORE_NAME = 'state';
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveState(key, value) {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(value, key);
  return tx.complete;
}
async function loadState(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

self.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data || !data.type) return;
  switch (data.type) {
    case 'schedule':
      // data.delay is milliseconds until notification
      if (nagTimeoutId) clearTimeout(nagTimeoutId);
      nagTimeoutId = setTimeout(() => {
        self.registration.showNotification('Prompt Claude!', {
          body: 'Time to check in with Claude!',
          requireInteraction: true,
        });
        // Clear persisted state after firing
        saveState('scheduled', false);
        nagTimeoutId = null;
      }, data.delay);
      await saveState('scheduled', true);
      await saveState('delay', data.delay);
      break;
    case 'cancel':
      if (nagTimeoutId) clearTimeout(nagTimeoutId);
      nagTimeoutId = null;
      await saveState('scheduled', false);
      break;
    case 'restore':
      // Called on activate to recover any pending schedule after a restart
      const scheduled = await loadState('scheduled');
      const delay = await loadState('delay');
      if (scheduled && typeof delay === 'number') {
        // Re‑schedule using remaining delay (approximate, as precise remaining time is lost)
        nagTimeoutId = setTimeout(() => {
          self.registration.showNotification('Prompt Claude!', {
            body: 'Time to check in with Claude!',
            requireInteraction: true,
          });
          saveState('scheduled', false);
          nagTimeoutId = null;
        }, delay);
      }
      break;
    default:
      // ignore unknown messages
  }
});

// On activation, attempt to restore any persisted schedule
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Claim clients so we can receive messages immediately
    await self.clients.claim();
    // Restore any pending notification schedule
    self.dispatchEvent(new MessageEvent('message', { data: { type: 'restore' } }));
  })());
});
