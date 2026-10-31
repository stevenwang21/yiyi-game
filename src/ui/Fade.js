// 圖片上的漸層暗角：網頁用 CSS 的 linear-gradient，手機用 expo-linear-gradient 畫一樣的東西。
// dir：'to right'（左暗右透明）、'to left'、'to top'（下暗上透明）、'to bottom'
// color：暗角的顏色（rgb 三個數字的字串，例如 '10,14,45'）
import { Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const DIRS = {
  'to right': { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  'to left': { start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } },
  'to top': { start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0 } },
  'to bottom': { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
};

// 預設的三段：起點很暗 → 中間半透明 → 75% 之後透明
const DEFAULT_STOPS = [[0.92, 0], [0.55, 0.45], [0, 0.75]];

export default function Fade({ dir = 'to right', color = '10,14,45', stops = DEFAULT_STOPS, style, pointerEvents = 'none' }) {
  if (Platform.OS === 'web') {
    const css = stops.map(([a, at]) => `rgba(${color},${a}) ${Math.round(at * 100)}%`).join(', ');
    return <View pointerEvents={pointerEvents} style={[StyleSheet.absoluteFill, { backgroundImage: `linear-gradient(${dir}, ${css})` }, style]} />;
  }
  const d = DIRS[dir] || DIRS['to right'];
  const colors = stops.map(([a]) => `rgba(${color},${a})`);
  const locations = stops.map(([, at]) => at);
  // 最後一段之後保持透明
  if (locations[locations.length - 1] < 1) { colors.push(`rgba(${color},0)`); locations.push(1); }
  return <LinearGradient pointerEvents={pointerEvents} colors={colors} locations={locations} start={d.start} end={d.end} style={[StyleSheet.absoluteFill, style]} />;
}
