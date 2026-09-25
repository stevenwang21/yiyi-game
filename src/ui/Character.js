// 主角母版：男女主角六個階段（嬰兒／國小／高中／青年／壯年／老年），全部來自同一張正式人物設定圖。
// 男主以深藍色為識別、女主以紫色為識別；遊戲裡所有主角的插圖都從這裡出，確保每個事件都是同一張臉。
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Line, Path, Polyline, RadialGradient, Stop } from 'react-native-svg';
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
  love: { pal: 'love', mood: '😍', partner: true, props: [['💕', 80, 10, 24, 1], ['🧋', 88, 74, 24], ['✨', 70, 30, 16, 1]] },
  wedding: { pal: 'love', mood: '🥰', partner: true, props: [['💍', 80, 12, 26, 1], ['💐', 88, 68, 28], ['🎊', 68, 30, 22, 1]] },
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


// ───────── 半骨架人物：把立繪切成「頭」和「身體」兩層，頭可以點頭、歪頭，身體會呼吸 ─────────
// cut：脖子在身高的幾成｜ncx：脖子中心在寬度的幾成（旋轉的軸心）
const RIG = {
  baby_m: [0.5385, 0.478], baby_f: [0.6527, 0.663], kid_m: [0.2158, 0.528], kid_f: [0.2169, 0.495],
  teen_m: [0.1733, 0.55], teen_f: [0.1728, 0.491], young_m: [0.1644, 0.557], young_f: [0.1642, 0.473],
  mid_m: [0.1659, 0.517], mid_f: [0.1641, 0.413], old_m: [0.1639, 0.535], old_f: [0.1671, 0.35],
  cm_civil_f: [0.1703, 0.457], cm_designer_f: [0.1641, 0.492], cm_engineer_m: [0.1625, 0.545],
  cm_founder_m: [0.1516, 0.426], cm_nurse_f: [0.1828, 0.494], cm_owner_m: [0.1422, 0.439],
  cm_photo_m: [0.1516, 0.484], cm_sales_m: [0.1516, 0.456], cm_teacher_f: [0.1516, 0.43],
};

// 用 translate → rotate → translate 回去，做出「繞著某個點旋轉」（RN 沒有 transformOrigin）
const pivot = (x, y, rot) => [{ translateX: x }, { translateY: y }, { rotate: rot }, { translateX: -x }, { translateY: -y }];

// mood：idle 站著呼吸｜cheer 歡呼點頭｜look 看向中間｜down 低頭
export function RigFigure({ base, width, height, mood = 'idle', delay = 0, flip, style }) {
  const g = RIG[base];
  const sway = useLoop(mood === 'cheer' ? 420 : 1700, true);
  const breathe = useLoop(2200, true);
  if (!g) return <Pic src={PHOTO[base]} width={width} height={height} style={style} />;
  const [cut, ncx] = g;
  const headH = height * cut;
  const px = width * ncx; const py = headH * 0.97;
  const tilt = mood === 'cheer' ? ['-7deg', '4deg'] : mood === 'look' ? ['2deg', '8deg'] : mood === 'down' ? ['4deg', '9deg'] : ['-2.5deg', '2.5deg'];
  const rot = sway.interpolate({ inputRange: [0, 1], outputRange: tilt });
  return (
    <View style={[{ width, height }, style]}>
      {/* 身體：輕輕起伏（呼吸） */}
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.006] }) }] }}>
        <Pic src={PHOTO[`rig_${base}_body`]} width={width} height={height} style={flip ? { transform: [{ scaleX: -1 }] } : null} />
      </Animated.View>
      {/* 頭：繞著脖子轉 */}
      <Animated.View style={{
        position: 'absolute', left: 0, top: 0,
        transform: [
          { translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.009] }) },
          ...pivot(px, py, rot),
        ],
      }}>
        <Pic src={PHOTO[`rig_${base}_head`]} width={width} height={headH} style={flip ? { transform: [{ scaleX: -1 }] } : null} />
      </Animated.View>
    </View>
  );
}



// ───────── 走路：髖＋膝兩個關節（大腿、小腿分開），加上身體起伏和落地 ─────────
// [髖 x, 髖 y, 左膝 x, 左膝 y, 右膝 x, 右膝 y]（都是佔寬／高的比例）
// 只有「兩腿之間真的有空隙」的立繪才切腿走路：穿裙子、寬褲或兩腿貼在一起的會切壞，
// 那些改用原本的整張立繪（一樣會呼吸、點頭，只是腿不動）。
const LEGS = {
  kid_m: [0.555, 0.55, 0.355, 0.779, 0.682, 0.779],
  teen_m: [0.565, 0.52, 0.329, 0.766, 0.641, 0.763],
  teen_f: [0.354, 0.52, 0.365, 0.767, 0.676, 0.754],
  young_m: [0.564, 0.52, 0.298, 0.766, 0.645, 0.755],
  mid_m: [0.525, 0.52, 0.275, 0.765, 0.61, 0.753],
};
// 腰的位置（骨盆和肩膀分開轉用）：[腰中心 x, 腰 y]
const WAIST = {
  kid_m: [0.5, 0.42], teen_m: [0.457, 0.4], teen_f: [0.543, 0.4], young_m: [0.447, 0.4], mid_m: [0.407, 0.4],
};
export const canWalk = (id) => !!LEGS[id] || !!RIG[id];

// 一條腿：大腿繞髖、小腿再繞膝蓋（小腿包在大腿的座標系裡，兩個旋轉會疊加）
function Leg({ id, side, width, height, step, hipX, hipY, swing, bend }) {
  const g = LEGS[id];
  const kx = side === 'l' ? g[2] : g[4];
  const ky = side === 'l' ? g[3] : g[5];
  return (
    <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: pivot(hipX, hipY, swing) }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: pivot(width * kx, height * ky, bend) }}>
        <Pic src={PHOTO[`rig_${id}_shin${side}`]} width={width} height={height} />
      </Animated.View>
      <Pic src={PHOTO[`rig_${id}_thigh${side}`]} width={width} height={height} />
    </Animated.View>
  );
}

export function WalkFigure({ id, width, height, walking = true, speed = 620, style }) {
  const g = LEGS[id];
  const step = useLoop(speed, walking);
  const head = RIG[id];
  // 不能切腿的：整張立繪，只做呼吸和點頭
  if (!g) return <RigFigure base={id} width={width} height={height} mood="idle" style={style} />;
  if (!head) return <Pic src={PHOTO[`char_${id}`]} width={width} height={height} style={style} />;
  const hipX = width * g[0]; const hipY = height * g[1];
  // 一邊往前、一邊往後；膝蓋只在腿往後收的時候彎
  const swing = (dir) => step.interpolate({ inputRange: [0, 1], outputRange: [`${-9 * dir}deg`, `${9 * dir}deg`] });
  const bend = (dir) => step.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: dir > 0 ? ['0deg', '-3deg', '-9deg', '-12deg'] : ['-12deg', '-9deg', '-3deg', '0deg'],
  });
  // 身體一個步伐上下兩次（走路本來就是這樣），落地那一下壓一點點
  const bob = step.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -height * 0.014, 0, -height * 0.014, 0] });
  // 身體左右輕輕擺、骨盆跟腿同方向、肩膀反方向
  const sway = step.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-width * 0.008, width * 0.008, -width * 0.008] });
  const w0 = WAIST[id] || [0.5, 0.4];
  const wx = width * w0[0]; const wy = height * w0[1];
  const hipTwist = step.interpolate({ inputRange: [0, 1], outputRange: ['-2.5deg', '2.5deg'] });
  const chestTwist = step.interpolate({ inputRange: [0, 1], outputRange: ['4.5deg', '-1.5deg'] });
  const headH = height * head[0];
  return (
    <View style={[{ width, height }, style]}>
      <Leg id={id} side="l" width={width} height={height} step={step} hipX={hipX} hipY={hipY} swing={swing(-1)} bend={bend(-1)} />
      <Leg id={id} side="r" width={width} height={height} step={step} hipX={hipX} hipY={hipY} swing={swing(1)} bend={bend(1)} />
      {/* 骨盆：跟著腿一起轉 */}
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateY: bob }, { translateX: sway }, ...pivot(hipX, hipY, hipTwist)] }}>
        <Pic src={PHOTO[`rig_${id}_hips`]} width={width} height={height} />
      </Animated.View>
      {/* 肩膀：跟骨盆反方向轉（走路時上下半身本來就是相反的），順便微微前傾 */}
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateY: bob }, { translateX: sway }, ...pivot(wx, wy, chestTwist)] }}>
        <Pic src={PHOTO[`rig_${id}_chest`]} width={width} height={height} />
      </Animated.View>
      {/* 頭：跟著步伐點一下 */}
      <Animated.View style={{
        position: 'absolute', left: 0, top: 0,
        transform: [{ translateY: bob }, { translateX: sway }, ...pivot(width * head[1], headH * 0.97, step.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-2deg', '2deg', '-2deg'] }))],
      }}>
        <Pic src={PHOTO[`rig_${id}_head`]} width={width} height={headH} />
      </Animated.View>
    </View>
  );
}

// ───────── 特效層：彩帶、閃光 ─────────
function Confetti({ w, h, n = 16, on }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return undefined;
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: ND });
    const loop = Animated.loop(a);
    loop.start();
    return () => loop.stop();
  }, [on]);
  if (!on) return null;
  const COL = ['#ffd76a', '#ff8a8a', '#7ce0a3', '#8fa3ff', '#ffb3e6'];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, zIndex: 9, overflow: 'hidden' }}>
      {Array.from({ length: n }).map((_, i) => {
        const x = ((i * 37) % 100) / 100 * w;
        const d = (i % 5) * 0.12;
        const sz = 4 + (i % 3) * 2;
        return (
          <Animated.View key={i} style={{
            position: 'absolute', left: x, top: -10, width: sz, height: sz * 2, borderRadius: 1, backgroundColor: COL[i % COL.length],
            opacity: v.interpolate({ inputRange: [0, 0.1 + d, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, h + 20] }) },
              { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, (i % 2 ? 12 : -12), 0] }) },
              { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 720}deg`] }) },
            ],
          }} />
        );
      })}
    </View>
  );
}

function FlashGlow({ w, h, on }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return undefined;
    v.setValue(0);
    Animated.sequence([
      Animated.delay(250),
      Animated.timing(v, { toValue: 1, duration: 260, useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration: 900, useNativeDriver: ND }),
    ]).start();
    return undefined;
  }, [on]);
  if (!on) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h, zIndex: 8, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }) },
      WEB ? { backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(255,226,150,0.9) 0%, rgba(255,200,90,0) 60%)' } : { backgroundColor: 'rgba(255,220,140,0.25)' }]}
    />
  );
}

function MateFigure({ asset, height, mood }) {
  const k = cmKey(asset);
  if (RIG[`cm_${k}`]) return <RigFigure base={`cm_${k}`} width={cmW(asset, height)} height={height} mood={mood} flip={isAlt(asset)} style={isAlt(asset) && WEB ? { filter: 'brightness(0.92) contrast(1.05)' } : null} />;
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

// 桌上的名牌（名字＋職業）
function PlaceCard({ x, y, name, job, me, maxW, k = 1 }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - maxW / 2, top: y, width: maxW, alignItems: 'center' }}>
      <View style={[{ backgroundColor: me ? '#ffe9a8' : '#ffffff', borderRadius: 4 * k, paddingHorizontal: 4 * k, paddingVertical: 1 * k, borderWidth: 1, borderColor: me ? '#c89a2e' : 'rgba(120,90,50,0.35)', alignItems: 'center', maxWidth: maxW }, WEB ? { boxShadow: '0 2px 3px rgba(60,40,20,0.35)' } : null]}>
        <Text numberOfLines={1} style={{ color: '#1b1b24', fontSize: 9.5 * k, fontWeight: '900' }}>{name}</Text>
        {job ? <Text numberOfLines={1} style={{ color: '#5a5f7a', fontSize: 8 * k }}>{job}</Text> : null}
      </View>
    </View>
  );
}

// 椅背（在人物後面）
// ───────── 同學會：固定六人弧形站位（主角＋本次五位同學），站在圓桌後方 ─────────
// 位置都是舞台寬高的百分比。人物框：寬 = width，高 = 寬 × 1.75；圖片 contain、靠上對齊（頭不會被裁）。
// 同學 1～5 依資產排名放入；主角永遠在正中央、最上層。
const SEATS = [
  { key: 's1', left: 0.07, top: 0.10, width: 0.17, z: 2, row: 'back' }, // 同學 1：左後
  { key: 's2', left: 0.41, top: 0.05, width: 0.18, z: 2, row: 'back' }, // 同學 2：中後
  { key: 's3', left: 0.75, top: 0.10, width: 0.17, z: 2, row: 'back' }, // 同學 3：右後
  { key: 's4', left: 0.20, top: 0.25, width: 0.20, z: 4, row: 'front' }, // 同學 4：左前
  { key: 's5', left: 0.60, top: 0.25, width: 0.20, z: 4, row: 'front' }, // 同學 5：右前
];
const HERO_SEAT = { key: 'me', left: 0.40, top: 0.18, width: 0.20, z: 5, row: 'front' };
const BOX_AR = 1.75;
const STAGE_AR = 0.62; // 舞台高 = 寬 × 0.62：中後同學的臉在主角請客起身時也不會被擋住
// 桌機上舞台變寬，比例照舊會變得太高（桌面空白一大片、選項被擠到看不到），
// 所以寬度超過 480 之後慢慢壓扁，最扁 0.52（再扁玻璃轉盤就放不下了）
const stageAR = (W) => (W <= 480 ? STAGE_AR : Math.max(0.52, STAGE_AR - (W - 480) * 0.00024));

// 算出每個座位的圖片實際位置（contain＋靠上）與臉的位置
function seatBox(seat, W, H, scale, img) {
  const bw = seat.width * W * scale;
  const bh = bw * BOX_AR;
  const cx = (seat.left + seat.width / 2) * W; // 縮小時以框的中心上緣為基準，位置不變
  const top = seat.top * H;
  const ar = img.w / img.h;
  const iw = Math.min(bw, bh * ar); const ih = iw / ar;
  const x = cx - iw / 2;
  const headX = x + img.cx * iw; const headW = img.hw * iw;
  return { bw, bh, cx, top, x, y: top, iw, ih, headX, headW, face: { x0: headX - headW / 2, x1: headX + headW / 2, y0: top, y1: top + headW * 1.3 } };
}
const heroImg = (heroId) => ({ w: SIZE[heroId][0], h: SIZE[heroId][1], cx: HEAD[heroId][0], hw: (HEAD[heroId][1] * SIZE[heroId][1] * 0.72) / SIZE[heroId][0] });
const mateImg = (asset) => { const [w, h] = CM[cmKey(asset)]; const hd = cmHead(asset); return { w, h, cx: hd.cx, hw: hd.hw }; };
const facesOverlap = (a, b) => a.x0 < b.x1 + 2 && b.x0 < a.x1 + 2 && a.y0 < b.y1 && b.y0 < a.y1;

function reunionLayout(mates, W, H, heroId) {
  const build = (scale) => {
    const people = mates.map((m, i) => ({ m, seat: SEATS[i], idx: i, ...seatBox(SEATS[i], W, H, scale, mateImg(m.characterAsset)) }));
    const hero = { seat: HERO_SEAT, ...seatBox(HERO_SEAT, W, H, scale, heroImg(heroId)) };
    return { people, hero, scale };
  };
  // 手機太窄、臉會互相碰到：整體縮成 85%（位置與前後層次不變）
  let L = build(1);
  const all = [L.hero, ...L.people];
  const clash = all.some((a, i) => all.some((b, j) => j > i && facesOverlap(a.face, b.face)));
  if (clash || W < 330) L = build(0.85);
  // 餐桌：前緣切在前排的腰部（腿被桌子擋住）
  const front = [L.hero, ...L.people.filter((p) => p.seat.row === 'front')];
  const edge0 = Math.min(...front.map((p) => p.y + p.ih * 0.56));
  const T = { cx: W / 2, rx: W * 0.78, cy: H * 1.12, e0: edge0 };
  T.ry = T.cy - edge0;
  return { ...L, T };
}
const tableEdgeAt = (T, x) => { const t = Math.min(0.97, Math.abs(x - T.cx) / T.rx); return T.cy - T.ry * Math.sqrt(1 - t * t); };

// 前景餐桌（z 6）：白桌巾、桌裙、玻璃轉盤
function StageTable({ T, W, H }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, zIndex: 6 }}>
      <Svg width={W} height={H}>
        <Defs>
          <RadialGradient id="stCloth" cx="50%" cy="8%" rx="55%" ry="60%">
            <Stop offset="0" stopColor="#fffdf7" />
            <Stop offset="0.6" stopColor="#efe4d0" />
            <Stop offset="1" stopColor="#c7b393" />
          </RadialGradient>
          <LinearGradient id="stShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3a2410" stopOpacity="0.4" />
            <Stop offset="0.12" stopColor="#3a2410" stopOpacity="0.06" />
            <Stop offset="1" stopColor="#3a2410" stopOpacity="0" />
          </LinearGradient>
          <RadialGradient id="stGlass" cx="45%" cy="35%" rx="65%" ry="70%">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.6" />
            <Stop offset="0.6" stopColor="#d9e4ea" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#8fa3ad" stopOpacity="0.4" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={T.cx} cy={T.cy} rx={T.rx} ry={T.ry} fill="url(#stCloth)" />
        <Ellipse cx={T.cx} cy={T.cy} rx={T.rx} ry={T.ry} fill="url(#stShade)" />
        <Ellipse cx={T.cx} cy={T.cy} rx={T.rx - 1} ry={T.ry - 1} fill="none" stroke="rgba(140,110,70,0.4)" strokeWidth={1.2} />
        {T.susanY ? (
          <>
            <Ellipse cx={T.cx} cy={T.susanY + 4} rx={W * 0.28} ry={15} fill="rgba(80,60,40,0.16)" />
            <Ellipse cx={T.cx} cy={T.susanY} rx={W * 0.28} ry={15} fill="url(#stGlass)" stroke="rgba(255,255,255,0.85)" strokeWidth={1.3} />
          </>
        ) : null}
      </Svg>
      {T.susanY ? [['🥟', -0.17], ['🍲', 0], ['🍗', 0.17]].map(([e, dx]) => (
        <View key={e} style={{ position: 'absolute', left: T.cx + dx * W - 13, top: T.susanY - 20 }}><Emo e={e} size={26} /></View>
      )) : null}
    </View>
  );
}

// 一個人（同學或主角）：進場、請客時彈跳、各種小道具
function StageActor({ p, hero, mode, order, act, game, top }) {
  const inV = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(inV, { toValue: 1, duration: 480, delay: 150 + order * 110, easing: Easing.out(Easing.back(1.4)), useNativeDriver: ND }).start();
    if (hero || (mode !== 'treat' && mode !== 'info')) return undefined;
    // 請客：五位同學依序彈跳歡呼｜交換情報：輕輕點頭
    const up = mode === 'treat' ? 1 : 0.3;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(order * 140),
      Animated.timing(hop, { toValue: up, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.timing(hop, { toValue: 0, duration: 300, easing: Easing.in(Easing.bounce), useNativeDriver: ND }),
      Animated.delay(mode === 'treat' ? 5 * 140 - order * 140 + 300 : 900),
    ]));
    const t = setTimeout(() => loop.start(), 650);
    return () => { clearTimeout(t); loop.stop(); };
  }, [mode]);
  const deco = hero ? null
    : mode === 'treat' ? ['🙌', '🎉', '👏', '🥳', '🎊'][order % 5]
      : mode === 'info' ? (order % 2 ? '💬' : '📱') : null;
  const emo = Math.max(16, Math.min(26, p.headW * 0.95));
  const heroMove = hero && mode === 'treat'
    ? [{ translateY: act.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }, { scale: act.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }]
    : [];
  return (
    <Animated.View style={{
      position: 'absolute', left: p.x, top: p.y, width: p.iw, height: p.ih, zIndex: p.seat.z, opacity: inV,
      ...(WEB ? { transformOrigin: 'top center' } : null),
      transform: [
        { translateY: Animated.add(inV.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }), hop.interpolate({ inputRange: [0, 1], outputRange: [0, -p.ih * 0.08] })) },
        ...heroMove,
        { rotate: mode === 'info' && !hero ? (p.seat.left + p.seat.width / 2 < 0.5 ? '4deg' : p.seat.left + p.seat.width / 2 > 0.5 ? '-4deg' : '0deg') : '0deg' }, // 交換情報：身體往中間靠
      ],
    }}>
      {top ? <View style={{ position: 'absolute', left: p.headX - p.x - 9, top: -20 }}><Emo e="👑" size={18} /></View> : null}
      {hero
        ? <RigFigure base={cid(stageOf(game.age), gk(game.gender))} width={p.iw} height={p.ih} mood={mode === 'treat' ? 'cheer' : mode === 'quiet' ? 'down' : mode === 'info' ? 'look' : 'idle'} />
        : <View style={{ opacity: mode === 'quiet' ? 0.9 : 1 }}><MateFigure asset={p.m.characterAsset} height={p.ih} mood={mode === 'treat' ? 'cheer' : mode === 'info' ? 'look' : mode === 'quiet' ? 'down' : 'idle'} /></View>}
      {deco ? (
        <View style={{ position: 'absolute', left: p.headX - p.x - emo / 2 + (deco === '📱' ? p.headW * 0.5 : 0), top: deco === '📱' ? p.ih * 0.3 : -emo - 1 }}><Emo e={deco} size={emo} /></View>
      ) : null}
    </Animated.View>
  );
}

const reunionMode = (choice) => (!choice ? 'intro' : /請客/.test(choice) ? 'treat' : /投資情報/.test(choice) ? 'info' : /拚/.test(choice) ? 'rival' : 'quiet');

export function ReunionStage({ game, choice, style }) {
  const [fullW, setW] = useState(0);
  const W = fullW; // 左右撐滿，桌機上圖就大一張
  const k = Math.max(1, Math.min(2.4, W / 390)); // 名牌、碗、對話框跟著一起放大
  const inV = useRef(new Animated.Value(0)).current;
  const act = useRef(new Animated.Value(0)).current;
  const loop = useLoop(900, true);
  const mode = reunionMode(choice);
  useEffect(() => {
    Animated.timing(inV, { toValue: 1, duration: 500, useNativeDriver: ND }).start();
    Animated.timing(act, { toValue: 1, duration: 600, delay: 300, easing: Easing.out(Easing.back(1.6)), useNativeDriver: ND }).start();
  }, []);
  // 本次的五位同學（selectedClassmates，不重抽），依資產排名放進同學 1～5
  const mates = [...selectedClassmates(game).slice(0, 5)].sort((a, b) => (b.nw || 0) - (a.nw || 0));
  const heroId = cid(stageOf(game.age), gk(game.gender));
  const H = Math.round(W * stageAR(W));
  const L = W ? reunionLayout(mates, W, H, heroId) : null;

  let rivalData = null; let rivalId = null;
  if (mode === 'rival') {
    const list = ranking(game, netWorthOf(game));
    const top = list.find((x) => !x.me);
    if (top) {
      rivalId = top.id;
      const from = Math.min(22, Math.max(0, game.age - 4));
      const ages = []; for (let a = from; a <= game.age; a += 1) ages.push(a);
      const mine = ages.map((a) => (game.history && game.history[a] != null ? game.history[a] : 0));
      const theirs = ages.map((a, i) => {
        if (top.hist && top.hist[a] != null) return top.hist[a];
        const t = i / Math.max(1, ages.length - 1);
        return top.nw * t * t; // 舊存檔沒有紀錄：從 0 慢慢長到現在
      });
      rivalData = { mine, theirs, name: top.name };
    }
  }
  const labelW = W * 0.21;
  if (L) { const room = H - (L.T.e0 + 3 * k + 25 * k + 26 * k); L.T.susanY = room >= 34 * k ? H - room / 2 : 0; }
  // 名牌放在桌上：後排一行、前排（含你）一行，不會蓋到任何人的臉
  const farY = L ? L.T.e0 + 3 * k : 0;
  const nearY = farY + 25 * k;
  return (
    <View style={[style, { alignItems: 'center' }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Animated.View style={{ width: W || '100%', height: H || 220, borderRadius: 18, overflow: 'hidden', backgroundColor: '#15183d', opacity: inV }}>
        {/* 固定的餐廳場景 */}
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, transform: [{ scale: inV.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }) }] }}>
          <Pic src={PHOTO.restaurant} width="100%" height="100%" cover />
        </Animated.View>
        {mode === 'quiet' ? <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(8,10,30,0.28)', zIndex: 1 }} /> : null}
        {L ? (
          <Animated.View style={{
            position: 'absolute', left: 0, top: 0, width: W, height: H,
            transform: [
              { scale: mode === 'treat' ? act.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) : 1 },
              { translateY: mode === 'treat' ? act.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) : 0 },
            ],
          }}>
            {/* 後排同學站在椅子後面：椅背（z 3）擋住腿 */}
            {L.people.filter((p) => p.seat.row === 'back').map((p) => (
              <View key={`ch${p.m.id}`} pointerEvents="none" style={{ position: 'absolute', zIndex: 3, left: p.cx - p.bw * 0.46, top: p.y + p.ih * 0.6 }}>
                <Pic src={PHOTO.rt_chair} width={p.bw * 0.92} height={p.bw * 0.92 * 1.13} />
              </View>
            ))}
            {L.people.map((p) => <StageActor key={p.m.id} p={p} mode={mode} order={p.idx} act={act} game={game} top={mode === 'rival' && p.m.id === rivalId} />)}
            <StageActor key="me" p={L.hero} hero mode={mode} order={5} act={act} game={game} />
            <StageTable T={L.T} W={W} H={H} />
            {/* 名牌（z 7） */}
            {L.people.map((p) => (
              <View key={`pc${p.m.id}`} style={{ position: 'absolute', left: 0, top: 0, zIndex: 7 }}>
                <PlaceCard x={p.cx} y={p.seat.row === 'back' ? farY : nearY} name={p.m.name} job={p.m.title || '同學'} maxW={labelW} k={k} />
              </View>
            ))}
            <View style={{ position: 'absolute', left: 0, top: 0, zIndex: 7 }}>
              <PlaceCard x={L.hero.cx} y={nearY} name="你" job={game.name} me maxW={labelW} k={k} />
            </View>
            {mode === 'quiet' ? [L.hero, ...L.people].map((p, i) => (
              // 低調吃飯：每個人面前一碗，冒熱氣
              <View key={`bowl${i}`} pointerEvents="none" style={{ position: 'absolute', zIndex: 7, left: p.cx + (p.seat.row === 'back' ? labelW * 0.5 + 2 * k : -labelW * 0.5 - 24 * k), top: (p.seat.row === 'back' ? farY : nearY) - 2 * k }}>
                <Emo e={i % 2 ? '🍵' : '🍜'} size={24 * k} />
                <Animated.Text style={{ position: 'absolute', left: 7 * k, top: -12 * k, color: 'rgba(255,255,255,0.85)', fontSize: 12 * k, opacity: loop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.9] }), transform: [{ translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [3, -5] }) }] }}>〰</Animated.Text>
              </View>
            )) : null}
            {mode === 'treat' ? (
              <>
                {/* 拿出信用卡：在主角頭旁邊高舉 */}
                <Animated.View style={{
                  position: 'absolute', zIndex: 8, left: L.hero.headX + L.hero.headW * 0.7, top: Math.max(2, L.hero.y - 16 * k),
                  opacity: act,
                  transform: [
                    { translateY: act.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                    { rotate: loop.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '8deg'] }) },
                  ],
                }}>
                  <CreditCard w={Math.max(40, W * 0.13)} />
                </Animated.View>
                <Animated.View style={{ position: 'absolute', zIndex: 8, left: L.hero.headX - L.hero.headW * 0.7 - 104 * k, top: Math.max(2, L.hero.y - 20 * k), width: 100 * k, alignItems: 'flex-end', opacity: act, transform: [{ scale: act }] }}>
                  <View style={{ backgroundColor: '#fff', borderRadius: 12 * k, paddingHorizontal: 8 * k, paddingVertical: 3 * k }}><Text style={{ fontWeight: '900', color: '#1b1b24', fontSize: 11 * k }}>今天我請客！</Text></View>
                </Animated.View>
              </>
            ) : null}
            {mode === 'info' ? (
              <Animated.View style={{ position: 'absolute', zIndex: 8, left: W / 2 - 60 * k, bottom: 4 * k, width: 120 * k, alignItems: 'center', opacity: loop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 12 * k, paddingHorizontal: 8 * k, paddingVertical: 3 * k }}><Text style={{ fontSize: 11 * k, fontWeight: '800', color: '#1b1b24' }}>💬 這支會漲嗎？</Text></View>
              </Animated.View>
            ) : null}
            <Confetti w={W} h={H} on={mode === 'treat'} />
            <FlashGlow w={W} h={H} on={mode === 'treat'} />
          </Animated.View>
        ) : null}
      </Animated.View>
      {/* 拚一下：座位不動，折線圖放在舞台下方 */}
      {mode === 'rival' && rivalData && W ? (
        <Animated.View style={{ marginTop: 8, width: W, height: Math.round(120 * k), borderRadius: 12, backgroundColor: 'rgba(10,8,30,0.85)', borderWidth: 1, borderColor: 'rgba(255,215,106,0.35)', opacity: act }}>
          <RivalChart me={rivalData.mine} rival={rivalData.theirs} rivalName={rivalData.name} w={W} h={Math.round(120 * k)} />
        </Animated.View>
      ) : null}
    </View>
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
            // 平常泡泡放在頭的右邊；但有另一半的時候「你」在左、對方在中間，
            // 放右邊會正好蓋到對方的臉，所以改放外側（左邊）。
            left={withP
              ? Math.max(4, heroX + heroW * HEAD[hid][0] - heroH * HEAD[hid][1] * 0.42 - bubble)
              : Math.max(4, Math.min(heroX + heroW * HEAD[hid][0] + heroH * HEAD[hid][1] * 0.42, w - bubble - 4))}
            top={Math.max(4, topPad + heroH * HEAD[hid][1] * 0.05 - bubble * 0.3)}
          />
        </>
      ) : null}
    </View>
  );
}
