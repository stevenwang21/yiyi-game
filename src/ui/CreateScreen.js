// 創角頁：從首頁按「開始新人生」進來。名字、性別、難度，一樣是深色玻璃風格。
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { DarkBackdrop, GLASS } from './StartScreen';
import { Head } from './Character';
import { DIFFICULTIES, GENDERS } from '../game/engine';

export default function CreateScreen({ onBack, onStart }) {
  const { width, height } = useWindowDimensions();
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [diff, setDiff] = useState('normal');
  const preview = name.trim();
  const ready = preview.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#0f1636' }}>
      <DarkBackdrop width={Math.min(width, 480)} height={height} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.top}>
            <Pressable onPress={onBack} hitSlop={10} style={[styles.back, GLASS]}><Text style={styles.backText}>‹</Text></Pressable>
            <Text style={styles.title}>新的人生</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* 角色預覽 */}
          <View style={[styles.hero, GLASS]}>
            <View style={styles.avatarRing}>
              <Head gender={gender} age={22} size={88} />
            </View>
            <Text style={[styles.previewName, !ready && { color: 'rgba(255,255,255,0.4)' }]}>{ready ? preview : '請輸入名字'}</Text>
          </View>

          {/* 名字 */}
          <Text style={styles.label}>名字</Text>
          <View style={[styles.inputWrap, GLASS]}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder=""
              autoFocus
              placeholderTextColor="rgba(255,255,255,0.4)"
              maxLength={10}
              returnKeyType="done"
            />
          </View>

          {/* 性別 */}
          <Text style={styles.label}>性別</Text>
          <View style={styles.row}>
            {GENDERS.map((g) => {
              const on = gender === g.id;
              return (
                <Pressable key={g.id} onPress={() => setGender(g.id)} style={[styles.pick, GLASS, on && styles.pickOn]}>
                  <Text style={styles.pickEmoji}>{g.icon}</Text>
                  <Text style={[styles.pickText, on && { color: '#fff' }]}>{g.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* 難度 */}
          <Text style={styles.label}>難度</Text>
          <View style={styles.row}>
            {DIFFICULTIES.map((x) => {
              const on = diff === x.id;
              const hell = x.id === 'hell';
              return (
                <Pressable key={x.id} onPress={() => setDiff(x.id)} style={[styles.pick, GLASS, on && styles.pickOn, on && hell && styles.pickHell]}>
                  <Text style={styles.pickEmoji}>{{ easy: '🌤️', normal: '🏙️', hard: '⛰️', hell: '☠️' }[x.id]}</Text>
                  <Text style={[styles.pickText, on && { color: '#fff' }]}>{x.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            disabled={!ready}
            onPress={() => ready && onStart(preview, diff, gender)}
            style={({ pressed }) => [styles.primary, !ready && styles.primaryOff, pressed && ready && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}
          >
            <Text style={styles.primaryText}>開始人生</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const GLASS_BG = 'rgba(255,255,255,0.08)';
const GLASS_LINE = 'rgba(255,255,255,0.16)';

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_LINE, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 24, lineHeight: 26, marginTop: -2 },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },

  hero: { alignItems: 'center', paddingVertical: 18, marginTop: 14, borderRadius: 22, backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_LINE },
  avatarRing: { padding: 4, borderRadius: 52, borderWidth: 2, borderColor: '#ffd76a', backgroundColor: 'rgba(255,255,255,0.1)' },
  previewName: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 10 },
  previewSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  label: { fontSize: 12.5, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: 18, marginBottom: 8, paddingHorizontal: 4 },
  inputWrap: { borderRadius: 14, backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_LINE },
  input: { paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: '#fff', outlineStyle: 'none' },
  row: { flexDirection: 'row', gap: 8 },
  pick: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 16, backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_LINE },
  pickOn: { backgroundColor: 'rgba(108,92,231,0.55)', borderColor: '#9d8cff' },
  pickHell: { backgroundColor: 'rgba(240,68,56,0.5)', borderColor: '#ff8a80' },
  pickEmoji: { fontSize: 24 },
  pickText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  pickSub: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  desc: { fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 18, marginTop: 10, paddingHorizontal: 4 },
  carry: { fontSize: 12.5, color: '#ffd76a', lineHeight: 18, marginTop: 8, paddingHorizontal: 4 },

  primary: {
    marginTop: 22, backgroundColor: '#6c5ce7', borderRadius: 18, paddingVertical: 15, alignItems: 'center',
    shadowColor: '#6c5ce7', shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  primaryOff: { backgroundColor: 'rgba(108,92,231,0.35)', shadowOpacity: 0 },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  primarySub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
});
