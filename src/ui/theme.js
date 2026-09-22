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
};

// 卡片的柔和陰影
export const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.25,
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
