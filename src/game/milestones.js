// 人生里程碑：抓周、會考、學測、畢業
import { addStats, chance, formatMoney, WAN } from './utils.js';
import { addPoints, addSkill, startBiz, underIdolContract } from './actions.js';

const AGENCY_COST = (s) => Math.round(300 * WAN * (s.priceIndex || 1) / WAN) * WAN;

// 練習生／藝人中途解約的違約金：剩越多年越貴
const idolBreakFee = (s) => Math.round((s.flags.idol === 1 ? 30 : 100) * WAN * Math.max(1, (s.flags.idolEnd || s.age) - s.age) / 4 * (s.priceIndex || 1) / WAN) * WAN;

const good = (text) => ({ text, tone: 'good' });

// 考試分數：智力為主，加上一點運氣
export const examScore = (s, rng) => Math.round(Math.max(0, Math.min(100, s.stats.int + (rng() - 0.5) * 16 + (s.flags.cramYears || 0) * 0.8)));

export const MILESTONES = {
  zhuazhou: {
    title: '抓周',
    text: '一歲生日，桌上擺滿了東西（這次擺出來的有這幾樣），大家都在等你抓哪一個。',
    pick: 5, // 每次從下面隨機擺出 5 樣
    choices: [
      { label: '書本', sub: '智力大幅提升', effect: (s) => good(`你抓起書本，阿公說你以後一定很會讀書。${addStats(s, { int: 8 })}`) },
      { label: '金幣', sub: '投資眼光提升', effect: (s) => { addSkill(s, 1); return good(`你緊緊抓著金幣不放，大家笑說你以後會很會賺錢。投資眼光提升！${addStats(s, { charm: 2 })}`); } },
      { label: '算盤', sub: '經商頭腦', effect: (s) => { s.flags.bizSense = true; return good(`你抓起算盤搖來搖去，是做生意的料。經商能力提升！${addStats(s, { int: 3 })}`); } },
      { label: '小皮球', sub: '健康大幅提升', effect: (s) => good(`你抱著皮球滾來滾去，活力十足。${addStats(s, { hp: 8 })}`) },
      { label: '麥克風', sub: '人緣大幅提升', effect: (s) => good(`你拿著麥克風咿咿呀呀，天生的表演者。${addStats(s, { charm: 8 })}`) },
      { label: '畫筆', sub: '人緣、快樂↑', effect: (s) => good(`你握著畫筆在紙上亂塗，畫出一團看不懂的東西，但大人都說很有天份。${addStats(s, { charm: 5, happy: 4 })}`) },
      { label: '聽診器', sub: '智力、健康↑', effect: (s) => good(`你把聽診器塞進嘴巴咬，阿嬤說你以後一定當醫生。${addStats(s, { int: 5, hp: 3 })}`) },
      { label: '鍵盤', sub: '智力↑↑', effect: (s) => good(`你趴在鍵盤上亂敲，螢幕跑出一堆亂碼。${addStats(s, { int: 7, charm: -1 })}`) },
      { label: '鍋鏟', sub: '健康、快樂↑', effect: (s) => good(`你拿著鍋鏟敲得叮叮咚咚，像在炒菜一樣。${addStats(s, { hp: 4, happy: 5 })}`) },
      { label: '汽車鑰匙', sub: '健康↑、人緣↑', effect: (s) => good(`你搖著車鑰匙不放，坐上學步車就往前衝。${addStats(s, { hp: 5, charm: 3 })}`) },
      { label: '一包種子', sub: '健康↑、耐心好', effect: (s) => { s.flags.patient = true; return good(`你抓了一把種子撒得滿地都是，媽媽說你是務實的孩子。（投資比較有耐心）${addStats(s, { hp: 4 })}`); } },
      { label: '直尺', sub: '智力↑、細心', effect: (s) => good(`你拿著尺量來量去，連地板的縫都要量。${addStats(s, { int: 6, happy: -1 })}`) },
      { label: '聽筒電話', sub: '人緣↑↑', effect: (s) => good(`你拿起話筒「喂喂喂」講個不停，是天生的業務。${addStats(s, { charm: 7, happy: 2 })}`) },
      { label: '印章', sub: '經商頭腦、智力↑', effect: (s) => { s.flags.bizSense = true; return good(`你抓起印章到處蓋，滿桌都是紅印。大人說你以後會當老闆。${addStats(s, { int: 2, charm: 2 })}`); } },
      { label: '存錢筒', sub: '投資眼光↑、多一點零用錢', effect: (s) => { addSkill(s, 1); s.flags.saver = true; return good(`你抱著存錢筒不肯放手，親戚一人塞一個銅板進去。（以後零用錢多一成）${addStats(s, { happy: 2 })}`); } },
      { label: '哨子', sub: '健康↑、快樂↑', effect: (s) => good(`你吹哨子吹到滿臉通紅，整個客廳都是你的聲音。${addStats(s, { hp: 5, happy: 4, charm: 1 })}`) },
      { label: '樂高積木', sub: '智力↑、人緣↑', effect: (s) => good(`你把積木一塊一塊疊得老高，然後推倒大笑。${addStats(s, { int: 5, charm: 2, happy: 2 })}`) },
      { label: '紅包袋', sub: '直接拿到錢', effect: (s) => { const amt = Math.round(3 * WAN * (s.priceIndex || 1)); s.money += amt; return good(`你抓起紅包袋就往嘴裡塞，親戚笑到不行，當場又包了一包給你。（+${formatMoney(amt)}）${addStats(s, { charm: 3 })}`); } },
    ],
  },

  // ───────── 3 歲：上幼兒園 ─────────
  kinder: {
    title: '要上哪一間幼兒園？',
    text: (s) => `你三歲了，該上幼兒園了。爸媽在客廳討論了好幾個晚上。（家境：${s.family === 'poor' ? '清寒' : s.family === 'normal' ? '小康' : s.family === 'rich' ? '富裕' : '豪門'}，越好的家庭選擇越多）`,
    choices: [
      {
        label: '公立幼兒園', sub: '抽籤抽到的，省錢',
        effect: (s) => {
          s.flags.kinder = 'public';
          return good(`你抽到了公立幼兒園。老師帶著三十個小孩玩得很開心，什麼都要自己來。${addStats(s, { charm: 4, hp: 3, int: 2 })}`);
        },
      },
      {
        label: '私立幼兒園', sub: '有才藝課，爸媽要多花錢',
        cond: (s) => s.family !== 'poor',
        effect: (s) => {
          s.flags.kinder = 'private';
          return good(`你進了私立幼兒園，每週有美術、音樂和體能課，制服是格子裙。${addStats(s, { int: 5, charm: 4, happy: 2 })}`);
        },
      },
      {
        label: '雙語幼兒園', sub: '外師全美語，很貴',
        cond: (s) => s.family === 'rich' || s.family === 'tycoon',
        effect: (s) => {
          s.flags.kinder = 'bilingual';
          s.flags.english = true;
          return good(`你被送進雙語幼兒園，每天有外師陪你唸繪本。（出社會後薪水多一點）${addStats(s, { int: 7, charm: 3, happy: -1 })}`);
        },
      },
      {
        label: '不上了，阿嬤帶', sub: '省下所有錢，但比較野',
        effect: (s) => {
          s.flags.kinder = 'grandma';
          return good(`爸媽決定讓阿嬤帶。你每天在巷子口跑來跑去，曬得黑黑的，超級快樂。${addStats(s, { hp: 6, happy: 7, int: -2 })}`);
        },
      },
    ],
  },


  // ───────── 6 歲：上小學，誰接送？（幼兒園選「阿嬤帶」的人不用選，阿嬤會繼續接送）─────────
  pickup: {
    title: '上小學了，誰接送？',
    text: (s) => (s.flags.kinder === 'grandma'
      ? '小學離家有一段路。阿嬤說她順便，爸媽也就沒再排時間接送了。要怎麼上下學？（想讓爸媽接，要等升國中再說）'
      : '小學離家有一段路。晚餐桌上爸媽在討論：每天上下學要怎麼安排？'),
    choices: [
      { label: '爸媽接送', sub: '快樂↑', cond: (s) => s.flags.kinder !== 'grandma', effect: (s) => { s.flags.pickup = 'parents'; return good(`爸媽輪流接送，車上的十分鐘是你們一天裡聊最多的時候。${addStats(s, { happy: 4, charm: 1 })}`); } },
      { label: '阿嬤接送', sub: '健康、快樂↑，以後不用爸媽', effect: (s) => { s.flags.pickup = 'grandma'; return good(`阿嬤每天牽著你走去學校，放學時手裡一定有一顆糖。${addStats(s, { hp: 3, happy: 4 })}`); } },
      { label: '放學去安親班', sub: '智力↑↑，爸媽要花錢', cond: (s) => s.family !== 'poor', effect: (s) => { s.flags.pickup = 'anqin'; return good(`放學直接進安親班，功課寫完才能回家，成績一直很穩。${addStats(s, { int: 5, happy: -2 })}`); } },
      { label: '自己走路上學', sub: '獨立，人緣↑', effect: (s) => { s.flags.pickup = 'self'; return good(`你脖子上掛著鑰匙，跟巷口的同學一起走，路上什麼都聊。${addStats(s, { charm: 4, hp: 1, int: -1 })}`); } },
    ],
  },

  // ───────── 12 歲：升國中，接送要不要改？ ─────────
  pickup12: {
    title: '升國中了，上學方式要改嗎？',
    text: (s) => (s.flags.pickup === 'grandma'
      ? '阿嬤接送了六年，最近爬樓梯會喘。國中比較遠，要不要換個方式？'
      : '國中離家比較遠，也開始有晚自習。上下學要怎麼安排？'),
    choices: [
      { label: '改成爸媽接送', sub: '快樂↑', effect: (s) => { const old = s.flags.pickup; s.flags.pickup = 'parents'; return good(`${old === 'grandma' ? '阿嬤終於可以睡午覺了。' : ''}爸媽開始輪流接送，晚自習結束車子一定在校門口。${addStats(s, { happy: 3, charm: 1 })}`); } },
      { label: '自己搭公車', sub: '獨立，人緣↑', effect: (s) => { s.flags.pickup = 'self'; return good(`你辦了學生悠遊卡，公車上認識了隔壁班的人。${addStats(s, { charm: 4, int: 1 })}`); } },
      { label: '還是讓阿嬤接', sub: '阿嬤很開心，健康↑', cond: (s) => s.flags.pickup === 'grandma', effect: (s) => good(`阿嬤說她走得動。你們改成一起搭公車，她在站牌等你。${addStats(s, { hp: 2, happy: 4 })}`) },
    ],
  },


  // ───────── 偶像合約到期：出道時簽的八年約 ─────────
  idolRenew: {
    title: (s) => (s.flags.idol === 1 ? '練習生合約到期了' : '偶像合約到期了'),
    text: (s) => (s.flags.idol === 1
      ? `八年了，你還是沒能出道。公司說不續約了，練習室的鑰匙要交回去。`
      : `八年前簽的約到期了。公司把新合約放在桌上：再簽八年，簽約金 ${formatMoney(Math.round(80 * WAN * s.priceIndex))}。你已經 ${s.age} 歲，圈子裡的新人一年比一年多。`),
    choices: [
      {
        label: '離開公司', sub: '不用付違約金',
        cond: (s) => s.flags.idol === 1,
        effect: (s) => {
          s.flags.idol = 0; s.flags.idolEnd = null;
          if (s.job && s.job.id === 'trainee') { s.job = null; if (!s.studying) s.flags.needJob = true; }
          return `你把八年的舞蹈鞋裝進紙箱。走出公司大門的時候，天很藍。${addStats(s, { happy: -4, hp: 4, int: 2 })}`;
        },
      },
      {
        label: '續約八年', sub: '拿簽約金，繼續當藝人',
        cond: (s) => s.flags.idol >= 2,
        effect: (s) => {
          const amt = Math.round(80 * WAN * s.priceIndex);
          s.money += amt;
          s.flags.idolEnd = s.age + 8;
          if (s.job && s.job.id === 'idol') s.job.salary = Math.round(s.job.salary * 1.2);
          return good(`你簽了。經紀人開了香檳，簽約金 ${formatMoney(amt)} 進帳，新合約的分紅也比較好。${addStats(s, { charm: 5, happy: 3 })}`);
        },
      },
      {
        label: '自己開經紀公司', sub: (s) => `要 ${formatMoney(AGENCY_COST(s))} 現金，當老闆帶新人`,
        cond: (s) => s.flags.idol >= 2 && s.money >= AGENCY_COST(s),
        effect: (s) => {
          s.flags.idol = 4;
          s.flags.idolEnd = null;
          if (s.job && s.job.id === 'idol') s.job = null;
          const cost = AGENCY_COST(s);
          const text = startBiz(s, 'talentagency', { cash: cost, value: Math.round(cost * 1.4) });
          addPoints(s, 3, '開經紀公司');
          return good(`你把這些年的人脈全帶走，自己開了經紀公司，第一批練習生就是以前的師弟妹。${text}${addStats(s, { charm: 6, happy: 5 })}`);
        },
      },
      {
        label: '不續約，轉行', sub: '離開演藝圈，之後可以找別的工作',
        cond: (s) => s.flags.idol >= 2,
        effect: (s) => {
          s.flags.idol = 4;
          s.flags.idolEnd = null;
          if (s.job && s.job.id === 'idol') s.job = null;
          if (!s.studying) s.flags.needJob = true;
          return `你在最後一場簽名會哭了。隔天起床，第一次不用看通告表。${addStats(s, { happy: 4, hp: 3, charm: -3 })}`;
        },
      },
    ],
  },

  // ───────── 5 歲：資優鑑定，可以跳級 ─────────
  skipGrade: {
    title: '資優鑑定',
    text: (s) => `幼兒園老師跟爸媽說：「這孩子認的字比同齡的多好多。」學校安排你去考跳級鑑定。你的智力是 ${s.stats.int}${s.stats.int >= 90 ? '，老師說這種程度閉著眼睛都會過' : '，考不考得過要看臨場表現'}。要不要去考？`,
    choices: [
      {
        label: '去考跳級', sub: '考過就提早一年入學，所有考試提前一年',
        // 智力 90 以上穩過；不然看機率（62 → 約 27%，75 → 約 56%，85 → 約 78%）
        odds: (s) => (s.stats.int >= 90 ? 1 : Math.max(0.1, Math.min(0.95, (s.stats.int - 50) / 45))),
        effect: (s, rng) => {
          const p = s.stats.int >= 90 ? 1 : Math.max(0.1, Math.min(0.95, (s.stats.int - 50) / 45));
          if (!chance(rng, p)) {
            return `鑑定那天你太緊張，圖形推理那一頁整頁空白。沒過，跟同年齡的一起入學。${addStats(s, { happy: -3, int: 1 })}`;
          }
          s.flags.skipYears = (s.flags.skipYears || 0) + 1;
          addPoints(s, 3, '跳級');
          return good('鑑定通過！你提早一年入學，成了班上最小的那一個。同學都比你高半顆頭，但考試考得比誰都好。（會考、學測、畢業全部提前一年）'
            + addStats(s, { int: 6, charm: -3, happy: -2 }));
        },
      },
      {
        label: '算了，跟同年齡一起', sub: '快樂、人緣↑',
        effect: (s) => good(`爸媽說童年只有一次，不急。你繼續跟同年紀的孩子一起玩。${addStats(s, { happy: 5, charm: 3 })}`),
      },
    ],
  },

  // ───────── 13 歲：國中選社團 ─────────
  club: {
    title: '國中要參加什麼社團？',
    text: '社團博覽會辦在操場，學長姐一個個拉著你介紹。你只能選一個。',
    choices: [
      { label: '🎸 熱門音樂社', sub: '人緣↑↑、之後可以組團', effect: (s) => { s.flags.club = 'music'; return good(`你借了社辦的吉他，第一次把和弦按對的時候起了雞皮疙瘩。${addStats(s, { charm: 6, happy: 5, int: -1 })}`); } },
      { label: '🏀 籃球隊', sub: '健康↑↑、人緣↑', effect: (s) => { s.flags.club = 'ball'; return good(`每天放學留下來練球，球衣沒有一天是乾的。${addStats(s, { hp: 8, charm: 4, int: -2 })}`); } },
      { label: '🔬 科學研究社', sub: '智力↑↑', effect: (s) => { s.flags.club = 'science'; return good(`你們做的專題拿去參加科展，評審問了很多問題，你一題一題答完了。${addStats(s, { int: 8, charm: -1 })}`); } },
      { label: '💃 熱舞社', sub: '健康↑、人緣↑↑', effect: (s) => { s.flags.club = 'dance'; return good(`你在鏡子前面練同一個八拍練了兩百次，成果發表那天全場都在尖叫。${addStats(s, { hp: 4, charm: 7, happy: 3 })}`); } },
      { label: '🗣️ 演辯社', sub: '人緣↑、智力↑', effect: (s) => { s.flags.club = 'debate'; return good(`你學會了怎麼在三十秒內把話講清楚，這個能力跟了你一輩子。${addStats(s, { charm: 5, int: 4 })}`); } },
      { label: '🎮 電競社', sub: '快樂↑↑、智力↑', effect: (s) => { s.flags.club = 'esports'; return good(`你們在社辦打到警衛來趕人，反應速度練得很快。${addStats(s, { happy: 8, int: 3, hp: -3 })}`); } },
      { label: '📚 不參加，專心讀書', sub: '智力↑↑↑', effect: (s) => { s.flags.club = 'none'; return `你把社團時間拿去自習，成績穩穩在前段。${addStats(s, { int: 9, charm: -4, happy: -3 })}`; } },
    ],
  },

  exam15: {
    title: '國中會考',
    text: (s) => `會考成績出來了：${s.flags.score15} 分（滿分 100）。你要怎麼選？`,
    choices: [
      {
        label: '明星高中', sub: '需要 70 分以上',
        cond: (s) => s.flags.score15 >= 70,
        effect: (s) => { s.edu = 'senior'; s.flags.topSchool = true; addPoints(s, 2, '考上明星高中'); return good(`你考上了明星高中！${addStats(s, { int: 3, happy: 6 })}`); },
      },
      { label: '普通高中', sub: '三年後考學測', effect: (s) => { s.edu = 'senior'; return `你進入普通高中就讀。${addStats(s, { happy: 2 })}`; } },
      { label: '高職', sub: '學一技之長，也能考科大', effect: (s) => { s.edu = 'vocational'; return `你選擇讀高職，學習實用技能。${addStats(s, { hp: 2, charm: 2 })}`; } },
      { label: '不讀了，直接工作', sub: '提早賺錢', effect: (s) => { s.edu = 'junior'; s.studying = false; s.flags.needJob = true; return `你決定提早出社會。${addStats(s, { happy: -2 })}`; } },
    ],
  },

  exam18: {
    title: '大學入學考試',
    text: (s) => `考試成績出來了：${s.flags.score18} 分。你想怎麼選？`,
    choices: [
      {
        label: '頂尖大學', sub: '需要 90 分以上',
        cond: (s) => s.flags.score18 >= 90,
        showLocked: (s) => `需要 90 分以上（還差 ${90 - s.flags.score18} 分）`,
        effect: (s) => { s.edu = 'topCollege'; addPoints(s, 3, '考上頂尖大學'); return good(`你考上了頂尖大學！全家都為你驕傲。${addStats(s, { happy: 10, int: 3 })}`); },
      },
      {
        label: '普通大學', sub: '需要 45 分以上',
        cond: (s) => s.flags.score18 >= 45 && s.edu === 'senior',
        effect: (s) => { s.edu = 'college'; return `你進入普通大學就讀。${addStats(s, { happy: 4 })}`; },
      },
      {
        label: '科技大學', sub: '需要 40 分以上',
        cond: (s) => s.flags.score18 >= 40,
        effect: (s) => { s.edu = 'techCollege'; return `你進入科技大學就讀。${addStats(s, { happy: 3, hp: 1 })}`; },
      },
      { label: '直接工作', sub: '早點開始賺錢', effect: (s) => { s.studying = false; s.flags.needJob = true; return `你決定高中畢業就出社會。${addStats(s, { happy: -1 })}`; } },
    ],
  },

  grad22: {
    title: '大學畢業',
    text: (s) => (underIdolContract(s)
      ? `恭喜畢業！你跟經紀公司的合約還有 ${s.flags.idolEnd - s.age} 年。接下來要繼續${s.flags.idol === 1 ? '當練習生' : '當藝人'}，還是轉行？（中途解約要付違約金 ${formatMoney(idolBreakFee(s))}）`
      : '恭喜畢業！接下來想怎麼走？（研究所學費每年 10 萬）'),
    choices: [
      {
        label: '讀研究所', sub: '兩年後學歷更高',
        cond: (s) => s.stats.int >= 50 && !underIdolContract(s),
        effect: (s) => { s.flags.inMaster = true; return `你考上研究所，繼續深造。${addStats(s, { int: 3 })}`; },
      },
      { label: '開始找工作', sub: '馬上賺錢', cond: (s) => !underIdolContract(s), effect: (s) => { s.studying = false; s.flags.needJob = true; return good(`你拿到畢業證書，準備找工作。${addStats(s, { happy: 5 })}`); } },
      {
        label: (s) => (s.flags.idol === 1 ? '繼續當練習生' : '繼續當藝人'), sub: '公司安排全職，合約照走',
        cond: (s) => underIdolContract(s),
        effect: (s) => { s.studying = false; s.flags.needJob = true; return good(`你把畢業證書收進抽屜，隔天照常進公司。${addStats(s, { charm: 3, happy: 2 })}`); },
      },
      {
        label: '轉職', sub: (s) => `付違約金 ${formatMoney(idolBreakFee(s))}；公司不要你就不用付`,
        cond: (s) => underIdolContract(s),
        effect: (s, rng) => {
          const fee = idolBreakFee(s);
          s.studying = false;
          s.flags.needJob = true;
          const wasTrainee = s.flags.idol === 1;
          s.flags.idol = wasTrainee ? 0 : 4;
          s.flags.idolEnd = null;
          if (s.job && (s.job.id === 'idol' || s.job.id === 'trainee')) s.job = null;
          // 公司也可能早就不想留你：人緣越低越可能被放走（不用付違約金）
          if (chance(rng, 0.3 + Math.max(0, 70 - s.stats.charm) / 200)) {
            return `你提出解約，公司比你還乾脆：「正好，我們也不打算續。」不用付違約金，你自由了。${addStats(s, { happy: 3, charm: -4 })}`;
          }
          s.money -= fee;
          return `公司不肯放人，你付了 ${formatMoney(fee)} 違約金才拿回自由。${addStats(s, { happy: -3, hp: 2 })}`;
        },
      },
    ],
  },

  achieved: {
    title: '小目標達成！',
    text: (s) => `你在 ${s.age} 歲時，淨資產突破一個億！接下來繼續享受人生，看看到 ${s.endAge} 歲退休時能累積多少。（獲得 10 點）`,
    choices: [{ label: '太棒了！', effect: (s) => good(`淨資產突破一億！${addStats(s, { happy: 15 })}`) }],
  },

  gift: {
    title: '家人的祝福',
    text: (s) => `你要出社會了，家人給你 ${formatMoney(s.flags.giftAmount)} 當作起步資金。`,
    choices: [{ label: '謝謝爸媽', effect: (s) => good(`你收下了家人的心意。（+${formatMoney(s.flags.giftAmount)}）`) }],
  },
};

export const GRAD_TUITION = 10 * WAN;
