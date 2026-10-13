/* Çevrimdışı çalışma: sayfa ve veri önce ağdan, yazı tipleri ve kütüphaneler önce önbellekten */
const CACHE = "lsq-v1";
const CORE = ["./", "index.html", "css/app.css", "js/icons.js", "data/prices.js", "data/config.js", "js/core.js", "js/quote.js", "js/manage.js", "js/export-pdf.js", "js/export-docx.js", "js/app.js", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const heavy = /\/(vendor|fonts)\//.test(req.url);
  if (heavy) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })));
    return;
  }
  e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; }).catch(() => caches.match(req)));
});
