// 平衡測試：node scripts/simulate.mjs
import * as E from '../src/game/engine.js';
import { JOBS, jobById, HOUSES } from '../src/game/data.js';

function mulberry(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// 永久升級：META="1,5" 代表多做 1 件事、延後退休 5 年（預設是完全沒升級的新手）
const META = (() => {
  const v = (typeof process !== 'undefined' && process.env.META) || '0,0';
  const [slots, retire] = v.split(',').map(Number);
  return { slots: slots || 0, retire: retire || 0 };
})();

function play(seed, mode, target, difficulty = 'normal') {
  const rng = mulberry(seed);
  let s = E.newGame('測試', rng, difficulty, 'male', META);
  let guard = 0;
  while (!s.ended && guard++ < 500) {
    if (s.pending) {
      const p = s.pending;
      let idx = 0;
      if (mode === 'random') idx = Math.floor(rng() * p.choices.length);
      else if (p.source === 'offers') {
        if (target && !p.choices.some((c) => c.ref === target)) {
          p.choices.unshift({ label: 'x', ref: target, salary: jobById(target).salary });
        }
        idx = Math.max(0, p.choices.findIndex((c) => c.ref === (target || p.choices[0].ref)));
      } else if (p.source === 'bizPick') idx = 0;
      else if (p.id === 'crash') idx = 1;
      else if (p.source === 'event') {
        const bad = ['照對方說的做', '豪賭 10 萬元', '玩到半夜', '買跑車（500 萬）', '硬撐，繼續拚'];
        if (p.id === 'big_sick') { idx = 0; s = E.resolveChoice(s, idx, rng); continue; }
        const ok = p.choices.map((c, i) => i).filter((i) => !bad.includes(p.choices[i].label));
        idx = ok[Math.floor(rng() * ok.length)];
      } else if (p.id === 'exam18') {
        idx = 0;
      }
      if (p.choices[idx] && p.choices[idx].disabled) idx = p.choices.findIndex((c) => !c.disabled);
      s = E.resolveChoice(s, idx, rng);
      continue;
    }
    const opts = E.focusOptions(s).filter((o) => !o.disabled);
    if (opts.length) {
      let f;
      if (mode === 'random') f = opts[Math.floor(rng() * opts.length)].id;
      else if (s.studying) f = s.stats.hp < 40 ? 'sport' : s.stats.happy < 30 ? 'play' : (rng() < 0.5 ? 'cram' : 'study');
      else if (s.partner && s.partner.love < 55) f = 'date';
      else if (s.stats.hp < 45) f = 'gym';
      else if (s.stats.happy < 30) f = 'rest';
      else if (s.bizs.length && !s.job) f = 'runbiz';
      else if (!s.job && !s.bizs.length) f = 'jobhunt';
      else f = s.bizs.length && rng() < 0.5 ? 'runbiz' : (s.stats.hp < 60 && rng() < 0.3 ? 'gym' : 'work');
      if (!opts.some((o) => o.id === f)) f = opts[0].id;
      const picks = [f];
      // 其他格子：認真玩的人會補上運動、投資、工作；亂玩的人隨便選
      const extra = mode === 'random'
        ? opts.map((o) => o.id).sort(() => rng() - 0.5)
        : (s.studying ? ['study', 'sport', 'finance'] : ['work', 'gym', 'invest', 'runbiz', 'date', 'family']);
      for (const id of extra) {
        if (picks.length >= E.focusSlots(s)) break;
        if (!picks.includes(id) && opts.some((o) => o.id === id)) picks.push(id);
      }
      s = E.setFocuses(s, picks);
    }
    if (mode !== 'random' && E.canInvest(s) && !s.studying) {
      s = E.setDca(s, 30);
      if (s.houses.length === 0 && s.age >= 26 && (s.job || s.bizs.length)) {
        const r = E.buyHouse(s, 'studio');
        if (!r.error) s = r.state;
      }
      if (s.money > 150 * 10000) s = E.buyAsset(s, 'etf', s.money - 100 * 10000).state;
    }
    if (mode === 'random' && E.canInvest(s) && rng() < 0.1) {
      s = E.setDca(s, [0, 10, 30, 50][Math.floor(rng() * 4)]);
      if (s.money > 0) s = E.buyAsset(s, ['etf', 'stock', 'crypto', 'gold'][Math.floor(rng() * 4)], s.money * rng()).state;
    }
    s = E.nextYear(s, rng);
  }
  return s;
}

function report(label, mode, target, n = 600, difficulty = 'normal') {
  let ok = 0, dead = 0, routeDone = 0; const nws = [];
  let ages = [];
  for (let i = 0; i < n; i++) {
    const s = play(i * 7919 + 13, mode, target, difficulty);
    const sum = E.summary(s);
    if (sum.nw >= E.YI) ok++;
    if (sum.dead) dead++;
    if (s.route && s.route.done) routeDone++;
    if (s.achievedAge) ages.push(s.achievedAge);
    nws.push(sum.nw);
  }
  nws.sort((a, b) => a - b);
  const med = nws[Math.floor(n / 2)];
  const avgAge = ages.length ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(0) : '-';
  console.log(`${label.padEnd(10)} 達成 ${(ok / n * 100).toFixed(0).padStart(3)}%  中位數 ${E.formatMoney(med).padStart(10)}  路線完成 ${(routeDone / n * 100).toFixed(0).padStart(3)}%  死亡 ${(dead / n * 100).toFixed(0)}%  平均達成年齡 ${avgAge}`);
}

export { play };
const isMain = process.argv[1] && process.argv[1].endsWith('simulate.mjs');
const only = process.argv[2];
if (isMain && only === 'diag') {
  for (const mode of ['random', 'good']) {
    const agg = { money: 0, inv: 0, house: 0, biz: 0, debt: 0 }; const n = 300;
    const comps = [];
    for (let i = 0; i < n; i++) {
      const s = play(i * 7919 + 13, mode);
      const c = { money: s.money, inv: E.investTotal(s), house: E.houseTotal(s), biz: E.bizTotal(s), debt: E.debtTotal(s) };
      comps.push(c);
    }
    for (const k of Object.keys(agg)) { const arr = comps.map((c) => c[k]).sort((a, b) => a - b); agg[k] = E.formatMoney(arr[Math.floor(n / 2)]) + ' / p90 ' + E.formatMoney(arr[Math.floor(n * 0.9)]); }
    console.log(mode, agg);
  }
  process.exit(0);
}
if (isMain) {
  for (const d of ['easy', 'normal', 'hard', 'hell']) {
    report(`${d} 亂玩`, 'random', undefined, 200, d);
    report(`${d} 認真`, 'good', undefined, 200, d);
  }
  if (only === 'jobs') for (const j of JOBS) report(j.name, 'good', j.id, 60, 'normal');
}
