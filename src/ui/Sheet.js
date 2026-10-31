import { useEffect } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';
import { BLUR } from './ios';
import { useSide, useWide } from './wide';

// 從下方滑出的面板；onClose 為 null 時不能關閉（必須做選擇）
import { dimPage } from './pageBg';

export default function Sheet({ visible, onClose, title, children, tall, clear, backdrop }) {
  const insets = useSafeAreaInsets();
  const side = useSide();
  const wide = useWide();
  useEffect(() => {
    if (!visible || clear || side) return undefined;
    dimPage(true);
    return () => dimPage(false);
  }, [visible, side]);
  // 寬螢幕的右欄：不是 Modal，直接嵌在欄位裡（標題照放，「關閉」不需要，上面有分頁可以切）
  if (side) {
    if (!visible) return null;
    return (
      <View style={styles.side}>
        {backdrop ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 22, overflow: 'hidden' }]}>{backdrop}</View> : null}
        {title ? <View style={styles.head}><Text style={styles.title}>{title}</Text></View> : null}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    );
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose || (() => {})}>
      {/* clear：上方透明、不模糊，讓玩家還看得到能力值 */}
      <View style={[styles.dim, !clear && BLUR, clear && { backgroundColor: 'transparent' }]}>
        {onClose ? <Pressable style={{ flex: 1 }} onPress={onClose} /> : <View style={{ flex: 1 }} />}
        {/* 寬螢幕：從下面滑出來的卡不要整個橫跨，限在中間 600 寬 */}
        <View style={[styles.sheet, tall && { height: '88%' }, clear && styles.clearSheet, { paddingBottom: insets.bottom + 16 }, wide && { width: '100%', maxWidth: 600, alignSelf: 'center', borderWidth: 1 }]}>
          {/* 整張卡的背景（事件插圖一路延伸下來） */}
          {backdrop ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop]}>{backdrop}</View> : null}
          <View style={[styles.grab, backdrop && { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
          {title || onClose ? (
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              {onClose ? (
                <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
                  <Text style={[styles.closeText, backdrop && { color: '#fff' }]}>關閉</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: C.veil },
  side: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, borderColor: C.cardLine,
    paddingHorizontal: 18, paddingTop: 10, maxHeight: '90%',
    shadowColor: '#0f1426', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 20,
  },
  clearSheet: { maxHeight: '74%', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, borderColor: 'rgba(157,140,255,0.6)' },
  backdrop: { borderTopLeftRadius: 23, borderTopRightRadius: 23, overflow: 'hidden' },
  grab: { width: 36, height: 5, borderRadius: 3, backgroundColor: C.grab, alignSelf: 'center', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', color: C.ink, flex: 1 },
  close: { paddingHorizontal: 4, paddingVertical: 6 },
  closeText: { fontSize: 15, color: C.primaryInk, fontWeight: '600' },
});
