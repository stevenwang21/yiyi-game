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
}) {
  const [w, setW] = useState(0);
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

  return (
    <View>
      <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
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
          </Svg>
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
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: C.muted },
});
