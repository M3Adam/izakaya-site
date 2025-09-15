// sw.js（安定版）
const VERSION = "v2";              // ← キャッシュ更新時は v3, v4 と上げる
const PRECACHE = ["./", "./index.html"]; // 必ず存在する最低限だけ

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(
      PRECACHE.map(async (url) => {
        const resp = await fetch(url, { cache: "reload" });
        if (resp.ok) await cache.put(url, resp.clone());
      })
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// HTML（ナビゲーション）はネット優先／失敗したら index.html を返す
// 画像等の静的資産はキャッシュ優先＋裏で更新
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");

  if (isHTML) {
    e.respondWith((async () => {
      try { return await fetch(req); }
      catch {
        const cache = await caches.open(VERSION);
        return (await cache.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req);
    if (cached) {
      fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); }).catch(()=>{});
      return cached;
    }
    const net = await fetch(req);
    if (net.ok) cache.put(req, net.clone());
    return net;
  })());
});
