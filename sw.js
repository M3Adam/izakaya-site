// sw.js（安定版）
const VERSION = "v4";              // ← キャッシュ更新時は v3, v4 と上げる
const PRECACHE = ["./", "./index.html"]; // 必ず存在する最低限だけ

// sw.js v3 — sitemap/robots/verification を Service Worker の対象外にする

const CACHE = 'emura-cache-v4';
const ASSETS = [
  './',                // トップ
  './index.html',
];

// インストール：主要アセットを事前キャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 有効化：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// フェッチ：XML/TXT/検証ファイルは“完全に素通し”
// それ以外は HTMLは network-first（オフライン時はindex.html）
// 静的リソースは stale-while-revalidate 風
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // GitHub Pages配下だけを対象に（他オリジンは触らない）
  if (url.origin !== location.origin) return;

  const accept = event.request.headers.get('accept') || '';
  const path = url.pathname;

  // ★★ ここが重要：GSCに必要なファイルは一切触らない（デフォルトのネットワークへ）
  const isXmlOrTxt =
    path.endsWith('/sitemap.xml') ||
    path.endsWith('/robots.txt') ||
    /\/google[a-z0-9]+\.html$/i.test(path) ||     // GSCのHTML確認ファイル
    accept.includes('application/xml') ||
    accept.includes('text/xml') ||
    accept.includes('text/plain');

  if (isXmlOrTxt) {
    return; // respondWithしない＝SWが介入せず、そのままネットワークへ
  }

  // HTMLナビゲーションは network-first（オフライン時は index.html）
  if (event.request.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // それ以外（CSS/JS/画像など）はキャッシュ優先で更新（stale-while-revalidate風）
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkRes) => {
          // 成功時のみキャッシュ更新
          if (networkRes && networkRes.status === 200) {
            caches.open(CACHE).then((cache) => cache.put(event.request, networkRes.clone()));
          }
          return networkRes;
        })
        .catch(() => cached); // ネットワーク失敗時はキャッシュにフォールバック
      return cached || fetchPromise;
    })
  );
});
