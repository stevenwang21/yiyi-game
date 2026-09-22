// 會被事件、逆襲路線、引擎共用的動作
import {
  BUSINESSES, LOAN_RATE, PAY_RATIO, MAX_BIZ, HOUSES, KID_GIVEN_M, KID_GIVEN_F, PARTNER_NAMES, SPOUSE_LEVELS, PETS, diffById, partnerPool,
} from './data.js';
import { rollPartnerType, partnerType } from './partners.js';

// 難度設定（舊存檔沒有這個欄位，就當作輕鬆）
export const diffOf = (s) => diffById(s.difficulty || 'easy');
export const growFactor = (s) => 0.5 * diffOf(s).grow;
// 事件讓公司價值變動時，也依難度打折
export const scaleBiz = (s, b, mult) => {
  const f = mult >= 1 ? 1 + (mult - 1) * diffOf(s).grow : mult;
  b.value = Math.round(b.value * f);
  return b.value;
};
import { formatMoney } from './utils.js';

export const debtTotal = (s) => s.debts.reduce((t, d) => t + d.balance, 0);
export const houseTotal = (s) => s.houses.reduce((t, h) => t + h.value, 0);
export const investTotal = (s) => s.deposit + s.etf + s.stock + s.gold + s.crypto;
export const bizTotal = (s) => s.bizs.reduce((t, b) => t + b.value, 0);

export const netWorth = (s) => s.money + investTotal(s) + houseTotal(s) + bizTotal(s) - debtTotal(s);

// 最大的事業
export const mainBiz = (s) => (s.bizs.length ? [...s.bizs].sort((a, b) => b.value - a.value)[0] : null);
// 某條逆襲路線開的事業
export const routeBiz = (s, routeId) => s.bizs.find((b) => b.route === routeId) || null;

// 目前的房價（會隨房市指數變動）
export const housePrice = (s, h) => Math.round((h.price * s.idx.house) / 100 / 10000) * 10000;
export const houseDefs = () => HOUSES;

export const addDebt = (s, name, amount, rate = LOAN_RATE, extra = {}) => {
  s.debts.push({
    uid: `d${s.uid++}`,
    name,
    balance: Math.round(amount),
    payment: Math.round(amount * PAY_RATIO),
    rate,
    ...extra,
  });
};

export const removeBiz = (s, uid) => {
  s.bizs = s.bizs.filter((b) => b.uid !== uid);
};

// 開始一個事業（最多同時兩家，超過時先賣掉價值最低的）
export const ownBizs = (s) => s.bizs.filter((b) => !b.group);

export const startBiz = (s, type, { cash = 0, loan = 0, value, route = null, quitJob = false } = {}) => {
  const def = BUSINESSES[type];
  let prefix = '';
  if (ownBizs(s).length >= MAX_BIZ) {
    const low = [...ownBizs(s)].sort((a, b) => a.value - b.value)[0];
    prefix = `最多只能經營 ${MAX_BIZ} 家公司，你先把「${low.name}」賣掉（+${formatMoney(low.value)}）。`;
    s.money += low.value;
    removeBiz(s, low.uid);
  }
  s.money -= cash;
  if (loan > 0) addDebt(s, `創業貸款：${def.name}`, loan);
  const v = Math.round(value ?? cash + loan);
  // 第一家還沒到滿級：新事業併進第一家，當成新部門（第二家公司要等第一家升到 Lv5）
  const own = ownBizs(s);
  if (own.length === 1 && !canOpenSecondBiz(s)) {
    const main = own[0];
    main.value += v;
    main.capital += v;
    if (route && !main.route) main.route = route;
    let text = `第一家公司還沒升到滿級，不能另開新公司，所以你把「${def.name}」併進「${main.name}」當新部門（公司價值 +${formatMoney(v)}）。`;
    if (quitJob && s.job) { text += `你辭掉了「${s.job.name}」的工作，全心當老闆。`; s.job = null; }
    return text;
  }
  s.bizs.push({ uid: `b${s.uid++}`, type, name: def.name, value: v, capital: v, route, bonus: 0, years: 0, lastR: 0 });
  s.flags.everBiz = true;
  let text = `${prefix}你成立了「${def.name}」，事業價值 ${formatMoney(v)}。`;
  if (quitJob && s.job) {
    text += `你辭掉了「${s.job.name}」的工作，全心當老闆。`;
    s.job = null;
  }
  if (ownBizs(s).length === 2) text += '你現在同時經營兩家公司！';
  return text;
};

// 事業升級：價值乘上倍率、平均報酬提升（倍率會依難度打折）
export const growBiz = (b, mult, bonus = 0.01, rename, factor = 0.5) => {
  if (!b) return '';
  b.value = Math.round(b.value * (1 + (mult - 1) * factor));
  b.bonus += bonus;
  if (rename) b.name = rename;
  return `「${b.name}」的價值變成 ${formatMoney(b.value)}。`;
};

// 升職：改職稱、薪水乘上倍率
export const promote = (s, title, mult) => {
  if (!s.job) return '';
  s.job.name = title;
  s.job.salary = Math.round(s.job.salary * mult);
  return `你升為「${title}」，年薪變成 ${formatMoney(s.job.salary)}。`;
};

// 晉升成功機率：智力、人緣、年資、是否認真工作
export const promoteChance = (s) => {
  const years = s.job ? Math.min(10, s.job.years) : 0;
  let p = 0.25 + (s.stats.int + s.stats.charm) / 300 + years * 0.02;
  if ((s.focuses || [s.focus]).includes('work')) p += 0.12;
  if (s.stats.hp < 35) p -= 0.1;
  p += (s.perk && s.perk.promo) || 0;
  return Math.max(0.15, Math.min(0.9, p));
};

export const addSkill = (s, n = 1) => {
  s.investSkill = Math.min(6, s.investSkill + n);
};

// 把高風險資產全部換成現金
export const sellRisky = (s) => {
  const v = s.etf + s.stock + s.crypto;
  s.money += v;
  s.etf = 0;
  s.stock = 0;
  s.crypto = 0;
  return v;
};

// 媽媽的年齡：你是女生就是你自己，男生就看另一半
export const motherAge = (s) => {
  if (s.gender === 'female') return s.age;
  if (s.spouse && s.spouse.age) return s.spouse.age + (s.age - s.spouse.since);
  return s.age;
};

// 受孕機率（隨年齡下降，大致貼近現實）
export const conceiveChance = (age) => {
  if (age < 30) return 0.95;
  if (age < 35) return 0.85;
  if (age < 38) return 0.65;
  if (age < 40) return 0.45;
  if (age < 43) return 0.25; // 40 歲之後明顯變難
  if (age < 45) return 0.12;
  return 0.05;
};

// 唐氏症（21 三體）機率，採用接近真實的數字
export const downsChance = (age) => {
  if (age < 30) return 0.001;
  if (age < 35) return 0.002;
  if (age < 38) return 0.004;
  if (age < 40) return 0.007;
  if (age < 41) return 0.01;
  if (age < 43) return 0.017;
  if (age < 45) return 0.028;
  return 0.04;
};

// 生小孩
export const addKid = (s, rng) => {
  const used = new Set(s.kids.map((k) => k.name));
  const boy = rng() < 0.5;
  const given = boy ? KID_GIVEN_M : KID_GIVEN_F;
  const surname = s.surname || (s.name && s.name.length >= 3 ? s.name[0] : '陳');
  const pool = given.map((g) => surname + g).filter((n) => !used.has(n));
  const name = pool.length ? pool[Math.floor(rng() * pool.length)] : `${surname}寶${s.kids.length + 1}`;
  const kid = { uid: `k${s.uid++}`, name, born: s.age, spent: 0, cram: false, style: 'normal', downs: false, gender: boy ? 'male' : 'female' };
  s.kids.push(kid);
  addPoints(s, 1, `${name} 出生`);
  return kid;
};

// ───────── 戀愛、婚姻 ─────────
export const startDating = (s, rng, typeId = null, forcedName = null) => {
  const all = partnerPool(s);
  const pool = all.filter((n) => !s.exes.includes(n));
  const name = forcedName
    || (pool.length ? pool[Math.floor(rng() * pool.length)] : all[Math.floor(rng() * all.length)]);
  const type = typeId ? partnerType(typeId) : rollPartnerType(rng);
  s.partner = { name, since: s.age, love: 50, type: type ? type.id : null };
  s.partner.title = type ? type.title : '';
  return s.partner;
};

export const endRelationship = (s) => {
  if (s.partner) s.exes.push(s.partner.name);
  s.partner = null;
};

export const marry = (s, rng) => {
  const p = s.partner;
  const name = p ? p.name : partnerPool(s)[0];
  s.married = true;
  // 另一半的年齡（跟你差 4 歲以內），之後生小孩會用到
  const gap = Math.round((typeof rng === 'function' ? rng() : Math.random()) * 8) - 4;
  s.spouse = {
    name, since: s.age, age: Math.max(18, s.age + gap),
    type: p ? p.type || null : null, title: p ? p.title || '' : '',
  };
  s.partner = null;
  addPoints(s, 2, '結婚');
  // 富二代這種對象結婚時會給一筆禮金
  const t = s.spouse.type ? partnerType(s.spouse.type) : null;
  if (t && t.perk && t.perk.gift) {
    const amt = Math.round(t.perk.gift * 10000 * s.priceIndex);
    s.money += amt;
    return amt;
  }
  return 0;
};

// 另一半的職稱：會跟著他本來的行業一路升上去（護理師不會變成企業家）
export const spouseTitle = (s, level = s.spouseLevel) => {
  const holder = s.married ? s.spouse : s.partner;
  const t = holder && holder.type ? partnerType(holder.type) : null;
  if (t && t.ladder && t.ladder[level]) return t.ladder[level];
  return SPOUSE_LEVELS[level].title;
};

export const spouseInfo = (s) => {
  const lv = SPOUSE_LEVELS[s.spouseLevel];
  return {
    level: s.spouseLevel,
    title: spouseTitle(s),
    income: Math.round(lv.income * s.priceIndex),
  };
};

// ───────── 人生點數 ─────────
export const addPoints = (s, n, reason) => {
  if (!n) return;
  s.points += n;
  s.pointsTotal += n;
  s.pointsLog.push({ age: s.age, n, reason });
  if (s.pointsLog.length > 40) s.pointsLog.shift();
};

// ───────── 寵物 ─────────
export const addPet = (s, rng, type = 'dog') => {
  const def = PETS[type];
  if (!s.pets) s.pets = [];
  const used = new Set(s.pets.map((p) => p.name));
  const pool = def.names.filter((n) => !used.has(n));
  const name = pool.length ? pool[Math.floor(rng() * pool.length)] : `${def.kind}${s.pets.length + 1}`;
  const life = def.life[0] + Math.floor(rng() * (def.life[1] - def.life[0] + 1));
  const pet = { uid: `p${s.uid++}`, type, kind: def.kind, name, since: s.age, life, alive: true, spent: 0, bills: [] };
  s.pets.push(pet);
  return pet;
};

// 記一筆寵物花費：18 歲以前由爸媽付（有記錄但不扣你的錢）
export const petExpense = (s, pet, item, amount) => {
  const amt = Math.round(amount);
  const byParents = s.age < 18;
  pet.spent += amt;
  pet.bills.push({ age: s.age, item, amount: amt, byParents });
  if (pet.bills.length > 80) pet.bills.shift();
  s.petSpent = (s.petSpent || 0) + amt;
  if (!byParents) s.money -= amt;
  return byParents;
};

export const alivePets = (s) => (s.pets || []).filter((p) => p.alive);

// 偶像合約期內（出道時簽八年）不能找別的工作
// 公司等級：看「價值是投入本金的幾倍」和經營年數（追加投資會同時增加本金，所以買不到等級）
export const BIZ_LEVELS = [
  { lv: 1, name: '起步期', mult: 0, years: 0 },
  { lv: 2, name: '站穩腳步', mult: 1.3, years: 2 },
  { lv: 3, name: '成長期', mult: 1.8, years: 4 },
  { lv: 4, name: '擴張期', mult: 2.5, years: 6 },
  { lv: 5, name: '產業龍頭', mult: 3.5, years: 8 },
];
// 逆襲路線走完（例如藥師 → 開藥局 → 藥妝品牌），那家公司直接算滿級
const routeMaxed = (b, s) => !!(b.maxed || (s && s.route && s.route.done && b.route && b.route === s.route.id));
export const bizLevel = (b, s) => {
  const m = b.capital > 0 ? b.value / b.capital : 1;
  if (routeMaxed(b, s)) return { ...BIZ_LEVELS[4], mult: m, next: null, byRoute: true };
  let cur = BIZ_LEVELS[0];
  for (const L of BIZ_LEVELS) if (m >= L.mult && (b.years || 0) >= L.years) cur = L;
  const next = BIZ_LEVELS.find((L) => L.lv === cur.lv + 1) || null;
  return { ...cur, mult: m, next };
};
// 開第二家公司的條件：第一家（自己開的）要升到滿級
export const canOpenSecondBiz = (s) => {
  const own = (s.bizs || []).filter((b) => !b.group);
  if (own.length === 0) return true;
  return own.some((b) => bizLevel(b, s).lv >= 5);
};

export const underIdolContract = (s) => !!(s.flags && s.flags.idol >= 1 && s.flags.idol <= 3 && s.flags.idolEnd && s.age < s.flags.idolEnd);
// 合約期內該做的工作：還沒出道是練習生，出道後是偶像藝人
// 一般公司的工作（練習生、藝人不算，公司類事件不會找上他們）
export const regularJob = (s) => !!(s.job && s.job.id !== 'idol' && s.job.id !== 'trainee');
export const idolJobId = (s) => (s.flags.idol === 1 ? 'trainee' : 'idol');
