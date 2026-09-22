// 第五批事件：6～12 歲的小學生活，以及國高中的社團、組團、當偶像
import { PERFORM, TALENTS, performTalent } from './talents.js';
import { addStats, chance, formatMoney, rint, WAN } from './utils.js';
import { addPoints, addSkill, underIdolContract } from './actions.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });
const P = (s, v) => Math.round(v * s.priceIndex);
const inSchool = (s) => s.studying;

// ───────────────────── 6～12 歲：小學 ─────────────────────
export const SCHOOL_EVENTS = [
  {
    id: 's_firstday', minAge: 6, maxAge: 7, weight: 4, once: true, title: '開學第一天',
    effect: (s) => good(`你緊張到在校門口不肯放開媽媽的手，第一節下課就交到了新朋友。${addStats(s, { charm: 4, happy: 3 })}`),
  },
  {
    id: 's_duty', minAge: 6, maxAge: 12, weight: 3, title: '當值日生',
    effect: (s) => `你負責擦黑板和倒垃圾，擦到袖子全是粉筆灰。${addStats(s, { charm: 2, hp: 1 })}`,
  },
  {
    id: 's_classleader', minAge: 7, maxAge: 12, weight: 3, title: '選班長',
    choices: [
      { odds: (s) => Math.min(1, 0.45 + s.stats.charm / 220), label: '舉手參選', sub: '人緣↑↑，但會變忙', effect: (s, rng) => (chance(rng, 0.45 + s.stats.charm / 220) ? good(`你上台講了三句話，居然真的選上班長了！${addStats(s, { charm: 7, int: 2, happy: 2 })}`) : `你落選了，票數是第三名。有點失落，但至少敢舉手。${addStats(s, { charm: 2, happy: -3 })}`) },
      { label: '躲在後面', sub: '安穩', effect: (s) => `你把頭低下去假裝在找東西，這一輪跟你沒關係。${addStats(s, { happy: 1 })}` },
    ],
  },
  {
    id: 's_sportsday', minAge: 6, maxAge: 12, weight: 3, title: '運動會',
    choices: [
      { odds: (s) => Math.min(1, 0.4 + s.stats.hp / 250), label: '報名大隊接力', sub: '健康↑、人緣↑', effect: (s, rng) => (chance(rng, 0.4 + s.stats.hp / 250) ? good(`你跑最後一棒，硬是超車了兩個人，全班衝上來抱你。${addStats(s, { hp: 5, charm: 6, happy: 5 })}`) : `你在彎道跌倒了，膝蓋磨破一大片，但你爬起來跑完。${addStats(s, { hp: 2, charm: 3, happy: -2 })}`) },
      { label: '當啦啦隊就好', sub: '快樂↑', effect: (s) => `你在旁邊喊到破音，比跑的人還累。${addStats(s, { happy: 4, charm: 2 })}` },
    ],
  },
  {
    id: 's_sciencefair', minAge: 8, maxAge: 12, weight: 3, title: '科展',
    choices: [
      { odds: (s) => Math.min(1, 0.35 + s.stats.int / 220), label: '做一個很屌的題目', sub: '智力↑↑', effect: (s, rng) => (chance(rng, 0.35 + s.stats.int / 220) ? good(`你的「陽台植物澆水機」拿了全縣第二名，獎狀掛在教室後面一整年。${addStats(s, { int: 8, charm: 3, happy: 4 })}${addPoints(s, 1, '科展得獎') || ''}`) : `你做到一半才發現實驗設計有問題，勉強交出去了。過程還是學到不少。${addStats(s, { int: 4, happy: -2 })}`) },
      { label: '交個安全的題目', sub: '智力↑', effect: (s) => `你做了「哪一種衛生紙最吸水」，穩穩完成。${addStats(s, { int: 3 })}` },
    ],
  },
  {
    id: 's_bike', minAge: 6, maxAge: 10, weight: 3, once: true, title: '學會騎腳踏車',
    effect: (s) => good(`爸爸鬆手的那一刻你其實已經騎了二十公尺，回頭才發現沒人扶。${addStats(s, { hp: 5, happy: 6 })}`),
  },
  {
    id: 's_lostmoney', minAge: 7, maxAge: 12, weight: 2, title: '撿到錢包',
    choices: [
      { label: '交給老師', sub: '人緣↑', effect: (s) => good(`失主是隔壁班的家長，特地來學校道謝，你上了朝會的表揚名單。${addStats(s, { charm: 6, happy: 3 })}`) },
      { label: '偷偷收起來', sub: '拿到錢，但心裡不安', effect: (s) => { const amt = P(s, 0.3 * WAN); s.money += amt; return `你把錢包裡的錢拿走了（+${formatMoney(amt)}），但那一整個星期你都睡不太好。${addStats(s, { happy: -6, charm: -2 })}`; } },
    ],
  },
  {
    id: 's_bully', minAge: 8, maxAge: 13, weight: 3, title: '班上有人被欺負',
    choices: [
      { odds: (s) => Math.min(1, 0.55 + s.stats.charm / 300), label: '站出來講話', sub: '人緣↑↑，有風險', effect: (s, rng) => (chance(rng, 0.55 + s.stats.charm / 300) ? good(`你站到他前面說「夠了喔」，對方愣住走掉了。那個同學後來成了你最好的朋友。${addStats(s, { charm: 8, happy: 3 })}`) : `你被一起針對了一陣子，還好老師介入處理。${addStats(s, { charm: 3, happy: -6, hp: -2 })}`) },
      { label: '跟老師說', sub: '安全的做法', effect: (s) => good(`老師處理了這件事，沒有人知道是你說的。${addStats(s, { charm: 3, int: 1 })}`) },
      { label: '裝作沒看到', sub: '什麼都不會發生', effect: (s) => `你低頭繼續寫作業，但那個畫面你記了很久。${addStats(s, { happy: -3 })}` },
    ],
  },
  {
    id: 's_piano_quit', minAge: 8, maxAge: 12, weight: 2, cond: (s) => (s.flags.talents || []).length > 0, title: '不想學了',
    choices: [
      { label: '硬著頭皮繼續', sub: '智力↑，快樂↓', effect: (s) => `你哭著練完那首曲子，隔年比賽拿了佳作。${addStats(s, { int: 4, charm: 3, happy: -4 })}` },
      { label: '跟爸媽說不想學', sub: '快樂↑↑', effect: (s) => good(`你鼓起勇氣說了，爸媽想了一晚上，說好。你週末終於有時間了。${addStats(s, { happy: 8, charm: 1 })}`) },
    ],
  },
  {
    id: 's_newyear', minAge: 6, maxAge: 12, weight: 3, title: '過年紅包',
    choices: [
      { label: '交給媽媽保管', sub: '存起來（真的會還你）', effect: (s, rng) => { const amt = P(s, rint(rng, 1, 2) * 1.2 * WAN); s.money += amt; return good(`媽媽說「我先幫你存著」，這次她真的存進了你的戶頭。（+${formatMoney(amt)}）${addStats(s, { happy: 2 })}`); } },
      { label: '自己留著花', sub: '快樂↑，錢少一點', effect: (s) => { const amt = P(s, 0.6 * WAN); s.money += amt; return good(`你留了一部分（+${formatMoney(amt)}），剩下的拿去買扭蛋和抽卡，爽了兩個禮拜。${addStats(s, { happy: 6 })}`); } },
    ],
  },
  {
    id: 's_glasses', minAge: 8, maxAge: 13, weight: 2, title: '視力檢查單',
    effect: (s) => { const c = P(s, 0.5 * WAN); return `檢查單上寫著要複檢，你配了第一副眼鏡（爸媽付 ${formatMoney(c)}）。看得清楚了，但體育課常常滑下來。${addStats(s, { int: 2, charm: -2 })}`; },
  },
  {
    id: 's_camp', minAge: 9, maxAge: 12, weight: 2, title: '隔宿露營',
    effect: (s) => good(`你第一次離家過夜，晚上營火大會唱到喉嚨啞掉，回家倒頭就睡。${addStats(s, { charm: 5, hp: 3, happy: 5 })}`),
  },
  {
    id: 's_grades', minAge: 8, maxAge: 12, weight: 3, title: '成績單發下來了',
    effect: (s) => (s.stats.int >= 60
      ? good(`成績單上一排都是「優」，爸媽貼在冰箱上。${addStats(s, { happy: 5, int: 1 })}`)
      : `成績不太好看，爸媽簽名的時候嘆了一口氣。${addStats(s, { happy: -4, int: 1 })}`),
  },
  {
    id: 's_pocketmoney', minAge: 7, maxAge: 12, weight: 2, title: '想要新的東西',
    choices: [
      { label: '拜託爸媽買', sub: '快樂↑', effect: (s) => good(`吵了三天，爸媽終於投降。你抱著它睡了一個禮拜。${addStats(s, { happy: 7, charm: -1 })}`) },
      { label: '自己存錢買', sub: '快樂↑、學會等待', effect: (s) => { const c = P(s, 0.4 * WAN); s.money = Math.max(0, s.money - c); s.flags.patient = true; addSkill(s, 1); return good(`你存了半年才買到，拆開的時候手在抖。（-${formatMoney(c)}）（投資比較有耐心、眼光提升）${addStats(s, { happy: 6, int: 2 })}`); } },
      { label: '算了不要了', sub: '省錢', effect: (s) => `你看了很久，最後還是走開了。${addStats(s, { happy: -2, int: 1 })}` },
    ],
  },
  {
    id: 's_crush', minAge: 10, maxAge: 13, weight: 2, title: '偷偷喜歡一個人',
    effect: (s) => `你每天都繞路經過她的教室，卻連一句話都沒講過。${addStats(s, { happy: 3, charm: 2, int: -1 })}`,
  },
  {
    id: 's_typhoon', minAge: 6, maxAge: 12, weight: 3, title: '颱風假',
    effect: (s) => good(`晚上十點電視跑馬燈出現你的縣市，全家一起歡呼。${addStats(s, { happy: 7, int: -1 })}`),
  },
  {
    id: 's_fight', minAge: 8, maxAge: 13, weight: 2, title: '跟同學吵架',
    choices: [
      { label: '先去道歉', sub: '人緣↑', effect: (s) => good(`你走過去說對不起，他愣了一下也說對不起。隔天又一起打球了。${addStats(s, { charm: 5, happy: 3 })}`) },
      { label: '不理他', sub: '快樂↓', effect: (s) => `你們冷戰了兩個月，後來誰也不記得當初在吵什麼。${addStats(s, { charm: -3, happy: -3 })}` },
    ],
  },
  {
    id: 's_library', minAge: 7, maxAge: 12, weight: 2, title: '迷上一套小說',
    effect: (s) => good(`你在圖書館一排一排找過去，一個暑假讀完十二本。${addStats(s, { int: 6, happy: 4 })}`),
  },
  {
    id: 's_stray', minAge: 6, maxAge: 12, weight: 2, cond: (s) => !(s.pets || []).some((p) => p.alive), title: '校門口的流浪狗',
    effect: (s) => `你每天放學都偷偷留半個麵包給牠，牠後來看到你就搖尾巴。${addStats(s, { happy: 4, charm: 2 })}`,
  },
  {
    id: 's_talentshow', minAge: 8, maxAge: 12, weight: 2, title: '才藝表演',
    text: (s) => { const p = performTalent(s); return p ? `全校才藝表演，老師知道你有學${TALENTS.find((x) => x.id === p).label}，問你要不要上台${PERFORM[p]}。` : '全校才藝表演，老師問你要不要報名。'; },
    choices: [
      { odds: (s) => Math.min(1, 0.5 + s.stats.charm / 260), label: '上台', sub: '人緣↑↑', effect: (s, rng) => (chance(rng, 0.5 + s.stats.charm / 260) ? good(`你在全校面前表演完，掌聲大到你耳朵嗡嗡響。${addStats(s, { charm: 8, happy: 6 })}`) : `你上台忘詞愣了五秒，台下有人笑出來。但你講完了。${addStats(s, { charm: 3, happy: -3 })}`) },
      { label: '在台下看', sub: '沒事發生', effect: (s) => `你坐在台下拍手，心裡想著明年也許可以試試。${addStats(s, { happy: 1 })}` },
    ],
  },
  {
    id: 's_money_class', minAge: 9, maxAge: 12, weight: 2, title: '班上在賣東西',
    choices: [
      { label: '跟著做小生意', sub: '經商頭腦、賺一點', effect: (s) => { const amt = P(s, 0.25 * WAN); s.money += amt; s.flags.bizSense = true; return good(`你在班上賣自己做的手環，一個十塊，兩週賣了四十個（+${formatMoney(amt)}）。經商能力提升！${addStats(s, { charm: 4, int: 2 })}`); } },
      { label: '當客人就好', sub: '快樂↑', effect: (s) => `你買了兩個，戴到斷掉為止。${addStats(s, { happy: 3 })}` },
    ],
  },
  {
    id: 's_sick_flu', minAge: 6, maxAge: 12, weight: 2, title: '流感請假一週',
    effect: (s) => { const c = P(s, 0.3 * WAN); return bad(`你燒了三天，媽媽請假在家陪你，醫藥費 ${formatMoney(c)}（爸媽付的）。回學校時進度落後了一截。${addStats(s, { hp: -5, int: -2, happy: -2 })}`); },
  },
  {
    id: 's_graduation', minAge: 12, maxAge: 13, weight: 4, once: true, title: '國小畢業典禮',
    effect: (s) => good(`你們在畢業紀念冊上互相寫「友誼長存」，幾個女生哭到停不下來。${addStats(s, { charm: 4, happy: 6 })}`),
  },
];

// ───────────────────── 國高中：組團 ─────────────────────
const BAND_NAMES = ['凌晨三點半', '第七號公車', '海風製造所', '失眠俱樂部', '白日夢樂隊', '晚安動物園', '鐵皮屋頂', '末班捷運', '月球背面', '午後雷陣雨'];
const bandName = (s) => s.flags.bandName || '你們的樂團';
const isBandPro = (s) => (s.flags.band === 3 || s.flags.band === 4) && s.job && s.job.id === 'bandmusician';

// 樂團狀態 flags.band：1 組團、2 比賽得名、3 簽約職業樂團、4 走紅、5 當興趣繼續玩、0 解散
export const BAND_EVENTS = [
  {
    id: 'band_form', minAge: 13, maxAge: 18, weight: 16,
    cond: (s) => inSchool(s) && s.flags.club === 'music' && !s.flags.band,
    title: '要不要組團？',
    text: '社團的學長把你拉到角落：「我們缺一個人，寒假有校際比賽，要不要一起？」',
    choices: [
      {
        label: '組！', sub: '人緣↑↑、快樂↑，但很花時間',
        effect: (s, rng) => {
          s.flags.band = 1;
          s.flags.bandName = BAND_NAMES[Math.floor(rng() * BAND_NAMES.length)];
          return good(`你們湊了四個人，團名吵了三個晚上，最後定成「${s.flags.bandName}」。每週六在社辦練到被趕。${addStats(s, { charm: 7, happy: 8, int: -3 })}`);
        },
      },
      { label: '還是專心念書', sub: '智力↑', effect: (s) => `你婉拒了，把週末拿去補習。${addStats(s, { int: 5, happy: -2 })}` },
    ],
  },
  {
    id: 'band_contest', minAge: 14, maxAge: 22, weight: 22,
    cond: (s) => s.flags.band === 1,
    title: (s) => `「${bandName(s)}」報名熱音大賽`,
    // 高中、大學都可以比
    text: '你們報名了全國高中熱音大賽，初賽那天手心一直冒汗。',
    choices: [
      {
        odds: (s) => Math.min(1, 0.35 + s.stats.charm / 260), label: '全力以赴', sub: '有機會成名',
        effect: (s, rng) => {
          if (chance(rng, 0.35 + s.stats.charm / 260)) {
            s.flags.band = 2;
            s.flags.bandFans = (s.flags.bandFans || 0) + 1000;
            addPoints(s, 2, '熱音大賽得名');
            return good(`「${bandName(s)}」拿了冠軍！表演影片被剪成一分鐘丟上網，一個晚上五十萬次點閱。${addStats(s, { charm: 12, happy: 10 })}`);
          }
          return `你們在初賽被刷掉了，回程的公車上沒人講話。但隔週你們又開始練了。${addStats(s, { charm: 3, happy: -4 })}`;
        },
      },
      { label: '棄賽，功課要緊', sub: '智力↑', effect: (s) => { s.flags.band = 0; return `「${bandName(s)}」解散了。多年後同學會上還有人提起這件事。${addStats(s, { int: 4, happy: -5 })}`; } },
    ],
  },
  {
    id: 'band_gig', minAge: 15, maxAge: 26, weight: 10,
    cond: (s) => s.flags.band === 2,
    title: '有 Live House 找你們',
    text: (s) => `一家 Live House 問「${bandName(s)}」要不要當暖場團，有演出費，但要自己扛器材。`,
    choices: [
      {
        label: '接！', sub: '賺錢、人緣↑、累積粉絲',
        effect: (s) => {
          const amt = P(s, 1.5 * WAN); s.money += amt;
          s.flags.bandFans = (s.flags.bandFans || 0) + 800;
          return good(`台下不到三十個人，但有人跟著唱了。演出費 ${formatMoney(amt)}，粉絲專頁多了幾百個讚。${addStats(s, { charm: 5, happy: 6, hp: -2 })}`);
        },
      },
      { label: '婉拒', sub: '休息', effect: (s) => `你們決定先把考試顧好再說。${addStats(s, { int: 3 })}` },
    ],
  },
  // 出社會後：唱片公司來簽約，這時才真的變成職業樂團
  {
    id: 'band_offer', minAge: 18, maxAge: 32, weight: 40, once: true,
    cond: (s) => s.flags.band === 2 && !s.studying && !underIdolContract(s),
    title: '唱片公司找上門',
    text: (s) => `一家獨立唱片公司的製作人來看了「${bandName(s)}」的演出，散場後遞了名片：「要不要簽約？我們幫你們出第一張專輯。」簽了就要全職玩團，收入不穩定。`,
    choices: [
      {
        label: '簽！全職當樂手', sub: '辭掉現在的工作，收入不穩但有機會爆紅',
        effect: (s) => {
          s.flags.band = 3;
          s.flags.bandSign = true;
          addPoints(s, 2, '成為職業樂團');
          return good(`你們在錄音室外面拍了第一張團照。「${bandName(s)}」正式成為職業樂團！${addStats(s, { happy: 12, charm: 6 })}`);
        },
      },
      {
        label: '當興趣，下班繼續玩', sub: '保住工作，週末接演出',
        effect: (s) => { s.flags.band = 5; return `你們決定不簽，平日上班、週末練團。「${bandName(s)}」變成大家下班後的秘密基地。${addStats(s, { happy: 5 })}`; },
      },
      { label: '樂團解散', sub: '專心在工作上', effect: (s) => { s.flags.band = 0; return `最後一次練團結束，你們在樂器行門口吃了一碗滷肉飯，誰都沒說再見。${addStats(s, { happy: -6, int: 2 })}`; } },
    ],
  },
  {
    id: 'band_single', minAge: 18, maxAge: 45, weight: 16,
    cond: (s) => isBandPro(s) && s.flags.band === 3,
    title: (s) => `「${bandName(s)}」發新歌`,
    text: '新單曲錄好了，唱片公司說這首有機會，要你們全力宣傳：跑校園、上電台、拍 MV。',
    choices: [
      {
        odds: (s) => Math.min(0.9, 0.15 + s.stats.charm / 300 + (s.flags.bandFans || 0) / 40000), label: '全力宣傳', sub: '有機會爆紅，健康↓',
        effect: (s, rng) => {
          const p = Math.min(0.9, 0.15 + s.stats.charm / 300 + (s.flags.bandFans || 0) / 40000);
          s.flags.bandFans = (s.flags.bandFans || 0) + rint(rng, 1000, 4000);
          if (chance(rng, p)) {
            s.flags.band = 4;
            if (s.job && s.job.id === 'bandmusician') { s.job.salary = Math.round(s.job.salary * 3); s.job.name = `人氣樂手（${bandName(s)}）`; s.careers.push(s.job.name); }
            addPoints(s, 3, '樂團爆紅');
            return good(`副歌被剪成短影音洗版，KTV 點播榜第一名。「${bandName(s)}」紅了！演出費翻了三倍。${addStats(s, { charm: 10, happy: 12, hp: -4 })}`);
          }
          return `歌是好歌，但沒有爆。累積了一些新粉絲，你們說下一首一定可以。${addStats(s, { charm: 3, happy: -3, hp: -3 })}`;
        },
      },
      { label: '慢慢來，先顧好身體', sub: '健康↑，粉絲成長慢', effect: (s) => { s.flags.bandFans = (s.flags.bandFans || 0) + 500; return `你們照自己的步調發歌，小場子依舊滿場。${addStats(s, { hp: 3, happy: 2 })}`; } },
    ],
  },
  {
    id: 'band_tour', minAge: 18, maxAge: 55, weight: 12,
    cond: (s) => isBandPro(s) && s.flags.band === 4,
    title: (s) => `「${bandName(s)}」巡迴演唱會`,
    text: '經紀人排了十二個城市的巡迴，場場都賣完。只是一個月要睡在十幾家不同的飯店。',
    choices: [
      {
        label: '跑完全部場次', sub: '大賺一筆，健康↓↓',
        effect: (s, rng) => { const amt = P(s, rint(rng, 40, 150) * WAN); s.money += amt; return good(`最後一場，全場大合唱把你唱哭了。這次巡迴分到 ${formatMoney(amt)}。${addStats(s, { happy: 8, charm: 4, hp: -7 })}`); },
      },
      {
        label: '只跑一半', sub: '賺少一點，保住身體',
        effect: (s, rng) => { const amt = P(s, rint(rng, 15, 50) * WAN); s.money += amt; return `你們砍掉一半場次，多出來的時間回家陪家人。分到 ${formatMoney(amt)}。${addStats(s, { happy: 4, hp: -2 })}`; },
      },
    ],
  },
  {
    id: 'band_split', minAge: 28, maxAge: 60, weight: 3,
    cond: (s) => isBandPro(s),
    title: '團員想單飛',
    text: (s) => `鼓手私下跟你說，他想回老家接家裡的生意。「${bandName(s)}」少了他，好像就不是原來的樣子了。`,
    choices: [
      {
        label: '找新鼓手繼續', sub: '樂團繼續，快樂↓',
        effect: (s) => `你們試了七個鼓手才找到對的人。舞台上的默契要重新練。${addStats(s, { happy: -5, charm: 1 })}`,
      },
      {
        label: '解散，各自轉行', sub: '離開樂團，重新找工作',
        effect: (s) => {
          s.flags.band = 0;
          if (s.job && s.job.id === 'bandmusician') { s.job = null; s.flags.needJob = true; }
          return `告別演唱會那天，你們把第一首歌放在安可。「${bandName(s)}」正式解散，你要開始找新工作了。${addStats(s, { happy: -8 })}`;
        },
      },
    ],
  },
  {
    id: 'band_weekend', minAge: 18, maxAge: 60, weight: 5,
    cond: (s) => s.flags.band === 5,
    title: '週末演出',
    text: (s) => `「${bandName(s)}」接到一場婚禮樂團的邀約，演出費不多，但大家都很想上台。`,
    choices: [
      { label: '上台！', sub: '賺一點、快樂↑', effect: (s) => { const amt = P(s, 1.2 * WAN); s.money += amt; return good(`新郎新娘最後也跳上台跟你們一起唱。演出費 ${formatMoney(amt)}。${addStats(s, { happy: 6, charm: 2 })}`); } },
      { label: '這次先不要', sub: '休息', effect: (s) => `你們把檔期讓給學弟妹的樂團。${addStats(s, { hp: 1 })}` },
    ],
  },
];

// ───────────────────── 國高中：當偶像 ─────────────────────
export const IDOL_EVENTS = [
  {
    id: 'idol_scout', minAge: 13, maxAge: 19, weight: 7,
    cond: (s) => inSchool(s) && !s.flags.idol && s.stats.charm >= 55,
    title: '被星探攔下來',
    text: '你放學走出捷運站，一個拿著名片的人叫住你：「同學，有沒有想過當藝人？我們公司在找練習生。」',
    choices: [
      {
        odds: (s) => Math.min(1, 0.4 + s.stats.charm / 260), label: '去試鏡看看', sub: '人緣↑，可能成為練習生',
        effect: (s, rng) => {
          if (chance(rng, 0.4 + s.stats.charm / 260)) {
            s.flags.idol = 1;
            s.flags.idolEnd = s.age + 8;
            return good(`三輪試鏡之後你收到了合約：練習生約八年（到 ${s.flags.idolEnd} 歲），中途解約要付違約金。爸媽反對了很久，最後只說了一句「自己決定」。你成為練習生了。${addStats(s, { charm: 8, happy: 6, int: -2 })}`);
          }
          return `你去了，唱完一首歌就被請出來。「再多練練。」他們說。${addStats(s, { charm: 3, happy: -3 })}`;
        },
      },
      { label: '收下名片但沒打', sub: '什麼都沒發生', effect: (s) => `那張名片在你書包夾層裡放了三年。${addStats(s, { happy: 1 })}` },
    ],
  },
  {
    id: 'idol_train', minAge: 13, maxAge: 26, weight: 16,
    cond: (s) => s.flags.idol === 1,
    title: '練習生的日子',
    text: '每天放學直接進公司，唱歌、跳舞、體重管理，回到家已經十一點。公司說下個月有出道評測。',
    choices: [
      {
        odds: (s) => Math.min(1, 0.3 + s.stats.charm / 300), label: '撐下去', sub: '人緣↑↑、健康↓，有機會出道',
        effect: (s, rng) => {
          if (chance(rng, 0.3 + s.stats.charm / 300)) {
            s.flags.idol = 2;
            s.flags.idolEnd = s.age + 8;
            addPoints(s, 3, '偶像出道');
            return good(`評測結果公布，你的名字在名單上。你出道了！公司跟你簽了八年約（到 ${s.flags.idolEnd} 歲），這段時間不能去找別的工作。${addStats(s, { charm: 14, happy: 10, hp: -6, int: -3 })}`);
          }
          return `你這次沒過。鏡子前面多練了三個小時。${addStats(s, { charm: 5, hp: -5, happy: -4, int: -2 })}`;
        },
      },
      {
        label: (s) => (s.studying ? '解約，回去當學生' : '解約，去找別的工作'), sub: '要付違約金，健康↑、智力↑',
        effect: (s) => {
          const fee = Math.round(30 * WAN * (s.priceIndex || 1));
          s.money -= fee;
          s.flags.idol = 0; s.flags.idolEnd = null;
          if (s.job && s.job.id === 'trainee') { s.job = null; s.flags.needJob = true; }
          return `你付了 ${formatMoney(fee)} 違約金跟公司解約。${s.studying ? '回到教室的第一天覺得桌椅好陌生。' : '隔天開始投履歷。'}${addStats(s, { hp: 6, int: 5, happy: -4, charm: -2 })}`;
        },
      },
    ],
  },
  {
    id: 'idol_debut', minAge: 15, maxAge: 30, weight: 12,
    cond: (s) => s.flags.idol === 2,
    title: '出道之後',
    text: '第一張單曲反應還不錯，通告開始多起來，但你已經兩個月沒回家吃過飯。',
    choices: [
      {
        label: '拚事業', sub: '賺錢、人緣↑↑、健康↓',
        effect: (s, rng) => {
          const amt = P(s, rint(rng, 8, 30) * WAN);
          s.money += amt;
          if (chance(rng, 0.25)) {
            s.flags.idol = 3;
            return good(`你接了一部偶像劇，演完之後路人會在便利商店認出你。這一年賺了 ${formatMoney(amt)}。${addStats(s, { charm: 10, happy: 4, hp: -6 })}`);
          }
          return good(`跑了一整年的通告，賺了 ${formatMoney(amt)}，但身體真的很累。${addStats(s, { charm: 6, hp: -5, happy: 2 })}`);
        },
      },
      {
        label: '減少工作，把書唸完', sub: '智力↑、健康↑',
        effect: (s) => `你把通告推掉一半，晚上回學校上課。經紀人不太高興，但你睡得著了。${addStats(s, { int: 6, hp: 4, charm: -3 })}`,
      },
    ],
  },
  {
    id: 'idol_scandal', minAge: 17, maxAge: 35, weight: 3,
    cond: (s) => s.flags.idol >= 2 && s.flags.idol <= 3,
    title: '被拍到了',
    text: '週刊拍到你跟人在停車場講話，標題寫得很難聽。公司要你出來說明。',
    choices: [
      { label: '開記者會說清楚', sub: '人緣先跌後升', effect: (s, rng) => (chance(rng, 0.55) ? good(`你把來龍去脈講清楚，網路風向翻了過來，還有人說你很誠懇。${addStats(s, { charm: 5, happy: -3 })}`) : bad(`沒有人相信你，代言掉了兩個。${addStats(s, { charm: -10, happy: -8 })}`)) },
      { label: '不回應，讓它過去', sub: '人緣↓，但省事', effect: (s) => `公司發了一則聲明就沒下文了。過了三個月，大家真的忘了。${addStats(s, { charm: -4, happy: -3 })}` },
    ],
  },
];
