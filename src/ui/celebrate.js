// 慶祝特效：人生里程碑時手機震動＋金幣／煙火。
//  small：升職、結婚、生小孩、破百萬 → 金幣噴泉＋上方橫幅＋輕震
//  big  ：買房、頂大、跳級、出道、破千萬／五千萬、傳說職業、逆襲成功 → 大煙火＋中間大卡＋強震
//  mega ：破一億 → 滿天煙火＋金幣雨＋超大字＋長震
import { useEffect, useMemo, useRef } from 'react';
import { play as playSfx, CELEBRATE_SOUND } from './sfx';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatMoney, netWorth, YI } from '../game/engine';
import { LEGENDS } from '../game/legends';
import { Sprite, Emo, SPRITE_SIZE, spriteId, PetPic } from './Character';

const ND = Platform.OS !== 'web';
const WAN = 10000;

// ── 震動 ──────────────────────────────────────────────
// Android／網頁：navigator.vibrate。iPhone Safari 不支援 vibrate，
// 但 iOS 18 以後點一下「開關樣式的 checkbox」會有觸覺回饋，用它來模擬。
let hapticsOn = true;
const SETTING_KEY = 'yiyi-haptics-v1';
AsyncStorage.getItem(SETTING_KEY).then((v) => { if (v === 'off') hapticsOn = false; }).catch(() => {});
export const getHaptics = () => hapticsOn;
export const setHaptics = (on) => { hapticsOn = on; AsyncStorage.setItem(SETTING_KEY, on ? 'on' : 'off').catch(() => {}); };

let iosLabel = null;
function iosTick() {
  if (typeof document === 'undefined') return;
  try {
    if (!iosLabel) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      label.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;';
      label.setAttribute('aria-hidden', 'true');
      document.body.appendChild(label);
      iosLabel = label;
    }
    iosLabel.click();
  } catch { /* 沒關係 */ }
}
const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const PATTERNS = {
  tap: [12],
  small: [30, 60, 40],
  big: [80, 60, 80, 60, 200],
  mega: [120, 70, 120, 70, 120, 120, 400],
};

export function haptic(kind = 'tap') {
  if (!hapticsOn) return;
  if (Platform.OS !== 'web') {
    try {
      if (kind === 'tap') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (kind === 'small') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else {
        const n = kind === 'mega' ? 6 : 3;
        for (let i = 0; i < n; i += 1) setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), i * 140);
      }
    } catch { /* 沒關係 */ }
    return;
  }
  const pat = PATTERNS[kind] || PATTERNS.tap;
  if (canVibrate()) { try { navigator.vibrate(pat); } catch { /* */ } return; }
  // iPhone：用觸覺點擊模擬（每個震動段落點一下）
  const ticks = kind === 'tap' ? 1 : kind === 'small' ? 2 : kind === 'big' ? 3 : 6;
  for (let i = 0; i < ticks; i += 1) setTimeout(iosTick, i * 130);
}

// ── 偵測：比較前後兩個狀態，看發生了什麼值得慶祝的事 ─────────
const THRESHOLDS = [
  { v: 100 * WAN, tier: 'small', icon: '💰', title: '資產破百萬！', sub: '第一桶金到手' },
  { v: 1000 * WAN, tier: 'big', icon: '💎', title: '千萬富翁！', sub: '資產突破一千萬' },
  { v: 5000 * WAN, tier: 'big', icon: '🏦', title: '資產破五千萬！', sub: '離一個億只剩一半' },
];

export function detect(prev, next) {
  if (!prev || !next || prev === next || next.ended) return null;
  if (prev.bornAt !== next.bornAt || prev.name !== next.name) return null; // 換了一個人生
  const out = [];
  const add = (tier, icon, title, sub, sound, fx) => out.push({ tier, icon, title, sub, sound, fx });

  // 破億
  if (!prev.achievedAge && next.achievedAge) add('mega', '🏆', '一個億達成！', `${next.achievedAge} 歲，你做到了`, 'achieve');

  // 資產門檻：以前最高都沒到過才算
  const nw0 = netWorth(prev);
  const nw1 = netWorth(next);
  const peak0 = Math.max(nw0, ...(prev.history || [0]));
  for (const t of THRESHOLDS) if (peak0 < t.v && nw1 >= t.v) add(t.tier, t.icon, t.title, t.sub);

  // 傳說職業
  const newLegend = (next.legends || []).find((id) => !(prev.legends || []).includes(id));
  if (newLegend) {
    const lg = LEGENDS.find((l) => l.id === newLegend);
    add('big', lg ? lg.icon : '👑', '解鎖傳說職業！', lg ? `你成為了「${lg.name}」` : '');
  }

  // 逆襲路線完成
  if (prev.route && next.route && !prev.route.done && next.route.done) add('big', '⭐', '逆襲成功！', '一路從谷底爬上來');

  // 職涯爆發（engine.js 的 careerHit()）
  const h0 = prev.flags?.hitShow; const h1 = next.flags?.hitShow;
  if (h1 && (!h0 || h0.age !== h1.age)) {
    add(h1.mega ? 'mega' : 'big', '💰', '職涯爆發！', `${h1.job}．${formatMoney(h1.net)}`, h1.mega ? 'achieve' : 'promote');
  }

  // 學業
  if (prev.edu !== 'topCollege' && next.edu === 'topCollege') add('big', '🎓', '考上頂尖大學！', '全家都為你驕傲');
  if ((next.flags?.skipYears || 0) > (prev.flags?.skipYears || 0)) add('big', '🧠', '跳級成功！', '比同學早一年');

  // 樂團
  const b0 = prev.flags?.band || 0; const b1 = next.flags?.band || 0;
  if (b0 !== 3 && b1 === 3) add('big', '🎸', '成為職業樂團！', `「${next.flags.bandName || '樂團'}」簽約了`);
  if (b0 !== 4 && b1 === 4) add('big', '🔥', '樂團爆紅！', `「${next.flags.bandName || '樂團'}」的歌洗版了`);

  // 星探、出道：閃光燈 + 快門聲（fx: 'flash'），像被一群記者圍住
  if (!prev.flags?.idol && next.flags?.idol === 1) add('big', '📸', '星探看上你了！', '簽下練習生合約，明星之路開始', 'shutter', 'flash');
  if ((prev.flags?.idol || 0) < 2 && next.flags?.idol === 2) add('big', '🌟', '正式出道！', '從練習生變成偶像', 'shutter', 'flash');

  // 工作
  const j0 = prev.job; const j1 = next.job;
  if (j1 && !String(j1.id).startsWith('lg_')) {
    if (!j0) add('small', '💼', '找到工作了！', `${j1.name}${j1.volatile ? '' : `．年薪 ${formatMoney(j1.salary)}`}`, 'promote');
    else if (j0.id === j1.id && j0.name !== j1.name) add('small', '📈', '升職了！', `${j1.name}．年薪 ${formatMoney(j1.salary)}`, 'promote');
    else if (j0.id !== j1.id && j1.salary > j0.salary * 1.1) add('small', '🚀', '跳槽成功！', `${j1.name}．年薪 ${formatMoney(j1.salary)}`);
  }

  // 房子、公司、家庭
  if ((next.houses || []).length > (prev.houses || []).length) {
    const h = next.houses[next.houses.length - 1];
    // 買房：放煙火慶祝（第一間是「成家」，之後是「包租公」）
    add('big', '🏠', (prev.houses || []).length ? '又買了一間房！' : '買房了！恭喜成家', h ? `${h.name}．${formatMoney(h.price || h.value)}` : '', 'house');
  }
  if ((next.bizs || []).length > (prev.bizs || []).length) {
    const b = next.bizs[next.bizs.length - 1];
    add('small', '🏢', '當老闆了！', b ? b.name : '');
  }
  // 結婚：婚禮的號角 + 賓客的閃光燈（fx 'wedding' = 閃光燈 + 彩帶）
  // 新寵物：多了一個家人
  if ((next.pets || []).length > (prev.pets || []).length) {
    const p = next.pets[next.pets.length - 1];
    add('small', p && p.type === 'cat' ? '🐱' : '🐶', '多了一個家人！', p ? `「${p.name}」來了` : '', 'good');
  }
  if (!prev.married && next.married) {
    add('big', '💍', '結婚了！', next.spouse ? `和 ${next.spouse.name}` : '', 'wedding', 'wedding');
    // 婚禮動畫要知道：新人幾歲、誰是男誰是女、叫什麼名字
    out[out.length - 1].scene = { age: next.age, gender: next.gender, name: next.name, spouse: next.spouse ? next.spouse.name : '', pets: (next.pets || []).filter((p) => p.alive).slice(0, 2) };
  }
  if ((next.kids || []).length > (prev.kids || []).length) {
    const k = next.kids[next.kids.length - 1];
    add('big', '👶', '寶寶出生了！', k && k.name ? k.name : '', 'baby', 'baby');
    // 寶寶動畫：爸媽站著、寶寶從中間冒出來、最後拍一張全家福
    out[out.length - 1].scene = { age: next.age, gender: next.gender, name: next.name, spouse: next.spouse ? next.spouse.name : '', kid: k ? k.name : '', kidGender: k ? k.gender : 'male', nth: next.kids.length, pets: (next.pets || []).filter((p) => p.alive).slice(0, 2) };
  }

  if (!out.length) return null;
  const rank = { small: 0, big: 1, mega: 2 };
  out.sort((a, b) => rank[b.tier] - rank[a.tier]);
  return { ...out[0], more: out.slice(1).map((x) => `${x.icon} ${x.title}`), key: `${next.age}-${Date.now()}` };
}

// ── 畫面 ──────────────────────────────────────────────
const COLORS = ['#ffd76a', '#ff6b8b', '#7db4ff', '#9d8cff', '#3ddc97', '#ffa24c', '#ffffff'];
const rnd = (a, b) => a + Math.random() * (b - a);

// 一發煙火：先從下面往上衝，再炸開
function Firework({ x, y, color, delay, size, fromY }) {
  const rise = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const parts = useMemo(() => {
    const ring = (n, k, s0, s1, white) => Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + rnd(-0.1, 0.1);
      const r = size * k * rnd(0.85, 1.05);
      return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, c: Math.random() < white ? '#ffffff' : color, s: rnd(s0, s1) };
    });
    // 外圈大顆、內圈小顆亮白
    return [...ring(34, 1, 4.5, 8, 0.2), ...ring(16, 0.5, 3, 5, 0.6)];
  }, [color, size]);
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(rise, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.timing(burst, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <>
      {/* 上升的火花 */}
      <Animated.View
        style={[styles.rocket, {
          left: x - 2, top: y - 2,
          opacity: rise.interpolate({ inputRange: [0, 0.05, 0.95, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [fromY - y, 0] }) }],
        }]}
      />
      {/* 閃光 */}
      <Animated.View
        style={[styles.flash, {
          left: x - size * 0.5, top: y - size * 0.5, width: size, height: size, borderRadius: size / 2, backgroundColor: color,
          opacity: burst.interpolate({ inputRange: [0, 0.04, 0.25, 1], outputRange: [0, 0.55, 0, 0] }),
          transform: [{ scale: burst.interpolate({ inputRange: [0, 0.25], outputRange: [0.2, 1.2], extrapolate: 'clamp' }) }],
        }]}
      />
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: x - p.s / 2, top: y - p.s / 2, width: p.s, height: p.s, borderRadius: p.s / 2, backgroundColor: p.c,
            shadowColor: p.c, shadowOpacity: 1, shadowRadius: 6,
            opacity: burst.interpolate({ inputRange: [0, 0.02, 0.65, 1], outputRange: [0, 1, 0.9, 0] }),
            transform: [
              { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: burst.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, p.dy * 0.92, p.dy + 38] }) },
              { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.4] }) },
            ],
          }}
        />
      ))}
    </>
  );
}

// 金幣：mode 'fountain' 從下面噴上來，'rain' 從上面掉下來
function Coin({ W, H, mode, delay }) {
  const v = useRef(new Animated.Value(0)).current;
  const cfg = useMemo(() => {
    if (mode === 'rain') return { x: rnd(10, W - 30), y0: -40, y1: H + 40, mid: null, dx: rnd(-30, 30), spin: rnd(1, 3), dur: rnd(1500, 2300), size: rnd(20, 30) };
    return { x: W / 2 - 12 + rnd(-20, 20), y0: H * 0.72, top: H * rnd(0.22, 0.42), y1: H + 40, dx: rnd(-W * 0.42, W * 0.42), spin: rnd(1, 2.5), dur: rnd(1300, 1700), size: rnd(20, 28) };
  }, [W, H, mode]);
  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: cfg.dur, easing: mode === 'rain' ? Easing.in(Easing.quad) : Easing.linear, useNativeDriver: ND }),
    ]);
    a.start();
    return () => a.stop();
  }, []);
  const translateY = mode === 'rain'
    ? v.interpolate({ inputRange: [0, 1], outputRange: [cfg.y0, cfg.y1] })
    : v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [cfg.y0, cfg.top, cfg.y1], easing: undefined });
  return (
    <Animated.View
      style={{
        position: 'absolute', left: cfg.x, top: 0, width: cfg.size, height: cfg.size,
        opacity: v.interpolate({ inputRange: [0, 0.03, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY },
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.dx] }) },
          { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * cfg.spin}deg`] }) },
        ],
      }}
    >
      <View style={[styles.coin, { width: cfg.size, height: cfg.size, borderRadius: cfg.size / 2 }]}>
        <Text style={[styles.coinText, { fontSize: cfg.size * 0.52 }]}>$</Text>
      </View>
    </Animated.View>
  );
}

// 閃光燈：一顆亮白的光點，瞬間亮起、拖著幾道光芒，然後很快暗掉（狗仔的相機）
function CamFlash({ x, y, size, delay }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: ND })]);
    a.start();
    return () => a.stop();
  }, []);
  const op = v.interpolate({ inputRange: [0, 0.06, 0.3, 1], outputRange: [0, 1, 0.5, 0] });
  const sc = v.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0.2, 1, 1.35] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: op, transform: [{ scale: sc }], alignItems: 'center', justifyContent: 'center' }}>
      {/* 光芒：四道細長的白線 */}
      {[0, 45, 90, 135].map((deg) => (
        <View key={deg} style={{ position: 'absolute', width: size * (deg % 90 ? 0.7 : 1.1), height: 2, backgroundColor: '#fff', opacity: deg % 90 ? 0.55 : 0.85, transform: [{ rotate: `${deg}deg` }] }} />
      ))}
      {/* 中心光暈 */}
      <View style={{ width: size * 0.42, height: size * 0.42, borderRadius: size, backgroundColor: '#fff', shadowColor: '#fff', shadowOpacity: 1, shadowRadius: size * 0.3 }} />
      <View style={{ position: 'absolute', width: size * 0.16, height: size * 0.16, borderRadius: size, backgroundColor: '#fff' }} />
    </Animated.View>
  );
}

// 整個畫面白一下（快門那一瞬間），幾次、越來越弱
function ScreenFlash({ delay, peak }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: ND })]);
    a.start();
    return () => a.stop();
  }, []);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: v.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0, peak, 0] }) }]} />;
}

// 彩帶
function Confetti({ W, H, delay }) {
  const v = useRef(new Animated.Value(0)).current;
  const c = useMemo(() => ({ x: rnd(0, W), dx: rnd(-60, 60), color: COLORS[Math.floor(rnd(0, COLORS.length))], w: rnd(6, 10), h: rnd(10, 16), dur: rnd(2200, 3200), spin: rnd(2, 5) }), [W]);
  useEffect(() => {
    const a = Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: c.dur, easing: Easing.linear, useNativeDriver: ND })]);
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute', left: c.x, top: -20, width: c.w, height: c.h, backgroundColor: c.color, borderRadius: 2,
        opacity: v.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, H + 40] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, c.dx, -c.dx * 0.4] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * c.spin}deg`] }) },
        ],
      }}
    />
  );
}

// ───────── 婚禮動畫：新郎新娘從兩邊走進來、在中間碰面，戒指跳出來、愛心飄、花瓣落 ─────────
const MEET_MS = 1500;   // 走到中間要多久（閃光燈、快門聲從這一刻開始）
function FloatHeart({ x, y, delay, size, e = '💗' }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: 1900, easing: Easing.out(Easing.quad), useNativeDriver: ND })]);
    a.start();
    return () => a.stop();
  }, []);
  const dx = useMemo(() => rnd(-28, 28), []);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, opacity: v.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.9, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -150] }) }, { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dx, dx * 0.4] }) }, { scale: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.3, 1.1, 0.9] }) }] }}>
      <Emo e={e} size={size} />
    </Animated.View>
  );
}
function Petal({ W, H, delay }) {
  const v = useRef(new Animated.Value(0)).current;
  const c = useMemo(() => ({ x: rnd(0, W), dx: rnd(-50, 50), size: rnd(14, 22), dur: rnd(2600, 4000), spin: rnd(1, 3), e: Math.random() < 0.7 ? '🌸' : '🤍' }), [W]);
  useEffect(() => {
    const a = Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: c.dur, easing: Easing.linear, useNativeDriver: ND })]);
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: c.x, top: -30, opacity: v.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, H + 40] }) }, { translateX: v.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0, c.dx, -c.dx * 0.6, c.dx * 0.3] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * c.spin}deg`] }) }] }}>
      <Emo e={c.e} size={c.size} />
    </Animated.View>
  );
}
// 家裡的寵物也來參加：坐在畫面兩側的地板上，碰面／寶寶出現之後才進場
function ScenePets({ pets, W, floorY, spH, at }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([Animated.delay(at), Animated.spring(v, { toValue: 1, friction: 5, tension: 70, useNativeDriver: ND })]);
    a.start();
    return () => a.stop();
  }, []);
  if (!pets || !pets.length) return null;
  const ps = spH * 0.3;
  return pets.map((p, i) => (
    <Animated.View key={p.uid || i} style={{ position: 'absolute', left: i === 0 ? W * 0.06 : W * 0.94 - ps * 1.1, top: floorY - ps + 6, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { scaleX: i === 0 ? -1 : 1 }] }}>
      <PetPic pet={p} height={ps} />
    </Animated.View>
  ));
}

function WeddingScene({ scene, W, H, title, sub }) {
  const walk = useRef(new Animated.Value(0)).current;
  const meet = useRef(new Animated.Value(0)).current;
  const me = scene.gender === 'female' ? 'female' : 'male';
  const other = me === 'female' ? 'male' : 'female';
  // 新郎在左、新娘在右（不管玩家是誰）
  const groomG = 'male'; const brideG = 'female';
  const spH = Math.min(H * 0.44, 380);
  const gid = spriteId(scene.age, groomG); const bid = spriteId(scene.age, brideG);
  const gW = (spH * SPRITE_SIZE[gid][0]) / SPRITE_SIZE[gid][1];
  const bH = spH * (SPRITE_SIZE[bid][1] / SPRITE_SIZE[gid][1]);
  const bW = (bH * SPRITE_SIZE[bid][0]) / SPRITE_SIZE[bid][1];
  const gap = 10;
  const gX = W / 2 - gW - gap / 2; const bX = W / 2 + gap / 2;
  const floorY = H * 0.5 + spH / 2;   // 兩人腳踩的線
  const groomName = me === 'male' ? scene.name : scene.spouse;
  const brideName = me === 'female' ? scene.name : scene.spouse;
  useEffect(() => {
    const a = Animated.sequence([
      Animated.timing(walk, { toValue: 1, duration: MEET_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      Animated.spring(meet, { toValue: 1, friction: 5, tension: 80, useNativeDriver: ND }),
    ]);
    a.start();
    return () => a.stop();
  }, []);
  // 走路的上下晃：走到一半晃六下，到了就停
  const steps = 6;
  const bobIn = Array.from({ length: steps * 2 + 1 }, (_, i) => i / (steps * 2));
  const bobOut = bobIn.map((_, i) => (i % 2 ? -7 : 0));
  const bob = walk.interpolate({ inputRange: bobIn, outputRange: bobOut });
  const hearts = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ id: i, x: W / 2 + rnd(-40, 40), y: floorY - spH * rnd(0.55, 0.8), delay: MEET_MS + 150 + i * 260, size: rnd(20, 32) })), [W]);
  const petals = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ id: i, delay: MEET_MS + i * 120 })), [W]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 聚光燈 */}
      <View style={{ position: 'absolute', left: W / 2 - spH * 0.7, top: floorY - spH * 1.25, width: spH * 1.4, height: spH * 1.4, borderRadius: spH, backgroundColor: 'rgba(255,220,240,0.10)' }} />
      {/* 紅毯 */}
      <View style={{ position: 'absolute', left: W * 0.08, right: W * 0.08, top: floorY - 10, height: 44, borderRadius: 22, backgroundColor: '#8a1f3a', opacity: 0.9 }} />
      <View style={{ position: 'absolute', left: W * 0.12, right: W * 0.12, top: floorY - 4, height: 30, borderRadius: 15, backgroundColor: '#b12a4c', opacity: 0.8 }} />
      {/* 新郎（左） */}
      <Animated.View style={{ position: 'absolute', left: gX, top: floorY - spH, transform: [{ translateX: walk.interpolate({ inputRange: [0, 1], outputRange: [-(gX + gW + 20), 0] }) }, { translateY: bob }] }}>
        <Sprite age={scene.age} gender={groomG} height={spH} />
      </Animated.View>
      {/* 新娘（右） */}
      <Animated.View style={{ position: 'absolute', left: bX, top: floorY - bH, transform: [{ translateX: walk.interpolate({ inputRange: [0, 1], outputRange: [W - bX + 20, 0] }) }, { translateY: bob }] }}>
        <Sprite age={scene.age} gender={brideG} height={bH} />
      </Animated.View>
      {/* 戒指：碰面那一刻彈出來 */}
      <Animated.View style={{ position: 'absolute', left: W / 2 - 30, top: floorY - spH - 34, opacity: meet, transform: [{ scale: meet.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>
        <Emo e="💍" size={60} />
      </Animated.View>
      {hearts.map((h) => <FloatHeart key={h.id} {...h} />)}
      {petals.map((p) => <Petal key={p.id} W={W} H={H} delay={p.delay} />)}
      <ScenePets pets={scene.pets} W={W} floorY={floorY} spH={spH} at={MEET_MS + 200} />
      {/* 標題 */}
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: Math.max(56, floorY - spH - 130), alignItems: 'center', opacity: meet, transform: [{ translateY: meet.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <Text style={styles.wedTitle}>{title}</Text>
        <Text style={styles.wedNames}>{groomName} <Text style={{ color: '#ff8fb0' }}>❤</Text> {brideName}</Text>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: floorY + 48, alignItems: 'center', opacity: meet }}>
        {sub ? <Text style={styles.wedSub}>{sub}</Text> : null}
        <Text style={styles.tapHint}>點一下繼續</Text>
      </Animated.View>
    </View>
  );
}

// ───────── 寶寶動畫：爸媽站在中間，寶寶從兩人中間彈出來、玩具飄，最後閃光燈拍一張全家福 ─────────
const BABY_MS = 1100;   // 寶寶出現的時間點（閃光燈、快門聲從這裡開始）
function BabyScene({ scene, W, H, title, sub }) {
  const enter = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const frame = useRef(new Animated.Value(0)).current;
  const me = scene.gender === 'female' ? 'female' : 'male';
  const spH = Math.min(H * 0.4, 340);
  const did = spriteId(scene.age, 'male'); const mid = spriteId(scene.age, 'female');
  const dW = (spH * SPRITE_SIZE[did][0]) / SPRITE_SIZE[did][1];
  const mH = spH * (SPRITE_SIZE[mid][1] / SPRITE_SIZE[did][1]);
  const mW = (mH * SPRITE_SIZE[mid][0]) / SPRITE_SIZE[mid][1];
  const kg = scene.kidGender === 'female' ? 'female' : 'male';
  const kid = spriteId(1, kg);
  const kH = spH * 0.42;
  const kW = (kH * SPRITE_SIZE[kid][0]) / SPRITE_SIZE[kid][1];
  const gap = kW + 6;   // 中間留給寶寶
  const dX = W / 2 - gap / 2 - dW; const mX = W / 2 + gap / 2;
  const floorY = H * 0.5 + spH / 2;
  const dadName = me === 'male' ? scene.name : scene.spouse;
  const momName = me === 'female' ? scene.name : scene.spouse;
  useEffect(() => {
    const a = Animated.sequence([
      Animated.timing(enter, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
      Animated.delay(BABY_MS - 700),
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 90, useNativeDriver: ND }),
      Animated.delay(200),
      Animated.spring(frame, { toValue: 1, friction: 6, tension: 60, useNativeDriver: ND }),
    ]);
    a.start();
    // 寶寶一直小小的上下彈
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bounce, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      Animated.timing(bounce, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
    ]));
    loop.start();
    return () => { a.stop(); loop.stop(); };
  }, []);
  const toys = useMemo(() => ['🍼', '🧸', '🎈', '⭐', '🧦', '🎀'].map((e, i) => ({ id: i, e, x: W / 2 + (i % 2 ? 1 : -1) * rnd(70, W * 0.4), y: floorY - spH * rnd(0.5, 0.95), delay: BABY_MS + 100 + i * 180, size: rnd(22, 34) })), [W]);
  const hearts = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ id: i, x: W / 2 + rnd(-30, 30), y: floorY - spH * 0.35, delay: BABY_MS + 200 + i * 300, size: rnd(18, 28) })), [W]);
  const fw = Math.min(W - 24, spH * 1.15); const fh = spH + 96;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: 'absolute', left: W / 2 - spH * 0.7, top: floorY - spH * 1.25, width: spH * 1.4, height: spH * 1.4, borderRadius: spH, backgroundColor: 'rgba(255,236,200,0.10)' }} />
      {/* 全家福的相框：拍照那一刻彈出來 */}
      <Animated.View style={{ position: 'absolute', left: W / 2 - fw / 2, top: floorY - spH - 56, width: fw, height: fh, borderRadius: 14, borderWidth: 10, borderColor: '#fff', backgroundColor: 'transparent', opacity: frame, transform: [{ scale: frame.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] }) }, { rotate: '-2deg' }] }} />
      {/* 爸爸（左）、媽媽（右）：從兩邊靠過來 */}
      <Animated.View style={{ position: 'absolute', left: dX, top: floorY - spH, opacity: enter, transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }] }}>
        <Sprite age={scene.age} gender="male" height={spH} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: mX, top: floorY - mH, opacity: enter, transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }}>
        <Sprite age={scene.age} gender="female" height={mH} />
      </Animated.View>
      {/* 寶寶：從兩人中間彈出來 */}
      <Animated.View style={{ position: 'absolute', left: W / 2 - kW / 2, top: floorY - kH, opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }) }, { translateY: Animated.add(pop.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }), bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -8] })) }] }}>
        <Sprite age={1} gender={kg} height={kH} />
      </Animated.View>
      {toys.map((h) => <FloatHeart key={`t${h.id}`} {...h} e={h.e} />)}
      {hearts.map((h) => <FloatHeart key={h.id} {...h} />)}
      <ScenePets pets={scene.pets} W={W} floorY={floorY} spH={spH} at={BABY_MS + 300} />
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: Math.max(56, floorY - spH - 150), alignItems: 'center', opacity: pop, transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <Text style={styles.wedTitle}>{title}</Text>
        <Text style={styles.wedNames}>{scene.kid}{scene.nth > 1 ? `　·　第 ${scene.nth} 個孩子` : ''}</Text>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: floorY + 52, alignItems: 'center', opacity: frame }}>
        <Text style={styles.wedNames}>{dadName} · {momName} · {scene.kid}</Text>
        {sub ? <Text style={[styles.wedSub, { marginTop: 4 }]}>{sub}</Text> : null}
        <Text style={styles.tapHint}>點一下繼續</Text>
      </Animated.View>
    </View>
  );
}

export default function Celebration({ data, onDone }) {
  const { width, height } = useWindowDimensions();
  const W = Math.min(width, 480);
  const left = (width - W) / 2;
  const card = useRef(new Animated.Value(0)).current;
  const tier = data ? data.tier : 'small';

  // 煙火的位置與時間（mega 多發、分好幾波）
  const fx = data ? data.fx : null;
  const flash = fx === 'flash' || fx === 'wedding' || fx === 'baby';   // 閃光燈系列
  const shots = useMemo(() => {
    if (!data || tier === 'small' || flash) return [];
    const n = tier === 'mega' ? 14 : 6;
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      x: rnd(W * 0.12, W * 0.88),
      y: rnd(height * 0.12, height * 0.42),
      color: COLORS[Math.floor(rnd(0, COLORS.length - 1))],
      size: rnd(W * 0.22, W * (tier === 'mega' ? 0.4 : 0.32)),
      delay: tier === 'mega' ? i * 260 + (i > 6 ? 500 : 0) : i * 330,
    }));
  }, [data && data.key]);

  // 閃光燈：二十幾顆，繞著卡片四周、時間點故意不整齊（跟 sfx 的快門聲對得上）
  const flashes = useMemo(() => {
    if (!data || !flash) return [];
    if (fx === 'baby') return [0, 0.5, 1.6].map((k, i) => ({ id: i, x: rnd(W * 0.2, W * 0.8), y: rnd(height * 0.08, height * 0.22), size: rnd(W * 0.2, W * 0.3), delay: k * 1000 + BABY_MS + 300 }));
    // 前兩秒最密（一群人同時按），後面零星幾下
    const ks = [];
    for (let k = 0; k < 4; k += k < 2 ? rnd(0.05, 0.14) : rnd(0.18, 0.4)) ks.push(k);
    return ks.map((k, i) => {
      // 上下兩帶（卡片在中間），左右隨機
      const top = Math.random() < 0.5;
      return { id: i, x: rnd(W * 0.06, W * 0.94), y: top ? rnd(height * 0.06, height * 0.3) : rnd(height * 0.7, height * 0.94), size: rnd(W * 0.18, W * 0.36), delay: k * 1000 + 80 + (fx === 'wedding' ? MEET_MS : fx === 'baby' ? BABY_MS + 300 : 0) };
    });
  }, [data && data.key]);
  const lag = fx === 'wedding' ? MEET_MS : fx === 'baby' ? BABY_MS + 300 : 0;   // 婚禮：等兩人走到中間才開始閃；寶寶：等寶寶出來
  const screenFlashes = fx === 'baby' ? [[80, 0.8], [580, 0.5], [1680, 0.6]].map(([d, k]) => [d + lag, k]) : flash ? [[80, 0.85], [210, 0.5], [440, 0.6], [790, 0.4], [1180, 0.45], [1700, 0.3]].map(([d, k]) => [d + lag, k]) : [];

  useEffect(() => {
    if (!data) return undefined;
    card.setValue(0);
    // 配樂：結婚放結婚的、寶寶放音樂盒、破億放大號角
    playSfx(data.sound || CELEBRATE_SOUND[tier] || 'coin');
    let clickT = null;
    if (flash && data.sound !== 'shutter') clickT = setTimeout(() => playSfx(fx === 'baby' ? 'snap' : 'clicks'), lag);   // 結婚：號角照放，走到中間快門聲才疊上去
    Animated.spring(card, { toValue: 1, friction: 6, tension: 70, useNativeDriver: ND }).start();
    const ms = fx === 'wedding' || fx === 'baby' ? 7000 : tier === 'small' ? 2200 : tier === 'big' ? 4200 : 6500;
    const t = setTimeout(() => onDone && onDone(), ms);
    return () => { clearTimeout(t); if (clickT) clearTimeout(clickT); };
  }, [data && data.key]);

  if (!data) return null;

  const coins = tier === 'small' ? 16 : tier === 'big' ? 0 : 36;
  const confetti = flash ? 0 : tier === 'small' ? 0 : tier === 'big' ? 30 : 60;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={[StyleSheet.absoluteFill, tier !== 'small' && styles.dark]} onPress={onDone}>
        <View style={{ position: 'absolute', left, top: 0, width: W, height }} pointerEvents="none">
          {shots.map((f) => <Firework key={f.id} {...f} fromY={height} />)}
          {screenFlashes.map(([d, pk], i) => <ScreenFlash key={`s${data.key}-${i}`} delay={d} peak={pk} />)}
          {flashes.map((f) => <CamFlash key={`l${data.key}-${f.id}`} {...f} />)}
          {Array.from({ length: confetti }, (_, i) => <Confetti key={`f${i}`} W={W} H={height} delay={i * 45 + 200} />)}
          {Array.from({ length: coins }, (_, i) => (
            <Coin key={`c${i}`} W={W} H={height} mode={tier === 'mega' ? 'rain' : 'fountain'} delay={tier === 'mega' ? 600 + i * 90 : i * 40} />
          ))}
        </View>

        {fx === 'wedding' && data.scene ? (
          <WeddingScene scene={data.scene} W={W} H={height} title={data.title} sub={data.more && data.more.length ? data.more.join('　') : ''} />
        ) : fx === 'baby' && data.scene ? (
          <BabyScene scene={data.scene} W={W} H={height} title={data.title} sub={data.more && data.more.length ? data.more.join('　') : ''} />
        ) : tier === 'small' ? (
          <Animated.View
            style={[styles.toast, {
              left: left + 16, width: W - 32,
              opacity: card,
              transform: [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }],
            }]}
          >
            <Text style={styles.toastIcon}>{data.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.toastTitle}>{data.title}</Text>
              {data.sub ? <Text style={styles.toastSub} numberOfLines={1}>{data.sub}</Text> : null}
            </View>
          </Animated.View>
        ) : (
          <View style={styles.center} pointerEvents="none">
            <Animated.View
              style={[tier === 'mega' ? styles.megaCard : styles.bigCard, flash && styles.flashCard, fx === 'wedding' && styles.weddingCard, {
                opacity: card.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
                transform: [{ scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
              }]}
            >
              <Text style={tier === 'mega' ? styles.megaIcon : styles.bigIcon}>{data.icon}</Text>
              {tier === 'mega' ? <Text style={styles.megaNum}>{formatMoney(YI).replace(' ', '')}</Text> : null}
              <Text style={tier === 'mega' ? styles.megaTitle : styles.bigTitle}>{data.title}</Text>
              {data.sub ? <Text style={styles.bigSub}>{data.sub}</Text> : null}
              {data.more && data.more.length ? <Text style={styles.more}>{data.more.join('　')}</Text> : null}
              <Text style={styles.tapHint}>點一下繼續</Text>
            </Animated.View>
          </View>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dark: { backgroundColor: 'rgba(6,8,30,0.82)' },
  rocket: { position: 'absolute', width: 4, height: 14, borderRadius: 2, backgroundColor: '#fff4c2' },
  flash: { position: 'absolute' },
  coin: { backgroundColor: '#f5a524', borderWidth: 2, borderColor: '#ffe08a', alignItems: 'center', justifyContent: 'center' },
  coinText: { color: '#8a5a00', fontWeight: '900' },

  toast: {
    position: 'absolute', top: 54, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18,
    backgroundColor: 'rgba(20,24,70,0.94)', borderWidth: 1, borderColor: 'rgba(255,215,106,0.6)',
    shadowColor: '#ffd76a', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 4 }, elevation: 10,
  },
  toastIcon: { fontSize: 30 },
  toastTitle: { fontSize: 17, fontWeight: '800', color: '#ffd76a' },
  toastSub: { fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  bigCard: {
    alignItems: 'center', paddingHorizontal: 26, paddingVertical: 24, borderRadius: 26, maxWidth: 360,
    backgroundColor: 'rgba(24,28,80,0.92)', borderWidth: 1.5, borderColor: '#9d8cff',
    shadowColor: '#9d8cff', shadowOpacity: 0.8, shadowRadius: 30, elevation: 16,
  },
  bigIcon: { fontSize: 64 },
  bigTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginTop: 8, textAlign: 'center' },
  bigSub: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center' },
  more: { fontSize: 13, color: '#ffd76a', marginTop: 10, textAlign: 'center' },
  tapHint: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 16 },

  flashCard: { borderColor: '#ffffff', backgroundColor: 'rgba(30,20,50,0.94)', shadowColor: '#ffffff', shadowOpacity: 0.9, shadowRadius: 36 },
  weddingCard: { backgroundColor: 'rgba(70,24,60,0.94)', shadowColor: '#ffc2d6' },
  wedTitle: { fontSize: 34, fontWeight: '900', color: '#fff', textShadowColor: '#ff8fb0', textShadowRadius: 18 },
  wedNames: { fontSize: 17, fontWeight: '800', color: '#ffd9e6', marginTop: 6 },
  wedSub: { fontSize: 13, color: '#ffd76a', textAlign: 'center' },
  megaCard: {
    alignItems: 'center', paddingHorizontal: 30, paddingVertical: 28, borderRadius: 30, maxWidth: 380,
    backgroundColor: 'rgba(40,28,10,0.9)', borderWidth: 2, borderColor: '#ffd76a',
    shadowColor: '#ffd76a', shadowOpacity: 1, shadowRadius: 40, elevation: 20,
  },
  megaIcon: { fontSize: 72 },
  megaNum: { fontSize: 44, fontWeight: '900', color: '#ffd76a', marginTop: 4, letterSpacing: -1, textShadowColor: '#ff9f1a', textShadowRadius: 18 },
  megaTitle: { fontSize: 30, fontWeight: '900', color: '#fff', marginTop: 4 },
});
