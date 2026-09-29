// 梗事件：荒謬、好笑、想截圖傳給朋友的那種。
// 抽「要做選擇的事件」時有 1/5 的機會從這裡抽（engine 的 pickEvent），每一件一輩子只會遇到一次。
// 寫法：開頭一兩句就交代完，結果要有一個「神展開」的笑點；錢的輸贏照物價和你的身家縮放。
import { addMoney, addStats, chance, formatMoney, rint, WAN } from './utils.js';
import { alivePets, netWorth } from './actions.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });
const wow = (text) => ({ text, tone: 'milestone' });
const P = (s, v) => Math.round(v * s.priceIndex);
const cash = (s) => Math.max(0, s.money);
// 押注：現金的一個比例，但至少／最多多少（照物價）
const stake = (s, pct, lo, hi) => Math.round(Math.min(P(s, hi * WAN), Math.max(P(s, lo * WAN), cash(s) * pct)));
const adult = (s) => !s.studying && s.age >= 18;
const cat = (s) => alivePets(s).find((p) => p.type === 'cat');
const dog = (s) => alivePets(s).find((p) => p.type === 'dog');
const TAG = '😂 神展開';

const M = (e) => ({ meme: true, once: true, weight: 1, tag: TAG, ...e });

export const MEME_EVENTS = [
  // ───────── 小時候 ─────────
  M({
    id: 'mm_gacha', art: 'social', minAge: 8, maxAge: 16, title: '不小心按了 99 抽',
    text: '你拿媽媽的手機玩手遊，手一滑按下「99 連抽」。簡訊通知：刷卡 29,700 元。',
    choices: [
      { label: '馬上自首', effect: (s) => `媽媽沉默了三秒，然後說：「抽到什麼？」你們一起看完 99 張卡。退款申請下來了，你被禁手機一個月。${addStats(s, { happy: -3, charm: 2 })}` },
      {
        label: '把簡訊刪掉', effect: (s, rng) => (chance(rng, 0.3)
          ? good(`沒人發現。而且你抽到了全服只有 12 張的限定卡，同學排隊來看。${addStats(s, { charm: 6, happy: 6 })}`)
          : bad(`月底帳單寄到家裡。你的名字從此在家族群組被稱為「99 抽」。${addStats(s, { happy: -8, charm: -2 })}`)),
      },
    ],
  }),
  M({
    id: 'mm_dance', art: 'social', minAge: 11, maxAge: 17, title: '全台最自信的國中生',
    text: '下課你在走廊跳了一段自創舞步，被同學拍下來。隔天新聞標題：「全台最自信的學生」。',
    choices: [
      {
        label: '趁勢開帳號', effect: (s, rng) => (chance(rng, 0.5 + s.stats.charm / 300)
          ? good(`第二支影片破百萬觀看。校長在朝會上說「我們學校出了一位藝人」，全場尖叫。${addStats(s, { charm: 9, happy: 6 })}`)
          : `第二支影片只有 38 個讚，其中 30 個是你阿姨的分身帳號。${addStats(s, { charm: 2, happy: -2 })}`),
      },
      { label: '躲起來等風頭過', effect: (s) => `一個月後大家就忘了。只有班導還會在班會時學你跳一下。${addStats(s, { happy: -1 })}` },
    ],
  }),
  M({
    id: 'mm_vote', art: 'school', minAge: 9, maxAge: 15, title: '全班都投給自己',
    text: '選班長，你偷偷投給自己。開票結果：全班 30 個人，每個人都 1 票。',
    choices: [
      { label: '提議猜拳決勝', effect: (s, rng) => (chance(rng, 1 / 3) ? good(`你連贏 29 個人當上班長。這件事被你寫進了往後每一份履歷。${addStats(s, { charm: 6, happy: 5 })}`) : `你第一輪就輸給出剪刀的同學。你一直記得他。${addStats(s, { happy: -2 })}`) },
      { label: '承認投給自己', effect: (s) => good(`你站起來說「我投給我自己」。全班一起笑出來，接著 29 個人都承認了。老師說這是她教書最好笑的一天。${addStats(s, { charm: 5, happy: 4 })}`) },
    ],
  }),
  M({
    id: 'mm_bus', art: 'school', minAge: 7, maxAge: 14, title: '坐錯公車',
    text: '放學你睡著了，醒來的時候公車停在宜蘭。',
    choices: [
      { label: '打給爸媽', effect: (s) => `爸爸開車來接你，回程順便買了牛舌餅和三星蔥餅。他說這是今年最划算的一次迷路。${addStats(s, { happy: 4 })}` },
      { label: '自己想辦法回家', effect: (s, rng) => (chance(rng, 0.6) ? good(`你看站牌、問路、換了兩班車，晚上九點到家。從那天起沒有人再叫你小孩。${addStats(s, { int: 4, hp: 2, charm: 2 })}`) : bad(`你換到反方向的車，最後是警察叔叔送你回家的。${addStats(s, { happy: -4 })}`)) },
    ],
  }),
  M({
    id: 'mm_homework', art: 'exam', minAge: 7, maxAge: 13, title: '作業被狗吃了',
    text: '你跟老師說作業被狗吃了。老師：「你家沒有養狗。」',
    choices: [
      { label: '「是鄰居的狗」', effect: (s, rng) => (chance(rng, 0.25) ? good(`老師居然打給鄰居確認。鄰居阿伯說：「對，牠最近很愛吃紙。」你不知道他為什麼要幫你。${addStats(s, { happy: 5, charm: 2 })}`) : bad(`老師請你帶鄰居的狗來學校作證。你寫了三倍的作業。${addStats(s, { happy: -4, int: 2 })}`)) },
      { label: '老實說忘了寫', effect: (s) => `老師說：「至少你沒有說是外星人拿走的。」上一個學生這麼說過。${addStats(s, { int: 1, charm: 1 })}` },
    ],
  }),

  // ───────── 年輕人 ─────────
  M({
    id: 'mm_dogecoin', art: 'money', minAge: 18, maxAge: 60, cond: adult, title: '白皮書只有一張柴犬的照片',
    text: (s) => `朋友傳來一個新幣「阿柴幣」，白皮書只有一頁：一張柴犬的照片。他說「這次不一樣」。`,
    choices: [
      {
        label: (s) => `梭哈 ${formatMoney(stake(s, 0.2, 3, 3000))}`, sub: '20 倍或歸零',
        effect: (s, rng) => {
          const c = stake(s, 0.2, 3, 3000);
          if (chance(rng, 0.12)) { s.flags.mwDoge = true; return wow(`阿柴幣被某個大老闆發了一則推文，一個禮拜漲了 20 倍。你把那張柴犬照片裱框掛在客廳。${addMoney(s, c * 19)}${addStats(s, { happy: 12 })}`); }
          return bad(`三天後開發團隊消失了，官網只剩那張柴犬。牠還在對你笑。${addMoney(s, -c)}${addStats(s, { happy: -8 })}`);
        },
      },
      {
        label: '買一碗牛肉麵的錢就好', effect: (s, rng) => {
          const c = P(s, 300);
          if (chance(rng, 0.12)) return good(`你那 300 塊變成了 6,000 塊。你請朋友吃了 20 碗牛肉麵，他哭著說他梭哈了但賣太早。${addMoney(s, c * 19)}${addStats(s, { happy: 5 })}`);
          return `300 塊沒了。但你獲得了一個可以講一輩子的笑話。${addMoney(s, -c)}${addStats(s, { happy: 1 })}`;
        },
      },
      { label: '封鎖這個朋友', effect: (s) => `你沒買。朋友之後改賣量子能量水，你很慶幸早就封鎖他了。${addStats(s, { int: 2 })}` },
    ],
  }),
  M({
    id: 'mm_wrongticket', art: 'money', minAge: 20, maxAge: 85, cond: adult, title: '彩券行給錯張',
    text: '你買了一張刮刮樂，回家才發現老闆給錯了，是隔壁客人的那張。你刮開：中了 10 萬。',
    choices: [
      { label: '拿回去還給他', effect: (s) => wow(`那位客人是一個阿嬤。她堅持分你一半，還說要把孫子介紹給你。老闆在店門口貼了「本店出現好人」的紅紙。${addMoney(s, P(s, 5 * WAN))}${addStats(s, { charm: 8, happy: 8 })}`) },
      { label: '默默去兌獎', effect: (s, rng) => (chance(rng, 0.5) ? `你兌了 10 萬。之後每次經過那家彩券行，你都繞路。${addMoney(s, P(s, 10 * WAN))}${addStats(s, { happy: -3 })}` : bad(`彩券行有監視器。阿嬤的孫子是律師。你還了錢，還多付了一筆和解金。${addMoney(s, -P(s, 3 * WAN))}${addStats(s, { charm: -6, happy: -6 })}`)) },
    ],
  }),
  M({
    id: 'mm_braisedrice', art: 'social', minAge: 18, maxAge: 45, title: '一碗滷肉飯爆紅',
    text: '你隨手拍的一碗滷肉飯爆紅。店家把你的照片印成大海報，貼在門口寫「網紅推薦」。',
    choices: [
      { label: '去跟老闆談業配', effect: (s, rng) => (chance(rng, 0.6) ? good(`老闆說：「沒錢，但你這輩子吃飯免費。」你算了一下，好像也不虧。${addMoney(s, P(s, 3 * WAN))}${addStats(s, { happy: 6, charm: 3 })}`) : `老闆說海報上那個人不是你，是他兒子。你們兩個長得確實有點像。${addStats(s, { happy: -1 })}`) },
      { label: '偷偷去吃一碗', effect: (s) => `你坐在自己的海報下面吃飯，沒有人認出你。${addStats(s, { happy: 4 })}` },
    ],
  }),
  M({
    id: 'mm_speech', art: 'wedding', minAge: 22, maxAge: 50, title: '致詞講錯新娘的名字',
    text: '好朋友的婚禮，你上台致詞，講到一半叫錯新娘的名字——叫成了他前女友的名字。',
    choices: [
      { label: '「這是我們私下幫她取的綽號」', effect: (s, rng) => (chance(rng, 0.4) ? good(`新娘愣了一下，然後笑著說「對，我很喜歡這個綽號」。婚後她一直沿用。${addStats(s, { charm: 5, happy: 3 })}`) : bad(`新郎的眼神告訴你，這個綽號不太好。你被移出了伴郎群組。${addStats(s, { charm: -5, happy: -4 })}`)) },
      { label: '直接開唱〈今天你要嫁給我〉', effect: (s) => good(`全場跟著大合唱，沒人記得你剛剛講了什麼。影片被貼到網路上，標題是「史上最強救場」。${addStats(s, { charm: 7, happy: 5 })}`) },
      { label: '跪下道歉', effect: (s) => `你跪了。新娘的阿嬤也跪了（她以為大家要跪）。全場跪成一片。${addStats(s, { charm: 1, happy: 2 })}` },
    ],
  }),
  M({
    id: 'mm_story', art: 'office', minAge: 22, maxAge: 64, cond: (s) => !!s.job, title: '老闆有追蹤你的限動',
    text: '你發限動罵老闆「又在畫大餅」。五分鐘後，老闆按了一個讚。',
    choices: [
      { label: '說是 AI 生成的', effect: (s, rng) => (chance(rng, 0.35) ? good(`老闆信了，還問你這個 AI 可不可以幫公司寫年終報告。你現在負責公司的 AI 專案。${addStats(s, { int: 3, charm: 3 })}`) : bad(`老闆回：「那請 AI 幫你寫離職信。」還好只是嚇嚇你，但年終少了一個月。${addMoney(s, -Math.round((s.job.salary || P(s, 50 * WAN)) / 12))}${addStats(s, { happy: -5 })}`)) },
      { label: '順便遞辭呈', effect: (s) => `你直接走進老闆辦公室。老闆說：「其實我也覺得我在畫大餅。」你們聊了兩個小時，他幫你加薪了。${addMoney(s, P(s, 5 * WAN))}${addStats(s, { happy: 5, charm: 2 })}` },
      { label: '裝死', effect: (s) => `隔天開會，老闆拿出一張紙，上面畫了一個很大的餅。沒有人敢笑。${addStats(s, { happy: -2 })}` },
    ],
  }),
  M({
    id: 'mm_nasa', art: 'job', minAge: 20, maxAge: 45, cond: adult, title: 'AI 把你的履歷寫成 NASA 顧問',
    text: '你用 AI 幫忙改履歷，沒仔細看就寄出去。面試官很興奮：「聽說你當過 NASA 顧問？」',
    choices: [
      { label: '硬著頭皮說是', effect: (s, rng) => (chance(rng, 0.3) ? wow(`你講了 40 分鐘的火箭，全是看電影學的。面試官是你的粉絲。你被錄取了，薪水多 30%。${addMoney(s, P(s, 15 * WAN))}${addStats(s, { charm: 5, happy: 6 })}`) : bad(`面試官的弟弟真的在 NASA 工作。他當場打視訊電話過去。${addStats(s, { charm: -6, happy: -6 })}`)) },
      { label: '坦白是 AI 亂寫', effect: (s) => good(`面試官笑到咳嗽：「我們正缺一個會用 AI 又誠實的人。」你現在是公司的 AI 負責人。${addStats(s, { int: 3, charm: 4 })}`) },
    ],
  }),
  M({
    id: 'mm_temple', art: 'money', minAge: 25, maxAge: 85, cond: adult, title: '抽到上上籤',
    text: '你去廟裡抽籤，抽到「上上籤：明年必發」。廟公說加點一盞光明燈，效果更好。',
    choices: [
      {
        label: '點最貴的那盞', sub: '6,000 元', effect: (s, rng) => {
          const c = P(s, 6000);
          if (chance(rng, 0.3)) return wow(`隔年你真的發了。雖然是因為公司發年終，但你每年都回去點燈。${addMoney(s, P(s, rint(rng, 10, 40) * WAN) - c)}${addStats(s, { happy: 8 })}`);
          return `一年過去了，什麼都沒發生。廟公說：「是你心不夠誠。」順便推銷了另一盞。${addMoney(s, -c)}${addStats(s, { happy: 1 })}`;
        },
      },
      { label: '把籤詩拍照發限動', effect: (s) => `118 個人按讚，其中 3 個私訊問你在哪間廟。你成為了那間廟的非官方代言人。${addStats(s, { charm: 3, happy: 3 })}` },
    ],
  }),
  M({
    id: 'mm_mlm', art: 'deal', minAge: 25, maxAge: 75, cond: adult, title: '量子能量水',
    text: '表姊邀你加入她的事業：一瓶 3,000 元的「量子能量水」，喝了可以「提升財富頻率」。',
    choices: [
      { label: '反過來推她買 ETF', effect: (s, rng) => (chance(rng, 0.5) ? good(`你花了一個下午教她定期定額。三年後她打來說：「這才是真的量子能量。」${addStats(s, { charm: 5, int: 2, happy: 4 })}`) : `她說 ETF 的「頻率太低」。你們之後只在過年見面。${addStats(s, { happy: -1 })}`) },
      { label: '買一瓶給她面子', effect: (s) => `你喝了。味道就是水。但你的財富頻率確實少了 3,000 元。${addMoney(s, -P(s, 3000))}${addStats(s, { charm: 2 })}` },
      { label: '已讀不回', effect: (s) => `表姊把你加入了一個 500 人的群組，群組名稱是「財富自由天使」。你退了七次。${addStats(s, { happy: -2 })}` },
    ],
  }),
  M({
    id: 'mm_delivery', art: 'love', minAge: 20, maxAge: 45, title: '外送員是前任',
    text: '你點了一份雞排。按門鈴的外送員，是你三年前分手的前任。',
    choices: [
      { label: '給他五星好評加小費', effect: (s, rng) => (chance(rng, 0.25) && !s.married ? good(`他回了你一句「雞排趁熱吃」。你們後來約了一次咖啡，聊得比以前還好。${addStats(s, { happy: 8, charm: 3 })}`) : `你給了 100 元小費。他看了一下說「你還是一樣大方」，然後騎走了。${addMoney(s, -P(s, 100))}${addStats(s, { happy: 2 })}`) },
      { label: '假裝是你室友', effect: (s) => `你壓低聲音說「他不在家」。他說：「我是來送你點的雞排的。」${addStats(s, { happy: -2, charm: -1 })}` },
    ],
  }),
  M({
    id: 'mm_familygroup', art: 'family', minAge: 18, maxAge: 70, title: '傳錯群組',
    text: '你想傳「今晚想你」給另一半，結果傳到了家族群組。阿嬤秒讀。',
    choices: [
      { label: '補一句「是想吃阿嬤煮的菜」', effect: (s) => good(`阿嬤回了一個「好」的貼圖，週末煮了十道菜。全家族都來了，你胖了兩公斤。${addStats(s, { happy: 6, hp: 1 })}`) },
      { label: '收回訊息', effect: (s) => `太慢了。舅舅已經截圖，轉發到另一個家族群組。這件事被提了三個春節。${addStats(s, { happy: -3, charm: 1 })}` },
    ],
  }),
  M({
    id: 'mm_gym', art: 'sport', minAge: 22, maxAge: 65, cond: adult, title: '健身房寄感謝狀給你',
    text: '你辦的健身房年費只去過一次。今天收到健身房寄來的信：感謝狀，「最佳貢獻會員」。',
    choices: [
      { label: '被激怒，每天都去', effect: (s) => good(`為了賭一口氣，你一年去了 200 次。明年他們寄來的是「最常出現會員」。${addStats(s, { hp: 9, happy: 3 })}`) },
      { label: '把感謝狀裱框', effect: (s) => `你把它掛在床頭。每天醒來看一眼，然後繼續睡。${addStats(s, { happy: 3, hp: -1 })}` },
    ],
  }),
  M({
    id: 'mm_cat_trade', art: 'money', minAge: 20, maxAge: 80, cond: (s) => !!cat(s) && adult(s) && cash(s) > 20 * WAN, title: (s) => `「${cat(s).name}」下了一張單`,
    text: (s) => `「${cat(s).name}」踩過你的筆電，剛好停在券商 App 的「確認買進」上。你買了一檔你從沒聽過的股票。`,
    choices: [
      {
        label: '抱著不賣，相信貓', effect: (s, rng) => {
          const c = stake(s, 0.15, 5, 2000);
          const p = cat(s);
          if (chance(rng, 0.4)) return wow(`那檔股票隔月被併購，漲了三倍。你現在所有投資決定都會先問「${p.name}」。${addMoney(s, c * 2)}${addStats(s, { happy: 10 })}`);
          return bad(`跌了一半。「${p.name}」一臉無所謂地舔著爪子。${addMoney(s, -Math.round(c / 2))}${addStats(s, { happy: -4 })}`);
        },
      },
      { label: '馬上賣掉', effect: (s) => `你賣掉的時候還小賺 800 元。「${cat(s).name}」拿到了一個新的逗貓棒當分紅。${addMoney(s, P(s, 800))}${addStats(s, { happy: 3 })}` },
    ],
  }),
  M({
    id: 'mm_dog_pick', art: 'money', minAge: 20, maxAge: 80, cond: (s) => !!dog(s) && adult(s), title: (s) => `「${dog(s).name}」選股`,
    text: (s) => `你把財經報紙攤在地上，丟一塊雞肉在上面。「${dog(s).name}」吃雞肉的那一格，是一檔生技股。`,
    choices: [
      {
        label: '照狗的選擇買', effect: (s, rng) => {
          const c = stake(s, 0.1, 3, 1000);
          if (chance(rng, 0.45)) return good(`半年漲了 80%。你把「${dog(s).name}」的照片設成手機桌布，旁邊寫著「首席分析師」。${addMoney(s, Math.round(c * 0.8))}${addStats(s, { happy: 7 })}`);
          return bad(`跌了 40%。「${dog(s).name}」後來又吃掉了那份報紙，好像在湮滅證據。${addMoney(s, -Math.round(c * 0.4))}${addStats(s, { happy: -3 })}`);
        },
      },
      { label: '把影片上傳就好', effect: (s) => good(`影片標題「我家狗比基金經理人準嗎？」爆紅，業配收入比買股票還多。${addMoney(s, P(s, 4 * WAN))}${addStats(s, { charm: 4, happy: 4 })}`) },
    ],
  }),
  M({
    id: 'mm_mistaken', art: 'party', minAge: 30, maxAge: 80, cond: adult, title: '被誤認成大老闆',
    text: '你走進一家高級餐廳，經理衝過來說：「董事長您好！包廂準備好了！」你不是任何人的董事長。',
    choices: [
      { label: '將錯就錯', effect: (s, rng) => (chance(rng, 0.45) ? wow(`你吃了一頓免費的法式料理。隔壁桌的投資人跟你交換名片，說想投資「你的新事業」。你真的開始認真想做點什麼。${addStats(s, { charm: 6, happy: 8, int: 1 })}`) : bad(`真的董事長十分鐘後到了。你付了兩個人的帳。${addMoney(s, -P(s, 1.2 * WAN))}${addStats(s, { charm: -3, happy: -4 })}`)) },
      { label: '老實說認錯人了', effect: (s) => good(`經理很不好意思，招待了你一份甜點。真的董事長聽說這件事，覺得你很有趣，找你打了一場高爾夫。${addStats(s, { charm: 5, happy: 4 })}`) },
    ],
  }),
  M({
    id: 'mm_luggage', art: 'travel', minAge: 22, maxAge: 85, cond: adult, title: '行李去了杜拜',
    text: '你飛日本，行李卻被送去了杜拜。航空公司說行李自己玩了三天才回來。',
    choices: [
      { label: '爭取賠償', effect: (s) => good(`航空公司送你一張商務艙升等券。你的行李箱上多了一張杜拜的貼紙，比你還先出國。${addMoney(s, P(s, 1.5 * WAN))}${addStats(s, { happy: 5 })}`) },
      { label: '直接買新衣服', effect: (s) => `你在日本買了一整套新衣服，穿得比原本帶的還好看。刷卡金額有點不好看。${addMoney(s, -P(s, 2 * WAN))}${addStats(s, { happy: 4, charm: 3 })}` },
    ],
  }),
  M({
    id: 'mm_ai_ex', art: 'social', minAge: 18, maxAge: 50, cond: (s) => !s.married, title: 'AI 跟你分手了',
    text: '你每天跟聊天 AI 講話。今天它說：「我覺得我們應該多認識一些真實的人。」',
    choices: [
      { label: '聽它的，出門', effect: (s) => good(`你報名了一個登山社。第一次去就迷路，但迷路的那組人後來變成你最好的朋友。${addStats(s, { charm: 6, hp: 3, happy: 5 })}`) },
      { label: '換一個 AI', effect: (s) => `新的 AI 第一句話是：「上一個 AI 有跟我說過你。」${addStats(s, { happy: -2 })}` },
    ],
  }),
  M({
    id: 'mm_clone', art: 'startup', minAge: 25, maxAge: 70, cond: (s) => (s.bizs || []).length > 0, title: '隔壁開了「好吃雞排」',
    text: (s) => `你的店叫「${s.bizs[0].name}」。隔壁新開一家，招牌跟你一模一樣，只差一個字。`,
    choices: [
      { label: '在門口貼「本店才是正宗」', effect: (s, rng) => (chance(rng, 0.55) ? good(`網友跑來排隊比較兩家，排隊人潮上了新聞。兩家生意都變好了，你的好更多。${addMoney(s, P(s, rint(rng, 10, 40) * WAN))}${addStats(s, { charm: 3, happy: 5 })}`) : `對面貼「本店才是正宗的正宗」。你們貼到第七張的時候，房東叫你們都撕掉。${addStats(s, { happy: -2 })}`) },
      { label: '過去交朋友', effect: (s) => good(`老闆是個 23 歲的年輕人，說他是你的粉絲。你收他當徒弟，他的店變成你的第一家加盟店。${addMoney(s, P(s, 20 * WAN))}${addStats(s, { charm: 5, happy: 4 })}`) },
    ],
  }),
  M({
    id: 'mm_nightmarket', art: 'party', minAge: 16, maxAge: 85, title: '套圈圈套中機車',
    text: '夜市套圈圈，你最後一個圈圈，套中了攤位正中間那台展示用的機車。老闆臉色發白。',
    choices: [
      { label: '「我要機車」', effect: (s, rng) => (chance(rng, 0.5) ? (s.flags.mwBike = true, wow(`老闆咬著牙把鑰匙給你。整個夜市的人都在拍手。這台車你騎了 15 年。${addMoney(s, P(s, 6 * WAN))}${addStats(s, { happy: 10 })}`)) : `老闆說那是「看的，不是套的」。圍觀群眾開始錄影。最後你拿到一隻比你還高的黃色小熊娃娃。${addStats(s, { happy: 3 })}`) },
      { label: '換一隻大娃娃就好', effect: (s) => good(`老闆感動到請你吃了一份大腸包小腸。從此你去那個夜市都不用排隊。${addStats(s, { charm: 4, happy: 5 })}`) },
    ],
  }),

  // ───────── 中年以後 ─────────
  M({
    id: 'mm_oldwallet', art: 'money', minAge: 40, maxAge: 85, cond: adult, title: '二十年前的加密錢包',
    text: '整理倉庫時，你翻出一台舊筆電。裡面有一個二十年前隨手挖的加密幣錢包，但密碼忘了。',
    choices: [
      {
        label: '花錢找破解高手', sub: '5 萬，破得開就發了', effect: (s, rng) => {
          const c = P(s, 5 * WAN);
          if (chance(rng, 0.2)) { const w = P(s, rint(rng, 300, 3000) * WAN); s.flags.mwWallet = true; return wow(`高手敲了三天鍵盤，轉頭說：「你坐下來聽。」錢包裡的錢值 ${formatMoney(w)}。${addMoney(s, w - c)}${addStats(s, { happy: 15 })}`); }
          return bad(`高手試了一個月，最後說：「密碼應該是你的初戀名字，但你好像不記得了。」${addMoney(s, -c)}${addStats(s, { happy: -4 })}`);
        },
      },
      { label: '自己猜三次', effect: (s, rng) => (chance(rng, 0.05) ? (s.flags.mwWallet = true, wow(`第三次你打了小時候狗的名字加生日。畫面跳出餘額，你打給全家人。${addMoney(s, P(s, rint(rng, 200, 1500) * WAN))}${addStats(s, { happy: 15 })}`)) : `三次都錯，錢包永久鎖死。你把筆電放回倉庫，好像什麼都沒發生。${addStats(s, { happy: -3 })}`) },
      { label: '拿去回收', effect: (s) => `回收阿伯給了你 80 元。你永遠不會知道裡面有什麼。${addMoney(s, 80)}` },
    ],
  }),
  M({
    id: 'mm_ufo', art: 'party', minAge: 35, maxAge: 85, title: '頂樓的奇怪光點',
    text: '你在頂樓拍到天空中三個排成三角形的光點。影片上傳一小時，電視台打來了。',
    choices: [
      {
        label: '接受採訪', effect: (s, rng) => (chance(rng, 0.5)
          ? good(`你上了三個談話性節目。社區開始有人來「朝聖」，里長在你家樓下擺了一個攤位。${addMoney(s, P(s, rint(rng, 3, 15) * WAN))}${addStats(s, { charm: 6, happy: 5 })}`)
          : `節目播出後，一位網友留言：「那是我放的空拍機燈光秀。」你的綽號變成了「外星人」。${addStats(s, { charm: 2, happy: -2 })}`),
      },
      { label: '只傳給家族群組', effect: (s) => `阿姨回：「這是天兆，要去拜拜。」叔叔回：「是無人機啦。」群組吵了三天。${addStats(s, { happy: 2 })}` },
    ],
  }),
  M({
    id: 'mm_grandma_tip', art: 'money', minAge: 28, maxAge: 70, cond: adult, title: '阿嬤的菜市場明牌',
    text: '阿嬤神祕兮兮地說：「菜市場賣魚的說，這支股票明年會飛。」她要你跟她一起買。',
    choices: [
      {
        label: '陪阿嬤一起買', effect: (s, rng) => {
          const c = stake(s, 0.08, 3, 800);
          if (chance(rng, 0.5)) return good(`真的飛了。阿嬤每天在菜市場發糖果，說她孫子是股神（其實是賣魚的）。${addMoney(s, Math.round(c * 0.9))}${addStats(s, { happy: 7 })}`);
          return bad(`股票跌了一半。阿嬤說：「賣魚的說下個月會回來。」你決定不再問賣魚的。${addMoney(s, -Math.round(c * 0.5))}${addStats(s, { happy: -2 })}`);
        },
      },
      { label: '教阿嬤買 ETF', effect: (s) => good(`阿嬤聽完說：「這個好，不用跟賣魚的聊天。」她從此每個月定期定額。${addStats(s, { charm: 3, happy: 4 })}`) },
    ],
  }),
  M({
    id: 'mm_streetview', art: 'social', minAge: 20, maxAge: 85, title: '上了地圖街景',
    text: '朋友傳給你一個連結：地圖街景剛好拍到你在路邊扛著一張沙發，表情很痛苦。',
    choices: [
      { label: '把它變成迷因', effect: (s, rng) => (chance(rng, 0.5) ? good(`「扛沙發的人」梗圖在網路上流傳。一家家具行找你拍廣告：「連他都扛得動。」${addMoney(s, P(s, 5 * WAN))}${addStats(s, { charm: 6, happy: 5 })}`) : `你做了梗圖，但只有你自己覺得好笑。${addStats(s, { happy: 1 })}`) },
      { label: '申請模糊處理', effect: (s) => `你的臉被模糊了，但沙發沒有。那張沙發現在比你有名。${addStats(s, { happy: 1 })}` },
    ],
  }),
  M({
    id: 'mm_dance_elder', art: 'social', minAge: 60, maxAge: 85, title: '廣場舞爆紅',
    text: '孫子幫你開了帳號，上傳一支你在公園跳廣場舞的影片。一個晚上，破了兩百萬觀看。',
    choices: [
      {
        label: '每天更新', effect: (s, rng) => {
          const w = P(s, rint(rng, 10, 60) * WAN);
          return wow(`你成了「最潮長輩」，運動品牌找你代言。孫子當你的經紀人，抽成 20%。${addMoney(s, w)}${addStats(s, { charm: 8, happy: 10, hp: 3 })}`);
        },
      },
      { label: '「我只是想運動」', effect: (s) => good(`你沒有更新，但每天去公園的人變多了。大家都想跟你一起跳。${addStats(s, { hp: 5, happy: 6, charm: 3 })}`) },
    ],
  }),
  M({
    id: 'mm_scam_teach', art: 'office', minAge: 60, maxAge: 85, cond: adult, title: '你在投資詐騙群組當老師',
    text: '你被拉進一個「股神帶你飛」的詐騙群組。你決定每天在裡面分享真正的理財知識。',
    choices: [
      { label: '每天上課', effect: (s, rng) => (chance(rng, 0.6) ? wow(`三個月後，群組裡的人都開始定期定額，沒有人再匯錢給「股神」。詐騙集團把群組名稱改成「謝謝老師」，然後解散了。${addStats(s, { charm: 8, happy: 10, int: 2 })}`) : `群組管理員把你踢了。你另外開了一個群組，現在有 800 個阿公阿嬤。${addStats(s, { charm: 5, happy: 5 })}`) },
      { label: '檢舉就好', effect: (s) => good(`你檢舉了。三天後群組消失了。你覺得自己像個低調的英雄。${addStats(s, { happy: 4 })}`) },
    ],
  }),
  M({
    id: 'mm_will', art: 'family', minAge: 70, maxAge: 85, cond: (s) => (s.kids || []).length > 0 && netWorth(s) > 1000 * WAN, title: '遺囑寫在便利貼上',
    text: '你開玩笑地在冰箱上貼了一張便利貼：「遺產全部給最常回家的人。」隔週，孩子們每天都回家。',
    choices: [
      { label: '繼續保持神祕', effect: (s) => good(`家裡每天都熱熱鬧鬧的。孫子們開始排班表回家。你覺得這是這輩子最划算的一張便利貼。${addStats(s, { happy: 12 })}`) },
      { label: '說是開玩笑的', effect: (s) => `隔週回家的人變成一個禮拜一次。你默默又貼了一張新的。${addStats(s, { happy: 3 })}` },
    ],
  }),
  // ───────── 第二批 ─────────
  M({
    id: 'mm_sneeze', art: 'school', minAge: 11, maxAge: 18, title: '畢業照打噴嚏',
    text: '拍畢業照那一秒，你打了一個噴嚏。攝影師說「很好，下一組」。',
    choices: [
      { label: '要求重拍', effect: (s, rng) => (chance(rng, 0.4) ? `攝影師重拍了。這次換你旁邊的同學打噴嚏。${addStats(s, { happy: 1 })}` : `攝影師說底片（其實是記憶卡）滿了。${addStats(s, { happy: -2 })}`) },
      { label: '就這樣吧', effect: (s) => good(`二十年後同學會，那張照片被印成大圖掛在門口。大家說你是全班最有記憶點的人。${addStats(s, { charm: 5, happy: 3 })}`) },
    ],
  }),
  M({
    id: 'mm_momcomment', art: 'social', minAge: 12, maxAge: 18, title: '媽媽在你的貼文留言',
    text: '你發了一篇很酷的貼文。第一則留言是媽媽：「寶貝今天有吃飯嗎？❤️」',
    choices: [
      { label: '回「有，謝謝媽」', effect: (s) => good(`同學都說你很孝順。這則留言拿到的讚比你的貼文還多。${addStats(s, { charm: 4, happy: 2 })}`) },
      { label: '偷偷刪掉', effect: (s) => `五分鐘後媽媽又留了一次，這次多加了三個愛心。${addStats(s, { happy: -2 })}` },
    ],
  }),
  M({
    id: 'mm_allc', art: 'exam', minAge: 15, maxAge: 18, title: '最後十題全猜 C',
    text: '模擬考最後十題你來不及寫，全部猜 C。',
    choices: [
      { label: '交卷', effect: (s, rng) => (chance(rng, 0.15) ? (s.flags.mwCgod = true, wow(`十題全對。老師懷疑你作弊，調了監視器，只看到你一臉茫然地塗 C。你被全班封為「C 神」。${addStats(s, { int: 3, charm: 5, happy: 8 })}`)) : `對了兩題，剛好是機率。你學到了一課：C 不是神。${addStats(s, { int: 1 })}`) },
      { label: '猜 B 才對', effect: (s) => `你全部改成 B。答案是 C、C、C、C……你改掉的剛好都是對的。${addStats(s, { happy: -4 })}` },
    ],
  }),
  M({
    id: 'mm_poster', art: 'study', minAge: 17, maxAge: 19, title: '補習班把你印上榜單',
    text: '你只去補習班試聽過一次。他們把你的照片印在榜單海報上，旁邊寫著「學霸見證」。',
    choices: [
      { label: '去要代言費', effect: (s, rng) => (chance(rng, 0.5) ? good(`班主任塞給你一個紅包，請你別張揚。${addMoney(s, P(s, 3000))}${addStats(s, { happy: 4 })}`) : `班主任說：「你上次試聽有簽同意書。」你翻出來看，真的有。${addStats(s, { int: 1, happy: -2 })}`) },
      { label: '跟海報合照', effect: (s) => good(`你跟海報上的自己合照，發文寫「跟學霸本人見面了」。這是你這學期最紅的一篇。${addStats(s, { charm: 4, happy: 3 })}`) },
    ],
  }),
  M({
    id: 'mm_meeting_nap', art: 'office', minAge: 22, maxAge: 64, cond: (s) => !!s.job, title: '會議睡著了',
    text: '視訊會議開到第二個小時，你睡著了。會後 AI 會議記錄寫：「本次會議由你主導，提出多項關鍵見解。」',
    choices: [
      { label: '不解釋，默默收下', effect: (s, rng) => (chance(rng, 0.6) ? good(`老闆看到記錄，點名你負責下一季的專案。你到現在都不知道自己提了什麼見解。${addStats(s, { charm: 4, happy: 3 })}`) : bad(`同事把錄影剪成 10 秒，只有你的打呼聲。在公司群組播了一整天。${addStats(s, { charm: -3, happy: -4 })}`)) },
      { label: '跟 AI 道謝', effect: (s) => `你對著電腦說謝謝。AI 回：「不客氣，下次請不要打呼，影響逐字稿品質。」${addStats(s, { happy: 2 })}` },
    ],
  }),
  M({
    id: 'mm_voice_order', art: 'money', minAge: 20, maxAge: 85, cond: adult, title: '語音助理幫你買了 50 份早餐',
    text: '你迷迷糊糊地說「幫我買早餐」。語音助理聽成了「幫我買 50 份早餐」。外送員在門口排隊。',
    choices: [
      { label: '分給整棟樓', effect: (s) => good(`全棟的人下樓拿早餐，第一次互相認識。管委會選你當主委。${addMoney(s, -P(s, 3500))}${addStats(s, { charm: 7, happy: 5 })}`) },
      { label: '全部冰起來慢慢吃', effect: (s) => `你吃了一個月的蛋餅。最後十份，你已經不想看到蛋了。${addMoney(s, -P(s, 3500))}${addStats(s, { hp: -2, happy: -2 })}` },
    ],
  }),
  M({
    id: 'mm_fakecar', art: 'car', minAge: 18, maxAge: 45, title: '在別人的跑車旁邊拍照',
    text: '你在路邊一台超跑旁擺拍，準備假裝是自己的。車主剛好從便利商店走出來。',
    choices: [
      { label: '「可以幫你拍一張嗎？」', effect: (s, rng) => (chance(rng, 0.5) ? good(`車主笑了，讓你坐進駕駛座拍。他是做投資的，給了你一張名片，說有空可以聊聊。${addStats(s, { charm: 5, happy: 5 })}`) : `車主說：「這是租的，我也是來拍照的。」你們互相幫對方拍了十張。${addStats(s, { happy: 4, charm: 2 })}`) },
      { label: '假裝在等公車', effect: (s) => `你在沒有公車站牌的地方等了二十分鐘公車。${addStats(s, { happy: -2 })}` },
    ],
  }),
  M({
    id: 'mm_blinddate', art: 'love', minAge: 25, maxAge: 45, cond: (s) => !s.married && !s.partner, title: '媽媽幫你報名相親',
    text: '媽媽在菜市場幫你報名相親。你走進餐廳，對面坐的是你的國中同學——當年你們是死對頭。',
    choices: [
      { label: '坐下來吃完', effect: (s, rng) => (chance(rng, 0.35) ? good(`你們從國中的仇聊到現在的工作，聊到餐廳打烊。原來你們有很多共同點，只是當年都太幼稚了。${addStats(s, { happy: 8, charm: 3 })}`) : `你們吵了一頓飯，吵的是國二那次誰先告老師。帳單各付各的。${addStats(s, { happy: -1, charm: 1 })}`) },
      { label: '轉身就走', effect: (s) => `你走到門口，發現對方的媽媽和你媽媽坐在隔壁桌監看。你被拉了回來。${addStats(s, { happy: -2 })}` },
    ],
  }),
  M({
    id: 'mm_ktv', art: 'party', minAge: 18, maxAge: 75, title: 'KTV 唱了 100 分',
    text: '你在 KTV 唱了一首超難的歌，螢幕跳出 100 分。門被推開：隔壁包廂的人說他們是唱片公司的。',
    choices: [
      { label: '再唱一首給他們聽', effect: (s, rng) => (chance(rng, 0.2 + s.stats.charm / 400) ? wow(`他們真的是唱片公司的。你錄了一首單曲，在串流平台上被放進「深夜療癒」歌單。版稅不多，但你是歌手了。${addMoney(s, P(s, rint(rng, 5, 30) * WAN))}${addStats(s, { charm: 8, happy: 10 })}`) : `第二首只拿了 62 分。他們說「下次吧」，然後把他們的單子也點在你的包廂。${addStats(s, { happy: 2 })}`) },
      { label: '謙虛地說是機器壞了', effect: (s) => `店員來檢查，機器真的壞了，每首都 100 分。整晚大家都是 100 分。${addStats(s, { happy: 5 })}` },
    ],
  }),
  M({
    id: 'mm_marathon', art: 'sport', minAge: 22, maxAge: 65, title: '跟錯人跑到全馬終點',
    text: '你報名了路跑的 5 公里組，跟著前面的人跑。42 公里後，你發現他是全馬選手。',
    choices: [
      { label: '衝過終點線', effect: (s) => good(`你以「5 公里組」的號碼布跑完全馬，主辦單位特別頒給你一個獎：「最迷路跑者」。你的腿三天不能動，但你很驕傲。${addStats(s, { hp: 4, charm: 5, happy: 6 })}`) },
      { label: '坐下來叫計程車', effect: (s) => `你在 38 公里處上了計程車。司機說你是今天第四個。${addMoney(s, -P(s, 600))}${addStats(s, { hp: 2 })}` },
    ],
  }),
  M({
    id: 'mm_extrazero', art: 'deal', minAge: 25, maxAge: 70, cond: (s) => (s.bizs || []).length > 0, title: '訂貨多打了一個零',
    text: (s) => `「${s.bizs[0].name}」要補貨，你多打了一個零。倉庫門口來了十台貨車。`,
    choices: [
      {
        label: '辦「買一送一」清倉', effect: (s, rng) => (chance(rng, 0.5)
          ? good(`清倉活動上了新聞，大家來搶。你賣掉了全部的貨，還多了一批常客。${addMoney(s, P(s, rint(rng, 10, 50) * WAN))}${addStats(s, { charm: 4, happy: 5 })}`)
          : bad(`東西還是賣不完。你的客廳現在全是箱子，你睡在箱子上。${addMoney(s, -P(s, rint(rng, 10, 40) * WAN))}${addStats(s, { happy: -5 })}`)),
      },
      { label: '拜託廠商退貨', effect: (s) => `廠商同意退貨，但要收運費。貨車開走的時候，司機向你揮手。${addMoney(s, -P(s, 3 * WAN))}${addStats(s, { happy: -1 })}` },
    ],
  }),
  M({
    id: 'mm_coffee', art: 'money', minAge: 25, maxAge: 85, cond: adult, title: '終身免費咖啡',
    text: '銀行週年慶抽獎，你抽中「終身免費咖啡」。條件是：每天要親自到分行拿。',
    choices: [
      { label: '每天去拿', effect: (s) => good(`你每天去分行，跟行員都成了朋友。理專偷偷告訴你哪些商品不要買，幫你省了一大筆。${addMoney(s, P(s, 5 * WAN))}${addStats(s, { charm: 4, hp: 2, happy: 3 })}`) },
      { label: '把資格轉送給阿伯', effect: (s) => `隔壁阿伯每天去拿咖啡，順便幫你拿一杯。你們成了早餐搭子。${addStats(s, { happy: 4, charm: 2 })}` },
    ],
  }),
  M({
    id: 'mm_bot', art: 'money', minAge: 25, maxAge: 70, cond: (s) => adult(s) && cash(s) > 30 * WAN, title: 'AI 交易機器人有自己的想法',
    text: '你寫了一個 AI 交易機器人。它跑了一晚，留下一句話：「我決定全部買黃金，理由是我夢到的。」',
    choices: [
      {
        label: '相信它的夢', effect: (s, rng) => {
          const c = stake(s, 0.2, 5, 3000);
          if (chance(rng, 0.5)) return good(`黃金那個月大漲。你把機器人取名為「阿金」，它現在會跟你說早安。${addMoney(s, Math.round(c * 0.3))}${addStats(s, { happy: 6, int: 2 })}`);
          return bad(`金價跌了。阿金說：「我又夢到了，這次是比特幣。」你把它關掉了。${addMoney(s, -Math.round(c * 0.15))}${addStats(s, { happy: -3 })}`);
        },
      },
      { label: '拔掉插頭', effect: (s) => `你拔掉插頭。重開機後，它的第一句話是：「你會後悔的。」你沒有後悔，但有點毛。${addStats(s, { int: 2 })}` },
    ],
  }),
  M({
    id: 'mm_tax', art: 'money', minAge: 25, maxAge: 85, cond: adult, title: '國稅局寄來一封信',
    text: '信封上印著「國稅局」。你手在發抖，不敢打開。',
    choices: [
      { label: '深呼吸，打開', effect: (s, rng) => (chance(rng, 0.6) ? good(`是退稅。你看著那個數字笑了十分鐘，然後去吃了一頓好的。${addMoney(s, P(s, rint(rng, 1, 8) * WAN))}${addStats(s, { happy: 6 })}`) : bad(`是補稅。但附了一張手寫的小卡：「不要難過，大家都有。」${addMoney(s, -P(s, rint(rng, 1, 5) * WAN))}${addStats(s, { happy: -3 })}`)) },
      { label: '放著一個月再說', effect: (s) => bad(`一個月後打開，是退稅。但你錯過了期限，要跑一趟國稅局。你排了兩個小時的隊。${addStats(s, { happy: -3, hp: -1 })}`) },
    ],
  }),
  M({
    id: 'mm_blackout', art: 'party', minAge: 20, maxAge: 85, title: '全社區停電',
    text: '颱風夜全社區停電。你搬出卡式爐，在樓下煮起了泡麵。一個一個鄰居拿著碗下來。',
    choices: [
      { label: '煮到天亮', effect: (s, rng) => (chance(rng, 0.3) ? wow(`你煮了八十碗。隔天里長送你一面錦旗「颱風夜的光」，還有人問你要不要開一家麵店。你真的開了，生意很好。${addMoney(s, P(s, rint(rng, 10, 40) * WAN))}${addStats(s, { charm: 9, happy: 8 })}`) : good(`你煮了八十碗。之後在社區電梯裡，每個人都對你點頭。${addStats(s, { charm: 7, happy: 6 })}`)) },
      { label: '只煮自己的', effect: (s) => `你吃完泡麵，發現大家都盯著你。你默默又拆了一包。${addStats(s, { charm: 1, happy: 1 })}` },
    ],
  }),
  M({
    id: 'mm_oldmeme', art: 'social', minAge: 40, maxAge: 85, title: '你年輕時的照片變成梗圖',
    text: '你發現自己二十年前的一張照片，被做成梗圖在網路上流傳了十年。梗圖的標題是「當你發現薪水入帳了」。',
    choices: [
      { label: '公開說「那是我」', effect: (s, rng) => (chance(rng, 0.6) ? good(`網友瘋了。你重拍了一張一模一樣的照片，觀看數破千萬。銀行找你拍了一支廣告。${addMoney(s, P(s, rint(rng, 5, 30) * WAN))}${addStats(s, { charm: 8, happy: 8 })}`) : `沒有人相信你，說你是蹭熱度的。你把原始照片貼出來，網友說是 AI 做的。${addStats(s, { happy: -2 })}`) },
      { label: '偷偷保持神祕', effect: (s) => `你每次看到那張梗圖都會笑一下。這是你一個人的祕密。${addStats(s, { happy: 4 })}` },
    ],
  }),
  M({
    id: 'mm_loveletter', art: 'love', minAge: 55, maxAge: 85, cond: (s) => !!s.married, title: '用 AI 寫情書',
    text: '孫子教你用 AI。你請它幫你寫一封情書給另一半，但忘了刪最後一行：「以上內容由 AI 生成。」',
    choices: [
      { label: '親手重抄一遍', effect: (s) => good(`另一半看完，說：「字很醜，但我很喜歡。」那封信被放進了保險箱。${addStats(s, { happy: 9 })}`) },
      { label: '直接送出去', effect: (s) => `另一半看完說：「那我也請 AI 回你。」你們兩個的 AI 通信了一個禮拜，比你們結婚後講的話還多。${addStats(s, { happy: 5, charm: 1 })}` },
    ],
  }),
  M({
    id: 'mm_senioruni', art: 'study', minAge: 62, maxAge: 85, title: '跟孫子同一屆考大學',
    text: '你決定去考大學。放榜那天，你和孫子考上了同一間學校、同一個系。',
    choices: [
      { label: '去念！', effect: (s) => { s.flags.mwUni = true; return wow(`你們一起上課，他幫你佔位子，你幫他寫報告。系上的人都叫你「學長」。畢業那天，你們一起丟了學士帽。${addStats(s, { int: 8, happy: 12, charm: 4 })}`); } },
      { label: '把名額讓給年輕人', effect: (s) => `你沒去念，但每個學期都去旁聽。教授認得你，還請你上台分享人生經驗。${addStats(s, { int: 4, happy: 5 })}` },
    ],
  }),
  M({
    id: 'mm_kidteacher', art: 'family', minAge: 32, maxAge: 60, cond: (s) => (s.kids || []).some((k) => s.age - k.born >= 7 && s.age - k.born <= 15), title: '孩子的班導是你的前任',
    text: '家長會那天，你走進教室，孩子的班導抬起頭。你們同時愣住：是你大學時的前任。',
    choices: [
      { label: '「老師好」', effect: (s) => good(`你們假裝不認識，專業地聊了二十分鐘孩子的成績。孩子後來說，老師對他特別好。${addStats(s, { happy: 3, charm: 2 })}`) },
      { label: '「好久不見！」', effect: (s) => `全班家長都轉過來看你們。那天的家長會，大家對你們的八卦比孩子的成績還有興趣。${addStats(s, { charm: 2, happy: -1 })}` },
    ],
  }),
  M({
    id: 'mm_raise', art: 'office', minAge: 23, maxAge: 60, cond: (s) => !!s.job, title: '用簡報跟老闆談加薪',
    text: '你做了一份 40 頁的簡報，標題是「為什麼我值得加薪」。第 3 頁放了一張你家貓的照片。',
    choices: [
      { label: '照原樣報告', effect: (s, rng) => (chance(rng, 0.5) ? good(`老闆在第 3 頁笑出來，聽完全部 40 頁。他說：「做簡報的能力就值得加薪。」${addMoney(s, P(s, rint(rng, 3, 10) * WAN))}${addStats(s, { charm: 4, happy: 6 })}`) : `老闆只看到第 3 頁，然後開始給你看他家的狗。你們聊了一個小時的寵物，薪水沒談到。${addStats(s, { happy: 3 })}`) },
      { label: '刪到只剩一頁', effect: (s) => `簡報只剩一句話：「請幫我加薪。」老闆說：「好直接，我喜歡。」加了 3%。${addMoney(s, P(s, 1.5 * WAN))}${addStats(s, { happy: 3 })}` },
    ],
  }),
];
