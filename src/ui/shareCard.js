// 人生成績單：用 canvas 畫一張 1080×1920（IG 限動尺寸）的圖，可以分享或存到手機。
import { Platform, Share } from 'react-native';
import * as E from '../game/engine';
import { PHOTO } from './art/photos';
import { artForEnd } from './art';

const W = 1080;
const H = 1920;
const FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei","Heiti TC",sans-serif';
const f = (size, weight = 700) => `${weight} ${size}px ${FONT}`;

const loadImg = (src) => new Promise((resolve) => {
  if (!src) { resolve(null); return; }
  const img = new window.Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});
const uriOf = (id) => (PHOTO[id] && PHOTO[id].uri) || null;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 圖片以 cover 方式塞進框裡
function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s; const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

// 把文字縮到放得下
function fitText(ctx, text, maxW, size, weight = 700) {
  let s = size;
  ctx.font = f(s, weight);
  while (ctx.measureText(text).width > maxW && s > 20) { s -= 2; ctx.font = f(s, weight); }
  return s;
}

function wrap(ctx, text, maxW, maxLines) {
  const lines = [];
  let cur = '';
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; if (lines.length === maxLines) break; } else cur += ch;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && ctx.measureText(lines[maxLines - 1]).width > maxW - 30) lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`;
  return lines;
}

export const canShareCard = () => Platform.OS === 'web' && typeof document !== 'undefined';

export async function makeShareCard(game, meta) {
  const sum = E.summary(game);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const [scene, face, logo] = await Promise.all([
    loadImg(uriOf(artForEnd(sum))),
    loadImg(uriOf(game.gender === 'female' ? 'face_girl' : 'face_boy')),
    loadImg(uriOf('logo')),
  ]);
  const gold = '#ffd76a';

  // 背景：深藍紫漸層＋光暈
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0f1636'); bg.addColorStop(0.55, '#171d4d'); bg.addColorStop(1, '#2a1c5e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = (x, y, r, c) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  glow(W * 0.9, H * 0.45, 620, 'rgba(108,92,231,0.45)');
  glow(W * 0.05, H * 0.85, 560, 'rgba(46,144,250,0.3)');
  if (sum.achieved) glow(W / 2, 980, 520, 'rgba(255,200,80,0.28)');
  // 小星星
  for (let i = 0; i < 70; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.5})`;
    const r = Math.random() * 2.6 + 0.6;
    ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2); ctx.fill();
  }

  // 頂部：logo＋遊戲名
  ctx.textBaseline = 'middle';
  if (logo) { ctx.save(); roundRect(ctx, 70, 70, 92, 92, 22); ctx.clip(); ctx.drawImage(logo, 70, 70, 92, 92); ctx.restore(); }
  ctx.fillStyle = '#fff'; ctx.font = f(46, 800); ctx.textAlign = 'left';
  ctx.fillText('一個億的小目標', logo ? 184 : 70, 104);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = f(30, 600);
  ctx.fillText(`人生成績單．第 ${(meta && meta.lives) || 1} 世`, logo ? 184 : 70, 146);

  // 結局插圖
  const ix = 70; const iy = 220; const iw = W - 140; const ih = 600;
  ctx.save();
  roundRect(ctx, ix, iy, iw, ih, 44); ctx.clip();
  if (scene) drawCover(ctx, scene, ix, iy, iw, ih); else { ctx.fillStyle = '#26306e'; ctx.fillRect(ix, iy, iw, ih); }
  const shade = ctx.createLinearGradient(0, iy + ih * 0.5, 0, iy + ih);
  shade.addColorStop(0, 'rgba(10,14,45,0)'); shade.addColorStop(1, 'rgba(10,14,45,0.85)');
  ctx.fillStyle = shade; ctx.fillRect(ix, iy, iw, ih);
  ctx.restore();
  ctx.strokeStyle = sum.achieved ? gold : 'rgba(157,140,255,0.8)'; ctx.lineWidth = 4;
  roundRect(ctx, ix, iy, iw, ih, 44); ctx.stroke();

  // 頭像＋名字（壓在插圖左下）
  const fx = 110; const fy = iy + ih - 150; const fs = 190;
  ctx.save(); ctx.beginPath(); ctx.arc(fx + fs / 2, fy + fs / 2, fs / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  if (face) drawCover(ctx, face, fx, fy, fs, fs); else { ctx.fillStyle = '#3b4a8f'; ctx.fillRect(fx, fy, fs, fs); }
  ctx.restore();
  ctx.strokeStyle = gold; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(fx + fs / 2, fy + fs / 2, fs / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
  fitText(ctx, game.name, 560, 64, 900);
  ctx.fillText(game.name, fx + fs + 30, iy + ih - 72);
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = f(34, 600);
  ctx.fillText(`${game.ended ? game.ended.age : game.age} 歲．${E.diffOf(game).name}難度`, fx + fs + 30, iy + ih - 18);

  // 結局標題＋稱號
  ctx.textAlign = 'center';
  ctx.fillStyle = sum.achieved ? gold : '#fff';
  ctx.font = f(84, 900);
  ctx.fillText(sum.headline, W / 2, 960);
  const badge = `稱號：${sum.title}`;
  const bs = fitText(ctx, badge, W - 240, 42, 800);
  const bw = ctx.measureText(badge).width + 80;
  roundRect(ctx, (W - bw) / 2, 1020, bw, bs + 40, (bs + 40) / 2);
  ctx.fillStyle = 'rgba(255,215,106,0.16)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,106,0.7)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = gold; ctx.fillText(badge, W / 2, 1020 + (bs + 40) / 2 + 2);

  // 淨資產
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = f(34, 600);
  ctx.fillText('最後的淨資產', W / 2, 1180);
  const money = E.formatMoney(sum.nw);
  ctx.fillStyle = sum.nw < 0 ? '#ff8a80' : '#fff';
  fitText(ctx, money, W - 160, 150, 900);
  ctx.fillText(money, W / 2, 1275);

  // 進度條
  const px = 110; const py = 1370; const pw = W - 220; const ph = 26;
  roundRect(ctx, px, py, pw, ph, ph / 2); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
  const pr = Math.max(0.02, Math.min(1, sum.pct / 100));
  const pg = ctx.createLinearGradient(px, 0, px + pw, 0); pg.addColorStop(0, '#7b6cff'); pg.addColorStop(1, gold);
  roundRect(ctx, px, py, pw * pr, ph, ph / 2); ctx.fillStyle = pg; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = f(32, 700);
  ctx.fillText(sum.pct >= 100 ? `一億目標的 ${(sum.pct / 100).toFixed(2)} 倍${sum.achievedAge ? `．${sum.achievedAge} 歲破億` : ''}` : `一億目標的 ${sum.pct.toFixed(1)}%`, W / 2, py + 72);

  // 三格資訊
  const boxes = [
    ['出身', sum.family],
    ['學歷', sum.edu],
    ['同屆排名', sum.mateRank ? `${sum.mateRank} / ${sum.mates.length}` : '—'],
  ];
  const gx = 70; const gy = 1500; const gap = 24; const gw = (W - 140 - gap * 2) / 3; const gh = 150;
  boxes.forEach(([k, v], i) => {
    const x = gx + i * (gw + gap);
    roundRect(ctx, x, gy, gw, gh, 28); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(140,170,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = f(28, 600); ctx.fillText(k, x + gw / 2, gy + 48);
    ctx.fillStyle = '#fff'; fitText(ctx, v, gw - 30, 42, 800); ctx.fillText(v, x + gw / 2, gy + 104);
  });

  // 職業歷程
  ctx.font = f(32, 600); ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const lines = wrap(ctx, `職業：${sum.careers}`, W - 160, 2);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 1715 + i * 46));

  // 底部
  ctx.fillStyle = gold; ctx.font = f(36, 800);
  ctx.fillText('你能在退休前賺到一個億嗎？', W / 2, 1845);

  return canvas.toDataURL('image/png');
}

const dataUrlToFile = async (dataUrl, name) => {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: 'image/png' });
};

// 分享：手機會跳出分享選單（IG、LINE…），不支援的話就直接下載
export async function shareCard(dataUrl, game) {
  const name = `人生成績單_${game.name}.png`;
  try {
    const file = await dataUrlToFile(dataUrl, name);
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: '我的人生成績單', text: `我在「一個億的小目標」活到 ${game.ended ? game.ended.age : game.age} 歲，淨資產 ${E.formatMoney(E.netWorth(game))}！` });
      return 'shared';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancel';
  }
  downloadCard(dataUrl, game);
  return 'downloaded';
}

export function downloadCard(dataUrl, game) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `人生成績單_${game.name}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// App 版（沒有 canvas）：先分享文字
export function shareText(game) {
  const sum = E.summary(game);
  return Share.share({ message: `我在「一個億的小目標」活到 ${game.ended ? game.ended.age : game.age} 歲，稱號「${sum.title}」，淨資產 ${E.formatMoney(sum.nw)}！你能在退休前賺到一個億嗎？` });
}
