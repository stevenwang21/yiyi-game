// 共用小工具：亂數、數值限制、金額格式

export const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export const rint = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

export const chance = (rng, p) => rng() < p;

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// 常態分布亂數
export const gauss = (rng, mean = 0, sd = 1) => {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// 依權重抽一個
export const weightedPick = (rng, items, weightOf) => {
  const total = items.reduce((t, it) => t + weightOf(it), 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
};

export const WAN = 10000;
export const YI = 100000000;

// 金額顯示：1.23 億 / 456 萬 / 3,000 元
export const formatMoney = (n) => {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= YI) return `${sign}${(a / YI).toFixed(2)} 億`;
  if (a >= WAN) return `${sign}${Math.round(a / WAN).toLocaleString('en-US')} 萬`;
  return `${sign}${Math.round(a).toLocaleString('en-US')} 元`;
};

// 小金額顯示到小數一位：3.6 萬
export const formatMoneyFine = (n) => {
  const a = Math.abs(n);
  if (a >= WAN && a < 100 * WAN) {
    const v = Math.round((a / WAN) * 10) / 10;
    return `${n < 0 ? '-' : ''}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} 萬`;
  }
  return formatMoney(n);
};

const STAT_NAMES = { int: '智力', hp: '健康', happy: '快樂', charm: '人緣' };

// 越高越難再往上：50 以下正常成長，之後遞減
// （現實裡從 90 到 95 比從 50 到 55 難很多）
export const gainFactor = (v) => {
  if (v < 40) return 1;
  if (v < 60) return 1 - ((v - 40) / 20) * 0.45; // 1 → 0.55
  if (v < 80) return 0.55 - ((v - 60) / 20) * 0.3; // 0.55 → 0.25
  if (v < 90) return 0.25 - ((v - 80) / 10) * 0.1; // 0.25 → 0.15
  return Math.max(0.03, 0.15 - ((v - 90) / 10) * 0.12); // 0.15 → 0.03
};

// 內部用小數累積（顯示時是整數），小小的進步也不會被四捨五入吃掉
const exact = (s, key) => s.stats[key] + ((s.statFrac && s.statFrac[key]) || 0);
const setExact = (s, key, v) => {
  const c = Math.max(0, Math.min(100, v));
  const i = Math.floor(c + 1e-9);
  s.stats[key] = i;
  if (!s.statFrac) s.statFrac = {};
  s.statFrac[key] = c - i;
};

// 不經過遞減的直接變動（每年自然回落用）
export const nudgeStat = (s, key, d) => { if (d) setExact(s, key, exact(s, key) + d); };

// 調整屬性並回傳「（智力+3、快樂-2）」這種說明文字
// 加分會依目前數值遞減；扣分照扣
export const addStats = (s, delta) => {
  const parts = [];
  for (const key of Object.keys(delta)) {
    const d = Math.round(delta[key]);
    if (!d) continue;
    const before = s.stats[key];
    let v = exact(s, key);
    if (d > 0) {
      let rem = d;
      while (rem > 0) { const step = Math.min(1, rem); v += step * gainFactor(v); rem -= step; }
    } else {
      v += d;
    }
    setExact(s, key, v);
    const real = s.stats[key] - before;
    if (real) parts.push(`${STAT_NAMES[key]}${real > 0 ? '+' : ''}${real}`);
  }
  return parts.length ? `（${parts.join('、')}）` : '';
};

// 每年自然回落：快樂會回到平常心、人脈不經營會淡、體能不練會退、
// 出社會後不學習智力也會慢慢生疏
export const driftStats = (s) => {
  const st = s.stats;
  const toward = (key, target, rate) => nudgeStat(s, key, (target - exact(s, key)) * rate);
  toward('happy', 60, 0.1);
  if (s.age < 6) return;
  if (st.charm > 50) toward('charm', 50, 0.05);
  if (st.hp > 70) toward('hp', 70, 0.05);
  if (st.int > 50) toward('int', 50, s.age >= 25 ? 0.03 : 0.02);
  if (s.age >= 65) nudgeStat(s, 'int', -0.5);
};

// 調整現金並回傳說明文字
export const addMoney = (s, amount) => {
  const a = Math.round(amount);
  if (!a) return '';
  s.money += a;
  return `（${a > 0 ? '+' : ''}${formatMoney(a)}）`;
};
