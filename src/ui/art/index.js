// 插圖：場景圖、事件圖、人物頭像
// 場景插圖 = 遊戲專屬插畫（art/*.webp）；缺圖時才用 unDraw 當備用
// 備用插圖 = unDraw（MIT 授權 https://undraw.co），已依遊戲配色重新上色
// 人物頭像 = DiceBear avataaars（MIT 授權），依名字產生、同一個人永遠長一樣
import { useMemo } from 'react';
import { Image, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { createAvatar } from '@dicebear/core';
import * as avataaars from '@dicebear/avataaars';
import { ART } from './undraw';
import { PHOTO } from './photos';
import { performTalent } from '../../game/talents';
import { C } from '../theme';

// 每張圖的底色（柔和的色塊，讓畫面有層次）
const TINT = {
  baby: C.goldSoft, zhuazhou: C.primarySoft, school: C.blueSoft, teen: C.blueSoft,
  exam: C.blueSoft, study: C.blueSoft, talent: '#3a2148', love: '#3a2148', wedding: '#3a2148',
  gift: '#3a2148', family: C.goldSoft, pet: C.greenSoft, office: C.page, desk: C.page,
  job: C.page, company: C.primarySoft, startup: C.goldSoft, city: C.primarySoft,
  house: C.greenSoft, money: C.goldSoft, bull: C.greenSoft, crash: C.redSoft,
  broke: C.redSoft, deal: C.primarySoft, hospital: C.redSoft, party: C.goldSoft,
  travel: C.blueSoft, trophy: C.goldSoft, retire: C.greenSoft, car: C.blueSoft,
  sport: C.greenSoft,
  talent_piano: '#3a2148', talent_violin: '#3a2148', talent_drum: '#3a2148', talent_sing: '#3a2148',
  talent_dance: '#3a2148', talent_magic: '#3a2148', talent_paint: '#3a2148',
};

const wrap = (v) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.vb}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%">${v.svg}</svg>`;

// 先把 svg 字串組好（只做一次），避免每次畫面更新都重組
const XML = {};
for (const [id, v] of Object.entries(ART)) XML[id] = wrap(v);

export const ART_IDS = [...new Set([...Object.keys(PHOTO), ...Object.keys(ART)])];

// ───────── 一張場景圖 ─────────
export function Art({ id, height = 130, radius = 18, pad = 14, padBottom, style }) {
  const key = PHOTO[id] || XML[id] ? id : 'desk';
  return (
    <View
      style={[
        {
          height,
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: TINT[key] || C.page,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: pad,
          paddingBottom: padBottom == null ? pad : padBottom,
          paddingHorizontal: pad + 6,
        },
        style,
      ]}
    >
      {PHOTO[key] ? (
        <Image source={PHOTO[key]} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      ) : (
        <SvgXml xml={XML[key]} width="100%" height="100%" />
      )}
    </View>
  );
}

// ───────── 依年齡／身分決定主畫面的場景 ─────────
export function sceneForState(s) {
  const nw = (s.money || 0) + (s.etf || 0) + (s.stock || 0) + (s.gold || 0) + (s.crypto || 0) + (s.deposit || 0);
  if (s.ended) return 'retire';
  if (s.age < 6) return 'baby';
  if (s.age < 12) return 'school';
  if (s.studying) return 'teen';
  if (s.achievedAge || nw >= 1e8) return 'city';
  if ((s.bizs || []).length) return 'company';
  if (s.age >= 60) return 'retire';
  if ((s.houses || []).length) return 'house';
  if (s.job) return 'office';
  return 'desk';
}

// ───────── 依事件內容決定要配哪張圖 ─────────
const RULES = [
  [/抓周/, 'zhuazhou'],
  // 只有「主角自己在經營」作品帳號／頻道時才出現手機（同學的職稱「小網紅」之類不算）
  [/作品帳號|開了.{0,4}帳號|經營頻道|你的頻道|你的帳號|你的粉絲|粉絲專頁|訂閱數|開直播|當直播主|你的貼文/, 'social'],
  [/結婚|求婚|婚禮|喜宴/, 'wedding'],
  [/弟弟|妹妹|爸媽|媽媽|爸爸|阿嬤|阿公|家人|孩子|小孩|生一個|懷孕/, 'family'],
  [/同學會|慶祝|生日|party|尾牙/i, 'party'],
  [/戀愛|告白|交往|情人|約會|暗戀|真愛|對象|吵架|同居|分手/, 'love'],
  [/收購|併購|集團|子公司|查帳|整頓|簽約|合約/, 'deal'],
  [/創業|新創|開公司|開店|開幕|加盟/, 'startup'],
  [/會考|學測|指考|考試|成績|模擬考|重考/, 'exam'],
  [/補習|讀書|唸書|自習|家教|進修|證照/, 'study'],
  [/小狗|貓|寵物|養狗|養貓|飼料/, 'pet'],
  [/股災|崩盤|金融海嘯|賠|詐騙|破產|裁員|失業|欠|負債/, 'crash'],
  [/沒錢|存款見底|口袋|吃土/, 'broke'],
  [/大漲|暴漲|飆|熱潮|爆紅|加薪|升遷|分紅|獲利|翻倍/, 'bull'],
  [/中獎|樂透|紅包|禮物|遺產|贈與/, 'gift'],
  [/生病|健康|住院|醫院|檢查|受傷|骨折|過敏|腸病毒|感冒|手術/, 'hospital'],
  [/運動|健身|跑步|球隊|體育|馬拉松|減肥/, 'sport'],
  [/買車|開車|汽車|機車|車禍|駕照/, 'car'],
  [/買房|房子|房價|搬家|裝潢|房東|租屋/, 'house'],
  [/才藝|鋼琴|音樂|畫|表演|舞|吉他|唱歌|樂團/, 'talent'],
  [/旅行|旅遊|出國|飛機|露營|畢業旅行/, 'travel'],
  [/面試|應徵|offer|錄取|轉職|找工作|履歷/i, 'job'],
  [/退休|老年|安養|養老/, 'retire'],
  [/錢|獎金|投資|理財|存款|薪水|基金|股票|ETF/, 'money'],
  [/公司|工作|上班|老闆|加班|職場|同事/, 'desk'],
  [/幼兒園|嬰兒|寶寶|出生|學走路|長牙|尿布|奶/, 'baby'],
  [/學校|老師|同學|班上|國小|國中|高中/, 'school'],
  [/大學|研究所|畢業/, 'teen'],
];

// 才藝表演：依你學的才藝換圖（圖還沒畫的先用一般表演圖）
const TALENT_RULES = [
  [/小提琴/, 'violin'], [/鋼琴/, 'piano'], [/爵士鼓|打鼓/, 'drum'], [/唱歌|聲樂|合唱/, 'sing'],
  [/跳舞|舞蹈|熱舞/, 'dance'], [/魔術/, 'magic'], [/作畫|繪畫|畫畫/, 'paint'], [/吉他|樂團|熱音/, 'guitar'],
];
const talentArt = (text, s) => {
  let id = null;
  for (const [re, k] of TALENT_RULES) if (re.test(text)) { id = k; break; }
  if (!id && s) id = performTalent(s);
  if (!id || id === 'guitar') return 'talent';
  return PHOTO[`talent_${id}`] ? `talent_${id}` : 'talent';
};

export function artForEvent(pending, s) {
  if (!pending) return 'desk';
  if (/同學會/.test(pending.title || '')) return 'party';
  if (pending.art && (XML[pending.art] || PHOTO[pending.art])) return pending.art;
  const text = `${pending.title || ''}${pending.text || ''}`;
  for (const [re, id] of RULES) if (re.test(text)) return id === 'talent' ? talentArt(text, s) : id;
  if (pending.source === 'offers') return 'job';
  if (pending.source === 'bizPick') return 'startup';
  if (pending.source === 'route') return 'trophy';
  return 'desk';
}

// ───────── 結算畫面的大圖 ─────────
export function artForEnd(sum) {
  if (sum.dead) return 'retire';
  if (sum.nw >= 1e9) return 'city';
  if (sum.nw >= 1e8) return 'trophy';
  if (sum.nw < 0) return 'broke';
  if (sum.nw >= 2e7) return 'house';
  return 'retire';
}

// ───────── 人物頭像（DiceBear，依名字固定長相）─────────
const MALE_TOP = ['shortFlat', 'shortRound', 'shortWaved', 'shortCurly', 'theCaesar', 'theCaesarAndSidePart', 'sides', 'frizzle', 'shaggy'];
const FEMALE_TOP = ['bob', 'bun', 'longButNotTooLong', 'straight01', 'straight02', 'straightAndStrand', 'curvy', 'miaWallace', 'shortWaved'];
const CLOTHES = ['6c5ce7', '2e90fa', '12b76a', 'f5a524', 'ee6fa8', '9e77ed', '3c4f5c', 'f04438'];

const cache = new Map();

function avatarXml(name, gender, age, mood) {
  const key = `${name}|${gender}|${age >= 58 ? 'o' : age >= 45 ? 'm' : age < 13 ? 'k' : 'y'}|${mood}`;
  if (cache.has(key)) return cache.get(key);
  const female = gender === 'female';
  const old = age >= 58;
  const mid = age >= 45;
  const bad = mood === 'bad';
  const svg = createAvatar(avataaars, {
    seed: name || '無名',
    size: 96,
    backgroundColor: ['transparent'],
    skinColor: ['ffdbb4', 'edb98a'],
    top: female ? FEMALE_TOP : MALE_TOP,
    hairColor: old ? ['e8e1e1'] : mid ? ['b58143', '4a312c'] : ['2c1b18', '4a312c', '724133'],
    clothing: female
      ? ['shirtScoopNeck', 'collarAndSweater', 'blazerAndShirt', 'shirtCrewNeck']
      : ['shirtCrewNeck', 'blazerAndShirt', 'collarAndSweater', 'shirtVNeck', 'hoodie'],
    clothesColor: CLOTHES,
    accessoriesProbability: age < 13 ? 5 : 15,
    accessories: ['prescription01', 'prescription02', 'round'],
    facialHairProbability: female || age < 20 ? 0 : mid ? 25 : 8,
    facialHair: ['beardLight', 'moustacheFancy', 'beardMedium'],
    eyes: bad ? ['cry', 'squint', 'closed'] : ['default', 'happy', 'wink', 'squint'],
    eyebrows: bad ? ['sadConcernedNatural', 'frownNatural'] : ['defaultNatural', 'raisedExcitedNatural', 'flatNatural'],
    mouth: bad ? ['sad', 'concerned', 'serious'] : ['smile', 'twinkle', 'default'],
  }).toString();
  cache.set(key, svg);
  return svg;
}

export function Avatar({ name = '', gender = 'male', age = 30, size = 44, mood = 'ok', style }) {
  const xml = useMemo(() => avatarXml(name, gender, age, mood), [name, gender, age, mood]);
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: C.page },
        style,
      ]}
    >
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
}
