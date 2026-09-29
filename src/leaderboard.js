// 每日挑戰的全球排行榜（Supabase）。
// 資料表和 submit_daily 函式在 supabase/daily.sql；這裡只用公開金鑰（本來就是給網頁用的）。
// 網路不通、還沒設定網址時一律安靜失敗：成績先記在手機裡，下次打開再補交。
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dcratfekyugqxdyxwwnr.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_Tpjh_HME_z1WSn9rTVUidg_blaJ-Zay';   // 公開金鑰，本來就是放在網頁裡的
export const boardReady = () => !!(SUPABASE_URL && SUPABASE_KEY);

const STORE_KEY = 'yiyi-daily-v1';

const headers = () => {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  // 舊式 anon key 是 JWT，要多帶一個 Authorization；新式 sb_publishable_ 只要 apikey
  if (!SUPABASE_KEY.startsWith('sb_')) h.Authorization = `Bearer ${SUPABASE_KEY}`;
  return h;
};

function uuid() {
  try { if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID(); } catch { /* 沒有就自己做 */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// 手機裡記的：這台裝置的代號、上次用的暱稱、每天的挑戰紀錄
// runs[day] = { started: true, sent: false, payload, result: { rank, total } }
export async function loadDaily() {
  let d = null;
  try { const raw = await AsyncStorage.getItem(STORE_KEY); d = raw ? JSON.parse(raw) : null; } catch { d = null; }
  if (!d || !d.device) d = { device: uuid(), nick: '', runs: {} };
  if (!d.runs) d.runs = {};
  // 只留最近 14 天
  const days = Object.keys(d.runs).sort();
  for (const k of days.slice(0, Math.max(0, days.length - 14))) delete d.runs[k];
  return d;
}
export async function saveDaily(d) {
  try { await AsyncStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch { /* 忽略 */ }
}

async function rpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// 交成績（同一天同一台只收第一次；重複交只會拿回目前的名次）
export async function submitDaily(device, nick, p) {
  if (!boardReady()) throw new Error('not ready');
  return rpc('submit_daily', {
    p_day: p.day, p_device: device, p_nick: (nick || '無名氏').slice(0, 12), p_nw: p.nw,
    p_yi_age: p.yiAge, p_end_age: p.endAge, p_title: (p.title || '').slice(0, 20), p_gender: p.gender,
  });
}

// 某一天的前 N 名＋總人數
export async function fetchTop(day, limit = 50) {
  if (!boardReady()) throw new Error('not ready');
  const q = `select=nick,nw,yi_age,end_age,title,gender&day=eq.${day}&order=yi_age.asc.nullslast,nw.desc,created_at.asc&limit=${limit}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/daily_scores?${q}`, { headers: { ...headers(), Prefer: 'count=exact' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  const cr = res.headers.get('content-range') || '';
  const total = Number(cr.split('/')[1]) || rows.length;
  return { rows, total };
}

// 還沒交出去的成績（上次沒網路），補交
export async function flushPending(d) {
  if (!boardReady()) return d;
  let changed = false;
  for (const [day, run] of Object.entries(d.runs)) {
    if (run.payload && !run.sent) {
      try {
        const r = await submitDaily(d.device, run.nick || d.nick, run.payload);
        run.sent = true; run.result = { rank: r.rank, total: r.total };
        changed = true;
      } catch { /* 下次再試 */ }
    }
  }
  if (changed) await saveDaily(d);
  return d;
}
