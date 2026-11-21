// Guarda la app en el celular para que abra sin internet.
// Al subir una versión nueva, cambiá el número de VERSION.
const VERSION = "caja-v2";
const ARCHIVOS = ["./", "./index.html", "./app.js", "./firebase-config.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
const ESPERA_RED = 3000; // si la red tarda más de 3 segundos, usa lo guardado

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Primero intenta la versión más nueva; sin internet (o si tarda), abre lo guardado en el celular.
// Los datos de Firebase no pasan por acá: Firebase tiene su propia memoria en el celular.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const clave = req.mode === "navigate" ? "./index.html" : req;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const red = fetch(req).then(r => { if (r && r.ok) cache.put(clave, r.clone()); return r; });
    const guardado = await cache.match(clave, { ignoreSearch: true });
    if (!guardado) return red.catch(() => new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }));
    const tiempo = new Promise(res => setTimeout(() => res(guardado), ESPERA_RED));
    e.waitUntil(red.catch(() => null));
    return Promise.race([red.then(r => (r && r.ok) ? r : guardado).catch(() => guardado), tiempo]);
  }));
});
