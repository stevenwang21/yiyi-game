// 隨機事件
// 每個事件：
//   id, minAge, maxAge, weight, cond(s)（選填）
//   title, text（字串或 (s) => 字串）
//   effect(s, rng)：沒有選項時直接套用，回傳文字或 { text, tone }
//   choices：[{ label, cond(s)（選填）, effect(s, rng) }]
//   once：true 表示一生只會發生一次
import { PERFORM, performTalent } from './talents.js';
import { addMoney, addStats, chance, formatMoney, rint, WAN } from './utils.js';
import { familyById } from './data.js';
import { addKid, addPet, addSkill, mainBiz, marry, petExpense, removeBiz, sellRisky, startDating, diffOf, scaleBiz, motherAge, conceiveChance, downsChance } from './actions.js';
import { MAX_KIDS, TREAT_COST } from './data.js';
import { EXTRA_EVENTS } from './events2.js';
import { SCHOOL_EVENTS, BAND_EVENTS, IDOL_EVENTS } from './events_school.js';
import { SELF_EVENTS } from './events_self.js';
import { CLUB_EVENTS } from './events_club.js';
import { TOP_EVENTS } from './events_top.js';
import { EVENTS3 } from './events3.js';
import { BABY_EVENTS } from './events_baby.js';
import { TALENT_EVENT } from './talents.js';
import { MEET_EVENT, DATE_EVENT, LOVE_EVENTS } from './events_love.js';
import { REUNION_EVENT, MNA_EVENTS } from './events_rival.js';

const good = (text) => ({ text, tone: 'good' });
const pctText = (r) => `${r >= 0 ? '+' : ''}${Math.round(r * 100)}%`;
const bad = (text) => ({ text, tone: 'bad' });

export const EVENTS = [
  // ───────── 嬰幼兒 0–5 ─────────
  {
    id: 'baby_fever', minAge: 0, maxAge: 5, weight: 3,
    title: '半夜發高燒',
    effect: (s) => bad(`半夜發燒到 39 度，爸媽抱著你衝急診。${addStats(s, { hp: -6 })}`),
  },
  {
    id: 'baby_talk', minAge: 1, maxAge: 3, weight: 2, once: true,
    title: '很早就會說話',
    effect: (s) => good(`一歲多就會說完整的句子，親戚都說你是天才。${addStats(s, { int: 5 })}`),
  },
  {
    id: 'baby_cute', minAge: 0, maxAge: 5, weight: 2,
    title: '人見人愛',
    effect: (s) => good(`你笑起來超可愛，整條街的阿姨都認識你。${addStats(s, { charm: 4 })}`),
  },
  {
    id: 'baby_fall', minAge: 1, maxAge: 4, weight: 2,
    title: '學走路',
    effect: (s) => `學走路跌倒好多次，但每次都自己爬起來。${addStats(s, { hp: 3, happy: 2 })}`,
  },
  {
    id: 'kinder_friend', minAge: 3, maxAge: 5, weight: 2, once: true,
    title: '第一個好朋友',
    effect: (s) => good(`在幼兒園交到第一個好朋友，每天一起玩溜滑梯。${addStats(s, { charm: 3, happy: 4 })}`),
  },
  {
    id: 'kinder_picky', minAge: 2, maxAge: 5, weight: 0.8, once: true,
    title: '挑食',
    text: '晚餐有青椒和紅蘿蔔，你一口都不想吃。',
    choices: [
      { label: '乖乖吃完', effect: (s) => good(`雖然很難吃，但身體變壯了。${addStats(s, { hp: 4, happy: -2 })}`) },
      { label: '哭鬧不吃', effect: (s) => `你贏了這一回合。${addStats(s, { hp: -2, happy: 2 })}` },
    ],
  },

  // ───────── 兒童 6–11 ─────────
  {
    id: 'talent_show', minAge: 7, maxAge: 11, weight: 2,
    title: '才藝表演',
    text: (s) => { const p = performTalent(s); return `學校舉辦才藝表演，老師問你要不要上台${p ? PERFORM[p] : ''}。`; },
    choices: [
      {
        odds: (s) => Math.min(1, 0.4 + s.stats.charm / 200), label: '上台表演',
        effect: (s, rng) => (chance(rng, 0.4 + s.stats.charm / 200)
          ? good(`表演大成功，全場掌聲！${addStats(s, { charm: 6, happy: 5 })}`)
          : bad(`太緊張忘詞了，有點丟臉。${addStats(s, { happy: -4, charm: 1 })}`)),
      },
      { label: '在台下看就好', effect: (s) => `你在台下幫同學加油。${addStats(s, { happy: 1 })}` },
    ],
  },
  {
    id: 'found_money', minAge: 6, maxAge: 15, weight: 2, once: true,
    title: '撿到錢包',
    text: '放學路上撿到一個錢包，裡面有 2,000 元。',
    choices: [
      { label: '交給警察', effect: (s) => good(`失主來道謝，還上了地方新聞。${addStats(s, { charm: 5, happy: 3 })}`) },
      {
        label: '偷偷留下來',
        effect: (s) => { s.flags.greedy = true; return `你買了一堆零食，但心裡有點不安。${addMoney(s, 2000)}${addStats(s, { happy: 1 })}`; },
      },
    ],
  },
  {
    id: 'bully', minAge: 7, maxAge: 14, weight: 2,
    title: '被欺負',
    text: '班上有同學一直找你麻煩。',
    choices: [
      { label: '告訴老師', effect: (s) => `老師處理了，但你被說是抓耙仔。${addStats(s, { happy: -2, charm: -1 })}` },
      {
        label: '勇敢反擊',
        effect: (s, rng) => (s.stats.hp >= 60 || chance(rng, 0.4)
          ? good(`對方被你嚇到，再也不敢了。${addStats(s, { charm: 4, happy: 3 })}`)
          : bad(`打輸了，還受了點傷。${addStats(s, { hp: -6, happy: -4 })}`)),
      },
      { label: '默默忍耐', effect: (s) => bad(`你把委屈都吞進肚子裡。${addStats(s, { happy: -7 })}`) },
    ],
  },
  {
    id: 'olympiad', minAge: 9, maxAge: 14, weight: 3, cond: (s) => s.stats.int >= 65, once: true,
    title: '數學競賽',
    effect: (s) => good(`代表學校參加數學競賽，拿到金牌！${addStats(s, { int: 5, charm: 3, happy: 4 })}`),
  },
  {
    id: 'games', minAge: 8, maxAge: 17, weight: 3,
    title: '迷上電玩',
    text: '最近出了一款超好玩的手遊，同學都在玩。',
    choices: [
      { label: '每天只玩一小時', effect: (s) => `你很有自制力。${addStats(s, { happy: 2 })}` },
      { label: '玩到半夜', effect: (s) => bad(`成績退步，黑眼圈也出來了。${addStats(s, { int: -5, hp: -2, happy: 6 })}`) },
      { label: '研究遊戲怎麼做', effect: (s) => good(`你開始自學寫程式。${addStats(s, { int: 5, happy: 2 })}`) },
    ],
  },
  {
    id: 'pet', minAge: 6, maxAge: 16, weight: 2, once: true,
    title: '想養狗',
    text: '路邊有一隻小狗一直跟著你回家。養狗每年要花飼料、疫苗，生病還要看醫生。',
    choices: [
      {
        label: '拜託爸媽收養',
        sub: '每年約 3 萬，小時候爸媽出',
        effect: (s, rng) => {
          s.flags.pet = true;
          const p = addPet(s, rng, 'dog');
          petExpense(s, p, '結紮、晶片、第一次疫苗', 0.8 * WAN * s.priceIndex);
          return good(`你幫小狗取名叫「${p.name}」，多了一個家人，每天帶牠散步。${addStats(s, { happy: 8, hp: 3 })}`);
        },
      },
      { label: '帶去收容所', effect: (s) => `你幫牠找到了好人家。${addStats(s, { charm: 1 })}` },
    ],
  },
  {
    id: 'red_envelope', minAge: 6, maxAge: 17, weight: 2,
    title: '過年紅包',
    text: '過年收了一大疊紅包，總共 1 萬元。',
    choices: [
      { label: '存起來', effect: (s) => { s.flags.saver = (s.flags.saver || 0) + 1; return good(`你從小就懂得存錢。${addMoney(s, 10000)}`); } },
      { label: '買喜歡的東西', effect: (s) => `買了新玩具，開心好幾天。${addStats(s, { happy: 5 })}` },
      { label: '交給媽媽保管', effect: (s) => `媽媽說會幫你存起來……之後就沒有然後了。${addStats(s, { happy: -1 })}` },
    ],
  },

  // ───────── 青少年 12–17 ─────────
  {
    id: 'crush', minAge: 13, maxAge: 22, weight: 3, cond: (s) => !s.partner && !s.married,
    title: '暗戀',
    text: '你喜歡上一位同學，每天都想多看對方一眼。',
    choices: [
      {
        odds: (s) => Math.min(1, 0.3 + s.stats.charm / 200), label: '鼓起勇氣告白',
        sub: '人緣越高越容易成功',
        effect: (s, rng) => {
          if (chance(rng, 0.3 + s.stats.charm / 200)) {
            const p = startDating(s, rng);
            return good(`「${p.name}」答應了！${p.title ? `對方是${p.title}。` : ''}你們開始交往，約會也要開始花錢了。${addStats(s, { happy: 12, charm: 3 })}`);
          }
          return bad(`被發好人卡了……${addStats(s, { happy: -8 })}`);
        },
      },
      { label: '默默放在心裡', effect: (s) => `這份心意變成了日記裡的秘密。${addStats(s, { happy: -2, int: 1 })}` },
    ],
  },
  {
    id: 'confessed', minAge: 14, maxAge: 30, weight: 2, cond: (s) => !s.partner && !s.married && s.stats.charm >= 45,
    title: '有人跟你告白',
    text: '有人寫了一封情書給你，約你週末去看電影。',
    choices: [
      {
        label: '答應交往',
        sub: '快樂↑ 但約會要花錢',
        effect: (s, rng) => { const p = startDating(s, rng); return good(`你和「${p.name}」${p.title ? `（${p.title}）` : ''}開始交往了！${addStats(s, { happy: 10 })}`); },
      },
      { label: '先專心在自己身上', effect: (s) => `你委婉地拒絕了。${addStats(s, { int: 1 })}` },
    ],
  },
  {
    id: 'valentine', minAge: 13, maxAge: 45, weight: 4, cond: (s) => !!s.partner && !s.married,
    title: '情人節',
    text: (s) => `情人節到了，「${s.partner.name}」好像很期待。`,
    choices: [
      {
        label: '送名牌禮物',
        sub: '花比較多錢，感情大增',
        effect: (s) => { const c = Math.round((s.studying ? 1 : 3) * 10000 * s.priceIndex); s.partner.love = Math.min(100, s.partner.love + 20); return good(`對方超感動！${addMoney(s, -c)}${addStats(s, { happy: 5 })}`); },
      },
      {
        label: '親手做卡片',
        effect: (s) => { s.partner.love = Math.min(100, s.partner.love + 8); return good(`心意最重要，對方很開心。${addStats(s, { happy: 3 })}`); },
      },
      {
        label: '忘記了……',
        effect: (s) => { s.partner.love = Math.max(0, s.partner.love - 25); return bad(`對方生氣了一整個禮拜。${addStats(s, { happy: -4 })}`); },
      },
    ],
  },
  {
    id: 'date_trip', minAge: 16, maxAge: 45, weight: 2, cond: (s) => !!s.partner && !s.married,
    title: '想一起去旅行',
    text: (s) => `「${s.partner.name}」想跟你一起出國玩。`,
    choices: [
      {
        label: '一起出國',
        effect: (s) => { const c = Math.round((s.studying ? 3 : 8) * 10000 * s.priceIndex); s.partner.love = Math.min(100, s.partner.love + 15); return good(`一起留下很多美好回憶。${addMoney(s, -c)}${addStats(s, { happy: 8 })}`); },
      },
      {
        label: '錢要存起來',
        effect: (s) => { s.partner.love = Math.max(0, s.partner.love - 8); return `對方有點失望。${addStats(s, { happy: -1 })}`; },
      },
    ],
  },
  {
    id: 'propose', minAge: 20, maxAge: 55, weight: 9,
    cond: (s) => !!s.partner && !s.married && !s.studying && s.partner.love >= 40 && s.age - s.partner.since >= 1,
    title: '要不要求婚？',
    text: (s) => `你和「${s.partner.name}」已經交往 ${s.age - s.partner.since} 年了，感情很穩定。`,
    choices: [
      {
        label: '求婚！辦婚禮',
        sub: '約 60 萬（隨物價上漲）',
        effect: (s, rng) => {
          const c = Math.round(60 * 10000 * s.priceIndex);
          const name = s.partner.name;
          const gift = marry(s, rng);
          return good(`「${name}」答應了！在親友祝福下完成婚禮。${addMoney(s, -c)}${gift ? `對方家裡包了 ${formatMoney(gift)} 的大紅包！` : ''}${addStats(s, { happy: 15, charm: 3 })}`);
        },
      },
      {
        label: '求婚，簡單登記就好',
        effect: (s, rng) => {
          const name = s.partner.name;
          const gift = marry(s, rng);
          return good(`你和「${name}」去戶政事務所登記結婚，省下一大筆錢。${gift ? `對方家裡還包了 ${formatMoney(gift)} 給你們。` : ''}${addStats(s, { happy: 10 })}`);
        },
      },
      { label: '再交往看看', effect: (s) => { s.partner.love = Math.max(0, s.partner.love - 5); return '你覺得還沒準備好。'; } },
    ],
  },
  {
    id: 'class_leader', minAge: 12, maxAge: 17, weight: 2,
    title: '被選為班長',
    text: '同學們投票選你當班長。',
    choices: [
      { label: '接下來', effect: (s) => good(`你學會了協調和帶領大家。${addStats(s, { charm: 5, int: 1, happy: -1 })}`) },
      { label: '推掉', effect: (s) => `你想專心在自己的事情上。${addStats(s, { charm: -1 })}` },
    ],
  },
  {
    id: 'invest_book', minAge: 13, maxAge: 30, weight: 2, once: true,
    title: '一本理財書',
    effect: (s) => { addSkill(s, 1); return good(`你讀了一本理財入門書，第一次知道什麼是複利。投資眼光提升！${addStats(s, { int: 2 })}`); },
  },
  {
    id: 'teen_sick', minAge: 12, maxAge: 22, weight: 1,
    title: '重感冒',
    effect: (s) => bad(`得了重感冒，躺了一個禮拜。${addStats(s, { hp: -5, int: -1 })}`),
  },

  // ───────── 成年 18–65 ─────────
  {
    id: 'lottery', minAge: 20, maxAge: 79, weight: 2,
    title: '買樂透',
    text: '這期頭獎累積到 5 億，大家都在排隊買。',
    choices: [
      {
        label: '買一張試試（100 元）',
        effect: (s, rng) => {
          s.money -= 100;
          const r = rng();
          if (r < 0.001) return good(`中頭獎了！！！人生翻轉！${addMoney(s, 20000 * WAN)}${addStats(s, { happy: 30 })}`);
          if (r < 0.03) return good(`中了小獎。${addMoney(s, 2000)}${addStats(s, { happy: 2 })}`);
          return '槓龜。100 元就當作買個希望。';
        },
      },
      {
        label: '豪賭 10 萬元',
        cond: (s) => s.money >= 10 * WAN,
        effect: (s, rng) => {
          s.money -= 10 * WAN;
          const r = rng();
          if (r < 0.003) return good(`中了頭獎！！！${addMoney(s, 20000 * WAN)}${addStats(s, { happy: 30 })}`);
          if (r < 0.2) return `中了一些小獎，拿回 3 萬。${addMoney(s, 3 * WAN)}`;
          return bad(`10 萬元全部槓龜。${addStats(s, { happy: -6 })}`);
        },
      },
      { label: '不買', effect: () => '你相信靠自己比較實在。' },
    ],
  },
  {
    id: 'love', minAge: 24, maxAge: 45, weight: 4, cond: (s) => !s.married && !s.partner,
    title: '遇到真愛',
    text: '你在朋友聚會上遇到一個很聊得來的人，對方好像也對你有好感。',
    choices: [
      {
        label: '開始交往',
        sub: '約會要花錢，感情穩定後可以求婚',
        effect: (s, rng) => { const p = startDating(s, rng); p.love = 60; return good(`你和「${p.name}」${p.title ? `（${p.title}）` : ''}開始交往了！${addStats(s, { happy: 10 })}`); },
      },
      { label: '還不想談戀愛', effect: (s) => `你想專心在工作上。${addStats(s, { happy: -2 })}` },
    ],
  },
  {
    id: 'baby', minAge: 26, maxAge: 46,
    // 媽媽 40 歲以後，「要不要生」這件事本身也比較少被提起
    weight: (s) => (motherAge(s) >= 43 ? 1 : motherAge(s) >= 40 ? 2 : 4),
    cond: (s) => s.married && s.kids.length < MAX_KIDS && !(s.flags.babyTry && s.age - s.flags.babyTry < 2),
    title: '要不要生小孩？',
    text: (s) => {
      const ma = motherAge(s);
      const hard = ma >= 35
        ? `（媽媽今年 ${ma} 歲，這個年紀受孕成功率大約 ${Math.round(conceiveChance(ma) * 100)}%）`
        : '';
      return `${s.kids.length ? `你們已經有 ${s.kids.length} 個孩子了，要再生一個嗎？` : '另一半問你：「我們要不要生個小孩？」'}（養一個孩子到 22 歲，大約要花 350 萬以上，還會隨物價上漲）${hard}`;
    },
    choices: [
      {
        label: '生！',
        sub: (s) => { const ma = motherAge(s); return ma >= 40 ? `媽媽 ${ma} 歲，很難了，還可能要花錢做療程` : ma >= 35 ? `媽媽 ${ma} 歲，沒那麼容易了` : ''; },
        odds: (s) => conceiveChance(motherAge(s)),
        effect: (s, rng) => {
          const ma = motherAge(s);
          // 年紀越大越不容易受孕
          if (!chance(rng, conceiveChance(ma))) {
            s.flags.babyTry = s.age; // 休息兩年再試
            // 35 歲以後多半會去做檢查、打排卵針甚至人工受孕
            const fee = ma >= 40 ? 20 : ma >= 38 ? 10 : ma >= 35 ? 5 : 0;
            const paid = fee ? Math.round(fee * WAN * s.priceIndex) : 0;
            if (paid) s.money -= paid;
            return `試了一整年，還是沒有消息。醫生說 ${ma} 歲以後本來就比較不容易，你們決定先緩一緩。`
              + `${paid ? `（檢查和療程花了 ${formatMoney(paid)}）` : ''}${addStats(s, { happy: -3 })}`;
          }
          s.flags.babyTry = 0;
          const k = addKid(s, rng);
          // 高齡懷孕，染色體異常的機率會上升
          if (chance(rng, downsChance(ma))) {
            k.downs = true;
            return `「${k.name}」出生了。醫生說寶寶有唐氏症（21 三體）。你們抱著他看了很久，決定好好把他養大——早療和療育要花一些錢，但他就是你們的孩子。${addStats(s, { happy: 8, hp: -3 })}`;
          }
          if (s.kids.length < MAX_KIDS && chance(rng, 0.06)) {
            const k2 = addKid(s, rng);
            return good(`是雙胞胎！「${k.name}」和「${k2.name}」一起來報到！${addStats(s, { happy: 18, hp: -4 })}`);
          }
          return good(`「${k.name}」出生了，家裡多了一個小寶貝！${addStats(s, { happy: 12, hp: -2 })}`);
        },
      },
      { label: '再等等', effect: (s) => `你們決定再過幾年再說。${addStats(s, { happy: -1 })}` },
    ],
  },
  {
    id: 'promotion', minAge: 25, maxAge: 60, weight: 3, cond: (s) => s.job && !['influencer', 'idol', 'trainee'].includes(s.job.id),
    title: '升職機會',
    text: '主管問你要不要接下一個新部門的主管職，薪水多 25%，但會很累。',
    choices: [
      {
        label: '接下挑戰',
        effect: (s, rng) => {
          if (chance(rng, 0.35 + (s.stats.int + s.stats.charm) / 400)) {
            s.job.salary = Math.round(s.job.salary * 1.25);
            return good(`你成功升職！年薪變成 ${formatMoney(s.job.salary)}。${addStats(s, { hp: -4, happy: 3, charm: 2 })}`);
          }
          return bad(`高層最後找了別人……白忙一場。${addStats(s, { happy: -5, hp: -2 })}`);
        },
      },
      { label: '維持現狀', effect: (s) => `你選擇工作與生活的平衡。${addStats(s, { happy: 2 })}` },
    ],
  },
  {
    id: 'layoff', minAge: 28, maxAge: 79, weight: 2,
    cond: (s) => s.job && (s.job.risk ?? 1) > 0,
    title: '公司裁員',
    effect: (s, rng) => {
      if (chance(rng, 0.25 + s.stats.charm / 300 + s.stats.int / 400)) {
        return `公司大裁員，還好你表現好被留下來了。${addStats(s, { happy: -2 })}`;
      }
      const severance = Math.round(s.job.salary * 0.5);
      const jobName = s.job.name;
      s.job = null;
      return bad(`公司大裁員，你失去了「${jobName}」的工作，拿到半年資遣費。${addMoney(s, severance)}${addStats(s, { happy: -10 })}`);
    },
  },
  {
    // 由引擎依「市場狀態」觸發，不會出現在一般隨機事件裡
    id: 'crash', minAge: 0, maxAge: 99, weight: 0,
    title: '股市崩盤！',
    text: (s) => `${s.world.title}！股市大跌：ETF ${pctText(s.world.returns.etf)}、個股 ${pctText(s.world.returns.stock)}、加密貨幣 ${pctText(s.world.returns.crypto)}、黃金 ${pctText(s.world.returns.gold)}。你要怎麼做？`,
    choices: [
      {
        label: '恐慌，全部賣出',
        sub: '換回現金，不再擔心',
        effect: (s) => { const v = sellRisky(s); return bad(`你認賠殺出，拿回 ${formatMoney(v)} 現金。${addStats(s, { happy: -6 })}`); },
      },
      {
        label: '抱緊不動',
        sub: '相信市場會回來',
        effect: (s) => { s.flags.rebound = true; return `你咬牙抱緊。${addStats(s, { happy: -3 })}`; },
      },
      {
        label: '拿一半現金逢低加碼 ETF',
        sub: '別人恐懼時我貪婪',
        cond: (s) => s.money > 0,
        effect: (s) => {
          const add = Math.round(s.money / 2);
          s.money -= add; s.etf += add; s.flags.rebound = true;
          return `你逢低加碼了 ${formatMoney(add)}。${addStats(s, { happy: -2 })}`;
        },
      },
    ],
  },
  {
    id: 'friend_startup', minAge: 25, maxAge: 55, weight: 2, cond: (s) => s.money >= 100 * WAN,
    title: '朋友找你投資',
    text: '大學同學在做 AI 新創，希望你投資 100 萬當天使投資人。',
    choices: [
      {
        label: '投 100 萬',
        effect: (s, rng) => {
          s.money -= 100 * WAN;
          const r = rng();
          if (r < 0.12) return good(`公司被大廠收購，你的 100 萬變成 3,000 萬！${addMoney(s, 3000 * WAN)}${addStats(s, { happy: 15 })}`);
          if (r < 0.3) return good(`公司小有成績，你拿回 250 萬。${addMoney(s, 250 * WAN)}${addStats(s, { happy: 4 })}`);
          return bad(`公司兩年後就倒了，100 萬打水漂。${addStats(s, { happy: -6 })}`);
        },
      },
      { label: '婉拒', effect: () => '你祝他成功，但錢還是放自己口袋比較安心。' },
    ],
  },
  {
    id: 'scam', minAge: 30, maxAge: 79, weight: 2, cond: (s) => s.money >= 20 * WAN,
    title: '可疑的電話',
    text: '「您好，這裡是地檢署，您的帳戶涉及洗錢，請配合把存款轉到安全帳戶……」',
    choices: [
      {
        label: '照對方說的做',
        effect: (s) => { const loss = Math.min(Math.round(s.money * 0.5), 500 * WAN); return bad(`你被詐騙集團騙走了 ${formatMoney(loss)}……${addMoney(s, -loss)}${addStats(s, { happy: -12 })}`); },
      },
      { label: '直接掛掉，打 165 查證', effect: (s) => good(`果然是詐騙！你沒有上當。${addStats(s, { int: 1 })}`) },
    ],
  },
  {
    // 由引擎依「健康風險」觸發
    id: 'big_sick', minAge: 0, maxAge: 99, weight: 0,
    title: '身體亮紅燈',
    text: (s) => (s.flags.earlyFound
      ? '還好之前做了健康檢查，問題在早期就發現了，治療起來比較輕鬆。'
      : '你突然在工作時昏倒，被送進醫院。醫生說你的身體長期超過負荷，需要好好治療。'),
    before: (s) => {
      addStats(s, { hp: s.flags.earlyFound ? -5 : -15 });
    },
    choices: [
      {
        label: '請假一年好好休養',
        sub: '今年沒有收入',
        effect: (s) => { s.flags.skipSalary = true; s.risk = Math.max(0, s.risk - 45); s.flags.earlyFound = false; return `你暫停工作專心養病。${addStats(s, { hp: 15, happy: 3 })}`; },
      },
      {
        label: '花錢接受最好的治療',
        sub: '約 50 萬',
        cond: (s) => s.money >= 50 * WAN,
        effect: (s) => { s.risk = Math.max(0, s.risk - 40); s.flags.earlyFound = false; return good(`治療很成功。${addMoney(s, -50 * WAN)}${addStats(s, { hp: 12 })}`); },
      },
      {
        label: '硬撐，繼續拚',
        sub: '健康風險會更高',
        effect: (s) => { s.risk = Math.min(100, s.risk + 10); s.flags.earlyFound = false; return bad(`你咬牙撐過去了，但身體更差了。${addStats(s, { hp: -8, happy: -3 })}`); },
      },
    ],
  },
  {
    id: 'burnout', minAge: 25, maxAge: 55, weight: 2, cond: (s) => !!s.job && s.job.id !== 'trainee',
    title: '職業倦怠',
    effect: (s) => bad(`每天早上都不想去上班，覺得人生好像只剩下工作。${addStats(s, { happy: -8 })}`),
  },
  {
    id: 'inherit', minAge: 40, maxAge: 79, weight: 2, once: true,
    title: '長輩過世',
    effect: (s, rng) => {
      const fam = familyById(s.family);
      const amount = rint(rng, fam.inherit[0], fam.inherit[1]);
      return `家中長輩安詳離世，你很難過。${amount > 0 ? `長輩留給你一筆遺產。${addMoney(s, amount)}` : ''}${addStats(s, { happy: -8 })}`;
    },
  },
  {
    id: 'house_boom', minAge: 25, maxAge: 79, weight: 2, cond: (s) => s.houses.length > 0,
    title: '房價大漲',
    effect: (s) => { let g = 0; s.houses.forEach((h) => { const d = Math.round(h.value * 0.2); h.value += d; g += d; }); return good(`附近要蓋捷運站，你的房子增值了 ${formatMoney(g)}！${addStats(s, { happy: 5 })}`); },
  },
  {
    id: 'crypto', minAge: 20, maxAge: 50, weight: 2, cond: (s) => s.money >= 30 * WAN, once: true,
    title: '加密貨幣熱潮',
    text: '朋友說某個新幣一定會漲 100 倍，叫你趕快上車。',
    choices: [
      {
        label: '投 30 萬進去',
        effect: (s, rng) => {
          s.money -= 30 * WAN;
          const r = rng();
          if (r < 0.1) return good(`真的暴漲了！30 萬變成 1,500 萬！${addMoney(s, 1500 * WAN)}${addStats(s, { happy: 15 })}`);
          if (r < 0.35) return good(`漲了一倍，你見好就收。${addMoney(s, 60 * WAN)}${addStats(s, { happy: 3 })}`);
          return bad(`幣價歸零，交易所還跑路了。${addStats(s, { happy: -8 })}`);
        },
      },
      { label: '不碰看不懂的東西', effect: (s) => `你繼續做自己熟悉的投資。${addStats(s, { int: 1 })}` },
    ],
  },
  {
    id: 'youtube', minAge: 20, maxAge: 50, weight: 2, cond: (s) => !s.job || s.job.id !== 'influencer', once: true,
    title: '經營頻道',
    text: '你想下班後開一個 YouTube 頻道，分享自己的專業。',
    choices: [
      {
        odds: (s) => Math.min(1, 0.1 + s.stats.charm / 250), label: '試試看！',
        effect: (s, rng) => {
          if (chance(rng, 0.1 + s.stats.charm / 250)) {
            const amt = rint(rng, 50, 400) * WAN;
            return good(`有一支影片爆紅，頻道訂閱破十萬，業配收入不斷！${addMoney(s, amt)}${addStats(s, { charm: 8, happy: 8 })}`);
          }
          return `拍了一年，訂閱數只有 87 人……但你學會剪片了。${addStats(s, { hp: -3, int: 2 })}`;
        },
      },
      { label: '下班只想休息', effect: (s) => `你選擇好好休息。${addStats(s, { happy: 2, hp: 1 })}` },
    ],
  },
  {
    id: 'old_friends', minAge: 28, maxAge: 79, weight: 2,
    title: '老朋友聚餐',
    effect: (s) => `幾個老朋友約出來吃飯，聊起當年的糗事。${addStats(s, { happy: 4, charm: 3 })}`,
  },
  {
    id: 'marathon', minAge: 28, maxAge: 60, weight: 1,
    title: '馬拉松',
    text: '公司同事揪你一起去跑全程馬拉松。',
    choices: [
      {
        label: '報名！',
        effect: (s) => (s.stats.hp >= 50
          ? good(`你完賽了！身體和心情都變好了。${addStats(s, { hp: 6, happy: 6 })}`)
          : bad(`跑到一半膝蓋受傷，被救護車載走。${addStats(s, { hp: -8, happy: -3 })}`)),
      },
      { label: '幫大家加油就好', effect: (s) => `你在終點線幫同事拍照。${addStats(s, { charm: 1 })}` },
    ],
  },
  {
    id: 'car', minAge: 25, maxAge: 55, weight: 2, cond: (s) => s.money >= 150 * WAN && !s.flags.car,
    title: '想買車',
    text: '看到一台很喜歡的進口車，售價 150 萬。',
    choices: [
      { label: '買！', effect: (s) => { s.flags.car = true; return good(`開新車出門，心情超好。${addMoney(s, -150 * WAN)}${addStats(s, { happy: 8, charm: 2 })}`); } },
      { label: '捷運也很方便', effect: (s) => `你省下了這筆錢。${addStats(s, { happy: -1 })}` },
    ],
  },
  {
    id: 'kid_cram', minAge: 30, maxAge: 79, weight: 3,
    cond: (s) => s.kids.some((k) => s.age - k.born >= 8 && s.age - k.born <= 17 && !k.cram),
    title: '孩子要不要補習？',
    text: (s) => {
      const k = s.kids.find((x) => s.age - x.born >= 8 && s.age - x.born <= 17 && !x.cram);
      return `「${k.name}」（${s.age - k.born} 歲）的成績普普通通，老師建議可以去補習班加強。`;
    },
    choices: [
      {
        label: '送去補習',
        sub: '每年多 10 萬（隨物價上漲）',
        effect: (s) => { const k = s.kids.find((x) => s.age - x.born >= 8 && s.age - x.born <= 17 && !x.cram); k.cram = true; return `「${k.name}」開始上補習班。`; },
      },
      { label: '自己教', effect: (s) => `你每天晚上陪孩子寫作業。${addStats(s, { happy: 2, hp: -2, int: 1 })}` },
      { label: '順其自然', effect: () => '快樂學習最重要。' },
    ],
  },
  {
    id: 'kid_success', minAge: 40, maxAge: 79, weight: 3, once: true,
    cond: (s) => s.kids.some((k) => s.age - k.born >= 18),
    title: '孩子長大了',
    effect: (s, rng) => (chance(rng, s.kids.some((k) => k.cram) ? 0.7 : 0.4)
      ? good(`孩子考上理想的大學，你感到非常驕傲！${addStats(s, { happy: 12 })}`)
      : `孩子沒考上第一志願，但找到自己喜歡的方向。${addStats(s, { happy: 4 })}`),
  },
  {
    id: 'parents_care', minAge: 45, maxAge: 62, weight: 2, once: true,
    title: '父母需要照顧',
    text: '年邁的父母行動不便，需要有人照顧。',
    choices: [
      { label: '自己照顧（今年收入減半）', effect: (s) => { s.flags.halfSalary = true; return good(`你陪伴父母走過這段時光。${addStats(s, { happy: -3, hp: -3, charm: 5 })}`); } },
      { label: '請看護（每年 40 萬）', effect: (s) => `你請了專業看護。${addMoney(s, -40 * WAN)}${addStats(s, { happy: -2 })}` },
    ],
  },
  {
    id: 'midlife', minAge: 40, maxAge: 52, weight: 2, once: true,
    title: '中年危機',
    text: '你突然覺得人生好像少了什麼。',
    choices: [
      { label: '買跑車（500 萬）', cond: (s) => s.money >= 500 * WAN, effect: (s) => good(`開著跑車兜風，重回年輕！${addMoney(s, -500 * WAN)}${addStats(s, { happy: 12 })}`) },
      { label: '出國壯遊（30 萬）', effect: (s) => good(`你去了歐洲一個月，重新找到方向。${addMoney(s, -30 * WAN)}${addStats(s, { happy: 10, hp: 2 })}`) },
      { label: '開始學新東西', effect: (s) => `你報名了社區大學的課程。${addStats(s, { int: 4, happy: 3 })}` },
    ],
  },

  // ───────── 事業相關 ─────────
  {
    id: 'biz_acquire', minAge: 25, maxAge: 79, weight: 5, cond: (s) => s.bizs.some((b) => b.value >= 1500 * WAN),
    title: '收購提案',
    text: (s) => { const b = mainBiz(s); return `一家大企業想用 ${formatMoney(Math.round(b.value * (1 + 0.2 * diffOf(s).grow)))} 收購你的「${b.name}」。`; },
    choices: [
      {
        label: '賣掉，落袋為安',
        effect: (s) => {
          const b = mainBiz(s);
          const price = Math.round(b.value * (1 + 0.2 * diffOf(s).grow));
          removeBiz(s, b.uid);
          return good(`你賣掉了「${b.name}」，拿到 ${formatMoney(price)}！${addMoney(s, price)}${addStats(s, { happy: 12 })}`);
        },
      },
      { label: '不賣，我要做更大', effect: (s) => `你拒絕了收購，繼續打拚。${addStats(s, { happy: 2 })}` },
    ],
  },
  {
    id: 'biz_crisis', minAge: 20, maxAge: 79, weight: 2, cond: (s) => s.bizs.length > 0,
    title: '事業危機',
    effect: (s, rng) => { const b = s.bizs[Math.floor(rng() * s.bizs.length)]; b.value = Math.round(b.value * 0.6); return bad(`競爭對手削價搶市，「${b.name}」的價值縮水了 40%。${addStats(s, { happy: -6 })}`); },
  },
  {
    id: 'biz_hit', minAge: 20, maxAge: 79, weight: 2, cond: (s) => s.bizs.length > 0,
    title: '爆紅！',
    effect: (s, rng) => { const b = s.bizs[Math.floor(rng() * s.bizs.length)]; scaleBiz(s, b, 1.4); return good(`「${b.name}」的新產品在網路上爆紅，公司價值大漲 40%！${addStats(s, { happy: 8, charm: 3 })}`); },
  },
  {
    id: 'biz_loan', minAge: 25, maxAge: 60, weight: 2, cond: (s) => s.bizs.length > 0 && s.money >= 100 * WAN,
    title: '擴張的機會',
    text: (s) => `「${mainBiz(s).name}」有個展店／擴編的好機會，需要再投入 100 萬。`,
    choices: [
      {
        odds: (s) => Math.min(1, 0.45 + s.stats.int / 400), label: '投入 100 萬擴張',
        effect: (s, rng) => {
          const b = mainBiz(s);
          s.money -= 100 * WAN;
          b.capital += 100 * WAN;
          if (chance(rng, 0.45 + s.stats.int / 400)) { b.value += 250 * WAN; return good(`擴張很成功！「${b.name}」價值增加 250 萬。${addStats(s, { happy: 4 })}`); }
          b.value += 40 * WAN;
          return bad(`擴張不如預期，錢大多燒掉了。${addStats(s, { happy: -4 })}`);
        },
      },
      { label: '穩穩來就好', effect: () => '你決定保守經營。' },
    ],
  },
  {
    id: 'second_biz', minAge: 30, maxAge: 58, weight: 3, once: true,
    cond: (s) => s.bizs.length === 1 && s.money >= 150 * WAN,
    title: '第二家公司？',
    text: '朋友找你一起合開第二家公司：一間飲料店，需要你出 150 萬。兩家公司可以同時經營。',
    choices: [
      {
        label: '合開第二家',
        sub: '同時經營兩家公司',
        effect: (s) => {
          s.money -= 150 * WAN;
          s.bizs.push({ uid: `b${s.uid++}`, type: 'food', name: '合夥飲料店', value: 180 * WAN, capital: 180 * WAN, route: null, bonus: 0, years: 0, lastR: 0 });
          return good(`你成了兩家公司的老闆！${addStats(s, { happy: 5, hp: -2 })}`);
        },
      },
      { label: '一家就夠忙了', effect: () => '你決定專心經營現在的公司。' },
    ],
  },
  {
    // 由健康檢查觸發
    id: 'checkup_found', minAge: 0, maxAge: 99, weight: 0,
    title: '健康檢查發現問題',
    text: '報告顯示你有早期的健康問題，現在治療效果最好。',
    choices: [
      {
        label: '馬上治療',
        sub: '約 20 萬，大幅降低健康風險',
        effect: (s) => { const c = Math.round(TREAT_COST * s.priceIndex); s.risk = Math.max(0, s.risk - 45); return good(`及早治療，身體好多了。${addMoney(s, -c)}${addStats(s, { hp: 6 })}`); },
      },
      {
        label: '先觀察就好',
        sub: '如果發病，至少是早期發現',
        effect: (s) => { s.flags.earlyFound = true; return '你決定再觀察看看。'; },
      },
    ],
  },
];

EVENTS.push(...EXTRA_EVENTS, ...EVENTS3, ...BABY_EVENTS, TALENT_EVENT, MEET_EVENT, DATE_EVENT, ...LOVE_EVENTS, REUNION_EVENT, ...MNA_EVENTS, ...SCHOOL_EVENTS, ...SELF_EVENTS, ...CLUB_EVENTS, ...BAND_EVENTS, ...IDOL_EVENTS, ...TOP_EVENTS);

export const eventById = (id) => EVENTS.find((e) => e.id === id);
