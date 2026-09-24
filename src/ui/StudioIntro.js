// 開場：工作室片頭。淡入 1.1 秒 → 停 2.3 秒 → 淡出 1.5 秒，總共約 5 秒。
// 點畫面任何地方可以跳過。載入存檔的時間剛好被它蓋住。
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const ND = Platform.OS !== 'web';
export const STUDIO_NAME = '大漢工作室';
export const STUDIO_SUB = 'DAHAN STUDIO';

export default function StudioIntro({ onDone }) {
  const fade = useRef(new Animated.Value(0)).current;   // 整組淡入淡出
  const grow = useRef(new Animated.Value(0)).current;   // 上下兩條金線往外長
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    // 金線先長出來（不能用原生驅動，因為在動寬度）
    Animated.timing(grow, { toValue: 1, duration: 1700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const seq = Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.delay(2300),
      Animated.timing(fade, { toValue: 0, duration: 1500, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
    ]);
    seq.start(({ finished }) => { if (finished) finish(); });
    // 保險：萬一動畫被瀏覽器暫停（切到別的分頁），5.4 秒後還是要進遊戲
    const t = setTimeout(finish, 5400);
    return () => { seq.stop(); clearTimeout(t); };
  }, []);

  // 整組很慢地放大一點點，看起來比較有質感
  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const lineW = grow.interpolate({ inputRange: [0, 1], outputRange: [0, 132] });
  const glow = fade.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <Pressable style={styles.wrap} onPress={finish} accessibilityLabel="跳過片頭">
      {/* 背後那團暖光 */}
      <Animated.View style={[styles.glow, { opacity: glow }]} pointerEvents="none" />

      <Animated.View style={{ opacity: fade, transform: [{ scale }], alignItems: 'center' }}>
        <Animated.View style={[styles.line, { width: lineW }]} />
        <Text style={styles.name}>{STUDIO_NAME}</Text>
        <Animated.View style={[styles.line, { width: lineW, marginTop: 14 }]} />
        <Text style={styles.sub}>{STUDIO_SUB}</Text>
      </Animated.View>

      <Animated.Text style={[styles.skip, { opacity: fade }]}>點一下跳過</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
    backgroundColor: '#070b22', alignItems: 'center', justifyContent: 'center',
  },
  glow: {
    position: 'absolute', width: 420, height: 420, borderRadius: 210,
    backgroundColor: '#ffd76a',
    ...(Platform.OS === 'web' ? { filter: 'blur(110px)' } : { opacity: 0.18 }),
  },
  line: { height: 1.5, backgroundColor: '#ffd76a', opacity: 0.75, marginBottom: 16, borderRadius: 1 },
  name: {
    fontSize: 33, fontWeight: '900', color: '#f6ead0', letterSpacing: 7, textAlign: 'center',
    textShadowColor: 'rgba(255,215,106,0.55)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
  },
  sub: { marginTop: 12, fontSize: 10.5, fontWeight: '700', color: 'rgba(255,215,106,0.62)', letterSpacing: 5 },
  skip: { position: 'absolute', bottom: 36, fontSize: 11.5, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },
});
