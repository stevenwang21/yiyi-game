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

// 4. 離線快取：版本號每次都不一樣，手機才會抓新版
const version = process.env.BUILD_ID || new Date().toISOString().replace(/\D/g, '').slice(0, 12);
const files = ['./', 'index.html', 'app.js', 'register-sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.png', ...arts.map((f) => `art/${f}`)];
const sw = fs.readFileSync(path.join(root, 'web', 'sw.js'), 'utf8')
  .replace('__CACHE__', `yiyi-${version}`)
  .replace('__FILES__', JSON.stringify(files));
fs.writeFileSync(path.join(out, 'sw.js'), sw);

// GitHub Pages 不要用 Jekyll 處理
fs.writeFileSync(path.join(out, '.nojekyll'), '');

console.log(`網站組好了：_site/（版本 yiyi-${version}，${arts.length} 張插圖）`);
