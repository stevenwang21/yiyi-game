// 收購：達成一億以後，可以把別人的公司買下來變成自己集團的一部分
// 每一家待售公司都有自己的「情境」（急售、家族接班、法拍、競標、同業、海外、新創、上市公司……）
import { BUSINESSES } from './data.js';
import { gauss, WAN, formatMoney } from './utils.js';

export const MAX_GROUP = 8; // 集團最多幾家公司（含自己開的）
export const MIN_DEAL = 1000 * WAN; // 最小的公司規模

const PREFIX = ['大', '新', '永', '宏', '鴻', '泰', '嘉', '金', '晶', '昌', '順', '長', '瑞', '偉', '元', '中', '華', '洲'];
const SUFFIX = ['盛', '達', '發', '豐', '成', '興', '茂', '利', '源', '強', '洋', '通', '雅', '昇', '碩', '捷', '合'];
const FOREIGN = ['東京', '新加坡', '首爾', '曼谷', '上海', '矽谷', '倫敦', '雪梨', '胡志明'];

const TYPES = Object.keys(BUSINESSES);

// ───────── 收購情境 ─────────
// price：價格倍率（相對公司價值）｜scale：規模倍率｜bonus：額外年成長
// roll：買下後價值會再擲一次（法拍、新創用）｜req：需要的條件
export const DEAL_KINDS = [
  {
    id: 'normal', label: '一般出售', weight: 22, tone: 'plain',
    price: [1.0, 1.35], scale: [0.5, 2.2], bonus: [-0.008, 0.012],
    note: '老闆想退休，正常價格出售。',
  },
  {
    id: 'urgent', label: '急售', weight: 14, tone: 'good',
    price: [0.65, 0.85], scale: [0.4, 1.6], bonus: [-0.012, 0.006],
    note: '老闆資金周轉不過來，急著脫手，價格比行情低一截。',
  },
  {
    id: 'family', label: '家族接班', weight: 10, tone: 'good',
    price: [0.75, 0.95], scale: [0.6, 1.8], bonus: [0.004, 0.016],
    req: { charm: 60 },
    reqText: '要人緣 60 以上（老闆只賣給看得順眼的人）',
    note: '三代經營的老公司，第二代不想接。老師傅都還在，體質穩。',
  },
  {
    id: 'auction', label: '競標', weight: 12, tone: 'warn',
    price: [1.05, 1.4], scale: [0.8, 2.6], bonus: [0, 0.014],
    auction: true,
    note: '不只你想買，還有別的買家。出價越高越可能標到。',
  },
  {
    id: 'distress', label: '法拍／重整', weight: 10, tone: 'warn',
    price: [0.6, 0.85], scale: [0.7, 2.4], bonus: [-0.02, 0.01],
    roll: [0.4, 1.35],
    note: '公司正在重整，超便宜，但實際值多少要接手後才知道。',
  },
  {
    id: 'rival', label: '同業對手', weight: 10, tone: 'warn',
    price: [1.25, 1.6], scale: [0.8, 2.4], bonus: [0.006, 0.018],
    sameType: true,
    note: '你的競爭對手。買下來很貴，但市場少一個敵人，同產業一起受惠。',
  },
  {
    id: 'overseas', label: '海外公司', weight: 8, tone: 'plain',
    price: [0.95, 1.3], scale: [0.9, 2.8], bonus: [0.008, 0.025], sdBump: 0.08,
    foreign: true,
    note: '海外的公司，成長空間大，但匯率和法規風險也大。',
  },
  {
    id: 'startup', label: '新創團隊', weight: 8, tone: 'warn',
    price: [1.0, 1.3], scale: [0.15, 0.6], bonus: [0.02, 0.05], sdBump: 0.25,
    roll: [0.15, 2.2],
    note: '一群年輕人的新創，金額不大，可能翻好幾倍，也可能血本無歸。',
  },
  {
    id: 'listed', label: '上市公司股權', weight: 6, tone: 'plain',
    price: [1.05, 1.25], scale: [1.5, 3.5], bonus: [-0.004, 0.008], sdCut: 0.3,
    note: '規模大、帳目透明、配息穩定，但成長也比較慢。',
  },
];

const kindById = (id) => DEAL_KINDS.find((k) => k.id === id) || DEAL_KINDS[0];
const between = (rng, [a, b]) => a + rng() * (b - a);
const pickKind = (rng) => {
  const total = DEAL_KINDS.reduce((t, k) => t + k.weight, 0);
  let r = rng() * total;
  for (const k of DEAL_KINDS) {
    r -= k.weight;
    if (r <= 0) return k;
  }
  return DEAL_KINDS[0];
};

const companyName = (rng, typeName, kind) => {
  if (kind.foreign) return `${FOREIGN[Math.floor(rng() * FOREIGN.length)]}${typeName}`;
  const a = PREFIX[Math.floor(rng() * PREFIX.length)];
  const b = SUFFIX[Math.floor(rng() * SUFFIX.length)];
  return `${a}${b}${kind.id === 'startup' ? '科技' : ''}${typeName}`;
};

// 產生這一年的待售公司
export function makeTargets(s, rng, nw = 0, n = 3) {
  const base = Math.max(MIN_DEAL, Math.round(Math.max(nw, s.money) * 0.05));
  const owned = (s.bizs || []).map((b) => b.type);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const kind = pickKind(rng);
    // 同業對手：盡量挑你已經有的產業
    const type = kind.sameType && owned.length
      ? owned[Math.floor(rng() * owned.length)]
      : TYPES[Math.floor(rng() * TYPES.length)];
    const def = BUSINESSES[type];
    const value = Math.max(MIN_DEAL, Math.round((base * between(rng, kind.scale)) / WAN) * WAN);
    const premium = between(rng, kind.price);
    const bonus = Math.round(between(rng, kind.bonus) * 1000) / 1000;
    out.push({
      id: `t${i}-${s.age}`,
      kind: kind.id,
      kindLabel: kind.label,
      tone: kind.tone,
      note: kind.note,
      req: kind.req || null,
      reqText: kind.reqText || null,
      auction: !!kind.auction,
      roll: kind.roll || null,
      sdBump: kind.sdBump || 0,
      sdCut: kind.sdCut || 0,
      type,
      typeName: def.name,
      name: companyName(rng, def.name, kind),
      value,
      price: Math.round((value * premium) / WAN) * WAN,
      premium: Math.round((premium - 1) * 100),
      bonus,
      sameTypeCount: owned.filter((x) => x === type).length,
    });
  }
  return out;
}

export const canAcquire = (s) => !!s.achievedAge;
export const groupCount = (s) => (s.bizs || []).length;

// 條件檢查（家族接班要人緣）
export const meetsReq = (s, t) => !t.req || Object.entries(t.req).every(([k, v]) => s.stats[k] >= v);

// 同產業綜效：集團裡每多一家同產業，年成長多 0.6%（最多 +1.8%）
export const synergy = (s, type) => Math.min(0.018, (s.bizs || []).filter((b) => b.type === type).length * 0.006);

// 競標：出價越高越容易標到
export const AUCTION_BIDS = [
  { id: 'low', label: '照開價出', add: 0, win: 0.4 },
  { id: 'mid', label: '加價一成', add: 0.1, win: 0.72 },
  { id: 'high', label: '加價三成', add: 0.3, win: 0.95 },
];

export const rollValue = (t, rng) => (t.roll ? Math.round(t.value * between(rng, t.roll)) : t.value);
export const dealSummary = (t) => `${t.typeName}．年成長約 ${((BUSINESSES[t.type].mean + t.bonus) * 100).toFixed(1)}%`;
export const dealPriceText = (t) => `${formatMoney(t.price)}（公司價值 ${formatMoney(t.value)}）`;
export const kindOf = kindById;
export const randomBetween = between;
export const gaussRoll = gauss;
