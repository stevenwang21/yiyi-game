// 金額滑桿：拖曳或點百分比選金額，按「確認」才成交。
// 從 2,105 元的零用錢到上億的資產都能用（金額以「可用的最大值」的百分比計算）。
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from './theme';
import { haptic } from './celebrate';
import { formatMoney } from '../game/engine';

const WAN = 10000;
const SNAPS = [0.25, 0.5, 0.75];
const CHIPS = [
  { label: '10%', p: 0.1 },
  { label: '25%', p: 0.25 },
  { label: '50%', p: 0.5 },
  { label: '全部', p: 1 },
];

// 依金額大小取整：小錢到 10 元、中等到千、大錢到萬
function roundAmount(v, max) {
  if (v >= max) return max;
  const step = max < WAN ? 10 : max < 100 * WAN ? 1000 : WAN;
  return Math.max(0, Math.round(v / step) * step);
}

/**
 * modes: [{ key, label, max, verb, color }]  可以切換（例如買進／賣出）；只有一個就不顯示切換
 * onConfirm(modeKey, amount)  回傳 true 代表成功（會把滑桿歸零）
 * preview(modeKey, amount)  選填：金額下面的小提示
 */
export default function AmountSlider({ modes, onConfirm, preview, disabledText }) {
  const [modeKey, setModeKey] = useState(modes[0].key);
  const mode = modes.find((m) => m.key === modeKey) || modes[0];
  const max = Math.max(0, Math.floor(mode.max || 0));
  const [p, setP] = useState(0);
  const width = useRef(1);
  const startP = useRef(0);
  const lastTick = useRef(0);
  const pRef = useRef(0);
  pRef.current = p;

  // 換模式或上限變了：歸零
  useEffect(() => { setP(0); }, [modeKey]);
  useEffect(() => { if (max <= 0) setP(0); }, [max]);

  const set = (v, snap) => {
    let x = Math.max(0, Math.min(1, v));
    if (snap) for (const s of SNAPS) if (Math.abs(x - s) < 0.025) x = s;
    if (x > 0.985) x = 1;
    // 每跨過 10% 輕震一下
    const tick = Math.floor(x * 10);
    if (tick !== lastTick.current) { lastTick.current = tick; haptic('tap'); }
    setP(x);
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX;
      const v = x / width.current;
      startP.current = Math.max(0, Math.min(1, v));
      set(startP.current, true);
    },
    onPanResponderMove: (_, g) => set(startP.current + g.dx / width.current, true),
  })).current;

  const amount = roundAmount(max * p, max);
  const off = max <= 0;
  const color = mode.color || C.primary;

  return (
    <View style={[styles.wrap, off && { opacity: 0.5 }]}>
      {modes.length > 1 ? (
        <View style={styles.modeRow}>
          {modes.map((m) => {
            const on = m.key === modeKey;
            return (
              <Pressable key={m.key} onPress={() => setModeKey(m.key)} style={[styles.modeBtn, on && { backgroundColor: m.color || C.primary }]}>
                <Text style={[styles.modeText, on && { color: '#fff' }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* 滑桿 */}
      <View
        style={[styles.trackHit, Platform.OS === 'web' && { touchAction: 'none', cursor: off ? 'default' : 'pointer', userSelect: 'none' }]}
        onLayout={(e) => { width.current = Math.max(1, e.nativeEvent.layout.width); }}
        {...(off ? {} : pan.panHandlers)}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${p * 100}%`, backgroundColor: color }]} />
          {SNAPS.map((s) => <View key={s} style={[styles.tick, { left: `${s * 100}%` }]} />)}
        </View>
        <View pointerEvents="none" style={[styles.thumb, { left: `${p * 100}%`, borderColor: color }]} />
      </View>

      <View style={styles.chips}>
        {CHIPS.map((c) => {
          const on = Math.abs(p - c.p) < 0.001;
          return (
            <Pressable key={c.label} disabled={off} onPress={() => { haptic('tap'); setP(c.p); }} style={[styles.chip, on && { borderColor: color, backgroundColor: C.primarySoft }]}>
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.bottom}>
        <View style={{ flex: 1 }}>
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {off ? (disabledText || '目前沒有可用的金額') : `${mode.verb} ${formatMoney(amount)}`}
          </Text>
          {!off ? (
            <Text style={styles.sub} numberOfLines={1}>
              {preview && amount > 0 ? preview(mode.key, amount) : `最多 ${formatMoney(max)}`}
            </Text>
          ) : null}
        </View>
        <Pressable
          disabled={off || amount <= 0}
          onPress={() => { if (onConfirm(mode.key, amount)) { haptic('small'); setP(0); lastTick.current = 0; } }}
          style={({ pressed }) => [styles.ok, { backgroundColor: color }, (off || amount <= 0) && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <Text style={styles.okText}>確認</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10 },
  modeRow: { flexDirection: 'row', backgroundColor: C.page, borderRadius: 12, padding: 3, marginBottom: 6 },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10 },
  modeText: { fontSize: 14, fontWeight: '700', color: C.muted },
  trackHit: { height: 40, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: C.page, overflow: 'visible' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  tick: { position: 'absolute', top: -3, width: 2, height: 14, marginLeft: -1, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  thumb: {
    position: 'absolute', top: 8, width: 24, height: 24, marginLeft: -12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  chips: { flexDirection: 'row', gap: 6, marginTop: 2 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: C.cardLine },
  chipText: { fontSize: 13, fontWeight: '600', color: C.muted },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  amount: { fontSize: 19, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  sub: { fontSize: 12, color: C.muted, marginTop: 1 },
  ok: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 14 },
  okText: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
});
