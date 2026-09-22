// 傳說職業：條件很硬，達成過一次就會永久記在首頁的「傳說職業圖鑑」
// 但每一輩子都還是要真的達到條件，才會有人來找你
const WAN = 10000;

const EDU_RANK = {
  none: 0, junior: 1, senior: 2, vocational: 2,
  college: 3, techCollege: 3, topCollege: 4, master: 4, topMaster: 5,
};

const rank = (s) => EDU_RANK[s.edu] || 0;
const didJob = (s, ids) => (s.jobIds || []).some((x) => ids.includes(x));
const hasTalent = (s, ids) => ((s.flags && s.flags.talents) || []).some((x) => ids.includes(x));
const hasBiz = (s, ids) => (s.bizs || []).some((b) => ids.includes(b.type));

export const LEGENDS = [
  {
    id: 'president',
    name: '總統',
    icon: '🏛️',
    title: '國家元首',
    salary: 230 * WAN,
    raise: 0.4,
    risk: 0,
    retireAge: 78,
    art: 'deal',
    hint: '人緣 85、智力 78、45 歲以上，而且當過公務員／律師／警察／老師',
    req: (s) => s.stats.charm >= 85 && s.stats.int >= 78 && s.age >= 45 && rank(s) >= 3
      && didJob(s, ['civil', 'lawyer', 'police', 'teacher']),
    title2: '黨部找上門',
    text: '幾個地方派系的人約你吃飯，飯吃到一半才說出真正的來意：「這次我們想推你出來選。」民調顯示你的聲望是全國最高的。',
    take: '你投入選戰，掃街掃到鞋子磨破。開票那晚，你站上了舞台。',
  },
  {
    id: 'astronaut',
    name: '太空人',
    icon: '🚀',
    title: '上過太空的人',
    salary: 210 * WAN,
    raise: 0.8,
    risk: 0.3,
    retireAge: 58,
    art: 'startup',
    hint: '智力 88、健康 82、研究所以上，24～45 歲',
    req: (s) => s.stats.int >= 88 && s.stats.hp >= 82 && rank(s) >= 4 && s.age >= 24 && s.age <= 45,
    title2: '太空人選拔',
    text: '國際太空總署來台灣招募任務專家，全世界報名一萬兩千人，體檢和學科考完之後只剩十四個。你是其中一個。',
    take: '兩年的訓練之後，你在發射台上倒數。從窗戶看出去，地球是圓的。',
  },
  {
    id: 'superstar',
    name: '天王巨星',
    icon: '🎤',
    title: '一代巨星',
    salary: 0,
    volatile: true,
    stat: 'charm',
    raise: 0,
    risk: 0,
    art: 'talent',
    hint: '人緣 85、快樂 62、40 歲以下，學過音樂或舞蹈類才藝，而且做過網紅／音樂老師／調酒師之類吃人氣的工作',
    req: (s) => s.stats.charm >= 85 && s.stats.happy >= 62 && s.age <= 40
      && hasTalent(s, ['sing', 'guitar', 'piano', 'dance', 'drum', 'violin'])
      && didJob(s, ['influencer', 'bandmusician', 'idol', 'musicteacher', 'bartender', 'attendant', 'guide', 'hairdresser']),
    title2: '唱片公司找上你',
    text: '你在小場子表演的影片被剪成三十秒，一個晚上兩百萬人看過。隔天，三家唱片公司同時打電話來。',
    take: '第一張專輯發行三個月就開了小巨蛋，門票七分鐘賣完。',
  },
  {
    id: 'proathlete',
    name: '國家隊主將',
    icon: '🏅',
    title: '為國爭光',
    salary: 300 * WAN,
    raise: 1.4,
    risk: 0.4,
    retireAge: 36,
    art: 'sport',
    hint: '健康 84、28 歲以下，小時候學過球類或武術',
    req: (s) => s.stats.hp >= 84 && s.age <= 28
      && hasTalent(s, ['basketball', 'baseball', 'soccer', 'taekwondo', 'swim', 'ice']),
    title2: '國家隊徵召',
    text: '教練看完你的體測數據，只說了一句：「這種身體條件，一個世代出不了幾個。」國家隊的徵召令寄到你家。',
    take: '你披上國家隊球衣，在國際賽站上頒獎台，國旗升到最高的那一根旗桿。',
  },
  {
    id: 'chef',
    name: '米其林主廚',
    icon: '👨‍🍳',
    title: '星級主廚',
    salary: 190 * WAN,
    raise: 1.2,
    risk: 0.5,
    art: 'party',
    hint: '智力 62、小時候學過烹飪，而且當過廚師或開過餐飲店',
    req: (s) => s.stats.int >= 62 && hasTalent(s, ['cook'])
      && (didJob(s, ['chef', 'baker', 'barista']) || hasBiz(s, ['food', 'restaurant', 'cafe'])),
    title2: '密探來過了',
    text: '有個客人連續三個月每週都來，每次都點不一樣的菜，安安靜靜吃完就走。半年後，指南公佈了，你的店旁邊有一顆星。',
    take: '你搬到更大的店面，訂位排到三個月後。',
  },
  {
    id: 'surgeon',
    name: '神經外科權威',
    icon: '🩺',
    title: '救人無數',
    salary: 300 * WAN,
    raise: 0.9,
    risk: 0.1,
    art: 'hospital',
    hint: '智力 89、頂尖研究所學歷，而且當過醫生或牙醫',
    req: (s) => s.stats.int >= 89 && rank(s) >= 5 && didJob(s, ['doctor', 'dentist']),
    title2: '主刀的位置',
    text: '一台沒有人敢接的開顱手術，家屬指名要你。你站上主刀的位置，十一個小時沒有離開手術室。',
    take: '病人醒了，會叫人了。從此全台灣的疑難雜症都往你這裡送。',
  },
  {
    id: 'toplawyer',
    name: '金牌律師',
    icon: '⚖️',
    title: '不敗律師',
    salary: 270 * WAN,
    raise: 1.1,
    risk: 0.3,
    art: 'deal',
    hint: '智力 85、人緣 75，而且當過律師',
    req: (s) => s.stats.int >= 85 && s.stats.charm >= 75 && didJob(s, ['lawyer']),
    title2: '世紀官司',
    text: '一件所有人都說輸定了的案子，你接了下來。開庭那天，你把對方準備了兩年的論述拆得一乾二淨。',
    take: '判決出來那天，你的名字上了所有新聞。你自己開了事務所。',
  },
  {
    id: 'aiscientist',
    name: 'AI 科學家',
    icon: '🤖',
    title: '改變世界的人',
    salary: 320 * WAN,
    raise: 1.3,
    risk: 0.6,
    art: 'startup',
    hint: '智力 89、大學以上，當過工程師，而且小時候學過程式或機器人',
    req: (s) => s.stats.int >= 89 && rank(s) >= 4 && didJob(s, ['engineer'])
      && hasTalent(s, ['code', 'robot', 'science']),
    title2: '被挖去做模型',
    text: '你寫的一篇論文被引用了三千次。半年內，矽谷四家公司輪流開價，最後一家直接讓你自己組團隊、自己決定要做什麼。',
    take: '你帶的團隊做出了那一代最強的模型，股票分紅比薪水還多。',
  },
  {
    id: 'ceo',
    name: '財團執行長',
    icon: '💼',
    title: '集團掌門人',
    salary: 340 * WAN,
    raise: 1.2,
    risk: 1,
    art: 'company',
    hint: '人緣 83、智力 80，同時經營兩家公司，而且淨資產超過 8,000 萬',
    req: (s, nw) => s.stats.charm >= 83 && s.stats.int >= 80 && (s.bizs || []).length >= 2 && nw >= 8000 * WAN,
    title2: '董事會的決定',
    text: '一個上市集團的董事會吵了三個月，最後一致決定：要找一個真的做過生意的人來當執行長。他們找上你。',
    take: '你上任第一天就宣布三個併購案，股價當天漲停。',
  },
  {
    id: 'vc',
    name: '創投大亨',
    icon: '📈',
    title: '點石成金',
    salary: 300 * WAN,
    raise: 1.1,
    risk: 1.4,
    art: 'bull',
    hint: '智力 78、投資眼光滿級，而且投資部位超過 5,000 萬',
    req: (s, nw, invest) => s.stats.int >= 78 && s.investSkill >= 5 && invest >= 5000 * WAN,
    title2: '有人拿錢給你操盤',
    text: '你的投資紀錄被一群家族辦公室看到了。他們沒有要你的簡報，只問了一句：「要不要幫我們管一支基金？」',
    take: '你成立了自己的創投，投的第一家公司三年後上市。',
  },
  {
    id: 'director',
    name: '金馬導演',
    icon: '🎬',
    title: '說故事的人',
    salary: 0,
    volatile: true,
    stat: 'charm',
    raise: 0,
    risk: 0,
    art: 'talent',
    hint: '人緣 83、智力 82、30 歲以上，學過攝影或繪畫，而且做過攝影師／設計師／記者／作家',
    req: (s) => s.stats.charm >= 83 && s.stats.int >= 82 && s.age >= 30 && hasTalent(s, ['photo', 'paint'])
      && didJob(s, ['photographer', 'designer', 'reporter', 'writer']),
    title2: '你的短片入圍了',
    text: '你用很少的錢拍了一部短片，本來只想放給朋友看。結果它一路從地方影展走到金馬，入圍名單上有你的名字。',
    take: '你拿到了第一筆長片的資金，開始真正拍自己想拍的東西。',
  },
  {
    id: 'esportschamp',
    name: '電競世界冠軍',
    icon: '🎮',
    title: '世界第一',
    salary: 240 * WAN,
    raise: 1.2,
    risk: 0.8,
    retireAge: 33,
    art: 'trophy',
    hint: '智力 78、快樂 80、27 歲以下，而且當過電競選手',
    req: (s) => s.stats.int >= 78 && s.stats.happy >= 80 && s.age <= 27 && didJob(s, ['esports']),
    title2: '世界賽的門票',
    text: '你的隊伍一路打進世界賽，決賽打到第五場。最後三十秒，你做了一個沒有人想得到的操作。',
    take: '舉起獎盃的那一刻，直播同時上線人數是三千萬人。',
  },
];

export const legendById = (id) => LEGENDS.find((l) => l.id === id);

// 這一輩子目前可以解鎖哪一個（一次只給一個，優先給薪水高的）
export function availableLegend(s, nw, invest) {
  const got = s.legends || [];
  if (got.length) return null; // 傳說職業一輩子只會遇到一次
  const seen = s.flags.legendSeen || {};
  return LEGENDS
    .filter((l) => !seen[l.id] && !got.includes(l.id) && l.req(s, nw, invest))
    .sort((a, b) => (b.salary || 2000 * WAN) - (a.salary || 2000 * WAN))[0] || null;
}
