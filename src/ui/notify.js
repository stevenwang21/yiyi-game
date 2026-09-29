// 通知：兩層。
//  ① 遊戲裡的通知橫幅（Notify 元件）：過一年之後，這一年發生的重要事一張一張從上面滑下來，
//     點了直接跳到相關的頁面。不用任何權限，手機電腦都一樣。
//  ② 手機／瀏覽器的系統通知（osNotify）：要玩家在選單裡打開、瀏覽器問過權限才會用。
//     只有在 App 被切到背景時才發（在前景時橫幅就夠了，不要重複吵）。
//     老實講：App 完全關掉的時候收不到 —— 那要有一台推播伺服器，GitHub Pages 做不到。
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from './theme';
import { Emo } from './Character';

const WEB = Platform.OS === 'web' && typeof window !== 'undefined';
const KEY = 'yiyi-notif-v1';
const ND = Platform.OS !== 'web';

// ── 從這一年的紀錄挑出值得跳通知的事 ────────────────────────
// 每一條：icon（3D 圖示）、title、body、target（點了要開哪一頁）
const RULES = [
  { re: /^去年「[^」]+」說.*(說中了|講錯了)/, icon: (t) => (t.includes('說中') ? '📈' : '📉'), title: '同學明牌對答案', target: 'mates' },
  { re: /被外資發現|上架後直接噴/, icon: '🚀', title: '你的投資噴了', target: 'invest' },
  { re: /財報造假|抽乾跑路/, icon: '💥', title: '投資踩到地雷', target: 'invest' },
  { re: /階段目標.*(做到了|你做到)/, icon: '🏆', title: '階段目標達成', target: null },
  { re: /階段目標.*還有時間/, icon: '🎯', title: '階段目標沒過', target: null },
  { re: /經營不善，宣告倒閉/, icon: '💥', title: '公司倒了', target: 'invest:2' },
  { re: /最後分手了/, icon: '💔', title: '分手了', target: 'family' },
  { re: /被分走一半/, icon: '💸', title: '合資公司被分走一半', target: 'invest:2' },
  { re: /大裁員|資遣費/, icon: '📉', title: '被裁員了', target: null },
  { re: /正式退休了/, icon: '🌅', title: '退休了', target: null },
  { re: /你的努力被老闆看見/, icon: '💼', title: '加薪 10%', target: null },
  { re: /還清了！/, icon: '✨', title: '債務還清', target: 'invest:4' },
  { re: /通告變少，年薪降到/, icon: '📉', title: '偶像被新人擠了', target: null },
  { re: /安詳地離開了/, icon: '🌈', title: (t) => { const m = /「([^」]+)」安詳/.exec(t); return m ? `${m[1]} 走了` : '寵物走了'; }, target: 'family' },
  { re: /再也沒有回來|沒有回來。/, icon: '🐾', title: '寵物走失了', target: 'family' },
  { re: /成了寵物網紅/, icon: '⭐', title: '你家的寵物紅了', target: 'family' },
  { re: /^【世界】/, icon: (t, l) => (String(l.tone).includes('bad') ? '📉' : '🌅'), title: (t) => t.replace(/^【世界】/, '').split('：')[0], target: 'invest', worldOnly: true },
];

const clean = (t) => t.replace(/^【[^】]+】/, '').replace(/（(智力|健康|快樂|人緣)[+-]\d+[^）]*）/g, '').trim();

export function detectNotices(prev, next) {
  if (!prev || !next || prev === next || next.ended) return [];
  if (prev.bornAt !== next.bornAt || prev.name !== next.name) return [];
  if (next.age <= prev.age) return [];
  const out = [];
  const seen = new Set();
  for (const l of (next.log || []).filter((x) => x.age === next.age)) {
    const text = l.text || '';
    for (const r of RULES) {
      if (!r.re.test(text)) continue;
      // 世界大事只有股災那種壞消息才跳（平常的漲跌不用吵）
      if (r.worldOnly && !String(l.tone).includes('bad')) break;
      const title = typeof r.title === 'function' ? r.title(text) : r.title;
      if (seen.has(title)) break;
      seen.add(title);
      let body = clean(text);
      if (r.worldOnly) body = body.replace(/^[^：]+：/, '');   // 標題已經是事件名了，內文不要再重複一次
      body = body.split(/[。！]/)[0].slice(0, 46);
      out.push({ id: `${next.age}-${out.length}-${Date.now()}`, icon: typeof r.icon === 'function' ? r.icon(text, l) : r.icon, title, body, target: r.target });
      break;
    }
    if (out.length >= 4) break;
  }
  return out;
}

// ── 系統通知（開關＋權限） ────────────────────────────────
let want = false;
AsyncStorage.getItem(KEY).then((v) => { want = v === 'on'; }).catch(() => {});
export const getNotif = () => want;
export const notifSupported = () => WEB && 'Notification' in window;
export const notifPermission = () => (notifSupported() ? window.Notification.permission : 'unsupported');

// 打開開關：順便跟瀏覽器要權限。回傳最後的狀態（'granted' / 'denied' / 'default' / 'unsupported'）
export async function setNotif(v) {
  want = v;
  AsyncStorage.setItem(KEY, v ? 'on' : 'off').catch(() => {});
  if (!v || !notifSupported()) return notifPermission();
  try {
    const p = await window.Notification.requestPermission();
    if (p === 'granted') showOs('通知已開啟', '之後 App 在背景時，有大事會提醒你');
    return p;
  } catch (_) { return notifPermission(); }
}

async function showOs(title, body) {
  try {
    const opts = { body, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'yiyi', renotify: false };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) { await reg.showNotification(title, opts); return; }
    }
    // eslint-disable-next-line no-new
    new window.Notification(title, opts);
  } catch (_) { /* 有些瀏覽器不給，不影響遊戲 */ }
}

// 遊戲裡發生的事 → 只在 App 切到背景、而且玩家有開通知時，才發成系統通知
export function osNotify(items) {
  if (!want || !notifSupported() || window.Notification.permission !== 'granted') return;
  if (typeof document !== 'undefined' && !document.hidden) return;
  if (!items.length) return;
  const first = items[0];
  showOs(`${first.title}${items.length > 1 ? `（還有 ${items.length - 1} 件）` : ''}`, first.body);
}

// ── 遊戲裡的通知橫幅 ────────────────────────────────────
function Toast({ item, index, onOpen, onClose }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 320, delay: index * 140, easing: Easing.out(Easing.back(1.4)), useNativeDriver: ND }).start();
    const t = setTimeout(() => {
      Animated.timing(a, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: ND }).start(() => onClose(item.id));
    }, 4600 + index * 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={[styles.toast, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }] }]}>
      <Pressable onPress={() => { onClose(item.id); if (item.target) onOpen(item.target); }} style={styles.toastBody}>
        <Emo e={item.icon} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.toastTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.toastText} numberOfLines={2}>{item.body}</Text>
        </View>
        {item.target ? <Text style={styles.toastGo}>›</Text> : null}
      </Pressable>
      <Pressable onPress={() => onClose(item.id)} hitSlop={8} style={styles.toastX}><Text style={styles.toastXText}>✕</Text></Pressable>
    </Animated.View>
  );
}

export default function Notify({ items, onOpen, onClose, top = 0 }) {
  if (!items.length) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top }]}>
      {items.slice(0, 3).map((it, i) => <Toast key={it.id} item={it} index={i} onOpen={onOpen} onClose={onClose} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50, gap: 8, paddingHorizontal: 12 },
  toast: {
    width: '100%', maxWidth: 440, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(24, 30, 72, 0.96)', borderRadius: 18, borderWidth: 1, borderColor: '#9d8cff',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  toastBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  toastTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  toastText: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 17 },
  toastGo: { fontSize: 22, color: '#c9bfff', marginRight: 2 },
  toastX: { paddingHorizontal: 10, paddingVertical: 12 },
  toastXText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
});
