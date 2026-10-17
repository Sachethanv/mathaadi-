// Maathaadi service worker: app shell offline, cached phrase audio, never caches turns.
const VERSION = "v1";
const SHELL = `maathaadi-shell-${VERSION}`;
const AUDIO = `maathaadi-audio-${VERSION}`;
const PRECACHE = ["/", "/offline", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![SHELL, AUDIO].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Fixed-phrase audio: cache first.
  if (url.pathname === "/api/tts") {
    e.respondWith(
      caches.open(AUDIO).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.status === 200) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }
  if (url.pathname.startsWith("/api/")) return;

  // Pages: network first, fall back to cache, then the offline screen.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/offline"))),
    );
    return;
  }

  // Static assets: stale while revalidate.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.open(SHELL).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((res) => {
          if (res.ok) c.put(req, res.clone());
          return res;
        });
        return hit || net;
      }),
    );
  }
});
