// MORUNE 25143 の Service Worker（#5）。
// 病室はネットがないため、一度開いた画面と部品を端末に保存し、ネットなしでも開けるようにする。
// 願いのデータは IndexedDB にあるので、ここでは扱わない。
importScripts('/offline-routes.js');

// 保存の形を変えたときに上げる。古い保存は activate で消す。
// 自前の部品はネット優先なので、ふつうの公開では上げなくてよい。
const CACHE_VERSION = '2026-09-29-2';
const CACHE_NAME = `morune-25143-${CACHE_VERSION}`;
const APP_SHELL = ['/', '/mission.js', '/wish-state.js', '/itokawa.js', '/itokawa-distance.json', '/style.css', '/manifest.webmanifest', '/icons/icon-192.png'];
// 病室の弱い電波で待ち続けないよう、ページの取得はこの時間で諦めて保存した版を出す
const PAGE_TIMEOUT_MS = 4000;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // 1つ取れなくても入れ替えを止めない（足りない部品は開いたときに保存される）
    await Promise.allSettled(APP_SHELL.map(path => cache.add(path)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('morune-25143-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

// ページは「?nfc=1」のような付け足しが違っても同じ画面なので、パスだけで保存する
function pageKey(url) {
  const target = new URL(url);
  return new Request(target.origin + target.pathname);
}

function isStorable(response) {
  return response && (response.ok || response.type === 'opaque');
}

function fetchWithTimeout(request) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PAGE_TIMEOUT_MS)),
  ]);
}

// 名前が変わらない自前の部品：ネットがあれば新しい版を使い、なければ保存した版を出す
async function serveFresh(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function servePage(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) await cache.put(pageKey(request.url), response.clone());
    return response;
  } catch {
    const saved = await cache.match(pageKey(request.url)) || await cache.match('/');
    if (saved) return saved;
    return new Response('<!doctype html><meta charset="utf-8"><title>25143</title><p>ネットにつながったときに、一度この画面を開いてください。次からはネットがなくても開けます。</p>', {
      status: 503,
      headers: {'Content-Type': 'text/html; charset=utf-8'},
    });
  }
}

async function serveAsset(request, event) {
  const cache = await caches.open(CACHE_NAME);
  const saved = await cache.match(request);
  const refreshed = fetch(request)
    .then(async response => {
      if (isStorable(response)) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (saved) {
    event.waitUntil(refreshed);
    return saved;
  }
  return (await refreshed) || Response.error();
}

self.addEventListener('fetch', event => {
  const {request} = event;
  const route = self.offlineRoute({url: request.url, method: request.method, mode: request.mode, origin: self.location.origin});
  if (route === 'page') event.respondWith(servePage(request));
  else if (route === 'fresh') event.respondWith(serveFresh(request));
  else if (route === 'asset') event.respondWith(serveAsset(request, event));
});

// 最初に開いたときは、Service Worker が動き出す前に読まれた部品がある。
// 画面から読んだ部品の一覧を受け取り、まだ保存していないものを保存しておく。
self.addEventListener('message', event => {
  if (event.data?.type !== 'warm' || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(event.data.urls.map(async url => {
      const route = self.offlineRoute({url, method: 'GET', mode: 'no-cors', origin: self.location.origin});
      if (route === 'bypass') return;
      const sameOrigin = new URL(url).origin === self.location.origin;
      const isPage = sameOrigin && new URL(url).pathname === '/';
      const key = isPage ? pageKey(url) : new Request(url, sameOrigin ? {} : {mode: 'cors'});
      if (await cache.match(key)) return;
      const response = await fetch(key).catch(() => null);
      if (isStorable(response)) await cache.put(key, response);
    }));
  })());
});
