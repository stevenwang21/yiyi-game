// 寵物事件：讓狗狗貓咪像家人一樣有存在感。
//
// 以前養了寵物之後，每年只會看到一行「🐶 旺財 花了 3 萬」和幾個花錢的小事（生病、美容、咬沙發）。
// 牠只是一筆開銷。這裡的事件都是「牠做了什麼」：等門、闖禍、走失、當網紅、救了你一次、
// 陪你度過低潮、老了、走了以後的事。每一件都叫牠的名字，狗和貓做的事不一樣。
import { addMoney, addStats, chance, formatMoney, formatMoneyFine, rint, WAN } from './utils.js';
import { alivePets, petExpense, addPet, mainBiz } from './actions.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });
const P = (s, v) => Math.round(v * s.priceIndex);
const pet = (s) => alivePets(s)[0];
const dog = (s) => alivePets(s).find((p) => p.type === 'dog');
const cat = (s) => alivePets(s).find((p) => p.type === 'cat');
const petAge = (s, p) => s.age - p.since;
const paidBy = (bp) => (bp ? '（爸媽付的）' : '');
const hasDog = (s) => !!dog(s);
const hasCat = (s) => !!cat(s);
const hasPet = (s) => alivePets(s).length > 0;

export const PET_EVENTS = [
  // ── 狗 ──
  {
    id: 'pet_lost', minAge: 8, maxAge: 99, weight: 2, cond: hasDog, title: (s) => `「${dog(s).name}」不見了`,
    text: (s) => `散步的時候繩子鬆掉，「${dog(s).name}」追著一隻貓跑走了。你叫牠的名字叫到沙啞，天都黑了。`,
    choices: [
      {
        label: '印傳單、發動全社區找', sub: '花一點錢，找到的機會大',
        effect: (s, rng) => {
          const p = dog(s); const c = P(s, 0.5 * WAN); const bp = petExpense(s, p, '印傳單、懸賞', c);
          if (chance(rng, 0.85)) return good(`第三天，一個阿伯牽著「${p.name}」出現在你家門口。牠看到你的那一秒整隻撲上來。（-${formatMoneyFine(c)}）${paidBy(bp)}${addStats(s, { happy: 6, charm: 2 })}`);
          p.alive = false; p.diedAt = s.age; p.lost = true;
          return bad(`找了一個月，「${p.name}」再也沒有回來。你把牠的碗留在原來的位置。（-${formatMoneyFine(c)}）${paidBy(bp)}${addStats(s, { happy: -10 })}`);
        },
      },
      {
        label: '牠自己會回來', sub: '不花錢，看運氣',
        effect: (s, rng) => {
          const p = dog(s);
          if (chance(rng, 0.5)) return good(`隔天早上，「${p.name}」髒兮兮地趴在門口睡覺，好像什麼事都沒發生。${addStats(s, { happy: 4 })}`);
          p.alive = false; p.diedAt = s.age; p.lost = true;
          return bad(`「${p.name}」沒有回來。你每次經過那個公園都會多看一眼。${addStats(s, { happy: -10 })}`);
        },
      },
    ],
  },
  {
    id: 'pet_guard', minAge: 18, maxAge: 99, weight: 2, cond: (s) => hasDog(s) && (s.houses || []).length > 0, title: '半夜的狗叫',
    effect: (s, rng) => {
      const p = dog(s);
      const saved = P(s, rint(rng, 10, 40) * WAN);
      return good(`半夜「${p.name}」突然狂吠，你起來一看，有人正在撬你家的窗戶，被叫聲嚇跑了。警察說隔壁那戶被搬空了。牠幫你守住了大概 ${formatMoney(saved)} 的東西。${addStats(s, { happy: 5 })}`);
    },
  },
  {
    id: 'pet_contest', minAge: 10, maxAge: 99, weight: 2, cond: (s) => hasDog(s) && petAge(s, dog(s)) >= 1 && petAge(s, dog(s)) <= 9, title: '狗狗運動會',
    text: (s) => `社區辦狗狗敏捷賽，「${dog(s).name}」平常跑得很快，要不要報名？`,
    choices: [
      {
        label: '報名！', sub: '報名費 2,000，練一個月',
        effect: (s, rng) => {
          const p = dog(s); const c = P(s, 2000); const bp = petExpense(s, p, '敏捷賽報名、訓練', c);
          if (chance(rng, 0.35)) return good(`「${p.name}」拿了冠軍！獎金 ${formatMoney(P(s, 3 * WAN))}，還上了地方新聞。${addMoney(s, P(s, 3 * WAN))}${paidBy(bp)}${addStats(s, { happy: 8, charm: 3, hp: 2 })}`);
          return `「${p.name}」跑到一半跑去找別隻狗玩，沒名次，但你們笑了一整天。（-${formatMoneyFine(c)}）${paidBy(bp)}${addStats(s, { happy: 4, hp: 2 })}`;
        },
      },
      { label: '在旁邊看就好', effect: (s) => `你們在場邊吃冰，「${dog(s).name}」看別的狗跑看得很入神。${addStats(s, { happy: 2 })}` },
    ],
  },
  // ── 貓 ──
  {
    id: 'pet_gift', minAge: 6, maxAge: 99, weight: 3, cond: hasCat, title: (s) => `「${cat(s).name}」的禮物`,
    effect: (s, rng) => {
      const p = cat(s);
      const r = rng();
      if (r < 0.4) return `早上起床，枕頭旁邊放著一隻壁虎。「${p.name}」坐在旁邊一臉驕傲。${addStats(s, { happy: 2 })}`;
      if (r < 0.7) return bad(`「${p.name}」半夜把你桌上的水杯推下去，筆電泡水了。（-${formatMoneyFine(P(s, 2 * WAN))}）${addMoney(s, -P(s, 2 * WAN))}${addStats(s, { happy: -2 })}`);
      return good(`「${p.name}」今天主動跳到你腿上睡了一下午。養貓的人都知道這有多難得。${addStats(s, { happy: 5 })}`);
    },
  },
  {
    id: 'pet_famous', minAge: 16, maxAge: 99, weight: 2, cond: (s) => hasPet(s) && !pet(s).famous, title: (s) => `「${pet(s).name}」紅了`,
    text: (s) => { const p = pet(s); return `你隨手拍的一支「${p.name}」${p.type === 'cat' ? '被紙箱卡住' : '學你打哈欠'}的影片，一個晚上被轉了幾十萬次。廠商找上門，想找牠代言${p.type === 'cat' ? '貓砂' : '狗糧'}。`; },
    choices: [
      {
        label: '接！讓牠當網紅', sub: '每年多一筆收入，但要一直拍',
        effect: (s, rng) => {
          const p = pet(s); p.famous = true; p.income = P(s, rint(rng, 8, 30) * WAN);
          return good(`「${p.name}」成了寵物網紅，第一年代言費 ${formatMoney(p.income)}。牠本人對這一切毫無感覺。${addMoney(s, p.income)}${addStats(s, { happy: 4, charm: 4 })}`);
        },
      },
      { label: '牠只是我家的小孩', effect: (s) => `你把影片設成私人。「${pet(s).name}」繼續過牠的日子。${addStats(s, { happy: 2 })}` },
    ],
  },
  {
    id: 'pet_comfort', minAge: 10, maxAge: 99, weight: 6, cond: (s) => hasPet(s) && s.stats.happy < 40, title: (s) => `「${pet(s).name}」知道`,
    effect: (s) => {
      const p = pet(s);
      return good(p.type === 'dog'
        ? `你最近很不好。「${p.name}」沒辦法幫你做什麼，但你回家的時候牠永遠在門口，尾巴搖到整個屁股都在晃。有牠在，好像沒那麼糟。${addStats(s, { happy: 7 })}`
        : `你最近很不好。「${p.name}」平常不太理你，這幾天卻每天晚上都窩在你腳邊睡。貓是知道的。${addStats(s, { happy: 7 })}`);
    },
  },
  {
    id: 'pet_walk', minAge: 6, maxAge: 99, weight: 3, cond: (s) => hasDog(s) && s.stats.hp < 60, title: '每天遛狗',
    effect: (s) => good(`為了「${dog(s).name}」，你每天早晚各走 30 分鐘，不知不覺自己也變健康了。${addStats(s, { hp: 5, happy: 2 })}`),
  },
  {
    id: 'pet_old', minAge: 10, maxAge: 99, weight: 4, cond: (s) => hasPet(s) && petAge(s, pet(s)) >= 11, title: (s) => `「${pet(s).name}」老了`,
    text: (s) => { const p = pet(s); return `「${p.name}」${petAge(s, p)} 歲了，${p.type === 'dog' ? '走路變慢，上樓梯要你抱' : '跳不上以前最愛的櫃子了'}。醫生說關節退化，可以做治療。`; },
    choices: [
      {
        label: '做復健、換處方飼料', sub: '約 5～8 萬，能多陪你一兩年',
        effect: (s, rng) => { const p = pet(s); const c = P(s, rint(rng, 5, 8) * WAN); const bp = petExpense(s, p, '老年復健、處方飼料', c); p.life += rint(rng, 1, 2); return good(`「${p.name}」又能${p.type === 'dog' ? '慢慢散步' : '跳上窗台曬太陽'}了。（-${formatMoneyFine(c)}）${paidBy(bp)}${addStats(s, { happy: 4 })}`); },
      },
      { label: '順其自然，多陪牠', effect: (s) => `你把牠的窩搬到床邊，每天回家第一件事就是摸摸牠。${addStats(s, { happy: 2 })}` },
    ],
  },
  {
    id: 'pet_after', minAge: 10, maxAge: 99, weight: 3, cond: (s) => (s.pets || []).some((p) => !p.alive && p.diedAt === s.age - 1) && alivePets(s).length === 0 && !s.studying, title: '空掉的碗',
    text: (s) => { const p = s.pets.filter((x) => !x.alive).slice(-1)[0]; return `「${p.name}」走了一年了，牠的碗還放在原來的位置。朋友問你要不要再養一隻。`; },
    choices: [
      {
        label: '再養一隻狗', effect: (s, rng) => { const p = addPet(s, rng, 'dog'); petExpense(s, p, '結紮、晶片、第一次疫苗', P(s, 0.8 * WAN)); return good(`新來的「${p.name}」睡在舊的那個窩裡。不是取代，是家裡又有聲音了。${addStats(s, { happy: 6, hp: 1 })}`); },
      },
      {
        label: '再養一隻貓', effect: (s, rng) => { const p = addPet(s, rng, 'cat'); petExpense(s, p, '結紮、晶片、第一次疫苗', P(s, 0.6 * WAN)); return good(`新來的「${p.name}」第一天就佔了舊的那個窩。家裡又有聲音了。${addStats(s, { happy: 6 })}`); },
      },
      { label: '還沒準備好', effect: (s) => `你把碗收進櫃子裡，沒有丟。${addStats(s, { happy: -1 })}` },
    ],
  },
  {
    id: 'pet_office', minAge: 20, maxAge: 70, weight: 2, cond: (s) => hasDog(s) && !!mainBiz(s), title: '店狗',
    effect: (s) => { const p = dog(s); const b = mainBiz(s); return good(`「${p.name}」每天跟你去「${b.name}」上班，變成店裡的招牌。客人為了看牠特地來。${addStats(s, { happy: 3, charm: 3 })}`); },
  },
  {
    id: 'pet_kid', minAge: 25, maxAge: 60, weight: 3, cond: (s) => hasPet(s) && (s.kids || []).some((k) => s.age - k.born >= 1 && s.age - k.born <= 6), title: '小孩和牠',
    effect: (s) => { const p = pet(s); const k = s.kids.find((x) => s.age - x.born >= 1 && s.age - x.born <= 6); return good(`${k.name} 學會的第一個詞不是爸爸媽媽，是「${p.name}」。兩個小的每天一起在地上滾。${addStats(s, { happy: 5 })}`); },
  },
];
