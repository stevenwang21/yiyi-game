// 離線快取：第一次打開後，沒有網路也能玩
// 更新遊戲時，把版本號改掉，手機就會下載新版
const CACHE = 'yiyi-v71';
const FILES = ['./', 'index.html', 'app.js', 'register-sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.png', 'art/baby.webp', 'art/broke.webp', 'art/bull.webp', 'art/car.webp', 'art/card_bg.webp', 'art/city.webp', 'art/company.webp', 'art/crash.webp', 'art/deal.webp', 'art/desk.webp', 'art/exam.webp', 'art/face_boy.webp', 'art/face_girl.webp', 'art/family.webp', 'art/gift.webp', 'art/hero.webp', 'art/hospital.webp', 'art/house.webp', 'art/ic_easy.webp', 'art/ic_hard.webp', 'art/ic_hell.webp', 'art/ic_normal.webp', 'art/job.webp', 'art/logo.webp', 'art/love.webp', 'art/money.webp', 'art/office.webp', 'art/party.webp', 'art/pet.webp', 'art/retire.webp', 'art/school.webp', 'art/sport.webp', 'art/startup.webp', 'art/study.webp', 'art/talent.webp', 'art/teen.webp', 'art/tile_book.webp', 'art/tile_crown.webp', 'art/tile_star.webp', 'art/travel.webp', 'art/trophy.webp', 'art/wedding.webp', 'art/zhuazhou.webp'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 先用網路抓最新版，沒網路時才用快取
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
