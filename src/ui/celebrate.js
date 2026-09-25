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
  const add = (tier, icon, title, sub, sound) => out.push({ tier, icon, title, sub, sound });

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

  // 出道
  if ((prev.flags?.idol || 0) < 2 && next.flags?.idol === 2) add('big', '🌟', '正式出道！', '從練習生變成偶像');

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
  if (!prev.married && next.married) add('big', '💍', '結婚了！', next.spouse ? `和 ${next.spouse.name}` : '', 'wedding');
  if ((next.kids || []).length > (prev.kids || []).length) {
    const k = next.kids[next.kids.length - 1];
    add('big', '👶', '寶寶出生了！', k && k.name ? k.name : '', 'baby');
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

export default function Celebration({ data, onDone }) {
  const { width, height } = useWindowDimensions();
  const W = Math.min(width, 480);
  const left = (width - W) / 2;
  const card = useRef(new Animated.Value(0)).current;
  const tier = data ? data.tier : 'small';

  // 煙火的位置與時間（mega 多發、分好幾波）
  const shots = useMemo(() => {
    if (!data || tier === 'small') return [];
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

  useEffect(() => {
    if (!data) return undefined;
    card.setValue(0);
    // 配樂：結婚放結婚的、寶寶放音樂盒、破億放大號角
    playSfx(data.sound || CELEBRATE_SOUND[tier] || 'coin');
    Animated.spring(card, { toValue: 1, friction: 6, tension: 70, useNativeDriver: ND }).start();
    const ms = tier === 'small' ? 2200 : tier === 'big' ? 4200 : 6500;
    const t = setTimeout(() => onDone && onDone(), ms);
    return () => clearTimeout(t);
  }, [data && data.key]);

  if (!data) return null;

  const coins = tier === 'small' ? 16 : tier === 'big' ? 0 : 36;
  const confetti = tier === 'small' ? 0 : tier === 'big' ? 30 : 60;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={[StyleSheet.absoluteFill, tier !== 'small' && styles.dark]} onPress={onDone}>
        <View style={{ position: 'absolute', left, top: 0, width: W, height }} pointerEvents="none">
          {shots.map((f) => <Firework key={f.id} {...f} fromY={height} />)}
          {Array.from({ length: confetti }, (_, i) => <Confetti key={`f${i}`} W={W} H={height} delay={i * 45 + 200} />)}
          {Array.from({ length: coins }, (_, i) => (
            <Coin key={`c${i}`} W={W} H={height} mode={tier === 'mega' ? 'rain' : 'fountain'} delay={tier === 'mega' ? 600 + i * 90 : i * 40} />
          ))}
        </View>

        {tier === 'small' ? (
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
              style={[tier === 'mega' ? styles.megaCard : styles.bigCard, {
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

  megaCard: {
    alignItems: 'center', paddingHorizontal: 30, paddingVertical: 28, borderRadius: 30, maxWidth: 380,
    backgroundColor: 'rgba(40,28,10,0.9)', borderWidth: 2, borderColor: '#ffd76a',
    shadowColor: '#ffd76a', shadowOpacity: 1, shadowRadius: 40, elevation: 20,
  },
  megaIcon: { fontSize: 72 },
  megaNum: { fontSize: 44, fontWeight: '900', color: '#ffd76a', marginTop: 4, letterSpacing: -1, textShadowColor: '#ff9f1a', textShadowRadius: 18 },
  megaTitle: { fontSize: 30, fontWeight: '900', color: '#fff', marginTop: 4 },
});
