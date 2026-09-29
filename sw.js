/* Wolfsmond – Service Worker: macht die Seite installierbar und hält Hülle, Cover und Icons vor.
   Anfragen an Supabase (Anmeldung, Texte, Fortschritt) und CDNs laufen unverändert durchs Netz. */
const CACHE = "wolfsmond-v1";
const SHELL = ["./", "./index.html", "./lesen.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  const put = res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
    // Seiten: immer zuerst frisch aus dem Netz, offline aus dem Zwischenspeicher
    e.respondWith(fetch(req).then(put).catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
  } else if (url.pathname.includes("/img/") || url.pathname.includes("/icons/")) {
    // Cover und Icons: aus dem Zwischenspeicher, sonst laden (Cover tragen ?v=… bei Änderungen)
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(put)));
  }
});
