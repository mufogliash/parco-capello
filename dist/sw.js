/* Service worker: rende l'app utilizzabile offline.
   build.py sostituisce e301d64656 e [
 "./",
 "app.js",
 "dati/alberi-data.json",
 "fonts/fraunces-latin-400-italic.woff2",
 "fonts/fraunces-latin-400-normal.woff2",
 "fonts/fraunces-latin-600-normal.woff2",
 "fonts/karla-latin-400-normal.woff2",
 "fonts/karla-latin-700-normal.woff2",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/icon-maskable-512.png",
 "icons/icon.svg",
 "img/fagus-sylvatica-corteccia.jpg",
 "img/fagus-sylvatica-fiore_o_frutto.jpg",
 "img/fagus-sylvatica-foglia.jpg",
 "img/fagus-sylvatica-gemme.jpg",
 "img/fagus-sylvatica-silhouette.jpg",
 "img/pinus-pinea-corteccia.jpg",
 "img/pinus-pinea-fiore_o_frutto.jpg",
 "img/pinus-pinea-foglia.jpg",
 "img/pinus-pinea-silhouette.jpg",
 "img/quercus-ilex-corteccia.jpg",
 "img/quercus-ilex-fiore_o_frutto.jpg",
 "img/quercus-ilex-foglia-2.jpg",
 "img/quercus-ilex-foglia.jpg",
 "img/quercus-ilex-silhouette.jpg",
 "img/quercus-pubescens-corteccia.jpg",
 "img/quercus-pubescens-foglia.jpg",
 "img/quercus-pubescens-gemme.jpg",
 "img/quercus-pubescens-silhouette.jpg",
 "img/quercus-robur-corteccia.jpg",
 "img/quercus-robur-fiore_o_frutto.jpg",
 "img/quercus-robur-foglia.jpg",
 "img/quercus-robur-gemme.jpg",
 "img/quercus-robur-silhouette-2.jpg",
 "img/quercus-robur-silhouette.jpg",
 "index.html",
 "manifest.webmanifest",
 "style.css"
] a ogni build: una nuova versione = una nuova cache. */
const CACHE = 'parco-capello-e301d64656';
const FILES = [
 "./",
 "app.js",
 "dati/alberi-data.json",
 "fonts/fraunces-latin-400-italic.woff2",
 "fonts/fraunces-latin-400-normal.woff2",
 "fonts/fraunces-latin-600-normal.woff2",
 "fonts/karla-latin-400-normal.woff2",
 "fonts/karla-latin-700-normal.woff2",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/icon-maskable-512.png",
 "icons/icon.svg",
 "img/fagus-sylvatica-corteccia.jpg",
 "img/fagus-sylvatica-fiore_o_frutto.jpg",
 "img/fagus-sylvatica-foglia.jpg",
 "img/fagus-sylvatica-gemme.jpg",
 "img/fagus-sylvatica-silhouette.jpg",
 "img/pinus-pinea-corteccia.jpg",
 "img/pinus-pinea-fiore_o_frutto.jpg",
 "img/pinus-pinea-foglia.jpg",
 "img/pinus-pinea-silhouette.jpg",
 "img/quercus-ilex-corteccia.jpg",
 "img/quercus-ilex-fiore_o_frutto.jpg",
 "img/quercus-ilex-foglia-2.jpg",
 "img/quercus-ilex-foglia.jpg",
 "img/quercus-ilex-silhouette.jpg",
 "img/quercus-pubescens-corteccia.jpg",
 "img/quercus-pubescens-foglia.jpg",
 "img/quercus-pubescens-gemme.jpg",
 "img/quercus-pubescens-silhouette.jpg",
 "img/quercus-robur-corteccia.jpg",
 "img/quercus-robur-fiore_o_frutto.jpg",
 "img/quercus-robur-foglia.jpg",
 "img/quercus-robur-gemme.jpg",
 "img/quercus-robur-silhouette-2.jpg",
 "img/quercus-robur-silhouette.jpg",
 "index.html",
 "manifest.webmanifest",
 "style.css"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('parco-capello-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});
