// 社團的後續：籃球、科研、熱舞、演辯、電競，每一條都有機會一路練上去變成職業，
// 年薪有機會超過醫生、律師這種高薪職業，但也各有各的代價。
// （熱門音樂社的後續在 events_school.js 的 BAND_EVENTS）
import { addStats, chance, formatMoney, rint, WAN } from './utils.js';
import { addPoints, addSkill } from './actions.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });
const P = (s, v) => Math.round(v * s.priceIndex);
const inSchool = (s) => s.studying;
const club = (id) => (s) => s.flags.club === id;
const jobIs = (s, id) => !!(s.job && s.job.id === id);
// 簽約出道：下一步由引擎把它變成真正的工作
const sign = (s, id, name, mult = 1) => { s.flags.proSign = { id, name, mult }; };
// 爆紅／奪冠：直接把現在這份工作的年薪往上翻
const boost = (s, x, name) => {
  if (!s.job) return '';
  s.job.salary = Math.round(s.job.salary * x);
  if (name) { s.job.name = name; s.careers.push(name); }
  return `年薪變成 ${formatMoney(s.job.salary)}。`;
};
const wasA = (s, id) => (s.jobIds || []).includes(id);

export const CLUB_EVENTS = [
  // ═════════ 🏀 籃球隊：校隊 → HBL → 選秀 → 職籃 ═════════
  {
    id: 'bb_team', minAge: 13, maxAge: 17, weight: 30,
    cond: (s) => inSchool(s) && club('ball')(s) && !s.flags.ball,
    title: '校隊選拔',
    text: '體育老師把你留下來：「下學期校隊要補人，你要不要試試看？練球很硬，早上六點就要到。」',
    choices: [
      {
        odds: (s) => Math.min(0.95, 0.4 + s.stats.hp / 200), label: '去試選拔', sub: '健康↑↑，會很累',
        effect: (s, rng) => (chance(rng, 0.4 + s.stats.hp / 200)
          ? (() => { s.flags.ball = 1; return good(`你在最後一輪的折返跑撐到最後，教練把球衣丟給你。${addStats(s, { hp: 8, charm: 4, int: -2, happy: 4 })}`); })()
          : `你在最後一關被刷掉了，但教練說明年再來。${addStats(s, { hp: 4, happy: -4 })}`),
      },
      { label: '打好玩的就好', sub: '快樂↑', effect: (s) => `你留在社團打鬥牛，週末跟同學約球場。${addStats(s, { hp: 3, happy: 4 })}` },
    ],
  },
  {
    id: 'bb_hbl', minAge: 15, maxAge: 20, weight: 34,
    cond: (s) => s.flags.ball === 1 && inSchool(s),
    title: 'HBL 甲級聯賽',
    text: '你們打進了全國八強，對手是連三年冠軍。最後一節你被換上場。',
    choices: [
      {
        odds: (s) => Math.min(0.9, 0.3 + s.stats.hp / 230 + s.stats.charm / 600), label: '要球，自己來', sub: '打出來就有球探注意',
        effect: (s, rng) => {
          if (chance(rng, 0.3 + s.stats.hp / 230 + s.stats.charm / 600)) {
            s.flags.ball = 2;
            addPoints(s, 2, 'HBL 打出名號');
            return good(`最後 8 秒你切進去加罰，全場尖叫。隔天體育版有你的名字，開始有球探跑來看你的比賽。${addStats(s, { hp: 6, charm: 10, happy: 10 })}`);
          }
          return `你連續兩次失誤，球隊輸了 6 分。你在休息室坐到燈關掉。${addStats(s, { hp: 3, happy: -7 })}`;
        },
      },
      { label: '穩穩傳球就好', sub: '不出錯', effect: (s) => `你把球交給學長，球隊還是輸了，但沒有人怪你。${addStats(s, { hp: 3, charm: 2 })}` },
    ],
  },
  {
    id: 'bb_draft', minAge: 18, maxAge: 26, weight: 44, once: true,
    cond: (s) => s.flags.ball >= 1 && !jobIs(s, 'probball'),
    title: '職籃選秀',
    text: (s) => `職籃球團的球探問你要不要投入選秀。合約談成的話，第一年年薪大約 ${formatMoney(P(s, 110 * WAN))}，但職業球員吃的是身體，打到三十幾歲就要想下一步。`,
    choices: [
      {
        odds: (s) => Math.min(0.9, (s.flags.ball >= 2 ? 0.4 : 0.15) + s.stats.hp / 200), label: '投入選秀', sub: '高薪，但靠身體吃飯',
        effect: (s, rng) => {
          if (chance(rng, (s.flags.ball >= 2 ? 0.4 : 0.15) + s.stats.hp / 200)) {
            s.flags.ball = 3;
            sign(s, 'probball', '職業籃球員');
            addPoints(s, 3, '進入職籃');
            return good(`你在第一輪被選走。球團帽子戴上去的那一刻，媽媽在台下哭了。${addStats(s, { happy: 14, charm: 8 })}`);
          }
          return `你落選了。乙組球隊要你，薪水只有一半，你決定先去工作、晚上繼續打球。${addStats(s, { happy: -8, hp: 2 })}`;
        },
      },
      { label: '放棄，走正常路', sub: '去找一般工作', effect: (s) => { s.flags.ball = 0; return `你把球衣收進櫃子。很多年後你還是會在球場邊站很久。${addStats(s, { happy: -5, int: 3 })}`; } },
    ],
  },
  {
    id: 'bb_season', minAge: 19, maxAge: 36, weight: 18,
    cond: (s) => jobIs(s, 'probball'),
    title: '球季開打',
    text: '一個球季三十幾場，加上客場移動，一年有一半時間在外面。',
    choices: [
      { label: '拚先發', sub: '有機會加薪，健康↓', effect: (s, rng) => (chance(rng, 0.5 + s.stats.hp / 300) ? good(`你打進先發五人，球團加薪。${boost(s, 1.35)}${addStats(s, { hp: -4, happy: 6, charm: 4 })}`) : `你大部分時間坐板凳，球季結束前只上場十幾分鐘。${addStats(s, { hp: -2, happy: -6 })}`) },
      { label: '穩穩打，顧身體', sub: '健康', effect: (s) => `你把重訓和睡眠顧好，整季零傷病。${addStats(s, { hp: 3, happy: 2 })}` },
    ],
  },
  {
    id: 'bb_star', minAge: 21, maxAge: 34, weight: 10,
    cond: (s) => jobIs(s, 'probball') && s.stats.hp >= 60,
    title: '明星賽 MVP',
    effect: (s, rng) => (chance(rng, 0.45 + s.stats.charm / 300)
      ? good(`你拿下明星賽 MVP，球衣銷量第一，球團和贊助商搶著加碼。${boost(s, 2, '明星球員')}${addStats(s, { charm: 12, happy: 12 })}${addPoints(s, 3, '明星賽 MVP') || ''}`)
      : `你入選了明星賽，但 MVP 被對面的後衛拿走。獎金 ${(() => { const a = P(s, rint(rng, 20, 60) * WAN); s.money += a; return formatMoney(a); })()}。${addStats(s, { charm: 5, happy: 5 })}`),
  },
  {
    id: 'bb_injury', minAge: 20, maxAge: 36, weight: 8,
    cond: (s) => jobIs(s, 'probball'),
    title: '十字韌帶',
    text: '一次落地沒站穩，膝蓋當場腫起來。醫生說要開刀，復健至少八個月。',
    choices: [
      { label: '開刀，慢慢復健', sub: '健康↓，可能回不到以前', effect: (s, rng) => (chance(rng, 0.6) ? `一年後你回到球場，速度慢了一點，但還能打。${addStats(s, { hp: -8, happy: -6 })}` : (() => { if (s.job) { s.job.salary = Math.round(s.job.salary * 0.6); } return bad(`你再也沒有回到以前的狀態，球團砍了你的薪水。${addStats(s, { hp: -12, happy: -12 })}`); })()) },
      { label: '打針硬撐完球季', sub: '賺完這季，身體付代價', effect: (s, rng) => { const a = P(s, rint(rng, 15, 40) * WAN); s.money += a; return bad(`你靠止痛針打完球季，季後賽獎金 ${formatMoney(a)}，但膝蓋從此每逢下雨就痛。${addStats(s, { hp: -16, happy: -4 })}`); } },
    ],
  },
  {
    id: 'bb_coach', minAge: 33, maxAge: 52, weight: 30, once: true,
    cond: (s) => !s.job && wasA(s, 'probball'),
    title: '退役之後',
    text: '球衣掛起來之後，好幾個地方找上你：母校要你回去帶球隊，電視台問你要不要當球評。',
    choices: [
      { label: '回母校當教練', sub: '穩定，帶下一代', effect: (s) => { sign(s, 'ballcoach', '籃球教練'); return good(`你回到當年那個體育館，換你在場邊喊。${addStats(s, { happy: 8, charm: 4 })}`); } },
      { label: '當球評、做球隊經營', sub: '收入高一點', effect: (s) => { sign(s, 'ballcoach', '球評／球隊經理', 1.5); return good(`你講球講得比打球還好，轉播單位一簽就是三年。${addStats(s, { charm: 8, happy: 6 })}`); } },
      { label: '離開籃球圈', sub: '重新找工作', effect: (s) => { s.flags.needJob = true; return `你把最後一件球衣裱起來，開始投履歷。${addStats(s, { happy: -6, int: 3 })}`; } },
    ],
  },

  // ═════════ 🔬 科學研究社：科展 → 實驗室 → 研究員 → 技術入股 ═════════
  {
    id: 'sc_intl', minAge: 14, maxAge: 19, weight: 26,
    cond: (s) => inSchool(s) && club('science')(s) && !s.flags.sci,
    title: '國際科展選拔',
    text: '指導老師說你的題目有機會代表台灣出國比賽，但整個暑假都要泡在實驗室。',
    choices: [
      {
        odds: (s) => Math.min(0.9, 0.3 + s.stats.int / 200), label: '拚一個暑假', sub: '智力↑↑，快樂↓',
        effect: (s, rng) => {
          if (chance(rng, 0.3 + s.stats.int / 200)) {
            s.flags.sci = 2;
            addPoints(s, 2, '國際科展得獎');
            return good(`你在國際科展拿到二等獎，教授在頒獎典禮後跟你要了 email。${addStats(s, { int: 12, charm: 3, happy: 4 })}`);
          }
          s.flags.sci = 1;
          return `你沒進代表隊，但整個暑假把實驗重做了四十次，老師說你已經像個研究生了。${addStats(s, { int: 8, happy: -4 })}`;
        },
      },
      { label: '暑假還是要放', sub: '快樂↑', effect: (s) => `你把暑假還給自己。${addStats(s, { happy: 6, int: 1 })}` },
    ],
  },
  {
    id: 'sc_lab', minAge: 19, maxAge: 26, weight: 26,
    cond: (s) => s.flags.sci >= 1 && s.flags.sci < 3 && inSchool(s),
    title: '教授找你進實驗室',
    text: '教授在課後把你留下來：「我這邊有個計畫缺人，你要不要來？做得好，直升博班沒問題。」',
    choices: [
      { label: '進實驗室', sub: '智力↑↑，沒有生活', effect: (s) => { s.flags.sci = 3; return good(`你的生活變成實驗室、宿舍、便利商店三點一線，但你做出了實驗室第一篇一作論文。${addStats(s, { int: 10, happy: -6, hp: -3 })}`); } },
      { label: '先去業界實習', sub: '賺錢、看看外面', effect: (s, rng) => { const a = P(s, rint(rng, 8, 20) * WAN); s.money += a; s.flags.sci = 2; return `你去了半導體廠實習，領了 ${formatMoney(a)}，也知道自己不想一直待在無塵室。${addStats(s, { int: 4 })}`; } },
    ],
  },
  {
    id: 'sc_offer', minAge: 22, maxAge: 34, weight: 40, once: true,
    cond: (s) => s.flags.sci === 3 && !jobIs(s, 'researcher'),
    title: '研究機構的 offer',
    text: (s) => `國家級研究院和一家大廠的研發中心同時給你 offer，年薪從 ${formatMoney(P(s, 95 * WAN))} 起跳，做得出東西還有技術獎金。`,
    choices: [
      { label: '進研究單位', sub: '高薪、穩定', effect: (s) => { sign(s, 'researcher', '研究員'); addPoints(s, 2, '成為研究員'); return good(`你有了自己的實驗桌和一組編號。${addStats(s, { int: 6, happy: 6 })}`); } },
      { label: '去新創當技術長', sub: '薪水更高，但公司可能倒', effect: (s, rng) => (chance(rng, 0.6) ? (() => { sign(s, 'researcher', '技術長（CTO）', 2.1); addPoints(s, 3, '新創技術長'); return good(`你成了那家新創的技術長，除了年薪還有一批股票。${addStats(s, { int: 5, happy: 8, hp: -3 })}`); })() : (() => { sign(s, 'researcher', '研究員'); return `你談到一半發現那家新創的錢只夠撐半年，最後還是回研究單位報到。${addStats(s, { int: 3, happy: -3 })}`; })()) },
      { label: '不做研究了', sub: '去找一般工作', effect: (s) => { s.flags.sci = 0; s.flags.needJob = true; return `你把實驗紀錄本收進箱子裡，決定換一條路。${addStats(s, { happy: -4, int: 2 })}`; } },
    ],
  },
  {
    id: 'sc_patent', minAge: 26, maxAge: 60, weight: 14,
    cond: (s) => jobIs(s, 'researcher'),
    title: '你的專利被買走了',
    effect: (s, rng) => {
      const a = P(s, rint(rng, 60, 400) * WAN);
      s.money += a;
      addSkill(s, 1);
      return good(`你掛名的專利被一家外商買斷，分到 ${formatMoney(a)}。${addStats(s, { int: 4, happy: 8 })}`);
    },
  },
  {
    id: 'sc_break', minAge: 28, maxAge: 60, weight: 8,
    cond: (s) => jobIs(s, 'researcher') && s.stats.int >= 70,
    title: '做出關鍵技術',
    effect: (s, rng) => (chance(rng, 0.45 + s.stats.int / 400)
      ? good(`你們做出來的東西被寫進國際期刊，公司直接讓你自己帶一個部門。${boost(s, 2, '首席科學家')}${addStats(s, { int: 8, happy: 12 })}${addPoints(s, 3, '關鍵技術突破') || ''}`)
      : `實驗做了三年沒有結果，計畫被砍掉，你和組員一起把設備搬去倉庫。${addStats(s, { happy: -8, int: 3 })}`),
  },

  // ═════════ 💃 熱舞社：街舞大賽 → 伴舞 → 職業舞者 → 編舞師 ═════════
  {
    id: 'dc_battle', minAge: 14, maxAge: 20, weight: 26,
    cond: (s) => inSchool(s) && club('dance')(s) && !s.flags.dance,
    title: '全國街舞大賽',
    text: '你們報名了大賽，決賽在西門町的舞台，底下擠滿人。',
    choices: [
      {
        odds: (s) => Math.min(0.9, 0.3 + s.stats.charm / 220 + s.stats.hp / 500), label: '上台 battle', sub: '人緣↑↑',
        effect: (s, rng) => {
          if (chance(rng, 0.3 + s.stats.charm / 220 + s.stats.hp / 500)) {
            s.flags.dance = 2;
            addPoints(s, 2, '街舞大賽冠軍');
            return good(`最後一個八拍全場尖叫。影片被轉了十幾萬次，經紀公司的人留了 IG。${addStats(s, { charm: 12, hp: 4, happy: 10 })}`);
          }
          s.flags.dance = 1;
          return `你們輸給了一個高職的隊伍，回程捷運上沒人講話，但隔天照樣去練。${addStats(s, { charm: 4, hp: 3, happy: -3 })}`;
        },
      },
      { label: '當工作人員就好', sub: '安全', effect: (s) => `你在後台幫忙搬音響，看了一整天別人跳舞。${addStats(s, { charm: 2, happy: 2 })}` },
    ],
  },
  {
    id: 'dc_backup', minAge: 18, maxAge: 30, weight: 34, once: true,
    cond: (s) => s.flags.dance >= 1 && !jobIs(s, 'dancer') && !jobIs(s, 'choreo'),
    title: '經紀公司找你當伴舞',
    text: (s) => `一家經紀公司問你要不要簽舞者約：跟著歌手巡演、上節目，一年有一半在排練室，年薪大約 ${formatMoney(P(s, 55 * WAN))}，紅了之後另計。`,
    choices: [
      { label: '簽，靠跳舞吃飯', sub: '收入中等，有機會翻倍', effect: (s) => { s.flags.dance = 3; sign(s, 'dancer', '職業舞者'); addPoints(s, 2, '成為職業舞者'); return good(`第一場巡演你站在主舞台左二的位置，燈亮起來的時候你差點哭出來。${addStats(s, { charm: 8, happy: 12, hp: -2 })}`); } },
      { label: '當興趣，週末教課', sub: '穩定一點', effect: (s, rng) => { const a = P(s, rint(rng, 5, 15) * WAN); s.money += a; s.flags.dance = 5; return `你在舞蹈教室兼課，一年多賺 ${formatMoney(a)}，平日還是上班。${addStats(s, { charm: 4, happy: 5 })}`; } },
    ],
  },
  {
    id: 'dc_tour', minAge: 19, maxAge: 42, weight: 16,
    cond: (s) => jobIs(s, 'dancer'),
    title: '世界巡演',
    choices: [
      { label: '跟團跑完全部場次', sub: '賺錢，健康↓', effect: (s, rng) => { const a = P(s, rint(rng, 20, 90) * WAN); s.money += a; return good(`四個月十五個城市，每天睡不到六小時。演出費和獎金 ${formatMoney(a)}。${addStats(s, { happy: 6, charm: 5, hp: -6 })}`); } },
      { label: '留下來接小案子', sub: '顧身體', effect: (s, rng) => { const a = P(s, rint(rng, 5, 20) * WAN); s.money += a; return `你接了幾支廣告和尾牙，賺了 ${formatMoney(a)}，也睡飽了。${addStats(s, { hp: 3, happy: 3 })}`; } },
    ],
  },
  {
    id: 'dc_choreo', minAge: 26, maxAge: 45, weight: 26, once: true,
    cond: (s) => jobIs(s, 'dancer'),
    title: '轉做編舞',
    text: '膝蓋開始提醒你年紀，但有唱片公司問你要不要幫新人編舞、當舞蹈總監。',
    choices: [
      { label: '轉編舞師', sub: '收入更高，比較不傷身', effect: (s) => { sign(s, 'choreo', '編舞師'); addPoints(s, 2, '成為編舞師'); return good(`你開始在排練室裡喊別人的節拍，第一支作品就上了金曲舞台。${addStats(s, { charm: 6, happy: 8, int: 3 })}`); } },
      { label: '再跳幾年', sub: '繼續當舞者', effect: (s) => `你說身體還撐得住，再跳三年再說。${addStats(s, { happy: 4, hp: -3 })}` },
    ],
  },
  {
    id: 'dc_world', minAge: 28, maxAge: 60, weight: 12,
    cond: (s) => jobIs(s, 'choreo'),
    title: '國際巡演總監',
    effect: (s, rng) => (chance(rng, 0.5 + s.stats.charm / 300)
      ? good(`你接下一個國際天團的巡演編舞，整場的畫面都是你的設計。${boost(s, 2, '舞蹈總監')}${addStats(s, { charm: 10, happy: 10, hp: -4 })}${addPoints(s, 3, '國際巡演總監') || ''}`)
      : (() => { const a = P(s, rint(rng, 10, 40) * WAN); s.money += a; return `案子被別家搶走，你接了幾支廣告編舞，收入 ${formatMoney(a)}。${addStats(s, { happy: -3 })}`; })()),
  },

  // ═════════ 🗣️ 演辯社：全國賽 → 上節目 → 講師／名嘴 ═════════
  {
    id: 'db_final', minAge: 14, maxAge: 20, weight: 26,
    cond: (s) => inSchool(s) && club('debate')(s) && !s.flags.deb,
    title: '全國辯論錦標賽',
    text: '決賽的題目抽到你最不熟的那一邊，結辯是你。',
    choices: [
      {
        odds: (s) => Math.min(0.9, 0.3 + s.stats.int / 250 + s.stats.charm / 300), label: '照樣上台結辯', sub: '智力、人緣↑↑',
        effect: (s, rng) => {
          if (chance(rng, 0.3 + s.stats.int / 250 + s.stats.charm / 300)) {
            s.flags.deb = 2;
            addPoints(s, 2, '全國辯論冠軍');
            return good(`你用四分鐘把對方的論點一條一條拆掉，評審全票。影片在學生圈傳開，有人叫你「那個結辯的」。${addStats(s, { int: 8, charm: 10, happy: 8 })}`);
          }
          s.flags.deb = 1;
          return `你講到一半被質詢打亂，輸了。回家你把整場重看三遍，做了十頁筆記。${addStats(s, { int: 6, charm: 3, happy: -4 })}`;
        },
      },
      { label: '換學長上', sub: '沒壓力', effect: (s) => `你在台下幫忙記時間，也學到很多。${addStats(s, { int: 3 })}` },
    ],
  },
  {
    id: 'db_media', minAge: 22, maxAge: 40, weight: 30, once: true,
    cond: (s) => s.flags.deb >= 1 && !jobIs(s, 'speaker'),
    title: '電視台找你上節目',
    text: (s) => `你在網路上講的一段影片被剪出來瘋傳，政論節目和企業內訓同時找上你。做這行講得好年收入可以很高，但講錯一句就被全網罵。`,
    choices: [
      { label: '全職當講師／名嘴', sub: '收入高、起伏大', effect: (s) => { s.flags.deb = 3; sign(s, 'speaker', '講師／名嘴'); addPoints(s, 2, '靠一張嘴吃飯'); return good(`你一週跑三家電視台加兩場企業內訓，行事曆滿到沒有空白。${addStats(s, { charm: 10, happy: 6, hp: -3 })}`); } },
      { label: '偶爾上節目就好', sub: '賺外快', effect: (s, rng) => { const a = P(s, rint(rng, 6, 25) * WAN); s.money += a; return `你保留原本的工作，通告費一年多了 ${formatMoney(a)}。${addStats(s, { charm: 5 })}`; } },
    ],
  },
  {
    id: 'db_course', minAge: 24, maxAge: 60, weight: 16,
    cond: (s) => jobIs(s, 'speaker'),
    title: '線上課程開賣',
    choices: [
      {
        odds: (s) => Math.min(0.9, 0.35 + s.stats.charm / 260), label: '開一門課', sub: '賣爆就翻身',
        effect: (s, rng) => (chance(rng, 0.35 + s.stats.charm / 260)
          ? (() => { const a = P(s, rint(rng, 50, 250) * WAN); s.money += a; return good(`「怎麼把話講清楚」一門課賣了上萬份，分潤 ${formatMoney(a)}。${boost(s, 1.8, '知名講師')}${addStats(s, { charm: 8, happy: 10 })}`); })()
          : (() => { const a = P(s, rint(rng, 3, 15) * WAN); s.money += a; return `課程賣得普通，分潤 ${formatMoney(a)}，但學員回饋很好。${addStats(s, { charm: 3 })}`; })()),
      },
      { label: '專心跑通告', sub: '穩定', effect: (s, rng) => { const a = P(s, rint(rng, 8, 30) * WAN); s.money += a; return `你把時間放在節目和內訓，通告費 ${formatMoney(a)}。${addStats(s, { charm: 3, hp: -2 })}`; } },
    ],
  },
  {
    id: 'db_blow', minAge: 24, maxAge: 60, weight: 8,
    cond: (s) => jobIs(s, 'speaker'),
    title: '一句話被斷章取義',
    effect: (s, rng) => (chance(rng, 0.5 + s.stats.int / 300)
      ? `你的一段話被剪掉前後文瘋傳，你錄了一支完整版澄清，風向兩天後就回來了。${addStats(s, { happy: -5, charm: 2 })}`
      : (() => { if (s.job) s.job.salary = Math.round(s.job.salary * 0.65); return bad(`你被罵上熱搜，兩家節目把你換掉，通告掉了一大半。${addStats(s, { happy: -12, charm: -6 })}`); })()),
  },

  // ═════════ 🎮 電競社：戰隊選拔 → 職業隊 → 訓練與比賽 → 30 歲前退役 ═════════
  {
    id: 'es_tryout', minAge: 14, maxAge: 19, weight: 28,
    cond: (s) => inSchool(s) && club('esports')(s) && !s.flags.esp,
    title: '戰隊選拔賽',
    text: '你的帳號排到了伺服器前 200 名，一支二軍戰隊私訊你：「要不要來測試？每天訓練十小時，先講清楚，很累也很無聊。」',
    choices: [
      {
        odds: (s) => Math.min(0.9, 0.3 + s.stats.int / 250 + s.stats.happy / 600), label: '去測試', sub: '智力↑，讀書時間沒了',
        effect: (s, rng) => {
          if (chance(rng, 0.3 + s.stats.int / 250 + s.stats.happy / 600)) {
            s.flags.esp = 1;
            return good(`你通過測試進了二軍。從那天起你的生活只剩下訓練賽、檢討會和睡覺。${addStats(s, { int: 5, happy: 6, hp: -4 })}`);
          }
          return `你在測試賽被打爆，對面是已經打職業的人。你回去繼續練。${addStats(s, { int: 2, happy: -4 })}`;
        },
      },
      { label: '打好玩就好', sub: '快樂↑', effect: (s) => `你跟社團的人開黑打到半夜，純粹爽。${addStats(s, { happy: 6, hp: -2, int: 1 })}` },
    ],
  },
  {
    id: 'es_contract', minAge: 16, maxAge: 24, weight: 40, once: true,
    cond: (s) => s.flags.esp === 1 && !jobIs(s, 'progamer'),
    title: '一軍合約',
    text: (s) => `一軍教練把合約推過來：年薪 ${formatMoney(P(s, 85 * WAN))} 起跳，比賽獎金另計，贏了世界賽收入是醫生的好幾倍。但合約寫得很清楚：住選手宿舍、一天訓練十二小時、二十八歲球團就不續約了。`,
    choices: [
      {
        label: '簽！趁年輕拚一次', sub: '高薪，但三十歲前就要退役',
        effect: (s) => {
          s.flags.esp = 2;
          sign(s, 'progamer', '電競職業選手');
          addPoints(s, 3, '打進職業電競');
          return good(`你搬進選手宿舍，房間裡只有一張床和一台電腦。爸媽到現在還是不太懂你在做什麼。${addStats(s, { happy: 10, hp: -4, int: 3 })}`);
        },
      },
      { label: '還是先把書念完', sub: '智力↑', effect: (s) => { s.flags.esp = 0; return `你退掉了測試資格。很多年後看到當年隊友拿冠軍，你還是會想一下。${addStats(s, { int: 6, happy: -6 })}`; } },
    ],
  },
  {
    id: 'es_train', minAge: 16, maxAge: 30, weight: 26,
    cond: (s) => jobIs(s, 'progamer'),
    title: '每天十二小時訓練',
    text: '起床、訓練賽、檢討會、個人練習、再檢討，一天結束已經半夜兩點。這樣的日子一年有三百天。',
    choices: [
      { label: '照表操課', sub: '穩穩變強，快樂↓', effect: (s) => `你把同一個操作練了幾千次，手指變快了，但你已經想不起上次出門玩是什麼時候。${addStats(s, { int: 3, happy: -7, hp: -3 })}` },
      { label: '偷懶去打排位放鬆', sub: '快樂↑，教練會念', effect: (s, rng) => (chance(rng, 0.5) ? `你溜出去和朋友吃了一頓宵夜，教練沒發現。${addStats(s, { happy: 6, hp: 1 })}` : `你被抓到，隔天多練三小時，還被隊友唸。${addStats(s, { happy: -4, int: 2 })}`) },
    ],
  },
  {
    id: 'es_league', minAge: 16, maxAge: 30, weight: 30,
    cond: (s) => jobIs(s, 'progamer'),
    title: '這一季的比賽',
    text: '例行賽二十幾場、季中賽、季後賽，一年到頭都在比。',
    choices: [
      {
        odds: (s) => Math.min(0.9, 0.35 + s.stats.int / 260), label: '全力打', sub: '獎金＋名氣',
        effect: (s, rng) => {
          if (chance(rng, 0.35 + s.stats.int / 260)) {
            const a = P(s, rint(rng, 15, 70) * WAN);
            s.money += a;
            return good(`你們打進季後賽四強，你在一場 BO5 打出全場最高輸出。獎金分到 ${formatMoney(a)}。${addStats(s, { charm: 6, happy: 8, hp: -4 })}`);
          }
          return `球隊卡在中段班，你在檢討會上被點名了三次。${addStats(s, { happy: -6, hp: -3, int: 2 })}`;
        },
      },
      { label: '這季先養身體', sub: '健康↑', effect: (s) => `你調整作息、去復健科報到，狀態慢慢回來。${addStats(s, { hp: 5, happy: -2 })}` },
    ],
  },
  {
    id: 'es_world', minAge: 17, maxAge: 29, weight: 12,
    cond: (s) => jobIs(s, 'progamer') && s.stats.int >= 55,
    title: '世界大賽',
    text: '你們拿到世界賽的門票，決賽在國外的體育館，線上同時觀看人數破千萬。',
    choices: [
      {
        odds: (s) => Math.min(0.85, 0.25 + s.stats.int / 260), label: '拚冠軍', sub: '贏了收入直接翻幾倍',
        effect: (s, rng) => {
          if (chance(rng, 0.25 + s.stats.int / 260)) {
            const a = P(s, rint(rng, 150, 600) * WAN);
            s.money += a;
            addPoints(s, 4, '世界賽冠軍');
            return good(`你們 3:1 拿下冠軍，舉盃的照片上了所有體育版。獎金分到 ${formatMoney(a)}，續約時球團直接加碼，贊助商排隊找你。${boost(s, 2.6, '世界冠軍選手')}${addStats(s, { charm: 14, happy: 16, hp: -5 })}`);
          }
          const a = P(s, rint(rng, 20, 80) * WAN);
          s.money += a;
          return `你們在八強被淘汰，賽後你一個人在選手席坐了很久。名次獎金 ${formatMoney(a)}。${addStats(s, { happy: -8, charm: 4, hp: -4 })}`;
        },
      },
      { label: '穩穩打，別受傷', sub: '保守', effect: (s, rng) => { const a = P(s, rint(rng, 10, 40) * WAN); s.money += a; return `你們止步十六強，獎金 ${formatMoney(a)}。${addStats(s, { happy: -3, hp: -2 })}`; } },
    ],
  },
  {
    id: 'es_wrist', minAge: 18, maxAge: 30, weight: 8,
    cond: (s) => jobIs(s, 'progamer'),
    title: '手腕和肩頸',
    effect: (s, rng) => (chance(rng, 0.55)
      ? (() => { const c = P(s, rint(rng, 1, 5) * WAN); s.money -= c; return `醫生說是滑鼠手加上頸椎壓迫，復健加護具花了 ${formatMoney(c)}。你開始每天做伸展。${addStats(s, { hp: -5, happy: -3 })}`; })()
      : bad(`手腕痛到連滑鼠都握不住，你缺席了兩個月的比賽，位置被替補頂走。${addStats(s, { hp: -9, happy: -10 })}`)),
  },
  {
    id: 'es_retire', minAge: 24, maxAge: 29, weight: 26, once: true,
    cond: (s) => jobIs(s, 'progamer'),
    title: '要退役了',
    text: '反應慢了半拍，隊上最小的選手比你小九歲。球團問你下一季要不要轉教練，也有平台開價要你去做實況。',
    choices: [
      { label: '轉任教練', sub: '留在圈子裡，穩定', effect: (s) => { sign(s, 'ecoach', '電競教練'); addPoints(s, 2, '轉任電競教練'); return good(`你換到教練席，開始對著一群十八歲的孩子講戰術。${addStats(s, { happy: 6, int: 4, hp: 2 })}`); } },
      { label: '去當實況主', sub: '收入不穩，但自由', effect: (s) => { sign(s, 'ecoach', '遊戲實況主', 1.4); return good(`你架好了自己的直播間，第一天就有三千人同時在線。${addStats(s, { happy: 10, charm: 6, hp: -2 })}`); } },
      { label: '離開電競圈', sub: '重新找工作', effect: (s) => { s.flags.esp = 0; s.flags.needJob = true; return `你把宿舍的東西裝進兩個紙箱。二十幾歲的人生要重來一次。${addStats(s, { happy: -8, int: 3 })}`; } },
    ],
  },
  {
    id: 'es_after', minAge: 28, maxAge: 45, weight: 30, once: true,
    cond: (s) => !s.job && wasA(s, 'progamer'),
    title: '退役之後',
    text: '合約到期球團沒有續約。你才二十八歲，履歷上只有一行「職業選手」。',
    choices: [
      { label: '轉教練或分析師', sub: '留在圈子裡', effect: (s) => { sign(s, 'ecoach', '電競教練'); return good(`你回到熟悉的訓練室，這次坐在後面那張椅子。${addStats(s, { happy: 6, int: 3 })}`); } },
      { label: '做實況和賽評', sub: '靠人氣吃飯', effect: (s) => { sign(s, 'ecoach', '實況主／賽評', 1.4); return good(`老粉絲都還在，開台第一天就衝上分類第一。${addStats(s, { charm: 6, happy: 8 })}`); } },
      { label: '從頭找一份工作', sub: '重新開始', effect: (s) => { s.flags.needJob = true; return `你去考了幾張證照，從基層開始。${addStats(s, { happy: -5, int: 4 })}`; } },
    ],
  },
];
