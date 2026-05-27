// X/News Service Worker — handles background push notifications
const CACHE_NAME = 'xnews-v2';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Handle incoming push notifications
self.addEventListener('push', e => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch(err) { data = { title: 'X/News', body: e.data.text() }; }

  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || data.title,
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Read Story' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  e.waitUntil(self.registration.showNotification(data.title || 'X/News', options));
});

// Handle notification click — open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Background sync — check for new stories every 15 minutes
self.addEventListener('periodicsync', e => {
  if (e.tag === 'xnews-sync') {
    e.waitUntil(checkForNews());
  }
});

async function checkForNews() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const settingsRes = await cache.match('xnews-settings');
    if (!settingsRes) return;
    const settings = await settingsRes.json();
    if (!settings.notifEnabled) return;
    // Notify the main app to check for news
    const clientList = await clients.matchAll({ type: 'window' });
    clientList.forEach(client => client.postMessage({ type: 'CHECK_NEWS' }));
  } catch(e) {}
}
