// 退休生活的事件（65 歲強制退休之後才會出現）
//
// 設計：退休之後不用上班，但人生還沒結束（85 歲才結算）。這段時間的事件多半是「要不要賭一把」：
// 寫自傳、借錢給老朋友創業、理專推薦的商品、孩子想創業……
// 越老，押的金額和結果都越大（ageMult：65 歲 ×1、75 歲 ×2、85 歲 ×3）——
// 可能因此多賺好幾千萬，也可能把一輩子存的賠掉一大塊。一個億是看最後一年的資產，所以這些選擇很關鍵。
import { addMoney, addStats, chance, formatMoney, rint, WAN } from './utils.js';
import { netWorth, addPoints } from './actions.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });

// 越老倍數越大
export const ageMult = (s) => 1 + Math.max(0, s.age - 65) * 0.1;
// 押多少：資產的幾成，但至少有個底（隨物價）
const stake = (s, pct, floorWan) => Math.max(Math.round(floorWan * WAN * (s.priceIndex || 1)), Math.round(Math.max(0, netWorth(s)) * pct));
const cashOk = (s, amt) => s.money >= amt;
const adultKid = (s) => (s.kids || []).find((k) => s.age - k.born >= 25);
const R = (s) => !!s.retired;

export const RETIRE_EVENTS = [
  {
    id: 'rt_memoir', minAge: 65, maxAge: 120, weight: 6, once: true, cond: R,
    title: '寫自傳',
    text: (s) => `出版社問你要不要把這一生寫成一本書。${s.legends && s.legends.length ? '你當過傳說職業，很多人想看。' : ''}`,
    choices: [
      {
        label: '自費出版、大力宣傳',
        sub: (s) => `花 ${formatMoney(stake(s, 0.01, 30))}・可能變暢銷書`,
        cond: (s) => cashOk(s, stake(s, 0.01, 30)),
        effect: (s, rng) => {
          const c = stake(s, 0.01, 30);
          const m = ageMult(s);
          const fame = Math.min(0.75, 0.28 + (s.legends || []).length * 0.1 + (s.achievedAge ? 0.1 : 0) + s.stats.charm / 400);
          if (chance(rng, fame)) {
            const win = Math.round(Math.max(0, netWorth(s)) * (0.02 + rng() * 0.05) * m + c * 2);
            return good(`書一上市就衝上排行榜，版稅、演講、改編電影的邀約一起來。${addMoney(s, win - c)}${addStats(s, { happy: 12, charm: 6 })}`);
          }
          const loss = Math.round(c * (1 + 0.5 * m));
          return bad(`書印了兩萬本，賣掉不到兩千。倉庫租金和宣傳費一直燒。${addMoney(s, -loss)}${addStats(s, { happy: -6 })}`);
        },
      },
      {
        label: '交給出版社就好',
        sub: '不花錢・版稅不多',
        effect: (s, rng) => (chance(rng, 0.5)
          ? good(`小小地賣了幾刷，孫子的同學拿著書來找你簽名。${addMoney(s, Math.round(20 * WAN * (s.priceIndex || 1) * ageMult(s)))}${addStats(s, { happy: 6 })}`)
          : `書出了，安安靜靜地放在書店角落。你送了一本給每個老朋友。${addStats(s, { happy: 3 })}`),
      },
      { label: '算了，留給自己回憶', effect: (s) => `你把想寫的都寫在筆記本裡，沒有給別人看。${addStats(s, { happy: 2 })}` },
    ],
  },
  {
    id: 'rt_angel', minAge: 65, maxAge: 120, weight: 5, cond: R,
    title: '老朋友找你投資',
    text: '以前的同事退休後開了一家新創，想找你當天使投資人。「這次真的不一樣。」',
    choices: [
      {
        label: '投一大筆',
        sub: (s) => `投 ${formatMoney(stake(s, 0.06, 50))}・成功回收好幾倍`,
        cond: (s) => cashOk(s, stake(s, 0.06, 50)),
        effect: (s, rng) => {
          const amt = stake(s, 0.06, 50);
          const m = ageMult(s);
          if (chance(rng, 0.27)) {
            const back = Math.round(amt * (1.8 + m * 1.4));
            return good(`公司被大廠併購，你那份股權一次變現。${addMoney(s, back - amt)}${addStats(s, { happy: 10 })}`);
          }
          return bad(`撐了兩年還是收掉了，那筆錢一毛都沒回來。${addMoney(s, -amt)}${addStats(s, { happy: -6 })}`);
        },
      },
      {
        label: '意思意思投一點',
        sub: (s) => `投 ${formatMoney(stake(s, 0.01, 10))}`,
        cond: (s) => cashOk(s, stake(s, 0.01, 10)),
        effect: (s, rng) => {
          const amt = stake(s, 0.01, 10);
          return chance(rng, 0.27)
            ? good(`沒想到真的成了。${addMoney(s, Math.round(amt * (1.8 + ageMult(s) * 1.4)) - amt)}${addStats(s, { happy: 5 })}`)
            : `就當作支持老朋友。${addMoney(s, -amt)}`;
        },
      },
      { label: '婉拒', effect: (s) => `你請他吃了一頓飯，祝他順利。${addStats(s, { charm: 1 })}` },
    ],
  },
  {
    id: 'rt_fund', minAge: 65, maxAge: 120, weight: 5, cond: R,
    title: '理專推薦「保本高收益」',
    text: '銀行的理專拿著一份商品說明，說這檔「保本」、年報酬 12%，很多退休族都買了。',
    choices: [
      {
        label: '買一大筆',
        sub: (s) => `投 ${formatMoney(stake(s, 0.15, 100))}`,
        cond: (s) => cashOk(s, stake(s, 0.15, 100)),
        effect: (s, rng) => {
          const amt = stake(s, 0.15, 100);
          const m = ageMult(s);
          if (chance(rng, 0.5)) return good(`那兩年市場很好，配息一直進來。${addMoney(s, Math.round(amt * 0.15 * m))}${addStats(s, { happy: 4 })}`);
          return bad(`「保本」只保在某些條件下，市場一跌就觸發了條款，本金蒸發一大塊。${addMoney(s, -Math.round(amt * 0.22 * m))}${addStats(s, { happy: -8, hp: -2 })}`);
        },
      },
      { label: '先把說明書看完', sub: '智力夠就看得出陷阱', effect: (s) => (s.stats.int >= 60 ? good(`你在第 37 頁找到「本商品不保本」的小字，把說明書還給理專。${addStats(s, { int: 1, happy: 2 })}`) : `密密麻麻看不懂，最後決定不買了。${addStats(s, { happy: 1 })}`) },
    ],
  },
  {
    id: 'rt_scam', minAge: 65, maxAge: 120, weight: 4, cond: R,
    title: '「檢察官」來電',
    effect: (s, rng) => {
      const fooled = chance(rng, s.stats.int >= 70 ? 0.08 : s.stats.int >= 55 ? 0.25 : 0.45);
      if (!fooled) return good(`電話那頭說你的帳戶涉及洗錢，要你把錢轉到「監管帳戶」。你直接掛掉，打了 165。${addStats(s, { int: 1 })}`);
      const loss = Math.round(Math.min(Math.max(0, s.money), stake(s, 0.03, 20) * ageMult(s)));
      return bad(`「檢察官」講得很急，你照著他的話跑了三趟銀行。等孩子發現的時候，錢已經領不回來了。${addMoney(s, -loss)}${addStats(s, { happy: -10, hp: -3 })}`);
    },
  },
  {
    id: 'rt_tv', minAge: 65, maxAge: 120, weight: 3, once: true, cond: R,
    title: '上節目講人生故事',
    text: '一個談話節目在找「很有故事的長輩」，製作單位問你要不要上。',
    choices: [
      {
        label: '上！',
        sub: '人緣越高越可能爆紅',
        effect: (s, rng) => {
          if (chance(rng, Math.min(0.7, 0.15 + s.stats.charm / 200))) {
            const win = Math.round(Math.max(30 * WAN * (s.priceIndex || 1), Math.max(0, netWorth(s)) * 0.01) * ageMult(s));
            return good(`你講到一半說了一句很經典的話，被剪成短片轉了幾百萬次。業配、代言排到明年。${addMoney(s, win)}${addStats(s, { happy: 10, charm: 8 })}`);
          }
          return `節目播出了，親戚朋友都說你上鏡。${addMoney(s, Math.round(2 * WAN * (s.priceIndex || 1)))}${addStats(s, { happy: 5, charm: 2 })}`;
        },
      },
      { label: '不想拋頭露面', effect: (s) => `你在家看了那集節目，覺得來賓講得沒你好。${addStats(s, { happy: 1 })}` },
    ],
  },
  {
    id: 'rt_kidbiz', minAge: 65, maxAge: 120, weight: 4, cond: (s) => R(s) && !!adultKid(s),
    title: (s) => `${adultKid(s).name} 想創業`,
    text: (s) => `${adultKid(s).name} 帶著企劃書回家，想跟你借一筆錢開公司。`,
    choices: [
      {
        label: '全力支持',
        sub: (s) => `借 ${formatMoney(stake(s, 0.08, 80))}`,
        cond: (s) => cashOk(s, stake(s, 0.08, 80)),
        effect: (s, rng) => {
          const amt = stake(s, 0.08, 80);
          const k = adultKid(s);
          if (chance(rng, 0.38)) {
            const back = Math.round(amt * (1 + ageMult(s) * 0.9));
            return good(`${k.name} 的公司做起來了，第三年就把錢連本帶利還給你，還說這是「分紅」。${addMoney(s, back - amt)}${addStats(s, { happy: 14 })}`);
          }
          return bad(`公司撐不下去收掉了。${k.name} 一直跟你道歉，你說錢再賺就有。${addMoney(s, -amt)}${addStats(s, { happy: -4 })}`);
        },
      },
      {
        label: '借一點，剩下自己想辦法',
        sub: (s) => `借 ${formatMoney(stake(s, 0.02, 20))}`,
        cond: (s) => cashOk(s, stake(s, 0.02, 20)),
        effect: (s, rng) => {
          const amt = stake(s, 0.02, 20);
          return chance(rng, 0.38)
            ? good(`${adultKid(s).name} 靠自己把公司撐起來了，還你的時候多包了一個紅包。${addMoney(s, Math.round(amt * 0.5))}${addStats(s, { happy: 8 })}`)
            : `那筆錢沒回來，但 ${adultKid(s).name} 學到很多。${addMoney(s, -amt)}${addStats(s, { happy: -1 })}`;
        },
      },
      { label: '勸他再想想', effect: (s) => `你們聊到半夜。他最後決定先去別人公司學幾年。${addStats(s, { happy: -1 })}` },
    ],
  },
  {
    id: 'rt_foundation', minAge: 68, maxAge: 120, weight: 2, once: true, cond: (s) => R(s) && netWorth(s) >= 3000 * WAN,
    title: '成立基金會',
    text: '你想把一部分的錢拿出來做點事：蓋圖書館、給偏鄉孩子獎學金。',
    choices: [
      {
        label: '捐一成資產成立基金會',
        sub: (s) => `捐 ${formatMoney(stake(s, 0.1, 100))}・人緣大增、傳承點數`,
        cond: (s) => cashOk(s, stake(s, 0.1, 100)),
        effect: (s) => {
          const amt = stake(s, 0.1, 100);
          addPoints(s, 5, '成立基金會');
          return good(`第一間圖書館開幕那天，一群小朋友排隊跟你說謝謝。${addMoney(s, -amt)}${addStats(s, { happy: 15, charm: 10 })}`);
        },
      },
      { label: '小額捐款就好', effect: (s) => `你每個月固定捐一點。${addMoney(s, -Math.round(5 * WAN * (s.priceIndex || 1)))}${addStats(s, { happy: 4, charm: 2 })}` },
    ],
  },
  {
    id: 'rt_cruise', minAge: 65, maxAge: 95, weight: 3, cond: R,
    title: '環遊世界郵輪',
    text: '一百天、二十個國家的郵輪行程，老朋友約你一起去。',
    choices: [
      {
        label: '去！',
        sub: (s) => `花 ${formatMoney(Math.round(60 * WAN * (s.priceIndex || 1)))}・快樂大增`,
        cond: (s) => cashOk(s, Math.round(60 * WAN * (s.priceIndex || 1))),
        effect: (s, rng) => {
          const c = Math.round(60 * WAN * (s.priceIndex || 1));
          if (s.age >= 78 && chance(rng, 0.25)) return bad(`船開到第四十天你生了一場病，在異國的醫院躺了兩個禮拜。${addMoney(s, -c)}${addStats(s, { happy: 4, hp: -8 })}`);
          return good(`你在冰島看到了極光，在地中海喝到了這輩子最好喝的咖啡。${addMoney(s, -c)}${addStats(s, { happy: 14, hp: 2 })}`);
        },
      },
      { label: '在家附近走走就好', effect: (s) => `你每天早上去公園打太極。${addStats(s, { happy: 3, hp: 2 })}` },
    ],
  },
  {
    id: 'rt_bizheir', minAge: 67, maxAge: 120, weight: 4, once: true, cond: (s) => R(s) && (s.bizs || []).length > 0,
    title: '公司要交給誰？',
    text: (s) => `「${s.bizs[0].name}」你管了這麼多年，年紀大了，該想想怎麼安排。`,
    choices: [
      {
        label: '整間賣掉，拿現金',
        sub: '價格看當年的買家',
        effect: (s, rng) => {
          const b = s.bizs[0];
          const price = Math.round(b.value * (0.7 + rng() * 0.3 + (ageMult(s) - 1) * 0.12));
          s.bizs = s.bizs.slice(1);
          return (price >= b.value ? good : (t) => t)(`你把「${b.name}」賣給了一家集團，簽約那天全公司幫你辦了歡送會。拿到 ${formatMoney(price)}（公司估值 ${formatMoney(b.value)}）。${addMoney(s, price)}${addStats(s, { happy: 6 })}`);
        },
      },
      {
        label: '繼續自己管',
        sub: '公司還在長，但你體力會吃不消',
        effect: (s) => `你還是每天進公司，只是午覺越睡越久。${addStats(s, { hp: -3, happy: 2 })}`,
      },
    ],
  },
  {
    id: 'rt_grandkid', minAge: 70, maxAge: 120, weight: 3, cond: (s) => R(s) && (s.kids || []).some((k) => s.age - k.born >= 28),
    title: '孫子來了',
    effect: (s) => good(`${(s.kids.find((k) => s.age - k.born >= 28) || {}).name} 帶著孫子回來過週末，小朋友在客廳跑來跑去，你整天都在笑。${addStats(s, { happy: 8, hp: 1 })}`),
  },
];
