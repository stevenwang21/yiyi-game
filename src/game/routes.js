// 逆襲路線：每個職業都有一條通往一個億的專屬劇情
// 每一步：minYears（距離上一步至少幾年）、cond(s)、title、text、choices
// choice.advance = true 代表選了之後路線前進一步
import { addMoney, addStats, chance, formatMoney, rint, WAN } from './utils.js';
import { BUSINESSES, HOUSES, DOWN_PAYMENT, MORTGAGE_RATE } from './data.js';
import { addDebt, addSkill, growBiz, growFactor, housePrice, promote, promoteChance, routeBiz, startBiz } from './actions.js';

const good = (text) => ({ text, tone: 'good' });

const inJob = (id, years = 0) => (s) => s.job && s.job.id === id && s.job.years >= years;
const bizOf = (id, min = 0) => (s) => s.bizs.some((b) => b.route === id && b.value >= min);

// 產生「用現金開／貸款開／再等等」三個選項
const openBizChoices = (routeId, type, cost, value, { quitJob = true } = {}) => [
  {
    label: `拿出 ${formatMoney(cost)} 現金`,
    sub: `成立${BUSINESSES[type].name}，自己當老闆`,
    cond: (s) => s.money >= cost,
    advance: true,
    effect: (s) => good(startBiz(s, type, { cash: cost, value, route: routeId, quitJob }) + addStats(s, { happy: 6 })),
  },
  {
    label: `跟銀行貸款 ${formatMoney(cost)}`,
    sub: '現金不動，但每年要還款',
    advance: true,
    effect: (s) => good(startBiz(s, type, { loan: cost, value, route: routeId, quitJob }) + addStats(s, { happy: 4 })),
  },
  { label: '再等等', sub: '之後還有機會', effect: () => '你決定再觀察一陣子。' },
];

// 產生「投入資金讓事業升級」的選項
const expandChoices = (routeId, cost, mult, rename, sub) => [
  {
    label: `投入 ${formatMoney(cost)} 擴張`,
    sub,
    cond: (s) => s.money >= cost,
    advance: true,
    effect: (s) => { const b = routeBiz(s, routeId); s.money -= cost; b.value += cost; b.capital += cost; return good(growBiz(b, mult, 0.01, rename, growFactor(s)) + addStats(s, { happy: 5 })); },
  },
  {
    label: `貸款 ${formatMoney(cost)} 擴張`,
    sub: '每年要還款',
    advance: true,
    effect: (s) => { const b = routeBiz(s, routeId); addDebt(s, `擴張貸款：${b.name}`, cost); b.value += cost; b.capital += cost; return good(growBiz(b, mult, 0.01, rename, growFactor(s)) + addStats(s, { happy: 4 })); },
  },
  { label: '先穩穩經營', sub: '之後還有機會', effect: () => '你決定先把現在的規模顧好。' },
];

// 不用花錢的升級
const freeGrow = (routeId, label, mult, rename, sub) => [
  { label, sub, advance: true, effect: (s) => good(growBiz(routeBiz(s, routeId), mult, 0.01, rename, growFactor(s)) + addStats(s, { happy: 8, charm: 3 })) },
  { label: '維持現狀', sub: '之後還有機會', effect: () => '你決定不冒這個險。' },
];

// 升遷：有機會失敗，失敗的話過幾年會再有機會
const promoteChoices = (title, mult, sub, extra) => [
  {
    label: '爭取升遷',
    sub: `${sub}（成功率看智力、人緣、年資）`,
    advance: true,
    effect: (s, rng) => {
      const p = promoteChance(s);
      if (!chance(rng, p)) {
        return { text: `很可惜，這次升遷沒有成功（成功率約 ${Math.round(p * 100)}%）。繼續努力，之後還會有機會。${addStats(s, { happy: -5 })}`, tone: 'bad', advance: false };
      }
      return good(promote(s, title, mult) + (extra ? extra(s, rng) : '') + addStats(s, { happy: 4, hp: -2 }));
    },
  },
  { label: '先不要', sub: '之後還有機會', effect: (s) => `你想再累積一點經驗。${addStats(s, { happy: 1 })}` },
];


// 標準四步路線：升遷 → 開公司 → 擴張 → 大躍進
const standardRoute = ({ id, name, title, stepNames, promo, open, expand, grow }) => ({
  name,
  title,
  stepNames,
  steps: [
    {
      minYears: promo.years || 2,
      cond: (s) => inJob(id, promo.years || 2)(s) && (!promo.req || Object.entries(promo.req).every(([k, v]) => s.stats[k] >= v)),
      title: promo.title,
      text: promo.text,
      choices: promoteChoices(promo.to, promo.mult, promo.sub, promo.extra),
    },
    {
      minYears: open.years || 2,
      cond: open.cond || inJob(id),
      title: open.title,
      text: open.text,
      choices: openBizChoices(id, open.type, open.cost * WAN, open.value * WAN, { quitJob: open.quitJob !== false }),
    },
    {
      minYears: 2,
      cond: bizOf(id, expand.min * WAN),
      title: expand.title,
      text: expand.text,
      choices: expandChoices(id, expand.cost * WAN, expand.mult, expand.rename, expand.sub),
    },
    {
      minYears: 3,
      cond: bizOf(id, grow.min * WAN),
      title: grow.title,
      text: grow.text,
      choices: freeGrow(id, grow.label, grow.mult, grow.rename, grow.sub),
    },
  ],
});

const NEW_ROUTES = [
  {
    id: 'chef', name: '廚師的逆襲', title: '餐飲集團董事長',
    stepNames: ['廚師', '主廚', '開餐廳', '上美食節目', '米其林'],
    promo: { title: '升任主廚', text: '老主廚要退休了，老闆想讓你接下廚房。', to: '主廚', mult: 1.7, sub: '管理整個廚房' },
    open: { title: '自己開餐廳', text: '熟客一直說你的菜比店裡還好吃，要不要自己開一家？需要 250 萬。', type: 'restaurant', cost: 250, value: 380 },
    expand: { min: 700, title: '上了美食節目', text: '你的餐廳上了電視，門口天天大排長龍，要不要開分店？', cost: 300, mult: 1.7, rename: '餐廳（3 間分店）', sub: '一口氣開兩間分店' },
    grow: { min: 1800, title: '米其林推薦', text: '你的餐廳拿到米其林推薦，財團想跟你合作成立餐飲集團。', label: '成立餐飲集團', mult: 2.4, rename: '餐飲集團', sub: '進百貨、機場展店' },
  },
  {
    id: 'hairdresser', name: '美髮師的逆襲', title: '沙龍女王／天王',
    stepNames: ['美髮師', '設計總監', '開沙龍', '連鎖', '美髮品牌'],
    promo: { title: '設計總監', text: '你的客人越來越多，店長想升你當設計總監。', to: '設計總監', mult: 1.8, sub: '有自己的固定客群', req: { charm: 50 } },
    open: { title: '開自己的沙龍', text: '你的熟客說只要你開店，他們都會跟過去。開一間沙龍需要 150 萬。', type: 'salon', cost: 150, value: 240 },
    expand: { min: 450, title: '開第二間店', text: '預約已經排到下個月，要不要開分店、培養徒弟？', cost: 200, mult: 1.7, rename: '美髮沙龍（連鎖）', sub: '多了一群設計師' },
    grow: { min: 1500, title: '推出髮品品牌', text: '你研發的護髮產品很受歡迎，通路商想幫你上架。', label: '推出自有髮品', mult: 2.3, rename: '美髮集團', sub: '產品賣到全台' },
  },
  {
    id: 'farmer', name: '農夫的逆襲', title: '農業大亨',
    stepNames: ['農夫', '有機認證', '觀光農場', '民宿露營', '外銷日本'],
    promo: { title: '拿到有機認證', text: '你的農作物通過有機認證，價格可以賣得更好。', to: '有機小農', mult: 1.8, sub: '收入大增', years: 2 },
    open: { title: '開觀光農場', text: '很多人週末想帶小孩來體驗採果，要不要把農地改成觀光農場？需要 120 萬。', type: 'farm', cost: 120, value: 200, quitJob: true },
    expand: { min: 400, title: '民宿加露營區', text: '遊客想住下來，要不要加蓋民宿和露營區？', cost: 200, mult: 1.6, rename: '觀光農場（含民宿）', sub: '遊客住下來消費更多' },
    grow: { min: 1300, title: '外銷日本', text: '日本通路商看上你的水果，想簽長期外銷合約。', label: '簽下外銷合約', mult: 2.5, rename: '農業品牌公司', sub: '國際市場打開了' },
  },
  {
    id: 'driver', name: '司機的逆襲', title: '交通運輸大亨',
    stepNames: ['司機', '車隊隊長', '租車公司', '擴大車隊', '叫車平台'],
    promo: { title: '車隊隊長', text: '車行老闆看你服務評價最高，想讓你帶領車隊。', to: '車隊隊長', mult: 1.6, sub: '管理 20 台車' },
    open: { title: '開租車公司', text: '你發現觀光客租車需求很大，要不要自己開租車公司？需要 200 萬買車。', type: 'carrental', cost: 200, value: 300 },
    expand: { min: 600, title: '擴大車隊', text: '旺季車子根本不夠租，要不要再買一批車？', cost: 300, mult: 1.6, rename: '租車公司（100 台）', sub: '車隊變大' },
    grow: { min: 1800, title: '開發叫車 App', text: '你想做自己的叫車平台，科技公司願意投資。', label: '推出叫車平台', mult: 2.6, rename: '交通科技公司', sub: '從租車變成科技公司' },
  },
  {
    id: 'plumber', name: '水電師傅的逆襲', title: '工程公司老闆',
    stepNames: ['學徒', '師傅', '工程行', '建案工程', '公共工程'],
    promo: { title: '出師當師傅', text: '你拿到甲級證照，可以自己帶學徒了。', to: '水電師傅（甲級）', mult: 1.7, sub: '工資大漲', years: 3 },
    open: { title: '開工程行', text: '找你修水電的客人多到接不完，要不要自己開工程行？需要 100 萬。', type: 'contractor', cost: 100, value: 180 },
    expand: { min: 400, title: '接建案工程', text: '建設公司想把整棟大樓的水電工程包給你。', cost: 200, mult: 1.7, rename: '水電工程公司', sub: '要多請很多師傅' },
    grow: { min: 1300, title: '標到公共工程', text: '你標到了捷運站的機電工程。', label: '接下公共工程', mult: 2.4, rename: '機電工程集團', sub: '公司規模大躍進' },
  },
  {
    id: 'esports', name: '電競選手的逆襲', title: '電競教父',
    stepNames: ['選手', '世界冠軍', '電競公司', '多支戰隊', '國際賽事'],
    promo: { title: '拿下世界冠軍', text: '你的戰隊打進世界賽決賽，最後一場由你決定勝負。', to: '世界冠軍選手', mult: 2.5, sub: '獎金和贊助大增', extra: (s) => addMoney(s, 150 * WAN), req: { int: 50 } },
    open: { title: '退役開電競公司', cond: (s) => s.age >= 26 || !s.job, text: '選手生涯很短，你想成立自己的電競公司，培養新選手。需要 150 萬。', type: 'esportsco', cost: 150, value: 250 },
    expand: { min: 500, title: '組多支戰隊', text: '贊助商想讓你的公司多組幾支戰隊，打不同遊戲。', cost: 200, mult: 1.8, rename: '電競公司（5 支戰隊）', sub: '戰隊越多，曝光越大' },
    grow: { min: 1600, title: '辦國際大賽', text: '你想在台灣辦國際電競大賽，轉播權賣得很好。', label: '舉辦國際大賽', mult: 2.5, rename: '電競娛樂集團', sub: '轉播、周邊、門票一起賺' },
  },
  {
    id: 'realtor', name: '房仲的逆襲', title: '建設公司董事長',
    stepNames: ['房仲', '店長', '加盟店', '建案代銷', '建設公司'],
    promo: { title: '升任店長', text: '你連續兩年成交量第一，公司要你當店長。', to: '房仲店長', mult: 1.9, sub: '還有業績分紅', extra: (s) => addMoney(s, 40 * WAN) },
    open: { title: '開房仲加盟店', text: '總部邀請你自己開一家加盟店。需要 150 萬。', type: 'agency', cost: 150, value: 250 },
    expand: { min: 500, title: '接建案代銷', text: '建商想請你的團隊代銷整個建案。', cost: 200, mult: 1.8, rename: '房仲代銷公司', sub: '一次賣幾百戶' },
    grow: { min: 1800, title: '自己蓋房子', text: '你對市場很熟，想自己買地蓋房子。', label: '成立建設公司', mult: 2.4, rename: '建設公司', sub: '從賣房子變成蓋房子' },
  },
  {
    id: 'police', name: '警察的逆襲', title: '安控集團董事長',
    stepNames: ['警察', '刑事組長', '保全公司', '科技園區', '安控集團'],
    promo: {
      title: '升任刑事組長', years: 3,
      text: '你帶隊破了一起跨縣市的詐騙集團案，分局長推薦你接刑事組長。',
      to: '刑事組長', mult: 1.5, sub: '還有破案獎金',
      extra: (s) => addMoney(s, 20 * WAN),
    },
    open: {
      title: '退休開保全公司',
      text: '你在警界待了這麼多年，認識的社區主委和工廠老闆都說：「你出來開保全公司，我們第一個簽。」需要 150 萬，要辦理退休。',
      type: 'security', cost: 150, value: 260,
    },
    expand: {
      min: 500, title: '接下科技園區',
      text: '一家晶圓廠要找門禁最嚴的保全，指名要「警察出身」的團隊。要先擴編人力和設備。',
      cost: 250, mult: 1.7, rename: '保全公司（科技園區）', sub: '長約、單價高',
    },
    grow: {
      min: 1500, title: '智慧安控系統',
      text: '你把辦案時學到的東西做成一套 AI 監控和門禁系統，縣市政府想整批採購。',
      label: '轉型安控科技', mult: 2.6, rename: '安控科技集團', sub: '從派人站崗變成賣系統',
    },
  },
  {
    id: 'nurse', name: '護理師的逆襲', title: '長照集團創辦人',
    stepNames: ['護理師', '護理長', '長照中心', '第二間', '政府合作'],
    promo: { title: '升任護理長', text: '你做事細心又冷靜，醫院想讓你當護理長。', to: '護理長', mult: 1.5, sub: '管理整個病房', years: 3 },
    open: { title: '開長照中心', text: '很多家庭找不到好的長照機構，你想自己開一間。需要 250 萬。', type: 'care', cost: 250, value: 380 },
    expand: { min: 700, title: '開第二間', text: '床位一直滿，排隊的人很多。', cost: 300, mult: 1.6, rename: '長照中心（連鎖）', sub: '服務更多家庭' },
    grow: { min: 1800, title: '政府合作', text: '政府想跟你合作，推動社區長照據點。', label: '接下政府計畫', mult: 2.3, rename: '長照集團', sub: '全台都有據點' },
  },
  {
    id: 'designer', name: '設計師的逆襲', title: '設計公司創辦人',
    stepNames: ['設計師', '藝術總監', '工作室', '企業大案', '國際品牌'],
    promo: { title: '升任藝術總監', text: '你設計的廣告得獎了，公司要你帶整個設計部。', to: '藝術總監', mult: 1.7, sub: '作品被更多人看見' },
    open: { title: '成立設計工作室', text: '很多客戶想直接找你，你想自己開工作室。需要 80 萬。', type: 'studio', cost: 80, value: 150 },
    expand: { min: 350, title: '接到大企業案子', text: '一家大企業想請你重新設計整個品牌形象。', cost: 150, mult: 1.9, rename: '設計公司', sub: '要多請設計師' },
    grow: { min: 1200, title: '國際品牌合作', text: '國際精品品牌找你聯名合作。', label: '接下國際合作', mult: 2.6, rename: '國際設計集團', sub: '名氣和收入大爆發' },
  },
  {
    id: 'attendant', name: '空服員的逆襲', title: '美姿美儀女王／天王',
    stepNames: ['空服員', '座艙長', '開學院', '線上課程', '進軍海外'],
    promo: { title: '升任座艙長', text: '你服務評價很高，公司要升你當座艙長。', to: '座艙長', mult: 1.5, sub: '帶領整個機組' },
    open: { title: '開美姿美儀學院', text: '很多年輕人想當空服員，你想開一間教面試和禮儀的學院。需要 100 萬。', type: 'beauty', cost: 100, value: 180 },
    expand: { min: 400, title: '推出線上課程', text: '課程很受歡迎，要不要錄成線上課程？', cost: 150, mult: 1.9, rename: '美姿美儀學院（線上＋實體）', sub: '學生遍布全台' },
    grow: { min: 1300, title: '進軍海外', text: '東南亞的航空公司想跟你合作培訓。', label: '進軍海外', mult: 2.4, rename: '國際培訓集團', sub: '市場變大好幾倍' },
  },
  {
    id: 'pharmacist', name: '藥師的逆襲', title: '連鎖藥局董事長',
    stepNames: ['藥師', '藥局主任', '開藥局', '開分店', '藥妝品牌'],
    promo: { title: '升任藥局主任', text: '你對藥品很熟，醫院想讓你管理整個藥局。', to: '藥局主任', mult: 1.4, sub: '薪水提高', years: 3 },
    open: { title: '開社區藥局', text: '你家附近沒有藥局，要不要自己開一間？需要 250 萬。', type: 'pharmacy', cost: 250, value: 380 },
    expand: { min: 700, title: '開分店', text: '社區居民都很信任你，隔壁區也想要一間。', cost: 300, mult: 1.6, rename: '連鎖藥局', sub: '開到 5 間' },
    grow: { min: 1800, title: '轉型藥妝', text: '你想把藥局變成藥妝店，賣保養品和保健食品。', label: '轉型藥妝集團', mult: 2.3, rename: '藥妝集團', sub: '年輕客人大增' },
  },
  {
    id: 'accountant', name: '會計師的逆襲', title: '財務顧問教父',
    stepNames: ['會計師', '合夥人', '事務所', '輔導上市', '併購顧問'],
    promo: { title: '升任合夥人', text: '事務所想讓你成為合夥人。', to: '合夥會計師', mult: 1.7, sub: '分紅大增', years: 3 },
    open: { title: '開自己的事務所', text: '你有很多老客戶，想自己開事務所。需要 200 萬。', type: 'acctfirm', cost: 200, value: 380 },
    expand: { min: 700, title: '輔導公司上市', text: '好幾家公司想請你輔導上市。', cost: 200, mult: 1.8, rename: '會計師事務所（上市輔導）', sub: '案子金額更大' },
    grow: { min: 1800, title: '併購顧問', text: '跨國企業想請你當併購顧問。', label: '成立顧問集團', mult: 2.3, rename: '財務顧問集團', sub: '國際級客戶' },
  },
  {
    id: 'architect', name: '建築師的逆襲', title: '建築大師',
    stepNames: ['建築師', '主持建築師', '事務所', '國際大獎', '建設公司'],
    promo: { title: '主持建築師', text: '你設計的圖書館得到好評，公司要你主持大型案子。', to: '主持建築師', mult: 1.6, sub: '負責整個專案', years: 3 },
    open: { title: '開建築師事務所', text: '建商想直接找你設計，你想自己開事務所。需要 200 萬。', type: 'archfirm', cost: 200, value: 330 },
    expand: { min: 600, title: '國際建築獎', text: '你的作品得到國際建築大獎，案子接不完。', cost: 250, mult: 1.9, rename: '建築設計公司', sub: '擴編團隊' },
    grow: { min: 1800, title: '自己當建商', text: '你想自己買地、設計、蓋房子。', label: '成立建設公司', mult: 2.4, rename: '建築開發集團', sub: '從設計到開發一手包辦' },
  },
  {
    id: 'pilot', name: '機師的逆襲', title: '航空業大老',
    stepNames: ['副機長', '機長', '飛行學校', '擴大機隊', '包機公司'],
    promo: { title: '升任機長', text: '你的飛行時數夠了，可以參加機長考核。', to: '機長', mult: 1.5, sub: '考核有一定難度', years: 3, req: { hp: 60 } },
    open: { title: '開飛行學校', text: '想當機師的人越來越多，你想開一間飛行學校。需要 500 萬。', type: 'flightschool', cost: 500, value: 750 },
    expand: { min: 1100, title: '買更多教練機', text: '學生排隊排到明年，要不要再買幾架教練機？', cost: 400, mult: 1.6, rename: '飛行學校（10 架教練機）', sub: '一次收更多學生' },
    grow: { min: 2500, title: '成立包機公司', text: '企業老闆們想包機出差，你想成立包機公司。', label: '成立包機公司', mult: 2.2, rename: '航空集團', sub: '從教飛行到經營航空' },
  },
];

export const ROUTES = {
  clerk: {
    name: '超商店員的逆襲', title: '便利商店大亨',
    stepNames: ['店員', '店長', '自己開店', '第二家店', '連鎖大亨'],
    steps: [
      { minYears: 2, cond: inJob('clerk', 2), title: '升任店長？', text: '區經理說你做事細心、客人都喜歡你，問你要不要接下店長。', choices: promoteChoices('超商店長', 1.7, '年薪大約多七成') },
      { minYears: 2, cond: inJob('clerk'), title: '自己開一家店？', text: '總公司注意到你當店長的表現，問你要不要自己加盟一間店。加盟金加上裝潢，總共需要 200 萬。', choices: openBizChoices('clerk', 'store', 200 * WAN, 300 * WAN) },
      { minYears: 2, cond: bizOf('clerk', 500 * WAN), title: '開第二家店', text: '隔壁街的店面要出租，人潮比你現在的店還多。', choices: expandChoices('clerk', 300 * WAN, 1.5, '便利商店（2 家）', '店數變兩倍') },
      { minYears: 3, cond: bizOf('clerk', 1500 * WAN), title: '連鎖化', text: '你的兩家店經營得有聲有色，投資人想幫你把店開遍全台。', choices: freeGrow('clerk', '引進投資人，開連鎖', 2.5, '連鎖便利商店', '一口氣開 30 家') },
    ],
  },
  delivery: {
    name: '外送員的逆襲', title: '物流大亨',
    stepNames: ['外送員', '外送王', '物流公司', '電商合約', '物流大亨'],
    steps: [
      { minYears: 2, cond: inJob('delivery', 2), title: '外送王', text: '你是全區評價最高的外送員，其他外送員想跟著你一起接大單。', choices: promoteChoices('車隊隊長', 1.5, '帶領 10 人車隊') },
      { minYears: 2, cond: inJob('delivery'), title: '物流商機', text: '你發現很多小店家找不到可靠的配送，想開一家物流公司，需要 150 萬買車。', choices: openBizChoices('delivery', 'logistics', 150 * WAN, 250 * WAN) },
      { minYears: 2, cond: bizOf('delivery', 500 * WAN), title: '電商大合約', text: '一家大型電商平台想把北部配送全包給你，但你要先買更多車。', choices: expandChoices('delivery', 300 * WAN, 1.8, '物流公司（電商合作）', '業績翻倍') },
      { minYears: 3, cond: bizOf('delivery', 1500 * WAN), title: '全國布局', text: '你的物流公司已經小有名氣，創投想投資你拓展到全台。', choices: freeGrow('delivery', '全台布局！', 2.4, '全台物流集團', '公司價值大增') },
    ],
  },
  worker: {
    name: '作業員的逆襲', title: '隱形冠軍老闆',
    stepNames: ['作業員', '技術師傅', '專利發明', '開工廠', '隱形冠軍'],
    steps: [
      { minYears: 3, cond: inJob('worker', 3), title: '成為師傅', text: '老師傅要退休了，他想把手藝傳給你。', choices: promoteChoices('技術師傅', 1.6, '學會精密加工', (s) => addStats(s, { int: 3 })) },
      {
        minYears: 2, cond: inJob('worker'), title: '一個發明', text: '你想到一個讓機台效率提升三成的改良方法，要不要花 20 萬申請專利？',
        choices: [
          {
            label: '申請專利（20 萬）', sub: '可能賺到授權金', advance: true,
            effect: (s, rng) => { s.money -= 20 * WAN; const fee = rint(rng, 150, 400) * WAN; return good(`專利通過！好幾家工廠付錢使用你的技術。${addMoney(s, fee)}${addStats(s, { int: 4, happy: 6 })}`); },
          },
          { label: '免費分享給公司', sub: '人緣上升', effect: (s) => `老闆很感謝你。${addStats(s, { charm: 4 })}` },
        ],
      },
      { minYears: 2, cond: (s) => s.job && s.job.id === 'worker', title: '自己開工廠', text: '有了專利和手藝，你可以自己開一間精密加工廠，需要 300 萬。', choices: openBizChoices('worker', 'factory', 300 * WAN, 450 * WAN) },
      { minYears: 3, cond: bizOf('worker', 1200 * WAN), title: '國際大單', text: '一家國際大廠看上你的技術，要下長期訂單，你的工廠要擴建。', choices: freeGrow('worker', '接下國際訂單', 2.6, '精密工業', '成為國際大廠供應商') },
    ],
  },
  sales: {
    name: '業務員的逆襲', title: '貿易大亨',
    stepNames: ['業務員', '業務冠軍', '業務總監', '貿易公司', '貿易大亨'],
    steps: [
      { minYears: 2, cond: inJob('sales', 2), title: '業務冠軍', text: '你連續三季拿下全公司業績第一，老闆要升你當主任。', choices: promoteChoices('業務主任', 1.6, '還有 30 萬獎金', (s) => addMoney(s, 30 * WAN)) },
      { minYears: 3, cond: inJob('sales'), title: '業務總監', text: '公司要開拓海外市場，想請你帶領整個業務部。', choices: promoteChoices('業務總監', 1.7, '年薪大漲，但更累') },
      { minYears: 2, cond: inJob('sales'), title: '自己出來做', text: '你手上累積了很多客戶，他們都說只要你開公司就跟你合作。開貿易公司需要 200 萬。', choices: openBizChoices('sales', 'trade', 200 * WAN, 350 * WAN) },
      { minYears: 3, cond: bizOf('sales', 1200 * WAN), title: '打入國際市場', text: '一家歐洲通路商想獨家代理你的產品。', choices: freeGrow('sales', '簽下獨家合約', 2.6, '國際貿易集團', '業績大爆發') },
    ],
  },
  teacher: {
    name: '補習班老師的逆襲', title: '補教天王',
    stepNames: ['老師', '名師', '開補習班', '開分校', '補教天王'],
    steps: [
      { minYears: 2, cond: inJob('teacher', 2), title: '成為名師', text: '你的學生成績突飛猛進，家長口耳相傳，班主任想幫你開個人品牌班。', choices: promoteChoices('補教名師', 2.0, '學生暴增，薪水翻倍', (s) => addStats(s, { charm: 4 })) },
      { minYears: 2, cond: inJob('teacher'), title: '開自己的補習班', text: '很多家長說：「老師你自己開班，我們一定跟過去！」開一間補習班需要 150 萬。', choices: openBizChoices('teacher', 'school', 150 * WAN, 250 * WAN) },
      { minYears: 2, cond: bizOf('teacher', 500 * WAN), title: '開分校', text: '隔壁區的家長也想讓孩子來上課，要不要開分校？', choices: expandChoices('teacher', 200 * WAN, 1.8, '補習班（3 間分校）', '學生人數大增') },
      { minYears: 3, cond: bizOf('teacher', 1500 * WAN), title: '線上課程爆紅', text: '你的課程錄成影片上架，全台學生都在買。', choices: freeGrow('teacher', '全力發展線上課程', 2.5, '補教集團', '收入不受教室大小限制') },
    ],
  },
  civil: {
    name: '公務員的理財路線', title: '包租公',
    stepNames: ['公務員', '開始理財', '科長', '公教房貸', '收租', '都更改建'],
    steps: [
      {
        minYears: 1, cond: inJob('civil', 1), title: '公教理財講座', text: '單位辦了一場理財講座，講師說：「薪水穩定的人，最適合定期定額。」',
        choices: [
          { label: '開始定期定額（薪水的 30%）', sub: '每年自動買 ETF', advance: true, effect: (s) => { s.dca = Math.max(s.dca, 30); addSkill(s, 1); return good(`你設定好定期定額，投資眼光也提升了。${addStats(s, { int: 2 })}`); } },
          { label: '錢放銀行比較安心', sub: '之後還有機會', effect: () => '你覺得投資太可怕了。' },
        ],
      },
      { minYears: 3, cond: inJob('civil'), title: '考上高考', text: '你利用下班時間準備高考，有機會升官。', choices: promoteChoices('科長', 1.5, '薪水提高', (s) => addStats(s, { int: 3 })) },
      {
        minYears: 2, cond: (s) => s.job && s.job.id === 'civil' && s.houses.length === 0, title: '公教優惠房貸', text: '公教人員可以申請低利房貸，現在買房頭期款只要一成。',
        choices: HOUSES.slice(0, 2).map((h) => ({
          label: `買${h.name}（頭期款一成）`,
          sub: '依現在房價計算',
          cond: (s) => s.money >= housePrice(s, h) * 0.1,
          advance: true,
          effect: (s) => {
            const price = housePrice(s, h);
            s.money -= price * 0.1;
            const uid = `h${s.uid++}`;
            s.flags.everHouse = true; s.houses.push({ uid, id: h.id, name: h.name, value: price, price });
            addDebt(s, `房貸：${h.name}`, price * 0.9, MORTGAGE_RATE * 0.7, { houseUid: uid });
            return good(`你用 ${formatMoney(price)} 買下了${h.name}！${addStats(s, { happy: h.happy })}`);
          },
        })).concat([{ label: '再存幾年錢', sub: '之後還有機會', effect: () => '你決定再存一點錢。' }]),
      },
      { minYears: 3, cond: (s) => s.houses.length > 0, title: '收購老公寓', text: '房仲說附近有整棟老公寓要賣，整修後出租，每年都有穩定租金。', choices: openBizChoices('civil', 'rental', 300 * WAN, 600 * WAN, { quitJob: false }) },
      { minYears: 4, cond: bizOf('civil', 1000 * WAN), title: '都市更新', text: '你持有的老公寓被劃入都更範圍，建商提出很好的合建條件。', choices: freeGrow('civil', '同意都更', 3, '都更建案', '房產價值大翻身') },
    ],
  },
  engineer: {
    name: '工程師的逆襲', title: '科技新貴',
    stepNames: ['工程師', '資深工程師', '副業 App', '創業', '上市'],
    steps: [
      { minYears: 2, cond: inJob('engineer', 2), title: '資深工程師', text: '你負責的系統上線很成功，主管推薦你升資深工程師。', choices: promoteChoices('資深工程師', 1.4, '薪水提高') },
      {
        minYears: 2, cond: inJob('engineer'), title: '下班寫 App', text: '你想利用下班時間寫一個記帳 App 上架。',
        choices: [
          {
            odds: (s) => Math.min(1, 0.4 + s.stats.int / 250), label: '寫！', sub: '會比較累', advance: true,
            effect: (s, rng) => (chance(rng, 0.4 + s.stats.int / 250)
              ? good(`App 衝上排行榜！廣告和訂閱收入超乎想像。${addMoney(s, rint(rng, 150, 400) * WAN)}${addStats(s, { happy: 8, hp: -3 })}`)
              : `下載量普普通通，但你學到很多。${addMoney(s, 20 * WAN)}${addStats(s, { int: 4, hp: -3 })}`),
          },
          { label: '下班要休息', sub: '之後還有機會', effect: (s) => `你選擇好好休息。${addStats(s, { hp: 2 })}` },
        ],
      },
      { minYears: 2, cond: inJob('engineer'), title: '辭職創業', text: '你的 App 有投資人感興趣，但你要辭職全心投入，並拿出 300 萬。', choices: openBizChoices('engineer', 'startup', 300 * WAN, 500 * WAN) },
      { minYears: 3, cond: bizOf('engineer', 1500 * WAN), title: '公司上市', text: '公司營收穩定成長，券商建議你申請上市。', choices: freeGrow('engineer', '申請上市！', 3, 'App 上市公司', '公司價值大漲') },
    ],
  },
  analyst: {
    name: '分析師的逆襲', title: '投資教父',
    stepNames: ['分析師', '基金經理', '最佳基金', '開投顧', '百億規模'],
    steps: [
      { minYears: 2, cond: inJob('analyst', 2), title: '基金經理', text: '你的研究報告很準，公司想讓你管理一檔基金。', choices: promoteChoices('基金經理', 1.5, '投資眼光大幅提升', (s) => { addSkill(s, 2); return ''; }) },
      {
        minYears: 2, cond: inJob('analyst'), title: '年度最佳基金', text: '你管理的基金績效全市場第一，公司要發給你一大筆獎金。',
        choices: [
          { label: '收下獎金', sub: '100～300 萬', advance: true, effect: (s, rng) => good(`你拿到了豐厚的績效獎金。${addMoney(s, rint(rng, 100, 300) * WAN)}${addStats(s, { happy: 6 })}`) },
          { label: '換成公司股票', sub: '留在公司更久', advance: true, effect: (s, rng) => good(`你拿到了公司股票。${(() => { const v = rint(rng, 150, 400) * WAN; s.stock += v; return `（股票+${formatMoney(v)}）`; })()}`) },
        ],
      },
      { minYears: 2, cond: inJob('analyst'), title: '自立門戶', text: '有幾位大客戶希望你自己開投顧公司幫他們管錢，需要 300 萬。', choices: openBizChoices('analyst', 'fund', 300 * WAN, 500 * WAN) },
      { minYears: 3, cond: bizOf('analyst', 1500 * WAN), title: '管理規模破百億', text: '你的投顧公司名氣越來越大，有退休基金想委託你操盤。', choices: freeGrow('analyst', '接下委託', 2.6, '資產管理集團', '管理費收入大增') },
    ],
  },
  lawyer: {
    name: '律師的逆襲', title: '金牌律師',
    stepNames: ['律師', '合夥人', '跨國大案', '開事務所', '金牌律師'],
    steps: [
      { minYears: 3, cond: inJob('lawyer', 3), title: '升任合夥人', text: '事務所想讓你成為合夥人。', choices: promoteChoices('合夥律師', 1.6, '分紅大增') },
      {
        minYears: 2, cond: inJob('lawyer'), title: '跨國併購案', text: '一家大企業指名要你處理跨國併購案，但要連續熬夜好幾個月。',
        choices: [
          { label: '接下來', sub: '報酬 300～800 萬', advance: true, effect: (s, rng) => good(`案子圓滿成功，你一戰成名！${addMoney(s, rint(rng, 300, 800) * WAN)}${addStats(s, { hp: -6, charm: 5 })}`) },
          { label: '身體要緊', sub: '之後還有機會', effect: (s) => `你婉拒了。${addStats(s, { hp: 1 })}` },
        ],
      },
      { minYears: 2, cond: inJob('lawyer'), title: '開自己的事務所', text: '你的名氣夠大了，可以自己開事務所，需要 300 萬。', choices: openBizChoices('lawyer', 'lawfirm', 300 * WAN, 600 * WAN) },
      { minYears: 3, cond: bizOf('lawyer', 1500 * WAN), title: '國際化', text: '國際大型事務所想跟你合併。', choices: freeGrow('lawyer', '合併！', 2.5, '國際法律事務所', '規模大增') },
    ],
  },
  doctor: {
    name: '醫生的逆襲', title: '名醫院長',
    stepNames: ['醫生', '主治醫師', '開診所', '醫美連鎖', '醫療集團'],
    steps: [
      { minYears: 3, cond: inJob('doctor', 3), title: '升任主治醫師', text: '你的醫術受到肯定，升任主治醫師。', choices: promoteChoices('主治醫師', 1.3, '薪水提高，但值班更多') },
      { minYears: 2, cond: inJob('doctor'), title: '開診所', text: '很多病人希望你自己開診所，開業需要 500 萬。', choices: openBizChoices('doctor', 'clinic', 500 * WAN, 800 * WAN) },
      { minYears: 3, cond: bizOf('doctor', 1200 * WAN), title: '醫美連鎖', text: '你的診所口碑很好，有人找你合作開醫美連鎖。', choices: expandChoices('doctor', 500 * WAN, 2, '醫美連鎖診所', '開 5 間分院') },
      { minYears: 3, cond: bizOf('doctor', 4000 * WAN), title: '醫療集團', text: '財團想跟你一起成立醫療集團。', choices: freeGrow('doctor', '成立醫療集團', 1.8, '醫療集團', '規模更大') },
    ],
  },
  influencer: {
    name: '網紅的逆襲', title: '網紅天王',
    stepNames: ['網紅', '百萬訂閱', '自有品牌', '直播爆單', '國際網紅'],
    steps: [
      {
        minYears: 1, cond: inJob('influencer', 1), title: '百萬訂閱', text: '你的頻道衝破百萬訂閱！廠商排隊找你業配。',
        choices: [
          { label: '接更多業配', sub: '收入大增', advance: true, effect: (s) => { s.job.name = '百萬網紅'; s.job.boost = 3; return good(`你成為百萬網紅，收入變成以前的三倍。${addStats(s, { charm: 5, happy: 8 })}`); } },
          { label: '只接喜歡的', sub: '之後還有機會', effect: (s) => `你堅持內容品質。${addStats(s, { charm: 2 })}` },
        ],
      },
      { minYears: 2, cond: inJob('influencer'), title: '自創品牌', text: '粉絲一直問你用的東西在哪買，要不要乾脆自己出品牌？需要 100 萬。', choices: openBizChoices('influencer', 'brand', 100 * WAN, 300 * WAN, { quitJob: false }) },
      { minYears: 2, cond: bizOf('influencer', 500 * WAN), title: '直播爆單', text: '你的直播一晚賣出上萬件，倉庫快爆了。', choices: expandChoices('influencer', 200 * WAN, 2.2, '自有品牌（電商）', '擴大倉儲和產線') },
      { minYears: 3, cond: bizOf('influencer', 2000 * WAN), title: '進軍國際', text: '國外通路想上架你的品牌。', choices: freeGrow('influencer', '進軍國際！', 2.2, '國際品牌', '海外營收大增') },
    ],
  },
  athlete: {
    name: '運動員的逆襲', title: '健身帝國創辦人',
    stepNames: ['運動員', '明星球員', '退役轉型', '連鎖健身房', '健身品牌'],
    steps: [
      { minYears: 2, cond: (s) => inJob('athlete', 2)(s) && s.stats.hp >= 60, title: '明星球員', text: '你在比賽中大放異彩，成為聯盟明星，代言找上門。', choices: promoteChoices('明星球員', 1.8, '還有 200 萬代言費', (s) => addMoney(s, 200 * WAN)) },
      { minYears: 1, cond: (s) => s.age >= 32 || !s.job, title: '退役後的路', text: '運動員的職業生涯很短，你想開一間健身房，需要 200 萬。', choices: openBizChoices('athlete', 'gym', 200 * WAN, 350 * WAN) },
      { minYears: 2, cond: bizOf('athlete', 600 * WAN), title: '開連鎖健身房', text: '會員爆滿，大家都想跟明星教練一起練。', choices: expandChoices('athlete', 300 * WAN, 1.8, '連鎖健身房', '開到 10 間') },
      { minYears: 3, cond: bizOf('athlete', 2000 * WAN), title: '健身品牌', text: '你推出自己的運動用品和線上課程。', choices: freeGrow('athlete', '推出品牌', 2.2, '健身集團', '全台都知道你') },
    ],
  },
  // 自己創業（任何職業都能走）
  founder: {
    name: '創業家之路', title: '白手起家的創業家',
    stepNames: ['創業', '展店', '募資', '上市'],
    steps: [
      { minYears: 2, cond: bizOf('founder', 250 * WAN), title: '第一次擴張', text: '生意越來越好，要不要擴大規模？', choices: expandChoices('founder', 150 * WAN, 1.6, null, '規模擴大') },
      { minYears: 3, cond: bizOf('founder', 1000 * WAN), title: '創投來敲門', text: '創投想投資你的公司。', choices: freeGrow('founder', '接受投資', 2.2, null, '公司價值大增') },
      { minYears: 3, cond: bizOf('founder', 3000 * WAN), title: '申請上市', text: '公司規模夠大了，可以申請上市。', choices: freeGrow('founder', '上市！', 2, null, '成為上市公司') },
    ],
  },
};

// 第三批行業的逆襲路線
const NEW_ROUTES2 = [
  {
    id: 'postman', name: '郵差的逆襲', title: '物流帝國創辦人',
    stepNames: ['郵差', '郵務主任', '開快遞行', '電商大單', '配送平台'],
    promo: { title: '升郵務主任', text: '你十年沒送錯過一封信，局長想讓你管整個郵務班。', to: '郵務主任', mult: 1.6, sub: '管一整個轄區' },
    open: { title: '自己開快遞行', text: '網購越來越多，你熟悉每一條巷子。開一家快遞行需要 150 萬。', type: 'courier', cost: 150, value: 230 },
    expand: { min: 450, title: '接下電商大單', text: '一家電商想把整個南區的配送交給你，但你要先買車。', cost: 250, mult: 1.7, rename: '快遞公司（車隊）', sub: '一口氣買十台車' },
    grow: { min: 1500, title: '做自己的配送平台', text: '你把路線和時間都寫成系統，同業想付費使用。', label: '推出配送平台', mult: 2.4, rename: '物流科技公司', sub: '從跑腿變成平台' },
  },
  {
    id: 'guard', name: '保全的逆襲', title: '保全集團董事長',
    stepNames: ['保全', '隊長', '開保全公司', '接大樓', '系統保全'],
    promo: { title: '升保全隊長', text: '你擋下了一次竊案，公司想讓你帶整個班。', to: '保全隊長', mult: 1.7, sub: '帶一整隊人' },
    open: { title: '自己開保全公司', text: '幾個熟識的社區主委說，只要你開公司就跟你簽約。需要 120 萬。', type: 'security', cost: 120, value: 200 },
    expand: { min: 400, title: '接下商辦大樓', text: '一棟商辦要找駐衛保全，簽三年約，但你要先擴編人力。', cost: 200, mult: 1.6, rename: '保全公司（商辦案）', sub: '長約收入穩定' },
    grow: { min: 1300, title: '改做系統保全', text: '你導入監控和感測系統，一個人可以顧十棟樓。', label: '轉型系統保全', mult: 2.4, rename: '智慧保全集團', sub: '人力成本大降' },
  },
  {
    id: 'cleaner', name: '清潔隊員的逆襲', title: '環保產業大亨',
    stepNames: ['清潔隊員', '班長', '開清潔公司', '接標案', '資源回收廠'],
    promo: { title: '升清潔隊班長', text: '你對每一條路線都瞭若指掌，隊長想升你當班長。', to: '清潔隊班長', mult: 1.6, sub: '帶一整條路線' },
    open: { title: '開清潔公司', text: '你看準辦公大樓的清潔需求，開一家清潔公司需要 100 萬。', type: 'cleanco', cost: 100, value: 170 },
    expand: { min: 350, title: '標到公家案子', text: '市府的清潔標案開標了，得標就有穩定收入，但要先投入設備。', cost: 200, mult: 1.7, rename: '清潔公司（含標案）', sub: '公家長期合約' },
    grow: { min: 1200, title: '做資源回收', text: '你發現真正賺錢的是回收物分類再製，要不要蓋一座回收廠？', label: '蓋資源回收廠', mult: 2.5, rename: '環保資源公司', sub: '垃圾變成黃金' },
  },
  {
    id: 'baker', name: '麵包師的逆襲', title: '烘焙品牌創辦人',
    stepNames: ['麵包師', '烘焙主廚', '開麵包店', '中央廚房', '世界冠軍'],
    promo: { title: '升烘焙主廚', text: '你做的吐司賣到每天中午就完售，老闆讓你決定整家店的產品。', to: '烘焙主廚', mult: 1.7, sub: '整家店的產品你決定' },
    open: { title: '開自己的麵包店', text: '你想開一家自己的店，用最好的麵粉。需要 200 萬。', type: 'bakery', cost: 200, value: 300 },
    expand: { min: 600, title: '蓋中央廚房', text: '訂單多到做不完，蓋一座中央廚房就能供貨給其他店。', cost: 300, mult: 1.7, rename: '烘焙坊（含中央廚房）', sub: '產量一口氣拉高' },
    grow: { min: 1600, title: '拿下國際麵包賽', text: '你的作品拿下國際麵包大賽名次，通路商搶著要跟你合作。', label: '推出自有品牌', mult: 2.5, rename: '烘焙品牌集團', sub: '進超商和百貨' },
  },
  {
    id: 'barista', name: '咖啡師的逆襲', title: '咖啡連鎖創辦人',
    stepNames: ['咖啡師', '店長', '開咖啡店', '第二家店', '自烘品牌'],
    promo: { title: '升店長', text: '你拉的花讓客人天天排隊，老闆想讓你當店長。', to: '咖啡店長', mult: 1.6, sub: '管整家店' },
    open: { title: '開自己的咖啡店', text: '巷口有一間空店面，你想開一家自己的咖啡店。需要 180 萬。', type: 'cafe', cost: 180, value: 270 },
    expand: { min: 500, title: '開第二家店', text: '你的店成了打卡名店，房東說隔壁那間也要租出去。', cost: 250, mult: 1.7, rename: '咖啡店（兩家店）', sub: '複製成功的模式' },
    grow: { min: 1500, title: '自己烘豆子', text: '你決定自己進生豆、自己烘，把豆子賣給其他咖啡店。', label: '成立自烘品牌', mult: 2.4, rename: '咖啡品牌公司', sub: '從賣咖啡變成賣豆子' },
  },
  {
    id: 'bartender', name: '調酒師的逆襲', title: '夜生活集團老闆',
    stepNames: ['調酒師', '首席調酒師', '開酒吧', '亞洲五十大', '自有酒款'],
    promo: { title: '首席調酒師', text: '你的招牌調酒被雜誌報導，老闆升你當首席。', to: '首席調酒師', mult: 1.8, sub: '整本酒單你決定' },
    open: { title: '開自己的酒吧', text: '你想開一間只有二十個位子的隱藏酒吧。需要 200 萬。', type: 'bar', cost: 200, value: 300 },
    expand: { min: 550, title: '拿下亞洲五十大', text: '你的酒吧入選亞洲五十大，觀光客天天排隊，要不要開大店？', cost: 300, mult: 1.8, rename: '酒吧（旗艦店）', sub: '座位變三倍' },
    grow: { min: 1600, title: '推出自有酒款', text: '酒廠找你合作，把你的配方做成瓶裝酒上架。', label: '推出瓶裝酒', mult: 2.4, rename: '酒品牌公司', sub: '賣到全世界' },
  },
  {
    id: 'trainer', name: '健身教練的逆襲', title: '健身帝國創辦人',
    stepNames: ['教練', '首席教練', '開工作室', '擴大場地', '線上課程'],
    promo: { title: '升首席教練', text: '你的會員續約率全店最高，店長想讓你帶新教練。', to: '首席教練', mult: 1.8, sub: '抽成變多' },
    open: { title: '開私人教練工作室', text: '你的學員說只要你開店，他們都跟你走。需要 150 萬。', type: 'ptstudio', cost: 150, value: 240 },
    expand: { min: 450, title: '擴大場地', text: '課排到晚上十一點還排不完，要不要換大場地、請更多教練？', cost: 250, mult: 1.7, rename: '健身工作室（旗艦館）', sub: '同時開更多課' },
    grow: { min: 1400, title: '線上課程爆紅', text: '你的線上課程賣到全世界華人，還有廠商想找你代言。', label: '做線上健身品牌', mult: 2.5, rename: '健身品牌公司', sub: '不用到場也能賺' },
  },
  {
    id: 'yogateacher', name: '瑜伽老師的逆襲', title: '身心靈品牌創辦人',
    stepNames: ['瑜伽老師', '資深導師', '開會館', '師資培訓', '海外靜修營'],
    promo: { title: '成為資深導師', text: '你考到了國際證照，會館想讓你帶師資班。', to: '資深瑜伽導師', mult: 1.7, sub: '可以教老師' },
    open: { title: '開自己的瑜伽會館', text: '你想要一個真正安靜的空間。開一家會館需要 160 萬。', type: 'yogahouse', cost: 160, value: 250 },
    expand: { min: 450, title: '開師資培訓班', text: '很多人想當瑜伽老師，你的培訓課一開就滿。', cost: 220, mult: 1.7, rename: '瑜伽會館（含師培）', sub: '學費收入高很多' },
    grow: { min: 1400, title: '海外靜修營', text: '你在峇里島辦的靜修營一位難求，國際品牌想跟你合作。', label: '做國際靜修品牌', mult: 2.4, rename: '身心靈品牌公司', sub: '學員來自全世界' },
  },
  {
    id: 'guide', name: '導遊的逆襲', title: '旅遊集團董事長',
    stepNames: ['導遊', '國際領隊', '開旅行社', '包機', '訂票平台'],
    promo: { title: '升國際領隊', text: '你的團員回國後都指名要你，公司升你當領隊。', to: '國際領隊', mult: 1.7, sub: '帶出國團，小費也多' },
    open: { title: '開自己的旅行社', text: '你想做自己設計的深度旅遊。開一家旅行社需要 180 萬。', type: 'travelco', cost: 180, value: 280 },
    expand: { min: 500, title: '包下整架班機', text: '旺季機位一位難求，包機可以把成本壓到最低，但要先付訂金。', cost: 300, mult: 1.8, rename: '旅行社（包機團）', sub: '風險高但利潤大' },
    grow: { min: 1500, title: '做訂房訂票平台', text: '你把行程做成網站，客人自己下單，你只要抽成。', label: '推出旅遊平台', mult: 2.5, rename: '旅遊科技公司', sub: '睡覺也有訂單' },
  },
  {
    id: 'translator', name: '翻譯的逆襲', title: '語言服務集團創辦人',
    stepNames: ['翻譯', '同步口譯', '開翻譯社', '政府標案', 'AI 翻譯'],
    promo: { title: '轉做同步口譯', text: '國際會議缺同步口譯，你決定挑戰這個一小時抵一天的工作。', to: '同步口譯員', mult: 1.9, sub: '時薪高很多', req: { int: 62 } },
    open: { title: '開翻譯社', text: '案子多到你一個人接不完，成立翻譯社需要 100 萬。', type: 'transco', cost: 100, value: 170 },
    expand: { min: 350, title: '接下政府標案', text: '政府的長期翻譯標案需要一整組譯者和審稿。', cost: 200, mult: 1.7, rename: '翻譯公司（政府案）', sub: '穩定的長期合約' },
    grow: { min: 1200, title: '做 AI 翻譯工具', text: '你用累積多年的語料訓練了一套翻譯模型，企業搶著訂閱。', label: '推出 AI 翻譯', mult: 2.6, rename: '語言科技公司', sub: '從接案變成賣軟體' },
  },
  {
    id: 'reporter', name: '記者的逆襲', title: '媒體集團創辦人',
    stepNames: ['記者', '主編', '網路媒體', '流量破百萬', '會員訂閱'],
    promo: { title: '升採訪主編', text: '你的獨家報導上了頭版，報社升你當主編。', to: '採訪主編', mult: 1.7, sub: '帶一整組記者' },
    open: { title: '自己做網路媒體', text: '你受不了下標要騙點閱，決定自己做一家媒體。需要 150 萬。', type: 'media', cost: 150, value: 240 },
    expand: { min: 450, title: '流量破百萬', text: '你的深度報導被瘋傳，廣告主主動上門，但你需要更多記者。', cost: 250, mult: 1.8, rename: '網路媒體（百萬流量）', sub: '廣告收入大增' },
    grow: { min: 1500, title: '做會員訂閱制', text: '你推出付費訂閱，讀者願意為了好報導掏錢。', label: '推出訂閱制', mult: 2.4, rename: '媒體集團', sub: '不再靠廣告吃飯' },
  },
  {
    id: 'writer', name: '作家的逆襲', title: '暢銷作家兼出版人',
    stepNames: ['作家', '暢銷作家', '開出版社', '簽新作者', '影視版權'],
    promo: { title: '一本書爆紅', text: '你的新書意外在網路上被瘋傳，出版社要再刷十刷。', to: '暢銷作家', mult: 2.4, sub: '版稅收入翻好幾倍' },
    open: { title: '自己開出版社', text: '你不想再被抽成，決定自己出版。成立出版社需要 150 萬。', type: 'publisher', cost: 150, value: 240 },
    expand: { min: 450, title: '簽下新人作者', text: '你看中幾個很有潛力的新人，簽下來需要預付版稅。', cost: 250, mult: 1.7, rename: '出版社（作家經紀）', sub: '別人寫書你也賺' },
    grow: { min: 1500, title: '賣出影視版權', text: '串流平台看上你的小說，想改編成影集。', label: '賣出影視版權', mult: 2.6, rename: 'IP 版權公司', sub: '一個故事賣好幾次' },
  },
  {
    id: 'photographer', name: '攝影師的逆襲', title: '影像品牌創辦人',
    stepNames: ['攝影師', '首席攝影', '開工作室', '品牌廣告', '影像公司'],
    promo: { title: '成為首席攝影', text: '你拍的婚紗被雜誌選為年度封面，公司升你當首席。', to: '首席攝影師', mult: 1.8, sub: '接案價碼翻倍' },
    open: { title: '開攝影工作室', text: '你想要自己的棚。租下場地、買齊器材需要 150 萬。', type: 'photostudio', cost: 150, value: 240 },
    expand: { min: 450, title: '接下品牌廣告', text: '大品牌想找你拍整季的形象照，但你需要一整組人。', cost: 250, mult: 1.7, rename: '攝影工作室（商業團隊）', sub: '一個案子抵半年' },
    grow: { min: 1400, title: '做影像製作公司', text: '客戶開始要動態影片，你把工作室升級成影像製作公司。', label: '轉型影像製作', mult: 2.4, rename: '影像製作公司', sub: '從照片做到影片' },
  },
  {
    id: 'musicteacher', name: '音樂老師的逆襲', title: '音樂教育集團創辦人',
    stepNames: ['音樂老師', '教學總監', '開音樂教室', '開分校', '線上音樂課'],
    promo: { title: '升教學總監', text: '你教的學生連年得獎，教室想讓你管教學。', to: '教學總監', mult: 1.7, sub: '管整間教室的課程' },
    open: { title: '開自己的音樂教室', text: '你想用自己的方法教琴。開一間音樂教室需要 130 萬。', type: 'musicschool', cost: 130, value: 210 },
    expand: { min: 400, title: '開分校', text: '家長排隊排到明年，隔壁區也有人想開分校。', cost: 200, mult: 1.7, rename: '音樂教室（連鎖）', sub: '學生數翻倍' },
    grow: { min: 1300, title: '做線上音樂課', text: '你把課程拍成影片，全世界的人都可以跟你學琴。', label: '推出線上課程', mult: 2.4, rename: '音樂教育集團', sub: '學生不再受地點限制' },
  },
  {
    id: 'preschool', name: '幼教老師的逆襲', title: '幼教集團創辦人',
    stepNames: ['幼教老師', '園務主任', '開幼兒園', '第二間', '加盟品牌'],
    promo: { title: '升園務主任', text: '家長點名要你帶的班，園長想讓你管整個園務。', to: '園務主任', mult: 1.6, sub: '管整間園' },
    open: { title: '自己開幼兒園', text: '很多家長說只要你開園就把孩子送來。開一間需要 250 萬。', type: 'kindergarten', cost: 250, value: 380 },
    expand: { min: 700, title: '開第二間分校', text: '你的園候補排到三年後，該開分校了。', cost: 300, mult: 1.7, rename: '幼兒園（兩間分校）', sub: '收生人數翻倍' },
    grow: { min: 1700, title: '做加盟品牌', text: '很多人想加盟你的教學系統，願意付加盟金。', label: '開放加盟', mult: 2.4, rename: '幼教品牌集團', sub: '全台都有你的園' },
  },
  {
    id: 'vet', name: '獸醫的逆襲', title: '寵物產業大亨',
    stepNames: ['獸醫', '主治醫師', '開動物醫院', '24 小時急診', '寵物保健品'],
    promo: { title: '升主治醫師', text: '你開完一場很難的手術，院長讓你當主治。', to: '主治獸醫師', mult: 1.6, sub: '看診量和收入都增加' },
    open: { title: '開自己的動物醫院', text: '你想開一家不會讓毛小孩害怕的醫院。需要 300 萬。', type: 'vetclinic', cost: 300, value: 450 },
    expand: { min: 800, title: '做 24 小時急診', text: '半夜寵物出事沒地方去，24 小時急診一開就滿，但要輪班人力。', cost: 350, mult: 1.7, rename: '動物醫院（24 小時）', sub: '急診收費高' },
    grow: { min: 2000, title: '做寵物保健品', text: '你研發的處方飼料和保健品，寵物店搶著上架。', label: '推出寵物品牌', mult: 2.4, rename: '寵物醫療集團', sub: '賣藥比看診好賺' },
  },
  {
    id: 'tcm', name: '中醫師的逆襲', title: '漢方品牌創辦人',
    stepNames: ['中醫師', '口碑名醫', '開診所', '連鎖分院', '漢方品牌'],
    promo: { title: '成為口碑名醫', text: '你治好了一位很有名的病人，門診開始要排隊。', to: '中醫名醫', mult: 1.7, sub: '掛號費也漲了' },
    open: { title: '開自己的中醫診所', text: '你想開一家自己的診所。裝潢加藥材需要 300 萬。', type: 'tcmclinic', cost: 300, value: 450 },
    expand: { min: 800, title: '開連鎖分院', text: '你的診所天天爆滿，其他區的人也希望你去開。', cost: 350, mult: 1.7, rename: '中醫診所（連鎖）', sub: '多請幾位醫師' },
    grow: { min: 2000, title: '做漢方保健品', text: '你的養生方做成沖泡包，電商賣到缺貨。', label: '推出漢方品牌', mult: 2.4, rename: '漢方生技公司', sub: '從看診到賣產品' },
  },
  {
    id: 'dentist', name: '牙醫的逆襲', title: '牙醫集團董事長',
    stepNames: ['牙醫', '主治醫師', '開診所', '植牙矯正', '連鎖牙醫'],
    promo: { title: '升主治醫師', text: '你的技術越來越穩，院長讓你獨立看診。', to: '主治牙醫師', mult: 1.5, sub: '收入增加' },
    open: { title: '開自己的牙醫診所', text: '一台好的設備就要一百多萬。開一家診所需要 400 萬。', type: 'dentalclinic', cost: 400, value: 600 },
    expand: { min: 1000, title: '做植牙和矯正', text: '植牙和矯正的利潤最高，但要進口設備和進修。', cost: 400, mult: 1.7, rename: '牙醫診所（植牙中心）', sub: '單價高很多' },
    grow: { min: 2500, title: '開連鎖牙醫', text: '你的經營模式很成功，投資人想跟你一起開連鎖。', label: '成立牙醫集團', mult: 2.3, rename: '牙醫連鎖集團', sub: '全台開十家' },
  },
  {
    id: 'psychologist', name: '心理師的逆襲', title: '心理健康品牌創辦人',
    stepNames: ['心理師', '資深心理師', '開諮商所', '企業方案', '線上平台'],
    promo: { title: '成為資深心理師', text: '你的個案排到半年後，機構升你當督導。', to: '資深心理師／督導', mult: 1.7, sub: '也能督導新人' },
    open: { title: '開心理諮商所', text: '你想要一個真正讓人放鬆的空間。開一家諮商所需要 150 萬。', type: 'counseling', cost: 150, value: 240 },
    expand: { min: 450, title: '接企業員工方案', text: '大公司想幫員工買心理諮商服務，一簽就是一整年。', cost: 250, mult: 1.8, rename: '心理諮商所（企業方案）', sub: '穩定的大額合約' },
    grow: { min: 1500, title: '做線上心理平台', text: '你把諮商搬到線上，偏鄉和海外的人也能預約。', label: '推出線上平台', mult: 2.4, rename: '心理健康平台', sub: '一次服務更多人' },
  },
  {
    id: 'banker', name: '銀行行員的逆襲', title: '財富管理大亨',
    stepNames: ['行員', '理專', '開投顧', '規模破十億', '家族辦公室'],
    promo: { title: '轉做理財專員', text: '主管看你對數字很敏銳，問你要不要轉理專。', to: '理財專員', mult: 1.8, sub: '有業績獎金', extra: (s) => { addSkill(s, 1); return '你每天看盤，投資眼光提升！'; } },
    open: { title: '自己開投顧公司', text: '你的客戶說，只要你自己開公司，資金就搬過去。需要 200 萬。', type: 'wealthco', cost: 200, value: 320 },
    expand: { min: 600, title: '管理規模破十億', text: '你管理的資產越來越大，需要更專業的團隊和系統。', cost: 300, mult: 1.8, rename: '財富管理公司（十億規模）', sub: '管理費跟著變多' },
    grow: { min: 1800, title: '成立家族辦公室', text: '幾個超高資產的家族想把所有資產都交給你管。', label: '成立家族辦公室', mult: 2.5, rename: '資產管理集團', sub: '服務最有錢的一群人' },
  },
];

for (const r of [...NEW_ROUTES, ...NEW_ROUTES2]) ROUTES[r.id] = standardRoute(r);

export const routeLabel = (s) => {
  if (!s.route) return null;
  const r = ROUTES[s.route.id];
  if (!r) return null;
  return { name: r.name, step: s.route.step, total: r.steps.length, stepNames: r.stepNames, done: s.route.step >= r.steps.length };
};
