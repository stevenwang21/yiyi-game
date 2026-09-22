// 同學會、收購機會
import { addStats, chance, formatMoney, rint, WAN } from './utils.js';
import { addSkill, addPoints, netWorth, diffOf } from './actions.js';
import { reunionText, ranking } from './mates.js';
import { BUSINESSES } from './data.js';
import { MAX_GROUP, synergy } from './mna.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });

const myPlace = (s) => {
  const list = ranking(s, netWorth(s));
  const me = list.find((x) => x.me);
  return { rank: me.rank, total: list.length, top: list[0] };
};

// 上次同學會立下的目標：這次結算。贏了加分，輸了掉快樂和健康，連續輸會加倍掉
function settleRival(s) {
  const name = s.flags.rivalName;
  if (!name) return '';
  s.flags.rivalName = null;
  const list = ranking(s, netWorth(s));
  const me = list.find((x) => x.me);
  const rival = list.find((x) => x.name === name);
  if (!rival || me.nw > rival.nw) {
    s.flags.rivalLoss = 0;
    addPoints(s, 2, '超過同學');
    return `上次你說要超過「${name}」——這次你做到了！全桌都在起鬨。${addStats(s, { happy: 8, charm: 4 })}\n\n`;
  }
  const streak = (s.flags.rivalLoss || 0) + 1;
  s.flags.rivalLoss = streak;
  const mult = Math.min(4, 2 ** (streak - 1)); // 1、2、4、4 倍
  const d = addStats(s, { happy: -6 * mult, hp: -3 * mult });
  return `上次你說要超過「${name}」，五年過去，他還是在你前面（${formatMoney(rival.nw)} 對 ${formatMoney(me.nw)}）。${streak > 1 ? `這已經是連續第 ${streak} 次輸給他了，你整晚沒吃幾口。` : '你笑著敬酒，心裡很悶。'}${d}\n\n`;
}

export const REUNION_EVENT = {
  id: 'reunion', minAge: 20, maxAge: 99, weight: 0, // 由引擎在固定年紀觸發
  title: '同學會',
  before: (s) => { s.flags.rivalResult = settleRival(s); },
  text: (s) => `${s.flags.rivalResult || ''}${reunionText(s, netWorth(s))}`,
  choices: [
    {
      label: '大方請客',
      sub: '花一筆錢，人緣大增，可能談到生意',
      effect: (s, rng) => {
        const c = Math.round(Math.min(Math.max(3 * WAN * s.priceIndex, netWorth(s) * 0.002), 80 * WAN * s.priceIndex));
        s.money -= c;
        addPoints(s, 1, '同學會請客');
        if (s.bizs.length && chance(rng, 0.45)) {
          const b = s.bizs[Math.floor(rng() * s.bizs.length)];
          const gain = Math.round(b.value * (0.05 + rng() * 0.1) * diffOf(s).grow);
          b.value += gain;
          return good(`你買單了這一桌（${formatMoney(c)}）。席間有同學介紹了一筆訂單給「${b.name}」，價值增加 ${formatMoney(gain)}！${addStats(s, { charm: 6, happy: 4 })}`);
        }
        return good(`你買單了這一桌（${formatMoney(c)}），大家都說你最夠意思。${addStats(s, { charm: 6, happy: 4 })}`);
      },
    },
    {
      label: '低調吃飯聊天',
      sub: '不花什麼錢',
      effect: (s) => `你安靜地吃完這一餐，聽大家講這些年的故事。${addStats(s, { happy: 3, charm: 1 })}`,
    },
    {
      label: '跟同學交換投資情報',
      sub: '可能學到東西，也可能被帶進坑',
      effect: (s, rng) => {
        if (chance(rng, 0.6)) {
          addSkill(s, 1);
          return good(`一位在金融業的同學跟你聊了很多，投資眼光提升！${addStats(s, { int: 2 })}`);
        }
        const c = Math.round(Math.min(Math.max(5 * WAN * s.priceIndex, netWorth(s) * 0.01), 300 * WAN * s.priceIndex));
        s.money -= c;
        return bad(`你聽了同學的「內線」，結果賠了 ${formatMoney(c)}。${addStats(s, { happy: -5, int: 1 })}`);
      },
    },
    {
      label: '跟第一名的同學拚一下',
      sub: (s) => `下次同學會超過他就加分；輸了掉快樂和健康${s.flags.rivalLoss ? '（已經連輸，這次輸會掉更多）' : '，連續輸會加倍掉'}`,
      cond: (s) => myPlace(s).rank > 1,
      effect: (s) => {
        const top = myPlace(s).top;
        s.flags.rivalName = top.name;
        return `你敬了「${top.name}」一杯，心裡默默立下目標：下次同學會一定要超過他。${addStats(s, { happy: -2, int: 2, charm: 1 })}`;
      },
    },
  ],
};

const groupBizs = (s) => s.bizs.filter((b) => b.group);
const pickBiz = (s, rng) => { const g = groupBizs(s); return g[Math.floor(rng() * g.length)]; };

// 隨機出現的收購機會（達成一億後才會遇到）
export const MNA_EVENTS = [
  {
    id: 'mna_offer', minAge: 25, maxAge: 99, weight: 4,
    cond: (s) => !!s.achievedAge && s.bizs.length < MAX_GROUP && s.money > 3000 * 10000,
    title: '有人想把公司賣給你',
    before: (s, rng) => {
      const keys = Object.keys(BUSINESSES);
      const type = keys[Math.floor(rng() * keys.length)];
      const value = Math.round((s.money * (0.25 + rng() * 0.4)) / WAN) * WAN;
      s.flags.mnaDeal = {
        type,
        typeName: BUSINESSES[type].name,
        name: `${['大', '宏', '永', '金', '順'][rint(rng, 0, 4)]}${['盛', '發', '達', '興', '利'][rint(rng, 0, 4)]}${BUSINESSES[type].name}`,
        value,
        price: Math.round((value * (0.65 + rng() * 0.2)) / WAN) * WAN,
        bad: chance(rng, 0.3),
      };
    },
    text: (s) => {
      const d = s.flags.mnaDeal;
      return `一位同業想把「${d.name}」（${d.typeName}）賣給你。公司價值大約 ${formatMoney(d.value)}，他開價 ${formatMoney(d.price)}，比行情便宜，但說要馬上決定。`;
    },
    choices: [
      {
        label: '買下來',
        sub: (s) => `付 ${formatMoney(s.flags.mnaDeal.price)} 現金`,
        cond: (s) => s.money >= (s.flags.mnaDeal ? s.flags.mnaDeal.price : Infinity),
        effect: (s) => {
          const d = s.flags.mnaDeal;
          s.money -= d.price;
          const value = d.bad ? Math.round(d.value * 0.55) : d.value;
          s.bizs.push({
            uid: `b${s.uid++}`, type: d.type, name: d.name, value,
            capital: d.price, route: null, bonus: d.bad ? -0.02 : 0.01, years: 0, lastR: 0, group: true,
          });
          addPoints(s, 2, `收購 ${d.name}`);
          return d.bad
            ? bad(`買下「${d.name}」之後才發現帳上有一堆問題，實際價值只有 ${formatMoney(value)}。${addStats(s, { happy: -6 })}`)
            : good(`你買下了「${d.name}」，價值 ${formatMoney(value)}，馬上併進集團。${addStats(s, { happy: 6 })}`);
        },
      },
      {
        label: '先請人查帳再說',
        sub: '花一點錢，避免買到地雷',
        effect: (s) => {
          const c = Math.round(20 * WAN * s.priceIndex);
          s.money -= c;
          const d = s.flags.mnaDeal;
          return d.bad
            ? good(`會計師查出「${d.name}」帳目有大問題，你趕快收手。查帳花了 ${formatMoney(c)}，但省下一場災難。${addStats(s, { int: 2 })}`)
            : `查帳結果沒問題，但對方等不及，把公司賣給別人了。查帳費 ${formatMoney(c)}。${addStats(s, { happy: -2 })}`;
        },
      },
      { label: '沒興趣', effect: (s) => '你婉拒了對方。' },
    ],
  },

  // ───────── 收購之後會遇到的事 ─────────
  {
    id: 'mna_integrate', minAge: 25, maxAge: 99, weight: 3,
    cond: (s) => s.bizs.some((b) => b.group && b.years <= 3),
    title: '整頓新買的公司',
    text: (s) => {
      const b = s.bizs.filter((x) => x.group && x.years <= 3)[0];
      return `「${b.name}」併進來之後，制度和你的做法差很多，員工也還在觀望。要怎麼處理？`;
    },
    choices: [
      {
        label: '投入資金整頓',
        sub: '花公司價值的一成，年成長長期提升',
        effect: (s) => {
          const b = s.bizs.filter((x) => x.group && x.years <= 3)[0];
          const c = Math.round(b.value * 0.1);
          if (s.money < c) return bad(`你想整頓，但現金不夠（需要 ${formatMoney(c)}），只好先放著。`);
          s.money -= c;
          b.bonus += 0.012;
          return good(`你花了 ${formatMoney(c)} 換掉舊系統、重新培訓，「${b.name}」每年多成長 1.2%。${addStats(s, { hp: -3, happy: 2 })}`);
        },
      },
      {
        label: '留用原本的團隊',
        sub: '不花錢，靠原班人馬',
        effect: (s, rng) => {
          const b = s.bizs.filter((x) => x.group && x.years <= 3)[0];
          if (chance(rng, 0.55)) { b.bonus += 0.005; return good(`原本的老臣很挺你，公司很快穩定下來。「${b.name}」每年多成長 0.5%。${addStats(s, { charm: 3 })}`); }
          return `原團隊各做各的，你也懶得管，公司就這樣運作著。${addStats(s, { happy: -1 })}`;
        },
      },
      {
        label: '大裁員、砍成本',
        sub: '馬上省錢，但士氣差',
        effect: (s, rng) => {
          const b = s.bizs.filter((x) => x.group && x.years <= 3)[0];
          const save = Math.round(b.value * 0.06);
          s.money += save;
          if (chance(rng, 0.45)) { b.bonus -= 0.015; return bad(`你砍掉三成人力，省下 ${formatMoney(save)}，但骨幹也跑光了，「${b.name}」每年少成長 1.5%。${addStats(s, { charm: -5, happy: -4 })}`); }
          return `你砍掉冗員，省下 ${formatMoney(save)}，公司運作反而變俐落。${addStats(s, { charm: -2 })}`;
        },
      },
    ],
  },
  {
    id: 'mna_sell_high', minAge: 30, maxAge: 99, weight: 2,
    cond: (s) => s.bizs.some((b) => b.group && b.value > b.capital * 1.8),
    title: '有人想買你的公司',
    text: (s) => {
      const b = s.bizs.filter((x) => x.group && x.value > x.capital * 1.8)[0];
      return `有集團看上你手上的「${b.name}」（現在價值 ${formatMoney(b.value)}），開價比市價高，想整間買走。`;
    },
    choices: [
      {
        label: '賣掉，獲利了結',
        sub: '拿回現金，比市價多一成五',
        effect: (s) => {
          const b = s.bizs.filter((x) => x.group && x.value > x.capital * 1.8)[0];
          const got = Math.round(b.value * 1.15);
          s.money += got;
          s.bizs = s.bizs.filter((x) => x.uid !== b.uid);
          return good(`你把「${b.name}」賣了 ${formatMoney(got)}（當初買 ${formatMoney(b.capital)}）。${addStats(s, { happy: 6 })}`);
        },
      },
      { label: '不賣，繼續經營', sub: '看好它會更值錢', effect: (s) => '你婉拒了對方，決定自己繼續經營。' },
    ],
  },
  {
    id: 'mna_synergy', minAge: 28, maxAge: 99, weight: 2,
    cond: (s) => {
      const types = s.bizs.map((b) => b.type);
      return types.some((x, i) => types.indexOf(x) !== i);
    },
    title: '同產業整併',
    text: '集團裡有兩家同產業的公司，幕僚建議把後勤、採購、通路合併，成本可以壓下來。',
    choices: [
      {
        label: '合併後勤',
        sub: '同產業的公司一起提升',
        effect: (s) => {
          const types = s.bizs.map((b) => b.type);
          const dup = types.find((x, i) => types.indexOf(x) !== i);
          const list = s.bizs.filter((b) => b.type === dup);
          list.forEach((b) => { b.bonus += 0.008; });
          return good(`你把 ${list.length} 家${list[0] ? '同產業' : ''}公司的後勤整併，每一家每年多成長 0.8%。${addStats(s, { int: 2, hp: -2 })}`);
        },
      },
      { label: '各自獨立經營', sub: '維持現狀', effect: () => '你決定讓各公司保持彈性，各做各的。' },
    ],
  },
  {
    id: 'mna_scandal', minAge: 28, maxAge: 99, weight: 2,
    cond: (s) => s.bizs.some((b) => b.group),
    title: '子公司出包',
    text: (s) => `集團旗下的子公司被爆出問題，記者打電話來問，媒體已經在跑了。`,
    choices: [
      {
        label: '花錢處理，快速止血',
        sub: '賠一筆錢把事情壓下來',
        effect: (s, rng) => {
          const b = pickBiz(s, rng);
          const c = Math.round(b.value * 0.08);
          s.money -= c;
          return `你花了 ${formatMoney(c)} 處理賠償和公關，事情兩週後就沒人提了。${addStats(s, { happy: -3 })}`;
        },
      },
      {
        label: '硬碰硬，告到底',
        sub: '可能全身而退，也可能鬧更大',
        effect: (s, rng) => {
          const b = pickBiz(s, rng);
          if (chance(rng, 0.5)) return good(`你開記者會反擊，證據站在你這邊，輿論反而站你這邊。${addStats(s, { charm: 4 })}`);
          const loss = Math.round(b.value * 0.15);
          b.value -= loss;
          return bad(`事情越鬧越大，「${b.name}」的價值掉了 ${formatMoney(loss)}。${addStats(s, { happy: -6, charm: -4 })}`);
        },
      },
    ],
  },
];
