// 把 Expo 打包出來的程式，組成可以直接上線的網站（輸出到 _site/）
// 用法：npx expo export --platform web && node scripts/build-site.mjs
// GitHub Actions 每次 push 都會自動跑這兩行，不用在自己電腦上執行。
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const out = path.join(root, '_site');
const dist = path.join(root, 'dist');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// 1. 網站外殼（index.html、圖示、manifest…）
for (const f of fs.readdirSync(path.join(root, 'web'))) {
  if (f === 'sw.js') continue;
  fs.copyFileSync(path.join(root, 'web', f), path.join(out, f));
}

// 2. 遊戲程式
const jsDir = path.join(dist, '_expo', 'static', 'js', 'web');
const bundle = fs.readdirSync(jsDir).find((f) => /^index-.*\.js$/.test(f));
if (!bundle) throw new Error('找不到打包好的 index-*.js，請先執行 npx expo export --platform web');
fs.copyFileSync(path.join(jsDir, bundle), path.join(out, 'app.js'));

// 3. 插圖
fs.mkdirSync(path.join(out, 'art'), { recursive: true });
const arts = fs.readdirSync(path.join(root, 'public', 'art')).filter((f) => !f.startsWith('.')).sort();
for (const f of arts) fs.copyFileSync(path.join(root, 'public', 'art', f), path.join(out, 'art', f));

// 4. 版本號：每次打包都不一樣
const version = process.env.BUILD_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 12);

// index.html 裡的 app.js 換成帶版本的網址。
// 不這樣做的話，網址永遠是同一個 app.js，手機和瀏覽器會拿快取裡的舊程式，
// 明明已經部署新版了畫面卻沒變。加上 ?v= 之後每次改版都是新網址，一定會重抓。
const appUrl = `app.js?v=${version}`;
const swUrl = `register-sw.js?v=${version}`;
const indexHtml = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8')
  .replace('src="app.js"', `src="${appUrl}"`)
  .replace('src="register-sw.js"', `src="${swUrl}"`);
fs.writeFileSync(path.join(out, 'index.html'), indexHtml);

// 5. 離線快取
// 外殼 = 一定要先有的東西（程式、圖示）＋ 第一個畫面就會用到的插圖。
// 其他 280 張圖不放進外殼，改成開起來之後在背景慢慢補（見 web/sw.js）。
// 以前是把全部檔案塞進 install 的 addAll()，一打開就同時抓 5MB，圖片才會慢得要命。
const FIRST_SCREEN = [
  'hero.webp', 'card_bg.webp', 'face_boy.webp', 'face_girl.webp',
  'ic_easy.webp', 'ic_normal.webp', 'ic_hard.webp', 'ic_hell.webp',
  'tile_star.webp', 'tile_book.webp', 'tile_crown.webp',
].filter((f) => arts.includes(f));
const shell = [
  './', 'index.html', appUrl, swUrl,
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.png',
  ...FIRST_SCREEN.map((f) => `art/${f}`),
];
const artUrls = arts.map((f) => `art/${f}`);
// 每張圖的大小：插圖是 cache-first，換了同名的圖要靠這個才知道要把舊的丟掉
const artSizes = {};
for (const f of arts) artSizes[`art/${f}`] = fs.statSync(path.join(out, 'art', f)).size;
const sw = fs.readFileSync(path.join(root, 'web', 'sw.js'), 'utf8')
  .replace('__CACHE__', `yiyi-${version}`)
  .replace('__SHELL__', JSON.stringify(shell))
  .replace('__ART__', JSON.stringify(artUrls))
  .replace('__ART_SIZES__', JSON.stringify(artSizes));
fs.writeFileSync(path.join(out, 'sw.js'), sw);

// GitHub Pages 不要用 Jekyll 處理
fs.writeFileSync(path.join(out, '.nojekyll'), '');

console.log(`網站組好了：_site/（版本 yiyi-${version}，${arts.length} 張插圖，程式網址 ${appUrl}）`);
