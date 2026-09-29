// 首頁的「成就」分頁：徽章牆。拿到的是彩色，沒拿到的是灰色剪影；隱藏成就沒拿到前只顯示「？？？」。
import { useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PHOTO } from './art/photos';
import { BADGES, BADGE_CATS } from '../game/badges';

const GLASS = Platform.OS === 'web' ? { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' } : {};
const GRAY = Platform.OS === 'web' ? { filter: 'grayscale(1) brightness(0.5)', opacity: 0.75 } : { opacity: 0.3 };
// 隱藏成就還沒拿到：再暗一點、糊一點，看不出裡面是什麼
const SECRET = Platform.OS === 'web' ? { filter: 'grayscale(1) brightness(0.4) blur(1.5px)', opacity: 0.8 } : { opacity: 0.2 };
const GLOW = Platform.OS === 'web' ? { filter: 'drop-shadow(0 0 8px rgba(255,215,106,0.45))' } : {};

// 徽章圖（achievement_icons_v2）；萬一圖不在就退回 emoji
function Medal({ b, on, size }) {
  const src = PHOTO[`badge_${b.id}`];
  if (!src) return <Text style={[{ fontSize: size * 0.48 }, !on && GRAY]}>{b.hidden && !on ? '❔' : b.icon}</Text>;
  return (
    <View style={[{ width: size, height: size }, on ? GLOW : b.hidden ? SECRET : GRAY]}>
      <Image source={src} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}
const ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };

export default function BadgeWall({ badges }) {
  const got = (badges && badges.got) || {};
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(null);
  const n = BADGES.filter((b) => got[b.id]).length;
  const pct = Math.round((n / BADGES.length) * 100);
  const list = cat === 'all' ? BADGES : BADGES.filter((b) => b.cat === cat);
  const catCount = (id) => BADGES.filter((b) => b.cat === id && got[b.id]).length;
  const catTotal = (id) => BADGES.filter((b) => b.cat === id).length;
  const o = open && BADGES.find((b) => b.id === open);
  const og = o && got[o.id];

  return (
    <View style={{ paddingHorizontal: 14 }}>
      <View style={styles.head}>
        <Text style={styles.h1}>🏅 成就</Text>
        <Text style={styles.count}>{n} / {BADGES.length}</Text>
      </View>
      <View style={styles.barBg}><View style={[styles.bar, { width: `${Math.max(2, pct)}%` }]} /></View>
      <Text style={styles.pct}>已收集 {pct}%</Text>

      {/* 分類 */}
      <View style={styles.chips}>
        {[{ id: 'all', name: '全部', icon: '✨' }, ...BADGE_CATS].map((c) => (
          <Pressable key={c.id} onPress={() => setCat(c.id)} style={[styles.chip, cat === c.id && styles.chipOn]}>
            <Text style={[styles.chipText, cat === c.id && { color: '#1b1b24' }]}>
              {c.icon} {c.name}{c.id !== 'all' ? ` ${catCount(c.id)}/${catTotal(c.id)}` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 徽章 */}
      <View style={[styles.grid, GLASS]}>
        {list.map((b) => {
          const on = !!got[b.id];
          const secret = b.hidden && !on;
          return (
            <Pressable key={b.id} onPress={() => setOpen(b.id)} style={({ pressed }) => [styles.cell, pressed && { transform: [{ scale: 0.94 }] }]}>
              <Medal b={b} on={on} size={74} />
              <Text style={[styles.name, !on && { color: 'rgba(255,255,255,0.45)' }]} numberOfLines={2}>{secret ? '？？？' : b.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 單一徽章的說明 */}
      <Modal visible={!!o} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.veil} onPress={() => setOpen(null)}>
          {o ? (
            <View style={styles.pop}>
              <Medal b={o} on={!!og} size={150} />
              <Text style={styles.popName}>{o.hidden && !og ? '隱藏成就' : o.name}</Text>
              <Text style={styles.popDesc}>{o.hidden && !og ? '達成條件是祕密，玩下去就知道了' : o.desc}</Text>
              {og ? (
                <Text style={styles.popGot}>✓ {og.life ? `第 ${og.life} 世．` : ''}「{og.name}」{og.age} 歲拿到．{ymd(og.at)}</Text>
              ) : (
                <Text style={styles.popLocked}>🔒 還沒拿到</Text>
              )}
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 },
  h1: { color: '#fff', fontSize: 28, fontWeight: '900' },
  count: { color: '#ffd76a', fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  barBg: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 10, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5, backgroundColor: '#ffd76a' },
  pct: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(20,28,70,0.6)', borderWidth: 1, borderColor: 'rgba(140,170,255,0.35)' },
  chipOn: { backgroundColor: '#ffd76a', borderColor: '#ffd76a' },
  chipText: { color: 'rgba(255,255,255,0.85)', fontSize: 13.5, fontWeight: '800' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 22,
    backgroundColor: 'rgba(20,28,70,0.55)', borderWidth: 1, borderColor: 'rgba(140,170,255,0.35)',
  },
  cell: { width: '25%', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 2 },
  name: { color: '#fff', fontSize: 12.5, fontWeight: '800', textAlign: 'center', marginTop: 2, lineHeight: 16 },
  veil: { flex: 1, backgroundColor: 'rgba(5,6,20,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  pop: {
    width: '100%', maxWidth: 360, alignItems: 'center', borderRadius: 26, paddingVertical: 26, paddingHorizontal: 20,
    backgroundColor: '#1a1f4e', borderWidth: 1.5, borderColor: 'rgba(255,215,106,0.6)',
  },
  popName: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 14 },
  popDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 15.5, marginTop: 6, textAlign: 'center', lineHeight: 22 },
  popGot: { color: '#7ee2a8', fontSize: 14, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  popLocked: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700', marginTop: 14 },
});
