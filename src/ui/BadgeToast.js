// 解鎖成就的通知：從上面滑下來，一次一個，2.6 秒後自己收起來（點一下也可以收）
// 放在比最上面低一點的位置，才不會跟結婚、養寵物那些通知疊在一起
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PHOTO } from './art/photos';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { play as playSfx } from './sfx';

const ND = Platform.OS !== 'web';
const SHOW_MS = 2600;

export default function BadgeToast({ queue, onDone }) {
  const insets = useSafeAreaInsets();
  const cur = queue[0];
  const y = useRef(new Animated.Value(-260)).current;
  const [key, setKey] = useState(null);
  const hiding = useRef(false);

  useEffect(() => {
    if (!cur || cur.id === key) return undefined;
    setKey(cur.id);
    hiding.current = false;
    y.setValue(-260);
    playSfx('coin');
    Animated.spring(y, { toValue: 0, friction: 7, tension: 90, useNativeDriver: ND }).start();
    const t = setTimeout(hide, SHOW_MS);
    return () => clearTimeout(t);
  }, [cur && cur.id]);

  function hide() {
    if (hiding.current) return;   // 時間到和點一下同時發生時，只收一次
    hiding.current = true;
    Animated.timing(y, { toValue: -260, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: ND }).start(() => { setKey(null); onDone(); });
  }

  if (!cur) return null;
  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 96, transform: [{ translateY: y }] }]}>
      <Pressable onPress={hide} style={styles.card}>
        {PHOTO[`badge_${cur.id}`]
          ? <Image source={PHOTO[`badge_${cur.id}`]} style={{ width: 60, height: 60 }} resizeMode="contain" />
          : <View style={styles.iconBox}><Text style={styles.icon}>{cur.icon}</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>🏅 解鎖成就{queue.length > 1 ? `（還有 ${queue.length - 1} 個）` : ''}</Text>
          <Text style={styles.name} numberOfLines={1}>{cur.name}</Text>
          <Text style={styles.desc} numberOfLines={1}>{cur.desc}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 9999, alignItems: 'center' },
  card: {
    width: '100%', maxWidth: 420, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: 'rgba(28,22,70,0.96)', borderWidth: 1.5, borderColor: '#ffd76a',
    shadowColor: '#ffd76a', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 4 }, elevation: 12,
  },
  iconBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,215,106,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,215,106,0.6)' },
  icon: { fontSize: 28 },
  kicker: { color: '#ffd76a', fontSize: 12.5, fontWeight: '800' },
  name: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 1 },
  desc: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 1 },
});
