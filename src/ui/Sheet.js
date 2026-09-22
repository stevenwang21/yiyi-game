import { useEffect } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';
import { BLUR } from './ios';

// 從下方滑出的面板；onClose 為 null 時不能關閉（必須做選擇）
import { dimPage } from './pageBg';

export default function Sheet({ visible, onClose, title, children, tall, clear }) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!visible || clear) return undefined;
    dimPage(true);
    return () => dimPage(false);
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose || (() => {})}>
      {/* clear：上方透明、不模糊，讓玩家還看得到能力值 */}
      <View style={[styles.dim, !clear && BLUR, clear && { backgroundColor: 'transparent' }]}>
        {onClose ? <Pressable style={{ flex: 1 }} onPress={onClose} /> : <View style={{ flex: 1 }} />}
        <View style={[styles.sheet, tall && { height: '88%' }, clear && styles.clearSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grab} />
          {title || onClose ? (
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              {onClose ? (
                <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
                  <Text style={styles.closeText}>關閉</Text>
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
  dim: { flex: 1, backgroundColor: 'rgba(4,6,24,0.55)' },
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, borderColor: C.cardLine,
    paddingHorizontal: 18, paddingTop: 10, maxHeight: '90%',
    shadowColor: '#0f1426', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 20,
  },
  clearSheet: { maxHeight: '74%', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, borderColor: 'rgba(157,140,255,0.6)' },
  grab: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', color: C.ink, flex: 1 },
  close: { paddingHorizontal: 4, paddingVertical: 6 },
  closeText: { fontSize: 15, color: C.primaryInk, fontWeight: '600' },
});
