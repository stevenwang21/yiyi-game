// 認識新對象：每次隨機端出 3 個人選，可以自己挑
import { addStats, chance, formatMoney, WAN } from './utils.js';
import { partnerPool } from './data.js';
import { PARTNER_TYPES, currentType } from './partners.js';
import { startDating } from './actions.js';

const good = (text) => ({ text, tone: 'good' });

// 每次事件跳出來之前，先幫每一種對象抽一個名字（這樣選項上才有名字）
const rollNames = (s, rng) => {
  const used = new Set(s.exes || []);
  const all = partnerPool(s);
  const pool = (all.filter((n) => !used.has(n)).length >= 6 ? all.filter((n) => !used.has(n)) : [...all]);
  // 洗牌，讓同一次出現的人選名字不會重複
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const names = {};
  PARTNER_TYPES.forEach((t, i) => { names[t.id] = pool[i % pool.length]; });
  s.flags.meetNames = names;
};

const nameOf = (s, id) => (s.flags.meetNames && s.flags.meetNames[id]) || '對方';

const meetChoices = PARTNER_TYPES.map((t) => ({
  label: (s) => `${nameOf(s, t.id)}（${t.title}）`,
  sub: (s) => `${t.perkText}．年收入約 ${formatMoney(t.income * WAN * s.priceIndex)}`,
  effect: (s, rng) => {
    const p = startDating(s, rng, t.id, nameOf(s, t.id));
    return good(`你和「${p.name}」（${t.title}）開始交往了！${t.perkText}。${addStats(s, { happy: 10 })}`);
  },
}));

export const MEET_EVENT = {
  id: 'meet_someone', minAge: 16, maxAge: 58, weight: 7,
  cond: (s) => !s.partner && !s.married,
  title: '有人想介紹對象給你',
  text: (s) => (s.age < 22
    ? '朋友揪你去聯誼，現場有幾個人對你有意思。要跟誰進一步認識？'
    : '朋友熱心地要幫你介紹對象，傳了幾個人的資料給你。你想認識誰？'),
  before: (s, rng) => rollNames(s, rng),
  pick: 3, // 每次隨機端出 3 個人選
  choices: [
    ...meetChoices,
    { label: '這次先算了', sub: '專心在自己身上', always: true, effect: (s) => `你婉拒了朋友的好意。${addStats(s, { int: 1 })}` },
  ],
};

// 交往中偶爾會發現對方的專長幫上忙
export const LOVE_EVENTS = [
  {
    id: 'partner_help', minAge: 18, maxAge: 65, weight: 2,
    cond: (s) => !!currentType(s),
    title: '另一半幫了大忙',
    effect: (s, rng) => {
      const t = currentType(s);
      const amt = Math.round((3 + rng() * 8) * WAN * s.priceIndex);
      s.money += amt;
      return good(`「${(s.married ? s.spouse : s.partner).name}」用${t.title}的專業幫你處理了一件麻煩事，省下 ${formatMoney(amt)}。${addStats(s, { happy: 3 })}`);
    },
  },
  {
    id: 'partner_quarrel', minAge: 18, maxAge: 65, weight: 2,
    cond: (s) => !!s.partner && !s.married,
    title: '吵架了',
    text: (s) => `你和「${s.partner.name}」為了一件小事吵得很兇。`,
    choices: [
      {
        label: '先低頭，好好談',
        sub: '感情↑',
        effect: (s) => { s.partner.love = Math.min(100, s.partner.love + 15); return good(`你先開口道歉，兩個人把話講開了。${addStats(s, { happy: 3, charm: 1 })}`); },
      },
      {
        label: '冷戰幾天',
        sub: '感情↓',
        effect: (s) => { s.partner.love = Math.max(0, s.partner.love - 12); return `兩個人冷戰了一個星期，誰都不想先開口。${addStats(s, { happy: -4 })}`; },
      },
      {
        label: '買個禮物道歉',
        sub: '要花錢但感情↑↑',
        effect: (s) => {
          const c = Math.round(3 * WAN * s.priceIndex);
          s.money -= c;
          s.partner.love = Math.min(100, s.partner.love + 22);
          return good(`你買了對方念很久的東西，氣馬上就消了。${formatMoney(c)} 換一個笑容。${addStats(s, { happy: 5 })}`);
        },
      },
    ],
  },
  {
    id: 'partner_move_in', minAge: 22, maxAge: 60, weight: 2, once: true,
    cond: (s) => !!s.partner && !s.married && s.partner.love >= 60,
    title: '要不要同居？',
    text: (s) => `「${s.partner.name}」提議一起住，房租和生活費可以分攤。`,
    choices: [
      {
        label: '好啊，一起住',
        sub: '生活費省一點、感情↑',
        effect: (s) => { s.flags.cohabit = true; s.partner.love = Math.min(100, s.partner.love + 10); return good(`兩個人搬到一起，生活費分攤後省了不少。${addStats(s, { happy: 6 })}`); },
      },
      { label: '再等等', sub: '保持現狀', effect: (s) => `你覺得現在這樣就很好。${addStats(s, { happy: 1 })}` },
    ],
  },
];
