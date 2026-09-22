// 主角母版：男女主角六個階段（嬰兒／國小／高中／青年／壯年／老年），全部來自同一張正式人物設定圖。
// 男主以深藍色為識別、女主以紫色為識別；遊戲裡所有主角的插圖都從這裡出，確保每個事件都是同一張臉。
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Line, Path, Polyline, Stop } from 'react-native-svg';
import { PHOTO } from './art/photos';
import { EMOJI3D } from './art/emoji3d';

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
  crash: { pal: 'red', mood: '😰', bad: true, props: [['📉', 74, 40, 36, 1], ['💸', 88, 72, 24, 1], ['⚡', 62, 20, 20, 1]] },
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

export function CharScene({
  kind = 'desk', age = 22, gender = 'male', partner, baby, mood, bad: badIn, height = 150, radius = 18, style, full, noProps, crashPct,
}) {
  const cfg = KIND[kind] || KIND.desk;
  const pal = PAL[cfg.pal] || PAL.night;
  const [w, setW] = useState(0);
  const bob = useLoop(1500);
  const stage = stageOf(age);
  const bad = badIn != null ? badIn : !!cfg.bad;
  const face = mood || cfg.mood || '🙂';
  const other = gender === 'female' ? 'male' : 'female';
  const z = full ? (stage === 'baby' ? 0.8 : 0.92) : ZOOM[stage];
  const heroH = height * z;
  const hid = cid(stage, gk(gender));
  const heroW = (heroH * SIZE[hid][0]) / SIZE[hid][1];
  const topPad = stage === 'baby' ? height - heroH - 2 : height * (full ? 0.05 : 0.07);
  const withP = !!partner && stage !== 'baby';
  const crash = kind === 'crash' && !noProps;
  const compact = height < 110;
  const heroX = w * (compact ? 0.26 : withP ? 0.2 : crash ? 0.46 : 0.3) - heroW / 2;
  const pid = cid(stage, gk(other));
  const pH = heroH * (SIZE[pid][1] / SIZE[hid][1]);
  const pW = (pH * SIZE[pid][0]) / SIZE[pid][1];
  const pX = w * 0.42 - pW / 2;
  const s = height / 150;
  const bubble = Math.round(26 * Math.max(0.8, s));
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
          {crash ? <CrashChart w={Math.max(110, Math.min(w * 0.34, 220))} h={height - 20} pct={crashPct || 20} /> : null}
          {!noProps ? (compact
            // 小卡（主畫面右上）：只放兩個大圖示在右半邊，人物留在左邊
            ? cfg.props.slice(0, 2).map(([e, , , , float], i) => (
              <Prop key={`${kind}-${i}`} k={i} e={e} x={i ? 82 : 72} y={i ? 70 : 34} size={Math.round(height * (i ? 0.36 : 0.44))} float={float} delay={260 + i * 130} />
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
