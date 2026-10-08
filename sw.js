// Service worker: the whole app is precached, then always served from cache (cache-first),
// so it opens instantly and works offline. build.py replaces __VERSION__ with a hash of the
// app files; any change produces a new cache, which takes over on the next launch.
const VERSION = "__VERSION__";
const CACHE = "karticky-" + VERSION;
const FILES = __FILES__;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("karticky-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async c => {
      // Navigations always get the cached app shell, whatever the path or query string.
      const hit = req.mode === "navigate" ? await c.match("./index.html") : await c.match(req, { ignoreSearch: true });
      return hit || fetch(req);
    })
  );
});
