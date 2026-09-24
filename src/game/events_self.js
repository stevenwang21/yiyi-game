// 自己上下學（flags.pickup === 'self'）才會遇到的事：路上的危險，還有只有自己走才碰得到的好事
import { addStats, chance, formatMoney, rint, WAN } from './utils.js';
import { addPoints } from './actions.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });
const P = (s, v) => Math.round(v * s.priceIndex);
// 自己走路／自己搭車上下學，而且還在念書
const alone = (s) => s.flags.pickup === 'self' && s.studying;

export const SELF_EVENTS = [
  // ───────── 路上的危險 ─────────
  {
    id: 'sf_scooter', minAge: 6, maxAge: 17, weight: 4, cond: alone,
    title: '轉角衝出來的機車',
    text: '你走在斑馬線上，一台機車搶黃燈從轉角衝出來。',
    choices: [
      {
        odds: (s) => Math.min(0.95, 0.5 + s.stats.hp / 250),
        label: '往後跳一步',
        sub: '閃得掉就沒事',
        effect: (s, rng) => (chance(rng, 0.5 + s.stats.hp / 250)
          ? good(`你整個人往後彈，機車擦著書包過去。騎士回頭罵了一句就跑了，你站在原地喘了半分鐘。${addStats(s, { hp: -1, happy: -3, int: 2 })}`)
          : (() => { const c = P(s, rint(rng, 3000, 12000)); s.money -= c; return bad(`你被撞倒在地，手肘和膝蓋都擦傷，醫藥費 ${formatMoney(c)}。從那天起你過馬路一定先停下來看兩邊。${addStats(s, { hp: -8, happy: -6, int: 2 })}`); })()),
      },
      { label: '愣在原地', sub: '很危險', effect: (s, rng) => (chance(rng, 0.45) ? bad(`機車緊急煞車停在你面前半公尺，你腿軟到走不動。${addStats(s, { hp: -3, happy: -7 })}`) : (() => { const c = P(s, rint(rng, 8000, 30000)); s.money -= c; return bad(`你被撞飛，送去醫院縫了幾針，醫藥費 ${formatMoney(c)}。${addStats(s, { hp: -14, happy: -8 })}`); })()) },
    ],
  },
  {
    id: 'sf_dog', minAge: 6, maxAge: 15, weight: 3, cond: alone,
    title: '巷口的野狗',
    text: '巷口那隻大狗又衝出來對著你叫，這次還跟著你走。',
    choices: [
      { label: '站住不動不看牠', sub: '正確做法', effect: (s, rng) => (chance(rng, 0.8) ? good(`你停下來低頭不動，牠聞一聞就走了。你學到遇到狗不能跑。${addStats(s, { int: 2, happy: -2 })}`) : bad(`牠還是撲上來咬了你的小腿一口，要打狂犬病疫苗。${addStats(s, { hp: -7, happy: -5 })}`)) },
      { label: '拔腿就跑', sub: '狗會追', effect: (s, rng) => (chance(rng, 0.45) ? `你跑贏了牠，但書包裡的水壺掉了一路。${addStats(s, { hp: 1, happy: -4 })}` : (() => { const c = P(s, rint(rng, 2000, 6000)); s.money -= c; return bad(`牠追上來咬破你的褲管，小腿見血，打針加看醫生花了 ${formatMoney(c)}。${addStats(s, { hp: -8, happy: -6 })}`); })()) },
    ],
  },
  {
    id: 'sf_stranger', minAge: 6, maxAge: 13, weight: 4, cond: alone,
    title: '有人說要載你回家',
    text: '一台車停在你旁邊，搖下車窗說：「你爸媽叫我來載你。」你不認識他。',
    choices: [
      { label: '轉頭跑進便利商店', sub: '最安全', effect: (s) => good(`你掉頭衝進便利商店請店員打給媽媽，車子馬上開走了。警察來做了筆錄，導師還在朝會上講了這件事。${addStats(s, { int: 4, charm: 3, happy: -3 })}${addPoints(s, 1, '保護好自己') || ''}`) },
      { label: '先問他你叫什麼名字', sub: '聰明的試探', effect: (s, rng) => (chance(rng, 0.85) ? good(`他答不出來，愣了一秒就把車開走。你記下車牌回家告訴爸媽。${addStats(s, { int: 5, happy: -2 })}`) : `他說得出你的名字，你嚇得後退，剛好隔壁的鄰居走出來，車子就走了。${addStats(s, { int: 3, happy: -6, hp: -1 })}`) },
      { label: '猶豫了一下', sub: '很危險', effect: (s, rng) => (chance(rng, 0.7) ? bad(`你站在車邊猶豫的時候，同學的媽媽正好騎車經過大喊你的名字，車子立刻開走。你回家做了好幾天噩夢。${addStats(s, { happy: -10, hp: -2, int: 2 })}`) : bad(`你被硬拉上車，繞了兩條街才被路人攔下來。爸媽趕到警局時臉色發白，那天之後家裡多了一支手機給你。${addStats(s, { happy: -18, hp: -4, int: 3 })}`)) },
    ],
  },
  {
    id: 'sf_shakedown', minAge: 9, maxAge: 16, weight: 3, cond: alone,
    title: '被高年級的堵在巷子',
    text: '三個高年級的把你堵在巷子裡，說「借一下錢」。',
    choices: [
      { label: '把零錢給他們', sub: '破財消災', effect: (s, rng) => { const c = P(s, rint(rng, 100, 500)); s.money -= c; return bad(`你把口袋裡的 ${formatMoney(c)} 都給了他們，回家路上一句話都不想講。${addStats(s, { happy: -8, charm: -1 })}`); } },
      { odds: (s) => Math.min(0.9, 0.35 + s.stats.hp / 200), label: '硬是推開跑掉', sub: '靠體力', effect: (s, rng) => (chance(rng, 0.35 + s.stats.hp / 200) ? good(`你低頭一鑽就跑了，他們追了半條街就放棄。${addStats(s, { hp: 2, happy: -2, charm: 2 })}`) : bad(`你被推倒在地，制服扯破了，手掌也磨破皮。${addStats(s, { hp: -7, happy: -7 })}`)) },
      { label: '回家告訴爸媽和老師', sub: '大人會處理', effect: (s) => good(`學務處把那幾個人找去談，之後再也沒人擋過你。${addStats(s, { charm: 3, int: 2, happy: -2 })}`) },
    ],
  },
  {
    id: 'sf_typhoon', minAge: 6, maxAge: 17, weight: 3, cond: alone,
    title: '放學遇到大雷雨',
    text: '午後大雷雨，路口積水到小腿，沒有人來接你。',
    choices: [
      { label: '直接涉水走回家', sub: '會淋濕', effect: (s, rng) => (chance(rng, 0.5) ? bad(`你全身濕透回到家，隔天發燒請了兩天假。${addStats(s, { hp: -6, happy: -3 })}`) : `你踩著水走回家，鞋子濕了兩天才乾，但你覺得有點好玩。${addStats(s, { hp: -2, happy: 1 })}`) },
      { label: '在超商等雨小一點', sub: '安全，但要等', effect: (s) => good(`你在超商站了一個小時，寫完了數學作業，順便買了一杯熱可可。${addStats(s, { int: 2, happy: 2 })}`) },
    ],
  },
  {
    id: 'sf_lastbus', minAge: 12, maxAge: 17, weight: 3, cond: (s) => alone(s) && s.age >= 12,
    title: '沒趕上末班公車',
    effect: (s, rng) => (chance(rng, 0.55)
      ? `你沿著大馬路走了四十分鐘回家，路燈一盞一盞亮著，回到家腳都麻了。${addStats(s, { hp: -3, happy: -4, int: 1 })}`
      : (() => { const c = P(s, rint(rng, 150, 400)); s.money -= c; return `你打電話回家，爸媽叫你直接搭計程車（${formatMoney(c)}），在電話裡念了你一路。${addStats(s, { happy: -2 })}`; })()),
  },
  {
    id: 'sf_construction', minAge: 6, maxAge: 17, weight: 2, cond: alone,
    title: '工地旁的鐵皮',
    effect: (s, rng) => (chance(rng, 0.7)
      ? `一塊鐵皮從鷹架上滑下來砸在你前面兩步的地上，整條巷子的人都衝出來看。${addStats(s, { happy: -5, int: 1 })}`
      : (() => { const c = P(s, rint(rng, 2000, 9000)); s.money -= c; return bad(`你被掉下來的東西擦到肩膀，去醫院照了 X 光（${formatMoney(c)}），還好沒骨折。工地後來賠了一點錢。${addStats(s, { hp: -6, happy: -4 })}`); })()),
  },

  // ───────── 只有自己走才遇得到的好事 ─────────
  {
    id: 'sf_lostpet', minAge: 6, maxAge: 15, weight: 3, cond: alone,
    title: '路邊的走失小狗',
    effect: (s) => good(`你在路邊看到一隻脖子上掛著名牌的小狗，牽著牠照地址送回去。狗主人是開麵店的阿姨，從此你經過都會多一顆滷蛋。${addStats(s, { charm: 5, happy: 4 })}`),
  },
  {
    id: 'sf_oldlady', minAge: 7, maxAge: 17, weight: 3, cond: alone,
    title: '幫鄰居阿嬤提東西',
    effect: (s) => good(`你幫在市場口喘不過氣的阿嬤把菜提上四樓。隔天她端了一鍋湯來按你家電鈴，媽媽笑了一整晚。${addStats(s, { charm: 6, hp: 1, happy: 3 })}`),
  },
  {
    id: 'sf_bookstore', minAge: 8, maxAge: 17, weight: 3, cond: alone,
    title: '繞去書店蹲著看書',
    effect: (s) => good(`你每天放學繞去書店站著看完一本又一本，店員從來不趕你。${addStats(s, { int: 5, happy: 2 })}`),
  },
  {
    id: 'sf_shortcut', minAge: 6, maxAge: 17, weight: 2, cond: alone,
    title: '發現一條新的近路',
    effect: (s) => good(`你自己摸索出一條穿過公園的近路，每天多睡十分鐘，還認識了在那裡下棋的伯伯。${addStats(s, { int: 3, happy: 3, charm: 2 })}`),
  },
  {
    id: 'sf_wallet', minAge: 7, maxAge: 17, weight: 2, cond: alone,
    title: '路上撿到一個皮夾',
    choices: [
      { label: '送去派出所', sub: '人緣↑', effect: (s) => good(`失主是附近的送貨大哥，特地買了一箱飲料到學校謝你，校長在朝會上唸了你的名字。${addStats(s, { charm: 7, happy: 4 })}${addPoints(s, 1, '拾金不昧') || ''}`) },
      { label: '自己留著', sub: '拿到錢', effect: (s, rng) => { const amt = P(s, rint(rng, 500, 3000)); s.money += amt; return `皮夾裡有 ${formatMoney(amt)}。你把錢收起來、皮夾丟進水溝，之後每次經過那裡都會加快腳步。${addStats(s, { happy: -7, charm: -2 })}`; } },
    ],
  },
  {
    id: 'sf_buddy', minAge: 6, maxAge: 17, weight: 3, cond: alone,
    title: '同路的伴',
    effect: (s) => good(`有個同學跟你同一條路，你們開始每天一起走。那段路上講的事，比在教室裡一整年講的還多。${addStats(s, { charm: 6, happy: 5 })}`),
  },
  {
    id: 'sf_streetsmart', minAge: 10, maxAge: 17, weight: 2, cond: alone,
    title: '自己搞定所有事',
    effect: (s) => good(`悠遊卡沒錢、公車改道、下雨沒傘，你都自己處理掉了。爸媽發現你好像不太需要他們操心。${addStats(s, { int: 4, charm: 3 })}`),
  },
  {
    id: 'sf_store', minAge: 8, maxAge: 17, weight: 2, cond: alone,
    title: '超商店員記得你',
    effect: (s) => good(`巷口超商的大姊記得你都買什麼，有時候會多塞一顆茶葉蛋給你，說「長高一點」。${addStats(s, { happy: 4, hp: 1, charm: 1 })}`),
  },
];
