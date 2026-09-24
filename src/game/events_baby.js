// 第四批事件：0～6 歲的童年（30 個）
// 沒有 choices 的是「小事件」，有 choices 的會跳出來讓玩家選
import { addStats, chance, formatMoney, rint, WAN } from './utils.js';
import { addPet, addSkill, alivePets, petExpense } from './actions.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });
const P = (s, v) => Math.round(v * s.priceIndex);
const paidBy = (byParents) => (byParents ? '（爸媽付的）' : '');

export const BABY_EVENTS = [
  // ───────── 0～2 歲 ─────────
  {
    id: 'b_firststep', minAge: 1, maxAge: 2, weight: 3, once: true, title: '第一步',
    effect: (s) => good(`你放開沙發自己走了三步才跌倒，媽媽手機拍了整整十分鐘。${addStats(s, { hp: 4, happy: 3 })}`),
  },
  {
    id: 'b_teeth', minAge: 0, maxAge: 2, weight: 3, title: '長牙',
    effect: (s) => `牙齒冒出來的那幾天你哭到整夜不睡，爸爸抱著你在客廳走了一百圈。${addStats(s, { hp: 2, happy: -3 })}`,
  },
  {
    id: 'b_vaccine', minAge: 0, maxAge: 3, weight: 3, title: '打預防針',
    effect: (s) => good(`護士阿姨一針下去，你愣了兩秒才放聲大哭，但身體有了抵抗力。${addStats(s, { hp: 5, happy: -2 })}`),
  },
  {
    id: 'b_nightcry', minAge: 0, maxAge: 1, weight: 3, title: '夜哭',
    effect: (s) => `你連續一個月半夜兩點準時哭醒，媽媽的黑眼圈重到同事都問她還好嗎。${addStats(s, { happy: -2, charm: 1 })}`,
  },
  {
    id: 'b_grandma', minAge: 0, maxAge: 5, weight: 3, title: '阿公阿嬤來照顧',
    effect: (s) => good(`阿公阿嬤搬來住了一陣子，把你養得白白胖胖。${addStats(s, { hp: 4, happy: 4 })}`),
  },
  {
    id: 'b_photo', minAge: 0, maxAge: 3, weight: 2, title: '週歲寫真',
    effect: (s) => { const c = P(s, 0.8 * WAN); return good(`爸媽花了 ${formatMoney(c)} 帶你去拍寫真，你在鏡頭前笑到流口水。（爸媽付的）${addStats(s, { charm: 5, happy: 3 })}`); },
  },
  {
    id: 'b_babysit', minAge: 0, maxAge: 3, weight: 2, title: '保母家的日子',
    effect: (s) => `爸媽上班，你每天在保母家跟另外三個小孩搶玩具。${addStats(s, { charm: 3, hp: -1 })}`,
  },
  {
    id: 'b_allergy', minAge: 0, maxAge: 4, weight: 2, title: '過敏',
    effect: (s) => bad(`換季的時候你整晚咳個不停，看了好幾次醫生才好。${addStats(s, { hp: -5 })}`),
  },
  {
    id: 'b_swallow', minAge: 1, maxAge: 3, weight: 1, title: '什麼都往嘴裡塞',
    effect: (s) => bad(`你把一枚銅板吞下去，全家衝去急診等了一整晚。${addStats(s, { hp: -4, happy: -2 })}`),
  },
  {
    id: 'b_word', minAge: 1, maxAge: 2, weight: 2, once: true, title: '第一個詞',
    effect: (s, rng) => (chance(rng, 0.5)
      ? good(`你的第一個詞是「媽媽」，媽媽當場哭了。${addStats(s, { charm: 4, happy: 3 })}`)
      : good(`你的第一個詞是「錢錢」，全家笑翻，阿公說這孩子有前途。${addStats(s, { int: 3, charm: 3 })}`)),
  },

  // ───────── 3～4 歲 ─────────
  {
    id: 'b_kinder_first', minAge: 3, maxAge: 4, weight: 3, once: true, title: '第一天上幼兒園',
    text: '第一天上幼兒園，你抓著媽媽的衣角不肯放。',
    choices: [
      { label: '哭著不放手', sub: '快樂↓但媽媽陪你久一點', effect: (s) => `你哭了半小時，老師抱著你進教室，媽媽在門口也偷偷哭。${addStats(s, { happy: -3, charm: 2 })}` },
      { label: '自己走進去', sub: '獨立、人緣↑', effect: (s) => good(`你揮揮手就自己走進教室，老師說你好勇敢。${addStats(s, { charm: 4, happy: 2, hp: 1 })}`) },
    ],
  },
  {
    id: 'b_why', minAge: 3, maxAge: 5, weight: 3, title: '為什麼時期',
    effect: (s) => good(`你一天問了兩百次「為什麼」，爸爸從天上的雲解釋到銀行的利息。${addStats(s, { int: 5, happy: 1 })}`),
  },
  {
    id: 'b_draw_wall', minAge: 2, maxAge: 5, weight: 2, title: '在牆上作畫',
    effect: (s) => { const c = P(s, 0.5 * WAN); return `你用蠟筆把客廳的牆畫成一片彩色，爸媽花了 ${formatMoney(c)} 重新油漆。${addStats(s, { charm: 3, happy: 3 })}`; },
  },
  {
    id: 'b_park', minAge: 2, maxAge: 6, weight: 3, title: '公園的溜滑梯',
    effect: (s) => good(`每天傍晚都要去公園報到，溜滑梯溜到天黑才肯回家。${addStats(s, { hp: 4, happy: 4, charm: 1 })}`),
  },
  {
    id: 'b_sandbox', minAge: 3, maxAge: 6, weight: 2, title: '沙坑的爭執',
    text: '你在沙坑玩得好好的，隔壁小孩把你堆了半小時的城堡踩掉了。',
    choices: [
      { label: '推回去', sub: '出一口氣', effect: (s) => `你推了他一把，兩個人都哭了，兩邊媽媽尷尬地道歉。${addStats(s, { charm: -3, hp: 2, happy: 1 })}` },
      { label: '重新蓋一個', sub: '耐心、智力↑', effect: (s) => good(`你默默重蓋了一座更大的城堡，連對方都跑來幫忙。${addStats(s, { int: 3, charm: 3 })}`) },
      { label: '去找老師', sub: '人緣↑', effect: (s) => `你跑去告狀，老師把兩個人叫來講道理。${addStats(s, { charm: 2, happy: -1 })}` },
    ],
  },
  {
    id: 'b_sick_hand', minAge: 2, maxAge: 6, weight: 2, title: '腸病毒',
    effect: (s) => bad(`幼兒園爆發腸病毒，你在家隔離了一個星期，嘴巴破到吃不下飯。${addStats(s, { hp: -6, happy: -2 })}`),
  },
  {
    id: 'b_lost', minAge: 3, maxAge: 6, weight: 1, title: '在賣場走丟',
    effect: (s) => bad(`你在賣場追一顆氣球，回頭就找不到爸媽了，廣播響起你的名字。${addStats(s, { happy: -4, hp: -1, charm: 2 })}`),
  },
  {
    id: 'b_newyear', minAge: 2, maxAge: 6, weight: 3, title: '過年拿紅包',
    effect: (s) => {
      const base = { poor: 0.3, normal: 0.8, rich: 3, tycoon: 12 }[s.family] || 0.8;
      const amt = P(s, base * WAN);
      s.money += amt;
      return good(`你穿著新衣服到處拜年，紅包收到手軟。（+${formatMoney(amt)}）${addStats(s, { happy: 4, charm: 2 })}`);
    },
  },
  {
    id: 'b_piggy', minAge: 4, maxAge: 6, weight: 2, once: true, title: '第一個存錢筒',
    text: '爸爸給你一個小豬存錢筒，說每次拿到的零錢可以自己決定要怎麼用。',
    choices: [
      { label: '全部存進去', sub: '投資眼光↑', effect: (s) => { addSkill(s, 1); return good(`你每天把銅板一個一個投進去，聽聲音判斷存了多少。理財觀念萌芽了！${addStats(s, { int: 2, happy: -1 })}`); } },
      { label: '拿去買糖果', sub: '快樂↑', effect: (s) => good(`你把錢全換成軟糖，快樂了整整一個下午。${addStats(s, { happy: 5, hp: -2 })}`) },
      { label: '分一半給弟弟妹妹', sub: '人緣↑↑', effect: (s) => good(`你把銅板分了一半給表弟，阿嬤說你以後一定人緣很好。${addStats(s, { charm: 6, happy: 2 })}`) },
    ],
  },
  {
    id: 'b_tv', minAge: 3, maxAge: 6, weight: 2, title: '卡通看到停不下來',
    text: '你發現遙控器的祕密，卡通一集接一集。',
    choices: [
      { label: '繼續看', sub: '快樂↑健康↓', effect: (s) => `你看到眼睛痠，媽媽說再看下去要戴眼鏡了。${addStats(s, { happy: 5, hp: -4, int: -1 })}` },
      { label: '關掉去玩積木', sub: '智力↑', effect: (s) => good(`你把電視關掉，蓋了一座比自己還高的積木塔。${addStats(s, { int: 4, happy: 1 })}`) },
    ],
  },

  // ───────── 5～6 歲 ─────────
  {
    id: 'b_bike', minAge: 4, maxAge: 6, weight: 3, once: true, title: '學騎腳踏車',
    text: '爸爸把輔助輪拆掉，在後面扶著你。',
    clip: 'bike_cover',
    choices: [
      { label: '摔了也要學會', sub: '健康↑↑', clip: 'bike_ride', effect: (s) => good(`你摔了七次，膝蓋破皮，但第八次你自己騎了整條巷子。${addStats(s, { hp: 7, happy: 4 })}`) },
      { label: '裝回輔助輪', sub: '安全就好', clip: 'bike_wheels', effect: (s) => `你決定慢慢來，輔助輪又多用了一年。爸爸蹲在地上把兩顆小輪子鎖回去，你坐在旁邊看。${addStats(s, { hp: 1, happy: 1 })}` },
    ],
  },
  {
    id: 'b_perform', minAge: 4, maxAge: 6, weight: 2, title: '幼兒園表演',
    text: '畢業成果發表會，老師問你想演什麼角色。',
    choices: [
      { odds: (s) => Math.min(1, 0.6 + s.stats.charm / 300), label: '主角', sub: '人緣↑↑', effect: (s, rng) => (chance(rng, 0.6 + s.stats.charm / 300)
        ? good(`你在台上把台詞全部講完，全場家長拍手。${addStats(s, { charm: 7, happy: 5 })}`)
        : `你上台後忘詞愣在原地，老師在旁邊小聲提醒。${addStats(s, { charm: 1, happy: -3 })}`) },
      { label: '躲在後面當大樹', sub: '安心就好', effect: (s) => `你當了一棵很稱職的大樹，全程一動也不動。${addStats(s, { happy: 2 })}` },
      { label: '幫忙做道具', sub: '智力↑', effect: (s) => good(`你和老師一起做紙箱城堡，做得比誰都認真。${addStats(s, { int: 4, charm: 2 })}`) },
    ],
  },
  {
    id: 'b_readbook', minAge: 3, maxAge: 6, weight: 3, title: '睡前故事',
    effect: (s) => good(`每天睡前媽媽念一本繪本，同一本你要她念三十遍。${addStats(s, { int: 4, happy: 3 })}`),
  },
  {
    id: 'b_petbeg', minAge: 4, maxAge: 6, weight: 2, once: true,
    cond: (s) => !(s.pets || []).some((p) => p.alive),
    title: '想養小動物',
    text: '鄰居家的狗生了小狗，你抱著媽媽的腿說想養一隻。（養寵物每年都要花飼料、疫苗、看醫生的錢，18 歲前爸媽幫你付）',
    choices: [
      {
        label: '拜託爸媽養一隻',
        sub: '快樂↑，之後每年有花費',
        effect: (s, rng) => {
          const pet = addPet(s, rng, chance(rng, 0.5) ? 'dog' : 'cat');
          const c = P(s, 1.2 * WAN);
          const by = petExpense(s, pet, '第一次帶回家（籠子、用品）', c);
          return good(`爸媽答應了！${pet.kind}「${pet.name}」成了家裡的新成員。${paidBy(by)}${addStats(s, { happy: 8, charm: 3 })}`);
        },
      },
      { label: '只去看看就好', sub: '不花錢', effect: (s) => `你每天放學都去鄰居家看小狗，也算是半個主人。${addStats(s, { happy: 3 })}` },
    ],
  },
  {
    id: 'b_pethelp', minAge: 4, maxAge: 6, weight: 2,
    cond: (s) => alivePets(s).length > 0,
    title: '幫忙照顧寵物',
    effect: (s) => { const p = alivePets(s)[0]; return good(`你每天搶著餵${p.kind}「${p.name}」，雖然常常灑得滿地都是。${addStats(s, { happy: 4, charm: 2, hp: 1 })}`); },
  },
  {
    id: 'b_math', minAge: 5, maxAge: 6, weight: 2, title: '會算數了',
    effect: (s) => good(`你在早餐店幫媽媽算找零，老闆娘說這孩子頭腦好。${addStats(s, { int: 5 })}`),
  },
  {
    id: 'b_shy', minAge: 4, maxAge: 6, weight: 2, title: '怕生',
    effect: (s) => `親戚來家裡，你整晚躲在房間不肯出來打招呼。${addStats(s, { charm: -3, happy: -1 })}`,
  },
  {
    id: 'b_typhoon', minAge: 3, maxAge: 6, weight: 2, title: '颱風天停電',
    effect: (s) => good(`颱風夜全家停電，點著蠟燭講鬼故事，你覺得比過年還好玩。${addStats(s, { happy: 5, charm: 2 })}`),
  },
  {
    id: 'b_swim', minAge: 4, maxAge: 6, weight: 2, title: '第一次下水',
    effect: (s, rng) => (chance(rng, 0.6)
      ? good(`你在游泳池玩到嘴唇發紫也不肯上岸。${addStats(s, { hp: 5, happy: 3 })}`)
      : bad(`你在泳池嗆了一大口水，從此看到深水就怕。${addStats(s, { hp: -2, happy: -3 })}`)),
  },
  {
    id: 'b_market', minAge: 5, maxAge: 6, weight: 2, title: '跟媽媽去市場',
    text: '媽媽給你 100 元，說攤子上的東西你可以自己挑。',
    choices: [
      { label: '買想吃的零食', sub: '快樂↑', effect: (s) => good(`你買了一整袋零食，回家路上就吃掉一半。${addStats(s, { happy: 5, hp: -1 })}`) },
      { label: '跟老闆殺價', sub: '經商頭腦', effect: (s) => { s.flags.bizSense = true; return good(`你學媽媽的口氣跟老闆殺價，老闆笑著多送你一把蔥。經商頭腦開竅了！${addStats(s, { int: 2, charm: 4 })}`); } },
      { label: '把錢留著', sub: '存起來', effect: (s) => { const amt = P(s, 0.1 * WAN); s.money += amt; addSkill(s, 1); return good(`你把錢原封不動放進存錢筒。（+${formatMoney(amt)}）投資眼光提升！`); } },
    ],
  },
  {
    id: 'b_talentspot', minAge: 5, maxAge: 6, weight: 2, once: true, title: '被看見的天份',
    effect: (s, rng) => {
      const r = rint(rng, 1, 3);
      if (r === 1) return good(`幼兒園老師說你的畫很有想像力，把它貼在教室最中間。${addStats(s, { charm: 5, happy: 3 })}`);
      if (r === 2) return good(`你記住了整本繪本的字，老師說你認字的速度嚇人。${addStats(s, { int: 6 })}`);
      return good(`運動會你跑第一名，體育老師說這孩子腳程很快。${addStats(s, { hp: 6, happy: 2 })}`);
    },
  },
  {
    id: 'b_sibling', minAge: 2, maxAge: 6, weight: 2, once: true, title: '家裡多了一個人',
    text: '媽媽的肚子越來越大，她問你想不想要弟弟或妹妹。',
    choices: [
      { label: '好啊！我來當哥哥／姊姊', sub: '人緣↑', effect: (s) => good(`弟弟出生後，你每天搶著幫忙拿尿布，覺得自己長大了。${addStats(s, { charm: 5, happy: 3 })}`) },
      { label: '不要，我要自己一個', sub: '快樂↓但零用錢不用分', effect: (s) => `你吃了好一陣子的醋，直到弟弟第一次對你笑。${addStats(s, { happy: -2, charm: 1 })}` },
    ],
  },
];
