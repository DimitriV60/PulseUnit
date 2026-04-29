const CACHE_NAME = 'pulseunit-v12';
const FILES_TO_CACHE = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Cross-origin (ex : Cloudflare Worker scanPlanning, Firestore, Gemini) :
  // ne pas intercepter — laisser le navigateur gérer nativement.
  // Sinon le SW peut casser les POST avec body (ex : "Failed to fetch" sur PWA).
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // index.html : toujours récupérer la dernière version depuis le réseau
  // → mise à jour automatique sans vider le cache
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // Autres fichiers (icônes, manifest) : cache en priorité
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Click sur notif système → focus/ouvre l'app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {};
  e.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    let client = allClients.find(c => c.url.includes(self.location.origin));
    if (client) {
      await client.focus();
      // Envoyer message au client pour gérer l'action ciblée
      try { client.postMessage({ type: 'notif-click', data }); } catch (err) {}
    } else {
      await clients.openWindow('/');
    }
  })());
});
