/* Wolfsmond – Service Worker: macht die Seite installierbar und hält Hülle, Cover und Icons vor.
   Anfragen an Supabase (Anmeldung, Texte, Fortschritt) und CDNs laufen unverändert durchs Netz. */
const CACHE = "wolfsmond-v5";
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
    // Seiten: immer frisch beim Server nachfragen (am HTTP-Cache vorbei), offline aus dem Zwischenspeicher
    e.respondWith(fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(put)
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
  } else if (url.pathname.includes("/img/") || url.pathname.includes("/icons/")) {
    // Cover und Icons: aus dem Zwischenspeicher, sonst laden (Cover tragen ?v=… bei Änderungen)
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(put)));
  }
});

/* Push-Nachrichten (seit 21.10.2026 Markus, seit 22.10.2026 auch die Leserin): Anzeige und Klick → App öffnen */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Wolfsmond", {
    body: d.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: d.tag || "wm", data: { url: d.url || "lesen.html" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "lesen.html", self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) if (c.url.includes("lesen.html")) { c.navigate(url).catch(() => {}); return c.focus(); }
    return clients.openWindow(url);
  }));
});
