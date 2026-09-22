// 對象：每一種職業的另一半都有自己的專長
// income：年收入（出生時的物價，結婚後才會進家裡）
// perk：交往中就會生效的能力
//   hpKeep 減少每年自然老化掉的健康｜risk 每年健康風險加減｜hp / happy / charm 每年屬性變化
//   house 買房折扣｜living 生活費倍率調整｜kid 養小孩花費調整
//   alpha 投資報酬加成｜biz 事業成長加成｜promo 升遷成功率加成｜salary 你的薪水加成
//   gift 結婚時的一次性禮金（萬）
import { WAN } from './utils.js';

export const PARTNER_TYPES = [
  {
    id: 'nurse', title: '護理師', weight: 6, income: 40,
    ladder: ['護理師', '專科護理師', '護理長', '護理督導', '護理部主任', '醫院副院長'],
    perk: { hpKeep: 0.5, risk: -3 },
    perkText: '身體有人顧：每年老化掉的健康少一半，健康風險每年 -3',
  },
  {
    id: 'trainer', title: '健身教練', weight: 5, income: 36,
    ladder: ['健身教練', '資深教練', '教練組長', '分店店長', '區域經理', '連鎖健身房老闆'],
    perk: { hp: 2, risk: -2 },
    perkText: '拖著你運動：每年健康 +2，健康風險每年 -2',
  },
  {
    id: 'chef', title: '廚師', weight: 5, income: 32,
    ladder: ['廚師', '副主廚', '主廚', '行政主廚', '餐飲總監', '餐飲集團老闆'],
    perk: { living: -0.1, hp: 1 },
    perkText: '天天開伙：生活費省 10%，每年健康 +1',
  },
  {
    id: 'accountant', title: '會計師', weight: 5, income: 64,
    ladder: ['會計師', '資深會計師', '查帳經理', '事務所協理', '事務所合夥人', '事務所所長'],
    perk: { living: -0.15 },
    perkText: '精打細算：生活費省 15%',
  },
  {
    id: 'teacher', title: '國小老師', weight: 5, income: 44,
    ladder: ['國小老師', '學年主任', '教務組長', '教務主任', '校長', '教育局督學'],
    perk: { kid: -0.3, happy: 1 },
    perkText: '自己教小孩：養小孩的錢省 30%',
  },
  {
    id: 'preschool', title: '幼教老師', weight: 4, income: 32,
    ladder: ['幼教老師', '班級導師', '教學組長', '園所主任', '園長', '連鎖幼兒園創辦人'],
    perk: { kid: -0.35, happy: 1 },
    perkText: '超會帶小孩：養小孩的錢省 35%',
  },
  {
    id: 'engineer', title: '軟體工程師', weight: 5, income: 88,
    ladder: ['軟體工程師', '資深工程師', '技術主管', '研發經理', '研發處長', '技術長 CTO'],
    perk: {},
    perkText: '收入高：結婚後每年為家裡賺不少',
  },
  {
    id: 'banker', title: '銀行理專', weight: 4, income: 56,
    ladder: ['銀行理專', '資深理專', '財管襄理', '財管副理', '分行經理', '財富管理處長'],
    perk: { alpha: 0.008 },
    perkText: '天天看盤：你的投資報酬每年 +0.8%',
  },
  {
    id: 'sales', title: '頂尖業務', weight: 4, income: 52,
    ladder: ['業務專員', '業務主任', '業務經理', '區域業務總監', '業務副總', '總經理'],
    perk: { promo: 0.1, salary: 0.05 },
    perkText: '人脈很廣：升遷成功率 +10%，你的薪水 +5%',
  },
  {
    id: 'psychologist', title: '心理師', weight: 4, income: 56,
    ladder: ['心理師', '資深心理師', '治療團隊督導', '診所合夥人', '心理中心負責人', '公會理事長'],
    perk: { happy: 2, risk: -2 },
    perkText: '情緒有人接住：每年快樂 +2，健康風險 -2',
  },
  {
    id: 'pharmacist', title: '藥師', weight: 4, income: 60,
    ladder: ['藥師', '資深藥師', '藥局組長', '藥劑部主任', '連鎖藥局經理', '藥妝集團總監'],
    perk: { risk: -3, hp: 1 },
    perkText: '家裡就有藥師：健康風險每年 -3，健康 +1',
  },
  {
    id: 'realtor', title: '房仲', weight: 4, income: 48,
    ladder: ['房仲業務', '資深經紀人', '店長', '區經理', '加盟店老闆', '房仲集團董事'],
    perk: { house: 0.08 },
    perkText: '內行人帶看：買房便宜 8%',
  },
  {
    id: 'civil', title: '公務員', weight: 5, income: 48,
    ladder: ['辦事員', '科員', '股長', '科長', '專門委員', '主任秘書'],
    perk: { happy: 1, living: -0.05 },
    perkText: '收入穩定：每年快樂 +1，生活費省 5%',
  },
  {
    id: 'attendant', title: '空服員', weight: 4, income: 60,
    ladder: ['空服員', '資深空服員', '座艙長', '客艙經理', '客艙服務部副理', '空服處處長'],
    perk: { charm: 1, happy: -1 },
    perkText: '常常不在家：每年人緣 +1、快樂 -1，但收入不錯',
  },
  {
    id: 'farmer', title: '農場主人', weight: 3, income: 28,
    ladder: ['小農', '自產自銷農場', '產銷班班長', '觀光農場主人', '農業品牌創辦人', '食品加工廠老闆'],
    perk: { living: -0.2, hp: 1 },
    perkText: '吃自己種的：生活費省 20%，每年健康 +1',
  },
  {
    id: 'influencer', title: '網紅', weight: 3, income: 48, volatile: true,
    ladder: ['網紅', '中型創作者', '百萬訂閱創作者', '自有品牌經營者', '開經紀公司', '內容集團負責人'],
    perk: { charm: 2 },
    perkText: '收入忽高忽低（可能很誇張），每年人緣 +2',
  },
  {
    id: 'founder', title: '創業家', weight: 3, income: 72,
    ladder: ['創業家', '小公司老闆', '連鎖店老闆', '中型企業董事長', '集團副董事長', '上市公司董事長'],
    perk: { biz: 0.012 },
    perkText: '一起打拚：你的公司每年多成長 1.2%',
  },
  {
    id: 'lawyer', title: '律師', weight: 2, income: 104,
    ladder: ['律師', '資深律師', '事務所合夥人', '主持律師', '大型事務所主持人', '律師公會理事長'],
    perk: { biz: 0.008, living: -0.05 },
    perkText: '合約有人看：公司每年多成長 0.8%，糾紛少花錢',
  },
  {
    id: 'doctor', title: '醫生', weight: 2, income: 144,
    ladder: ['主治醫師', '資深主治醫師', '科主任', '副院長', '院長', '醫療集團總裁'],
    perk: { hpKeep: 0.4, risk: -5 },
    perkText: '家裡有醫生：老化掉的健康少 40%，健康風險每年 -5',
  },
  {
    id: 'landlord', title: '包租婆／包租公', weight: 2, income: 96,
    ladder: ['有幾間套房', '整層公寓收租', '整棟收租', '三棟以上', '商辦也收租', '不動產集團'],
    perk: { house: 0.15, living: -0.05 },
    perkText: '手上一堆房：買房便宜 15%，房租算你便宜',
  },
  {
    id: 'heir', title: '富二代', weight: 1, income: 24,
    ladder: ['富二代', '家族企業特助', '家族企業經理', '副總經理', '執行副總', '接掌家族集團'],
    perk: { gift: 800, happy: 1 },
    perkText: '家裡很有錢：結婚時直接給你 800 萬禮金',
  },
];

export const partnerType = (id) => PARTNER_TYPES.find((t) => t.id === id) || null;

// 目前對象（交往中或另一半）的類型
export const currentType = (s) => {
  const holder = s.married ? s.spouse : s.partner;
  return holder && holder.type ? partnerType(holder.type) : null;
};

// 對象帶來的能力（沒有對象就全部是 0）
export const partnerPerk = (s) => {
  const t = currentType(s);
  return t ? { ...t.perk } : {};
};

// 另一半每年幫家裡賺的錢（只有結婚後才算）
export const partnerIncome = (s, rng) => {
  if (!s.married) return 0;
  const t = currentType(s);
  if (!t) return 0;
  const base = t.income * WAN * s.priceIndex;
  if (t.volatile && rng) return Math.round(base * (0.3 + rng() * 2.4));
  return Math.round(base);
};

// 依權重隨機抽一種對象
export const rollPartnerType = (rng) => {
  const total = PARTNER_TYPES.reduce((t, x) => t + x.weight, 0);
  let r = rng() * total;
  for (const t of PARTNER_TYPES) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return PARTNER_TYPES[0];
};
