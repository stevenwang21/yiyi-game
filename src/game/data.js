// 遊戲的靜態資料：家境、學歷、職業、事業、投資工具、房產
import { WAN } from './utils.js';

// allowance：小時候每年爸媽給的零用錢（出生時的物價）；gift：出社會時給的起步金
export const FAMILIES = [
  // allowance：一年的零用錢（出生時物價）｜gift：出社會時家裡給的一筆｜inherit：遺產範圍
  { id: 'poor', name: '清寒家庭', weight: 15, allowance: 0, gift: 0, inherit: [0, 10 * WAN] },
  { id: 'normal', name: '小康家庭', weight: 45, allowance: 1 * WAN, gift: 10 * WAN, inherit: [30 * WAN, 150 * WAN] },
  { id: 'rich', name: '富裕家庭', weight: 35, allowance: 4 * WAN, gift: 100 * WAN, inherit: [300 * WAN, 1000 * WAN] },
  { id: 'tycoon', name: '豪門世家', weight: 20, allowance: 20 * WAN, gift: 800 * WAN, inherit: [2000 * WAN, 5000 * WAN] },
];

export const familyById = (id) => FAMILIES.find((f) => f.id === id);

// 學歷：rank 越大越高
export const EDU = {
  none: { name: '國小', rank: 0 },
  junior: { name: '國中', rank: 1 },
  senior: { name: '高中', rank: 2 },
  vocational: { name: '高職', rank: 2 },
  college: { name: '普通大學', rank: 3 },
  techCollege: { name: '科技大學', rank: 3 },
  topCollege: { name: '頂尖大學', rank: 4 },
  master: { name: '研究所', rank: 4 },
  topMaster: { name: '頂尖研究所', rank: 5 },
};

// salary：起薪（年薪）；raise：調薪倍率；risk：被裁員機率倍率
export const JOBS = [
  { id: 'clerk', name: '超商店員', salary: 36 * WAN, edu: 0, req: {}, raise: 0.6, risk: 1 },
  { id: 'worker', name: '工廠作業員', salary: 42 * WAN, edu: 0, req: { hp: 40 }, raise: 0.8, risk: 1.2 },
  { id: 'delivery', name: '外送員', salary: 48 * WAN, edu: 0, req: { hp: 50 }, raise: 0.4, risk: 0.6 },
  { id: 'sales', name: '業務員', salary: 45 * WAN, edu: 2, req: { charm: 50 }, raise: 1.6, risk: 1.1, alts: [{ req: { int: 60 }, name: '顧問式業務' }] },
  { id: 'teacher', name: '補習班老師', salary: 50 * WAN, edu: 3, req: { int: 54 }, raise: 1.2, risk: 0.8, alts: [{ req: { charm: 62 }, name: '人氣名師' }] },
  { id: 'civil', name: '公務員', salary: 55 * WAN, edu: 3, req: { int: 54 }, raise: 1.0, risk: 0 },
  { id: 'engineer', name: '軟體工程師', salary: 80 * WAN, edu: 3, req: { int: 62 }, raise: 1.3, risk: 1.2 },
  { id: 'analyst', name: '金融分析師', salary: 90 * WAN, edu: 4, req: { int: 66 }, raise: 1.3, risk: 1.2, alts: [{ req: { charm: 70 }, name: '財富管理業務' }] },
  { id: 'lawyer', name: '律師', salary: 110 * WAN, edu: 4, req: { int: 71 }, raise: 1.2, risk: 0.4 },
  { id: 'doctor', name: '醫生', salary: 180 * WAN, edu: 5, req: { int: 74 }, raise: 1.0, risk: 0.2 },
  { id: 'trainee', name: '練習生', salary: 30 * WAN, edu: 0, req: {}, raise: 0.5, risk: 0, hidden: true },
  { id: 'idol', name: '偶像藝人', salary: 70 * WAN, edu: 0, req: {}, raise: 1.4, risk: 0, hidden: true },
  { id: 'bandmusician', name: '職業樂手', salary: 34 * WAN, edu: 0, req: {}, raise: 1.2, risk: 0, hidden: true },
  // 社團一路練上去才會出現的職業（不會出現在一般求職名單）
  { id: 'probball', name: '職業籃球員', salary: 110 * WAN, edu: 0, req: {}, raise: 1.7, risk: 0.5, retireAge: 36, hidden: true },
  { id: 'ballcoach', name: '籃球教練', salary: 70 * WAN, edu: 0, req: {}, raise: 1.1, risk: 0.4, hidden: true },
  { id: 'dancer', name: '職業舞者', salary: 55 * WAN, edu: 0, req: {}, raise: 1.5, risk: 0.6, retireAge: 42, hidden: true },
  { id: 'choreo', name: '編舞師', salary: 95 * WAN, edu: 0, req: {}, raise: 1.4, risk: 0.4, hidden: true },
  { id: 'researcher', name: '研究員', salary: 95 * WAN, edu: 0, req: {}, raise: 1.5, risk: 0.3, hidden: true },
  { id: 'speaker', name: '講師／名嘴', salary: 75 * WAN, edu: 0, req: {}, raise: 1.7, risk: 0.8, hidden: true },
  { id: 'progamer', name: '電競職業選手', salary: 85 * WAN, edu: 0, req: {}, raise: 1.8, risk: 0.6, retireAge: 28, hidden: true },
  { id: 'ecoach', name: '電競教練', salary: 70 * WAN, edu: 0, req: {}, raise: 1.2, risk: 0.5, hidden: true },
  { id: 'influencer', name: '網紅', salary: 30 * WAN, edu: 0, req: { charm: 66 }, raise: 0, risk: 0, volatile: true, alts: [{ req: { int: 66 }, name: '知識型網紅', stat: 'int' }, { req: { hp: 72 }, name: '運動型網紅', stat: 'hp' }] },
  { id: 'athlete', name: '職業運動員', salary: 80 * WAN, edu: 0, req: { hp: 71 }, raise: 1.5, risk: 0.3, retireAge: 38, alts: [{ req: { hp: 66, int: 62 }, name: '運動分析師', noRetire: true }] },
  // 第二批行業
  { id: 'chef', name: '廚師', salary: 40 * WAN, edu: 0, req: { hp: 45 }, raise: 1.1, risk: 1, alts: [{ req: { int: 60 }, name: '餐飲研發主廚' }] },
  { id: 'hairdresser', name: '美髮師', salary: 36 * WAN, edu: 0, req: { charm: 45 }, raise: 1.2, risk: 0.8, alts: [{ req: { int: 56 }, name: '美髮品牌講師' }] },
  { id: 'farmer', name: '農夫', salary: 30 * WAN, edu: 0, req: { hp: 54 }, raise: 0.8, risk: 0.3 },
  { id: 'driver', name: '計程車司機', salary: 45 * WAN, edu: 0, req: {}, raise: 0.5, risk: 0.5 },
  { id: 'plumber', name: '水電師傅', salary: 50 * WAN, edu: 1, req: { hp: 50 }, raise: 1.1, risk: 0.6 },
  { id: 'esports', name: '電競選手', salary: 36 * WAN, edu: 0, req: { int: 45 }, raise: 2, risk: 0.5, retireAge: 30 },
  { id: 'realtor', name: '房仲業務', salary: 40 * WAN, edu: 2, req: { charm: 54 }, raise: 1.7, risk: 1.3, alts: [{ req: { int: 62 }, name: '不動產分析師' }] },
  { id: 'police', name: '警察', salary: 60 * WAN, edu: 2, req: { hp: 58 }, raise: 0.9, risk: 0, alts: [{ req: { int: 62 }, name: '刑事鑑識人員' }] },
  { id: 'nurse', name: '護理師', salary: 55 * WAN, edu: 3, req: { hp: 50 }, raise: 1, risk: 0.3 },
  { id: 'designer', name: '平面設計師', salary: 45 * WAN, edu: 3, req: { charm: 45 }, raise: 1.2, risk: 1, alts: [{ req: { int: 58 }, name: 'UI 設計師' }] },
  { id: 'attendant', name: '空服員', salary: 60 * WAN, edu: 3, req: { charm: 58, hp: 54 }, raise: 1, risk: 0.8, alts: [{ req: { int: 63, hp: 54 }, name: '航空地勤主管' }] },
  { id: 'pharmacist', name: '藥師', salary: 70 * WAN, edu: 4, req: { int: 62 }, raise: 1, risk: 0.3 },
  { id: 'accountant', name: '會計師', salary: 80 * WAN, edu: 4, req: { int: 66 }, raise: 1.2, risk: 0.5 },
  { id: 'architect', name: '建築師', salary: 75 * WAN, edu: 4, req: { int: 64 }, raise: 1.2, risk: 0.8 },
  { id: 'pilot', name: '機師', salary: 150 * WAN, edu: 3, req: { int: 62, hp: 66 }, raise: 1, risk: 0.6 },
  // 第三批行業
  { id: 'postman', name: '郵差', salary: 44 * WAN, edu: 1, req: { hp: 45 }, raise: 0.7, risk: 0.2 },
  { id: 'guard', name: '保全人員', salary: 36 * WAN, edu: 0, req: {}, raise: 0.6, risk: 0.6 },
  { id: 'cleaner', name: '清潔隊員', salary: 40 * WAN, edu: 0, req: { hp: 50 }, raise: 0.7, risk: 0.2 },
  { id: 'baker', name: '麵包師', salary: 34 * WAN, edu: 0, req: { hp: 42 }, raise: 1.1, risk: 0.9 },
  { id: 'barista', name: '咖啡師', salary: 32 * WAN, edu: 0, req: { charm: 42 }, raise: 1.1, risk: 1 },
  { id: 'bartender', name: '調酒師', salary: 38 * WAN, edu: 0, req: { charm: 50 }, raise: 1.3, risk: 1.1, alts: [{ req: { int: 58 }, name: '酒類講師' }] },
  { id: 'trainer', name: '健身教練', salary: 42 * WAN, edu: 0, req: { hp: 62 }, raise: 1.4, risk: 0.9, alts: [{ req: { int: 63 }, name: '運動科學教練' }] },
  { id: 'yogateacher', name: '瑜伽老師', salary: 38 * WAN, edu: 0, req: { hp: 58, charm: 45 }, raise: 1.3, risk: 0.8 },
  { id: 'guide', name: '導遊', salary: 40 * WAN, edu: 2, req: { charm: 54 }, raise: 1.2, risk: 1.4, alts: [{ req: { int: 60 }, name: '文史導覽員' }] },
  { id: 'translator', name: '翻譯', salary: 48 * WAN, edu: 3, req: { int: 58 }, raise: 1.1, risk: 0.9 },
  { id: 'reporter', name: '記者', salary: 45 * WAN, edu: 3, req: { int: 54, charm: 50 }, raise: 1.2, risk: 1.2, alts: [{ req: { int: 64 }, name: '調查記者' }] },
  { id: 'writer', name: '作家', salary: 28 * WAN, edu: 2, req: { int: 56 }, raise: 1.8, risk: 0.3 },
  { id: 'photographer', name: '攝影師', salary: 40 * WAN, edu: 2, req: { charm: 50 }, raise: 1.3, risk: 1.1, alts: [{ req: { int: 58 }, name: '商業攝影師' }] },
  { id: 'musicteacher', name: '音樂老師', salary: 42 * WAN, edu: 3, req: { charm: 54 }, raise: 1.1, risk: 0.6, alts: [{ req: { int: 60 }, name: '樂理講師' }] },
  { id: 'preschool', name: '幼教老師', salary: 38 * WAN, edu: 3, req: { charm: 54 }, raise: 1, risk: 0.5, alts: [{ req: { int: 60 }, name: '幼教課程研發' }] },
  { id: 'vet', name: '獸醫', salary: 90 * WAN, edu: 4, req: { int: 64 }, raise: 1.1, risk: 0.3 },
  { id: 'tcm', name: '中醫師', salary: 110 * WAN, edu: 4, req: { int: 68 }, raise: 1.1, risk: 0.2 },
  { id: 'dentist', name: '牙醫', salary: 160 * WAN, edu: 5, req: { int: 72 }, raise: 1, risk: 0.2 },
  { id: 'psychologist', name: '心理師', salary: 70 * WAN, edu: 4, req: { int: 62, charm: 54 }, raise: 1.1, risk: 0.4, alts: [{ req: { int: 68 }, name: '臨床心理師' }] },
  { id: 'banker', name: '銀行行員', salary: 52 * WAN, edu: 3, req: { int: 56 }, raise: 1.2, risk: 0.9, alts: [{ req: { charm: 62 }, name: '理財業務' }] },
];

export const jobById = (id) => JOBS.find((j) => j.id === id);

// 事業：mean / sd 是每年價值成長率的平均與波動
export const BUSINESSES = {
  // 一般創業（任何人都能選）
  cram: { name: '補習班', mean: 0.07, sd: 0.12, desc: '穩定成長，風險低', open: true },
  food: { name: '飲料店', mean: 0.07, sd: 0.25, desc: '中等風險，有機會展店', open: true },
  tech: { name: '科技新創', mean: 0.06, sd: 0.5, desc: '高風險高報酬，可能一飛沖天也可能倒閉', open: true },
  // 逆襲路線專屬
  store: { name: '便利商店', mean: 0.07, sd: 0.12 },
  logistics: { name: '物流公司', mean: 0.07, sd: 0.2 },
  factory: { name: '精密工廠', mean: 0.07, sd: 0.18 },
  trade: { name: '貿易公司', mean: 0.07, sd: 0.2 },
  school: { name: '補教集團', mean: 0.07, sd: 0.12 },
  startup: { name: 'App 公司', mean: 0.07, sd: 0.4 },
  fund: { name: '投資顧問公司', mean: 0.07, sd: 0.25 },
  lawfirm: { name: '律師事務所', mean: 0.06, sd: 0.08 },
  clinic: { name: '診所', mean: 0.07, sd: 0.08 },
  brand: { name: '自有品牌', mean: 0.07, sd: 0.3, desc: '做起來很值錢，前期燒錢', open: true },
  gym: { name: '健身房', mean: 0.06, sd: 0.15, desc: '會員制，現金流穩', open: true },
  rental: { name: '房屋租賃公司', mean: 0.05, sd: 0.06 },
  restaurant: { name: '餐廳', mean: 0.07, sd: 0.22, desc: '翻桌率高就賺，人手難找', open: true },
  salon: { name: '美髮沙龍', mean: 0.07, sd: 0.15, desc: '靠手藝和回頭客', open: true },
  farm: { name: '觀光農場', mean: 0.06, sd: 0.15, desc: '慢慢做，假日人潮', open: true },
  carrental: { name: '租車公司', mean: 0.07, sd: 0.18, desc: '車子貴，但天天有收入', open: true },
  contractor: { name: '水電工程行', mean: 0.07, sd: 0.14, desc: '工程一件一件接，穩', open: true },
  esportsco: { name: '電競公司', mean: 0.07, sd: 0.35, desc: '年輕市場，起伏大', open: true },
  agency: { name: '房仲加盟店', mean: 0.07, sd: 0.22 },
  talentagency: { name: '演藝經紀公司', mean: 0.07, sd: 0.28 },
  petshop: { name: '寵物店', mean: 0.07, sd: 0.16, desc: '養寵物的人越來越多', open: true },
  ecommerce: { name: '網路商店', mean: 0.07, sd: 0.3, desc: '小本經營，靠廣告', open: true },
  care: { name: '長照中心', mean: 0.07, sd: 0.08, desc: '需求穩定，法規多', open: true },
  studio: { name: '設計工作室', mean: 0.07, sd: 0.2, desc: '接案為主，成本低', open: true },
  pharmacy: { name: '藥局', mean: 0.07, sd: 0.08 },
  acctfirm: { name: '會計師事務所', mean: 0.06, sd: 0.08 },
  developer: { name: '建設公司', mean: 0.07, sd: 0.25 },
  archfirm: { name: '建築師事務所', mean: 0.07, sd: 0.15 },
  flightschool: { name: '飛行學校', mean: 0.07, sd: 0.15 },
  beauty: { name: '美姿美儀學院', mean: 0.07, sd: 0.15 },
  // 第三批行業的公司
  courier: { name: '快遞公司', mean: 0.07, sd: 0.18 },
  security: { name: '保全公司', mean: 0.06, sd: 0.1 },
  cleanco: { name: '清潔公司', mean: 0.06, sd: 0.12 },
  bakery: { name: '烘焙坊', mean: 0.07, sd: 0.18, desc: '早起，但香味留客', open: true },
  cafe: { name: '咖啡店', mean: 0.07, sd: 0.2, desc: '文青路線，租金是關鍵', open: true },
  bar: { name: '酒吧', mean: 0.07, sd: 0.25, desc: '晚上營業，利潤高', open: true },
  ptstudio: { name: '私人教練工作室', mean: 0.07, sd: 0.18 },
  yogahouse: { name: '瑜伽會館', mean: 0.06, sd: 0.15 },
  travelco: { name: '旅行社', mean: 0.07, sd: 0.3, desc: '景氣好賺翻，疫情就慘', open: true },
  transco: { name: '翻譯公司', mean: 0.06, sd: 0.14 },
  media: { name: '網路媒體', mean: 0.07, sd: 0.3, desc: '流量起來很快，掉得也快', open: true },
  publisher: { name: '出版社', mean: 0.07, sd: 0.25 },
  photostudio: { name: '攝影工作室', mean: 0.07, sd: 0.2, desc: '婚紗、畢業季旺', open: true },
  musicschool: { name: '音樂教室', mean: 0.07, sd: 0.14 },
  kindergarten: { name: '幼兒園', mean: 0.07, sd: 0.1, desc: '少子化，但雙薪家庭需要', open: true },
  vetclinic: { name: '動物醫院', mean: 0.07, sd: 0.12, desc: '需要獸醫執照的合夥人', open: true },
  tcmclinic: { name: '中醫診所', mean: 0.07, sd: 0.1 },
  dentalclinic: { name: '牙醫診所', mean: 0.07, sd: 0.08 },
  counseling: { name: '心理諮商所', mean: 0.07, sd: 0.12 },
  wealthco: { name: '財富管理公司', mean: 0.07, sd: 0.22 },
};

export const OPEN_BIZ = Object.keys(BUSINESSES).filter((k) => BUSINESSES[k].open);

export const BIZ_MIN_CAPITAL = 50 * WAN;

// 金融投資工具
export const ASSETS = [
  { key: 'deposit', name: '定存', short: '存', risk: 1, desc: '年利率 1.5%，最安全' },
  { key: 'etf', name: '指數型 ETF', short: 'ETF', risk: 2, desc: '長期平均約 7%，適合定期定額' },
  { key: 'stock', name: '個股', short: '股', risk: 4, desc: '波動大，投資眼光越好越準' },
  { key: 'gold', name: '黃金', short: '金', risk: 3, desc: '長期輸 ETF，但股災和通膨時最抗跌' },
  { key: 'crypto', name: '加密貨幣', short: '幣', risk: 5, desc: '可能翻好幾倍，也可能歸零' },
];

export const INVEST_MIN_AGE = 18; // 滿 18 歲才能自己開戶投資（之前的零用錢先存成現金）

export const HOUSES = [
  { id: 'studio', name: '小套房', price: 800 * WAN, happy: 4 },
  { id: 'apartment', name: '三房公寓', price: 2000 * WAN, happy: 8 },
  { id: 'mansion', name: '豪宅', price: 8000 * WAN, happy: 15 },
];

export const DOWN_PAYMENT = 0.2; // 頭期款比例
export const MORTGAGE_RATE = 0.022; // 房貸利率
export const LOAN_RATE = 0.045; // 創業貸款利率
export const PAY_RATIO = 0.07; // 每年償還原始借款的比例
export const DEBT_RATE = 0.08; // 現金為負時的利率
export const RENT_YIELD = 0.03; // 第二間以上房子的租金收益率
export const DCA_OPTIONS = [0, 10, 20, 30, 50, 80];

export const MAX_BIZ = 2; // 最多同時經營幾家公司
export const MAX_KIDS = 6;

// 養小孩每年的花費（出生時的物價，會再乘上物價指數）
export const KID_COST = [
  { maxAge: 5, stage: '幼兒', cost: 15 * WAN },
  { maxAge: 11, stage: '國小', cost: 9 * WAN },
  { maxAge: 17, stage: '國高中', cost: 12 * WAN },
  { maxAge: 21, stage: '大學', cost: 18 * WAN },
];
export const KID_CRAM_COST = 6 * WAN;

// 養小孩的方式：花的錢不一樣，長大後的成就機率也不一樣
export const KID_STYLES = [
  {
    id: 'frugal', name: '窮養', icon: '🍚', mult: 0.55, score: 0,
    sub: '省一半以上',
    desc: '公立學校、不補習、二手衣，該有的都有但沒有多的。孩子早熟，長大後多半是平凡的上班族。',
  },
  {
    id: 'normal', name: '標準', icon: '🏠', mult: 1, score: 1,
    sub: '一般家庭',
    desc: '該補的補、該學的學，跟同學差不多。最常見的養法。',
  },
  {
    id: 'rich', name: '富養', icon: '🎓', mult: 2.2, score: 2,
    sub: '兩倍多的花費',
    desc: '私立學校、才藝、補習、遊學樣樣來。錢花很凶，但孩子出人頭地的機率高很多。',
  },
];
export const kidStyleById = (id) => KID_STYLES.find((x) => x.id === id) || KID_STYLES[1];

// 唐氏症的孩子：每年多一筆早療、療育、醫療的費用（不隨養育方式加成）
export const KID_SPECIAL_COST = 8 * WAN;      // 22 歲前
export const KID_SPECIAL_ADULT = 5 * WAN;     // 成年後的生活協助
export const KID_SPECIAL_OUTCOMES = [
  '在庇護工場工作，每週固定上班，同事都很照顧他。',
  '在超商做支持性就業，會自己刷卡搭捷運上下班。',
  '在烘焙坊當助手，做出來的餅乾很受歡迎。',
  '在圖書館整理書架，館員說他做得比誰都仔細。',
];

// 小孩長大後的成就（會每年給孝親費）
export const KID_OUTCOMES = [
  { id: 'struggle', title: '工作不太穩定', filial: 0, min: -99, text: '換了好幾份工作，還在找自己的方向。' },
  { id: 'normal', title: '普通上班族', filial: 3 * WAN, min: 1.3, text: '進了一家還不錯的公司，日子過得去。' },
  { id: 'pro', title: '專業人士', filial: 8 * WAN, min: 2.5, text: '考上了專業證照，收入比同齡人高一截。' },
  { id: 'star', title: '很有成就', filial: 18 * WAN, min: 3.5, text: '年紀輕輕就當上主管，還上過新聞。' },
];
export const KID_INDEPENDENT = 22;

// 小孩的「名」，前面會自動加上家裡的姓
export const KID_GIVEN_M = ['宥辰', '柏丞', '睿哲', '子軒', '奕辰', '承翰', '品安', '宸睿', '崇恩', '祐軒'];
export const KID_GIVEN_F = ['芸熙', '詩妤', '若晴', '宥希', '恩晴', '子晴', '語恩', '詠晴', '芯妤', '沐恩'];
export const KID_NAMES = [...KID_GIVEN_M, ...KID_GIVEN_F]; // 舊版相容

export const CHECKUP_COST = 5 * WAN; // 健康檢查
export const TREAT_COST = 20 * WAN; // 早期治療

// 戀愛與另一半
// 姓氏與名字（遊戲裡遇到的人都用完整的名字）
export const SURNAMES = [
  '陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭',
  '謝', '洪', '郭', '邱', '曾', '廖', '賴', '徐', '周', '葉', '蘇', '莊',
];
export const GIVEN_F = [
  '怡君', '雅婷', '淑芬', '詩涵', '心妤', '佳蓉', '宜蓁', '筱婷', '欣怡', '巧薇',
  '惠雯', '郁婷', '美玲', '雅雯', '家瑜', '婉婷', '芷琳', '語彤', '孟蓉', '秀琴',
];
export const GIVEN_M = [
  '志明', '建宏', '俊傑', '家豪', '冠宇', '柏翰', '宗翰', '承恩', '彥廷', '昱翔',
  '品睿', '明哲', '文彬', '家銘', '仲翔', '世豪', '智偉', '育誠', '國棟', '維哲',
];

// 固定的對象名單（結婚只能跟異性，所以分兩個名單）
export const PARTNER_NAMES_F = [
  '陳怡君', '林雅婷', '黃淑芬', '張詩涵', '李心妤', '王佳蓉', '吳宜蓁', '劉筱婷',
  '蔡欣怡', '楊巧薇', '許惠雯', '鄭郁婷', '謝美玲', '洪雅雯', '郭家瑜', '邱婉婷',
  '曾芷琳', '廖語彤',
];
export const PARTNER_NAMES_M = [
  '林志明', '陳建宏', '張俊傑', '黃家豪', '李冠宇', '王柏翰', '吳宗翰', '劉承恩',
  '蔡彥廷', '楊昱翔', '許品睿', '鄭明哲', '謝文彬', '洪家銘', '郭世豪', '邱智偉',
  '曾育誠', '廖國棟',
];
export const PARTNER_NAMES = [...PARTNER_NAMES_F, ...PARTNER_NAMES_M]; // 舊版相容

// 隨機產生一個完整的名字
export const randomPersonName = (rng, gender = null) => {
  const g = gender || (rng() < 0.5 ? 'male' : 'female');
  const given = g === 'male' ? GIVEN_M : GIVEN_F;
  return SURNAMES[Math.floor(rng() * SURNAMES.length)] + given[Math.floor(rng() * given.length)];
};
// 連性別一起回傳（頭像要用）
export const randomPerson = (rng) => {
  const gender = rng() < 0.5 ? 'male' : 'female';
  return { name: randomPersonName(rng, gender), gender };
};

// 性別
export const GENDERS = [
  { id: 'male', name: '男生', icon: '👦', partner: '老婆', self: '他' },
  { id: 'female', name: '女生', icon: '👧', partner: '老公', self: '她' },
];
export const genderById = (id) => GENDERS.find((g) => g.id === id) || GENDERS[0];
// 交往對象一定是異性
export const partnerPool = (s) => ((s.gender || 'male') === 'male' ? PARTNER_NAMES_F : PARTNER_NAMES_M);
export const partnerWord = (s) => genderById(s.gender).partner;
export const DATE_COST_STUDENT = 1.5 * WAN; // 學生每年約會花費
export const DATE_COST_ADULT = 3 * WAN; // 出社會後每年約會花費
export const DATE_FOCUS_COST = 2 * WAN; // 選「約會」那年多花的錢

// 另一半的能力等級：收入（出生時的物價）與職稱
export const SPOUSE_LEVELS = [
  { title: '家管', income: 0 },
  { title: '兼職工作', income: 20 * WAN },
  { title: '上班族', income: 40 * WAN },
  { title: '部門主管', income: 70 * WAN },
  { title: '高階主管', income: 110 * WAN },
  { title: '成功企業家', income: 160 * WAN },
];
export const SPOUSE_COSTS = [4, 7, 10, 14, 18]; // 升到第 1～5 級要幾點

// 退休年紀
export const BASE_RETIRE_AGE = 65;
export const MAX_RETIRE_AGE = 80;
export const retireCost = (extra) => 6 + extra * 2; // 已經延長 extra 年時，再延長 1 年要幾點

// 寵物：每年固定花費（出生時的物價）
export const PETS = {
  dog: { kind: '狗', names: ['小黑', '旺財', '豆豆', '球球', '阿福', '皮皮'], life: [12, 16], food: 2.4 * WAN, groom: 0.8 * WAN },
  cat: { kind: '貓', names: ['咪咪', '橘子', '奶茶', '小花', '胖虎', '雪球'], life: [13, 18], food: 1.8 * WAN, groom: 0 },
};
export const PET_VACCINE = 0.5 * WAN; // 每年疫苗＋健檢

// 難度：影響投資報酬、事業成長、生活費、起薪
export const DIFFICULTIES = [
  {
    id: 'easy', name: '輕鬆', sub: '幾乎一定賺得到一億',
    desc: '投資報酬高、生活費低，適合輕鬆玩。',
    ret: 0.05, biz: -0.015, cost: 0.9, grow: 0.8, salary: 1, size: 0.08,
  },
  {
    id: 'normal', name: '普通', sub: '認真玩大約一半機會',
    desc: '投資報酬和生活費比較接近現實，要做對選擇才賺得到。',
    ret: 0.026, biz: -0.055, cost: 1.0, grow: 0.4, salary: 0.9, size: 0.18,
  },
  {
    id: 'hard', name: '挑戰', sub: '很難，要很會規劃',
    desc: '投資報酬低、生活費高、事業成長慢，一個億非常難達成。',
    ret: 0.016, biz: -0.08, cost: 1.2, grow: 0.26, salary: 0.72, size: 0.26,
  },
  {
    id: 'hell', name: '地獄', sub: '幾乎不可能，玩命用的',
    desc: '出身多半清寒、天賦較差、薪水只有六成、生活費貴三成、股災特別多、身體也特別容易出問題。能破一億的人可以去買樂透。',
    ret: 0.003, biz: -0.11, cost: 1.4, grow: 0.16, salary: 0.6, size: 0.34,
    // 地獄限定
    poor: true, // 出身偏清寒
    statPenalty: 6, // 起始屬性更低
    crashW: 1.8, // 股災、疫情、戰爭出現機率倍率
    riskAdd: 2, // 每年健康風險多加
    inflAdd: 0.005, // 通膨更兇
  },
];
export const diffById = (id) => DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[0];

// 隨機難度：不想自己選的時候用。地獄故意壓到 5%，不然每開三場就中一次會玩到想砸手機。
export const RANDOM_WEIGHTS = { easy: 30, normal: 40, hard: 25, hell: 5 };
export const rollDifficulty = () => {
  const total = Object.values(RANDOM_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [id, w] of Object.entries(RANDOM_WEIGHTS)) {
    r -= w;
    if (r < 0) return id;
  }
  return 'normal';
};
