// 成就徽章：跨每一輩子永久收藏，純粹收集、不給獎勵。
// check(s, ctx) 每次狀態更新都會檢查一次；ctx = { book, meta, daily, memes }（跨存檔的資料）。
// hidden：還沒拿到之前只顯示「？？？」，連條件都不說。
import { netWorth } from './actions.js';
import { myRank } from './mates.js';
import { YI, WAN } from './utils.js';

const nw = (s) => netWorth(s);
const ended = (s) => !!s.ended;
const minHist = (s) => Math.min(0, ...(s.history || [0]));
const memeCount = (s) => Object.keys(s.seen || {}).filter((k) => k.startsWith('mm_')).length;
const dailyDays = (ctx) => Object.entries((ctx.daily && ctx.daily.runs) || {}).filter(([, r]) => r.payload).map(([d]) => d).sort();
const bestDaily = (ctx) => Math.min(...Object.values((ctx.daily && ctx.daily.runs) || {}).map((r) => (r.result ? r.result.rank : 1e9)), 1e9);
const streak = (days) => {
  let best = 0; let cur = 0; let prev = null;
  for (const d of days) {
    const t = Date.parse(`${d}T00:00:00Z`);
    cur = prev != null && t - prev === 86400000 ? cur + 1 : 1;
    best = Math.max(best, cur); prev = t;
  }
  return best;
};

export const BADGE_CATS = [
  { id: 'money', name: '財富', icon: '💰' },
  { id: 'life', name: '人生', icon: '🌱' },
  { id: 'career', name: '職業', icon: '💼' },
  { id: 'family', name: '家庭', icon: '🏡' },
  { id: 'meme', name: '神展開', icon: '😂' },
  { id: 'daily', name: '每日挑戰', icon: '📅' },
  { id: 'master', name: '高手', icon: '👑' },
];

export const BADGES = [
  // ── 財富 ──
  { id: 'nw_1m', cat: 'money', icon: '🪙', name: '第一桶金', desc: '淨資產突破 100 萬', check: (s) => nw(s) >= 100 * WAN },
  { id: 'nw_10m', cat: 'money', icon: '💵', name: '千萬俱樂部', desc: '淨資產突破 1,000 萬', check: (s) => nw(s) >= 1000 * WAN },
  { id: 'nw_yi', cat: 'money', icon: '🎯', name: '小目標達成', desc: '淨資產突破一億', check: (s) => nw(s) >= YI },
  { id: 'nw_10yi', cat: 'money', icon: '🏦', name: '十億身家', desc: '淨資產突破十億', check: (s) => nw(s) >= 10 * YI },
  { id: 'nw_100yi', cat: 'money', icon: '🌌', name: '百億傳說', desc: '淨資產突破一百億', hidden: true, check: (s) => nw(s) >= 100 * YI },
  { id: 'cash_50m', cat: 'money', icon: '🐷', name: '存錢筒成精', desc: '手上現金超過 5,000 萬', check: (s) => s.money >= 5000 * WAN },
  { id: 'crypto', cat: 'money', icon: '🪙', name: '幣圈大戶', desc: '加密幣部位超過 5,000 萬', check: (s) => (s.crypto || 0) >= 5000 * WAN },
  { id: 'landlord', cat: 'money', icon: '🏘️', name: '包租公', desc: '同時擁有 3 間房子', check: (s) => (s.houses || []).length >= 3 },
  { id: 'jackpot', cat: 'money', icon: '🎰', name: '頭獎得主', desc: '刮刮樂或樂透中頭獎', hidden: true, check: (s) => !!(s.flags && s.flags.jackpot) },
  { id: 'debt', cat: 'money', icon: '🕳️', name: '負債人生', desc: '淨資產跌到 -500 萬以下', check: (s) => nw(s) <= -500 * WAN },
  { id: 'comeback', cat: 'money', icon: '🔥', name: '谷底翻身', desc: '曾經負債 100 萬以上，最後還是破億', check: (s) => minHist(s) <= -100 * WAN && nw(s) >= YI },

  // ── 人生 ──
  { id: 'old85', cat: 'life', icon: '🎂', name: '平安到老', desc: '健健康康活到結算', check: (s) => ended(s) && s.ended.reason !== 'death' },
  { id: 'old100', cat: 'life', icon: '🐢', name: '百歲人瑞', desc: '活到 100 歲', hidden: true, check: (s) => s.age >= 100 },
  { id: 'young_end', cat: 'life', icon: '🥀', name: '英年早逝', desc: '40 歲前人生就落幕', check: (s) => ended(s) && s.ended.reason === 'death' && s.ended.age < 40 },
  { id: 'int90', cat: 'life', icon: '🧠', name: '天才', desc: '智力到 90 以上', check: (s) => s.stats.int >= 90 },
  { id: 'hp85', cat: 'life', icon: '🦾', name: '鐵人', desc: '健康到 85 以上', check: (s) => s.stats.hp >= 85 },
  { id: 'happy85', cat: 'life', icon: '😆', name: '快樂到飛起來', desc: '快樂到 85 以上', check: (s) => s.stats.happy >= 85 },
  { id: 'charm85', cat: 'life', icon: '🌟', name: '萬人迷', desc: '人緣到 85 以上', check: (s) => s.stats.charm >= 85 },
  { id: 'skip', cat: 'life', icon: '⏩', name: '跳級生', desc: '在學校跳級', check: (s) => !!(s.flags && s.flags.skipYears) },
  { id: 'topschool', cat: 'life', icon: '🏫', name: '明星高中', desc: '考上明星高中', check: (s) => !!(s.flags && s.flags.topSchool) },
  { id: 'topcollege', cat: 'life', icon: '🎓', name: '頂大畢業', desc: '頂尖大學畢業', check: (s) => s.edu === 'topCollege' || s.edu === 'topMaster' },
  { id: 'master', cat: 'life', icon: '📜', name: '研究所', desc: '念完研究所', check: (s) => s.edu === 'master' || s.edu === 'topMaster' },
  { id: 'sci', cat: 'life', icon: '🔬', name: '科展之星', desc: '科展得名', check: (s) => !!(s.flags && s.flags.sciSeed) },
  { id: 'idol', cat: 'life', icon: '🎤', name: '偶像出道', desc: '以偶像身分出道', check: (s) => !!(s.flags && s.flags.idol >= 2) },
  { id: 'band', cat: 'life', icon: '🎸', name: '搖滾魂', desc: '熱音大賽得名', check: (s) => !!(s.flags && s.flags.band >= 2) },
  { id: 'retire', cat: 'life', icon: '🏖️', name: '光榮退休', desc: '65 歲正式退休', check: (s) => !!s.retired },

  // ── 職業 ──
  { id: 'job', cat: 'career', icon: '🪪', name: '社會新鮮人', desc: '找到第一份工作', check: (s) => !!s.job },
  { id: 'hopper', cat: 'career', icon: '🦘', name: '跳槽達人', desc: '一輩子做過 5 份工作', check: (s) => (s.careers || []).length >= 5 },
  { id: 'boss', cat: 'career', icon: '🧑‍💼', name: '當老闆', desc: '自己開一間公司', check: (s) => (s.bizs || []).some((b) => !b.group) || !!(s.flags && s.flags.everBiz) },
  { id: 'mna', cat: 'career', icon: '🦈', name: '併購大鯊', desc: '收購別人的公司', check: (s) => (s.bizs || []).some((b) => b.group) || !!(s.flags && s.flags.everMna) },
  { id: 'route', cat: 'career', icon: '🚀', name: '逆襲成功', desc: '走完一條逆襲路線', check: (s) => !!(s.route && s.route.done) },
  { id: 'legend', cat: 'career', icon: '🏆', name: '傳說職業', desc: '當上任一種傳說職業', check: (s) => (s.legends || []).length > 0 },
  { id: 'legend5', cat: 'career', icon: '📚', name: '圖鑑收藏家', desc: '職業圖鑑解鎖 5 種傳說職業', check: (s, ctx) => Object.keys(ctx.book || {}).length >= 5 },
  { id: 'rank1', cat: 'career', icon: '🥇', name: '同屆第一', desc: '結算時身價是同屆第一名', check: (s) => ended(s) && !!s.mates && myRank(s, nw(s)).rank === 1 },

  // ── 家庭 ──
  { id: 'married', cat: 'family', icon: '💍', name: '結婚', desc: '跟另一半結婚', check: (s) => !!s.married },
  { id: 'exes3', cat: 'family', icon: '💔', name: '情場老手', desc: '分手過 3 次', check: (s) => (s.exes || []).length >= 3 },
  { id: 'kid', cat: 'family', icon: '👶', name: '當爸媽了', desc: '生下第一個孩子', check: (s) => (s.kids || []).length >= 1 },
  { id: 'kids3', cat: 'family', icon: '👨‍👩‍👧‍👦', name: '大家庭', desc: '有 3 個孩子', check: (s) => (s.kids || []).length >= 3 },
  { id: 'kidstar', cat: 'family', icon: '🌠', name: '虎爸虎媽', desc: '孩子長大很有成就', check: (s) => (s.kids || []).some((k) => k.outcome === 'star') },
  { id: 'pet', cat: 'family', icon: '🐾', name: '毛孩家長', desc: '養一隻寵物', check: (s) => (s.pets || []).length >= 1 },
  { id: 'petstar', cat: 'family', icon: '📸', name: '寵物網紅', desc: '你的寵物紅了', check: (s) => (s.pets || []).some((p) => p.famous) },

  // ── 神展開（梗事件）──
  { id: 'meme1', cat: 'meme', icon: '😂', name: '神展開', desc: '遇到第一件神展開', check: (s) => memeCount(s) >= 1 },
  { id: 'meme8', cat: 'meme', icon: '🤪', name: '人生太荒謬', desc: '一輩子遇到 8 件神展開', check: (s) => memeCount(s) >= 8 },
  { id: 'meme25', cat: 'meme', icon: '🗂️', name: '迷因收藏家', desc: '累積看過 25 種神展開', check: (s, ctx) => (ctx.memes || 0) >= 25 },
  { id: 'meme50', cat: 'meme', icon: '🧾', name: '全都看過了', desc: '50 種神展開全部看過', hidden: true, check: (s, ctx) => (ctx.memes || 0) >= 50 },
  { id: 'mw_doge', cat: 'meme', icon: '🐕', name: '阿柴幣翻 20 倍', desc: '梭哈阿柴幣而且賭贏了', hidden: true, check: (s) => !!(s.flags && s.flags.mwDoge) },
  { id: 'mw_cgod', cat: 'meme', icon: '🅲', name: 'C 神', desc: '十題全猜 C 全對', hidden: true, check: (s) => !!(s.flags && s.flags.mwCgod) },
  { id: 'mw_bike', cat: 'meme', icon: '🛵', name: '套中機車', desc: '夜市套圈圈拿到機車', hidden: true, check: (s) => !!(s.flags && s.flags.mwBike) },
  { id: 'mw_wallet', cat: 'meme', icon: '🔓', name: '打開舊錢包', desc: '破解二十年前的加密錢包', hidden: true, check: (s) => !!(s.flags && s.flags.mwWallet) },
  { id: 'mw_uni', cat: 'meme', icon: '👴', name: '最老的學長', desc: '跟孫子一起念大學', hidden: true, check: (s) => !!(s.flags && s.flags.mwUni) },

  // ── 每日挑戰 ──
  { id: 'd_first', cat: 'daily', icon: '📅', name: '初次挑戰', desc: '打完一場每日排名賽', check: (s, ctx) => dailyDays(ctx).length >= 1 },
  { id: 'd_streak3', cat: 'daily', icon: '🔥', name: '連續三天', desc: '連續 3 天打排名賽', check: (s, ctx) => streak(dailyDays(ctx)) >= 3 },
  { id: 'd_streak7', cat: 'daily', icon: '🗓️', name: '一週全勤', desc: '連續 7 天打排名賽', check: (s, ctx) => streak(dailyDays(ctx)) >= 7 },
  { id: 'd_top10', cat: 'daily', icon: '🔟', name: '全球前十', desc: '每日挑戰拿到前 10 名', check: (s, ctx) => bestDaily(ctx) <= 10 },
  { id: 'd_top1', cat: 'daily', icon: '👑', name: '今日之王', desc: '每日挑戰拿到全球第一', check: (s, ctx) => bestDaily(ctx) <= 1 },

  // ── 高手 ──
  { id: 'yi_40', cat: 'master', icon: '⚡', name: '40 歲前破億', desc: '40 歲以前資產突破一億', check: (s) => !!s.achievedAge && s.achievedAge <= 40 },
  { id: 'yi_30', cat: 'master', icon: '🚀', name: '30 歲前破億', desc: '30 歲以前資產突破一億', hidden: true, check: (s) => !!s.achievedAge && s.achievedAge <= 30 },
  { id: 'hard_yi', cat: 'master', icon: '🧗', name: '困難模式破億', desc: '挑戰難度結算時有一億', check: (s) => ended(s) && s.difficulty === 'hard' && nw(s) >= YI },
  { id: 'hell_yi', cat: 'master', icon: '😈', name: '地獄歸來', desc: '地獄難度結算時有一億', check: (s) => ended(s) && s.difficulty === 'hell' && nw(s) >= YI },
  { id: 'lives10', cat: 'master', icon: '♻️', name: '輪迴十世', desc: '玩完 10 輩子', check: (s, ctx) => ((ctx.meta && ctx.meta.lives) || 0) >= 10 },
  { id: 'lives50', cat: 'master', icon: '🌀', name: '看破紅塵', desc: '玩完 50 輩子', hidden: true, check: (s, ctx) => ((ctx.meta && ctx.meta.lives) || 0) >= 50 },
];

// 這一次新拿到的徽章（got：已經拿過的 { id: {...} }）
export function newBadges(s, got, ctx) {
  if (!s) return [];
  const out = [];
  for (const b of BADGES) {
    if (got[b.id]) continue;
    try { if (b.check(s, ctx)) out.push(b); } catch { /* 條件算不出來就當沒拿到 */ }
  }
  return out;
}
