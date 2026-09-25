// 結算時給的稱號：看你這輩子實際怎麼玩，不是看你賺多少。
// 每個稱號給一個分數，取最高的那個；都不夠格就給「平凡人」。
// 分數不用調得很精準，重點是玩法不同會拿到不同的稱號。
const WAN = 10000;

// 這輩子某件事做過幾次
const t = (s, k) => (s.focusTally || {})[k] || 0;
// 出社會之後總共做了幾件事（拿來算比例，免得長壽的人什麼都贏）
const totalFocus = (s) => Object.values(s.focusTally || {}).reduce((a, b) => a + b, 0) || 1;
const ratio = (s, keys) => keys.reduce((a, k) => a + t(s, k), 0) / totalFocus(s);

export const TITLES = [
  {
    id: 'grinder', name: '拼命三郎', icon: '🔥',
    desc: '一輩子都在工作，身體是最後才想到的事',
    score: (s) => ratio(s, ['work']) * 4.5 + (s.stats.hp < 40 ? 1 : 0) - ratio(s, ['rest', 'gym']) * 2,
  },
  {
    id: 'ironman', name: '鐵人', icon: '💪',
    desc: '再忙也要運動，活得比誰都久',
    score: (s) => ratio(s, ['gym', 'sport']) * 4 + (s.stats.hp >= 70 ? 1.2 : 0) + (s.age >= 75 ? 0.8 : 0),
  },
  {
    id: 'gambler', name: '賭徒', icon: '🎲',
    desc: '把身家押在會跳的東西上，心臟很大顆',
    score: (s) => {
      const bets = (s.trades || []).filter((x) => x.key === 'crypto' && x.amt > 0);
      const amt = bets.reduce((a, x) => a + x.amt, 0);
      return (amt > 500 * WAN ? 2.5 : amt > 100 * WAN ? 1.2 : 0) + (bets.length >= 4 ? 1 : 0);
    },
  },
  {
    id: 'steady', name: '穩健老實人', icon: '🏦',
    desc: '定期定額、不碰不懂的東西，時間幫你賺錢',
    // 定期定額幾乎人人都會設，所以這個稱號要「沒有別的更鮮明的特徵」才拿得到
    score: (s) => {
      const tr = s.trades || [];
      const dca = tr.filter((x) => x.kind === 'dca').length;
      const wild = tr.filter((x) => x.key === 'crypto' || x.key === 'stock').length;
      return (dca >= 20 ? 1.6 : dca >= 10 ? 0.9 : 0) + (wild === 0 ? 0.6 : 0)
        - (wild > 5 ? 1.5 : 0) - ((s.bizs || []).length ? 0.8 : 0);
    },
  },
  {
    id: 'family', name: '家庭至上', icon: '🏠',
    desc: '錢再多也比不上晚餐桌上有人等你',
    score: (s) => ratio(s, ['family', 'date']) * 4 + (s.kids || []).length * 0.5 + (s.married ? 0.5 : -1),
  },
  {
    id: 'social', name: '交際花', icon: '🤝',
    desc: '人脈就是錢脈，你把這句話活成真的',
    score: (s) => ratio(s, ['network', 'friends']) * 4 + (s.stats.charm >= 80 ? 1.2 : 0),
  },
  {
    id: 'nerd', name: '書呆子', icon: '📚',
    desc: '一路念到底，腦子是你唯一的本錢',
    score: (s) => ratio(s, ['study', 'cram', 'learn']) * 3.5 + (s.stats.int >= 82 ? 1.2 : 0),
  },
  {
    id: 'founder', name: '連續創業家', icon: '🚀',
    desc: '上班是不可能上班的，這輩子都在開公司',
    score: (s) => (s.bizs || []).length * 1.6 + ratio(s, ['startbiz', 'runbiz']) * 3.5,
  },
  {
    id: 'slacker', name: '快樂至上', icon: '🎮',
    desc: '錢沒賺到，但你每一天都過得很爽',
    score: (s) => ratio(s, ['play', 'rest']) * 4 + (s.stats.happy >= 80 ? 1.5 : 0),
  },
  {
    id: 'hero', name: '反詐英雄', icon: '🛡️',
    desc: '詐騙集團看到你的名字會發抖',
    score: (s) => ((s.flags || {}).bustCount || 0) * 1.6,
  },
  {
    id: 'landlord', name: '包租公', icon: '🔑',
    desc: '房子替你上班，你只要收錢',
    score: (s) => (s.houses || []).length * 1.5,
  },
  {
    id: 'lucky', name: '狗屎運', icon: '🍀',
    desc: '不是你多會，是老天爺特別照顧你',
    score: (s) => ((s.flags || {}).windfall ? 2.6 : 0),
  },
];

export const lifeTitle = (s) => {
  let best = null;
  for (const x of TITLES) {
    let v = 0;
    try { v = x.score(s) || 0; } catch (_) { v = 0; }
    if (!best || v > best.v) best = { ...x, v };
  }
  if (!best || best.v < 1.2) {
    return { id: 'normal', name: '平凡人', icon: '🙂', desc: '沒有特別拼，也沒有特別廢，就這樣過完一生' };
  }
  return best;
};
