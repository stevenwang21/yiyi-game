// 新手教學：把畫面某一塊框起來，旁邊跳出說明卡
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, SHADOW } from './theme';

const PAD = 8;

export default function Tutorial({ visible, step, total, title, text, rect, onNext, onSkip, lastLabel }) {
  if (!visible) return null;
  const { height: H, width: W } = Dimensions.get('window');
  const box = rect
    ? {
      x: Math.max(6, rect.x - PAD),
      y: Math.max(6, rect.y - PAD),
      w: Math.min(W - 12, rect.w + PAD * 2),
      h: rect.h + PAD * 2,
    }
    : null;
  // 說明卡放在框的上面或下面（哪邊空間大放哪邊）
  const below = box ? box.y + box.h < H * 0.55 : true;
  const cardStyle = box
    ? (below ? { top: box.y + box.h + 12 } : { bottom: H - box.y + 12 })
    : { top: H * 0.3 };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onSkip}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {box ? (
          <>
            <View style={[styles.dim, { top: 0, left: 0, right: 0, height: box.y }]} />
            <View style={[styles.dim, { top: box.y + box.h, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.dim, { top: box.y, left: 0, width: box.x, height: box.h }]} />
            <View style={[styles.dim, { top: box.y, left: box.x + box.w, right: 0, height: box.h }]} />
            <View pointerEvents="none" style={[styles.ring, { top: box.y, left: box.x, width: box.w, height: box.h }]} />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFillObject]} />
        )}

        <View style={[styles.card, cardStyle, SHADOW]}>
          <View style={styles.dots}>
            {Array.from({ length: total }).map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
            ))}
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{text}</Text>
          <View style={styles.row}>
            <Pressable onPress={onSkip} hitSlop={10} style={styles.skip}>
              <Text style={styles.skipText}>跳過教學</Text>
            </Pressable>
            <Pressable onPress={onNext} style={({ pressed }) => [styles.next, pressed && { opacity: 0.85 }]}>
              <Text style={styles.nextText}>{step === total - 1 ? (lastLabel || '開始玩！') : '下一步 ›'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: 'rgba(18,22,40,0.72)' },
  ring: { position: 'absolute', borderRadius: 22, borderWidth: 3, borderColor: C.gold },
  card: {
    position: 'absolute', left: 16, right: 16, backgroundColor: C.card,
    borderRadius: 22, padding: 16,
  },
  dots: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.line },
  dotOn: { backgroundColor: C.primary, width: 18 },
  title: { fontSize: 18, fontWeight: '600', color: C.ink },
  text: { fontSize: 14.5, lineHeight: 22, color: C.ink, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  skip: { paddingVertical: 8, paddingHorizontal: 4 },
  skipText: { fontSize: 13.5, color: C.muted, fontWeight: '600' },
  next: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 20 },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
