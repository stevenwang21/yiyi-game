import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { C } from './theme';

const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, sans-serif' : undefined;

// 把最大值進位成好讀的數字（例如 1.1億 → 1.5億）
const niceCeil = (v) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return (Math.ceil((v / p) * 2) / 2) * p;
};

// 折線圖
// series: [{ key, label, color, values }]，values[i] 對應年齡 xStart + i
// refLine: { value, label }：一條虛線（例如一億）
// marks: [age]：在 X 軸上標記的年份（例如股災）
export default function LineChart({
  series, xStart = 0, height = 150, format = (v) => String(Math.round(v)), refLine, marks = [], minZero = true,
  scrub = true, tipFormat,
}) {
  const [w, setW] = useState(0);
  // 按住圖表可以看某一年的數字
  const [pick, setPick] = useState(null);
  const padL = 46;
  const padR = 12;
  const padT = 10;
  const padB = 20;
  const n = Math.max(...series.map((s) => s.values.length), 0);

  const all = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  let lo = all.length ? Math.min(...all) : 0;
  let hi = all.length ? Math.max(...all) : 1;
  if (refLine) hi = Math.max(hi, refLine.value * 1.05);
  if (minZero) lo = Math.min(0, lo);
  if (hi === lo) hi = lo + 1;
  if (minZero) {
    hi = niceCeil(hi);
    if (lo < 0) lo = -niceCeil(-lo);
  } else {
    const pad = (hi - lo) * 0.06;
    hi += pad;
    lo -= pad;
  }

  const innerW = Math.max(1, w - padL - padR);
  const innerH = height - padT - padB;
  const x = (i) => padL + (n <= 1 ? innerW : (i / (n - 1)) * innerW);
  const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * innerH;
  // 刻度：有負數時多畫一條 0，但和上下太靠近就不畫，免得字疊在一起
  const ticks = minZero && lo < 0
    ? [lo, 0, hi].filter((t, i) => i !== 1 || (Math.abs(0 - lo) / (hi - lo) > 0.14 && Math.abs(hi - 0) / (hi - lo) > 0.14))
    : [lo, lo + (hi - lo) / 2, hi];
  const lastAge = xStart + n - 1;
  const xTicks = n > 1 ? [xStart, Math.round(xStart + (n - 1) / 2), lastAge] : [xStart];

  // 手指按在哪一年
  const pickAt = (px) => {
    if (!scrub || n < 1 || innerW <= 0) return;
    const t = (px - padL) / innerW;
    setPick(Math.max(0, Math.min(n - 1, Math.round(t * (n - 1)))));
  };
  const touch = scrub ? {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    // 如果玩家其實是想捲動畫面，就把觸控還給 ScrollView
    // 手指按在圖表上就一路跟著走，不讓外面的捲動把它搶走
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e) => pickAt(e.nativeEvent.locationX),
    onResponderMove: (e) => pickAt(e.nativeEvent.locationX),
    onResponderRelease: () => setPick(null),
    onResponderTerminate: () => setPick(null),
  } : {};
  const fmtTip = tipFormat || format;
  const px = pick != null ? x(pick) : 0;
  const tipRight = pick != null && px < padL + innerW / 2;

  return (
    <View>
      <View
        style={[{ height }, scrub && Platform.OS === 'web' ? { userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none', cursor: 'crosshair' } : null]}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        {...touch}
      >
        {w > 0 && n > 0 ? (
          <Svg width={w} height={height}>
            {ticks.map((t, i) => (
              <Line key={`g${i}`} x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke={C.line} strokeWidth={1} />
            ))}
            {ticks.map((t, i) => (
              <SvgText key={`t${i}`} x={padL - 6} y={y(t) + 4} fontSize={10} fontFamily={FONT} fill={C.muted} textAnchor="end">{format(t)}</SvgText>
            ))}
            {xTicks.map((a) => (
              <SvgText key={`x${a}`} x={x(a - xStart)} y={height - 4} fontSize={10} fontFamily={FONT} fill={C.muted} textAnchor="middle">{`${a}歲`}</SvgText>
            ))}
            {marks.filter((a) => a >= xStart && a <= lastAge).map((a) => (
              <Line key={`m${a}`} x1={x(a - xStart)} x2={x(a - xStart)} y1={padT} y2={padT + innerH} stroke={C.red} strokeOpacity={0.18} strokeWidth={4} />
            ))}
            {refLine ? (
              <G>
                <Line x1={padL} x2={w - padR} y1={y(refLine.value)} y2={y(refLine.value)} stroke={C.red} strokeWidth={1} strokeDasharray="4 4" />
                <SvgText x={padL + 4} y={y(refLine.value) - 4} fontSize={10} fontFamily={FONT} fill={C.red}>{refLine.label}</SvgText>
              </G>
            ) : null}
            {series.map((s) => {
              const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
              const last = s.values.length - 1;
              return (
                <G key={s.key}>
                  {s.values.length > 1 ? (
                    <Polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
                  ) : null}
                  {last >= 0 ? <Circle cx={x(last)} cy={y(s.values[last])} r={3.5} fill={s.color} /> : null}
                </G>
              );
            })}
            {/* 按住時：一條直線標出那一年，每條線上點一個圓 */}
            {pick != null ? (
              <G>
                <Line x1={px} x2={px} y1={padT} y2={padT + innerH} stroke={C.ink} strokeOpacity={0.45} strokeWidth={1} />
                {series.map((s) => (Number.isFinite(s.values[pick]) ? (
                  <Circle key={`p${s.key}`} cx={px} cy={y(s.values[pick])} r={4.5} fill={s.color} stroke={C.bg} strokeWidth={1.5} />
                ) : null))}
              </G>
            ) : null}
          </Svg>
        ) : null}
        {pick != null ? (
          <View
            pointerEvents="none"
            style={[styles.tip, tipRight ? { left: Math.min(px + 10, Math.max(0, w - 176)) } : { right: Math.min(w - px + 10, Math.max(0, w - 176)) }]}
          >
            <Text style={styles.tipAge}>{xStart + pick} 歲</Text>
            {series.map((s) => (Number.isFinite(s.values[pick]) ? (
              <View key={`tt${s.key}`} style={styles.tipRow}>
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                {series.length > 1 ? <Text style={styles.tipLabel} numberOfLines={1}>{s.label}</Text> : null}
                <Text style={styles.tipVal}>{fmtTip(s.values[pick])}</Text>
                {(() => {
                  const p = pick > 0 ? s.values[pick - 1] : null;
                  if (!Number.isFinite(p) || !p) return null;
                  const d = s.values[pick] / p - 1;
                  if (!Number.isFinite(d)) return null;
                  return <Text style={[styles.tipPct, { color: d >= 0 ? C.green : C.red }]}>{d >= 0 ? '+' : ''}{(d * 100).toFixed(1)}%</Text>;
                })()}
              </View>
            ) : null))}
          </View>
        ) : null}
      </View>
      {series.length > 1 ? (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.key} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.legendText}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: 'absolute', top: 4, maxWidth: 172,
    backgroundColor: 'rgba(16,21,56,0.94)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(157,140,255,0.5)',
    paddingHorizontal: 9, paddingVertical: 6, gap: 3,
  },
  tipAge: { fontSize: 11.5, fontWeight: '700', color: C.ink },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tipLabel: { fontSize: 11, color: C.muted, flexShrink: 1 },
  tipVal: { fontSize: 12.5, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  tipPct: { fontSize: 10.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: C.muted },
});
