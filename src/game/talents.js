// 才藝：一共 30 種，每次「要學才藝嗎？」會隨機端出 4 種讓你選
// 學過的才藝不會再出現，全部學完就不會再跳這個事件
import { addStats, formatMoney, WAN } from './utils.js';
import { addSkill } from './actions.js';

const good = (text) => ({ text, tone: 'good' });
const P = (s, v) => Math.round(v * s.priceIndex);

export const learned = (s) => s.flags.talents || [];

// 可以「上台表演」的才藝，和表演時的說法（才藝表演事件會用）
export const PERFORM = {
  piano: '彈鋼琴', violin: '拉小提琴', guitar: '彈吉他', drum: '打爵士鼓', sing: '唱歌',
  dance: '跳舞', magic: '變魔術', paint: '現場作畫', debate: '上台演講', taekwondo: '表演跆拳道',
};
export const performTalent = (s) => learned(s).find((id) => PERFORM[id]) || null;
const learn = (s, id) => {
  s.flags.talents = [...learned(s), id];
};

// 學費：18 歲前爸媽付（只記在文字裡，不扣你的錢）
const fee = (s, wan) => `（學費一年 ${formatMoney(P(s, wan * WAN))}，爸媽付的）`;

export const TALENTS = [
  { id: 'piano', label: '鋼琴', sub: '智力、人緣↑', cost: 4, adult: { side: 1.5 }, grown: '長大後可以教琴、接表演', text: (s) => `你開始學鋼琴，手指越來越靈活，過年還能表演一首。${addStats(s, { int: 3, charm: 4, happy: -1 })}` },
  { id: 'violin', label: '小提琴', sub: '人緣↑↑', cost: 5, adult: { side: 1.5 }, grown: '長大後可以接演出', text: (s) => `剛開始拉起來像殺雞，半年後居然有模有樣。${addStats(s, { charm: 6, happy: -2, int: 1 })}` },
  { id: 'guitar', label: '吉他', sub: '人緣↑、快樂↑', cost: 2, adult: { side: 1 }, grown: '長大後可以接駐唱', text: (s) => `你學會了四個和弦，就足以在營火晚會當主角。${addStats(s, { charm: 5, happy: 4 })}` },
  { id: 'drum', label: '爵士鼓', sub: '快樂↑↑', cost: 3, adult: { side: 1 }, grown: '長大後可以接表演', text: (s) => `你打鼓打到鄰居來按電鈴，但你真的很快樂。${addStats(s, { happy: 7, hp: 2, charm: 2 })}` },
  { id: 'sing', label: '聲樂', sub: '人緣↑', cost: 3, adult: { side: 1.5 }, grown: '長大後可以接婚禮和商演', text: (s) => `老師說你的音準很好，合唱團把你排在第一排。${addStats(s, { charm: 5, happy: 2 })}` },
  { id: 'swim', label: '游泳', sub: '健康↑↑', cost: 2, adult: { hpKeep: 0.1 }, grown: '長大後身體底子好', text: (s) => `你學會了自由式和蛙式，游到現在都不會沉。${addStats(s, { hp: 7 })}` },
  { id: 'code', label: '程式設計', sub: '智力↑↑', cost: 4, adult: { salary: 0.04, biz: 0.005 }, grown: '長大後薪水高、開公司有優勢', text: (s) => `你用積木程式做出第一個小遊戲，同學都排隊要玩。${addStats(s, { int: 7, charm: 1 })}` },
  { id: 'abacus', label: '珠心算', sub: '智力↑、算得快', cost: 2, adult: { alpha: 0.004 }, grown: '長大後投資判斷準', text: (s) => { addSkill(s, 1); return `你心算的速度比計算機還快，對數字變得很敏感。投資眼光提升！${addStats(s, { int: 5 })}`; } },
  { id: 'calligraphy', label: '書法', sub: '智力↑、沉得住氣', cost: 2, adult: { side: 0.5 }, grown: '長大後可以幫人寫春聯', text: (s) => { s.flags.patient = true; return `你一筆一畫寫了好幾年，寫字的時候心特別靜。（投資比較有耐心）${addStats(s, { int: 4, happy: 1 })}`; } },
  { id: 'paint', label: '繪畫', sub: '人緣↑、快樂↑', cost: 3, adult: { side: 1.2 }, grown: '長大後可以接插畫案', text: (s) => `你的畫被貼在教室後面的公佈欄，還得過縣市美術比賽。${addStats(s, { charm: 4, happy: 4, int: 1 })}` },
  { id: 'dance', label: '舞蹈', sub: '健康↑、人緣↑', cost: 3, adult: { side: 1, hpKeep: 0.05 }, grown: '長大後可以接表演、身體好', text: (s) => `你在舞台上跳完整支舞，燈光一打整個人都亮了。${addStats(s, { hp: 4, charm: 5 })}` },
  { id: 'taekwondo', label: '跆拳道', sub: '健康↑↑', cost: 3, adult: { hpKeep: 0.12 }, grown: '長大後身體底子很好', text: (s) => `你踢破了人生第一塊木板，考到了黃帶。${addStats(s, { hp: 7, happy: 2 })}` },
  { id: 'basketball', label: '籃球', sub: '健康↑、人緣↑', cost: 2, adult: { hpKeep: 0.1 }, grown: '長大後身體底子好', text: (s) => `你成了班隊的主力，下課鐘一響就往球場衝。${addStats(s, { hp: 6, charm: 4 })}` },
  { id: 'baseball', label: '棒球', sub: '健康↑↑', cost: 3, adult: { hpKeep: 0.1 }, grown: '長大後身體底子好', text: (s) => `你在少棒隊守二壘，暑假天天在太陽下練球。${addStats(s, { hp: 7, charm: 2, int: -1 })}` },
  { id: 'soccer', label: '足球', sub: '健康↑↑、人緣↑', cost: 2, adult: { hpKeep: 0.12 }, grown: '長大後身體底子很好', text: (s) => `你跑了整場都不會喘，體力好得嚇人。${addStats(s, { hp: 8, charm: 2 })}` },
  { id: 'english', label: '英文會話', sub: '智力↑、以後加薪', cost: 6, adult: { salary: 0.08 }, grown: '長大後起薪和薪水都高', text: (s) => { s.flags.english = true; return `你敢開口跟外籍老師聊天了，這個能力以後很值錢。（出社會後薪水多一點）${addStats(s, { int: 5, charm: 2 })}`; } },
  { id: 'japanese', label: '日文', sub: '智力↑、人緣↑', cost: 5, adult: { salary: 0.03 }, grown: '長大後薪水高一點', text: (s) => `你看動畫不用字幕了，還會唱幾首日文歌。${addStats(s, { int: 4, charm: 3 })}` },
  { id: 'chess', label: '圍棋', sub: '智力↑↑、沉得住氣', cost: 3, adult: { alpha: 0.004 }, grown: '長大後投資判斷準', text: (s) => { s.flags.patient = true; return `你學會了先想三步再落子，這個習慣跟了你一輩子。（投資比較有耐心）${addStats(s, { int: 6 })}`; } },
  { id: 'debate', label: '演講辯論', sub: '人緣↑↑、智力↑', cost: 3, adult: { promo: 0.06, salary: 0.02 }, grown: '長大後很會爭取升遷', text: (s) => `你拿了全校演講比賽第二名，從此不怕上台。${addStats(s, { charm: 6, int: 3 })}` },
  { id: 'magic', label: '魔術', sub: '人緣↑↑', cost: 2, adult: { promo: 0.03 }, grown: '長大後應酬場合吃得開', text: (s) => `你學了三招撲克牌魔術，從此在任何場合都不冷場。${addStats(s, { charm: 7, happy: 3 })}` },
  { id: 'cook', label: '烹飪', sub: '健康↑、快樂↑', cost: 2, adult: { living: -0.05 }, grown: '長大後自己煮，生活費省', text: (s) => `你做的蛋炒飯全家搶著吃，從此廚房有你的位置。${addStats(s, { hp: 4, happy: 4, charm: 2 })}` },
  { id: 'photo', label: '攝影', sub: '人緣↑、智力↑', cost: 4, adult: { side: 2 }, grown: '長大後可以接攝影案', text: (s) => `你開始注意光線和構圖，拍出來的照片跟別人就是不一樣。${addStats(s, { charm: 4, int: 3 })}` },
  { id: 'robot', label: '機器人', sub: '智力↑↑', cost: 6, adult: { salary: 0.05 }, grown: '長大後薪水高', text: (s) => `你組的機器人在比賽場上走完全程，隊友歡呼。${addStats(s, { int: 8, charm: 1, happy: 1 })}` },
  { id: 'science', label: '科學實驗班', sub: '智力↑↑', cost: 5, adult: { salary: 0.04 }, grown: '長大後薪水高', text: (s) => `你每週在實驗室做火山和電路，筆記寫了三大本。${addStats(s, { int: 7 })}` },
  { id: 'money', label: '兒童理財課', sub: '投資眼光↑↑', cost: 4, adult: { alpha: 0.006 }, grown: '長大後投資判斷很準', text: (s) => { addSkill(s, 2); return `你學會了複利、分散風險，還開了人生第一個帳戶。投資眼光大幅提升！${addStats(s, { int: 3 })}`; } },
  { id: 'biz', label: '小創業家營', sub: '經商頭腦', cost: 5, adult: { biz: 0.008 }, grown: '長大後做生意有一套', text: (s) => { s.flags.bizSense = true; return `你和同學一起擺攤賣手工餅乾，三天賺了八百塊。經商能力提升！${addStats(s, { int: 2, charm: 4 })}`; } },
  { id: 'scout', label: '童軍', sub: '健康↑、人緣↑', cost: 2, adult: { hpKeep: 0.06 }, grown: '長大後身體底子好', text: (s) => `你學會了升火、打繩結，露營時大家都靠你。${addStats(s, { hp: 5, charm: 4, happy: 2 })}` },
  { id: 'yoga', label: '兒童瑜伽', sub: '健康↑、快樂↑', cost: 3, adult: { hpKeep: 0.1 }, grown: '長大後身體底子好', text: (s) => `你的柔軟度好到可以把腳放到頭後面，睡眠也變好了。${addStats(s, { hp: 6, happy: 3 })}` },
  { id: 'pottery', label: '陶藝', sub: '快樂↑、沉得住氣', cost: 3, adult: { side: 0.8 }, grown: '長大後可以賣作品', text: (s) => { s.flags.patient = true; return `你捏壞了十個碗才做出一個能用的，但你一點都不急。（投資比較有耐心）${addStats(s, { happy: 5, int: 2 })}`; } },
  { id: 'ice', label: '直排輪', sub: '健康↑、快樂↑', cost: 2, adult: { hpKeep: 0.06 }, grown: '長大後身體底子好', text: (s) => `你在公園繞圈圈繞到天黑，摔了無數次也不怕。${addStats(s, { hp: 6, happy: 4 })}` },
];

const talentChoices = TALENTS.map((t) => ({
  label: `學${t.label}`,
  sub: t.sub,
  cond: (s) => !learned(s).includes(t.id),
  effect: (s) => {
    learn(s, t.id);
    return good(`${t.text(s)}${t.grown ? `（${t.grown}）` : ''}${fee(s, t.cost)}`);
  },
}));

// 成年後的加成（有上限，學再多也不會壞了平衡）
const CAPS = { salary: 0.1, side: 5, hpKeep: 0.5, promo: 0.12, alpha: 0.01, biz: 0.012, living: -0.12 };

export function talentBonus(s) {
  const out = { salary: 0, side: 0, hpKeep: 0, promo: 0, alpha: 0, biz: 0, living: 0 };
  for (const id of learned(s)) {
    const def = TALENTS.find((x) => x.id === id);
    if (!def || !def.adult) continue;
    for (const k of Object.keys(def.adult)) out[k] = (out[k] || 0) + def.adult[k];
  }
  for (const k of Object.keys(out)) {
    const cap = CAPS[k];
    if (cap == null) continue;
    out[k] = cap < 0 ? Math.max(cap, out[k]) : Math.min(cap, out[k]);
  }
  return out;
}

// 給畫面看的文字：「薪水+7%、副業 3 萬、生活費-5%」
export function talentBonusText(s) {
  const b = talentBonus(s);
  const parts = [];
  if (b.salary) parts.push(`薪水+${Math.round(b.salary * 100)}%`);
  if (b.side) parts.push(`副業 ${b.side.toFixed(1).replace('.0', '')} 萬/年`);
  if (b.hpKeep) parts.push(`老化-${Math.round(b.hpKeep * 100)}%`);
  if (b.promo) parts.push(`升遷+${Math.round(b.promo * 100)}%`);
  if (b.alpha) parts.push(`投資+${(b.alpha * 100).toFixed(1)}%`);
  if (b.biz) parts.push(`事業+${(b.biz * 100).toFixed(1)}%`);
  if (b.living) parts.push(`生活費${Math.round(b.living * 100)}%`);
  return parts.join('、');
}

export const TALENT_EVENT = {
  id: 'talent_class', minAge: 4, maxAge: 16, weight: 12,
  title: '要學才藝嗎？',
  text: (s) => (learned(s).length
    ? `你已經學過 ${learned(s).length} 樣才藝了。媽媽問你要不要再學一樣？`
    : '媽媽拿了一疊才藝班的傳單回家，問你想學哪一樣。'),
  cond: (s) => learned(s).length < TALENTS.length,
  pick: 4, // 每次隨機端出 4 樣沒學過的
  choices: [
    ...talentChoices,
    { label: '不想學，我要去玩', sub: '快樂↑', always: true, effect: (s) => `你想多一點時間玩。${addStats(s, { happy: 4 })}` },
  ],
};
