// 第二批隨機事件：讓每一年發生的事更多
// 沒有 choices 的是「小事件」，每年可能發生 1～2 件；有 choices 的會跳出來讓玩家選
import { addMoney, addStats, chance, formatMoney, formatMoneyFine, rint, WAN } from './utils.js';
import { addPet, addSkill, alivePets, mainBiz, petExpense, diffOf, scaleBiz, underIdolContract } from './actions.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });
// 金額跟著物價調整
const P = (s, v) => Math.round(v * s.priceIndex);
const firstPet = (s) => alivePets(s)[0];
const paidBy = (byParents) => (byParents ? '（爸媽付的）' : '');
const kidsOf = (s, min, max) => s.kids.filter((k) => s.age - k.born >= min && s.age - k.born <= max);

export const EXTRA_EVENTS = [
  // ───────── 兒童 6–11（小事件）─────────
  { id: 'school_trip', minAge: 6, maxAge: 11, weight: 3, title: '校外教學', effect: (s) => good(`去動物園校外教學，玩得超開心。${addStats(s, { happy: 4 })}`) },
  { id: 'broken_arm', minAge: 6, maxAge: 14, weight: 1, title: '骨折', effect: (s) => bad(`下課玩鬼抓人跌倒，手骨折打了石膏。${addStats(s, { hp: -5, happy: -3 })}`) },
  { id: 'birthday_party', minAge: 6, maxAge: 12, weight: 2, title: '生日派對', effect: (s) => good(`全班同學都來參加你的生日派對。${addStats(s, { charm: 3, happy: 4 })}`) },
  {
    id: 'grandma_money', minAge: 3, maxAge: 17, weight: 2, title: '阿嬤的紅包',
    effect: (s) => {
      const base = { poor: 0.2, normal: 0.6, rich: 2, tycoon: 10 }[s.family] || 0.5;
      return good(`阿嬤偷偷塞了一個紅包給你。${addMoney(s, P(s, base * WAN))}${addStats(s, { happy: 2 })}`);
    },
  },
  { id: 'spelling', minAge: 7, maxAge: 11, weight: 2, cond: (s) => s.stats.int >= 50, title: '作文比賽', effect: (s) => good(`你的作文得到全校第一名。${addStats(s, { int: 3, charm: 1 })}`) },
  { id: 'nightmare', minAge: 4, maxAge: 10, weight: 1, title: '怕黑', effect: (s) => `看完鬼片後好幾天不敢一個人睡。${addStats(s, { happy: -2 })}` },

  // ───────── 兒童 6–11（選擇）─────────
  // 「要學才藝嗎？」已經搬到 talents.js（30 種才藝，每次隨機端出 4 種）
  {
    id: 'science_fair', minAge: 9, maxAge: 14, weight: 2, title: '科展',
    text: '老師要大家做科展作品，下個月就要交。',
    choices: [
      {
        odds: (s) => Math.min(1, 0.3 + s.stats.int / 200), label: '自己認真做',
        effect: (s, rng) => (chance(rng, 0.3 + s.stats.int / 200)
          ? good(`你的作品拿到縣市科展特優！${addStats(s, { int: 5, charm: 3 })}`)
          : `作品雖然沒得獎，但你學到很多。${addStats(s, { int: 3 })}`),
      },
      {
        label: '抄網路上的',
        effect: (s, rng) => (chance(rng, 0.5)
          ? bad(`被老師發現了，被叫去辦公室罵。${addStats(s, { charm: -4, happy: -4 })}`)
          : `順利過關，但心裡怪怪的。${addStats(s, { int: -1 })}`),
      },
    ],
  },

  // ───────── 青少年 12–17 ─────────
  {
    id: 'new_phone', minAge: 12, maxAge: 18, weight: 2, title: '想要新手機',
    text: '同學都換了最新款的手機，你也好想要。',
    choices: [
      { label: '用存款買', sub: '約 3 萬', cond: (s) => s.money >= P(s, 3 * WAN), effect: (s) => good(`拿到新手機超開心。${addMoney(s, -P(s, 3 * WAN))}${addStats(s, { happy: 6, charm: 1 })}`) },
      { label: '去打工存錢買', effect: (s) => `你利用暑假打工，賺到手機錢。${addStats(s, { hp: -2, happy: 2 })}` },
      { label: '舊的還能用', effect: (s) => good(`你很懂得珍惜東西，存款沒有少。${addStats(s, { int: 1 })}`) },
    ],
  },
  {
    id: 'club', minAge: 12, maxAge: 20, weight: 2, once: true, title: '選社團',
    text: '學校社團博覽會，你想參加哪一個？',
    choices: [
      { label: '熱舞社', sub: '健康、人緣↑', effect: (s) => good(`你在成果發表會上跳得超好看。${addStats(s, { hp: 4, charm: 4 })}`) },
      { label: '程式設計社', sub: '智力↑', effect: (s) => good(`你做了一個校園二手交易網站。${addStats(s, { int: 5 })}`) },
      { label: '投資理財社', sub: '投資眼光↑', effect: (s) => { addSkill(s, 1); return good(`你學會看財報，投資眼光提升！${addStats(s, { int: 2 })}`); } },
      { label: '熱音社', sub: '快樂↑', effect: (s) => good(`你組了樂團，在校慶上表演。${addStats(s, { happy: 6, charm: 2 })}`) },
    ],
  },
  {
    id: 'cheat', minAge: 12, maxAge: 22, weight: 2, title: '作弊的誘惑',
    text: '期末考前，同學說他拿到了考卷答案。',
    choices: [
      { label: '不看，自己準備', effect: (s) => good(`雖然很辛苦，但成績是自己的。${addStats(s, { int: 3 })}`) },
      {
        label: '偷看一下',
        effect: (s, rng) => (chance(rng, 0.4)
          ? bad(`整件事被發現，所有人都被記大過。${addStats(s, { charm: -6, happy: -8 })}`)
          : `考得不錯，但你知道那不是真正的實力。${addStats(s, { int: -2 })}`),
      },
    ],
  },
  {
    id: 'stock_contest', minAge: 13, maxAge: 22, weight: 2, once: true, title: '模擬投資比賽',
    text: '學校舉辦模擬股票投資比賽，要不要參加？',
    choices: [
      {
        label: '參加！',
        effect: (s, rng) => {
          addSkill(s, 1);
          if (chance(rng, 0.3)) { addSkill(s, 1); return good(`你拿到全校冠軍，獎金 5,000 元！投資眼光大幅提升。${addMoney(s, 5000)}${addStats(s, { int: 2 })}`); }
          return good(`雖然沒得名，但你學會了分散風險。投資眼光提升。${addStats(s, { int: 1 })}`);
        },
      },
      { label: '沒興趣', effect: () => '你覺得股票離自己太遠了。' },
    ],
  },
  {
    id: 'concert', minAge: 13, maxAge: 30, weight: 2, title: '偶像演唱會',
    text: '你最喜歡的歌手要來開演唱會，門票 5,000 元。',
    choices: [
      { label: '搶票去看！', effect: (s) => good(`現場氣氛超嗨，喊到沒聲音。${addMoney(s, -P(s, 5000))}${addStats(s, { happy: 7 })}`) },
      { label: '看網路轉播就好', effect: (s) => `省下一筆錢。${addStats(s, { happy: -1 })}` },
    ],
  },
  { id: 'scholarship', minAge: 12, maxAge: 23, weight: 3, cond: (s) => s.studying && s.stats.int >= 70, title: '獎學金', effect: (s, rng) => good(`成績優異，拿到獎學金！${addMoney(s, P(s, rint(rng, 1, 5) * WAN))}${addStats(s, { happy: 3 })}`) },
  { id: 'teen_acne', minAge: 13, maxAge: 17, weight: 1, title: '青春期', effect: (s) => `臉上冒了好多痘痘，拍照都不想入鏡。${addStats(s, { happy: -3 })}` },
  { id: 'sports_day', minAge: 8, maxAge: 18, weight: 2, cond: (s) => s.stats.hp >= 60, title: '運動會', effect: (s) => good(`大隊接力你跑最後一棒，幫班上拿到冠軍！${addStats(s, { charm: 4, happy: 4 })}`) },

  // ───────── 大學、年輕人 18–29 ─────────
  {
    id: 'exchange', minAge: 18, maxAge: 23, weight: 3, once: true, cond: (s) => s.studying && s.age >= 19, title: '交換學生',
    text: '學校有到國外當一年交換學生的機會，費用約 30 萬。',
    choices: [
      { label: '去！', sub: '智力、人緣大增', effect: (s) => good(`你在國外交到來自世界各地的朋友，英文也變很好。${addMoney(s, -P(s, 30 * WAN))}${addStats(s, { int: 6, charm: 6, happy: 5 })}`) },
      { label: '留在台灣', effect: (s) => `你決定把錢省下來。${addStats(s, { happy: -1 })}` },
    ],
  },
  {
    id: 'first_salary', minAge: 15, maxAge: 30, weight: 6, once: true, cond: (s) => s.job && s.job.years <= 1, title: '第一份薪水',
    text: '領到人生第一份薪水了！要不要拿一部分給爸媽當孝親費？',
    choices: [
      { label: '給爸媽孝親費', sub: '每月 5,000 元', effect: (s) => good(`爸媽很感動，逢人就說你很孝順。${addMoney(s, -P(s, 6 * WAN))}${addStats(s, { happy: 5, charm: 3 })}`) },
      { label: '先存起來', effect: (s) => `你想先把存款存起來。${addStats(s, { happy: 1 })}` },
      { label: '犒賞自己', effect: (s) => `你買了一直想要的東西。${addMoney(s, -P(s, 3 * WAN))}${addStats(s, { happy: 6 })}` },
    ],
  },
  {
    id: 'credit_card', minAge: 20, maxAge: 40, weight: 2, title: '分期付款的誘惑',
    text: '百貨公司週年慶，名牌包可以刷卡分 24 期零利率。',
    choices: [
      { label: '刷下去', sub: '約 20 萬', effect: (s) => `你背著新包包出門，心情很好，但帳單也來了。${addMoney(s, -P(s, 20 * WAN))}${addStats(s, { happy: 6, charm: 2 })}` },
      { label: '理性消費', effect: (s) => good(`你把錢留下來投資。${addStats(s, { int: 1 })}`) },
    ],
  },
  {
    id: 'side_gig', minAge: 20, maxAge: 50, weight: 2, cond: (s) => !s.studying, title: '接外快',
    text: '朋友介紹一個週末的兼差案子。',
    choices: [
      { label: '接', sub: '賺錢但比較累', effect: (s, rng) => good(`多賺了一筆外快。${addMoney(s, P(s, rint(rng, 5, 20) * WAN))}${addStats(s, { hp: -3, happy: -1 })}`) },
      { label: '週末要休息', effect: (s) => `你好好休息了一個週末。${addStats(s, { hp: 2, happy: 2 })}` },
    ],
  },
  {
    id: 'hackathon', minAge: 18, maxAge: 35, weight: 2, cond: (s) => s.stats.int >= 60, title: '黑客松',
    text: '有一場 48 小時的程式競賽，冠軍獎金 50 萬。',
    choices: [
      {
        odds: (s) => Math.min(1, 0.2 + s.stats.int / 400), label: '組隊參加',
        effect: (s, rng) => (chance(rng, 0.2 + s.stats.int / 400)
          ? good(`你們的作品拿下冠軍！${addMoney(s, P(s, 50 * WAN))}${addStats(s, { int: 3, charm: 3, hp: -3 })}`)
          : `熬了兩天兩夜，雖然沒得獎但認識很多人。${addStats(s, { charm: 3, hp: -4 })}`),
      },
      { label: '不參加', effect: () => '你覺得週末還是休息比較好。' },
    ],
  },
  {
    id: 'mlm', minAge: 20, maxAge: 60, weight: 2, cond: (s) => s.money >= P(s, 10 * WAN), title: '朋友拉你加入直銷',
    text: '好久不見的朋友約你喝咖啡，說有一個「被動收入」的好機會，只要先買 10 萬元的產品。',
    choices: [
      {
        label: '加入看看',
        effect: (s, rng) => (chance(rng, 0.15)
          ? good(`你意外地做得不錯，賺回了本錢還多一點。${addMoney(s, P(s, 5 * WAN))}${addStats(s, { charm: -2 })}`)
          : bad(`產品賣不出去，朋友也越來越少……${addMoney(s, -P(s, 10 * WAN))}${addStats(s, { charm: -5, happy: -5 })}`)),
      },
      { label: '婉拒', effect: (s) => good(`你委婉地拒絕了。${addStats(s, { int: 1 })}`) },
    ],
  },
  {
    id: 'ipo_lottery', minAge: 20, maxAge: 79, weight: 2, title: '抽新股',
    text: '有一檔熱門新股開放抽籤，中籤的話一張可以賺好幾萬。',
    choices: [
      {
        label: '去抽（手續費 20 元）',
        effect: (s, rng) => {
          s.money -= 20;
          if (chance(rng, 0.03)) return good(`中籤了！賣掉賺了一筆。${addMoney(s, P(s, rint(rng, 5, 30) * WAN))}${addStats(s, { happy: 5 })}`);
          return '沒抽中，下次再試試。';
        },
      },
      { label: '不抽', effect: () => '你不想碰運氣。' },
    ],
  },

  // ───────── 成年 30–64（小事件）─────────
  {
    id: 'year_bonus', minAge: 22, maxAge: 79, weight: 2, cond: (s) => s.job && !s.job.volatile, title: '年終獎金',
    effect: (s, rng) => {
      const months = rint(rng, 1, 4);
      const m = months / 12;
      return good(`公司今年業績好，多發了 ${months} 個月年終獎金。${addMoney(s, Math.round(s.job.salary * m))}${addStats(s, { happy: 3 })}`);
    },
  },
  { id: 'car_bump', minAge: 20, maxAge: 79, weight: 2, title: '小車禍', effect: (s, rng) => bad(`停車時擦撞了別人的車，賠了一些錢。${addMoney(s, -P(s, rint(rng, 1, 5) * WAN))}${addStats(s, { happy: -3 })}`) },
  { id: 'house_leak', minAge: 20, maxAge: 79, weight: 2, cond: (s) => s.houses.length > 0, title: '房子漏水', effect: (s, rng) => bad(`颱風過後房子漏水，只好請人整修。${addMoney(s, -P(s, rint(rng, 3, 15) * WAN))}${addStats(s, { happy: -2 })}`) },
  { id: 'dividend', minAge: 0, maxAge: 99, weight: 1, cond: (s) => s.etf + s.stock >= 50 * WAN, title: '領股利', effect: (s) => good(`你持有的股票發放現金股利。${addMoney(s, Math.round((s.etf + s.stock) * 0.01))}`) },
  { id: 'neighbor', minAge: 20, maxAge: 79, weight: 1, title: '鄰居很吵', effect: (s) => `樓上鄰居每天半夜裝潢，害你睡不好。${addStats(s, { happy: -3, hp: -1 })}` },
  { id: 'travel_luck', minAge: 18, maxAge: 79, weight: 1, title: '抽中旅遊', effect: (s) => good(`公司尾牙抽中日本來回機票！${addStats(s, { happy: 8 })}`) },
  { id: 'award', minAge: 25, maxAge: 79, weight: 2, cond: (s) => s.bizs.length > 0, title: '業界大獎', effect: (s) => { const b = mainBiz(s); scaleBiz(s, b, 1.1); return good(`「${b.name}」拿到業界大獎，品牌價值提升 10%。${addStats(s, { charm: 3, happy: 4 })}`); } },
  { id: 'gold_up', minAge: 0, maxAge: 99, weight: 2, cond: (s) => s.gold >= 10 * WAN, title: '金價創新高', effect: (s) => { const g = Math.round(s.gold * 0.1); s.gold += g; return good(`國際金價創歷史新高，你的黃金多了 ${formatMoney(g)}。`); } },
  { id: 'grandchild', minAge: 45, maxAge: 99, weight: 3, cond: (s) => kidsOf(s, 27, 99).length > 0, title: '抱孫', effect: (s) => good(`孩子生了寶寶，你當阿公／阿嬤了！${addStats(s, { happy: 12 })}`) },
  { id: 'good_harvest', minAge: 20, maxAge: 79, weight: 3, cond: (s) => s.job && s.job.id === 'farmer', title: '大豐收', effect: (s, rng) => good(`今年風調雨順，作物大豐收。${addMoney(s, P(s, rint(rng, 5, 20) * WAN))}${addStats(s, { happy: 4 })}`) },
  { id: 'typhoon', minAge: 20, maxAge: 79, weight: 3, cond: (s) => s.job && s.job.id === 'farmer', title: '颱風來襲', effect: (s, rng) => bad(`颱風把農作物吹壞了一大半。${addMoney(s, -P(s, rint(rng, 5, 15) * WAN))}${addStats(s, { happy: -5 })}`) },
  { id: 'big_deal', minAge: 20, maxAge: 79, weight: 3, cond: (s) => s.job && s.job.id === 'realtor', title: '成交豪宅', effect: (s, rng) => good(`你成交了一間豪宅，拿到一大筆佣金！${addMoney(s, P(s, rint(rng, 20, 80) * WAN))}${addStats(s, { happy: 6 })}`) },
  { id: 'tournament', minAge: 16, maxAge: 35, weight: 3, cond: (s) => s.job && s.job.id === 'esports', title: '比賽獎金', effect: (s, rng) => (chance(rng, 0.5) ? good(`你的戰隊打進前四強，分到獎金。${addMoney(s, P(s, rint(rng, 10, 60) * WAN))}${addStats(s, { charm: 3 })}`) : bad(`比賽第一輪就被淘汰，被網友罵翻。${addStats(s, { happy: -6 })}`)) },
  { id: 'night_shift', minAge: 20, maxAge: 79, weight: 3, cond: (s) => s.job && ['nurse', 'police', 'pilot', 'attendant', 'doctor'].includes(s.job.id), title: '輪班好累', effect: (s) => bad(`連續好幾週輪大夜班，作息全亂了。${addStats(s, { hp: -4, happy: -3 })}`) },
  { id: 'good_review', minAge: 18, maxAge: 79, weight: 3, cond: (s) => s.job && ['chef', 'hairdresser', 'driver', 'designer'].includes(s.job.id), title: '網路好評', effect: (s, rng) => good(`客人在網路上大推你，指名你的人變多了。${addMoney(s, P(s, rint(rng, 2, 8) * WAN))}${addStats(s, { charm: 3, happy: 3 })}`) },

  // ───────── 成年 30–64（選擇）─────────
  {
    id: 'insurance', minAge: 25, maxAge: 55, weight: 2, once: true, title: '要不要買保險？',
    text: '保險業務員說，買一份醫療險，以後生病住院可以少花很多錢。',
    choices: [
      { label: '買', sub: '一次付 10 萬，健康風險下降', effect: (s) => { s.flags.insured = true; s.risk = Math.max(0, s.risk - 5); return good(`你買了醫療險，心裡比較踏實。${addMoney(s, -P(s, 10 * WAN))}${addStats(s, { happy: 2 })}`); } },
      { label: '不需要', effect: () => '你覺得自己身體很好。' },
    ],
  },
  {
    id: 'stock_tip', minAge: 22, maxAge: 79, weight: 2, cond: (s) => s.money >= P(s, 50 * WAN), title: '明牌',
    text: '親戚說有一檔股票「下個月一定漲」，叫你趕快買 50 萬。',
    choices: [
      {
        label: '跟著買',
        effect: (s, rng) => {
          const amt = P(s, 50 * WAN);
          s.money -= amt;
          const r = rng();
          if (r < 0.25) return good(`真的漲了！50 萬變成 ${formatMoney(amt * 2)}。${addMoney(s, amt * 2)}${addStats(s, { happy: 6 })}`);
          if (r < 0.55) return `小漲一點，你賣掉了。${addMoney(s, Math.round(amt * 1.1))}`;
          return bad(`股票一路跌，最後只拿回一半。${addMoney(s, Math.round(amt * 0.5))}${addStats(s, { happy: -5 })}`);
        },
      },
      { label: '不聽明牌', effect: (s) => good(`你相信自己的投資紀律。${addStats(s, { int: 1 })}`) },
    ],
  },
  {
    id: 'tenant_trouble', minAge: 25, maxAge: 79, weight: 3, cond: (s) => s.houses.length > 1, title: '房客不付房租',
    text: '你的房客已經三個月沒付房租了。',
    choices: [
      { label: '請律師處理', sub: '花錢但比較快', effect: (s) => `房客搬走了，你花了一些律師費。${addMoney(s, -P(s, 5 * WAN))}${addStats(s, { happy: -2 })}` },
      { label: '好好溝通', effect: (s, rng) => (chance(rng, 0.5) ? good(`房客補繳了房租，還跟你道歉。${addStats(s, { charm: 2 })}`) : bad(`溝通失敗，房客半夜跑了。${addMoney(s, -P(s, 8 * WAN))}${addStats(s, { happy: -4 })}`)) },
    ],
  },
  {
    id: 'tax_audit', minAge: 25, maxAge: 79, weight: 2, cond: (s) => s.bizs.length > 0, title: '國稅局查帳',
    text: '國稅局來查公司的帳，發現有些報稅有問題。',
    choices: [
      { label: '乖乖補稅', effect: (s) => { const b = mainBiz(s); const c = Math.round(b.value * 0.05); return `你補繳了稅金。${addMoney(s, -c)}${addStats(s, { happy: -3 })}`; } },
      {
        label: '想辦法逃漏稅',
        effect: (s, rng) => {
          const b = mainBiz(s);
          if (chance(rng, 0.6)) { const c = Math.round(b.value * 0.2); return bad(`被查到了，罰款非常重！${addMoney(s, -c)}${addStats(s, { happy: -10, charm: -5 })}`); }
          return `這次僥倖過關，但每天都睡不好。${addStats(s, { happy: -4, hp: -2 })}`;
        },
      },
    ],
  },
  {
    id: 'key_staff', minAge: 25, maxAge: 79, weight: 2, cond: (s) => s.bizs.length > 0, title: '核心員工要離職',
    text: (s) => `「${mainBiz(s).name}」最厲害的員工被競爭對手挖角了。`,
    choices: [
      { label: '加薪留人', sub: '花錢但公司穩定', effect: (s) => good(`員工被你的誠意感動，決定留下來。${addMoney(s, -P(s, 20 * WAN))}${addStats(s, { charm: 2 })}`) },
      { label: '讓他走', effect: (s) => { const b = mainBiz(s); b.value = Math.round(b.value * 0.85); return bad(`「${b.name}」少了關鍵人物，價值掉了 15%。${addStats(s, { happy: -3 })}`); } },
    ],
  },
  {
    id: 'franchise', minAge: 25, maxAge: 79, weight: 3, cond: (s) => s.bizs.some((b) => b.value >= 800 * WAN), title: '開放加盟？',
    text: (s) => `很多人想加盟「${mainBiz(s).name}」。`,
    choices: [
      { label: '開放加盟', sub: '成長快，但品質要顧好', effect: (s, rng) => { const b = mainBiz(s); const m = chance(rng, 0.7) ? 1.3 : 0.9; scaleBiz(s, b, m); return m > 1 ? good(`加盟店越開越多，公司價值大增！${addStats(s, { happy: 5 })}`) : bad(`加盟主品質參差不齊，品牌形象受損。${addStats(s, { happy: -4 })}`); } },
      { label: '堅持直營', effect: (s) => `你想把品質顧好。${addStats(s, { happy: 1 })}` },
    ],
  },
  {
    id: 'donation', minAge: 25, maxAge: 99, weight: 2, cond: (s) => s.money >= P(s, 20 * WAN), title: '慈善捐款',
    text: '偏鄉學校需要經費買電腦，基金會來募款。',
    choices: [
      { label: '捐 10 萬', effect: (s) => good(`孩子們寫了感謝卡給你，你覺得很有意義。${addMoney(s, -P(s, 10 * WAN))}${addStats(s, { happy: 6, charm: 5 })}`) },
      { label: '捐 1,000 元', effect: (s) => good(`心意最重要。${addMoney(s, -P(s, 1000))}${addStats(s, { happy: 2, charm: 1 })}`) },
      { label: '這次先不要', effect: () => '你決定下次再說。' },
    ],
  },
  {
    id: 'lend_money', minAge: 25, maxAge: 79, weight: 2, cond: (s) => s.money >= P(s, 50 * WAN), title: '老朋友借錢',
    text: '老同學說生意周轉不靈，想跟你借 50 萬。',
    choices: [
      {
        label: '借他',
        effect: (s, rng) => {
          const amt = P(s, 50 * WAN);
          s.money -= amt;
          if (chance(rng, 0.5)) return good(`一年後他連本帶利還給你，還請你吃大餐。${addMoney(s, Math.round(amt * 1.1))}${addStats(s, { charm: 4 })}`);
          return bad(`他後來就聯絡不上了……${addStats(s, { happy: -8 })}`);
        },
      },
      { label: '婉拒', effect: (s) => `你委婉地拒絕了，他有點失望。${addStats(s, { charm: -2 })}` },
    ],
  },
  {
    id: 'kid_wedding', minAge: 45, maxAge: 99, weight: 3, cond: (s) => kidsOf(s, 26, 40).some((k) => !k.wed), title: '孩子要結婚了',
    text: (s) => `「${kidsOf(s, 26, 40).find((k) => !k.wed).name}」要結婚了，要幫忙出婚禮的錢嗎？`,
    choices: [
      { label: '出錢辦風光婚禮', sub: '約 100 萬', effect: (s) => { const k = kidsOf(s, 26, 40).find((x) => !x.wed); k.wed = true; k.spent += P(s, 100 * WAN); s.kidSpent += P(s, 100 * WAN); return good(`「${k.name}」的婚禮辦得很風光。${addMoney(s, -P(s, 100 * WAN))}${addStats(s, { happy: 10 })}`); } },
      { label: '給個紅包就好', effect: (s) => { const k = kidsOf(s, 26, 40).find((x) => !x.wed); k.wed = true; k.spent += P(s, 10 * WAN); s.kidSpent += P(s, 10 * WAN); return `你包了一個大紅包。${addMoney(s, -P(s, 10 * WAN))}${addStats(s, { happy: 6 })}`; } },
    ],
  },
  {
    id: 'kid_house', minAge: 50, maxAge: 99, weight: 3, cond: (s) => kidsOf(s, 28, 45).some((k) => !k.housed) && s.money >= P(s, 300 * WAN), title: '孩子想買房',
    text: (s) => `「${kidsOf(s, 28, 45).find((k) => !k.housed).name}」想買房子，問你能不能幫忙出頭期款。`,
    choices: [
      { label: '幫忙出 300 萬', effect: (s) => { const k = kidsOf(s, 28, 45).find((x) => !x.housed); k.housed = true; k.spent += P(s, 300 * WAN); s.kidSpent += P(s, 300 * WAN); return good(`「${k.name}」順利買到房子，很感謝你。${addMoney(s, -P(s, 300 * WAN))}${addStats(s, { happy: 8 })}`); } },
      { label: '讓他自己努力', effect: (s) => { const k = kidsOf(s, 28, 45).find((x) => !x.housed); k.housed = true; return `你相信孩子可以靠自己。${addStats(s, { happy: -1 })}`; } },
    ],
  },
  {
    id: 'career_switch', minAge: 30, maxAge: 50, weight: 2, cond: (s) => !!s.job && s.job.years >= 5 && !underIdolContract(s), once: true, title: '想轉行',
    text: '你對現在的工作有點膩了，有獵頭問你要不要換跑道。',
    choices: [
      { label: '去看看有哪些工作', sub: '年底會有職缺', effect: (s) => { s.flags.wantJob = true; return '你開始研究新的工作機會。'; } },
      { label: '留在原本的領域', effect: (s) => `你決定在原本的領域繼續深耕。${addStats(s, { int: 1 })}` },
    ],
  },

  // ───────── 年長 55 歲以上 ─────────
  {
    id: 'health_food', minAge: 55, maxAge: 99, weight: 3, title: '保健食品推銷',
    text: '有人在公園推銷「吃了百病全消」的保健食品，一盒 3 萬。',
    choices: [
      { label: '買一盒試試', effect: (s) => bad(`吃了半年，沒什麼效果。${addMoney(s, -P(s, 3 * WAN))}${addStats(s, { happy: -2 })}`) },
      { label: '問醫生比較實在', effect: (s) => good(`醫生說多運動比較有用。${addStats(s, { hp: 1, int: 1 })}`) },
    ],
  },
  {
    id: 'world_trip', minAge: 55, maxAge: 99, weight: 2, once: true, cond: (s) => s.money >= P(s, 50 * WAN), title: '環遊世界',
    text: '你一直想去環遊世界，現在時間和錢都比較充裕了。',
    choices: [
      { label: '出發！', sub: '約 50 萬', effect: (s) => good(`你花了三個月走過 20 個國家，這是人生最棒的回憶。${addMoney(s, -P(s, 50 * WAN))}${addStats(s, { happy: 15, hp: 2 })}`) },
      { label: '再存一點錢', effect: () => '你決定再等等。' },
    ],
  },
  { id: 'calligraphy', minAge: 55, maxAge: 99, weight: 2, title: '學書法', effect: (s) => good(`你開始在社區大學學書法，心情很平靜。${addStats(s, { happy: 4, int: 1 })}`) },
  { id: 'knee', minAge: 55, maxAge: 99, weight: 2, title: '膝蓋退化', effect: (s) => bad(`爬樓梯時膝蓋開始痛，醫生說是退化。${addStats(s, { hp: -4 })}`) },
  { id: 'reunion_old', minAge: 60, maxAge: 99, weight: 2, title: '老同學聚會', effect: (s) => good(`和國小同學相隔 50 年再聚，大家都老了。${addStats(s, { happy: 5, charm: 1 })}`) },
  {
    id: 'grandkid_tuition', minAge: 55, maxAge: 99, weight: 2, cond: (s) => kidsOf(s, 30, 99).length > 0, title: '孫子的學費',
    text: '孫子考上大學，孩子問你能不能幫忙出學費。',
    choices: [
      { label: '幫忙出', sub: '約 20 萬', effect: (s) => good(`孫子開心地抱著你說謝謝。${addMoney(s, -P(s, 20 * WAN))}${addStats(s, { happy: 8 })}`) },
      { label: '給個紅包就好', effect: (s) => `你包了一個紅包。${addMoney(s, -P(s, 2 * WAN))}${addStats(s, { happy: 3 })}` },
    ],
  },

  // ───────── 寵物 ─────────
  {
    id: 'adopt_pet', minAge: 20, maxAge: 70, weight: 2, cond: (s) => alivePets(s).length < 2 && !s.studying, title: '想養寵物',
    text: '朋友家的狗和貓生了寶寶，問你要不要領養一隻。',
    choices: [
      {
        label: '養狗',
        sub: '每年約 3～4 萬，還要常帶去散步',
        effect: (s, rng) => { const p = addPet(s, rng, 'dog'); petExpense(s, p, '結紮、晶片、第一次疫苗', P(s, 0.8 * WAN)); return good(`你領養了小狗「${p.name}」。（-${formatMoneyFine(P(s, 0.8 * WAN))}）${addStats(s, { happy: 8, hp: 2 })}`); },
      },
      {
        label: '養貓',
        sub: '每年約 2～3 萬',
        effect: (s, rng) => { const p = addPet(s, rng, 'cat'); petExpense(s, p, '結紮、晶片、第一次疫苗', P(s, 0.6 * WAN)); return good(`你領養了小貓「${p.name}」。（-${formatMoneyFine(P(s, 0.6 * WAN))}）${addStats(s, { happy: 7 })}`); },
      },
      { label: '先不要', effect: () => '你覺得現在沒時間照顧。' },
    ],
  },
  {
    id: 'pet_sick', minAge: 0, maxAge: 99, weight: 4, cond: (s) => alivePets(s).length > 0, title: '寵物生病了',
    text: (s) => `「${firstPet(s).name}」這幾天都不吃東西，看起來很沒精神。`,
    choices: [
      {
        label: '帶去大醫院徹底檢查',
        sub: '約 3～10 萬',
        effect: (s, rng) => { const p = firstPet(s); const c = P(s, rint(rng, 3, 10) * WAN); const bp = petExpense(s, p, '大醫院檢查與治療', c); return good(`醫生找到原因，「${p.name}」很快就恢復活力了。（-${formatMoneyFine(c)}）${paidBy(bp)}${addStats(s, { happy: 3 })}`); },
      },
      {
        label: '附近小診所看看',
        sub: '約 5,000 元，但可能沒治好',
        effect: (s, rng) => {
          const p = firstPet(s);
          const c = P(s, 0.5 * WAN);
          const bp = petExpense(s, p, '小診所看診', c);
          if (chance(rng, 0.25)) {
            p.life = Math.max(s.age - p.since + 1, p.life - 3);
            return bad(`拖了一陣子才好，「${p.name}」的身體變差了。（-${formatMoneyFine(c)}）${paidBy(bp)}${addStats(s, { happy: -4 })}`);
          }
          return `吃了藥之後好多了。（-${formatMoneyFine(c)}）${paidBy(bp)}`;
        },
      },
    ],
  },
  {
    id: 'pet_grooming', minAge: 0, maxAge: 99, weight: 3, cond: (s) => alivePets(s).some((p) => p.type === 'dog'), title: '帶狗去美容',
    effect: (s) => { const p = alivePets(s).find((x) => x.type === 'dog'); const c = P(s, 0.8 * WAN); const bp = petExpense(s, p, '洗澡美容', c); return good(`「${p.name}」洗得香香的，超可愛。（-${formatMoneyFine(c)}）${paidBy(bp)}${addStats(s, { happy: 2 })}`); },
  },
  {
    id: 'pet_chew', minAge: 0, maxAge: 99, weight: 2, cond: (s) => alivePets(s).length > 0, title: '家具被咬壞',
    effect: (s) => { const p = firstPet(s); const c = P(s, 1.5 * WAN); const bp = petExpense(s, p, '賠家具、買新沙發套', c); return bad(`「${p.name}」把沙發抓得亂七八糟。（-${formatMoneyFine(c)}）${paidBy(bp)}${addStats(s, { happy: -1 })}`); },
  },
  {
    id: 'pet_toy', minAge: 0, maxAge: 99, weight: 2, cond: (s) => alivePets(s).length > 0, title: '買寵物用品',
    effect: (s) => { const p = firstPet(s); const c = P(s, 0.3 * WAN); const bp = petExpense(s, p, '玩具、零食、新睡窩', c); return `你幫「${p.name}」買了新玩具和睡窩。（-${formatMoneyFine(c)}）${paidBy(bp)}${addStats(s, { happy: 2 })}`; },
  },
  {
    id: 'pet_hotel', minAge: 18, maxAge: 99, weight: 2, cond: (s) => alivePets(s).length > 0, title: '寵物旅館',
    effect: (s) => { const p = firstPet(s); const c = P(s, 0.6 * WAN); const bp = petExpense(s, p, '出國時住寵物旅館', c); return `出國那幾天，把「${p.name}」送去寵物旅館。（-${formatMoneyFine(c)}）${paidBy(bp)}`; },
  },
];
