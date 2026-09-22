// 遊戲引擎：所有函式都不會改動傳入的 state，會回傳新的 state
import {
  addMoney, addStats, driftStats, chance, formatMoney, formatMoneyFine, gauss, rint, weightedPick, WAN, YI,
} from './utils.js';
import {
  ASSETS, BIZ_MIN_CAPITAL, BUSINESSES, CHECKUP_COST, DEBT_RATE, DOWN_PAYMENT, EDU, FAMILIES, HOUSES,
  INVEST_MIN_AGE, JOBS, KID_COST, KID_CRAM_COST, KID_INDEPENDENT, KID_STYLES, kidStyleById, KID_OUTCOMES, KID_SPECIAL_COST, KID_SPECIAL_ADULT, KID_SPECIAL_OUTCOMES, MAX_BIZ, MAX_KIDS, MORTGAGE_RATE,
  OPEN_BIZ, RENT_YIELD, familyById, jobById, PETS, PET_VACCINE, DIFFICULTIES, GENDERS, genderById, partnerWord, SURNAMES, randomPersonName,
  BASE_RETIRE_AGE, MAX_RETIRE_AGE, retireCost, SPOUSE_LEVELS, SPOUSE_COSTS,
  DATE_COST_STUDENT, DATE_COST_ADULT, DATE_FOCUS_COST,
} from './data.js';
import { EVENTS, eventById } from './events.js';
import { MILESTONES, GRAD_TUITION, examScore } from './milestones.js';
import { ROUTES } from './routes.js';
import { WORLD_EVENTS, INDEX_META } from './world.js';
import { perksOf } from './perks.js';
import { currentType, partnerIncome, PARTNER_TYPES } from './partners.js';
import { makeMates, mateYear, ranking, myRank, rankMode, reunionText, REUNION_AGES, START_AGE as MATE_START } from './mates.js';
import { makeTargets, canAcquire, MAX_GROUP, groupCount, meetsReq, synergy, rollValue, AUCTION_BIDS } from './mna.js';
import { LEGENDS, legendById, availableLegend } from './legends.js';
import { lifePoints } from './meta.js';
import {
  addDebt, addPoints, bizTotal, debtTotal, endRelationship, houseTotal, housePrice, investTotal, netWorth,
  removeBiz, spouseInfo, spouseTitle, startBiz, addPet, alivePets, petExpense, diffOf, marry, underIdolContract, idolJobId, bizLevel, canOpenSecondBiz,
} from './actions.js';

export { formatMoneyFine } from './utils.js';
export { netWorth, debtTotal, houseTotal, investTotal, bizTotal, housePrice, spouseInfo, formatMoney, YI, INDEX_META };
export { SPOUSE_LEVELS, SPOUSE_COSTS, MAX_RETIRE_AGE, BASE_RETIRE_AGE, DIFFICULTIES, GENDERS, genderById, partnerWord };
export { diffOf };
export { KID_STYLES, kidStyleById, KID_OUTCOMES };
export { spouseTitle };
export { isTop } from './events_top.js';
export { META_UPGRADES, emptyMeta, normalizeMeta, buyMeta, DIFF_MULT, ACH_HINTS } from './meta.js';

// 這一生目前換得到幾點傳承點數（進行中也能看）
export function lifeScore(s) {
  const nw = netWorth(s);
  const rank = (s.mates || []).length ? myRank(s, nw) : null;
  return lifePoints(s, rank, nw);
}
export { motherAge, conceiveChance, downsChance, bizLevel, BIZ_LEVELS, canOpenSecondBiz } from './actions.js';
export { LEGENDS, legendById };
export { ROUTES, HOUSES, ASSETS, BUSINESSES, DOWN_PAYMENT, INVEST_MIN_AGE, MAX_BIZ, MAX_KIDS };
export { currentType, PARTNER_TYPES };
export const perkOf = (s) => (s.perk ? s.perk : perksOf(s));
export { ranking, myRank, rankMode };
export { MAX_GROUP, canAcquire, meetsReq, synergy, AUCTION_BIDS, DEAL_KINDS } from './mna.js';
export const mateList = (s) => s.mates || [];

export const SAVE_VERSION = 3;
export const BASE_FOCUS_SLOTS = 3; // 每年最多可以選幾個重點
export const MAX_FOCUS_SLOTS = 5;
export const FOCUS_SLOT_COSTS = [10, 16]; // 升到 4、5 個要幾點
const MAX_LOG = 600;
const clone = (s) => JSON.parse(JSON.stringify(s));

const log = (s, text, tone = 'neutral') => {
  s.log.push({ age: s.age, text, tone });
  if (s.log.length > MAX_LOG) s.log.splice(0, s.log.length - MAX_LOG);
};

const pctText = (r, digits = 1) => `${r >= 0 ? '+' : ''}${(r * 100).toFixed(digits)}%`;

// ───────────────────────── 開新遊戲 ─────────────────────────
export function newGame(name, rng = Math.random, difficulty = 'normal', gender = 'male', meta = null) {
  const mt = meta || {};
  const d0 = DIFFICULTIES.find((x) => x.id === difficulty) || DIFFICULTIES[0];
  // 地獄難度：出身偏清寒
  const famWeight = (f) => (d0.poor ? { poor: 60, normal: 30, rich: 9, tycoon: 1 }[f.id] || f.weight : f.weight);
  const fam = weightedPick(rng, FAMILIES, famWeight);
  const sp = d0.statPenalty || 0;
  const idx = { etf: 100, stock: 100, gold: 100, crypto: 100, house: 100 };
  const s = {
    version: SAVE_VERSION,
    name: name || '無名氏',
    family: fam.id,
    difficulty,
    gender,
    surname: (name && name.length >= 3 ? name[0] : SURNAMES[Math.floor(rng() * SURNAMES.length)]),
    age: 0,
    stats: { int: rint(rng, 30 - sp, 60 - sp), hp: rint(rng, 60 - sp, 85 - sp), happy: rint(rng, 55 - sp, 80 - sp), charm: rint(rng, 30 - sp, 60 - sp) },
    money: 0,
    deposit: 0, etf: 0, stock: 0, gold: 0, crypto: 0,
    dca: 0,
    investSkill: 0,
    houses: [],
    debts: [],
    bizs: [],
    job: null,
    route: null,
    title: null,
    edu: 'none',
    studying: true,
    married: false,
    partner: null,
    exes: [],
    spouse: null,
    spouseLevel: 0,
    kids: [],
    kidSpent: 0,
    pets: [],
    petSpent: 0,
    careers: [],
    jobIds: [],
    legends: [],
    flags: {},
    seen: {},
    focus: 'grow',
    focuses: [],
    focusSlots: BASE_FOCUS_SLOTS + Math.min(2, mt.slots || 0),
    pending: null,
    ended: null,
    bornAt: Date.now(),
    // 世界與通膨
    world: null,
    idx,
    priceIndex: 1,
    inflation: 0,
    myStock: 100,
    idxHistory: [{ ...idx, myStock: 100, price: 1 }],
    worldHistory: [],
    lastReturns: null,
    lastYear: null,
    // 健康
    risk: 10,
    knownRisk: null,
    checkupAge: null,
    workStreak: 0,
    hpHistory: [],
    // 紀錄
    history: [0],
    invHistory: [0],
    achievedAge: null,
    best: null,
    worst: null,
    lastEvent: null,
    // 點數與退休
    points: 0,
    pointsTotal: 0,
    pointsLog: [],
    endAge: BASE_RETIRE_AGE + Math.min(15, mt.retire || 0),
    uid: 1,
    log: [],
    // 同屆同學、待售公司
    mates: makeMates(rng),
    targets: [],
    targetYear: -1,
  };
  s.hpHistory.push(s.stats.hp);
  log(s, `${s.name}（${genderById(gender).name}）出生在一個${fam.name}（難度：${diffOf(s).name}）。人生的目標：65 歲前賺到一個億！`, 'milestone');
  return s;
}

// ───────────────────────── 階段、年度重點 ─────────────────────────
export const eduName = (s) => EDU[s.edu].name;

export function stageOf(s) {
  if (s.age < 6) return '幼兒';
  if (s.studying) {
    if (s.age < 12) return '國小生';
    if (s.age < 15) return '國中生';
    if (s.age < 18) return s.edu === 'vocational' ? '高職生' : '高中生';
    if (s.flags.inMaster) return '研究生';
    return '大學生';
  }
  if (s.job) return s.job.name;
  if (s.bizs.length) return s.bizs.length > 1 ? '兩家公司的老闆' : '老闆';
  return s.age < 18 ? '打工少年' : '待業中';
}

export const isAdult = (s) => !s.studying && s.age >= 15;
export const canInvest = (s) => s.age >= INVEST_MIN_AGE;
export const progressPct = (s) => (netWorth(s) / YI) * 100;

export const FOCUS = {
  grow: { label: '健康長大', sub: '' },
  study: { label: '認真讀書', sub: '智力↑ 快樂↓' },
  cram: { label: '去補習', sub: '智力↑↑ 快樂↓↓' },
  sport: { label: '運動', sub: '健康↑' },
  play: { label: '盡情玩樂', sub: '快樂↑↑ 智力↓' },
  friends: { label: '交朋友', sub: '人緣↑' },
  parttime: { label: '打工', sub: '賺零用錢' },
  finance: { label: '學理財', sub: '投資眼光↑' },
  work: { label: '認真工作', sub: '加薪、升遷↑ 健康↓' },
  gig: { label: '打零工', sub: '賺一點生活費' },
  jobhunt: { label: '找新工作', sub: '年底有職缺' },
  learn: { label: '進修', sub: '智力↑ 要花錢' },
  rest: { label: '休息旅遊', sub: '快樂↑ 健康↑' },
  gym: { label: '運動健身', sub: '健康↑↑' },
  network: { label: '經營人脈', sub: '人緣↑' },
  invest: { label: '研究投資', sub: '投資眼光↑' },
  family: { label: '家庭時光', sub: '快樂↑ 可以生小孩' },
  date: { label: '約會', sub: '感情↑ 要花錢' },
  startbiz: { label: '創業', sub: '至少 50 萬' },
  runbiz: { label: '經營事業', sub: '公司成長↑' },
};

export function focusOptions(s) {
  if (s.age < 6) return [];
  const ids = [];
  if (s.studying) {
    ids.push('study');
    if (s.age <= 17) ids.push('cram');
    ids.push('sport', 'play', 'friends');
    if (s.age >= 16) ids.push('parttime');
    if (s.age >= 12) ids.push('finance');
    if (s.partner) ids.push('date');
  } else {
    ids.push(s.job ? 'work' : 'gig');
    if (s.bizs.length) ids.push('runbiz');
    ids.push('learn', 'rest', 'gym', 'network', 'invest');
    if (s.married) ids.push('family');
    if (s.partner && !s.married) ids.push('date');
    ids.push('jobhunt');
    if (s.bizs.filter((b) => !b.group).length < MAX_BIZ && s.age >= 18) ids.push('startbiz');
  }
  return ids.map((id) => {
    const o = { id, ...FOCUS[id], disabled: false };
    if (id === 'startbiz' && s.money < BIZ_MIN_CAPITAL) {
      o.disabled = true;
      o.sub = '現金需 50 萬';
    }
    if (id === 'startbiz' && s.bizs.filter((b) => !b.group).length === 1) {
      const first = s.bizs.find((b) => !b.group);
      const L = bizLevel(first, s);
      if (L.lv < 5) { o.disabled = true; o.sub = `第一家需 Lv5（現 Lv${L.lv}）`; } else if (!o.disabled) o.sub = '開第二家公司';
    }
    if (id === 'runbiz' && s.bizs.length === 2) o.sub = '兩家公司一起顧';
    if (id === 'family' && s.kids.length >= MAX_KIDS) o.sub = '快樂↑';
    if (id === 'jobhunt') {
      if (underIdolContract(s)) { o.disabled = true; o.sub = `偶像合約到 ${s.flags.idolEnd} 歲`; }
      else if (s.job && s.job.years < JOB_LOCK_YEARS) { o.disabled = true; o.sub = `做滿 ${JOB_LOCK_YEARS} 年才能轉職（還 ${JOB_LOCK_YEARS - s.job.years} 年）`; }
    }
    return o;
  });
}

// 選了一份工作要做滿幾年才能轉職或挑戰更高的工作
export const JOB_LOCK_YEARS = 5;

export const focusSlots = (s) => s.focusSlots || BASE_FOCUS_SLOTS;

// 目前選的重點（會自動去掉已經不能選的）
export function getFocuses(s) {
  const opts = focusOptions(s);
  if (!opts.length) return [];
  const ok = new Set(opts.filter((o) => !o.disabled).map((o) => o.id));
  const list = (s.focuses || (s.focus ? [s.focus] : [])).filter((id) => ok.has(id));
  const uniq = [...new Set(list)].slice(0, focusSlots(s));
  return uniq.length ? uniq : [opts[0].id];
}

const hasFocus = (s, id) => (s.focuses || []).includes(id);

// 點一下選取／取消；超過上限時回傳 error
export function toggleFocus(s0, id) {
  const o = focusOptions(s0).find((x) => x.id === id);
  if (!o || o.disabled) return { state: s0 };
  const cur = getFocuses(s0);
  let next;
  if (cur.includes(id)) {
    next = cur.filter((x) => x !== id);
    if (!next.length) return { state: s0, error: '至少要選一個' };
  } else {
    if (cur.length >= focusSlots(s0)) return { state: s0, error: `一年最多選 ${focusSlots(s0)} 個，先取消一個（可以用點數增加上限）` };
    next = [...cur, id];
  }
  return { state: { ...s0, focuses: next, focus: next[0] } };
}

export function setFocuses(s0, ids) {
  return { ...s0, focuses: ids, focus: ids[0] };
}

// 相容舊的單選寫法
export function setFocus(s0, id) {
  return setFocuses(s0, [id]);
}

const defaultFocus = (s) => {
  s.focuses = getFocuses(s);
  return s.focuses[0] || 'grow';
};

const cost = (s, base) => Math.round(base * s.priceIndex);

const STAT_KEYS = ['int', 'hp', 'happy', 'charm'];

function applyFocus(s, rng) {
  const list = s.focuses.length ? s.focuses : ['grow'];
  s.workStreak = hasFocus(s, 'work') || hasFocus(s, 'runbiz') ? s.workStreak + 1 : 0;
  const detail = [];
  for (const f of list) {
    const before = { ...s.stats };
    const money0 = s.money;
    applyOne(s, f, rng);
    const d = {};
    for (const k of STAT_KEYS) if (s.stats[k] !== before[k]) d[k] = s.stats[k] - before[k];
    detail.push({ key: f, label: FOCUS[f]?.label || '', d, money: Math.round(s.money - money0) });
  }
  s.focusDetail = detail;
  // 紀錄裡只留一行「今年做了什麼」，細節（數值增減、花費）交給「今年摘要」那張卡
  const names = detail.map((d) => d.label).filter(Boolean);
  return names.length ? `今年：${names.join('・')}` : null;
}

function applyOne(s, f, rng) {
  const L = FOCUS[f]?.label || '';
  switch (f) {
    case 'grow':
      addStats(s, { hp: rint(rng, 0, 2), int: rint(rng, 0, 2), charm: rint(rng, 0, 1) });
      return null;
    case 'study': return `${L}${addStats(s, { int: rint(rng, 3, 6), happy: -2 })}`;
    case 'cram':
      s.flags.cramYears = (s.flags.cramYears || 0) + 1;
      return `${L}${addStats(s, { int: rint(rng, 5, 8), happy: -4, hp: -1 })}`;
    case 'sport': return `${L}${addStats(s, { hp: rint(rng, 3, 6), happy: 1 })}`;
    case 'play': return `${L}${addStats(s, { happy: rint(rng, 5, 8), int: -1 })}`;
    case 'friends': return `${L}${addStats(s, { charm: rint(rng, 3, 6), happy: 2 })}`;
    case 'parttime': return `${L}${addMoney(s, cost(s, rint(rng, 4, 9) * WAN))}${addStats(s, { int: -1, hp: -1 })}`;
    case 'finance':
      s.investSkill = Math.min(6, s.investSkill + 1);
      return `${L}，投資眼光提升${addStats(s, { int: 1 })}`;
    case 'work': return `${L}${addStats(s, { hp: -2, happy: -1, charm: rint(rng, 0, 1) })}`;
    case 'gig': return `${L}${addMoney(s, cost(s, rint(rng, 12, 18) * WAN))}${addStats(s, { hp: -1 })}`;
    case 'jobhunt':
      s.flags.wantJob = true;
      return '這一年都在投履歷、面試。';
    case 'learn': return `${L}${addMoney(s, -cost(s, 3 * WAN))}${addStats(s, { int: rint(rng, 3, 6) })}`;
    case 'rest': return `${L}${addMoney(s, -cost(s, 5 * WAN))}${addStats(s, { happy: rint(rng, 6, 10), hp: 3 })}`;
    case 'gym': return `${L}${addMoney(s, -cost(s, 2 * WAN))}${addStats(s, { hp: rint(rng, 4, 7), happy: 1 })}`;
    case 'network': return `${L}${addMoney(s, -cost(s, 3 * WAN))}${addStats(s, { charm: rint(rng, 3, 6), happy: 1 })}`;
    case 'invest':
      s.investSkill = Math.min(6, s.investSkill + 1);
      return `${L}，投資眼光提升${addMoney(s, -cost(s, 2 * WAN))}${addStats(s, { int: 1 })}`;
    case 'family':
      if (s.kids.length < MAX_KIDS) s.flags.wantBaby = true;
      return `${L}${addMoney(s, -cost(s, 3 * WAN))}${addStats(s, { happy: rint(rng, 5, 8), hp: 1, charm: 1 })}`;
    case 'date': {
      if (!s.partner) return null;
      s.partner.love = Math.min(100, s.partner.love + 24);
      const c = Math.min(cost(s, DATE_FOCUS_COST * (s.studying ? 1 : 2)), Math.max(0, s.money));
      return `和「${s.partner.name}」約會${addMoney(s, -c)}${addStats(s, { happy: rint(rng, 5, 8), charm: 2, int: s.studying ? -1 : 0 })}`;
    }
    case 'startbiz':
      s.flags.wantBiz = true;
      return '你開始認真研究創業計畫。';
    case 'runbiz': return `${L}${addStats(s, { hp: -2, int: 1 })}`;
    default: return null;
  }
}

// ───────────────────────── 世界與市場 ─────────────────────────
function rollWorld(s, rng) {
  const lastCrash = s.world && s.world.crash;
  const pool = lastCrash ? WORLD_EVENTS.filter((w) => !w.crash) : WORLD_EVENTS;
  const crashW = diffOf(s).crashW || 1;
  const w = weightedPick(rng, pool, (x) => x.w * (x.crash || x.layoff ? crashW : 1));
  const m = w.m || {};
  const rebound = lastCrash ? 0.12 : 0;
  const d = diffOf(s);
  // 有明確方向的大事，波動小一點，漲跌方向才會跟新聞一致
  const sd = (base, shift) => (Math.abs(shift || 0) >= 0.1 ? base * 0.4 : base);
  const infl = Math.max(-0.01, Math.min(0.14, gauss(rng, 0.013, 0.006) + (w.infl || 0) + (d.inflAdd || 0)));
  const returns = {
    etf: gauss(rng, d.ret, sd(0.07, m.etf)) + (m.etf || 0) + rebound,
    stock: gauss(rng, d.ret, sd(0.15, m.stock)) + (m.stock || 0) + rebound * 1.2,
    gold: gauss(rng, 0.03, sd(0.05, m.gold)) + (m.gold || 0),
    crypto: Math.max(-0.9, Math.min(3, gauss(rng, 0.04, sd(0.35, m.crypto)) + (m.crypto || 0))),
    house: gauss(rng, 0.02, 0.03) + (m.house || 0) + infl * 0.8,
    deposit: Math.max(0.002, 0.012 + (m.deposit || 0) + infl * 0.3),
  };
  returns.etf = Math.max(-0.6, returns.etf);
  returns.stock = Math.max(-0.8, returns.stock);
  s.world = { id: w.id, title: w.title, desc: w.desc, crash: !!w.crash, layoff: !!w.layoff, hp: w.hp || 0, biz: w.biz || {}, infl, returns };
  s.inflation = infl;
  s.priceIndex *= 1 + infl;
  for (const k of Object.keys(s.idx)) s.idx[k] = Math.max(1, s.idx[k] * (1 + returns[k]));
  s.idxHistory.push({ ...s.idx, myStock: s.myStock, price: s.priceIndex });
  s.worldHistory.push({ age: s.age, id: w.id, title: w.title });
  if (s.age >= 6) {
    log(s, `【世界】${w.title}：${w.desc}（通膨 ${pctText(infl)}）`, w.crash ? 'world-bad' : 'world');
  }
}

// 舊存檔補上養育方式（以前有補習的算富養）
function kidStyleOf(k) {
  if (!k.style) k.style = k.cram ? 'rich' : 'normal';
  return kidStyleById(k.style);
}

// 小孩長大後的成就：養育方式最關鍵，父母的智力和人緣也有一點影響
function rollKidOutcome(s, k, rng) {
  const st = kidStyleOf(k);
  let score = st.score + rng() * 2;
  if (s.stats.int >= 70) score += 0.4;
  if (s.stats.charm >= 70) score += 0.4;
  if (s.stats.happy >= 70) score += 0.3;
  const list = [...KID_OUTCOMES].sort((x, y2) => y2.min - x.min);
  const out = list.find((o) => score >= o.min) || KID_OUTCOMES[0];
  k.outcome = out.id;
  return out;
}

function kidYear(s, rng) {
  let total = 0;
  let filial = 0;
  for (const k of s.kids) {
    const a = s.age - k.born;
    if (a < 0) continue;
    if (a >= KID_INDEPENDENT) {
      // 唐寶寶成年後仍有一筆生活協助的費用
      if (k.downs) {
        const care = Math.round(cost(s, KID_SPECIAL_ADULT));
        k.spent += care;
        total += care;
        continue;
      }
      // 出社會站穩腳步之後（25 歲起）才開始給孝親費
      if (a < KID_INDEPENDENT + 3) continue;
      const out = KID_OUTCOMES.find((o) => o.id === k.outcome);
      if (out && out.filial > 0) filial += Math.round(cost(s, out.filial));
      continue;
    }
    const st = kidStyleOf(k);
    const band = KID_COST.find((b) => a <= b.maxAge);
    let c = band.cost * st.mult;
    if (k.downs) c += KID_SPECIAL_COST;
    c = Math.round(cost(s, c) * diffOf(s).cost * (1 + (s.perk ? s.perk.kid : 0)));
    k.spent += c;
    total += c;
    if (a === KID_INDEPENDENT - 1 && k.downs) {
      const r = rng || Math.random;
      const line = KID_SPECIAL_OUTCOMES[Math.floor(r() * KID_SPECIAL_OUTCOMES.length)];
      k.outcome = 'special';
      log(
        s,
        `「${k.name}」成年了。總共花了 ${formatMoney(k.spent)}。${line}生活大致能自理，你們還是會固定給一些生活費。`
          + addStats(s, { happy: 6 }),
        'milestone',
      );
    } else if (a === KID_INDEPENDENT - 1) {
      const out = rollKidOutcome(s, k, rng || Math.random);
      log(
        s,
        `「${k.name}」長大獨立了（${st.name}）！總共花了 ${formatMoney(k.spent)}。${out.text}現在是「${out.title}」`
          + `${out.filial > 0 ? `，每年會給你 ${formatMoney(cost(s, out.filial))} 孝親費。` : '，暫時還幫不上家裡。'}`
          + addStats(s, { happy: out.filial > 0 ? 4 : 1 }),
        'milestone',
      );
    }
  }
  s.kidSpent += total;
  s.lastFilial = filial;
  return total;
}

export function kidInfo(s, k) {
  const a = s.age - k.born;
  const st = kidStyleOf(k);
  if (a >= KID_INDEPENDENT) {
    const out = KID_OUTCOMES.find((o) => o.id === k.outcome);
    return {
      age: a, stage: k.downs ? '已成年' : '已獨立', yearly: k.downs ? Math.round(cost(s, KID_SPECIAL_ADULT)) : 0,
      style: st, downs: !!k.downs,
      outcome: out || null,
      filial: out && out.filial > 0 ? cost(s, out.filial) : 0,
    };
  }
  const band = KID_COST.find((b) => a <= b.maxAge);
  const c = band.cost * st.mult + (k.downs ? KID_SPECIAL_COST : 0);
  return { age: a, stage: band.stage, yearly: Math.round(cost(s, c)), style: st, downs: !!k.downs, canStyle: true };
}

// 改養育方式（只有還沒獨立的小孩可以改）
export function setKidStyle(s0, uid, styleId) {
  const s = clone(s0);
  const k = s.kids.find((x) => x.uid === uid);
  if (!k) return fail(s0, '找不到這個小孩');
  if (s.age - k.born >= KID_INDEPENDENT) return fail(s0, '已經獨立了，改不了');
  k.style = styleId;
  k.cram = styleId === 'rich';
  return { state: s };
}

export function toggleKidCram(s0, uid) {
  const s = clone(s0);
  const k = s.kids.find((x) => x.uid === uid);
  if (k) k.cram = !k.cram;
  return s;
}

function economy(s, rng) {
  const y = { salary: 0, bizIncome: 0, rent: 0, living: 0, kids: 0, debtPay: 0, dca: 0, allowance: 0, spouse: 0, dating: 0, side: 0, filial: 0, tax: 0 };
  const adult = isAdult(s);
  const ret = s.world.returns;

  // 薪水
  if (s.job) {
    let pay = s.job.salary;
    if (s.job.volatile) {
      const statKey = s.job.stat || 'charm';
      pay = cost(s, Math.max(3 * WAN, (s.stats[statKey] - 40) * 1.2 * WAN * Math.max(0.2, gauss(rng, 1, 0.4))) * (s.job.boost || 1));
    }
    if (s.flags.skipSalary) pay = 0;
    if (s.flags.halfSalary) pay /= 2;
    pay *= 1 + (s.perk ? s.perk.salary : 0);
    y.salary = Math.round(pay);
  }
  s.flags.skipSalary = false;
  s.flags.halfSalary = false;

  // 零用錢：還在家裡時，爸媽每年給的錢（家境越好越多）
  if (s.studying || s.age < 18) {
    y.allowance = cost(s, familyById(s.family).allowance * (s.age < 6 ? 0.5 : s.age < 12 ? 0.8 : 1) * (s.flags.saver ? 1.1 : 1));
    // 清寒家庭沒零用錢，但夠努力、成績夠好的話每年有獎學金
    if (s.family === 'poor' && s.studying && s.age >= 12 && s.stats.int >= 65 && (hasFocus(s, 'study') || hasFocus(s, 'cram'))) {
      const sch = cost(s, (s.stats.int >= 85 ? 3 : s.stats.int >= 75 ? 2 : 1) * WAN);
      y.allowance += sch;
      y.scholarship = sch;
    }
  }

  // 才藝帶來的副業收入（18 歲以後）
  if (adult && s.perk && s.perk.side > 0) {
    y.side = Math.round(cost(s, s.perk.side * WAN));
  }

  // 另一半的收入：點數升級的部分 ＋ 對象本身的職業收入
  if (s.married) {
    y.spouse = Math.round(spouseInfo(s).income * diffOf(s).salary)
      + Math.round(partnerIncome(s, rng) * diffOf(s).salary);
  }

  // 約會花費（交往中、還沒結婚）
  if (s.partner && !s.married) {
    y.dating = Math.min(cost(s, s.studying ? DATE_COST_STUDENT : DATE_COST_ADULT), Math.max(0, s.money + y.allowance));
  }

  // 事業（最多兩家）
  const bizFocus = hasFocus(s, 'runbiz') ? 0.03 / s.bizs.length : 0;
  for (const b of [...s.bizs]) {
    const def = BUSINESSES[b.type];
    let mean = def.mean + diffOf(s).biz + b.bonus + (s.stats.int + s.stats.charm - 80) / 1100 + (s.flags.bizSense ? 0.01 : 0) + (s.perk ? s.perk.biz : 0);
    mean += bizFocus;
    if (!bizFocus && s.job) mean -= 0.03;
    mean += (s.world.biz[b.type] || 0) + (s.world.biz.all || 0);
    mean += s.inflation * 0.5;
    if (b.value > 1000 * WAN) mean -= diffOf(s).size * Math.log10(b.value / (1000 * WAN));
    const r = Math.max(-0.6, Math.min(1.5, gauss(rng, mean, b.sd || def.sd)));
    const before = b.value;
    b.value = Math.round(b.value * (1 + r));
    b.lastR = r;
    b.years += 1;
    if (r > 0) y.bizIncome += Math.round(before * 0.03);
    if (b.value < b.capital * 0.25 && r < 0 && chance(rng, 0.5)) {
      log(s, `「${b.name}」經營不善，宣告倒閉了……${addStats(s, { happy: -12 })}`, 'bad');
      removeBiz(s, b.uid);
    }
  }
  if (s.bizs.length && !s.job) y.bizIncome += cost(s, 18 * WAN);

  // 租金（第二間以上的房子出租）
  if (s.houses.length > 1) {
    y.rent = Math.round(s.houses.slice(1).reduce((t, h) => t + h.value, 0) * RENT_YIELD);
  }

  // 生活費（隨物價上漲）
  if (adult) {
    let c = 13 * WAN; // 一個人的吃穿交通（約 1.1 萬／月）
    // 房租：沒買房的人才要付；25 歲前、還沒結婚的年輕人多半住家裡，只給一點家用
    if (s.houses.length === 0) c += (s.age < 25 && !s.married) ? 3 * WAN : 11 * WAN;
    if (s.married) c += 10 * WAN; // 多一個人的開銷（另一半的收入另外算進來）
    if (s.flags.cohabit && s.partner && !s.married) c *= 0.88; // 同居分攤
    y.living = Math.round(cost(s, c) * diffOf(s).cost * (1 + (s.perk ? s.perk.living : 0)) * (s.flags.broke ? 0.6 : 1));
  } else if (s.flags.inMaster) {
    y.living = cost(s, GRAD_TUITION);
  }
  y.kids = kidYear(s, rng);
  y.filial = s.lastFilial || 0;

  // 債務
  for (const d of s.debts) {
    const interest = d.balance * d.rate;
    const pay = Math.min(d.balance + interest, d.payment);
    d.balance = Math.round(d.balance + interest - pay);
    y.debtPay += Math.round(pay);
  }
  const paidOff = s.debts.filter((d) => d.balance <= 0);
  if (paidOff.length) {
    paidOff.forEach((d) => log(s, `「${d.name}」還清了！`, 'good'));
    s.debts = s.debts.filter((d) => d.balance > 0);
  }

  // 稅和勞健保：薪水越高扣越多（依物價調整級距）
  if (adult && (y.salary || y.side || y.bizIncome)) {
    const inc = y.salary + y.side + y.bizIncome * 0.5;
    const t1 = cost(s, 60 * WAN); const t2 = cost(s, 130 * WAN); const t3 = cost(s, 260 * WAN);
    let tax = 0;
    tax += Math.min(inc, t1) * 0.06;
    if (inc > t1) tax += (Math.min(inc, t2) - t1) * 0.12;
    if (inc > t2) tax += (Math.min(inc, t3) - t2) * 0.2;
    if (inc > t3) tax += (inc - t3) * 0.3;
    y.tax = Math.round(tax);
  }
  y.cashStart = s.money;
  s.money += y.salary + y.side + y.bizIncome + y.rent + y.allowance + y.spouse + y.filial - y.living - y.kids - y.debtPay - y.dating - (y.tax || 0);

  // 定期定額（薪水或零用錢的一部分）
  const dcaBase = y.salary + y.allowance;
  if (s.dca > 0 && dcaBase > 0 && canInvest(s)) {
    const amt = Math.max(0, Math.min(Math.round((dcaBase * s.dca) / 100), s.money));
    s.money -= amt;
    s.etf += amt;
    y.dca = amt;
  }

  // 投資報酬（跟著世界大事走）
  const invBefore = investTotal(s);
  // 抓周抓到種子的人比較沉得住氣，股災年跌得少一點
  const alpha = s.investSkill * 0.01 + gauss(rng, 0, 0.08) + (s.flags.patient && s.world.crash ? 0.05 : 0) + (s.perk ? s.perk.alpha : 0);
  const mine = {
    deposit: ret.deposit,
    etf: ret.etf,
    stock: Math.max(-0.85, ret.stock + alpha),
    gold: ret.gold,
    crypto: ret.crypto,
  };
  for (const a of ASSETS) s[a.key] = Math.round(s[a.key] * (1 + mine[a.key]));
  // 我的個股表現指數（用來跟大盤比較）
  s.myStock = Math.max(1, s.myStock * (1 + mine.stock));
  s.idxHistory[s.idxHistory.length - 1].myStock = s.myStock;
  for (const h of s.houses) h.value = Math.round(h.value * (1 + ret.house + gauss(rng, 0, 0.02)));
  s.lastReturns = mine;
  // 每年的投資明細（投資頁的表格用）
  const invAfter = investTotal(s);
  if (!s.invYears) s.invYears = [];
  s.invYears.push({
    age: s.age,
    world: s.world.title,
    crash: s.world.crash,
    market: ret.etf,
    marketIdx: s.idx.etf,
    value: invAfter,
    gain: invAfter - invBefore,
    mine: invBefore > 0 ? invAfter / invBefore - 1 : null,
    dca: y.dca,
  });

  // 現金不夠：絕對不會動你的資產，先變成負債；借到上限才會問你要賣什麼
  if (s.money < 0) {
    s.money = Math.round(s.money * (1 + DEBT_RATE));
    // 借不下去了：銀行不再放款
    const floor = -Math.round(Math.max(y.living, 20 * WAN * s.priceIndex) * 12);
    const capped = s.money < floor;
    s.flags.broke = true;
    if (capped) {
      // 身上有貸款還不出來：銀行直接強制處分你的資產
      if (s.debts.length && (SELLABLE.some((k) => s[k] > 0) || (s.houses || []).length)) {
        forceSell(s);
      } else if (SELLABLE.some((k) => s[k] > 0)) {
        // 沒有貸款、只是現金透支：讓玩家自己決定賣哪一個
        s.flags.mustSell = true;
        log(s, `銀行不肯再借你錢了（現金透支 ${formatMoney(-s.money)}），必須賣掉一些資產。${addStats(s, { happy: -4 })}`, 'bad');
      } else {
        s.money = floor;
        log(s, `已經借不到錢，手上也沒東西可以賣，只能縮衣節食過日子（欠 ${formatMoney(-s.money)}）。${addStats(s, { happy: -5, hp: -2 })}`, 'bad');
      }
    } else {
      log(s, `現金不足，欠了 ${formatMoney(-s.money)}，利息越滾越多（可以自己到投資頁賣掉一些東西還掉）。${addStats(s, { happy: -4 })}`, 'bad');
    }
  } else if (s.flags.broke) {
    s.flags.broke = false;
  }

  y.cashEnd = s.money;
  s.lastYear = y;
  if (adult && (y.salary || y.bizIncome || y.living)) {
    const inc = y.salary + y.bizIncome + y.rent + y.spouse + y.filial;
    const out = y.living + y.kids + y.debtPay + y.dating + (y.tax || 0);
    log(s, [
      `收入 ${formatMoney(inc)}`,
      `支出 ${formatMoney(out)}`,
      y.dca ? `投資 ${formatMoney(y.dca)}` : null,
    ].filter(Boolean).join('　'), 'money');
  } else if (y.allowance && s.age >= 6) {
    log(s, [
      y.scholarship ? `獎學金 ${formatMoney(y.scholarship)}${y.allowance > y.scholarship ? `＋零用錢 ${formatMoney(y.allowance - y.scholarship)}` : ''}` : `零用錢 ${formatMoney(y.allowance)}`,
      y.dating ? `約會 ${formatMoney(y.dating)}` : null,
      y.dca ? `投資 ${formatMoney(y.dca)}` : null,
    ].filter(Boolean).join('　'), 'money');
  }
}

function careerYear(s, rng) {
  const j = s.job;
  if (!j) return;
  j.years += 1;
  if (j.retireAge && s.age >= j.retireAge) {
    const kept = j.legend && s.flags.keptJob;
    if (kept) {
      // 留職停薪結束：回到原本的工作，薪水跟著這幾年的物價調整
      const k = { ...kept };
      k.salary = Math.round((k.salary * ((s.priceIndex / (k.pi || s.priceIndex)) ** 0.85)) / 1000) * 1000;
      delete k.pi;
      s.flags.keptJob = null;
      s.job = k;
      s.careers.push(k.name);
      log(s, `當完「${j.name}」，你回到原本的崗位，繼續當「${k.name}」${k.volatile ? '' : `，年薪 ${formatMoney(k.salary)}`}。同事幫你辦了歡迎會。`, 'milestone');
      return;
    }
    log(s, `你從「${j.name}」退休了，開始思考下一步。`, 'milestone');
    s.job = null;
    return;
  }
  // 金融海嘯時比較容易被裁員
  if (s.world.layoff && j.risk > 0 && chance(rng, 0.2 * j.risk)) {
    const sev = Math.round(j.salary * 0.5);
    log(s, `金融海嘯，公司大裁員，你失去了「${j.name}」的工作，拿到半年資遣費。${addMoney(s, sev)}${addStats(s, { happy: -10 })}`, 'bad');
    s.job = null;
    return;
  }
  if (j.volatile) return;
  // 薪水會跟著通膨調整一部分
  let raise = 0.015 * j.raise + s.inflation * 0.7;
  if (hasFocus(s, 'work')) {
    raise += 0.03 * j.raise;
    if (chance(rng, 0.12 + s.stats.int / 500)) {
      raise += 0.1;
      log(s, '你的努力被老闆看見，加薪 10%！', 'good');
    }
  }
  j.salary = Math.round(j.salary * (1 + raise));
}

const ASSET_NAME = { deposit: '定存', gold: '黃金', etf: 'ETF', stock: '個股', crypto: '加密幣' };
const SELLABLE = ['deposit', 'gold', 'etf', 'stock', 'crypto'];

// ───────────────────────── 寵物 ─────────────────────────
function petYear(s, rng) {
  // 舊存檔：以前只記「有養狗」，補一隻狗
  if (s.flags.pet && !s.pets) {
    s.pets = [];
    const p = addPet(s, rng, 'dog');
    p.since = Math.max(6, s.age - 3);
  }
  if (!s.pets) s.pets = [];
  for (const p of alivePets(s)) {
    const def = PETS[p.type];
    const petAge = s.age - p.since;
    if (petAge >= p.life) {
      p.alive = false;
      p.diedAt = s.age;
      log(s, `陪伴你 ${petAge} 年的「${p.name}」安詳地離開了，總共在牠身上花了 ${formatMoney(p.spent)}。${addStats(s, { happy: -8 })}`, 'bad');
      continue;
    }
    const food = cost(s, def.food);
    const vac = cost(s, PET_VACCINE);
    const bp = petExpense(s, p, '飼料', food);
    petExpense(s, p, '疫苗、健康檢查', vac);
    if (petAge >= 10) {
      const old = cost(s, 1.5 * WAN);
      petExpense(s, p, '老年保健', old);
    }
    addStats(s, { happy: 2, hp: p.type === 'dog' ? 1 : 0 });
    if (s.lastYear) {
      if (!s.lastYear.pets) s.lastYear.pets = [];
      const total = food + vac + (petAge >= 10 ? cost(s, 1.5 * WAN) : 0);
      s.lastYear.pets.push({ name: p.name, kind: p.kind, age: petAge, cost: total, byParents: bp });
    }
    const petTotal = food + vac + (petAge >= 10 ? cost(s, 1.5 * WAN) : 0);
    log(s, `${p.kind === '貓' ? '🐱' : '🐶'} ${p.name}（${petAge} 歲）花了 ${formatMoneyFine(petTotal)}${bp ? '（爸媽付）' : ''}`, 'money');
  }
}

// ───────────────────────── 另一半自己升遷 ─────────────────────────
// 另一半會在自己的行業裡慢慢往上爬：同一個職位至少待 3 年，家裡氣氛好、你有陪家人，機會比較大
function spouseCareer(s, rng) {
  if (!s.married || !s.spouse) return;
  if (s.spouseLevel >= SPOUSE_LEVELS.length - 1) return;
  const since = s.spouse.promoAt != null ? s.spouse.promoAt : s.spouse.since;
  if (s.age - since < 3) return;
  let p = 0.16;
  if (s.stats.happy >= 60) p += 0.06;
  if (hasFocus(s, 'family')) p += 0.08;
  if (s.flags.broke) p -= 0.08;
  if (!chance(rng, p)) return;
  s.spouseLevel += 1;
  s.spouse.promoAt = s.age;
  const title = spouseTitle(s);
  log(s, `${partnerWord(s)}「${s.spouse.name}」靠自己的努力升上了「${title}」！家裡的收入變多了。${addStats(s, { happy: 3 })}`, 'good');
}

// ───────────────────────── 感情 ─────────────────────────
function romanceYear(s, rng) {
  if (s.partner && !s.married) {
    const p = s.partner;
    if (!hasFocus(s, 'date')) p.love = Math.max(0, p.love - rint(rng, 1, 3));
    if (s.lastYear && s.lastYear.dating === 0) p.love = Math.max(0, p.love - 6);
    if (p.love < 12 && chance(rng, 0.35)) {
      log(s, `你和「${p.name}」越來越少見面，最後分手了。${addStats(s, { happy: -10 })}`, 'bad');
      endRelationship(s);
    } else if (s.age - p.since >= 1 && p.love >= 40) {
      addStats(s, { happy: 1 });
    }
  }
  if (s.married && s.spouseLevel >= 3) addStats(s, { happy: 1 });
}

// ───────────────────────── 健康 ─────────────────────────
function bodyYear(s, rng) {
  driftStats(s);
  if (s.world.hp) addStats(s, { hp: s.world.hp });
  if (s.age >= 40) addStats(s, { hp: -Math.round(rint(rng, 0, Math.floor((s.age - 30) / 10)) * (1 - (s.perk ? s.perk.hpKeep : 0))) });
  if (s.stats.happy < 25) addStats(s, { hp: -2 });
  // 另一半帶來的每年變化
  if (s.perk && (s.perk.hp || s.perk.happy || s.perk.charm)) {
    addStats(s, { hp: s.perk.hp, happy: s.perk.happy, charm: s.perk.charm });
  }
  if (s.stats.hp < 25) addStats(s, { happy: -2 });

  // 隱藏的健康風險
  let d = 0;
  if (s.age >= 30) d += 1;
  if (s.age >= 45) d += 2;
  if (hasFocus(s, 'work')) d += 2;
  if (hasFocus(s, 'runbiz')) d += 2;
  if (s.focuses.length >= 4) d += 1; // 太忙也會累
  if (s.workStreak >= 4) d += 2;
  if (s.stats.happy < 30) d += 3;
  if (s.stats.hp < 40) d += 3;
  if (hasFocus(s, 'gym') || hasFocus(s, 'sport')) d -= 8;
  if (hasFocus(s, 'rest')) d -= 6;
  if (hasFocus(s, 'family')) d -= 2;
  d += s.perk ? s.perk.risk : 0;
  d += diffOf(s).riskAdd || 0;
  s.risk = Math.max(0, Math.min(100, s.risk + d));

  if (s.age >= 28 && chance(rng, Math.max(0, Math.min(0.3, (s.risk - 35) / 250)))) {
    s.flags.sickPending = true;
  }

  s.hpHistory.push(s.stats.hp);

  if (s.stats.hp > 0 && s.stats.hp < 30) {
    log(s, '【健康警訊】身體狀況很差！記得選「運動健身」或「休息旅遊」，健康歸零人生就結束了。', 'bad');
  }
  if (s.stats.hp <= 0 || (s.stats.hp < 15 && chance(rng, 0.12))) {
    s.ended = { reason: 'death', age: s.age };
    log(s, `${s.name} 的身體撐不住了，在 ${s.age} 歲離開人世。`, 'bad');
  }
}

export const riskLevel = (r) => (r == null ? null : r < 30 ? { label: '低', tone: 'good' } : r < 60 ? { label: '中', tone: 'warn' } : { label: '高', tone: 'bad' });

export function healthReport(s) {
  const since = s.checkupAge == null ? null : s.age - s.checkupAge;
  const known = since != null && since <= 3 ? s.knownRisk : null;
  const warnings = [];
  const hp = s.stats.hp;
  if (hp < 30) warnings.push({ level: 'bad', text: `健康只剩 ${hp}，隨時可能倒下！` });
  else if (hp < 50) warnings.push({ level: 'warn', text: `健康 ${hp}，偏低，要多休息和運動。` });
  if (s.workStreak >= 4) warnings.push({ level: 'warn', text: `已經連續 ${s.workStreak} 年拚工作，過勞風險上升。` });
  if (s.stats.happy < 30) warnings.push({ level: 'warn', text: `快樂只有 ${s.stats.happy}，壓力太大也會傷身體。` });
  if (s.age >= 50) warnings.push({ level: 'info', text: '年過 50，建議每年做一次健康檢查。' });
  if (s.age >= 28 && (since == null || since > 3)) {
    warnings.push({ level: 'info', text: since == null ? '你從來沒有做過健康檢查。' : `已經 ${since} 年沒做健康檢查了。` });
  }
  const h = s.hpHistory;
  const trend = h.length >= 6 ? h[h.length - 1] - h[h.length - 6] : 0;
  if (trend <= -10) warnings.push({ level: 'warn', text: `最近 5 年健康下降了 ${-trend}。` });
  if (!warnings.length) warnings.push({ level: 'good', text: '目前沒有明顯的健康問題，繼續保持！' });

  return {
    hp,
    trend,
    risk: known,
    riskLevel: riskLevel(known),
    since,
    checkedThisYear: s.checkupAge === s.age,
    checkupCost: cost(s, CHECKUP_COST),
    warnings,
  };
}

export function healthCheck(s0, rng = Math.random) {
  if (s0.pending) return { state: s0, error: '請先處理眼前的事件' };
  if (s0.age < 18) return { state: s0, error: '18 歲以後才需要自己做健康檢查' };
  if (s0.checkupAge === s0.age) return { state: s0, error: '今年已經檢查過了' };
  const c = cost(s0, CHECKUP_COST);
  if (s0.money < c) return { state: s0, error: `健康檢查需要 ${formatMoney(c)}` };
  const s = clone(s0);
  s.money -= c;
  s.checkupAge = s.age;
  s.knownRisk = s.risk;
  addPoints(s, 1, '做健康檢查');
  const lv = riskLevel(s.risk);
  log(s, `做了健康檢查：健康風險「${lv.label}」（${s.risk} / 100）。（-${formatMoney(c)}）`, lv.tone === 'bad' ? 'bad' : 'neutral');
  if (s.risk >= 50) openDef(s, rng, 'event', 'checkup_found', eventById('checkup_found'));
  return { state: s, msg: `健康風險：${lv.label}（${s.risk} / 100）` };
}

function schoolYear(s) {
  if (!s.studying) return;
  const sk = s.flags.skipYears || 0;
  if (s.age === 6 - sk) { s.edu = 'none'; log(s, `上小學了！背著新書包好興奮。${sk ? '（你比同學小一歲）' : ''}`, 'milestone'); }
  if (s.age === 12 - sk) log(s, '升上國中，課業越來越重。', 'milestone');
  // 接送方式每年一點點影響（6～17 歲）
  if (s.age >= 6 - sk && s.age <= 17 - sk && s.flags.pickup) {
    const d = { grandma: { hp: 1, happy: 1 }, parents: { happy: 1 }, anqin: { int: 1 }, self: { charm: 1 } }[s.flags.pickup];
    if (d) addStats(s, d);
  }
  if (s.age === 15 - sk) s.edu = 'junior';
  if (s.age === 24 - sk && s.flags.inMaster) {
    s.flags.inMaster = false;
    s.edu = s.edu === 'topCollege' ? 'topMaster' : 'master';
    s.studying = false;
    s.flags.needJob = true;
    log(s, '研究所畢業，拿到碩士學位！', 'milestone');
  }
}

// ───────────────────────── 收購 ─────────────────────────
function refreshTargets(s, rng) {
  if (!canAcquire(s)) return;
  if (s.targetYear === s.age && (s.targets || []).length) return;
  s.targets = makeTargets(s, rng, netWorth(s));
  s.targetYear = s.age;
}

// 買下一家公司（不占「自己開的兩家」的名額）
// opts: { loan: 0~0.6 用貸款付的比例, bid: 競標加價（0 / 0.1 / 0.3）}
export function acquire(s0, id, opts = {}, rng = Math.random) {
  if (!canAcquire(s0)) return fail(s0, '達成一億以後才能收購公司');
  const t = (s0.targets || []).find((x) => x.id === id);
  if (!t) return fail(s0, '這家公司已經賣掉了');
  if (groupCount(s0) >= MAX_GROUP) return fail(s0, `集團最多 ${MAX_GROUP} 家公司`);
  if (!meetsReq(s0, t)) return fail(s0, t.reqText ? `條件不符：${t.reqText}` : '條件不符');

  const bidAdd = t.auction ? (opts.bid || 0) : 0;
  const price = Math.round(t.price * (1 + bidAdd));
  const loanRatio = Math.min(0.6, Math.max(0, opts.loan || 0));
  const cashPart = Math.round(price * (1 - loanRatio));
  const loanPart = price - cashPart;
  if (s0.money < cashPart) return fail(s0, `現金不夠，需要 ${formatMoney(cashPart)}`);

  const s = clone(s0);

  // 競標：可能被別人標走
  if (t.auction) {
    const bid = AUCTION_BIDS.find((b) => Math.abs(b.add - bidAdd) < 0.001) || AUCTION_BIDS[0];
    const luck = Math.min(0.98, bid.win + s.stats.charm / 600);
    if (!chance(rng, luck)) {
      s.targets = s.targets.filter((x) => x.id !== id);
      log(s, `「${t.name}」的競標被別人以更高的價格標走了。（你出 ${formatMoney(price)}）`, 'bad');
      return { state: s, error: '這次沒有標到，被別人買走了' };
    }
  }

  s.money -= cashPart;
  if (loanPart > 0) addDebt(s, `收購貸款：${t.name}`, loanPart);

  // 法拍、新創：接手後才知道實際價值
  const value = rollValue(t, rng);
  const syn = synergy(s, t.type);
  const def = BUSINESSES[t.type];

  s.flags.everMna = true;
  s.bizs.push({
    uid: `b${s.uid++}`,
    type: t.type,
    name: t.name,
    value,
    capital: price,
    route: null,
    bonus: Math.round((t.bonus + syn) * 1000) / 1000,
    sd: Math.max(0.04, def.sd + (t.sdBump || 0) - (t.sdCut || 0)),
    years: 0,
    lastR: 0,
    group: true,
    kind: t.kind,
  });
  s.targets = s.targets.filter((x) => x.id !== id);

  let text = `你用 ${formatMoney(price)}${loanPart > 0 ? `（其中 ${formatMoney(loanPart)} 是貸款）` : ''} 收購了「${t.name}」（${t.typeName}）`;
  if (t.roll) {
    const diff = value / t.price - 1;
    text += `。接手後盤點，實際價值 ${formatMoney(value)}${diff >= 0.2 ? '，賺到了！' : diff <= -0.3 ? '，比想像中差很多……' : '。'}`;
  } else {
    text += `，公司價值 ${formatMoney(value)}。`;
  }
  if (syn > 0) text += `集團裡已經有同產業的公司，綜效讓它每年多成長 ${(syn * 100).toFixed(1)}%。`;
  text += `集團現在有 ${s.bizs.length} 家公司。`;
  const good = !t.roll || value >= price;
  log(s, `${text}${addStats(s, { happy: good ? 6 : -4, hp: -1 })}`, good ? 'good' : 'bad');
  addPoints(s, 2, `收購 ${t.name}`);
  return { state: s };
}

// ───────────────────────── 事件彈窗 ─────────────────────────
const getDef = (p) => {
  if (p.source === 'event') return eventById(p.id);
  if (p.source === 'milestone') return MILESTONES[p.id];
  if (p.source === 'route') {
    const [rid, step] = p.id.split(':');
    return ROUTES[rid].steps[Number(step)];
  }
  return null;
};

function openDef(s, rng, source, id, def, extra = {}) {
  if (def.before) def.before(s, rng);
  let list = def.choices
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !c.cond || c.cond(s));
  // def.pick：從可選的項目裡隨機抽幾個出來（標了 always 的一定會出現）
  if (def.pick) {
    const always = list.filter(({ c }) => c.always);
    const rest = list.filter(({ c }) => !c.always);
    for (let i = rest.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    list = rest.slice(0, def.pick).sort((a, b) => a.i - b.i).concat(always);
  }
  // 有成功機率的選項，把機率直接寫在說明裡
  const withOdds = (c, sub) => {
    if (!c.odds) return sub;
    const p = Math.max(0, Math.min(1, c.odds(s)));
    const txt = p >= 1 ? '一定成功' : `成功率約 ${Math.round(p * 100)}%`;
    return sub ? `${sub}（${txt}）` : txt;
  };
  const choices = list.map(({ c, i }) => ({
    label: typeof c.label === 'function' ? c.label(s) : c.label,
    sub: withOdds(c, typeof c.sub === 'function' ? c.sub(s) : c.sub || ''),
    ref: i,
  }));
  s.pending = {
    source,
    id,
    title: typeof def.title === 'function' ? def.title(s) : def.title,
    text: typeof def.text === 'function' ? def.text(s) : def.text || '',
    choices,
    ...(def.art ? { art: def.art } : {}),
    ...extra,
  };
}

const toResult = (r) => (typeof r === 'string' ? { text: r, tone: 'neutral' } : r || { text: '', tone: 'neutral' });

function trackMove(s, label, diff) {
  if (diff > 30 * WAN && (!s.best || diff > s.best.gain)) s.best = { age: s.age, label, gain: diff };
  if (diff < -30 * WAN && (!s.worst || diff < s.worst.gain)) s.worst = { age: s.age, label, gain: diff };
}

// 條件符合嗎？回傳 null（本科）、alt 物件（走另一條路）或 false（不符合）
export function jobRoute(s, j) {
  const meet = (req) => Object.entries(req).every(([k, v]) => s.stats[k] >= v);
  if (meet(j.req)) return null;
  const alt = (j.alts || []).find((a) => meet(a.req));
  return alt || false;
}

// 學歷不夠，但做久了也有機會被挖角（差一級以內，需要 5 年以上年資）
export const eduOk = (s, j) => {
  const rank = EDU[s.edu].rank;
  if (j.edu <= rank) return true;
  return j.edu === rank + 1 && s.job && s.job.years >= 5;
};

// 合約期內畢業：不用找工作，公司直接讓你全職當藝人
function idolJob(s) {
  const id = idolJobId(s);
  const def = jobById(id);
  const salary = Math.round((def.salary * (s.priceIndex ** 0.85) * diffOf(s).salary) / 1000) * 1000;
  const text = takeJob(s, id, salary);
  log(s, `${id === 'trainee' ? '合約還沒到期，你成了全職練習生，公司給一點生活津貼。' : '合約還沒到期，公司安排你全職當藝人。'}${text}`, 'milestone');
}

function jobOffers(s, rng) {
  const rank = EDU[s.edu].rank;
  const eligible = JOBS.filter((j) =>
    !j.hidden
    && eduOk(s, j)
    && jobRoute(s, j) !== false
    && (!s.job || j.id !== s.job.id)
    && !(j.retireAge && s.age >= j.retireAge - 4 && !(jobRoute(s, j) || {}).noRetire));
  // 職缺是隨機的：不會固定把最高薪的那個塞進來。
  // 就算你是高材生，也可能這一年只有超商在徵人——那就下次再找。
  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const n = Math.min(shuffled.length, 2 + Math.floor(rng() * 4)); // 這次有 2～5 個職缺
  const picks = shuffled.slice(0, n);
  picks.sort((a, b) => b.salary - a.salary);
  // 起薪會跟著物價上漲（但漲得比物價慢一點）
  // 小時候學過英文會話的人，起薪多一點
  const wage = (s.priceIndex ** 0.85) * diffOf(s).salary * (s.flags.english ? 1.08 : 1);
  const best = [...picks].sort((a, b) => b.edu - a.edu)[0];
  const offers = picks.map((j) => {
    const alt = jobRoute(s, j);
    return {
      id: j.id,
      alt: alt ? alt.name : null,
      stat: alt && alt.stat ? alt.stat : null,
      noRetire: !!(alt && alt.noRetire),
      salary: j.volatile ? 0 : Math.round((j.salary * wage * (0.9 + rng() * 0.2) * (s.job && s.job.years > 3 ? 1.15 : 1)) / 1000) * 1000,
    };
  });
  s.pending = {
    source: 'offers',
    id: 'offers',
    title: '找工作',
    text: `你的學歷是「${eduName(s)}」。這次市場上有 ${offers.length} 個職缺願意錄取你`
      + `${best && best.edu <= EDU[s.edu].rank - 2 ? '（這批不太理想，明年選「找新工作」可以再碰運氣）' : ''}：`,
    choices: offers.map((o) => {
      const j = jobById(o.id);
      const statName = { int: '智力', charm: '人緣', hp: '健康' }[o.stat || 'charm'];
      const headhunt = j.edu > EDU[s.edu].rank;
      return {
        label: `${o.alt ? `${o.alt}（${j.name}）` : j.name}${headhunt ? ' ★' : ''}`,
        sub: j.volatile
          ? `收入看${statName}，有機會爆紅${o.alt ? '．走另一條路進來的' : ''}`
          : `年薪約 ${formatMoney(o.salary)}${ROUTES[j.id] ? '．有逆襲路線' : ''}${o.alt ? '．用你的強項進來的' : ''}${headhunt ? '．學歷不夠但被挖角' : ''}`,
        ref: o.id,
        salary: o.salary,
        alt: o.alt,
        stat: o.stat,
        noRetire: o.noRetire,
      };
    }).concat([{ label: s.job ? '留在原本的工作' : '暫時不工作', sub: '', ref: null }]),
  };
}

// 借不到錢了，要賣什麼？由玩家自己選
// 有貸款又還不出來：銀行強制處分，先賣流動資產，不夠再賣房子
function forceSell(s) {
  const sold = [];
  const order = ['deposit', 'gold', 'stock', 'crypto', 'etf'];
  for (const k of order) {
    if (s.money >= 0) break;
    if (s[k] <= 0) continue;
    const take = Math.min(s[k], -s.money);
    s[k] -= take;
    s.money += take;
    sold.push(`${ASSET_NAME[k]} ${formatMoney(take)}`);
  }
  while (s.money < 0 && (s.houses || []).length) {
    const h = [...s.houses].sort((a, b) => a.value - b.value)[0];
    const debt = s.debts.find((d) => d.houseUid === h.uid);
    const owed = debt ? debt.balance : 0;
    s.money += h.value - owed;
    s.houses = s.houses.filter((x) => x.uid !== h.uid);
    s.debts = s.debts.filter((d) => d.houseUid !== h.uid);
    sold.push(`「${h.name}」（法拍 ${formatMoney(h.value)}，扣掉房貸拿回 ${formatMoney(h.value - owed)}）`);
  }
  log(s, `你有貸款卻還不出錢，銀行強制處分了你的資產：${sold.join('、')}。${s.money < 0 ? `還欠 ${formatMoney(-s.money)}。` : ''}${addStats(s, { happy: -8, charm: -3 })}`, 'bad');
}

function sellPick(s) {
  const need = -s.money;
  const choices = [];
  for (const k of SELLABLE) {
    if (s[k] <= 0) continue;
    const take = Math.min(s[k], need);
    choices.push({
      label: `賣掉${ASSET_NAME[k]} ${formatMoney(take)}`,
      sub: `目前有 ${formatMoney(s[k])}${s[k] <= need ? '（全部賣光）' : '，只賣夠還債的部分'}`,
      ref: k,
    });
  }
  for (const h of s.houses || []) {
    choices.push({ label: `賣掉「${h.name}」`, sub: `目前市價約 ${formatMoney(housePrice(s, h))}`, ref: `house:${h.uid}` });
  }
  choices.push({ label: '什麼都不賣，咬牙撐著', sub: '生活費砍四成，快樂和健康會掉', ref: null });
  s.pending = {
    source: 'sellPick',
    id: 'sellPick',
    art: 'broke',
    title: '銀行不肯再借了',
    text: `你的現金透支了 ${formatMoney(need)}（現金是負的），銀行不肯再借。要賣掉什麼來補？（沒有貸款的話遊戲不會自己動你的資產，由你決定）`,
    choices,
  };
}

// 傳說職業的邀請
function legendOffer(s, lg) {
  const wage = (s.priceIndex ** 0.85) * diffOf(s).salary;
  // 傳說職業是「升級版的自己」：大約是現在薪水的兩倍，但不會超過該職業的天花板
  // 以「現在的薪水」為基礎加成，沒有工作的人才用一個保守的底薪
  const cur = s.job && !s.job.volatile && s.job.salary > 0
    ? s.job.salary
    : 45 * WAN * (s.priceIndex ** 0.6) * diffOf(s).salary;
  const pay = lg.volatile ? 0 : Math.round((cur * 1.5) / 10000) * 10000;
  const paySub = lg.volatile ? '收入看人緣，起伏很大' : `年薪約 ${formatMoney(pay)}`;
  // 有正職的人要決定：辭職全職去，還是留職停薪（只能去幾年）
  const hasRealJob = !!(s.job && !s.job.legend && !['trainee', 'idol', 'bandmusician'].includes(s.job.id));
  s.pending = {
    source: 'legend',
    id: `legend_${lg.id}`,
    art: lg.art,
    title: `${lg.icon} ${lg.title2}`,
    text: `${lg.text}\n\n這是「${lg.name}」，一輩子只會遇到這麼一次。接了就會留下稱號，也會永久記進首頁的「傳說職業圖鑑」。`,
    choices: [
      ...(hasRealJob
        ? [
          {
            label: `辭掉「${s.job.name}」，全職當${lg.name}`,
            sub: `${paySub}．高峰約 ${lg.term || 8} 年，結束後要重新找工作`,
            ref: lg.id,
            salary: pay,
          },
          {
            label: `留職停薪，去當${lg.name}`,
            sub: `${paySub}．公司最多留你 ${KEEP_JOB_YEARS} 年，之後回來當${s.job.name}`,
            ref: lg.id,
            salary: pay,
            keep: true,
          },
        ]
        : [{
          label: `接受，去當${lg.name}`,
          sub: `${paySub}．高峰約 ${lg.term || 8} 年`,
          ref: lg.id,
          salary: pay,
        }]),
      { label: '婉拒，維持現在的生活', sub: s.job ? `繼續當${s.job.name}` : '', ref: null },
    ],
  };
}

const KEEP_JOB_YEARS = 3;
function takeLegend(s, id, salary, keep = false) {
  const lg = legendById(id);
  const old = s.job;
  // 留職停薪：原本的工作先保留，任期縮短，結束後回去
  s.flags.keptJob = keep && old ? { ...old, pi: s.priceIndex } : null;
  s.job = {
    id: `lg_${lg.id}`,
    name: lg.name,
    salary: salary || lg.salary,
    years: 0,
    raise: lg.raise,
    risk: lg.risk,
    volatile: !!lg.volatile,
    // 傳說職業是人生的高峰，不是一輩子：任期結束就回到一般生活
    retireAge: Math.min(lg.retireAge || 999, s.age + (keep && old ? KEEP_JOB_YEARS : (lg.term || 8))),
    stat: lg.stat || null,
    legend: lg.id,
  };
  s.studying = false;
  s.careers.push(lg.name);
  s.legends = [...(s.legends || []), lg.id];
  s.title = lg.title;
  // 逆襲路線留著（當傳說職業的期間不會前進，回本行才會繼續）
  addPoints(s, 5, `成為${lg.name}`);
  const bonus = Math.round((s.job.volatile ? 60 * WAN : s.job.salary * 0.5) * 1) ;
  s.money += bonus;
  addStats(s, { happy: 8 });
  log(s, `${lg.icon} 你成為了「${lg.name}」！獲得稱號「${lg.title}」。`, 'milestone');
  return `${lg.take}${old ? (keep ? `（「${old.name}」的工作幫你保留 ${KEEP_JOB_YEARS} 年）` : `（你辭掉了「${old.name}」）`) : ''}`;
}

function bizPick(s, rng = Math.random) {
  const cap = Math.max(BIZ_MIN_CAPITAL, Math.round((s.money * 0.5) / (10 * WAN)) * 10 * WAN);
  // 這次有哪些行業可以選：三個基本款一定在，其他從二十幾種裡隨機再抽 4 種（已經開過的不重複）
  const owned = new Set((s.bizs || []).map((b) => b.type));
  const base = ['cram', 'food', 'tech'].filter((k) => !owned.has(k));
  const pool = OPEN_BIZ.filter((k) => !owned.has(k) && !base.includes(k));
  for (let i = pool.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const list = base.concat(pool.slice(0, 4));
  s.pending = {
    source: 'bizPick',
    id: 'bizPick',
    title: s.bizs.length ? '開第二家公司' : '要創什麼業？',
    text: `你準備拿出 ${formatMoney(cap)} 創業。${s.bizs.length ? `你已經有「${s.bizs[0].name}」，最多可以同時經營兩家公司。` : ''}${s.job ? '（可以一邊上班一邊經營，但選「經營事業」時成長比較快）' : ''}`,
    choices: list.map((k) => ({ label: BUSINESSES[k].name, sub: BUSINESSES[k].desc, ref: k, cap }))
      .concat([{ label: '還是算了', sub: '', ref: null }]),
  };
}

function followUps(s, rng) {
  if (s.pending || s.ended) return;
  // 樂團簽約：變成全職樂手
  if (s.flags.bandSign) {
    s.flags.bandSign = false;
    const def = jobById('bandmusician');
    const salary = Math.round((def.salary * (s.priceIndex ** 0.85) * diffOf(s).salary) / 1000) * 1000;
    const text = takeJob(s, 'bandmusician', salary);
    if (s.job) { s.job.name = `職業樂手（${s.flags.bandName || '樂團'}）`; s.careers[s.careers.length - 1] = s.job.name; }
    log(s, `${text.replace('職業樂手', `職業樂手（${s.flags.bandName || '樂團'}）`)}`, 'milestone');
    return;
  }
  if (s.flags.needJob) {
    if (!s.flags.giftGiven) {
      s.flags.giftGiven = true;
      const amt = Math.round(familyById(s.family).gift * s.priceIndex * diffOf(s).salary);
      if (amt > 0) {
        s.money += amt;
        s.flags.giftAmount = amt;
        openDef(s, rng, 'milestone', 'gift', MILESTONES.gift);
        return;
      }
    }
    s.flags.needJob = false;
    if (underIdolContract(s)) { idolJob(s); return; }
    jobOffers(s, rng);
    return;
  }
  if (s.flags.wantJob) {
    s.flags.wantJob = false;
    if (underIdolContract(s)) return;
    if (s.job && s.job.years < JOB_LOCK_YEARS) return;
    jobOffers(s, rng);
    return;
  }
  // 出道時已經出社會：公司要你全職
  if (underIdolContract(s) && !s.studying && (!s.job || s.job.id !== idolJobId(s))) idolJob(s);
  if (s.flags.wantBiz) {
    s.flags.wantBiz = false;
    if (s.money >= BIZ_MIN_CAPITAL && s.bizs.length < MAX_BIZ && canOpenSecondBiz(s)) bizPick(s, rng);
    return;
  }
  if (s.flags.wantBaby) {
    s.flags.wantBaby = false;
    if (s.married && s.kids.length < MAX_KIDS && !(s.flags.babyTry && s.age - s.flags.babyTry < 2)) {
      openDef(s, rng, 'event', 'baby', eventById('baby'));
      return;
    }
  }
  // 借不到錢了：讓玩家自己決定賣什麼（遊戲不會擅自動你的資產）
  if (s.flags.mustSell) {
    s.flags.mustSell = false;
    sellPick(s);
    return;
  }

  // 傳說職業：條件到了就有人來找你
  if (s.age >= 18 && !s.ended) {
    const lg = availableLegend(s, netWorth(s), investTotal(s));
    if (lg) {
      s.flags.legendSeen = { ...(s.flags.legendSeen || {}), [lg.id]: true };
      legendOffer(s, lg);
      return;
    }
  }

  if (!s.achievedAge && netWorth(s) >= YI) {
    s.achievedAge = s.age;
    addPoints(s, 10, '達成一個億');
    openDef(s, rng, 'milestone', 'achieved', MILESTONES.achieved);
  }
}

function routeInfo(s) {
  const r = ROUTES[s.route.id];
  return { tag: `${r.name}．${s.route.step + 1} / ${r.steps.length}`, progress: { names: r.stepNames, step: s.route.step } };
}

function selectPending(s, rng) {
  smallEvents(s, rng);
  // 1. 里程碑
  const sk = s.flags.skipYears || 0;
  if (s.age === 1) return openDef(s, rng, 'milestone', 'zhuazhou', MILESTONES.zhuazhou);
  if (s.age === 3 && !s.flags.kinder) return openDef(s, rng, 'milestone', 'kinder', MILESTONES.kinder);
  // 資優鑑定：5 歲、智力夠高才會遇到
  if (s.age === 5 && !s.seen.skipGrade && s.stats.int >= 62) {
    s.seen.skipGrade = true;
    return openDef(s, rng, 'milestone', 'skipGrade', MILESTONES.skipGrade);
  }
  // 幼兒園選「阿嬤帶」的人，這裡不會有「爸媽接送」可選，要到國中才能改
  if (s.studying && s.age === 6 - sk && !s.flags.pickup) return openDef(s, rng, 'milestone', 'pickup', MILESTONES.pickup);
  if (s.studying && s.age === 12 - sk && s.flags.pickup && s.flags.pickup !== 'self' && !s.seen.pickup12) {
    s.seen.pickup12 = true;
    return openDef(s, rng, 'milestone', 'pickup12', MILESTONES.pickup12);
  }
  if (s.studying && s.age === 13 - sk && !s.flags.club) return openDef(s, rng, 'milestone', 'club', MILESTONES.club);
  if (s.flags.idol >= 1 && s.flags.idol <= 3 && s.flags.idolEnd && s.age >= s.flags.idolEnd) {
    return openDef(s, rng, 'milestone', 'idolRenew', MILESTONES.idolRenew);
  }
  if (s.studying && s.age === 15 - sk) {
    s.flags.score15 = examScore(s, rng);
    return openDef(s, rng, 'milestone', 'exam15', MILESTONES.exam15);
  }
  if (s.studying && s.age === 18 - sk && (s.edu === 'senior' || s.edu === 'vocational')) {
    s.flags.score18 = examScore(s, rng);
    return openDef(s, rng, 'milestone', 'exam18', MILESTONES.exam18);
  }
  if (s.studying && s.age === 22 - sk && !s.flags.inMaster) return openDef(s, rng, 'milestone', 'grad22', MILESTONES.grad22);

  // 1.5 同學會（每 5 年一次）
  if (s.mates && REUNION_AGES.includes(s.age) && s.age >= MATE_START && !s.seen[`reunion${s.age}`]) {
    s.seen[`reunion${s.age}`] = true;
    return openDef(s, rng, 'event', 'reunion', eventById('reunion'));
  }

  // 2. 自己要求的事、達成一億
  followUps(s, rng);
  if (s.pending) return;

  // 3. 股災
  if (s.world.crash && canInvest(s) && s.etf + s.stock + s.crypto > 10 * WAN) {
    return openDef(s, rng, 'event', 'crash', eventById('crash'));
  }

  // 4. 生病
  if (s.flags.sickPending) {
    s.flags.sickPending = false;
    return openDef(s, rng, 'event', 'big_sick', eventById('big_sick'));
  }

  // 5. 逆襲路線
  if (s.route && !s.route.done) {
    const def = ROUTES[s.route.id];
    const step = def.steps[s.route.step];
    if (step && s.age - s.route.since >= step.minYears && step.cond(s)) {
      const p = 0.45 + (hasFocus(s, 'work') || hasFocus(s, 'runbiz') ? 0.35 : 0);
      if (chance(rng, p)) {
        return openDef(s, rng, 'route', `${s.route.id}:${s.route.step}`, step, routeInfo(s));
      }
    }
  }

  // 6. 需要做選擇的隨機事件
  if (!chance(rng, s.age < 6 ? 0.5 : 0.7)) return;
  const e = pickEvent(s, rng, true);
  if (!e) return;
  s.seen[e.id] = true;
  s.lastEvent = e.id;
  openDef(s, rng, 'event', e.id, e);
}

function eventPool(s, withChoices) {
  return EVENTS.filter((e) => (typeof e.weight === 'function' || e.weight > 0)
    && !!e.choices === withChoices
    && s.age >= e.minAge && s.age <= e.maxAge
    && (!e.once || !s.seen[e.id])
    && e.id !== s.lastEvent
    && !(s.yearEvents || []).includes(e.id)
    && (!e.cond || e.cond(s)));
}

function pickEvent(s, rng, withChoices) {
  const e = weightedPick(rng, eventPool(s, withChoices), (x) => (typeof x.weight === 'function' ? x.weight(s) : x.weight));
  if (e) s.yearEvents = [...(s.yearEvents || []), e.id];
  return e;
}

// 每年 0～2 件不用選擇的小事件
// 還沒出社會：事件裡的天災人禍（賠錢、修東西、醫藥費……）都是爸媽出的
function parentsCover(s, moneyBefore, res, force) {
  if (isAdult(s) || s.money >= moneyBefore) return res;
  if (!force && res.tone !== 'bad') return res;
  const loss = moneyBefore - s.money;
  s.money = moneyBefore;
  return { ...res, text: `${res.text}（${formatMoney(loss)} 爸媽出的）` };
}

function smallEvents(s, rng) {
  s.yearEvents = [];
  const n = (chance(rng, 0.8) ? 1 : 0) + (chance(rng, 0.4) ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const e = pickEvent(s, rng, false);
    if (!e) return;
    if (e.once) s.seen[e.id] = true;
    const before = netWorth(s);
    const moneyBefore = s.money;
    let res = toResult(e.effect(s, rng));
    res = parentsCover(s, moneyBefore, res, true);
    log(s, `【${e.title}】${res.text}`, res.tone);
    trackMove(s, e.title, netWorth(s) - before);
  }
}

// ───────────────────────── 過一年 ─────────────────────────
export function nextYear(s0, rng = Math.random) {
  if (s0.pending || s0.ended) return s0;
  const s = clone(s0);
  s.focus = defaultFocus(s);
  s.age += 1;
  s.perk = perksOf(s);

  const focusText = applyFocus(s, rng);
  if (focusText) log(s, focusText, 'focus');

  schoolYear(s);
  rollWorld(s, rng);
  if (!s.mates) s.mates = makeMates(rng); // 舊存檔補上同學
  mateYear(s, rng);
  refreshTargets(s, rng);
  economy(s, rng);
  careerYear(s, rng);
  petYear(s, rng);
  spouseCareer(s, rng);
  romanceYear(s, rng);
  bodyYear(s, rng);
  if (s.age >= 6 && !s.ended) addPoints(s, 1, '又長大一歲');
  s.history.push(netWorth(s));
  s.invHistory.push(investTotal(s));

  if (s.ended) return s;

  if (s.age >= s.endAge) {
    s.ended = { reason: 'age', age: s.age };
    if (!s.achievedAge && netWorth(s) >= YI) s.achievedAge = s.age;
    log(s, `${s.name} ${s.age} 歲退休了，人生結算的時刻到了！`, 'milestone');
    return s;
  }

  selectPending(s, rng);
  s.focus = defaultFocus(s);
  return s;
}

export function resolveChoice(s0, idx, rng = Math.random) {
  const p = s0.pending;
  if (!p || !p.choices[idx]) return s0;
  const s = clone(s0);
  const ch = s.pending.choices[idx];
  s.pending = null;
  const before = netWorth(s);
  let res = { text: '', tone: 'neutral' };

  if (p.source === 'offers') {
    if (ch.ref) res = { text: takeJob(s, ch.ref, ch.salary, { alt: ch.alt, stat: ch.stat, noRetire: ch.noRetire }), tone: 'good' };
    else res = { text: s.job ? '你決定留在原本的工作。' : '你決定先休息一下。', tone: 'neutral' };
  } else if (p.source === 'sellPick') {
    if (!ch.ref) {
      const floor = -Math.round(Math.max((s.lastYear && s.lastYear.living) || 20 * WAN * s.priceIndex, 20 * WAN * s.priceIndex) * 12);
      if (s.money < floor) s.money = floor;
      res = { text: `你什麼都沒賣，縮衣節食過日子。${addStats(s, { happy: -5, hp: -2 })}`, tone: 'bad' };
    } else if (String(ch.ref).startsWith('house:')) {
      const uid = String(ch.ref).slice(6);
      const h = (s.houses || []).find((x) => x.uid === uid);
      if (h) {
        const debt = s.debts.find((d) => d.houseUid === uid);
        const owed = debt ? debt.balance : 0;
        s.money += h.value - owed;
        s.houses = s.houses.filter((x) => x.uid !== uid);
        s.debts = s.debts.filter((d) => d.houseUid !== uid);
        res = { text: `你賣掉了「${h.name}」（賣價 ${formatMoney(h.value)}），扣掉房貸後拿回 ${formatMoney(h.value - owed)}。`, tone: 'neutral' };
      }
    } else {
      const k = ch.ref;
      const take = Math.min(s[k], -s.money);
      s[k] -= take;
      s.money += take;
      res = { text: `你賣掉了 ${formatMoney(take)} 的${ASSET_NAME[k]}來還債。${s.money < 0 ? `還欠 ${formatMoney(-s.money)}。` : '債還清了。'}`, tone: 'neutral' };
      if (s.money < 0 && SELLABLE.some((x) => s[x] > 0)) s.flags.mustSell = true;
    }
  } else if (p.source === 'legend') {
    if (ch.ref) res = { text: takeLegend(s, ch.ref, ch.salary, !!ch.keep), tone: 'milestone' };
    else res = { text: '你想了很久，還是婉拒了。有些路不是每個人都想走。', tone: 'neutral' };
  } else if (p.source === 'bizPick') {
    if (ch.ref) {
      const r = s.route;
      let route = null;
      // 創業家之路一生只能走一次
      if (!s.flags.founderUsed && (!r || r.done || r.step === 0)) {
        s.flags.founderUsed = true;
        s.route = { id: 'founder', step: 0, since: s.age, done: false };
        route = 'founder';
      }
      res = { text: startBiz(s, ch.ref, { cash: Math.min(ch.cap, s.money), route }), tone: 'good' };
    } else res = { text: '你決定再想想。', tone: 'neutral' };
  } else {
    const def = getDef(p);
    const c = def.choices[ch.ref];
    const moneyBefore = s.money;
    res = toResult(c.effect(s, rng));
    res = parentsCover(s, moneyBefore, res, false);
    if (p.source === 'route') {
      if (c.advance && res.advance !== false) advanceRoute(s);
      else s.route.since = s.age; // 沒成功或暫緩：過幾年再給機會
    }
  }

  if (res.text) log(s, `【${p.title}】${res.text}`, res.tone);
  trackMove(s, `${p.title}：${ch.label}`, netWorth(s) - before);
  s.history[s.history.length - 1] = netWorth(s);
  s.invHistory[s.invHistory.length - 1] = investTotal(s);
  followUps(s, rng);
  s.perk = perksOf(s);
  s.focus = defaultFocus(s);
  return s;
}

function takeJob(s, id, salary, variant = null) {
  const def = jobById(id);
  const old = s.job;
  const name = (variant && variant.alt) || def.name;
  s.job = {
    id,
    name,
    salary: salary || def.salary,
    years: 0,
    raise: def.raise,
    risk: def.risk,
    volatile: !!def.volatile,
    retireAge: variant && variant.noRetire ? null : (def.retireAge || null),
    stat: (variant && variant.stat) || null,
  };
  s.studying = false;
  s.careers.push(name);
  s.jobIds = [...(s.jobIds || []), id];
  const r = s.route;
  const keep = r && (r.done || (r.step > 0 && s.bizs.some((b) => b.route === r.id)));
  if (!keep) s.route = ROUTES[id] ? { id, step: 0, since: s.age, done: false } : null;
  return `${old ? `你離開了「${old.name}」，` : ''}開始擔任「${name}」${def.volatile ? '' : `，年薪 ${formatMoney(s.job.salary)}`}。`;
}

function advanceRoute(s) {
  const r = s.route;
  const def = ROUTES[r.id];
  r.step += 1;
  r.since = s.age;
  addPoints(s, 3, `${def.name}前進一步`);
  if (r.step >= def.steps.length) {
    r.done = true;
    // 路線上開的公司直接升到滿級
    for (const b of s.bizs) if (b.route === r.id) b.maxed = true;
    addPoints(s, 5, `完成${def.name}`);
    s.title = def.title;
    log(s, `「${def.name}」完成！獲得稱號「${def.title}」。`, 'milestone');
  }
}

// ───────────────────────── 點數升級 ─────────────────────────
// ───────────────────────── 投資操作 ─────────────────────────
const fail = (s, error) => ({ state: s, error });

// ───────── 求婚（家庭頁隨時可以按）─────────
export const PROPOSE_MIN_LOVE = 40;
export const PROPOSE_MIN_YEARS = 1;

export function proposeInfo(s) {
  if (!s.partner || s.married) return { ok: false, reason: '你現在沒有交往的對象' };
  const years = s.age - s.partner.since;
  if (s.studying) return { ok: false, reason: '還在讀書，出社會以後再說' };
  if (years < PROPOSE_MIN_YEARS) return { ok: false, reason: `交往滿 ${PROPOSE_MIN_YEARS} 年才好開口（目前 ${years} 年）` };
  if (s.partner.love < PROPOSE_MIN_LOVE) return { ok: false, reason: `感情要 ${PROPOSE_MIN_LOVE} 以上（目前 ${s.partner.love}）．選「約會」可以加很多` };
  return { ok: true, cost: Math.round(60 * WAN * s.priceIndex) };
}

// wedding = true 辦婚禮（花錢、快樂多）；false 登記就好
export function propose(s0, wedding = true) {
  const info = proposeInfo(s0);
  if (!info.ok) return fail(s0, info.reason);
  const s = clone(s0);
  const name = s.partner.name;
  const cost0 = wedding ? info.cost : 0;
  if (wedding && s.money < cost0) return fail(s0, `辦婚禮需要 ${formatMoney(cost0)}，可以先選「登記就好」`);
  s.money -= cost0;
  const gift = marry(s, rng);
  log(
    s,
    wedding
      ? `你向「${name}」求婚，對方答應了！婚禮花了 ${formatMoney(cost0)}。${gift ? `對方家裡包了 ${formatMoney(gift)} 的大紅包！` : ''}${addStats(s, { happy: 15, charm: 3 })}`
      : `你和「${name}」去戶政事務所登記結婚，省下一大筆錢。${gift ? `對方家裡還包了 ${formatMoney(gift)} 給你們。` : ''}${addStats(s, { happy: 10 })}`,
    'milestone',
  );
  s.perk = perksOf(s);
  return { state: s };
}

export function buyAsset(s0, key, amount) {
  if (!canInvest(s0)) return fail(s0, `${INVEST_MIN_AGE} 歲以後才能投資`);
  const amt = Math.min(Math.round(amount), s0.money);
  if (amt <= 0) return fail(s0, '現金不夠');
  const s = clone(s0);
  s.money -= amt;
  s[key] += amt;
  return { state: s };
}

export function sellAsset(s0, key, amount) {
  const amt = Math.min(Math.round(amount), s0[key]);
  if (amt <= 0) return fail(s0, '沒有可以賣的');
  const s = clone(s0);
  s[key] -= amt;
  s.money += amt;
  return { state: s };
}

export function setDca(s0, pct) {
  return { ...s0, dca: pct };
}

export function buyHouse(s0, id) {
  const h = HOUSES.find((x) => x.id === id);
  const disc = s0.perk ? s0.perk.house : 0;
  const price = Math.round(housePrice(s0, h) * (1 - disc));
  const down = Math.round(price * DOWN_PAYMENT);
  if (s0.age < 20) return fail(s0, '20 歲以後才能買房');
  if (!s0.job && !s0.bizs.length) return fail(s0, '要有工作或事業才能申請房貸');
  if (s0.money < down) return fail(s0, `頭期款需要 ${formatMoney(down)}`);
  const s = clone(s0);
  s.money -= down;
  const uid = `h${s.uid++}`;
  s.flags.everHouse = true; s.houses.push({ uid, id: h.id, name: h.name, value: price, price });
  addDebt(s, `房貸：${h.name}`, price - down, MORTGAGE_RATE, { houseUid: uid });
  log(s, `用 ${formatMoney(price)} 買下${h.name}${disc ? `（${currentType(s).title}的關係，便宜了 ${Math.round(disc * 100)}%）` : ''}，付了頭期款 ${formatMoney(down)}。${s.houses.length > 1 ? '這間拿來出租，每年有租金收入。' : ''}${addStats(s, { happy: h.happy })}`, 'good');
  return { state: s };
}

export function sellHouse(s0, uid) {
  const s = clone(s0);
  const h = s.houses.find((x) => x.uid === uid);
  if (!h) return fail(s0, '找不到房子');
  const debt = s.debts.find((d) => d.houseUid === uid);
  const owed = debt ? debt.balance : 0;
  s.money += h.value - owed;
  s.houses = s.houses.filter((x) => x.uid !== uid);
  s.debts = s.debts.filter((d) => d.houseUid !== uid);
  log(s, `賣掉${h.name}（買價 ${formatMoney(h.price)}，賣價 ${formatMoney(h.value)}），扣掉房貸後拿回 ${formatMoney(h.value - owed)}。`, 'neutral');
  return { state: s };
}

// ───────── 信用貸款：自己去銀行借 ─────────
export const PERSONAL_LOAN_RATE = 0.06;
export const PERSONAL_LOAN_YEARS = 7;

// 可以借多少：看收入（三年）加上抵押（存款一半、投資和房產淨值的三成），扣掉已經借的信貸
export function loanInfo(s) {
  const y = s.lastYear || {};
  const income = (y.salary || 0) + (y.bizIncome || 0) + (y.rent || 0) + (y.spouse || 0) + (s.job ? s.job.salary * 0.5 : 0);
  const collateral = Math.max(0, s.money) * 0.5 + investTotal(s) * 0.3 + Math.max(0, houseTotal(s) - debtTotal(s)) * 0.3;
  const owed = s.debts.filter((d) => d.personal).reduce((t, d) => t + d.balance, 0);
  const gross = Math.round((income * 3 + collateral) / WAN) * WAN;
  const limit = Math.max(0, gross - owed);
  let why = null;
  if (s.age < 20) why = '20 歲以後才能跟銀行借錢。';
  else if (gross <= 0) why = '沒有收入也沒有存款和資產，銀行不肯借。先找一份工作吧。';
  else if (limit <= 0) why = '信貸額度已經用完，先還一些再借。';
  return { limit: why ? 0 : limit, gross, owed, rate: PERSONAL_LOAN_RATE, years: PERSONAL_LOAN_YEARS, why };
}

export function borrow(s0, amount) {
  const info = loanInfo(s0);
  if (info.why) return fail(s0, info.why);
  const amt = Math.min(Math.round(amount), info.limit);
  if (amt < WAN) return fail(s0, '額度不夠了');
  const s = clone(s0);
  const r = PERSONAL_LOAN_RATE;
  const annuity = amt * (r / (1 - (1 + r) ** -PERSONAL_LOAN_YEARS)); // 本利平均攤還，7 年剛好還完
  addDebt(s, '信用貸款', amt, r, { personal: true, payment: Math.round(annuity) });
  s.money += amt;
  log(s, `你跟銀行借了 ${formatMoney(amt)} 信用貸款，利率 ${(PERSONAL_LOAN_RATE * 100).toFixed(0)}%，分 ${PERSONAL_LOAN_YEARS} 年還。`, 'neutral');
  return { state: s };
}

// 現金透支：一鍵賣掉流動資產（定存→黃金→個股→加密幣→ETF）把負的現金補回 0
export function clearOverdraft(s0) {
  if (s0.money >= 0) return fail(s0, '現金沒有透支');
  if (!SELLABLE.some((k) => s0[k] > 0)) return fail(s0, '沒有可以賣的投資，去「金融」分頁看看或先找工作');
  const s = clone(s0);
  const sold = [];
  for (const k of ['deposit', 'gold', 'stock', 'crypto', 'etf']) {
    if (s.money >= 0) break;
    if (s[k] <= 0) continue;
    const take = Math.min(s[k], -s.money);
    s[k] -= take;
    s.money += take;
    sold.push(`${ASSET_NAME[k]} ${formatMoney(take)}`);
  }
  log(s, `你賣掉了 ${sold.join('、')}，把透支的現金補回來了。${s.money < 0 ? `還差 ${formatMoney(-s.money)}。` : ''}`, 'neutral');
  return { state: s };
}

export function repayDebt(s0, uid, amount) {
  const s = clone(s0);
  const d = s.debts.find((x) => x.uid === uid);
  if (!d) return fail(s0, '找不到貸款');
  const amt = Math.min(Math.round(amount), d.balance, s.money);
  if (amt <= 0) return fail(s0, '現金不夠');
  d.balance -= amt;
  s.money -= amt;
  if (d.balance <= 0) {
    s.debts = s.debts.filter((x) => x.uid !== uid);
    log(s, `「${d.name}」提前還清了！`, 'good');
  }
  return { state: s };
}

export function investBiz(s0, uid, amount) {
  const b0 = s0.bizs.find((b) => b.uid === uid);
  if (!b0) return fail(s0, '找不到這家公司');
  const amt = Math.min(Math.round(amount), s0.money);
  if (amt <= 0) return fail(s0, '現金不夠');
  const s = clone(s0);
  const b = s.bizs.find((x) => x.uid === uid);
  s.money -= amt;
  b.value += amt;
  b.capital += amt;
  return { state: s };
}

export function sellBiz(s0, uid) {
  const b = s0.bizs.find((x) => x.uid === uid);
  if (!b) return fail(s0, '找不到這家公司');
  const s = clone(s0);
  log(s, `你賣掉了「${b.name}」，拿回 ${formatMoney(b.value)}。`, 'neutral');
  s.money += b.value;
  removeBiz(s, uid);
  return { state: s };
}

// ───────────────────────── 結算 ─────────────────────────
export function summary(s) {
  const nw = netWorth(s);
  const mates = s.mates ? ranking(s, nw) : null;
  const achieved = nw >= YI || !!s.achievedAge;
  const dead = s.ended && s.ended.reason === 'death';
  let title;
  let headline;
  if (dead) {
    headline = '人生提早落幕';
    title = achieved ? '來不及享受的富翁' : '英年早逝';
  } else if (nw >= YI) {
    headline = '小目標達成！';
    if (s.title) title = s.title;
    else {
      const parts = [
        ['白手起家的企業家', bizTotal(s)],
        ['包租公', houseTotal(s)],
        ['投資達人', investTotal(s)],
        ['存錢高手', s.money],
      ].sort((a, b) => b[1] - a[1]);
      title = parts[0][0];
    }
    if (nw >= YI * 10) title = `超級富豪．${title}`;
  } else {
    headline = s.achievedAge ? '曾經達成過一億' : '差一點點！';
    if (nw >= 5000 * WAN) title = '準億萬富翁';
    else if (nw >= 1000 * WAN) title = '小康人生';
    else if (nw >= 0) title = '平凡但踏實';
    else title = '負債人生';
    if (s.title) title = `${s.title}（未滿一億）`;
  }

  const advice = [];
  if (nw < YI) {
    if (s.dca === 0) advice.push('在投資頁設定「定期定額」，讓複利幫你慢慢滾大。');
    if (!s.route || s.route.step < 2) advice.push('多選「認真工作」，逆襲路線的機會會更常出現。');
    if (s.stats.hp < 40 || dead) advice.push('記得偶爾選「運動健身」、做健康檢查，身體垮了什麼都沒了。');
    if (s.money > 500 * WAN && investTotal(s) < s.money) advice.push('通膨會吃掉現金，可以拿去投資或買房。');
    if (!advice.length) advice.push('每條路都能賺到一個億，換個選擇再挑戰一次吧！');
  }

  const bestWorld = s.worldHistory.filter((w) => w.id !== 'calm');

  return {
    nw,
    pct: (nw / YI) * 100,
    realNw: nw / s.priceIndex,
    priceIndex: s.priceIndex,
    achieved,
    achievedAge: s.achievedAge,
    dead,
    headline,
    title,
    advice,
    edu: eduName(s),
    careers: s.careers.length
      ? [...new Set(s.careers)].join(' → ') + (s.bizs.length ? ` → ${s.bizs.map((b) => b.name).join('＋')}老闆` : '')
      : (s.bizs.length ? `${s.bizs.map((b) => b.name).join('＋')}老闆` : '無'),
    family: familyById(s.family).name,
    married: s.married,
    spouse: s.spouse ? { ...s.spouse, ...spouseInfo(s) } : null,
    mates,
    mateRank: mates ? mates.find((x) => x.me).rank : null,
    group: s.bizs.filter((b) => b.group).length,
    pointsTotal: s.pointsTotal,
    endAge: s.endAge,
    kids: s.kids,
    kidSpent: s.kidSpent,
    pets: s.pets || [],
    petSpent: s.petSpent || 0,
    happy: s.stats.happy,
    best: s.best,
    worst: s.worst,
    history: s.history,
    worldCount: bestWorld.length,
    crashes: s.worldHistory.filter((w) => ['pandemic', 'war', 'crisis'].includes(w.id)).length,
  };
}
