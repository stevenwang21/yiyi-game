// 主角母版：男女主角六個階段（嬰兒／國小／高中／青年／壯年／老年），全部來自同一張正式人物設定圖。
// 男主以深藍色為識別、女主以紫色為識別；遊戲裡所有主角的插圖都從這裡出，確保每個事件都是同一張臉。
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Line, Path, Polyline, Stop } from 'react-native-svg';
import { PHOTO } from './art/photos';
import { EMOJI3D } from './art/emoji3d';
import { Avatar } from './art';
import { ranking, netWorth as netWorthOf, selectedClassmates } from '../game/engine';

const ND = Platform.OS !== 'web';
const WEB = Platform.OS === 'web';

// ───────── 年齡 → 階段 ─────────
export function stageOf(age = 0) {
  if (age < 6) return 'baby';
  if (age < 13) return 'kid';
  if (age < 19) return 'teen';
  if (age < 35) return 'young';
  if (age < 55) return 'mid';
  return 'old';
}
export const STAGE_NAME = { baby: '嬰兒', kid: '國小', teen: '高中', young: '青年', mid: '壯年', old: '老年' };
const gk = (gender) => (gender === 'female' ? 'f' : 'm');

// 圖片原始尺寸（寬、高），用來算比例
const SIZE = {
  baby_m: [90, 169], baby_f: [95, 167], kid_m: [107, 366], kid_f: [108, 332],
  teen_m: [117, 427], teen_f: [111, 382], young_m: [114, 432], young_f: [112, 402],
  mid_m: [118, 434], mid_f: [98, 396], old_m: [129, 427], old_f: [107, 389],
};
// 頭的位置（中心 x 佔寬度比例）與大小（佔身高比例）
export const HEAD = {
  baby_m: [0.58, 0.62], baby_f: [0.54, 0.62], kid_m: [0.68, 0.25], kid_f: [0.43, 0.25],
  teen_m: [0.67, 0.2], teen_f: [0.44, 0.2], young_m: [0.71, 0.19], young_f: [0.41, 0.19],
  mid_m: [0.66, 0.19], mid_f: [0.43, 0.19], old_m: [0.67, 0.19], old_f: [0.4, 0.19],
};
export const spriteId = (age, gender) => cid(stageOf(age), gk(gender));
export const SPRITE_SIZE = SIZE;
// 識別色
export const IDENT = {
  m: { main: '#1e2d6b', ring: '#5b7be0', soft: 'rgba(40,64,150,0.55)' },
  f: { main: '#4b3a8f', ring: '#b18cff', soft: 'rgba(120,90,210,0.5)' },
};

const cid = (stage, g) => `${stage}_${g}`;

// ───────── 頭像（圓形）─────────
export function Head({ age = 22, gender = 'male', size = 44, mood, style }) {
  const g = gk(gender);
  const id = cid(stageOf(age), g);
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={{
          width: size, height: size, borderRadius: size / 2, overflow: 'hidden',
          backgroundColor: IDENT[g].main, borderWidth: Math.max(1.5, size / 22), borderColor: IDENT[g].ring,
        }}
      >
        <Pic src={PHOTO[`head_${id}`]} width="100%" height="100%" cover />
      </View>
      {mood ? <MoodBadge mood={mood} size={Math.max(16, size * 0.42)} /> : null}
    </View>
  );
}

// 頭像右下角的小表情：先 🙂，再換成當下的心情（表情變化）
function MoodBadge({ mood, size }) {
  const pop = useRef(new Animated.Value(0)).current;
  const [face, setFace] = useState('🙂');
  useEffect(() => {
    pop.setValue(0);
    setFace('🙂');
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: ND }).start();
    const t = setTimeout(() => {
      setFace(mood);
      pop.setValue(0.6);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: ND }).start();
    }, 420);
    return () => clearTimeout(t);
  }, [mood]);
  return (
    <Animated.View
      style={{
        position: 'absolute', right: -size * 0.28, bottom: -size * 0.18, width: size, height: size, borderRadius: size / 2,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: pop }],
      }}
    >
      <Emo e={face} size={size * 0.82} />
    </Animated.View>
  );
}

// 網頁版直接用 <img>：不經過 react-native-web 的圖片載入流程（有些瀏覽器／App 內建瀏覽器會卡在那裡，人物就不見了）
function Pic({ src, width, height, style, cover }) {
  if (WEB) {
    const uri = src && src.uri;
    return (
      <View style={[{ width, height }, style]}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={uri} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: cover ? 'cover' : 'contain', display: 'block', pointerEvents: 'none', userSelect: 'none' }} />
      </View>
    );
  }
  return <Image source={src} style={[{ width, height }, style]} resizeMode={cover ? 'cover' : 'contain'} />;
}

// 寫實 3D 圖示（網頁版）；沒有對應圖時用一般 emoji
export function Emo({ e, size }) {
  const name = EMOJI3D[e];
  if (WEB && name) return <Pic src={{ uri: `art/${name}.webp` }} width={size} height={size} />;
  return <Text style={{ fontSize: size * 0.86, lineHeight: size * 1.1, textAlign: 'center' }}>{e}</Text>;
}

// ───────── 全身立繪 ─────────
export function Sprite({ age, stage: st, gender = 'male', height = 200, style }) {
  const stage = st || stageOf(age);
  const id = cid(stage, gk(gender));
  const [w, h] = SIZE[id];
  return <Pic src={PHOTO[`char_${id}`]} width={(height * w) / h} height={height} style={style} />;
}

// 一開始就把 24 張人物圖先載好，事件跳出來時不用等
if (WEB && typeof window !== 'undefined') {
  setTimeout(() => {
    Object.keys(PHOTO).filter((k) => k.startsWith('char_') || k.startsWith('head_')).forEach((k) => {
      const im = new window.Image(); im.src = PHOTO[k].uri;
    });
    Object.values(EMOJI3D).forEach((n) => { const im = new window.Image(); im.src = `art/${n}.webp`; });
  }, 300);
}

// ───────── 事件場景：主角（＋另一半／寶寶）＋道具，含淡入、滑入、縮放、表情 ─────────
const PAL = {
  warm: ['#5b4326', '#1d2257'], love: ['#5e2c72', '#22195a'], red: ['#5c2233', '#1b1a48'],
  green: ['#1d5552', '#172457'], blue: ['#24449a', '#161f52'], purple: ['#3f33a0', '#1a1d58'],
  night: ['#2a2f7a', '#101540'], sunset: ['#b8634a', '#3a2a6a'],
};
// [emoji, x%, y%, 大小, 會飄]
const KIND = {
  zhuazhou: { pal: 'purple', mood: '😆', props: [['🪙', 64, 60, 26, 1], ['📚', 80, 28, 26], ['🎤', 88, 66, 22, 1], ['🧸', 74, 82, 20]] },
  baby: { pal: 'love', mood: '😆', props: [['🍼', 68, 34, 28, 1], ['🧸', 84, 66, 26], ['⭐', 88, 20, 16, 1]] },
  school: { pal: 'blue', mood: '😊', props: [['🏫', 76, 42, 40], ['✏️', 62, 22, 20, 1], ['🎒', 90, 76, 24]] },
  teen: { pal: 'blue', mood: '😊', props: [['🎓', 74, 34, 36, 1], ['📖', 88, 70, 22], ['✨', 62, 22, 16, 1]] },
  exam: { pal: 'blue', mood: '😬', props: [['📝', 72, 50, 36], ['✏️', 86, 26, 22, 1], ['💯', 86, 76, 22, 1]] },
  study: { pal: 'blue', mood: '🤓', props: [['📚', 72, 56, 34], ['💡', 86, 22, 24, 1], ['✏️', 62, 28, 18, 1]] },
  love: { pal: 'love', mood: '😍', partner: true, props: [['💕', 66, 18, 24, 1], ['🧋', 86, 72, 24], ['✨', 84, 36, 16, 1]] },
  wedding: { pal: 'love', mood: '🥰', partner: true, props: [['💍', 66, 20, 26, 1], ['💐', 86, 66, 28], ['🎊', 86, 26, 22, 1]] },
  family: { pal: 'warm', mood: '😊', props: [['🏠', 82, 46, 34], ['💞', 58, 18, 20, 1]] },
  party: { pal: 'purple', mood: '🥳', props: [['🎉', 74, 28, 30, 1], ['🥂', 86, 66, 26], ['🎈', 64, 58, 24, 1]] },
  deal: { pal: 'night', mood: '😎', props: [['🤝', 74, 42, 32], ['📄', 88, 72, 24], ['🏢', 88, 22, 24]] },
  startup: { pal: 'warm', mood: '🤩', props: [['🚀', 74, 34, 34, 1], ['🏢', 88, 70, 26], ['💡', 62, 20, 20, 1]] },
  pet: { pal: 'green', mood: '🥰', props: [['🐶', 74, 74, 34, 1], ['🦴', 88, 46, 20], ['🐾', 64, 28, 18, 1]] },
  social: { pal: 'purple', mood: '😎', props: [['💕', 70, 34, 30, 1], ['✨', 86, 70, 24, 1]] },
  crash: { pal: 'red', mood: '😰', bad: true, props: [['💸', 90, 70, 24, 1], ['⚡', 88, 24, 20, 1]] },
  broke: { pal: 'red', mood: '😵', bad: true, props: [['🪫', 74, 50, 30], ['💸', 88, 26, 22, 1], ['🍜', 88, 74, 22]] },
  bull: { pal: 'green', mood: '🤩', props: [['📈', 74, 40, 36, 1], ['💰', 88, 72, 26, 1], ['🚀', 62, 20, 20, 1]] },
  money: { pal: 'warm', mood: '😎', props: [['💰', 74, 52, 32, 1], ['📊', 88, 24, 24], ['🪙', 62, 74, 20, 1]] },
  gift: { pal: 'warm', mood: '🤩', props: [['🎁', 74, 58, 34, 1], ['🧧', 88, 26, 24, 1], ['✨', 62, 22, 16, 1]] },
  hospital: { pal: 'red', mood: '😷', bad: true, props: [['🏥', 76, 40, 34], ['💊', 62, 68, 22, 1], ['🩺', 90, 72, 22]] },
  sport: { pal: 'green', mood: '😤', props: [['⚽', 74, 72, 28, 1], ['👟', 88, 40, 24], ['🏅', 62, 22, 22, 1]] },
  car: { pal: 'blue', mood: '😎', props: [['🚗', 76, 70, 36, 1], ['🔑', 62, 28, 22, 1], ['⛽', 90, 30, 20]] },
  house: { pal: 'green', mood: '😊', props: [['🏡', 76, 50, 40], ['🔑', 62, 26, 22, 1], ['✨', 90, 20, 16, 1]] },
  talent: { pal: 'purple', mood: '😆', props: [['🎸', 74, 60, 32], ['🎵', 64, 24, 22, 1], ['🎤', 88, 30, 24, 1]] },
  talent_piano: { pal: 'purple', mood: '😌', props: [['🎹', 74, 62, 34], ['🎵', 64, 24, 22, 1], ['🎶', 88, 30, 22, 1]] },
  talent_violin: { pal: 'purple', mood: '😌', props: [['🎻', 74, 60, 34], ['🎵', 64, 24, 22, 1], ['🎶', 88, 30, 22, 1]] },
  talent_drum: { pal: 'purple', mood: '🤘', props: [['🥁', 74, 62, 34], ['🎵', 64, 24, 22, 1], ['💥', 88, 30, 22, 1]] },
  talent_sing: { pal: 'purple', mood: '😆', props: [['🎤', 74, 50, 34, 1], ['🎵', 64, 24, 22, 1], ['🎶', 88, 70, 22, 1]] },
  talent_dance: { pal: 'purple', mood: '😆', props: [['💃', 74, 54, 32, 1], ['🪩', 88, 24, 24, 1], ['🎵', 62, 24, 20, 1]] },
  talent_magic: { pal: 'night', mood: '😏', props: [['🎩', 74, 56, 32], ['🪄', 62, 26, 22, 1], ['✨', 88, 28, 20, 1]] },
  talent_paint: { pal: 'purple', mood: '😊', props: [['🎨', 74, 56, 34], ['🖌️', 62, 26, 22, 1], ['🖼️', 88, 30, 24]] },
  travel: { pal: 'blue', mood: '😆', props: [['✈️', 74, 24, 30, 1], ['🧳', 86, 72, 28], ['🗺️', 62, 64, 20]] },
  job: { pal: 'night', mood: '😤', props: [['💼', 74, 60, 32], ['📄', 88, 26, 22, 1], ['🤝', 62, 26, 20]] },
  office: { pal: 'night', mood: '🙂', props: [['💻', 74, 62, 32], ['☕', 90, 74, 20], ['📊', 86, 24, 24, 1]] },
  desk: { pal: 'night', mood: '🙂', props: [['💻', 74, 62, 32], ['☕', 90, 74, 20], ['📊', 86, 24, 24, 1]] },
  company: { pal: 'purple', mood: '😎', props: [['🏢', 76, 46, 38], ['📈', 62, 22, 22, 1], ['👔', 90, 74, 22]] },
  city: { pal: 'night', mood: '😎', props: [['🏙️', 76, 46, 40], ['👑', 62, 20, 24, 1], ['💎', 90, 74, 22, 1]] },
  retire: { pal: 'sunset', mood: '😌', props: [['🌅', 78, 28, 34], ['🍵', 64, 72, 22], ['🪑', 88, 74, 26]] },
  trophy: { pal: 'warm', mood: '😆', props: [['🏆', 74, 46, 38, 1], ['⭐', 62, 20, 20, 1], ['🎖️', 90, 74, 22]] },
};

// 構圖：畫面大約看到哪裡（1 = 剛好全身）
const ZOOM = { baby: 0.82, kid: 1.25, teen: 1.42, young: 1.5, mid: 1.5, old: 1.5 };

// 依事件內容決定要不要出現另一半、寶寶
export function castFor(kind, s, text = '') {
  if (!s) return {};
  const adult = s.age >= 20;
  const mate = s.spouse || s.partner;
  const cast = {};
  if ((kind === 'love' || kind === 'wedding') && s.age >= 13) cast.partner = true;
  if (kind === 'family' && adult && mate) {
    const parents = /爸媽|爸爸|媽媽|阿嬤|阿公|家人|長輩|起步資金/.test(text);
    cast.partner = !!s.spouse && !parents;
    if (s.spouse && /懷孕|寶寶|孩子|小孩|出生|坐月子|生一個|生小孩/.test(text)) {
      cast.partner = true;
      const last = (s.kids || [])[s.kids.length - 1];
      cast.baby = last && last.gender === 'female' ? 'female' : last ? 'male' : (text.length % 2 ? 'female' : 'male');
    }
  }
  if ((kind === 'retire' || kind === 'house' || kind === 'travel') && adult && s.spouse) cast.partner = true;
  return cast;
}

function useLoop(ms, on = true) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [on]);
  return v;
}

function Prop({ e, x, y, size, float, delay, k }) {
  const inV = useRef(new Animated.Value(0)).current;
  const fl = useLoop(1300 + (k % 3) * 250, !!float);
  useEffect(() => {
    Animated.timing(inV, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.back(1.6)), useNativeDriver: ND }).start();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: `${x}%`, top: `${y}%`,
        opacity: inV,
        transform: [
          { translateX: -size / 2 }, { translateY: -size / 2 },
          { translateY: Animated.add(inV.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }), fl.interpolate({ inputRange: [0, 1], outputRange: [0, -4] })) },
          { scale: inV.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
        ],
      }}
    >
      <Emo e={e} size={size} />
    </Animated.View>
  );
}

// 一個出場的人（主角／另一半／寶寶）
function Actor({ age, stage, gender, h, left, from = -1, delay = 0, bad, bob, anchor = 'top', top = 0, bottom = 0, z = 1 }) {
  const inV = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(inV, { toValue: 1, duration: 520, delay, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, []);
  const pos = anchor === 'top' ? { top } : { bottom };
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left, ...pos, zIndex: z,
        opacity: inV,
        transform: [
          { translateX: inV.interpolate({ inputRange: [0, 1], outputRange: [from * 26, 0] }) },
          { translateY: bob ? bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] }) : 0 },
          { scale: inV.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
          { rotate: bad ? '-2.5deg' : '0deg' },
        ],
        ...(WEB && bad ? { filter: 'saturate(0.75) brightness(0.92)' } : null),
      }}
    >
      <Sprite age={age} stage={stage} gender={gender} height={h} />
    </Animated.View>
  );
}

// 頭頂的心情泡泡：先淡淡的 🙂，再換成當下的表情
function Bubble({ mood, left, top, size }) {
  const pop = useRef(new Animated.Value(0)).current;
  const [face, setFace] = useState('🙂');
  useEffect(() => {
    setFace('🙂');
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 300, delay: 380, easing: Easing.out(Easing.back(2)), useNativeDriver: ND }).start();
    const t = setTimeout(() => {
      setFace(mood);
      pop.setValue(0.55);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 150, useNativeDriver: ND }).start();
    }, 950);
    return () => clearTimeout(t);
  }, [mood]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left, top, zIndex: 5, width: size, height: size, borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center',
        opacity: pop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
        transform: [{ scale: pop }],
      }}
    >
      <Emo e={face} size={size * 0.8} />
    </Animated.View>
  );
}

// ───────── 股市崩盤動畫：左上角一張小 K 線圖，先小漲、再一路崩下去，紅光閃、數字往下跳，畫完停一下再重播 ─────────
const CRASH_PTS = [0.55, 0.5, 0.52, 0.44, 0.47, 0.4, 0.43, 0.38, 0.5, 0.46, 0.62, 0.58, 0.74, 0.7, 0.86, 0.82, 0.95];
function CrashChart({ w, h, pct = 20 }) {
  const [n, setN] = useState(1);
  const shake = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let i = 1;
    let hold = 0;
    const id = setInterval(() => {
      if (i < CRASH_PTS.length) {
        i += 1;
        setN(i);
        if (i === 9) {
          // 開始崩：畫面抖一下、紅光閃
          Animated.sequence([
            Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: ND }),
            Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: ND }),
            Animated.timing(shake, { toValue: 0.6, duration: 60, useNativeDriver: ND }),
            Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: ND }),
          ]).start();
          Animated.sequence([
            Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: ND }),
            Animated.timing(flash, { toValue: 0, duration: 600, useNativeDriver: ND }),
          ]).start();
        }
      } else {
        hold += 1;
        if (hold > 14) { i = 1; hold = 0; setN(1); }
      }
    }, 110);
    return () => clearInterval(id);
  }, []);
  const pad = 6;
  const pts = CRASH_PTS.slice(0, n).map((v, i) => `${pad + (i / (CRASH_PTS.length - 1)) * (w - pad * 2)},${pad + v * (h - pad * 2 - 14)}`).join(' ');
  const last = CRASH_PTS[n - 1];
  const falling = n > 8;
  const shown = falling ? Math.round((pct * (n - 8)) / (CRASH_PTS.length - 8)) : 0;
  const lx = pad + ((n - 1) / (CRASH_PTS.length - 1)) * (w - pad * 2);
  const ly = pad + last * (h - pad * 2 - 14);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: 10, top: 10, width: w, height: h, borderRadius: 12, overflow: 'hidden',
        backgroundColor: 'rgba(10,8,30,0.55)', borderWidth: 1, borderColor: 'rgba(255,93,82,0.45)',
        transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) }],
      }}
    >
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: '#ff3b30', opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }} />
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="crashFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ff5d52" stopOpacity="0.45" />
            <Stop offset="1" stopColor="#ff5d52" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((g) => <Line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)}
        <Path d={`M${pad},${h} L${pts.split(' ').join(' L')} L${lx},${h} Z`} fill="url(#crashFill)" />
        <Polyline points={pts} fill="none" stroke={falling ? '#ff5d52' : '#3ddc97'} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', left: Math.min(lx - 5, w - 12), top: ly - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: falling ? '#ff5d52' : '#3ddc97', borderWidth: 2, borderColor: '#fff' }} />
      <Text style={{ position: 'absolute', left: 8, bottom: 4, fontSize: 12, fontWeight: '800', color: falling ? '#ff8a80' : '#9aa3d0' }}>
        {falling ? `📉 −${shown}%` : '📈 大盤'}
      </Text>
    </Animated.View>
  );
}

// ───────── 社群帳號：右邊一支手機，裡面是主角自己的作品帳號（頭像、粉絲數往上跳、照片牆、愛心）─────────
const TILE_BG = ['#ffb38a', '#8fd3ff', '#c7a6ff', '#9be7c4', '#ffd76a', '#ff9fc4'];
const TILE_ICON = ['📸', '🌅', '☕', '✈️', '🌸', '✨'];
function hashStr(t) { let h = 0; for (let i = 0; i < t.length; i += 1) h = (h * 31 + t.charCodeAt(i)) % 100000; return h; }
export function SocialPhone({ age = 22, gender = 'male', name = '我', height = 150, style }) {
  const pw = Math.round(height * 0.6);
  const ph = height;
  const target = 800 + (hashStr(name + age) % 9000);
  const [fans, setFans] = useState(0);
  const heart = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      v = Math.min(target, v + Math.ceil(target / 18));
      setFans(v);
      if (v >= target) clearInterval(id);
    }, 60);
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(700),
      Animated.timing(heart, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: ND }),
      Animated.timing(heart, { toValue: 0, duration: 500, delay: 400, useNativeDriver: ND }),
    ]));
    loop.start();
    return () => { clearInterval(id); loop.stop(); };
  }, []);
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
  const handle = `@${name}.photo`;
  const pad = Math.round(pw * 0.06);
  const tile = Math.floor((pw - 6 - pad * 2 - 5) / 3);
  const id = cid(stageOf(age), gk(gender));
  const avatar = Math.round(pw * 0.26);
  const fs = Math.max(8, Math.round(pw * 0.075));
  return (
    <View pointerEvents="none" style={[{ width: pw, height: ph, borderRadius: pw * 0.14, backgroundColor: '#0b0d1f', borderWidth: 3, borderColor: '#2a2f55', overflow: 'hidden', padding: pad, paddingTop: pad * 1.6 }, style]}>
      {/* 瀏海 */}
      <View style={{ position: 'absolute', top: 3, left: pw * 0.34, width: pw * 0.3, height: pad * 0.8, borderRadius: 6, backgroundColor: '#000' }} />
      <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: fs * 1.05 }}>{handle}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: pad * 0.7, gap: pad * 0.8 }}>
        <View style={{ width: avatar, height: avatar, borderRadius: avatar / 2, padding: 2, backgroundColor: '#ff5fa2' }}>
          <View style={{ flex: 1, borderRadius: avatar / 2, overflow: 'hidden', backgroundColor: IDENT[gk(gender)].main }}>
            <Pic src={PHOTO[`head_${id}`]} width="100%" height="100%" cover />
          </View>
        </View>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
          {[['貼文', '6'], ['粉絲', fmt(fans)], ['追蹤', '128']].map(([k, v]) => (
            <View key={k} style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: fs }}>{v}</Text>
              <Text style={{ color: '#9aa3d0', fontSize: fs * 0.8 }}>{k}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ marginTop: pad * 0.6, borderRadius: 6, backgroundColor: '#6a5cff', paddingVertical: 2, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs * 0.85 }}>追蹤</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: pad * 0.6 }}>
        {TILE_BG.map((bg, i) => (
          <View key={bg} style={{ width: tile, height: tile, backgroundColor: bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
            {i % 2 === 0 ? (
              <Pic src={PHOTO[`head_${id}`]} width={tile * 0.95} height={tile * 0.95} cover />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Emo e={TILE_ICON[i]} size={tile * 0.6} /></View>
            )}
          </View>
        ))}
      </View>
      {/* 愛心一直跳 */}
      <Animated.View style={{ position: 'absolute', right: pad, top: ph * 0.62, opacity: heart, transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }, { translateY: heart.interpolate({ inputRange: [0, 1], outputRange: [8, -6] }) }] }}>
        <Text style={{ fontSize: pw * 0.2 }}>❤️</Text>
      </Animated.View>
    </View>
  );
}

// ───────── 同學會：右邊排一排同學（頭像＋名字＋名次／資產），一個一個冒出來 ─────────
function MateBubble({ m, size, delay, age }) {
  const inV = useRef(new Animated.Value(0)).current;
  const bob = useLoop(1400 + (delay % 400), true);
  useEffect(() => {
    Animated.timing(inV, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.back(1.8)), useNativeDriver: ND }).start();
  }, []);
  const top = m.rank === 1;
  return (
    <Animated.View
      style={{
        alignItems: 'center', width: size * 1.3, opacity: inV,
        transform: [
          { scale: inV.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
        ],
      }}
    >
      <View style={{ borderRadius: size, padding: 2, backgroundColor: top ? '#ffd76a' : 'rgba(255,255,255,0.25)' }}>
        <Avatar name={m.name} gender={m.gender} age={age} size={size} />
      </View>
      <View style={{ position: 'absolute', top: -4, right: size * 0.05, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: top ? '#f5a524' : '#6a5cff' }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{top ? '👑' : m.rank}</Text>
      </View>
      <Text numberOfLines={1} style={{ color: '#fff', fontSize: Math.max(10, size * 0.26), fontWeight: '700', marginTop: 3 }}>{m.name}</Text>
      <Text numberOfLines={1} style={{ color: top ? '#ffd76a' : '#b8c0ee', fontSize: Math.max(9, size * 0.22), fontWeight: '600' }}>{m.label}</Text>
    </Animated.View>
  );
}
function Crowd({ mates, w, height, age }) {
  const others = mates.filter((m) => !m.me).slice(0, 5);
  const areaW = w * 0.62;
  const size = Math.round(Math.min(height * 0.34, areaW / (others.length * 1.35)));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: w * 0.36, width: areaW, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
      {others.map((m, i) => (
        <View key={m.name} style={{ marginTop: i % 2 ? height * 0.14 : -height * 0.06 }}>
          <MateBubble m={m} size={size} delay={250 + i * 140} age={age} />
        </View>
      ))}
    </View>
  );
}

// ───────── 同學會選完之後的小劇場（依你選的選項）─────────
function CreditCard({ w }) {
  const h = w * 0.63;
  return (
    <View style={[{ width: w, height: h, borderRadius: w * 0.08, backgroundColor: '#d4a73a', padding: w * 0.08, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
      WEB ? { backgroundImage: 'linear-gradient(135deg, #fff1b8 0%, #e8b64a 40%, #b8862a 100%)', boxShadow: '0 6px 18px rgba(255,200,80,0.55)' } : null]}
    >
      <View style={{ width: w * 0.2, height: w * 0.15, borderRadius: 3, backgroundColor: '#f6e2a0', borderWidth: 1, borderColor: '#b8862a' }} />
      <View style={{ flexDirection: 'row', gap: w * 0.04, marginTop: h * 0.18 }}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={{ width: w * 0.16, height: 3, borderRadius: 2, backgroundColor: 'rgba(80,50,10,0.55)' }} />)}
      </View>
      <Text style={{ position: 'absolute', right: w * 0.07, bottom: h * 0.08, fontSize: w * 0.13, fontWeight: '900', color: '#5a3a0a', fontStyle: 'italic' }}>VIP</Text>
    </View>
  );
}

function RivalChart({ me, rival, rivalName, w, h }) {
  const [n, setN] = useState(2);
  const len = me.length;
  useEffect(() => {
    let i = 2;
    const id = setInterval(() => { i += 1; setN(Math.min(i, len)); if (i >= len) clearInterval(id); }, Math.max(40, 1600 / len));
    return () => clearInterval(id);
  }, [len]);
  const all = [...me, ...rival].filter((v) => Number.isFinite(v));
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const px = (i) => 12 + (i / Math.max(1, len - 1)) * (w - 24);
  const py = (v) => h - 22 - ((v - min) / (max - min || 1)) * (h - 44);
  const pts = (arr) => arr.slice(0, n).map((v, i) => `${px(i)},${py(v)}`).join(' ');
  const last = (arr) => ({ x: px(n - 1), y: py(arr[n - 1]) });
  const L1 = last(me); const L2 = last(rival);
  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h}>
        {[0.25, 0.5, 0.75].map((g) => <Line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)}
        <Polyline points={pts(rival)} fill="none" stroke="#ff6b6b" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        <Polyline points={pts(me)} fill="none" stroke="#ffd76a" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', left: L2.x - 5, top: L2.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff6b6b', borderWidth: 2, borderColor: '#fff' }} />
      <View style={{ position: 'absolute', left: L1.x - 5, top: L1.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffd76a', borderWidth: 2, borderColor: '#fff' }} />
      <View style={{ position: 'absolute', left: 10, top: 6, flexDirection: 'row', gap: 12 }}>
        <Text style={{ color: '#ffd76a', fontWeight: '800', fontSize: 12 }}>━ 你</Text>
        <Text style={{ color: '#ff8a8a', fontWeight: '800', fontSize: 12 }}>━ {rivalName}</Text>
      </View>
    </View>
  );
}

// ───────── 同學會舞台：固定餐廳背景＋中間是你＋周圍是「本次抽到的五位同學」（全身）─────────
// 同學資料一律來自 selectedClassmates(game)（跟排名名單、事件文字同一份），用每位同學固定的 characterAsset 載入全身人物。
// CM：[寬, 高, 頭中心 x（佔寬度）, 頭寬（佔寬度）]
const CM = {
  civil_f: [372, 640, 0.463, 0.253], designer_f: [398, 640, 0.454, 0.226], engineer_m: [359, 640, 0.562, 0.248],
  founder_m: [399, 640, 0.5, 0.208], nurse_f: [397, 640, 0.434, 0.254], owner_m: [392, 640, 0.487, 0.199],
  photo_m: [381, 640, 0.516, 0.218], sales_m: [407, 640, 0.52, 0.204], teacher_f: [409, 640, 0.434, 0.203],
};
const cmKey = (a) => { const k = String(a || '').replace('*', ''); return CM[k] ? k : 'sales_m'; };
const cmSrc = (a) => PHOTO[`cm_${cmKey(a)}`];
// 換裝版（同性別的素材不夠時）：左右翻轉＋換衣服顏色
const isAlt = (a) => String(a || '').includes('*');
const altLook = (a) => (isAlt(a) ? [{ transform: [{ scaleX: -1 }] }, WEB ? { filter: 'brightness(0.92) contrast(1.05)' } : null] : null);
const cmW = (a, h) => { const [w, hh] = CM[cmKey(a)]; return (h * w) / hh; };
const cmHead = (a) => { const [, , cx, hw] = CM[cmKey(a)]; return { cx: isAlt(a) ? 1 - cx : cx, hw }; };

function MateFigure({ asset, height }) {
  return <Pic src={cmSrc(asset)} width={cmW(asset, height)} height={height} style={altLook(asset)} />;
}

// 名單用的小頭像：從全身圖取頭部
export function MateFace({ asset, size = 34, style }) {
  const { cx, hw } = cmHead(asset);
  const fw = (size * 0.78) / hw;
  const fh = (fw * CM[cmKey(asset)][1]) / CM[cmKey(asset)][0];
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#2a3478' }, style]}>
      <Pic src={cmSrc(asset)} width={fw} height={fh} style={[{ marginLeft: size / 2 - cx * fw, marginTop: size * 0.06 }, altLook(asset)]} />
    </View>
  );
}

const LABEL_H = 30;
// 版面：你在正中間最前面；同學依序 左1、右1、左2、右2、左3… 越外圈越小、越靠後。
// 檢查每個人的「臉」左右不重疊、也不超出畫面，不行就整體縮小。
function reunionLayout(mates, w, h, heroId, heroH0) {
  const base = h - LABEL_H;
  let f = 1;
  for (let tries = 0; tries < 30; tries += 1) {
    const heroH = heroH0 * f;
    const heroW = (heroH * SIZE[heroId][0]) / SIZE[heroId][1];
    const heroHead = { x: w / 2 - heroW / 2 + HEAD[heroId][0] * heroW, hw: HEAD[heroId][1] * heroH * 0.75 };
    const items = mates.map((m, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const ring = Math.floor(i / 2) + 1;
      const fh = heroH * (0.9 - 0.05 * (ring - 1));
      const fw = cmW(m.characterAsset, fh);
      const hd = cmHead(m.characterAsset);
      return { m, side, ring, fh, fw, hd, lift: 5 * (ring - 1) };
    });
    // 每一圈的距離：夠放下臉就好
    const maxRing = Math.max(1, ...items.map((it) => it.ring));
    const step = Math.min((w / 2 - 6) / (maxRing + 0.35), heroW * 0.9 + 40);
    items.forEach((it) => {
      const headX = w / 2 + it.side * it.ring * step;
      it.x = headX - it.hd.cx * it.fw;
      it.headX = headX; it.headW = it.hd.hw * it.fw;
      it.y = base - it.lift - it.fh;
    });
    const heads = [{ x: heroHead.x, hw: heroHead.hw }, ...items.map((it) => ({ x: it.headX, hw: it.headW }))].sort((a, b) => a.x - b.x);
    let ok = heads.every((hd, i) => i === 0 || hd.x - heads[i - 1].x >= (hd.hw + heads[i - 1].hw) / 2 + 3);
    ok = ok && heads[0].x - heads[0].hw / 2 >= 2 && heads[heads.length - 1].x + heads[heads.length - 1].hw / 2 <= w - 2;
    if (ok || tries === 29) return { items, heroH, heroW, step, base };
    f *= 0.94;
  }
  return null;
}

function MateActor({ it, delay, mode, idx, labelW }) {
  const inV = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(inV, { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.back(1.4)), useNativeDriver: ND }).start();
    if (mode !== 'treat' && mode !== 'info') return undefined;
    // 請客：大家歡呼跳起來｜交換情報：輕輕點頭
    const up = mode === 'treat' ? 1 : 0.3;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(idx * 110),
      Animated.timing(hop, { toValue: up, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.timing(hop, { toValue: 0, duration: 320, easing: Easing.in(Easing.bounce), useNativeDriver: ND }),
      Animated.delay(mode === 'treat' ? 360 : 900),
    ]));
    const t = setTimeout(() => loop.start(), 700);
    return () => { clearTimeout(t); loop.stop(); };
  }, [mode]);
  const tilt = mode === 'info' ? (idx % 2 ? '4deg' : '-4deg') : '0deg';
  const deco = mode === 'treat' ? ['🙌', '🎉', '👏', '🥳', '🎊'][idx % 5]
    : mode === 'quiet' ? (idx % 2 ? '🍵' : '🍜')
      : mode === 'info' ? (idx % 2 ? '💬' : '📱') : null;
  const emo = Math.max(18, Math.min(30, it.headW * 0.9));
  // 道具位置：歡呼／對話在頭上，吃飯／手機在胸前
  const decoTop = mode === 'treat' || deco === '💬' ? -emo - 2 : it.fh * 0.36;
  return (
    <>
      <Animated.View style={{
        position: 'absolute', left: it.x, top: it.y, opacity: inV,
        transform: [
          { translateY: Animated.add(inV.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }), hop.interpolate({ inputRange: [0, 1], outputRange: [0, -it.fh * 0.09] })) },
          { rotate: tilt },
        ],
      }}>
        <View style={{ opacity: mode === 'quiet' ? 0.85 : 1 }}><MateFigure asset={it.m.characterAsset} height={it.fh} /></View>
        {deco ? <View style={{ position: 'absolute', left: it.hd.cx * it.fw - emo / 2 + (mode === 'treat' || deco === '💬' ? 0 : it.headW * 0.3), top: decoTop }}><Emo e={deco} size={emo} /></View> : null}
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: it.headX - labelW / 2, bottom: 2, width: labelW, opacity: inV, alignItems: 'center' }}>
        <Text numberOfLines={1} style={{ color: '#fff', fontSize: 10.5, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 }}>{it.m.name}</Text>
        <Text numberOfLines={1} style={{ color: '#d4dafc', fontSize: 9, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 }}>{it.m.title || '同學'}</Text>
      </Animated.View>
    </>
  );
}

const reunionMode = (choice) => (!choice ? 'intro' : /請客/.test(choice) ? 'treat' : /投資情報/.test(choice) ? 'info' : /拚/.test(choice) ? 'rival' : 'quiet');

export function ReunionStage({ game, choice, height = 330, style }) {
  const [w, setW] = useState(0);
  const inV = useRef(new Animated.Value(0)).current;
  const act = useRef(new Animated.Value(0)).current;
  const loop = useLoop(900, true);
  const mode = reunionMode(choice);
  useEffect(() => {
    Animated.timing(inV, { toValue: 1, duration: 500, useNativeDriver: ND }).start();
    Animated.timing(act, { toValue: 1, duration: 750, delay: 300, easing: Easing.out(Easing.back(1.4)), useNativeDriver: ND }).start();
  }, []);
  const mates = selectedClassmates(game).slice(0, 5); // 只有這次抽到的五位
  const age = game.age; const gender = game.gender;
  const heroId = cid(stageOf(age), gk(gender));
  const heroH0 = height - LABEL_H - 46; // 頭上留空間給信用卡
  const L = w && mode !== 'rival' ? reunionLayout(mates, w, height, heroId, heroH0) : null;

  let rivalData = null; let rivalMate = null;
  if (mode === 'rival') {
    const list = ranking(game, netWorthOf(game));
    const top = list.find((x) => !x.me);
    if (top) {
      rivalMate = mates.find((m) => m.id === top.id) || top;
      const from = Math.min(22, Math.max(0, age - 4));
      const ages = []; for (let a = from; a <= age; a += 1) ages.push(a);
      const mine = ages.map((a) => (game.history && game.history[a] != null ? game.history[a] : 0));
      const theirs = ages.map((a, i) => {
        if (top.hist && top.hist[a] != null) return top.hist[a];
        const t = i / Math.max(1, ages.length - 1);
        return top.nw * t * t; // 舊存檔沒有紀錄：從 0 慢慢長到現在
      });
      rivalData = { mine, theirs, name: top.name };
    }
  }
  const heroH = L ? L.heroH : heroH0;
  const heroW = (heroH * SIZE[heroId][0]) / SIZE[heroId][1];
  const heroLeft = mode === 'rival' ? w * 0.66 - HEAD[heroId][0] * heroW : w / 2 - heroW / 2;
  const heroBottom = LABEL_H;
  const labelW = L ? Math.max(40, Math.min(70, L.step - 2)) : 60;
  // 拚一下：第一名站在你旁邊
  let rv = null;
  if (mode === 'rival' && rivalMate && w) {
    const fh = heroH * 0.88; const fw = cmW(rivalMate.characterAsset, fh); const hd = cmHead(rivalMate.characterAsset);
    const headX = w * 0.88;
    rv = { m: rivalMate, fh, fw, hd, headX, headW: hd.hw * fw, x: headX - hd.cx * fw, y: height - LABEL_H - fh };
  }
  return (
    <Animated.View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ width: '100%', height, borderRadius: 18, overflow: 'hidden', backgroundColor: '#15183d', opacity: inV }, style]}>
      {/* 固定的餐廳場景 */}
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, transform: [{ scale: inV.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }) }] }}>
        <Pic src={PHOTO.restaurant} width="100%" height="100%" cover />
      </Animated.View>
      <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: LABEL_H + 16, backgroundColor: 'rgba(8,10,30,0.35)' }, WEB ? { backgroundImage: 'linear-gradient(180deg, rgba(8,10,30,0) 0%, rgba(8,10,30,0.75) 70%)', backgroundColor: 'transparent' } : null]} />
      {mode === 'quiet' ? <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(8,10,30,0.3)' }} /> : null}
      {w > 0 ? (
        <>
          {mode === 'rival' && rivalData ? (
            <Animated.View style={{ position: 'absolute', left: 10, top: 10, width: w * 0.54, height: height - 20, borderRadius: 12, backgroundColor: 'rgba(10,8,30,0.72)', borderWidth: 1, borderColor: 'rgba(255,215,106,0.35)', opacity: act }}>
              <RivalChart me={rivalData.mine} rival={rivalData.theirs} rivalName={rivalData.name} w={w * 0.54} h={height - 20} />
            </Animated.View>
          ) : null}
          {/* 周圍：本次的五位同學（外圈先畫，越靠近你越前面） */}
          {L ? [...L.items].sort((a, b) => b.ring - a.ring).map((it) => (
            <MateActor key={it.m.id} it={it} delay={200 + mates.indexOf(it.m) * 110} mode={mode} idx={mates.indexOf(it.m)} labelW={labelW} />
          )) : null}
          {rv ? <MateActor it={rv} delay={250} mode="rival" idx={0} labelW={64} /> : null}
          {/* 中間：你 */}
          <Animated.View style={{
            position: 'absolute', left: heroLeft, bottom: heroBottom,
            transform: [
              { translateY: act.interpolate({ inputRange: [0, 1], outputRange: mode === 'treat' ? [height * 0.18, 0] : [14, 0] }) },
              { scale: act.interpolate({ inputRange: [0, 1], outputRange: [0.95, mode === 'treat' ? 1.05 : 1] }) },
            ],
          }}>
            <Sprite age={age} gender={gender} height={heroH} />
          </Animated.View>
          <View style={{ position: 'absolute', left: (mode === 'rival' ? heroLeft + HEAD[heroId][0] * heroW : w / 2) - 30, bottom: 2, width: 60, alignItems: 'center' }}>
            <Text style={{ color: '#ffd76a', fontSize: 11, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 }}>你</Text>
            <Text numberOfLines={1} style={{ color: '#ffe9a8', fontSize: 9, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 }}>{game.name}</Text>
          </View>
          {mode === 'treat' ? (
            <>
              {/* 站起來高舉信用卡 */}
              <Animated.View style={{
                position: 'absolute', left: w / 2 + 2, top: 4,
                transform: [
                  { translateY: act.interpolate({ inputRange: [0, 1], outputRange: [height * 0.45, 0] }) },
                  { rotate: loop.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '8deg'] }) },
                ],
              }}>
                <CreditCard w={58} />
              </Animated.View>
              <Animated.View style={{ position: 'absolute', left: w / 2 - 128, top: 8, width: 120, alignItems: 'flex-end', opacity: act, transform: [{ scale: act }] }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4 }}><Text style={{ fontWeight: '900', color: '#1b1b24', fontSize: 12 }}>今天我請客！</Text></View>
              </Animated.View>
            </>
          ) : null}
          {mode === 'info' ? (
            <Animated.View style={{ position: 'absolute', left: w / 2 - 70, top: 8, width: 140, alignItems: 'center', opacity: loop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ fontSize: 12, fontWeight: '800', color: '#1b1b24' }}>💬 這支會漲嗎？</Text></View>
            </Animated.View>
          ) : null}
          {mode === 'quiet' ? (
            <Animated.View style={{ position: 'absolute', left: w / 2 - 50, top: 8, width: 100, alignItems: 'center', opacity: act }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 }}><Text style={{ fontSize: 16, fontWeight: '900', color: '#555' }}>……</Text></View>
            </Animated.View>
          ) : null}
        </>
      ) : null}
    </Animated.View>
  );
}

export function CharScene({
  kind = 'desk', age = 22, gender = 'male', partner, baby, mood, bad: badIn, height = 150, radius = 18, style, full, noProps, crashPct, compact: compactIn, name, hidePhone, mates,
}) {
  const cfg = KIND[kind] || KIND.desk;
  const pal = PAL[cfg.pal] || PAL.night;
  const [w, setW] = useState(0);
  const bob = useLoop(1500);
  const stage = stageOf(age);
  const bad = badIn != null ? badIn : !!cfg.bad;
  const face = mood || cfg.mood || '🙂';
  const other = gender === 'female' ? 'male' : 'female';
  const bigHero = !!(mates && mates.length > 1);
  const small = (compactIn != null ? compactIn : height < 110) && !full;
  const z = full ? (stage === 'baby' ? 0.8 : 0.92) : small ? (stage === 'baby' ? 1.0 : ZOOM[stage] * 1.45) : bigHero ? (stage === 'baby' ? 0.9 : ZOOM[stage] * 1.25) : ZOOM[stage];
  const heroH = height * z;
  const hid = cid(stage, gk(gender));
  const heroW = (heroH * SIZE[hid][0]) / SIZE[hid][1];
  const topPad = stage === 'baby' ? height - heroH - 2 : height * (full ? 0.05 : small ? 0.02 : 0.07);
  const withP = !!partner && stage !== 'baby';
  const crash = kind === 'crash' && !noProps;
  const social = kind === 'social' && !noProps;
  const crowd = !!(mates && mates.length > 1) && !noProps;
  const compact = compactIn != null ? compactIn : height < 110;
  const heroX = w * (compact ? 0.24 : withP ? 0.2 : crash ? 0.66 : social ? 0.26 : crowd ? 0.17 : 0.3) - heroW / 2;
  const pid = cid(stage, gk(other));
  const pH = heroH * (SIZE[pid][1] / SIZE[hid][1]);
  const pW = (pH * SIZE[pid][0]) / SIZE[pid][1];
  const pX = w * 0.42 - pW / 2;
  const s = height / 150;
  const bubble = compact ? Math.round(Math.min(height * 0.26, 30)) : Math.round(26 * Math.max(0.8, s));
  const bg = WEB
    ? { backgroundImage: `radial-gradient(120% 90% at 25% 15%, ${pal[0]} 0%, ${pal[1]} 75%)` }
    : { backgroundColor: pal[1] };
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: pal[1] }, bg, style]}
    >
      {/* 地板光 */}
      <View pointerEvents="none" style={{ position: 'absolute', left: '-10%', right: '-10%', bottom: -height * 0.35, height: height * 0.6, borderRadius: height, backgroundColor: 'rgba(255,255,255,0.07)' }} />
      {w > 0 ? (
        <>
          {social && !hidePhone && !compact ? (
            <View style={{ position: 'absolute', right: w * 0.06, top: 6 }}>
              <SocialPhone age={age} gender={gender} name={name} height={height - 12} />
            </View>
          ) : null}
          {crash ? <CrashChart w={Math.max(130, Math.min(w * 0.48, 300))} h={height - 20} pct={crashPct || 20} /> : null}
          {crowd && !compact ? <Crowd mates={mates} w={w} height={height} age={age} /> : null}
          {!noProps && !(social && !compact) && !(crowd && !compact) ? (compact
            // 小卡（主畫面右上）：只放兩個大圖示在右半邊，人物留在左邊
            ? cfg.props.slice(0, 2).map(([e, , , , float], i) => (
              <Prop key={`${kind}-${i}`} k={i} e={e} x={i ? 84 : 68} y={i ? 72 : 34} size={Math.round(height * (i ? 0.5 : 0.6))} float={float} delay={260 + i * 130} />
            ))
            : cfg.props.map(([e, x, y, size, float], i) => (
              <Prop key={`${kind}-${i}`} k={i} e={e} x={x} y={y} size={Math.round(size * 1.6 * Math.max(0.72, s))} float={float} delay={260 + i * 130} />
            ))) : null}
          {withP ? (
            <Actor age={age} stage={stage} gender={other} h={pH} left={pX} from={1} delay={160} bob={bob} top={topPad + (heroH - pH) * 0.02} z={1} />
          ) : null}
          <Actor age={age} stage={stage} gender={gender} h={heroH} left={heroX} from={-1} bad={bad} bob={bob} top={topPad} z={2} />
          {baby && stage !== 'baby' ? (
            <Actor stage="baby" gender={baby} h={height * 0.46} left={w * 0.31 - height * 0.12} from={0} delay={420} anchor="bottom" bottom={2} z={3} />
          ) : null}
          <Bubble
            mood={face} size={bubble}
            left={Math.max(4, Math.min(heroX + heroW * HEAD[hid][0] + heroH * HEAD[hid][1] * 0.42, w - bubble - 4))}
            top={Math.max(4, topPad + heroH * HEAD[hid][1] * 0.05 - bubble * 0.3)}
          />
        </>
      ) : null}
    </View>
  );
}
