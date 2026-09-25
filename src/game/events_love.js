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

// ───────── 約會：自己挑要花多少錢，花越多親密度漲越快 ─────────
// 交往中加的是 partner.love，結婚後加的是 spouse.love，兩邊用同一套。
export const loveOf = (s) => (s.married ? s.spouse : s.partner);
export const loveVal = (s) => { const p = loveOf(s); return p ? (p.love == null ? 70 : p.love) : 0; };
const addLove = (s, n) => {
  const p = loveOf(s);
  if (!p) return 0;
  const before = p.love == null ? 70 : p.love;
  p.love = Math.max(0, Math.min(100, before + n));
  return p.love - before;
};
const P = (s, wan) => Math.round(wan * WAN * s.priceIndex);

// [標題, 說明, 花費（萬，出生時物價）, 親密度, 其他數值]
const DATES = [
  ['在家煮一頓飯', '散散步、看部片，不花什麼錢', 0.2, 5, { happy: 2 }],
  ['看電影＋吃飯', '最普通的那種約會', 1.5, 12, { happy: 3, charm: 1 }],
  ['週末小旅行', '訂間民宿，兩天一夜', 6, 22, { happy: 6, hp: 1 }],
  ['出國玩一趟＋送禮', '機票飯店加一份禮物，很有誠意', 20, 36, { happy: 10, charm: 2 }],
];

const dateChoice = ([title, desc, wan, love, stats], i) => ({
  label: (s) => `${title}　${formatMoney(P(s, wan))}`,
  sub: (s) => `${desc}．親密度 +${love}`,
  // 第一個最便宜的永遠選得到，其他的錢不夠就鎖起來
  ...(i === 0 ? {} : {
    cond: (s) => s.money >= P(s, wan),
    showLocked: (s) => `錢不夠（要 ${formatMoney(P(s, wan))}，你有 ${formatMoney(Math.max(0, s.money))}）`,
  }),
  effect: (s) => {
    const cost = P(s, wan);
    s.money -= cost;
    const got = addLove(s, love);
    const who = (loveOf(s) || {}).name || '對方';
    const tail = `花了 ${formatMoney(cost)}，親密度 +${got}（現在 ${loveVal(s)}）。${addStats(s, stats)}`;
    const lines = [
      `你們在家煮了一頓飯，吃完窩在沙發上看片。「${who}」說這樣就很好。${tail}`,
      `你約「${who}」去看電影，散場後找了間小店吃宵夜，聊到店家要打烊。${tail}`,
      `你帶「${who}」去了兩天一夜的小旅行，民宿窗外剛好看得到海。${tail}`,
      `你帶「${who}」出國玩了一趟，回程在機場把禮物拿出來，對方愣了一下才笑出來。${tail}`,
    ];
    return good(lines[i]);
  },
});

export const DATE_EVENT = {
  id: 'date_plan', minAge: 16, maxAge: 70, weight: 8,
  cond: (s) => !!(s.partner || (s.married && s.spouse)),
  title: '安排一次約會',
  text: (s) => {
    const p = loveOf(s);
    const rel = s.married ? '另一半' : '交往對象';
    return `${rel}「${p ? p.name : ''}」最近念了你好幾次「我們很久沒出去了」。這次想怎麼安排？（目前親密度 ${loveVal(s)} / 100）`;
  },
  choices: DATES.map(dateChoice),
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
