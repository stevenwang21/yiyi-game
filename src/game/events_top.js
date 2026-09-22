// 第六批事件：站上頂峰之後，錢自己找上門
// 條件：已經破億，而且是同屆第一名或淨資產 3 億以上
import { addStats, chance, formatMoney, rint, WAN, YI } from './utils.js';
import { addSkill, netWorth } from './actions.js';
import { myRank } from './mates.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });

// 你是不是「最強的那一個」
export const isTop = (s) => {
  if (!s.achievedAge) return false;
  const nw = netWorth(s);
  if (nw >= 3 * YI) return true;
  if ((s.mates || []).length && myRank(s, nw).rank === 1) return true;
  return false;
};

// 依身家算一筆錢（身家越高、塞得越多），最少也有一筆像樣的數字，取整到萬
const cut = (s, pct, minWan) => {
  const v = Math.max(netWorth(s) * pct, minWan * WAN * (s.priceIndex || 1));
  return Math.round(v / WAN) * WAN;
};
const gain = (s, amt) => { s.money += amt; return `（+${formatMoney(amt)}）`; };

export const TOP_EVENTS = [
  {
    id: 'top_endorse', art: 'talent', minAge: 25, maxAge: 80, weight: 9, cond: isTop, title: '品牌搶著找你代言',
    text: '「白手起家的億萬富翁」成了最好賣的人設。三個品牌的經紀人同一天打給你的秘書，開價一個比一個高。',
    choices: [
      { label: '接下最高價的那個', sub: '拿錢、人緣↑', effect: (s) => good(`你拍了一支三十秒的廣告，台詞只有一句。${gain(s, cut(s, 0.008, 300))}${addStats(s, { charm: 4 })}`) },
      { label: '只接理財教育的公益廣告', sub: '人緣↑↑、快樂↑', effect: (s) => good(`你把代言費全捐給偏鄉的理財課程，新聞標題是「億萬富翁的另一種投資」。${addStats(s, { charm: 8, happy: 6 })}`) },
      { label: '全部推掉', sub: '清靜', effect: (s) => `你說你不想被當成商品。秘書嘆了一口氣。${addStats(s, { happy: 2 })}` },
    ],
  },
  {
    id: 'top_fund', art: 'money', minAge: 30, maxAge: 80, weight: 8, cond: isTop, title: '有人要把錢交給你管',
    text: '同學會之後，好幾個老同學、老客戶私下來找你：「你幫我們管錢吧，賺多少分你兩成。」加起來有好幾億。',
    choices: [
      {
        label: '成立私人基金，收管理費', sub: '每年多一筆收入，但要負責',
        effect: (s, rng) => {
          if (chance(rng, 0.8 + Math.min(0.15, s.investSkill * 0.02))) {
            addSkill(s, 1);
            return good(`第一年就交出兩位數的報酬，大家搶著加碼。管理費和分紅進帳${gain(s, cut(s, 0.012, 400))}。投資眼光提升！${addStats(s, { charm: 3 })}`);
          }
          const loss = cut(s, 0.004, 100);
          s.money -= loss;
          return bad(`那一年剛好碰到震盪，你自掏腰包補了別人的虧損才保住交情。（-${formatMoney(loss)}）${addStats(s, { happy: -6, charm: 2 })}`);
        },
      },
      { label: '婉拒，朋友和錢分開', sub: '安全', effect: (s) => `你說：「賺了是交情，賠了就不是了。」大家都懂。${addStats(s, { happy: 1 })}` },
    ],
  },
  {
    id: 'top_angel', art: 'deal', minAge: 28, maxAge: 80, weight: 8, cond: (s) => isTop(s) && (s.bizs || []).length > 0, title: '投資人排隊想投你的公司',
    text: (s) => `「${s.bizs[0].name}」的會議室外面坐滿了人。三家創投、兩家國際基金，都想用更高的估值入股。`,
    choices: [
      {
        label: '讓出一成股份', sub: '公司估值拉高、拿到現金',
        effect: (s) => {
          const b = s.bizs[0];
          const before = b.value;
          b.value = Math.round(b.value * 1.35);
          const cash = Math.round(before * 0.12);
          return good(`新一輪估值讓「${b.name}」的價值從 ${formatMoney(before)} 變成 ${formatMoney(b.value)}，你還拿到了一筆現金${gain(s, cash)}。${addStats(s, { happy: 5 })}`);
        },
      },
      { label: '不賣，自己的公司自己決定', sub: '人緣↑', effect: (s) => `你說公司不缺錢。這句話讓估值傳得更高了。${addStats(s, { charm: 4, happy: 2 })}` },
    ],
  },
  {
    id: 'top_honor', art: 'trophy', minAge: 30, maxAge: 85, weight: 6, cond: isTop, once: true, title: '母校頒你榮譽博士',
    text: '你以前讀的學校寄來一封很正式的信：想頒給你榮譽博士學位，還請你在畢業典禮上致詞。',
    choices: [
      { label: '去！', sub: '演講費、人緣↑↑、快樂↑', effect: (s) => good(`你站上講台，說了一句「我以前也坐在你們那個位子」，台下整片安靜。之後邀約演講排滿半年${gain(s, cut(s, 0.002, 60))}。${addStats(s, { charm: 8, happy: 8 })}` ) },
      { label: '捐一棟大樓給母校', sub: '花錢，人緣↑↑↑', effect: (s) => { const c = cut(s, 0.02, 500); s.money -= c; return good(`你捐了一棟新的圖書館（-${formatMoney(c)}），大樓用你的名字命名。${addStats(s, { charm: 14, happy: 10 })}`); } },
    ],
  },
  {
    id: 'top_book', art: 'study', minAge: 30, maxAge: 85, weight: 6, cond: isTop, once: true, title: '出版社搶著出你的自傳',
    text: '四家出版社同時提案，書名都想好了：《從零到一億》《我是怎麼賺到第一個億的》……',
    choices: [
      { label: '自己寫，老老實實講', sub: '版稅、人緣↑', effect: (s, rng) => { const hit = chance(rng, 0.5); return good(`書上市${hit ? '連續二十週登上暢銷榜，還賣出了翻譯版權' : '賣得還不錯'}${gain(s, cut(s, hit ? 0.006 : 0.002, hit ? 200 : 60))}。${addStats(s, { charm: hit ? 8 : 4, int: 2 })}`); } },
      { label: '找人代筆，寫得勵志一點', sub: '版稅，但有風險', effect: (s, rng) => (chance(rng, 0.7) ? good(`書很好賣${gain(s, cut(s, 0.004, 120))}，但你自己翻了兩頁就放下了。${addStats(s, { charm: 3, happy: -1 })}`) : bad(`網友逐條抓出書裡的誇大內容，你被罵了一個月。${addStats(s, { charm: -8, happy: -6 })}`)) },
      { label: '不出書', sub: '低調', effect: (s) => `你說人生還沒過完，現在寫太早了。${addStats(s, { happy: 1 })}` },
    ],
  },
  {
    id: 'top_board', art: 'company', minAge: 35, maxAge: 80, weight: 6, cond: isTop, title: '上市公司請你當董事',
    text: '一家上市公司想請你擔任獨立董事，一年開十幾次會，董事酬勞和股票都很優渥。',
    choices: [
      { label: '接下董事席位', sub: '收入、人緣↑、健康↓一點', effect: (s) => good(`你開始每個月去開一次董事會，順便認識了一整圈的企業家${gain(s, cut(s, 0.005, 150))}。${addStats(s, { charm: 5, hp: -1 })}`) },
      { label: '太忙了，推掉', sub: '健康↑', effect: (s) => `你把時間留給自己的事業和家人。${addStats(s, { hp: 2, happy: 2 })}` },
    ],
  },
  {
    id: 'top_redenvelope', art: 'gift', minAge: 30, maxAge: 85, weight: 5, cond: isTop, title: '有人在門口塞紅包想拜師',
    text: '一個年輕人在你家門口站了三天，手裡捧著一個很厚的紅包：「拜託收我當徒弟，教我怎麼賺錢！」',
    choices: [
      { label: '紅包退回，但收他當徒弟', sub: '人緣↑↑、快樂↑', effect: (s) => good(`你把紅包塞回他手上，帶他從記帳開始學起。十年後他成了你公司最可靠的主管。${addStats(s, { charm: 7, happy: 6 })}`) },
      { label: '收下紅包，請他吃頓飯', sub: '小賺一筆', effect: (s, rng) => { const amt = Math.round(rint(rng, 10, 30) * WAN * (s.priceIndex || 1) / WAN) * WAN; return `你收了紅包${gain(s, amt)}，吃飯時跟他說：「第一課：不要隨便把錢交給陌生人。」他愣了很久。${addStats(s, { happy: 2, charm: -2 })}`; } },
    ],
  },
  {
    id: 'top_club', art: 'city', minAge: 35, maxAge: 80, weight: 5, cond: isTop, title: '富豪俱樂部邀你合資',
    text: '你收到一張燙金的邀請函，一群身價百億的前輩想拉你一起合資一個海外開發案，一個人出一份。',
    choices: [
      {
        label: '跟！', sub: '高報酬、有風險',
        effect: (s, rng) => {
          const stake = cut(s, 0.05, 1000);
          if (chance(rng, 0.62)) { const back = Math.round(stake * 0.9); s.money += back; return good(`案子三年後順利出場，你那一份翻了將近一倍（+${formatMoney(back)}）。俱樂部的人開始叫你「小老弟」。${addStats(s, { charm: 5, happy: 6 })}`); }
          s.money -= stake;
          return bad(`當地政策突然改變，整個案子卡住了，你那一份拿不回來（-${formatMoney(stake)}）。${addStats(s, { happy: -8 })}`);
        },
      },
      { label: '只去吃飯，不出錢', sub: '人緣↑', effect: (s) => `你在晚宴上聽了一整晚的故事，名片收了一疊。${addStats(s, { charm: 4, happy: 2 })}` },
    ],
  },
  {
    id: 'top_relatives', art: 'family', minAge: 30, maxAge: 85, weight: 4, cond: isTop, title: '失聯十年的親戚都出現了',
    text: '過年的時候，客廳擠滿了你幾乎不認識的遠房親戚，每一個都說「以前有抱過你」，而且都有一個投資計畫要跟你分享。',
    choices: [
      { label: '每人包一個大紅包打發', sub: '花錢買清靜', effect: (s) => { const c = cut(s, 0.003, 50); s.money -= c; return `你發了一輪紅包（-${formatMoney(c)}），客廳終於安靜了。${addStats(s, { happy: 2 })}`; } },
      { label: '笑笑地聽完，什麼都不投', sub: '人緣↓一點', effect: (s) => `你一整晚都在點頭，最後說：「我再研究看看。」有兩個親戚從此沒再來過。${addStats(s, { charm: -2, happy: 1 })}` },
    ],
  },
];
