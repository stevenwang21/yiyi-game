// 傳承點數：每玩完一輩子，依這一生的成就換成點數，存在首頁。
// 點數可以買「永久升級」（每年多一點精力、延後退休），買了之後每一輩子都有效。
import { YI } from './utils.js';

const WAN = 10000;

export const BASE_SLOTS = 3;
export const BASE_RETIRE = 65;

export const META_UPGRADES = {
  slots: {
    name: '每年多一點精力',
    icon: '⚡',
    max: 2,
    cost: (lv) => [40, 80][lv],
    now: (lv) => `每年精力 ${4 + lv} 點（輕鬆的事 1 點、累的事 2 點）`,
    next: (lv) => `精力 ${4 + lv} → ${5 + lv} 點`,
  },
  retire: {
    name: '延後退休',
    icon: '⏳',
    max: 15, // 65 → 最多 80 歲
    cost: (lv) => 8 + lv * 2,
    now: (lv) => `${BASE_RETIRE + lv} 歲退休結算`,
    next: (lv) => `${BASE_RETIRE + lv} → ${BASE_RETIRE + lv + 1} 歲`,
  },
};

export const emptyMeta = () => ({ points: 0, earned: 0, lives: 0, slots: 0, retire: 0 });

export const normalizeMeta = (m) => ({ ...emptyMeta(), ...(m || {}) });

export function buyMeta(m0, key) {
  const m = normalizeMeta(m0);
  const u = META_UPGRADES[key];
  if (!u) return { meta: m0, error: '沒有這個升級' };
  const lv = m[key] || 0;
  if (lv >= u.max) return { meta: m0, error: '已經升到最高了' };
  const c = u.cost(lv);
  if (m.points < c) return { meta: m0, error: `需要 ${c} 點（目前 ${m.points} 點）` };
  return { meta: { ...m, points: m.points - c, [key]: lv + 1 } };
}

// 所有可以拿到的成就（給畫面列出「還沒拿到的」用）
export const ACH_HINTS = [
  ['retire', '平安活到退休 +3'], ['yi', '達成一個億 +10'], ['yiEarly', '提早破億 +3～6'],
  ['double', '資產每翻一倍 +3'], ['route', '完成逆襲路線 +6'], ['legend', '當上傳說職業 +8'],
  ['rank1', '同屆第一名 +4'], ['skip', '跳級 +2'], ['topSchool', '考上明星高中 +1'],
  ['edu', '頂尖大學或研究所 +2～3'], ['idol', '偶像出道 +3'], ['band', '熱音大賽得名 +2'],
  ['married', '結婚 +2'], ['kids', '養大孩子 每個 +1'], ['kidStar', '孩子很有成就 每個 +2'],
  ['house', '買房 +1'], ['biz', '自己開公司 +2'], ['mna', '收購公司 +3'],
];

// 難度越高，同樣的成就換到越多點
export const DIFF_MULT = { easy: 0.7, normal: 1, hard: 1.3, hell: 1.8 };

const nwOf = (s) => {
  const inv = (s.etf || 0) + (s.stock || 0) + (s.gold || 0) + (s.crypto || 0) + (s.deposit || 0);
  const house = (s.houses || []).reduce((t, h) => t + (h.value || 0), 0);
  const biz = (s.bizs || []).reduce((t, b) => t + (b.value || 0), 0);
  const debt = (s.debts || []).reduce((t, d) => t + (d.balance || 0), 0);
  return (s.money || 0) + inv + house + biz - debt;
};

// 這一生的成就清單（進行中也可以算，會顯示「目前已經拿到的」）
export function lifeAchievements(s, rankInfo = null, nwIn = null) {
  const list = [];
  const add = (id, label, pts) => { if (pts > 0) list.push({ id, label, pts }); };
  const nw = nwIn != null ? nwIn : nwOf(s);
  const done = !!s.ended;

  if (done && s.ended.reason !== 'death') add('retire', '平安活到退休', 3);
  if (s.achievedAge) {
    add('yi', '達成一個億', 10);
    const early = (s.endAge || BASE_RETIRE) - s.achievedAge;
    if (early >= 25) add('yiEarly', `${s.achievedAge} 歲就破億（超早）`, 6);
    else if (early >= 15) add('yiEarly', `${s.achievedAge} 歲就破億`, 3);
    // 每翻一倍 +3（2 億、4 億、8 億……最多算 6 次）
    let times = 0;
    for (let x = YI * 2; x <= nw && times < 6; x *= 2) times += 1;
    if (times) add('double', `資產翻倍 ${times} 次（${Math.round(nw / YI)} 億）`, times * 3);
  } else if (nw >= 5000 * WAN) {
    add('half', '資產超過 5,000 萬', 3);
  }
  if (s.route && s.route.done) add('route', '完成逆襲路線', 6);
  if ((s.legends || []).length) add('legend', '當上傳說職業', 8);
  if (s.flags && s.flags.skipYears) add('skip', '跳級生', 2);
  if (s.flags && s.flags.topSchool) add('topSchool', '考上明星高中', 1);
  if (s.edu === 'topCollege') add('edu', '頂尖大學畢業', 2);
  if (s.edu === 'master') add('edu', '研究所畢業', 2);
  if (s.edu === 'topMaster') add('edu', '頂尖研究所畢業', 3);
  if (s.flags && s.flags.idol >= 2) add('idol', '偶像出道', 3);
  if (s.flags && s.flags.band >= 2) add('band', '熱音大賽得名', 2);
  if (s.married) add('married', '結婚', 2);
  const kids = (s.kids || []).length;
  if (kids) add('kids', `養大 ${kids} 個孩子`, Math.min(kids, 4));
  const stars = (s.kids || []).filter((k) => k.outcome === 'star').length;
  if (stars) add('kidStar', `${stars} 個孩子很有成就`, stars * 2);
  const f = s.flags || {};
  if ((s.houses || []).length || f.everHouse) add('house', '買了房子', 1);
  if ((s.bizs || []).some((b) => !b.group) || f.everBiz) add('biz', '自己開過公司', 2);
  if ((s.bizs || []).some((b) => b.group) || f.everMna) add('mna', '收購過公司', 3);
  if (rankInfo && rankInfo.rank === 1 && done) add('rank1', '同屆第一名', 4);
  return list;
}

export function lifePoints(s, rankInfo = null, nwIn = null) {
  const list = lifeAchievements(s, rankInfo, nwIn);
  const base = list.reduce((t, x) => t + x.pts, 0);
  const mult = DIFF_MULT[s.difficulty] || 1;
  return { list, base, mult, total: Math.round(base * mult) };
}
