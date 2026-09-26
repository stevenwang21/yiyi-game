// 同學報明牌。
//
// 以前的「跟同學交換投資情報」是擲一顆骰子：60% 眼光 +1、40% 莫名其妙賠一筆。
// 同學是誰、講了什麼、有沒有講對，通通沒有。
//
// 現在：某個同學會講一句具體的話 ——「明年加密幣一定噴」「股市要跌了，先出場」——
// 講的是遊戲裡真的存在的市場，一年後拿真的漲跌來對答案。對錯會記在那個同學身上，
// 你跟不跟都會記。所以玩久了你會知道：志明說的話可以聽，阿宏講的要反著做。
//
// 為什麼有的同學比較準：每個同學有一個隱藏的「眼光」（看職業和運氣），眼光好的
// 比較常「真的看到了」明年的行情；看不到的人就是隨便講。
//
// 怎麼做到「真的看到了」：講的當下先把明年的世界大事抽好（flags.nextWorld），
// rollWorld() 明年會直接用那一個。眼光夠的人講的就是那件事會帶動的方向；
// 但市場本來就有雜訊，看對了方向也可能被雜訊蓋掉，所以再準的人也不會 100%。
import { WAN, chance, formatMoney, weightedPick } from './utils.js';
import { WORLD_EVENTS } from './world.js';
import { diffOf } from './actions.js';
import { INVEST_MIN_AGE } from './data.js';

// 跟 engine.js 的 logTrade 一樣的格式（engine 不能被這裡 import，會循環）
const logTrade = (s, key, amt, kind) => { if (!s.trades) s.trades = []; s.trades.push({ age: s.age, key, amt: Math.round(amt), kind }); };

export const TIP_KEYS = ['etf', 'stock', 'gold', 'crypto'];
export const TIP_NAME = { etf: 'ETF', stock: '股市', gold: '黃金', crypto: '加密幣' };
export const TIP_STRIKES = 2;          // 錯這麼多次以上，選項會直接標出來
// 「沒行情」的判定：一年漲跌在這個範圍內。波動大的市場範圍要放寬，不然加密幣永遠不會「沒行情」
const FLAT_BAND = { etf: 0.08, stock: 0.1, gold: 0.09, crypto: 0.25 };

// 每個同學隱藏的眼光：專職投資最準、打零工最不準；luck 讓同一種職業的人也不一樣
export const mateInsight = (m) => {
  const base = {
    trader: 0.85, engineer: 0.65, sales: 0.55, founder: 0.55, realtor: 0.5, heir: 0.5,
    doctor: 0.5, civil: 0.4, teacher: 0.4, chef: 0.35, influencer: 0.3, drifter: 0.25,
  }[m.path] ?? 0.45;
  return Math.max(0.2, Math.min(0.92, base * (m.luck || 1)));
};

// 先把明年的世界大事抽好。跟 engine.js 的 rollWorld() 用一樣的規則（股災後不連兩年）。
export function prerollWorld(s, rng) {
  if (s.flags.nextWorld) return s.flags.nextWorld;
  const lastCrash = s.world && s.world.crash;
  const pool = lastCrash ? WORLD_EVENTS.filter((w) => !w.crash) : WORLD_EVENTS;
  const crashW = diffOf(s).crashW || 1;
  const w = weightedPick(rng, pool, (x) => x.w * (x.crash || x.layoff ? crashW : 1));
  s.flags.nextWorld = w.id;
  return w.id;
}

// 明年那件事會把哪個市場推往哪邊（沒有明顯方向就回傳 flat）
function signalOf(worldId) {
  const w = WORLD_EVENTS.find((x) => x.id === worldId);
  const mods = TIP_KEYS.map((k) => [k, ((w && w.m) || {})[k] || 0]).filter(([, v]) => Math.abs(v) >= 0.05);
  if (!mods.length) return { key: TIP_KEYS[0], dir: 'flat' };
  mods.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return { key: mods[0][0], dir: mods[0][1] > 0 ? 'up' : 'down' };
}

// 誰來講：出社會的同學裡隨機挑，專職投資的人特別愛講
export function pickTipster(s, rng) {
  const pool = (s.mates || []).filter((m) => m.stage === 'work' && m.name);
  if (!pool.length) return null;
  return weightedPick(rng, pool, (m) => (m.path === 'trader' ? 3 : m.path === 'engineer' || m.path === 'sales' ? 1.6 : 1));
}

export const tipRecord = (m) => (m && m.tips) || { n: 0, right: 0, wrong: 0 };

// 講一句。回傳 tip 物件，同時掛在 flags.tip 上等明年結算
export function makeTip(s, rng, m) {
  const wid = prerollWorld(s, rng);
  const sig = signalOf(wid);
  let key; let dir; let informed = false;
  if (chance(rng, mateInsight(m))) {
    informed = true;
    // 真的看到了：講那件事帶動的市場；沒大事的年就說「大盤沒行情」（ETF 最穩，講這句最不會被雜訊打臉）
    ({ key, dir } = sig);
    if (dir === 'flat') key = 'etf';
  } else if (sig.dir !== 'flat' && chance(rng, 0.5)) {
    // 沒看到、但講得很有自信：看到的是假訊號，剛好跟真的相反（「現在全世界都在亂，黃金一定漲」）
    key = sig.key;
    dir = sig.dir === 'up' ? 'down' : 'up';
  } else {
    key = TIP_KEYS[Math.floor(rng() * TIP_KEYS.length)];
    dir = ['up', 'down', 'flat'][Math.floor(rng() * 3)];
  }
  const tip = { mate: m.name, title: m.title || '', key, dir, age: s.age, followed: false, amt: 0, informed };
  s.flags.tip = tip;
  return tip;
}

// 同學講的那句話（依市場和方向換台詞）
export function tipQuote(tip) {
  const n = TIP_NAME[tip.key];
  const up = {
    etf: `「明年大盤一定衝，ETF 閉著眼睛買就對了。」`,
    stock: `「我看了好幾家公司的財報，明年股市會很猛。」`,
    gold: `「現在全世界都在亂，明年黃金一定漲。」`,
    crypto: `「下一波牛市就在明年，幣要現在上車。」`,
  };
  const down = {
    etf: `「大盤漲太多了，明年會修正，ETF 先減碼。」`,
    stock: `「我在裡面做，明年股市不好，能出的先出。」`,
    gold: `「黃金要跌了，資金會跑去股市。」`,
    crypto: `「幣圈明年會很慘，手上有的趕快賣。」`,
  };
  if (tip.dir === 'up') return up[tip.key];
  if (tip.dir === 'down') return down[tip.key];
  return `「明年${n}沒什麼行情，別亂動，錢留著。」`;
}

// 選項上要寫的紀錄
export function tipRecordText(m) {
  const r = tipRecord(m);
  if (!r.n) return '他第一次報，還不知道準不準';
  const warn = r.wrong >= TIP_STRIKES ? '⚠ ' : '';
  return `${warn}報過 ${r.n} 次，對 ${r.right} 次、錯 ${r.wrong} 次`;
}

// 跟著做：漲就買一筆、跌就把手上的減碼一半、沒行情就不動。
// 錢是真的進市場，明年賺賠都是真的，不是另外擲一顆骰子。
export function followTip(s, tip) {
  tip.followed = true;
  const n = TIP_NAME[tip.key];
  if (tip.dir === 'up') {
    if (s.age < INVEST_MIN_AGE) return `你還沒滿 ${INVEST_MIN_AGE} 歲，不能開戶，只能記在心裡。`;
    const amt = Math.max(0, Math.min(Math.round(s.money * 0.3), Math.round(300 * WAN * s.priceIndex), s.money));
    if (amt < 5 * WAN) return `你現金不夠，這次只能在旁邊看。`;
    s.money -= amt;
    s[tip.key] += amt;
    tip.amt = amt;
    logTrade(s, tip.key, amt, 'tip');
    return `你聽了「${tip.mate}」的話，拿 ${formatMoney(amt)} 買了${n}。明年見真章。`;
  }
  if (tip.dir === 'down') {
    const have = s[tip.key] || 0;
    if (have < 1 * WAN) return `你手上本來就沒有${n}，聽聽就好。`;
    const sell = Math.round(have * 0.5);   // 減碼一半，不是全出（聽錯人也不至於整個踏空）
    s.money += sell;
    s[tip.key] -= sell;
    tip.amt = -sell;
    logTrade(s, tip.key, -sell, 'tip');
    return `你聽了「${tip.mate}」的話，把手上的${n}賣掉一半（${formatMoney(sell)}）換成現金。`;
  }
  return `你聽了「${tip.mate}」的話，什麼都沒動。`;
}

// 明年結算：拿真的漲跌對答案，記在那個同學身上
export function settleTip(s, log) {
  const tip = s.flags.tip;
  if (!tip) return;
  s.flags.tip = null;
  const r = (s.world && s.world.returns && s.world.returns[tip.key]) || 0;
  // 說漲：真的漲就算對；說跌：真的跌就算對；說沒行情：漲跌在範圍內才算對
  const band = FLAT_BAND[tip.key] || 0.08;
  const right = tip.dir === 'up' ? r > 0 : tip.dir === 'down' ? r < 0 : Math.abs(r) < band;
  const m = (s.mates || []).find((x) => x.name === tip.mate);
  if (m) {
    m.tips = m.tips || { n: 0, right: 0, wrong: 0 };
    m.tips.n += 1;
    if (right) m.tips.right += 1; else m.tips.wrong += 1;
  }
  const n = TIP_NAME[tip.key];
  const pct = `${r >= 0 ? '+' : ''}${Math.round(r * 100)}%`;
  const said = { up: '會漲', down: '會跌', flat: '沒行情' }[tip.dir];
  const rec = m ? `（${tipRecordText(m).replace('⚠ ', '')}）` : '';
  let text = `去年「${tip.mate}」說${n}${said}，結果${n}${pct}，${right ? '被他說中了' : '他講錯了'}${rec}。`;
  if (tip.followed && tip.amt > 0) {
    const gain = Math.round(tip.amt * r);
    text += right ? `你跟著買的那 ${formatMoney(tip.amt)} 賺了 ${formatMoney(gain)}。` : `你跟著買的那 ${formatMoney(tip.amt)} 賠了 ${formatMoney(-gain)}。`;
  } else if (tip.followed && tip.amt < 0) {
    text += right ? `幸好你先賣了，躲過這一波。` : `你賣掉的那些${n}後來漲了，白賣了。`;
  }
  if (m && !right && m.tips.wrong === TIP_STRIKES) text += `他已經錯 ${TIP_STRIKES} 次了，下次要不要聽，你自己決定。`;
  log(s, text, right ? 'good' : 'bad');
}
