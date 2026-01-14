/**
 * Bubble Zap 3D - Service Worker
 * Enables offline functionality and PWA installation
 */

const CACHE_VERSION = 'bubble-zap-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}-assets`;

// Static assets to cache on install
const STATIC_ASSETS = [
  './',
  './index.html',
  './js/game.js',
  './js/bubble-utils.js',
  './js/specialbubbles.js',
  './js/hazards.js',
  './js/soundtrack.js',
  './js/audio-manager.js',
  './js/version.js',
  './audio/pop.wav',
  './audio/fail.wav',
  './audio/soundtrack-level-0.wav',
  './audio/soundtrack-level-1.wav',
  './audio/soundtrack-level-2.wav',
  './audio/soundtrack-level-3.wav',
  './audio/soundtrack-level-4.wav',
  './audio/soundtrack-level-5.wav',
  './audio/soundtrack-level-6.wav',
  './audio/soundtrack-level-7.wav',
  './audio/soundtrack-level-8.wav',
  './audio/soundtrack-level-9.wav',
  './data/levels.json',
  './data/specialbubbles.json',
  './data/hazards.json',
  './data/config.json',
  './assets/manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'
];

/**
 * Service Worker install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Service Worker: Some assets failed to cache:', err);
        // Continue even if some assets fail to cache (e.g., CDN might be unreachable)
      });
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

/**
 * Service Worker activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  // Claim all clients immediately
  return self.clients.claim();
});

/**
 * Service Worker fetch event - serve from cache, fall back to network
 * This implements a "Cache First, Network Fallback" strategy
 */
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if available
      if (response) {
        return response;
      }

      // Otherwise, fetch from network and cache it
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If fetch fails and we have no cache, return offline page
          console.warn('Service Worker: Fetch failed for', event.request.url);
          // You could return a custom offline page here
          throw new Error('Network request failed and no cache available');
        });
    })
  );
});
