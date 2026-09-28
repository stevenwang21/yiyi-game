// 配色：深藍紫手遊風（跟首頁一致）
export const C = {
  bg: '#121840',
  page: '#262e63',
  ink: '#f3f4ff',
  muted: '#9aa3d0',
  line: '#2d3570',
  card: '#1b2256',
  cardLine: 'rgba(140,170,255,0.22)',

  // 主要動作（紫）
  primary: '#6a5cff',
  primaryDark: '#5546c9',
  primarySoft: '#2e2b78',
  primaryInk: '#b3a8ff',

  // 錢（金）
  gold: '#f5a524',
  goldSoft: '#352c1f',
  goldLine: '#6b5424',
  goldInk: '#ffd76a',

  red: '#ff5d52',
  redSoft: '#3d1d33',
  redLine: '#6e2b3f',
  green: '#3ddc97',
  greenSoft: '#15393f',
  greenLine: '#1f5a4d',
  blue: '#5aa9ff',
  blueSoft: '#1c2d62',
  blueLine: '#2d4a8a',
  purple: '#b18cff',
  pink: '#ff7eb6',

  dim: 'rgba(4, 6, 24, 0.6)',

  // 半透明的底（固定列、底部工具列、提示框、面板把手、面板後面的暗幕）
  glass: 'rgba(15,22,54,0.85)',
  tabBar: 'rgba(14,19,52,0.88)',
  tip: 'rgba(16,21,56,0.94)',
  grab: 'rgba(255,255,255,0.25)',
  veil: 'rgba(4,6,24,0.55)',
  frost: 'rgba(38,46,99,0.72)',
  accentLine: 'rgba(157,140,255,0.45)',
};

// ── 淺色模式 ──────────────────────────────────────────────
// 選單裡切換；存在 localStorage，切換時整頁重新載入（所有 StyleSheet 都是開場就算好的，
// 重載是最不會漏的做法）。首頁／創角頁、事件插圖、結局動畫是夜景美術，兩種模式都維持深色。
const LIGHT = {
  bg: '#f2f3fa',
  page: '#e8eaf6',
  ink: '#1c2045',
  muted: '#6b7196',
  line: '#e3e6f3',
  card: '#ffffff',
  cardLine: 'rgba(80,90,160,0.14)',
  primary: '#6a5cff',
  primaryDark: '#5546c9',
  primarySoft: '#ecebff',
  primaryInk: '#5546c9',
  gold: '#f5a524',
  goldSoft: '#fff4de',
  goldLine: '#f3d49a',
  goldInk: '#b8730a',
  red: '#e5483e',
  redSoft: '#ffeceb',
  redLine: '#f7c1bc',
  green: '#16a36a',
  greenSoft: '#e3f7ee',
  greenLine: '#a8e3c9',
  blue: '#2e7fe0',
  blueSoft: '#e6f0ff',
  blueLine: '#b8d4fb',
  purple: '#8a5cf0',
  pink: '#e0508a',
  dim: 'rgba(20,24,60,0.35)',
  glass: 'rgba(247,248,255,0.9)',
  tabBar: 'rgba(255,255,255,0.94)',
  tip: 'rgba(255,255,255,0.97)',
  grab: 'rgba(30,40,90,0.18)',
  veil: 'rgba(20,24,60,0.35)',
  frost: 'rgba(255,255,255,0.88)',
  accentLine: 'rgba(106,92,255,0.35)',
};
const THEME_KEY = 'yiyi-theme-v1';
let mode = 'dark';
try {
  if (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem(THEME_KEY) === 'light') mode = 'light';
} catch (_) { /* 私密瀏覽之類讀不到就用深色 */ }
export const isLight = mode === 'light';
if (isLight) Object.assign(C, LIGHT);
export function setTheme(m) {
  try { window.localStorage.setItem(THEME_KEY, m); } catch (_) { /* 存不了就只換這次 */ }
  if (typeof window !== 'undefined' && window.location) window.location.reload();
}

// 卡片的柔和陰影
export const SHADOW = {
  shadowColor: isLight ? '#3a3f7a' : '#000',
  shadowOpacity: isLight ? 0.08 : 0.25,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

// 按鈕的立體陰影
export const SHADOW_BTN = {
  shadowColor: '#6a5cff',
  shadowOpacity: 0.4,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

export const STAT_META = [
  { key: 'int', label: '智力', icon: '📘', color: C.blue },
  { key: 'hp', label: '健康', icon: '💪', color: C.green },
  { key: 'happy', label: '快樂', icon: '😄', color: C.gold },
  { key: 'charm', label: '人緣', icon: '🤝', color: C.pink },
];

export const toneColor = (tone) => {
  if (tone === 'good') return C.green;
  if (tone === 'bad') return C.red;
  if (tone === 'milestone') return C.goldInk;
  if (tone === 'world') return C.blue;
  if (tone === 'points') return C.primaryInk;
  if (tone === 'world-bad') return C.red;
  if (tone === 'focus' || tone === 'money') return C.muted;
  return C.ink;
};
