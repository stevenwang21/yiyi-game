// 世界大事：每年抽一個，影響股市、房市、各行業和通膨
// m：各市場額外報酬（加在基本報酬上）；infl：通膨額外加減；biz：各行業成長率加減
// crash：true 代表股災，會跳出「要不要賣」的選擇

export const WORLD_EVENTS = [
  {
    id: 'calm', w: 26, title: '風平浪靜的一年',
    desc: '沒有特別的大新聞，各個市場照自己的節奏漲漲跌跌。',
    m: {}, infl: 0,
  },
  {
    id: 'ai', w: 7, title: 'AI 科技熱潮',
    desc: '人工智慧大爆發，科技股漲翻天。',
    m: { etf: 0.12, stock: 0.2, crypto: 0.3, gold: -0.1 }, infl: 0.005,
    biz: { tech: 0.15, startup: 0.15, fund: 0.08, esportsco: 0.08, studio: 0.06 },
  },
  {
    id: 'chips', w: 5, title: '半導體大缺貨',
    desc: '晶片供不應求，電子業訂單接不完。',
    m: { etf: 0.08, stock: 0.14, gold: -0.06 }, infl: 0.01,
    biz: { factory: 0.12, trade: 0.08 },
  },
  {
    id: 'pandemic', w: 2, title: '全球疫情爆發', crash: true,
    desc: '新型病毒蔓延，各國封城，股市重挫。大家都待在家，外送和電商生意暴增。',
    m: { etf: -0.25, stock: -0.3, gold: 0.15, crypto: -0.3, house: -0.04 }, infl: -0.01, hp: -3,
    biz: { food: -0.25, gym: -0.25, store: -0.05, logistics: 0.25, brand: 0.15, clinic: 0.1, restaurant: -0.25, salon: -0.2, carrental: -0.2, flightschool: -0.2, beauty: -0.15, pharmacy: 0.12, esportsco: 0.1, farm: 0.05 },
  },
  {
    id: 'war', w: 3, title: '國際戰爭爆發', crash: true,
    desc: '地緣政治衝突升溫，資金逃往黃金，原物料價格大漲。',
    m: { etf: -0.18, stock: -0.22, gold: 0.25, crypto: -0.1 }, infl: 0.03,
    biz: { trade: -0.12, factory: 0.05 },
  },
  {
    id: 'crisis', w: 2, title: '全球金融海嘯', crash: true,
    desc: '大型銀行倒閉，信用市場凍結，幾乎所有資產都在跌。',
    m: { etf: -0.33, stock: -0.42, gold: 0.1, crypto: -0.55, house: -0.1 }, infl: -0.015, layoff: true,
    biz: { all: -0.15 },
  },
  {
    id: 'rateUp', w: 7, title: '央行升息',
    desc: '為了壓抑物價，央行調高利率。存款利息變多，但股市和房市降溫。',
    m: { etf: -0.05, stock: -0.08, house: -0.04, crypto: -0.2, deposit: 0.02, gold: -0.12 }, infl: -0.01,
  },
  {
    id: 'rateDown', w: 7, title: '央行降息',
    desc: '為了刺激經濟，央行調降利率。資金湧入股市和房市。',
    m: { etf: 0.08, stock: 0.1, house: 0.06, crypto: 0.2, deposit: -0.006, gold: 0.08 }, infl: 0.005,
  },
  {
    id: 'oil', w: 5, title: '油價飆漲',
    desc: '產油國減產，油價創新高，什麼東西都變貴了。',
    m: { etf: -0.05, stock: -0.05, gold: 0.06 }, infl: 0.03,
    biz: { food: -0.1, logistics: -0.12, restaurant: -0.1, carrental: -0.12, flightschool: -0.1, farm: -0.05 },
  },
  {
    id: 'houseCool', w: 4, title: '政府打房',
    desc: '政府推出多項打房政策，房價開始鬆動。',
    m: { house: -0.08 },
    biz: { rental: -0.05, agency: -0.12, developer: -0.12, contractor: -0.05 },
  },
  {
    id: 'houseHot', w: 5, title: '房市狂熱',
    desc: '大家瘋搶買房，房價一路飆升。',
    m: { house: 0.1 }, infl: 0.005,
    biz: { rental: 0.1, agency: 0.14, developer: 0.14, archfirm: 0.08, contractor: 0.08 },
  },
  {
    id: 'cryptoBull', w: 4, title: '加密貨幣大牛市',
    desc: '比特幣創歷史新高，全民瘋幣。',
    m: { crypto: 1.2, stock: 0.03, gold: -0.06 },
  },
  {
    id: 'cryptoWinter', w: 4, title: '加密貨幣寒冬',
    desc: '大型交易所倒閉，幣價崩跌。',
    m: { crypto: -0.6 },
  },
  {
    id: 'lowBirth', w: 3, title: '少子化衝擊',
    desc: '出生率創新低，學校和補習班招生越來越難。',
    m: { house: -0.02 },
    biz: { cram: -0.1, school: -0.1 },
  },
  {
    id: 'tourism', w: 4, title: '觀光客大爆發',
    desc: '國際觀光客湧入，餐飲和零售業生意興隆。',
    m: { etf: 0.03 }, infl: 0.005,
    biz: { food: 0.14, store: 0.08, gym: 0.05, restaurant: 0.14, carrental: 0.12, farm: 0.1, flightschool: 0.06 },
  },
  {
    id: 'ecommerce', w: 4, title: '電商時代來臨',
    desc: '網購成為主流，物流和品牌電商大成長。',
    m: { stock: 0.05 },
    biz: { logistics: 0.12, brand: 0.12, trade: 0.08, store: -0.04, studio: 0.08 },
  },
  {
    id: 'wellness', w: 3, title: '全民健康風潮',
    desc: '運動和醫美成為流行，健身房和診所大排長龍。',
    biz: { gym: 0.12, clinic: 0.1, salon: 0.06, pharmacy: 0.06, beauty: 0.08 },
    m: {}, hp: 2,
  },
  {
    id: 'hyperInfl', w: 2, title: '物價失控',
    desc: '通膨飆高，現金越來越薄，黃金和房子變得搶手。',
    m: { gold: 0.2, etf: -0.08, stock: -0.06, house: 0.08, deposit: 0.02 }, infl: 0.06,
  },
  {
    id: 'aging', w: 3, title: '高齡化社會',
    desc: '老年人口越來越多，長照、醫療和藥局需求大增。',
    m: {}, infl: 0.003,
    biz: { care: 0.15, pharmacy: 0.1, clinic: 0.06, school: -0.04 },
  },
  {
    id: 'foodSafety', w: 2, title: '食安風暴',
    desc: '黑心食品新聞延燒，大家開始重視在地、有機的食物。',
    m: {},
    biz: { restaurant: -0.12, food: -0.08, farm: 0.15 },
  },
  {
    id: 'esportsBoom', w: 2, title: '電競進入奧運',
    desc: '電競正式成為奧運項目，贊助商大舉湧入。',
    m: { stock: 0.03 },
    biz: { esportsco: 0.2, tech: 0.04 },
  },
  {
    id: 'infra', w: 3, title: '政府大推公共建設',
    desc: '政府投入大筆預算蓋捷運、社宅和綠能設施。',
    m: { etf: 0.03, house: 0.02 }, infl: 0.005,
    biz: { contractor: 0.15, developer: 0.1, archfirm: 0.1, factory: 0.05 },
  },
  {
    id: 'education', w: 3, title: '教育改革',
    desc: '新課綱上路，家長搶著幫孩子補習。',
    biz: { cram: 0.12, school: 0.12 },
    m: {},
  },
];

export const worldById = (id) => WORLD_EVENTS.find((w) => w.id === id);

// 市場指數的名稱（折線圖用）
export const INDEX_META = [
  { key: 'etf', label: 'ETF', color: '#2f8a5b' },
  { key: 'stock', label: '個股', color: '#3a6fb0' },
  { key: 'gold', label: '黃金', color: '#c8912b' },
  { key: 'crypto', label: '加密幣', color: '#8a4fa8' },
  { key: 'house', label: '房價', color: '#c9432f' },
];
