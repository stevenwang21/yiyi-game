// Apple 風格的小元件：滾動數字、淡入、分段控制、Tab Bar 項目
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from './theme';

// 數字從舊值滾到新值（像 iOS 的計數動畫）
export function RollingNumber({ value, format = (v) => String(v), style, duration = 650, ...rest }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(null);
  useEffect(() => {
    const start = from.current;
    const end = value;
    if (start === end) return undefined;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const e = 1 - (1 - p) ** 3; // ease-out
      setShown(Math.round(start + (end - start) * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else from.current = end;
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); from.current = end; };
  }, [value]);
  return <Text style={style} {...rest}>{format(shown)}</Text>;
}

// 進度條：寬度平滑推進
export function SmoothBar({ value, color = C.primary, track = C.page, height = 6 }) {
  const w = useRef(new Animated.Value(Math.max(0, Math.min(1, value)))).current;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.max(0, Math.min(1, value)), duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value]);
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height, backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

// 一行一行淡入（key 變了就重播）
export function FadeIn({ children, delay = 0, replay, style }) {
  const o = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(6)).current;
  useEffect(() => {
    o.setValue(0); y.setValue(6);
    Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 320, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [replay]);
  return <Animated.View style={[{ opacity: o, transform: [{ translateY: y }] }, style]}>{children}</Animated.View>;
}

// iOS 的分段控制（灰底、白色滑塊）
export function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[styles.seg, style]}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={[styles.segItem, on && styles.segOn]}>
            <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1}>{o.label}</Text>
            {o.sub ? <Text style={[styles.segSub, on && { color: C.ink }]} numberOfLines={1}>{o.sub}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// Tab Bar 的一格
export function TabItem({ icon, label, onPress, alert, active }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}>
      <Text style={[styles.tabIcon, alert && { color: C.red }]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && { color: C.primaryInk }, alert && { color: C.red }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

// 群組標題（iOS 設定頁那種灰色小標）
export function GroupHead({ title, right, style }) {
  return (
    <View style={[styles.groupHead, style]}>
      <Text style={styles.groupTitle}>{title}</Text>
      {right}
    </View>
  );
}

export const BLUR = Platform.OS === 'web' ? { backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } : {};

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: C.page, borderRadius: 10, padding: 2 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segOn: { backgroundColor: C.primary, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  segText: { fontSize: 14, fontWeight: '500', color: C.muted },
  segTextOn: { color: C.ink, fontWeight: '600' },
  segSub: { fontSize: 10.5, color: C.muted, marginTop: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6, paddingBottom: 2 },
  tabIcon: { fontSize: 22, lineHeight: 26 },
  tabLabel: { fontSize: 10, fontWeight: '500', color: C.muted, marginTop: 1 },
  groupHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22, marginBottom: 6, paddingHorizontal: 4 },
  groupTitle: { fontSize: 13, color: C.muted, fontWeight: '500', letterSpacing: 0.2 },
});
