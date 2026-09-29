// 每日挑戰：同一天（台灣時間）全部玩家拿到同一個出身——家庭、能力值、同屆同學都一樣，
// 之後的事件、運氣、世界走勢全部照常隨機。比的是「誰最早破億」，沒破億就比最後身價。
import { newGame, netWorth, summary } from './engine.js';
import { familyById } from './data.js';
import { YI } from './utils.js';

export const DAILY_EPOCH = '2026-09-29'; // 第 1 號挑戰
const TW = 8 * 3600 * 1000;

// 台灣時間的日期字串 YYYY-MM-DD
export const todayKey = (t = Date.now()) => new Date(t + TW).toISOString().slice(0, 10);
export const dayShift = (day, d) => new Date(Date.parse(`${day}T00:00:00Z`) + d * 86400000).toISOString().slice(0, 10);
export const dailyNo = (day) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${DAILY_EPOCH}T00:00:00Z`)) / 86400000) + 1;

// 字串 → 32 位元種子（cyrb53 的簡化版）
function hashStr(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}

// 可重現的亂數（mulberry32）
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 今天的挑戰：固定普通難度、不套永久升級（大家起跑點一樣）
export function dailyGame(name, gender = 'male', day = todayKey(), ranked = true) {
  const s = newGame(name, seeded(hashStr(`yiyi-daily:${day}`)), 'normal', gender, null);
  s.daily = { day, no: dailyNo(day), ranked };
  return s;
}

// 開始前給玩家看的「今天的出身」
export function dailyPreview(day = todayKey()) {
  const s = dailyGame('預覽', 'male', day, false);
  return { no: dailyNo(day), day, family: familyById(s.family).name, familyId: s.family, stats: s.stats, mates: (s.mates || []).map((m) => m.name) };
}

// 交給排行榜的成績：一億算到最後一年（跟遊戲結算一樣），最後沒有一億就不算破億
export function dailyResult(s) {
  const sum = summary(s);
  const nw = Math.round(netWorth(s));
  return {
    day: s.daily.day,
    nw,
    yiAge: nw >= YI && s.achievedAge ? s.achievedAge : null,
    endAge: s.ended ? s.ended.age : s.age,
    title: sum.title,
    gender: s.gender || 'male',
  };
}
