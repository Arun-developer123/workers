const CACHE_NAME = "kaamlink-cache-v2";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/default-avatar.png",
  OFFLINE_URL
];

// Install - pre-cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

// Activate - cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
      await self.clients.claim();
    })()
  );
});

// helper: is navigation request
function isNavigationRequest(req) {
  return req.mode === "navigate" || (req.method === "GET" && req.headers.get("accept")?.includes("text/html"));
}

// Fetch handler
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // For navigation (HTML) => Network first, fallback to cache -> offline page
  if (isNavigationRequest(req)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(req);
          // update cache with fresh HTML
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, networkResponse.clone()).catch(() => {});
          return networkResponse;
        } catch (err) {
          // network failed -> try cache -> offline.html
          const cacheResponse = await caches.match(req);
          if (cacheResponse) return cacheResponse;
          return caches.match(OFFLINE_URL);
        }
      })()
    );
    return;
  }

  // For images -> Cache first
  if (req.destination === "image") {
    event.respondWith(
      caches.match(req).then((resp) => {
        return resp || fetch(req).then((fetchResp) => {
          return caches.open(CACHE_NAME).then((cache) => {
            // try cache put, ignore errors
            try { cache.put(req, fetchResp.clone()); } catch(e){}
            return fetchResp;
          });
        }).catch(() => caches.match("/default-avatar.png"));
      })
    );
    return;
  }

  // For JS/CSS -> Stale-while-revalidate style
  if (req.destination === "script" || req.destination === "style") {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req).then((res) => {
          caches.open(CACHE_NAME).then((cache) => {
            try { cache.put(req, res.clone()); } catch(e){}
          });
          return res;
        }).catch(() => {});
        return cached || networkFetch;
      })
    );
    return;
  }

  // Default fetch behavior (network first, fallback cache)
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
