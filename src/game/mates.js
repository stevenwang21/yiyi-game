// 同屆同學：從國小就在你身邊的 5 個人。
// 小時候比成績，一步一步升學；出社會之後才有職業，靠自己的努力升遷、累積資產。
import { gauss, rint, WAN, formatMoney } from './utils.js';
import { randomPerson } from './data.js';

// income：入行年收入（出生時的物價，萬）｜growth：資產年成長｜sd：波動｜crash：股災年額外影響
// ladder：職涯階梯（每升一級收入變多）｜edu：哪些學歷才走得到這條路
export const MATE_PATHS = [
  { id: 'civil', title: '公務員', income: 60, growth: 0.03, sd: 0.05, crash: 0, edu: ['top', 'college', 'high'], ladder: ['公務員', '資深公務員', '科長', '處長'], story: '考上公職，日子過得穩穩的' },
  { id: 'teacher', title: '老師', income: 55, growth: 0.035, sd: 0.06, crash: -0.02, edu: ['top', 'college'], ladder: ['老師', '資深老師', '主任', '校長'], story: '在學校教書，寒暑假到處玩' },
  { id: 'engineer', title: '工程師', income: 120, growth: 0.06, sd: 0.12, crash: -0.1, edu: ['top', 'college'], ladder: ['工程師', '資深工程師', '技術主管', '技術長'], story: '進了科技廠，年年有股票' },
  { id: 'doctor', title: '醫生', income: 190, growth: 0.05, sd: 0.08, crash: -0.05, edu: ['top'], ladder: ['住院醫師', '主治醫師', '科主任', '院長'], story: '當上醫生，忙到沒時間花錢' },
  { id: 'founder', title: '創業家', income: 80, growth: 0.13, sd: 0.45, crash: -0.35, edu: ['top', 'college', 'high', 'voc'], ladder: ['創業中', '小公司老闆', '中型企業老闆', '集團董事長'], story: '出來開公司，起起落落' },
  { id: 'influencer', title: '網紅', income: 60, growth: 0.1, sd: 0.5, crash: -0.15, edu: ['college', 'high', 'voc'], ladder: ['小網紅', '網紅', '百萬網紅', '自媒體老闆'], story: '全職做自媒體，紅了又退燒' },
  { id: 'sales', title: '業務', income: 75, growth: 0.07, sd: 0.2, crash: -0.12, edu: ['top', 'college', 'high', 'voc'], ladder: ['業務', '業務主管', '業務經理', '營業處長'], story: '一路做業務，獎金領到手軟' },
  { id: 'realtor', title: '房仲', income: 70, growth: 0.08, sd: 0.25, crash: -0.2, edu: ['college', 'high', 'voc'], ladder: ['房仲', '資深房仲', '店長', '房產投資人'], story: '專做房地產，跟著房市起伏' },
  { id: 'chef', title: '廚師', income: 60, growth: 0.08, sd: 0.3, crash: -0.25, edu: ['college', 'high', 'voc'], ladder: ['廚師', '主廚', '開餐廳', '餐飲集團老闆'], story: '從廚房學徒做起' },
  { id: 'trader', title: '專職投資', income: 0, growth: 0.12, sd: 0.38, crash: -0.4, edu: ['top', 'college'], ladder: ['專職投資', '操盤手', '私募基金經理', '投資大戶'], story: '辭職在家看盤，全押市場' },
  { id: 'heir', title: '繼承家業', income: 100, growth: 0.05, sd: 0.15, crash: -0.1, start: 3000, edu: ['top', 'college', 'high', 'voc'], ladder: ['接班人', '家業二代', '企業老闆', '集團董事長'], story: '接下家裡的事業' },
  { id: 'drifter', title: '打零工', income: 35, growth: 0.012, sd: 0.05, crash: 0, edu: ['high', 'voc'], ladder: ['打零工', '約聘人員', '正職員工', '小主管'], story: '做過很多工作，沒有一份待很久' },
];

const pathById = (id) => MATE_PATHS.find((p) => p.id === id) || MATE_PATHS[0];
const LEVEL_INCOME = [1, 1.3, 1.7, 2.3];

export const START_AGE = 6; // 國小開始就有同學
export const MONEY_RANK_AGE = 18; // 18 歲以前比成績，之後比資產

export function makeMates(rng, n = 5) {
  const used = new Set();
  const out = [];
  for (let i = 0; i < n; i += 1) {
    let who = randomPerson(rng);
    let guard = 0;
    while (used.has(who.name) && guard++ < 20) who = randomPerson(rng);
    used.add(who.name);
    out.push({
      name: who.name,
      gender: who.gender,
      // 小時候的樣子：成績、努力程度、家裡有沒有事業
      grade: rint(rng, 35, 75),
      drive: 0.6 + rng() * 0.8, // 努力程度：成績漲得快不快、升遷快不快
      rich: rng() < 0.15,
      stage: 'elem',
      edu: null,
      path: null,
      title: '小學生',
      level: 0,
      nw: 0,
      luck: 0.85 + rng() * 0.35,
      peak: 0,
    });
  }
  return out;
}

const STAGE_TITLE = { elem: '小學生', junior: '國中生', high: '高中生', voc: '高職生', top: '頂大生', college: '大學生', master: '研究生' };

// 出社會：依學歷挑一條路
function startWork(m, rng, used) {
  if (m.rich) {
    m.path = 'heir';
  } else {
    const ok = MATE_PATHS.filter((p) => p.id !== 'heir' && p.edu.includes(m.edu) && !used.has(p.id));
    const pool = ok.length ? ok : MATE_PATHS.filter((p) => p.id !== 'heir' && p.edu.includes(m.edu));
    m.path = pool[Math.floor(rng() * pool.length)].id;
  }
  const p = pathById(m.path);
  m.stage = 'work';
  m.level = 0;
  m.title = p.ladder[0];
  m.nw = Math.round((p.start || 0) * WAN * (0.7 + rng() * 0.6)) + m.nw;
}

// 舊存檔沒有這些欄位：補上
function normalize(m, s) {
  if (m.stage) return;
  m.grade = m.grade ?? 60;
  m.drive = m.drive ?? 1;
  m.rich = !!m.rich;
  if (m.path) { m.stage = 'work'; m.edu = 'college'; m.level = m.level ?? 0; m.title = pathById(m.path).ladder[m.level]; }
  else { m.stage = s.age < 12 ? 'elem' : s.age < 15 ? 'junior' : s.age < 18 ? 'high' : 'college'; m.title = STAGE_TITLE[m.stage]; m.level = 0; }
}

// 每年幫同學過一年
export function mateYear(s, rng) {
  if (!s.mates || s.age < START_AGE) return;
  const crash = s.world && s.world.crash;
  const used = new Set(s.mates.map((m) => m.path).filter(Boolean));
  for (const m of s.mates) {
    normalize(m, s);
    if (m.stage !== 'work') {
      // 讀書：成績跟著努力程度慢慢變
      m.grade = Math.max(0, Math.min(100, Math.round(m.grade + gauss(rng, (m.drive - 0.85) * 3, 3))));
      // 升學：跟玩家同齡
      if (s.age === 12) { m.stage = 'junior'; }
      if (s.age === 15) { m.stage = m.grade >= 55 ? 'high' : 'voc'; }
      if (s.age === 18) {
        if (m.stage === 'high' && m.grade >= 80) { m.stage = 'top'; m.edu = 'top'; }
        else if (m.grade >= 50) { m.stage = 'college'; m.edu = 'college'; }
        else { m.edu = m.stage === 'voc' ? 'voc' : 'high'; startWork(m, rng, used); used.add(m.path); }
      }
      if (s.age === 22 && (m.stage === 'top' || m.stage === 'college')) {
        if (m.grade >= 85 && m.drive > 1) m.stage = 'master';
        else { startWork(m, rng, used); used.add(m.path); }
      }
      if (s.age === 24 && m.stage === 'master') { startWork(m, rng, used); used.add(m.path); }
      if (m.stage !== 'work') {
        m.title = STAGE_TITLE[m.stage];
        // 學生時期只有一點零用錢和打工
        if (s.age >= 16) m.nw += Math.round(rint(rng, 2, 6) * WAN * s.priceIndex * m.drive);
      }
      if (m.stage !== 'work') continue;
    }
    // 出社會：靠努力升遷（每級要熬幾年）
    const p = pathById(m.path);
    m.years = (m.years || 0) + 1;
    if (m.level < p.ladder.length - 1 && m.years >= 3 && rng() < 0.14 * m.drive) {
      m.level += 1;
      m.years = 0;
      m.title = p.ladder[m.level];
    }
    let r = gauss(rng, p.growth * m.luck, p.sd);
    if (crash) r += p.crash;
    if (m.nw > 5000 * WAN) r -= 0.045 * Math.log10(m.nw / (5000 * WAN));
    r = Math.max(-0.6, Math.min(0.9, r));
    const save = p.income * LEVEL_INCOME[m.level] * WAN * s.priceIndex * 0.35 * m.luck;
    m.nw = Math.max(-500 * WAN, Math.round(m.nw * (1 + r) + save));
    if (m.nw > m.peak) m.peak = m.nw;
  }
}

// 現在是比什麼：小時候比成績，出社會比資產
export const rankMode = (s) => (s.age < MONEY_RANK_AGE ? 'grade' : 'nw');

// 排名（含玩家自己）。label 是要顯示的數值（成績或錢）
export function ranking(s, myNw) {
  const mode = rankMode(s);
  const list = [
    ...(s.mates || []).map((m) => ({
      name: m.name, title: m.title || '同學', nw: m.nw, grade: m.grade ?? 60, gender: m.gender || 'male', me: false,
    })),
    { name: s.name, title: '你', nw: myNw, grade: s.stats ? s.stats.int : 60, gender: s.gender || 'male', me: true },
  ];
  list.sort((a, b) => (mode === 'grade' ? b.grade - a.grade : b.nw - a.nw));
  return list.map((x, i) => ({ ...x, rank: i + 1, label: mode === 'grade' ? `成績 ${x.grade}` : formatMoney(x.nw) }));
}

export function myRank(s, myNw) {
  const list = ranking(s, myNw);
  const me = list.find((x) => x.me);
  return { rank: me ? me.rank : 1, total: list.length, top: list[0], mode: rankMode(s) };
}

export const mateStory = (m) => {
  if (m.stage && m.stage !== 'work') {
    const drive = m.drive >= 1.15 ? '超級認真' : m.drive >= 0.9 ? '普通認真' : '不太念書';
    return `${drive}．成績 ${m.grade}`;
  }
  return pathById(m.path).story;
};

// 同學會：每 5 年一次
export const REUNION_AGES = [25, 30, 35, 40, 45, 50, 55, 60, 65];

export function reunionText(s, myNw) {
  const list = ranking(s, myNw);
  const lines = list.map((x) => `${x.rank}. ${x.me ? `${x.name}（你）` : `${x.name}（${x.title}）`}　${x.label}`);
  const me = list.find((x) => x.me);
  const head = me.rank === 1
    ? '你是全場最有錢的那個，大家都圍過來跟你敬酒。'
    : me.rank <= 2
      ? '你排在前面，但還有人比你更狠。'
      : `你排第 ${me.rank} 名，看著前面的人有點不是滋味。`;
  return `${s.age} 歲的同學會，大家聊著這些年做了什麼。\n\n${lines.join('\n')}\n\n${head}`;
}

export const luckyBump = (rng) => 0.9 + rng() * 0.3;
export const randomInt = rint;
