// 人生回顧：資產曲線一年一年畫出來，走到重要的年紀就跳出「幾歲發生了什麼」。
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as E from '../game/engine';
import { haptic } from './celebrate';
import LifeWalk from './LifeWalk';

const ND = Platform.OS !== 'web';
const WAN = 10000;
const YEAR_MS = 260; // 一年幾毫秒（放慢一點，看得到長大的過程）
const WALK_H = 200;
const HOLD_MS = 900; // 遇到大事停一下

// ── 挑出每一年最值得回顧的事 ─────────────────────────
const KEYWORDS = [
  [10, ['你成為了「', '完成！獲得稱號', '求婚，對方答應', '答應了！在親友祝福下', '出生了', '考上了頂尖', '你出道了', '紅了！', '倒閉', '破產', '強制處分', '正式成為職業樂團', '當阿公／阿嬤']],
  [7, ['開始擔任', '你升為', '你成立了', '買下', '你考上了', '考上研究所', '畢業', '開始交往', '分手', '住院', '裁員', '冠軍', '金牌', '被倒帳', '中獎', '收購', '上小學', '提早一年入學', '安詳地離開']],
];
const SKIP = ['現金不足', '健康警訊', '今年：', '銀行不肯'];

const cleanText = (t) => t
  .replace(/（[^）]*[+-]\d[^）]*）/g, '')
  .replace(/（爸媽[^）]*）/g, '')
  .replace(/（[^）]*）$/g, '')
  .trim();

function shortOf(text) {
  const m = text.match(/^【([^】]+)】(.*)$/);
  const body = cleanText(m ? m[2] : text);
  const first = body.split(/[。！？]/)[0] || body;
  const s = first.length > 30 ? `${first.slice(0, 29)}…` : first;
  return m ? `${m[1]}：${s}` : s;
}

function scoreOf(l) {
  if (!l || !l.text) return 0;
  if (['money', 'focus', 'world', 'world-bad'].includes(l.tone)) return 0;
  if (SKIP.some((k) => l.text.includes(k))) return 0;
  // 只看內文（不看【標題】），避免「朋友結婚」這種被誤判
  const body = l.text.replace(/^【[^】]+】/, '');
  for (const [w, list] of KEYWORDS) if (list.some((k) => body.includes(k))) return w + (l.tone === 'milestone' ? 1 : 0);
  const big = l.text.match(/\+([\d,]+) 萬/);
  if (big && Number(big[1].replace(/,/g, '')) >= 100) return 6;
  if (l.tone === 'milestone') return 6;
  return 0;
}

export function buildHighlights(s) {
  const byAge = new Map();
  const add = (age, item) => {
    const cur = byAge.get(age);
    if (!cur || item.score > cur.score) byAge.set(age, item);
  };
  for (const l of s.log || []) {
    const sc = scoreOf(l);
    if (sc >= 6 && l.age > 0) add(l.age, { age: l.age, text: shortOf(l.text), tone: l.tone === 'bad' ? 'bad' : 'good', score: sc });
  }
  // 資產門檻（從曲線算）
  const h = s.history || [];
  const marks = [[100 * WAN, '💰 資產破百萬'], [1000 * WAN, '💎 資產破千萬'], [E.YI, '🎉 資產破一億！']];
  for (const [v, t] of marks) {
    const age = h.findIndex((x) => x >= v);
    if (age > 0) add(age, { age, text: t, tone: 'gold', score: v >= E.YI ? 20 : 8 });
  }
  // 成長的里程碑（跳級的人每個階段早一年）
  const sk = (s.flags && s.flags.skipYears) || 0;
  const eduRank = { none: 0, junior: 1, senior: 2, vocational: 2, techCollege: 3, college: 3, topCollege: 3, master: 4, topMaster: 4 }[s.edu] || 0;
  const grow = [
    [1, '👣 學會走路了'], [3, '🎒 上幼兒園'], [6 - sk, '🏫 上小學了'], [12 - sk, '🎓 國小畢業'], [15 - sk, '🎓 國中畢業'],
  ];
  if (eduRank >= 2 || s.studying === false) grow.push([18 - sk, '🎓 高中畢業']);
  if (eduRank >= 3) grow.push([22 - sk, '🎓 大學畢業']);
  if (eduRank >= 4) grow.push([24 - sk, '🎓 研究所畢業']);
  const last = (s.history || []).length - 1;
  for (const [a, text] of grow) if (a > 0 && a <= last) add(a, { age: a, text, tone: 'good', score: 6.5, grad: text.startsWith('🎓') });
  if (last >= 60 && !(s.ended && s.ended.reason === 'death')) add(last, { age: last, text: '🌅 退休了，開始享受人生', tone: 'good', score: 6.5 });
  if (s.best && s.best.gain > 0) add(s.best.age, { age: s.best.age, text: `💡 最賺錢的決定：${s.best.label.split('：')[0]}（+${E.formatMoney(s.best.gain)}）`, tone: 'good', score: 9 });
  if (s.worst && s.worst.gain < 0) add(s.worst.age, { age: s.worst.age, text: `💥 最大的失誤：${s.worst.label.split('：')[0]}（${E.formatMoney(s.worst.gain)}）`, tone: 'bad', score: 9 });
  return [...byAge.values()].sort((a, b) => a.age - b.age);
}

const stageName = (age) => (age < 6 ? '童年' : age < 12 ? '國小' : age < 15 ? '國中' : age < 18 ? '高中' : age < 23 ? '大學' : age < 40 ? '打拚' : age < 60 ? '中年' : '退休');

// 一句話（上下跳出來）
function Caption({ item, big }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: 1, friction: 7, tension: 80, useNativeDriver: ND }).start(); }, []);
  const color = item.tone === 'gold' ? '#ffd76a' : item.tone === 'bad' ? '#ff8a80' : '#b8f5d6';
  return (
    <Animated.View style={[styles.cap, big && styles.capBig, item.tone === 'gold' && styles.capGold, {
      opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
    }]}
    >
      <Text style={[styles.capAge, { color }]}>{item.age} 歲</Text>
      <Text style={[styles.capText, big && { fontSize: 16.5 }]} numberOfLines={2}>{item.text}</Text>
    </Animated.View>
  );
}

export default function LifeReplay({ game, visible, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const W = Math.min(width, 480);
  const hist = game.history || [0];
  const lastAge = hist.length - 1;
  const highlights = useMemo(() => buildHighlights(game), [game]);
  const crashAges = useMemo(() => new Set((game.worldHistory || []).filter((w) => ['pandemic', 'war', 'crisis'].includes(w.id)).map((w) => w.age)), [game]);
  const [age, setAge] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [shown, setShown] = useState([]);
  const timer = useRef(null);

  const reset = () => { setAge(0); setShown([]); setPlaying(true); };
  useEffect(() => { if (visible) reset(); }, [visible]);

  useEffect(() => {
    if (!visible || !playing) return undefined;
    if (age >= lastAge) { setPlaying(false); haptic('small'); return undefined; }
    const next = age + 1;
    const hit = highlights.filter((x) => x.age === next);
    // 這一年剛跳出大事：多停一下讓人看完
    const cur = highlights.filter((x) => x.age === age);
    const hold = cur.some((x) => x.score >= 9) ? HOLD_MS : cur.length ? HOLD_MS * 0.6 : 0;
    timer.current = setTimeout(() => {
      setAge(next);
      if (hit.length) {
        setShown((q) => [...q, ...hit].slice(-4));
        haptic(hit.some((x) => x.tone === 'gold' && x.score >= 20) ? 'big' : 'tap');
      }
    }, YEAR_MS + hold);
    return () => clearTimeout(timer.current);
  }, [visible, playing, age]);

  const skip = () => { clearTimeout(timer.current); setAge(lastAge); setShown(highlights.slice(-4)); setPlaying(false); };

  // 曲線
  const CW = W - 32; const CH = Math.max(110, Math.min(150, height * 0.18));
  const PAD = { l: 6, r: 10, t: 12, b: 20 };
  const vals = hist.filter((v) => Number.isFinite(v));
  const maxV = Math.max(100 * WAN, ...vals) * 1.08;
  // 負債很深的年份不要把整張圖壓扁：最低只畫到最高值的 -40%
  const minV = Math.max(Math.min(0, ...vals), -maxV * 0.4);
  const x = (a) => PAD.l + (a / Math.max(1, lastAge)) * (CW - PAD.l - PAD.r);
  const y = (v) => {
    const vv = Number.isFinite(v) ? Math.max(minV, Math.min(maxV, v)) : 0;
    return PAD.t + (1 - (vv - minV) / (maxV - minV)) * (CH - PAD.t - PAD.b);
  };
  const pts = hist.slice(0, age + 1).map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0].toFixed(1)},${y(minV)} L${pts[0][0].toFixed(1)},${y(minV)} Z` : '';
  const head = pts[pts.length - 1] || [x(0), y(0)];
  const nw = hist[Math.min(age, lastAge)] || 0;
  const yiY = y(E.YI);
  const showYi = maxV >= E.YI * 0.45;
  const done = age >= lastAge && !playing;
  const sum = done ? E.summary(game) : null;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0f1636', alignItems: 'center' }}>
        <View style={[styles.wrap, { width: W, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.top}>
            <Text style={styles.kicker}>🎬 {game.name} 的人生回顧</Text>
            <Pressable onPress={onClose} hitSlop={10}><Text style={styles.close}>關閉</Text></Pressable>
          </View>

          {/* 小劇場：主角一路長大、往前走 */}
          <View style={{ marginTop: 10 }}>
            <LifeWalk
              age={age}
              name={game.name}
              gender={game.gender}
              width={W - 32}
              height={WALK_H}
              grad={highlights.some((h) => h.age === age && h.grad)}
              playing={visible && !done}
            />
            <View style={styles.overTop} pointerEvents="none">
              <View style={styles.pill}>
                <Text style={styles.age}>{age}<Text style={styles.ageUnit}> 歲</Text></Text>
                <Text style={styles.stage}>{stageName(age)}</Text>
              </View>
              <View style={[styles.pill, { alignItems: 'flex-end' }]}>
                <Text style={styles.nwLabel}>淨資產</Text>
                <Text style={[styles.nw, nw >= E.YI && { color: '#ffd76a' }, nw < 0 && { color: '#ff8a80' }]} numberOfLines={1}>{E.formatMoney(nw)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.chartCard}>
            <Svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`}>
              <Defs>
                <LinearGradient id="rpArea" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#ffb547" stopOpacity="0.45" />
                  <Stop offset="1" stopColor="#ffb547" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              {/* 災難年份 */}
              {[...crashAges].filter((a) => a <= age).map((a) => (
                <Rect key={a} x={x(a) - 3} y={PAD.t} width={6} height={CH - PAD.t - PAD.b} fill="#ff5d52" opacity={0.28} />
              ))}
              {showYi ? (
                <>
                  <Line x1={PAD.l} x2={CW - PAD.r} y1={yiY} y2={yiY} stroke="#ff8a80" strokeDasharray="5,5" strokeWidth={1.2} />
                  <SvgText x={PAD.l + 4} y={yiY - 5} fontSize={11} fill="#ff8a80">1 億</SvgText>
                </>
              ) : null}
              <Line x1={PAD.l} x2={CW - PAD.r} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              {area ? <Path d={area} fill="url(#rpArea)" /> : null}
              {line ? <Path d={line} stroke="#ffb547" strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
              {/* 大事的小點 */}
              {highlights.filter((h) => h.age <= age).map((h) => (
                <Circle key={`h${h.age}`} cx={x(h.age)} cy={y(hist[h.age] || 0)} r={3.5} fill={h.tone === 'bad' ? '#ff8a80' : h.tone === 'gold' ? '#ffd76a' : '#7ee2b8'} />
              ))}
              <Circle cx={head[0]} cy={head[1]} r={11} fill="#ffd76a" opacity={0.25} />
              <Circle cx={head[0]} cy={head[1]} r={5.5} fill="#ffd76a" stroke="#fff" strokeWidth={2} />
              <SvgText x={PAD.l} y={CH - 5} fontSize={11} fill="rgba(255,255,255,0.5)">0歲</SvgText>
              <SvgText x={CW - PAD.r} y={CH - 5} fontSize={11} fill="rgba(255,255,255,0.5)" textAnchor="end">{lastAge}歲</SvgText>
            </Svg>
            {/* 進度條 */}
            <View style={styles.prog}><View style={[styles.progFill, { width: `${(age / Math.max(1, lastAge)) * 100}%` }]} /></View>
          </View>

          <View style={styles.caps}>
            {done ? (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6, paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
                {highlights.map((h) => (
                  <View key={`all${h.age}`} style={styles.row}>
                    <Text style={[styles.rowAge, { color: h.tone === 'gold' ? '#ffd76a' : h.tone === 'bad' ? '#ff8a80' : '#b8f5d6' }]}>{h.age} 歲</Text>
                    <Text style={styles.rowText} numberOfLines={2}>{h.text}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            {done ? (
              <View style={styles.endCard}>
                <Text style={styles.endTitle}>{sum.headline}</Text>
                <Text style={styles.endSub}>{game.ended ? game.ended.age : lastAge} 歲．{E.formatMoney(sum.nw)}．稱號「{sum.title}」</Text>
                <Text style={styles.endMore}>這一生共有 {highlights.length} 個重要時刻</Text>
              </View>
            ) : null}
            {!done && shown.length === 0 ? <Text style={styles.wait}>人生開始了……</Text> : null}
            {!done ? shown.map((h, i) => <Caption key={`${h.age}-${h.text}`} item={h} big={i === shown.length - 1} />) : null}
          </View>

          <View style={styles.btns}>
            {done ? (
              <>
                <Pressable onPress={reset} style={[styles.btn, styles.btnGhost]}><Text style={styles.btnText}>↺ 再看一次</Text></Pressable>
                <Pressable onPress={onClose} style={[styles.btn, styles.btnMain]}><Text style={styles.btnText}>完成</Text></Pressable>
              </>
            ) : (
              <>
                <Pressable onPress={() => setPlaying(!playing)} style={[styles.btn, styles.btnGhost]}><Text style={styles.btnText}>{playing ? '⏸ 暫停' : '▶ 繼續'}</Text></Pressable>
                <Pressable onPress={skip} style={[styles.btn, styles.btnGhost]}><Text style={styles.btnText}>⏭ 跳到結尾</Text></Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '700' },
  close: { color: '#b3a8ff', fontSize: 15, fontWeight: '700' },
  overTop: { position: 'absolute', left: 10, right: 10, top: 10, flexDirection: 'row', justifyContent: 'space-between' },
  pill: { backgroundColor: 'rgba(10,14,45,0.62)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, gap: 12 },
  age: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  ageUnit: { fontSize: 14, fontWeight: '700', letterSpacing: 0 },
  stage: { color: '#c9c1ff', fontSize: 12, fontWeight: '700', marginTop: -2 },
  nwLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  nw: { color: '#fff', fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chartCard: {
    marginTop: 12, borderRadius: 22, paddingTop: 8, paddingBottom: 10, alignItems: 'center',
    backgroundColor: 'rgba(27,34,86,0.85)', borderWidth: 1, borderColor: 'rgba(140,170,255,0.22)',
  },
  prog: { width: '88%', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 4, overflow: 'hidden' },
  progFill: { height: 4, backgroundColor: '#b3a8ff' },
  caps: { flex: 1, justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  wait: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 20, fontSize: 15 },
  cap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(27,34,86,0.75)', borderWidth: 1, borderColor: 'rgba(140,170,255,0.2)', opacity: 0.8,
  },
  capBig: { backgroundColor: 'rgba(46,43,120,0.95)', borderColor: '#9d8cff', paddingVertical: 14 },
  capGold: { borderColor: '#ffd76a', backgroundColor: 'rgba(70,52,16,0.9)' },
  capAge: { fontSize: 15, fontWeight: '900', width: 52, fontVariant: ['tabular-nums'] },
  capText: { flex: 1, color: '#fff', fontSize: 14.5, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  rowAge: { width: 50, fontSize: 13.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rowText: { flex: 1, color: 'rgba(255,255,255,0.88)', fontSize: 13.5, lineHeight: 19 },
  endCard: {
    alignItems: 'center', borderRadius: 22, paddingVertical: 16, paddingHorizontal: 16, marginTop: 4,
    backgroundColor: 'rgba(46,43,120,0.95)', borderWidth: 1.5, borderColor: '#ffd76a',
  },
  endTitle: { color: '#ffd76a', fontSize: 24, fontWeight: '900' },
  endSub: { color: '#fff', fontSize: 15, marginTop: 8, textAlign: 'center' },
  endMore: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 6 },
  btns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(140,170,255,0.3)' },
  btnMain: { backgroundColor: '#6a5cff' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
