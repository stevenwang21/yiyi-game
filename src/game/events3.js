// 第三批事件：天災、意外、官司、工作機會、興趣、社區…讓每一年更有變化
import { addMoney, addStats, chance, formatMoney, formatMoneyFine, rint, WAN } from './utils.js';
import { addSkill, alivePets, mainBiz, netWorth, regularJob } from './actions.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });
const P = (s, v) => Math.round(v * s.priceIndex);
const cash = (s) => Math.max(0, s.money);
const insured = (s) => !!s.flags.insured;

export const EVENTS3 = [
  // ───────── 天災與意外 ─────────
  {
    id: 'earthquake', minAge: 6, maxAge: 99, weight: 2, title: '大地震',
    text: '半夜一陣劇烈搖晃，全家衝到桌子底下。',
    choices: [
      {
        label: '檢查房子、該修就修',
        sub: '花錢但安心',
        effect: (s, rng) => {
          const c = s.houses.length ? P(s, rint(rng, 5, 20) * WAN) : P(s, 2 * WAN);
          s.houses.forEach((h) => { h.value = Math.round(h.value * 0.98); });
          return `你找師傅檢查並補強房子。${addMoney(s, -c)}${addStats(s, { happy: -2 })}`;
        },
      },
      {
        label: '應該沒事吧',
        effect: (s, rng) => (chance(rng, 0.35) && s.houses.length
          ? bad(`後來發現牆壁有裂縫，修繕花了更多錢。${addMoney(s, -P(s, rint(rng, 15, 40) * WAN))}${addStats(s, { happy: -5 })}`)
          : `還好只是虛驚一場。${addStats(s, { happy: -1 })}`),
      },
    ],
  },
  {
    id: 'house_fire', minAge: 20, maxAge: 99, weight: 1, cond: (s) => s.houses.length > 0, title: '火災',
    effect: (s) => {
      const h = s.houses[0];
      const loss = Math.round(h.value * (insured(s) ? 0.05 : 0.2));
      h.value -= loss;
      return bad(`廚房電線走火，燒掉了半個客廳。${insured(s) ? '還好有保險，理賠了大部分。' : '沒有保險，只能自己出錢重新裝潢。'}（-${formatMoney(loss)}）${addStats(s, { happy: -8, hp: -3 })}`);
    },
  },
  {
    id: 'typhoon_damage', minAge: 10, maxAge: 99, weight: 2, title: '颱風夜',
    effect: (s, rng) => bad(`強颱來襲，機車被吹倒、窗戶也破了。${addMoney(s, -P(s, rint(rng, 1, 6) * WAN))}${addStats(s, { happy: -2 })}`),
  },
  {
    id: 'car_crash_big', minAge: 20, maxAge: 99, weight: 1, title: '嚴重車禍',
    text: '在路口被闖紅燈的車撞上，送醫治療。',
    choices: [
      {
        label: '好好治療、復健',
        sub: '有醫療險的話理賠比較多',
        effect: (s) => { const c = P(s, insured(s) ? 10 * WAN : 35 * WAN); return bad(`你住院一個月，慢慢復健。${addMoney(s, -c)}${addStats(s, { hp: -12, happy: -5 })}`); },
      },
      {
        label: '提告求償',
        effect: (s, rng) => (chance(rng, 0.55)
          ? good(`對方全責，你拿到賠償金。${addMoney(s, P(s, rint(rng, 20, 60) * WAN))}${addStats(s, { hp: -10, happy: -2 })}`)
          : bad(`官司拖了三年，最後只拿到一點點。${addMoney(s, P(s, 3 * WAN))}${addStats(s, { hp: -12, happy: -8 })}`)),
      },
    ],
  },
  {
    id: 'flood', minAge: 20, maxAge: 99, weight: 1, cond: (s) => s.bizs.length > 0, title: '淹水',
    effect: (s) => { const b = mainBiz(s); const loss = Math.round(b.value * 0.12); b.value -= loss; return bad(`豪雨造成「${b.name}」淹水，設備和庫存泡湯。（-${formatMoney(loss)}）${addStats(s, { happy: -5 })}`); },
  },

  // ───────── 錢的麻煩 ─────────
  {
    id: 'lawsuit', minAge: 25, maxAge: 99, weight: 2, cond: (s) => netWorth(s) > 500 * WAN, title: '被告了',
    text: '有人主張你侵害了他的權益，提告求償。',
    choices: [
      {
        odds: (s) => Math.min(1, 0.55 + s.stats.int / 400), label: '請律師打到底',
        sub: '律師費約 30 萬',
        effect: (s, rng) => {
          const fee = P(s, 30 * WAN);
          s.money -= fee;
          if (chance(rng, 0.55 + s.stats.int / 400)) return good(`你勝訴了，對方還要付你訴訟費用。（律師費 -${formatMoney(fee)}）${addStats(s, { happy: -3 })}`);
          const pay = Math.round(netWorth(s) * 0.05);
          return bad(`你敗訴，還要賠一筆錢。${addMoney(s, -pay)}${addStats(s, { happy: -8 })}`);
        },
      },
      {
        label: '花錢和解',
        effect: (s) => { const pay = Math.round(Math.max(P(s, 20 * WAN), netWorth(s) * 0.02)); return `你選擇和解，早點結束這件事。${addMoney(s, -pay)}${addStats(s, { happy: -4 })}`; },
      },
    ],
  },
  {
    id: 'bad_debt', minAge: 25, maxAge: 99, weight: 2, cond: (s) => s.bizs.length > 0, title: '被倒帳',
    effect: (s) => { const b = mainBiz(s); const loss = Math.round(b.value * 0.1); b.value -= loss; return bad(`大客戶突然倒閉，「${b.name}」的貨款收不回來。（-${formatMoney(loss)}）${addStats(s, { happy: -6 })}`); },
  },
  {
    id: 'invest_fraud', minAge: 25, maxAge: 99, weight: 2, cond: (s) => s.money >= P(s, 100 * WAN), title: '高獲利投資案',
    text: '有人介紹一個「保證年化 20%」的海外投資，最低 100 萬起。',
    choices: [
      {
        label: '投 100 萬',
        effect: (s, rng) => {
          const amt = P(s, 100 * WAN);
          s.money -= amt;
          if (chance(rng, 0.25 + s.investSkill * 0.05)) return good(`意外地，這個案子是真的，你賺了一筆。${addMoney(s, Math.round(amt * 1.4))}${addStats(s, { happy: 4 })}`);
          return bad(`是老鼠會，錢全部要不回來了。${addStats(s, { happy: -12 })}`);
        },
      },
      { label: '「保證獲利」一定有問題', effect: (s) => good(`你查了一下，果然是非法吸金。${addStats(s, { int: 2 })}`) },
      {
        // 假裝有興趣、把整套資料交給金管會，成功有檢舉獎金
        label: '假裝有興趣，把資料交給金管會',
        sub: '成功有檢舉獎金，失敗白跑一年',
        odds: (s) => Math.min(0.75, 0.15 + s.stats.int / 280 + s.investSkill * 0.05),
        effect: (s, rng) => {
          const p = Math.min(0.75, 0.15 + s.stats.int / 280 + s.investSkill * 0.05);
          if (chance(rng, p)) {
            s.flags.bustCount = (s.flags.bustCount || 0) + 1;
            const prize = Math.round((15 + rint(rng, 0, 40)) * WAN * s.priceIndex);
            return good(`你去了三場說明會，把組織圖、金流帳號、話術手冊全部拍下來交出去。這個案子被查封的時候上了新聞，你領到檢舉獎金 ${formatMoney(prize)}。${addMoney(s, prize)}${addStats(s, { int: 3, charm: 3, happy: 6 })}`);
          }
          const spent = P(s, rint(rng, 1, 3) * WAN);
          return bad(`對方一開始就覺得你怪怪的，資料給得零零落落，檢舉沒有下文。你白跑一年說明會，交通和「入場費」花掉 ${formatMoney(spent)}。${addMoney(s, -spent)}${addStats(s, { happy: -5 })}`);
        },
      },
    ],
  },
  {
    id: 'phone_scam2', minAge: 55, maxAge: 99, weight: 2, cond: (s) => s.money >= P(s, 50 * WAN), title: '假冒孫子的電話',
    text: '「阿公！我出事了，需要 50 萬……」',
    choices: [
      { label: '先打給孩子確認', effect: (s) => good(`一問之下根本沒這回事，你沒有上當。${addStats(s, { int: 1 })}`) },
      { label: '趕快匯錢', effect: (s) => bad(`匯出去才發現是詐騙。${addMoney(s, -P(s, 50 * WAN))}${addStats(s, { happy: -10 })}`) },
      {
        // 約他出來面交，警察在旁邊等
        label: '約他來家裡拿，先報警',
        sub: '成功有檢舉獎金',
        odds: (s) => Math.min(0.8, 0.2 + s.stats.int / 300 + s.stats.charm / 340),
        effect: (s, rng) => {
          const p = Math.min(0.8, 0.2 + s.stats.int / 300 + s.stats.charm / 340);
          if (chance(rng, p)) {
            s.flags.bustCount = (s.flags.bustCount || 0) + 1;
            const prize = Math.round((5 + rint(rng, 0, 20)) * WAN * s.priceIndex);
            return good(`你裝得比他還急，說錢要現場點。車手按門鈴的時候，兩個便衣就站在你後面。檢舉獎金 ${formatMoney(prize)}，里長還送你一面感謝狀。${addMoney(s, prize)}${addStats(s, { charm: 5, happy: 8, int: 1 })}`);
          }
          return bad(`對方大概聽出你在拖時間，說一句「阿公你等我一下」就再也沒出現。${addStats(s, { happy: -3 })}`);
        },
      },
    ],
  },
  {
    // 一輩子最多一次的大案子。要先成功反制過兩次詐騙、而且腦子和人面都夠，檢警才會找上你。
    // 這是全遊戲最大的一張樂透：中了可以直接破億，賠了可能連命都沒有。
    id: 'scam_bust_big', minAge: 38, maxAge: 72, weight: 1, once: true,
    cond: (s) => (s.flags.bustCount || 0) >= 2 && s.stats.int >= 75 && s.stats.charm >= 65,
    title: '檢警找上門',
    text: '你這幾年擋下詐騙的事被寫進他們的報告裡。一個穿便服的人翻開卷宗：「柬埔寨有個機房，一年洗掉幾十億。我們缺一個他們不會懷疑的人。」',
    choices: [
      { label: '我沒那麼偉大', effect: (s) => ({ text: '你送他到門口，說自己只是運氣好。這件事沒有下文。', tone: 'neutral' }) },
      {
        // 中風險：人在台灣，做得到但拿不到大的
        label: '只當線人，在台灣提供情報',
        sub: '安全一點，獎金也小一點',
        odds: (s) => Math.min(0.8, 0.35 + s.stats.int / 300 + s.stats.charm / 400),
        effect: (s, rng) => {
          const p = Math.min(0.8, 0.35 + s.stats.int / 300 + s.stats.charm / 400);
          if (chance(rng, p)) {
            const prize = P(s, rint(rng, 500, 2000) * WAN);
            return { text: `你用假身分跟他們的台灣窗口周旋了兩年，把三個車手集團的金流全攤在檢警面前。起訴書出來那天你沒去，獎金 ${formatMoney(prize)} 直接匯進帳戶。${addMoney(s, prize)}${addStats(s, { int: 4, charm: 6, happy: 10 })}`, tone: 'milestone' };
          }
          return bad(`對方很謹慎，兩年下來什麼都沒撈到，案子結掉了。你還接了整整一年的騷擾電話。${addStats(s, { happy: -8, hp: -2 })}`);
        },
      },
      {
        // 高風險：飛過去。中了直接破億，賠了健康掉 40 可能當場死。
        label: '飛過去，進機房當內應',
        sub: '成功分到查扣金額，失敗身分曝光',
        odds: (s) => Math.min(0.42, 0.05 + s.stats.int / 450 + s.stats.charm / 700),
        effect: (s, rng) => {
          const p = Math.min(0.42, 0.05 + s.stats.int / 450 + s.stats.charm / 700);
          if (chance(rng, p)) {
            // 成功裡面有三分之一是「整個總部被端」的大獎
            if (chance(rng, 0.35)) {
              s.flags.windfall = true;
              const seized = rint(rng, 20, 60);                       // 查扣幾十億
              const prize = P(s, Math.round(seized * 10000 * WAN * 0.05)); // 1 億 = 10000 * WAN，依法分到 5%
              return {
                text: `你在裡面待了十一個月。收網那天，跨國聯合行動一次端掉總部和四個分部，冷錢包裡 ${seized} 億全部查扣。你依洗錢防制法分到 ${formatMoney(prize)}，新聞上你的臉全部打了馬賽克。${addMoney(s, prize)}${addStats(s, { int: 6, charm: 10, happy: 14, hp: -8 })}`,
                tone: 'milestone',
              };
            }
            const prize = P(s, rint(rng, 1500, 4000) * WAN);
            return { text: `你混進去當了半年客服，把機房座標和幹部名單傳出來。攻堅那天抓到十七個人，你分到 ${formatMoney(prize)}。${addMoney(s, prize)}${addStats(s, { int: 4, charm: 6, happy: 10, hp: -5 })}`, tone: 'milestone' };
          }
          const loss = Math.round(Math.max(0, s.money) * 0.5);
          return bad(`第三個月，你的手機被翻出來。你是被丟在邊境的路邊才被找到的，人救回來了，帳戶裡的錢沒有。${addMoney(s, -loss)}${addStats(s, { hp: -40, happy: -30, charm: -5 })}`);
        },
      },
    ],
  },
  {
    id: 'inherit_fight', minAge: 40, maxAge: 99, weight: 1, once: true, title: '遺產糾紛',
    text: '長輩過世後，親戚為了遺產分配吵了起來。',
    choices: [
      { label: '爭取應得的部分', effect: (s, rng) => (chance(rng, 0.5) ? good(`最後你分到一筆遺產，但和親戚關係變差。${addMoney(s, P(s, rint(rng, 50, 300) * WAN))}${addStats(s, { charm: -5, happy: -3 })}`) : bad(`打了三年官司，什麼都沒拿到。${addMoney(s, -P(s, 10 * WAN))}${addStats(s, { happy: -8, charm: -4 })}`)) },
      { label: '不爭了，家人比較重要', effect: (s) => good(`親戚都很感謝你的退讓。${addStats(s, { charm: 6, happy: 3 })}`) },
    ],
  },

  // ───────── 工作機會 ─────────
  {
    id: 'overseas', minAge: 25, maxAge: 55, weight: 2, cond: regularJob, once: true, title: '外派機會',
    text: '公司想派你到海外分公司三年，薪水加五成，但要離開家人。',
    choices: [
      { label: '去！', sub: '薪水 +50%，快樂↓', effect: (s) => { s.job.salary = Math.round(s.job.salary * 1.5); return good(`你在異鄉打拚，存款增加得很快。${addStats(s, { happy: -6, int: 3, charm: 2 })}`); } },
      { label: '留在台灣', effect: (s) => `你選擇陪在家人身邊。${addStats(s, { happy: 3 })}` },
    ],
  },
  {
    id: 'headhunt', minAge: 28, maxAge: 60, weight: 2, cond: (s) => regularJob(s) && s.job.years >= 5, title: '獵頭挖角',
    text: '有公司開出更高的薪水想挖你過去，但新環境不一定適合。',
    choices: [
      {
        label: '跳槽',
        effect: (s, rng) => {
          const up = 1 + rint(rng, 15, 40) / 100;
          s.job.salary = Math.round(s.job.salary * up);
          s.job.years = 0;
          if (chance(rng, 0.25)) return bad(`薪水是變高了，但新公司文化很糟，你每天都很累。${addStats(s, { happy: -8, hp: -3 })}`);
          return good(`新工作很適合你，年薪變成 ${formatMoney(s.job.salary)}。${addStats(s, { happy: 4 })}`);
        },
      },
      { label: '留下來', effect: (s) => `你和主管談了談，決定留下。${addStats(s, { happy: 1 })}` },
    ],
  },
  {
    id: 'mba', minAge: 26, maxAge: 45, weight: 2, cond: (s) => regularJob(s) && s.money >= P(s, 60 * WAN), once: true, title: '在職進修 EMBA',
    text: '花 60 萬讀 EMBA，可以認識很多業界人脈。',
    choices: [
      { label: '報名', sub: '智力、人緣大增', effect: (s) => good(`兩年的課程很累，但你學到很多，也認識了不少老闆。${addMoney(s, -P(s, 60 * WAN))}${addStats(s, { int: 6, charm: 8, hp: -2 })}`) },
      { label: '太貴了', effect: () => '你決定靠自己看書進修。' },
    ],
  },
  {
    id: 'partner_offer', minAge: 30, maxAge: 60, weight: 2, cond: (s) => !s.bizs.length && s.money >= P(s, 200 * WAN), title: '朋友找你合夥',
    text: '認識多年的朋友想找你一起開公司，你要出 200 萬。',
    choices: [
      {
        odds: (s) => Math.min(1, 0.5 + s.stats.int / 400), label: '一起幹！',
        effect: (s, rng) => {
          const amt = P(s, 200 * WAN);
          s.money -= amt;
          if (chance(rng, 0.5 + s.stats.int / 400)) {
            s.bizs.push({ uid: `b${s.uid++}`, type: 'trade', name: '合夥公司', value: Math.round(amt * 1.4), capital: amt, route: null, bonus: 0, years: 0, lastR: 0 });
            return good(`公司順利開張，第一年就有獲利。${addStats(s, { happy: 6 })}`);
          }
          return bad(`兩年後理念不合拆夥，只拿回一半的錢。${addMoney(s, Math.round(amt * 0.5))}${addStats(s, { happy: -8, charm: -3 })}`);
        },
      },
      { label: '婉拒', effect: (s) => `你覺得朋友還是不要一起做生意。${addStats(s, { charm: -1 })}` },
    ],
  },
  {
    id: 'burn_out2', minAge: 28, maxAge: 60, weight: 2, cond: (s) => s.workStreak >= 5, title: '想休息一年',
    text: '你已經連續好幾年拚工作，累到快撐不住了。',
    choices: [
      { label: '請一年假好好休息', sub: '今年沒有收入', effect: (s) => { s.flags.skipSalary = true; s.risk = Math.max(0, s.risk - 20); return good(`你放下工作，去環島、看書、睡到自然醒。${addStats(s, { hp: 12, happy: 15 })}`); } },
      { label: '再撐一下', effect: (s) => bad(`你咬牙繼續，但身體發出更多警訊。${addStats(s, { hp: -5, happy: -5 })}`) },
    ],
  },

  // ───────── 生活、興趣、社區 ─────────
  {
    id: 'lottery_small', minAge: 18, maxAge: 99, weight: 2, title: '刮刮樂',
    effect: (s, rng) => (chance(rng, 0.25) ? good(`買了一張刮刮樂，中了小獎！${addMoney(s, P(s, rint(rng, 1, 10) * WAN))}${addStats(s, { happy: 3 })}`) : `買了一張刮刮樂，沒中。${addMoney(s, -200)}`),
  },
  {
    id: 'marathon2', minAge: 20, maxAge: 70, weight: 2, cond: (s) => s.stats.hp >= 55, title: '報名鐵人三項',
    text: '朋友揪你一起挑戰鐵人三項，要花錢買裝備和報名。',
    choices: [
      { label: '練起來！', effect: (s) => good(`你完賽了，整個人脫胎換骨。${addMoney(s, -P(s, 5 * WAN))}${addStats(s, { hp: 8, happy: 8, charm: 2 })}`) },
      { label: '在旁邊加油', effect: (s) => `你幫朋友拍照打氣。${addStats(s, { charm: 1 })}` },
    ],
  },
  {
    id: 'hobby_camera', minAge: 20, maxAge: 99, weight: 2, title: '迷上攝影',
    text: '你最近很想買一台好一點的相機。',
    choices: [
      { label: '買下去（8 萬）', effect: (s) => good(`週末都在拍照，還開了作品帳號。${addMoney(s, -P(s, 8 * WAN))}${addStats(s, { happy: 6, charm: 2 })}`) },
      { label: '手機拍拍就好', effect: (s) => `你用手機也拍得很開心。${addStats(s, { happy: 2 })}` },
    ],
  },
  {
    id: 'community', minAge: 35, maxAge: 75, weight: 2, cond: (s) => s.stats.charm >= 55, title: '鄰居推你選里長',
    text: '大家覺得你人緣好，推你出來選里長。',
    choices: [
      {
        odds: (s) => Math.min(1, 0.35 + s.stats.charm / 300), label: '參選看看',
        effect: (s, rng) => (chance(rng, 0.35 + s.stats.charm / 300)
          ? good(`你當選了！雖然沒什麼錢，但很有成就感。${addMoney(s, -P(s, 15 * WAN))}${addStats(s, { charm: 10, happy: 8 })}`)
          : bad(`落選了，選舉的錢也花掉了。${addMoney(s, -P(s, 15 * WAN))}${addStats(s, { happy: -5 })}`)),
      },
      { label: '我沒興趣', effect: () => '你婉拒了鄰居的好意。' },
    ],
  },
  {
    id: 'volunteer', minAge: 18, maxAge: 99, weight: 2, title: '當志工',
    effect: (s) => good(`週末去了淨灘和陪伴長輩，心裡很踏實。${addStats(s, { charm: 4, happy: 4 })}`),
  },
  {
    id: 'move_house', minAge: 25, maxAge: 70, weight: 2, cond: (s) => s.houses.length === 0, title: '搬家',
    effect: (s, rng) => `房東要收回房子，你只好搬家。${addMoney(s, -P(s, rint(rng, 3, 10) * WAN))}${addStats(s, { happy: -3 })}`,
  },
  {
    id: 'friend_wedding', minAge: 22, maxAge: 60, weight: 3, title: '朋友結婚',
    effect: (s, rng) => `這個月有三場喜宴，紅包包到手軟。${addMoney(s, -P(s, rint(rng, 1, 3) * WAN))}${addStats(s, { charm: 2, happy: 2 })}`,
  },
  {
    id: 'parents_trip', minAge: 30, maxAge: 70, weight: 2, title: '帶爸媽出國',
    text: '爸媽年紀大了，你想帶他們出國走走。',
    choices: [
      { label: '訂機票！（15 萬）', effect: (s) => good(`爸媽笑得好開心，一直說這輩子沒這麼放鬆過。${addMoney(s, -P(s, 15 * WAN))}${addStats(s, { happy: 10, charm: 3 })}`) },
      { label: '國內走走就好', effect: (s) => good(`你帶他們去泡溫泉。${addMoney(s, -P(s, 2 * WAN))}${addStats(s, { happy: 5 })}`) },
    ],
  },
  {
    id: 'class_reunion_biz', minAge: 30, maxAge: 65, weight: 2, cond: (s) => s.stats.charm >= 50, title: '同學會上的機會',
    effect: (s, rng) => (chance(rng, 0.4) ? good(`同學介紹了一個案子給你，賺了一筆。${addMoney(s, P(s, rint(rng, 10, 50) * WAN))}${addStats(s, { charm: 2 })}`) : `大家聊得很開心，交換了名片。${addStats(s, { charm: 3 })}`),
  },
  {
    id: 'quit_smoke', minAge: 25, maxAge: 70, weight: 1, cond: (s) => s.stats.hp < 60, title: '健康檢查紅字',
    text: '健檢報告一堆紅字，醫生要你改變生活習慣。',
    choices: [
      { label: '認真調整作息和飲食', effect: (s) => { s.risk = Math.max(0, s.risk - 12); return good(`三個月後回診，數字都正常了。${addStats(s, { hp: 8, happy: 2 })}`); } },
      { label: '知道了（但沒改）', effect: (s) => { s.risk = Math.min(100, s.risk + 8); return bad(`你還是照原本的方式生活。${addStats(s, { hp: -3 })}`); } },
    ],
  },
  {
    id: 'sleep', minAge: 20, maxAge: 99, weight: 2, title: '失眠',
    effect: (s) => bad(`最近壓力大，常常半夜醒來。${addStats(s, { hp: -3, happy: -3 })}`),
  },
  {
    id: 'good_neighbor', minAge: 20, maxAge: 99, weight: 2, title: '好鄰居',
    effect: (s) => good(`鄰居送來一大袋自己種的菜。${addStats(s, { happy: 3, charm: 2 })}`),
  },
  {
    id: 'pet_meet', minAge: 10, maxAge: 99, weight: 2, cond: (s) => alivePets(s).length > 0, title: '寵物聚會',
    effect: (s) => good(`帶「${alivePets(s)[0].name}」去公園，認識了一群同好。${addStats(s, { happy: 4, charm: 3 })}`),
  },

  // ───────── 投資、理財 ─────────
  {
    id: 'rebalance', minAge: 20, maxAge: 99, weight: 2, cond: (s) => s.etf + s.stock + s.crypto >= 100 * WAN, title: '要不要重新配置？',
    text: '理財專員建議你把資產重新配置，降低風險。',
    choices: [
      {
        label: '調整成穩健配置',
        sub: '把一半個股和幣換成 ETF',
        effect: (s) => {
          const move = Math.round(s.stock / 2) + Math.round(s.crypto / 2);
          s.stock -= Math.round(s.stock / 2);
          s.crypto -= Math.round(s.crypto / 2);
          s.etf += move;
          return good(`你把 ${formatMoney(move)} 換成 ETF，晚上比較睡得著。${addStats(s, { happy: 2 })}`);
        },
      },
      { label: '維持原本的配置', effect: () => '你相信自己的判斷。' },
    ],
  },
  {
    id: 'margin_call', minAge: 22, maxAge: 99, weight: 1, cond: (s) => s.stock >= 200 * WAN, title: '要不要開槓桿？',
    text: '營業員說可以借錢買股票，賺的時候賺兩倍。',
    choices: [
      {
        label: '借錢加碼',
        effect: (s, rng) => {
          const amt = Math.round(s.stock * 0.5);
          if (chance(rng, 0.45)) { s.stock += Math.round(amt * 1.3); return good(`這次賭對了，賺了一大筆。${addStats(s, { happy: 6 })}`); }
          s.stock -= Math.round(amt * 0.8);
          return bad(`股價一跌就被追繳，砍在最低點。（-${formatMoney(Math.round(amt * 0.8))}）${addStats(s, { happy: -10 })}`);
        },
      },
      { label: '不借錢投資', effect: (s) => good(`你知道槓桿會放大風險。${addStats(s, { int: 1 })}`) },
    ],
  },
  {
    id: 'book_club', minAge: 18, maxAge: 99, weight: 2, title: '讀書會',
    effect: (s) => { addSkill(s, 1); return good(`參加了投資讀書會，學到不少觀念。${addStats(s, { int: 2, charm: 2 })}`); },
  },
  {
    id: 'tax_refund', minAge: 22, maxAge: 99, weight: 2, cond: (s) => !!s.job, title: '退稅',
    effect: (s, rng) => good(`報稅算出來可以退稅。${addMoney(s, P(s, rint(rng, 1, 8) * WAN))}`),
  },
  {
    id: 'utility_up', minAge: 22, maxAge: 99, weight: 2, title: '電費漲價',
    effect: (s, rng) => `電費、瓦斯、管理費通通漲價。${addMoney(s, -P(s, rint(rng, 1, 4) * WAN))}`,
  },
  {
    id: 'appliance', minAge: 22, maxAge: 99, weight: 2, title: '冰箱壞了',
    effect: (s, rng) => `用了十幾年的冰箱壞掉，只好換新的。${addMoney(s, -P(s, rint(rng, 2, 5) * WAN))}${addStats(s, { happy: -1 })}`,
  },
  {
    id: 'phone_broke', minAge: 15, maxAge: 99, weight: 2, title: '手機摔壞',
    effect: (s) => `手機摔到地上，螢幕全裂了。${addMoney(s, -P(s, 2 * WAN))}${addStats(s, { happy: -2 })}`,
  },
  {
    id: 'raise_ask', minAge: 25, maxAge: 60, weight: 2, cond: (s) => regularJob(s) && s.job.years >= 2 && !s.job.volatile, title: '要不要開口加薪？',
    text: '你覺得自己的表現值得更高的薪水。',
    choices: [
      {
        label: '跟主管談加薪',
        effect: (s, rng) => {
          if (chance(rng, 0.35 + (s.stats.charm + s.stats.int) / 400)) {
            s.job.salary = Math.round(s.job.salary * 1.15);
            return good(`主管同意加薪 15%，年薪變成 ${formatMoney(s.job.salary)}。${addStats(s, { happy: 6 })}`);
          }
          return bad(`主管說公司今年很困難，被打回票。${addStats(s, { happy: -4 })}`);
        },
      },
      { label: '再等等', effect: () => '你決定再累積一些成績。' },
    ],
  },
  {
    id: 'downsize', minAge: 40, maxAge: 99, weight: 2, cond: (s) => s.houses.length > 0 && s.age >= 55, title: '要不要換小房子？',
    text: '孩子都獨立了，房子好像太大了。',
    choices: [
      { label: '賣掉換小一點的', sub: '拿回一筆現金', effect: (s) => { const h = s.houses[0]; const gain = Math.round(h.value * 0.3); h.value -= gain; return good(`換成小一點的房子，多了一筆現金。${addMoney(s, gain)}${addStats(s, { happy: 2 })}`); } },
      { label: '住習慣了', effect: (s) => `你捨不得這個家。${addStats(s, { happy: 2 })}` },
    ],
  },
  {
    id: 'crypto_hack', minAge: 20, maxAge: 99, weight: 1, cond: (s) => s.crypto >= 20 * WAN, title: '交易所被駭',
    effect: (s) => { const loss = Math.round(s.crypto * 0.4); s.crypto -= loss; return bad(`你放幣的交易所被駭客入侵，少了 ${formatMoney(loss)}。${addStats(s, { happy: -8 })}`); },
  },
  // ───────── 以小搏大：賠的機率比較高，但中了就是一次改變人生 ─────────
  // 這幾個事件的共通點：擺明告訴你「大概率賠」，但押不押是你的選擇。
  // 賠的時候只賠掉你押的那筆，中的時候是好幾十倍，所以敢玩的人才有故事。
  {
    id: 'angel_invest', minAge: 25, maxAge: 60, weight: 2, once: true,
    cond: (s) => s.money >= P(s, 50 * WAN), title: '朋友來借創業的錢',
    text: '大學同學做了一個東西，講得眼睛發亮，說再兩百萬就能量產。他問你要不要算一份。',
    choices: [
      {
        label: '投他一筆', sub: '大概率打水漂，但中了是幾十倍',
        odds: (s) => Math.min(0.3, 0.12 + s.investSkill * 0.012 + s.stats.int / 800),
        effect: (s, rng) => {
          const amt = Math.min(Math.round(cash(s) * 0.2), P(s, 200 * WAN));
          addMoney(s, -amt);
          const p = Math.min(0.3, 0.12 + s.investSkill * 0.012 + s.stats.int / 800);
          if (!chance(rng, p)) {
            return bad(`公司撐了兩年還是收了。他親自來跟你道歉，你的 ${formatMoney(amt)} 沒了。${addStats(s, { happy: -6 })}`);
          }
          // 活下來的裡面，五分之一會變成真的很大的那種
          if (chance(rng, 0.15)) {
            s.flags.windfall = true;
            const back = Math.round(amt * (20 + rng() * 30));
            return { text: `八年後，那家公司在美國上市。你當年那 ${formatMoney(amt)} 變成 ${formatMoney(back)}，你連股東會都沒去過。${addMoney(s, back)}${addStats(s, { happy: 20 })}`, tone: 'milestone' };
          }
          const back = Math.round(amt * (2 + rng() * 3.5));
          return { text: `公司被一家大廠併購，你那筆錢連本帶利拿回 ${formatMoney(back)}。${addMoney(s, back)}${addStats(s, { happy: 10 })}`, tone: 'milestone' };
        },
      },
      { label: '請他吃頓飯就好', effect: (s) => `你祝他順利，但沒有掏錢。${addStats(s, { charm: 1 })}` },
    ],
  },
  {
    id: 'old_land', minAge: 35, maxAge: 99, weight: 2, once: true,
    cond: (s) => s.age >= 40, title: '老家那塊地',
    text: '老家鄉下那塊沒人管的地，仲介開了價要買。爸說要賣就賣，反正也沒人回去了。',
    choices: [
      {
        label: '賣掉，拿現金比較實在',
        effect: (s, rng) => {
          const amt = P(s, rint(rng, 80, 260) * WAN);
          return good(`手續辦一辦，一筆錢進了帳戶。${addMoney(s, amt)}`);
        },
      },
      {
        label: '留著，看以後會不會都更', sub: '每年要繳地價稅，可能白等一輩子',
        odds: () => 0.12,
        effect: (s, rng) => {
          s.flags.landHold = s.age;
          if (chance(rng, 0.12)) {
            s.flags.windfall = true;
            const amt = P(s, rint(rng, 1200, 4000) * WAN);
            return { text: `十幾年後，那一帶劃進重劃區。你什麼都沒做，地價翻了幾十倍，建商捧著錢來找你。${addMoney(s, amt)}${addStats(s, { happy: 18 })}`, tone: 'milestone' };
          }
          const tax = P(s, rint(rng, 8, 25) * WAN);
          return bad(`地還是那塊地，雜草長得比人高。這些年的地價稅加一加 ${formatMoney(tax)}。${addMoney(s, -tax)}`);
        },
      },
    ],
  },
  {
    id: 'stock_option', minAge: 24, maxAge: 60, weight: 2,
    cond: (s) => regularJob(s) && s.job.salary > 0, title: '年終給股票還是現金？',
    text: '今年公司說年終可以選：領現金，或是換成等值的自家股票，但要鎖三年。',
    choices: [
      { label: '領現金', sub: '拿得到、算得準', effect: (s) => good(`年終落袋為安。${addMoney(s, Math.round(s.job.salary * 0.3))}`) },
      {
        label: '換成股票', sub: '三年後可能翻倍，也可能變壁紙',
        odds: () => 0.35,
        effect: (s, rng) => {
          const base = Math.round(s.job.salary * 0.3);
          const r = rng();
          if (r < 0.07) {
            const back = Math.round(base * (5 + rng() * 7));
            s.flags.windfall = back > base * 12;
            return { text: `三年後公司被國際大廠併購，你那些鎖住的股票一次兌現 ${formatMoney(back)}。${addMoney(s, back)}${addStats(s, { happy: 12 })}`, tone: 'milestone' };
          }
          if (r < 0.35) {
            const back = Math.round(base * (1.4 + rng() * 1.2));
            return good(`三年後解鎖，股價漲了不少，換回 ${formatMoney(back)}。${addMoney(s, back)}`);
          }
          const back = Math.round(base * (0.05 + rng() * 0.45));
          return bad(`三年後解鎖時股價已經腰斬再腰斬，只換回 ${formatMoney(back)}。${addMoney(s, back)}${addStats(s, { happy: -5 })}`);
        },
      },
    ],
  },
  {
    id: 'auction_find', minAge: 22, maxAge: 99, weight: 1, once: true,
    cond: (s) => s.money >= P(s, 20 * WAN), title: '二手市集的怪東西',
    text: '你在舊貨攤看到一幅畫，老闆說是他阿公留下來的，開價不高。',
    choices: [
      {
        label: '買下來', sub: '大概率就是一張畫',
        odds: (s) => Math.min(0.16, 0.05 + s.stats.int / 900 + s.investSkill * 0.005),
        effect: (s, rng) => {
          const amt = P(s, rint(rng, 3, 12) * WAN);
          addMoney(s, -amt);
          const p = Math.min(0.16, 0.05 + s.stats.int / 900 + s.investSkill * 0.005);
          if (!chance(rng, p)) return `畫掛在客廳，你太太說很醜。${addStats(s, { happy: 1 })}`;
          const back = P(s, rint(rng, 150, 1200) * WAN);
          if (back > P(s, 800 * WAN)) s.flags.windfall = true;
          return { text: `幾年後你送去鑑定，那是一位已故畫家早期的作品。拍賣會上落槌 ${formatMoney(back)}。${addMoney(s, back)}${addStats(s, { happy: 15 })}`, tone: 'milestone' };
        },
      },
      { label: '拍張照就好', effect: () => '你拍了照，走了。' },
    ],
  },
  {
    id: 'bank_promo', minAge: 20, maxAge: 99, weight: 2, cond: (s) => s.money >= P(s, 30 * WAN), title: '高利定存專案',
    text: '銀行推出限時的高利定存，利率比平常高一點。',
    choices: [
      { label: '把一部分現金定存', effect: (s) => { const amt = Math.min(Math.round(cash(s) * 0.3), P(s, 300 * WAN)); s.money -= amt; s.deposit += amt; return good(`你把 ${formatMoney(amt)} 轉成定存。`); } },
      { label: '不用了', effect: () => '你想把錢留著彈性運用。' },
    ],
  },
];
