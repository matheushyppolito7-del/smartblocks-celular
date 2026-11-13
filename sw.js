// Service worker da casca: guarda a casca (não os dados) para abrir rápido e sem internet. As chamadas ao /exec nunca passam pelo cache.
const CASCA = "sb-casca-v1", ARQS = ["./", "index.html", "casca.js", "manifest.webmanifest", "icone-192.png", "icone-180.png", "icone-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CASCA).then(c => c.addAll(ARQS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("sb-casca-") && k !== CASCA).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // /exec e fontes: direto na rede
  // casca: rede primeiro (pega a versão nova), cache se estiver sem internet
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CASCA).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
