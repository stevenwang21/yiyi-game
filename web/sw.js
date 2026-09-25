// 離線快取。版本號和檔案清單由 scripts/build-site.mjs 在打包時填入。
//
// 兩個快取分開放，這件事很重要：
//   SHELL_CACHE 帶版本號 → 每次改版都會重建（程式一定要拿新的）
//   ART_CACHE   不帶版本 → 永遠留著（插圖檔名不會變，改版不該讓 5MB 的圖重抓一次）
const SHELL_CACHE = '__CACHE__';
const ART_CACHE = 'yiyi-art-v1';
const SHELL = __SHELL__;   // 十幾個檔案：index.html、程式、圖示、第一個畫面要用的插圖
const ART = __ART__;       // 全部插圖，開起來之後才慢慢在背景補
const ART_SIZES = __ART_SIZES__;   // { 'art/x.webp': 位元組數 }，用來偵測哪張圖被換掉了
const SIG_URL = '__art-sizes__';   // 把上一次的清單存在快取裡，改版時拿來比對

const isArt = (u) => u.pathname.includes('/art/');
// 程式檔網址帶 ?v=，改版就是新網址，所以可以直接當成不會變的東西
const isVersioned = (u) => u.searchParams.has('v');

self.addEventListener('install', (e) => {
  // 只先抓外殼。以前這裡是 addAll(全部 285 個檔案)，等於一打開就同時發 285 個請求、
  // 把 5MB 一次灌下來，玩家真正要看的那幾張圖反而排在後面 —— 就是載入很久的原因。
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== ART_CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim())
      .then(dropChangedArt)                          // 被換掉的圖要丟掉，不然玩家一直看到舊的
      .then(() => { setTimeout(fillArt, 8000); }),   // 等畫面跑起來再慢慢補剩下的圖
  );
});

// 插圖是 cache-first，所以換了同名的圖要主動把舊的刪掉。
// 比對「檔名 → 檔案大小」：只刪真的變了的那幾張，不會整包 5MB 重抓。
async function dropChangedArt() {
  const c = await caches.open(ART_CACHE);
  let prev = null;
  try { const r = await c.match(SIG_URL); if (r) prev = await r.json(); } catch (_) { /* 第一次沒有 */ }
  if (prev) {
    for (const url of Object.keys(prev)) {
      if (ART_SIZES[url] !== prev[url]) await c.delete(url);   // 大小變了或整張被刪掉
    }
  }
  await c.put(SIG_URL, new Response(JSON.stringify(ART_SIZES), { headers: { 'Content-Type': 'application/json' } }));
}

// 背景補齊插圖：一次只抓兩個，不跟玩家搶頻寬。已經在快取裡的直接跳過。
async function fillArt() {
  // 省流量模式或很慢的網路就不要在背景偷抓 5MB，玩到哪張再抓哪張就好
  const net = self.navigator && self.navigator.connection;
  if (net && (net.saveData || net.effectiveType === '2g' || net.effectiveType === 'slow-2g')) return;
  const c = await caches.open(ART_CACHE);
  const todo = [];
  for (const url of ART) {
    if (!(await c.match(url))) todo.push(url);
  }
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const url = todo[i++];
      try { const r = await fetch(url); if (r.ok) await c.put(url, r); } catch (_) { /* 沒網路就算了 */ }
    }
  };
  await Promise.all([worker(), worker()]);
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  let u;
  try { u = new URL(e.request.url); } catch (_) { return; }
  if (u.origin !== self.location.origin) return;

  // 插圖和帶版本號的程式：檔名不會變，快取裡有就直接給，完全不等網路。
  // 以前這裡是「一律先問網路」，所以每一張圖每次都要等一個來回 —— 快取等於白做。
  if (isArt(u) || isVersioned(u)) {
    const store = isArt(u) ? ART_CACHE : SHELL_CACHE;
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(store).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })),
    );
    return;
  }

  // 其他（index.html 之類的）：先拿網路上最新的，沒網路才用快取
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
