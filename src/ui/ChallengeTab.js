// 首頁的「挑戰」分頁：今天的出身、你這一局的狀態、開始／繼續、全球排行榜。
// 挑戰那一局有自己的存檔，跟主線人生互不影響。
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GENDERS, formatMoney, netWorth } from '../game/engine';
import { dailyPreview, todayKey } from '../game/daily';
import DailyBoard from './DailyBoard';
import { C } from './theme';

const GLASS = Platform.OS === 'web' ? { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' } : {};
const md = (day) => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

// 離下一題（台灣時間半夜 12 點）還有多久
function useCountdown() {
  const left = () => 86400000 - ((Date.now() + 8 * 3600000) % 86400000);
  const [ms, setMs] = useState(left());
  useEffect(() => { const t = setInterval(() => setMs(left()), 30000); return () => clearInterval(t); }, []);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h} 小時 ${m} 分` : `${m} 分`;
}

export default function ChallengeTab({ daily, dsave, onDaily, onDailyContinue, defaultName }) {
  const today = todayKey();
  const pv = useMemo(() => dailyPreview(today), [today]);
  const left = useCountdown();
  const [nick, setNick] = useState(null);
  const [gender, setGender] = useState('male');
  const [confirm, setConfirm] = useState(false);
  const run = daily && daily.runs ? daily.runs[today] : null;
  const name = (nick != null ? nick : (daily && daily.nick) || defaultName || '').trim();
  // 挑戰存檔：今天的、還沒玩完的那一局
  const live = dsave && !dsave.ended && dsave.daily && dsave.daily.day === today ? dsave : null;
  const liveRanked = live && live.daily.ranked;

  const start = () => {
    if (!name) return;
    if (live && !confirm) { setConfirm(true); return; }
    setConfirm(false);
    onDaily(name, gender);
  };

  return (
    <View style={{ paddingHorizontal: 14 }}>
      <View style={styles.head}>
        <Text style={styles.h1}>📅 每日挑戰</Text>
        <Text style={styles.no}>#{pv.no}　{md(today)}</Text>
      </View>
      <Text style={styles.next}>下一題 {left}後</Text>

      {/* 今天的出身 */}
      <View style={[styles.card, GLASS]}>
        <Text style={styles.cardLabel}>今天大家都出生在</Text>
        <Text style={styles.family}>{pv.family}</Text>
        <View style={styles.stats}>
          {[['📘', '智力', pv.stats.int], ['💪', '健康', pv.stats.hp], ['😄', '快樂', pv.stats.happy], ['🤝', '人緣', pv.stats.charm]].map(([i, l, v]) => (
            <View key={l} style={styles.stat}>
              <Text style={styles.statIcon}>{i}</Text>
              <Text style={styles.statVal}>{v}</Text>
              <Text style={styles.statLabel}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 你今天的狀態 */}
      {run && run.result ? (
        <View style={[styles.rankCard, GLASS]}>
          <Text style={styles.rankLabel}>你今天的排名賽</Text>
          <Text style={styles.rankBig}>全球第 {run.result.rank} 名<Text style={styles.rankOf}>　/ {run.result.total} 人</Text></Text>
        </View>
      ) : run && run.payload ? (
        <View style={[styles.rankCard, GLASS]}>
          <Text style={styles.rankLabel}>你今天的排名賽</Text>
          <Text style={styles.rankMid}>成績已記下，有網路就會上榜</Text>
        </View>
      ) : null}

      {live ? (
        <Pressable onPress={onDailyContinue} style={({ pressed }) => [styles.liveCard, GLASS, pressed && { transform: [{ scale: 0.98 }] }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.liveTag}>{liveRanked ? '🏁 排名賽進行中' : '練習中'}</Text>
            <Text style={styles.liveName} numberOfLines={1}>{live.name} · {live.age} 歲</Text>
            <Text style={styles.liveMoney}>{formatMoney(netWorth(live))}</Text>
          </View>
          <View style={styles.play}><Text style={styles.playIcon}>▶</Text></View>
        </Pressable>
      ) : null}

      {/* 開始（排名賽進行中就只能繼續，不能重開） */}
      {!liveRanked ? (
        <View style={[styles.card, GLASS]}>
          <View style={styles.nameRow}>
            <TextInput
              style={styles.input}
              value={nick != null ? nick : ((daily && daily.nick) || defaultName || '')}
              onChangeText={setNick}
              placeholder="排行榜上的名字"
              placeholderTextColor="rgba(255,255,255,0.45)"
              maxLength={10}
            />
            {GENDERS.map((g) => (
              <Pressable key={g.id} onPress={() => setGender(g.id)} style={[styles.sex, gender === g.id && styles.sexOn]}>
                <Text style={[styles.sexText, gender === g.id && { color: '#fff' }]}>{g.name}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={start}
            disabled={!name}
            style={({ pressed }) => [styles.go, !name && { opacity: 0.45 }, run && styles.goPractice, confirm && styles.goDanger, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <Text style={styles.goText}>
              {confirm ? '確定？練習中的那一局會被蓋掉' : run ? '▶  再玩一次（練習）' : '▶  開始今天的排名賽'}
            </Text>
          </Pressable>
          {confirm ? <Pressable onPress={() => setConfirm(false)} hitSlop={8}><Text style={styles.cancel}>先不要</Text></Pressable> : null}
          <Text style={styles.rule}>{run ? '今天的排名賽已經打過了，再玩不會上榜' : '每天第一次開始的那一局會上全球排行榜'}</Text>
        </View>
      ) : null}

      {/* 全球排行榜 */}
      <View style={styles.board}>
        <DailyBoard daily={daily} />
      </View>
    </View>
  );
}

const GLASS_BG = 'rgba(20,28,70,0.55)';
const GLASS_LINE = 'rgba(140,170,255,0.35)';

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 },
  h1: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  no: { color: '#ffd76a', fontSize: 16, fontWeight: '800' },
  next: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  card: { marginTop: 14, borderRadius: 22, padding: 16, backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_LINE },
  cardLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '700' },
  family: { color: '#ffd76a', fontSize: 30, fontWeight: '900', marginTop: 2 },
  stats: { flexDirection: 'row', marginTop: 12, gap: 8 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingVertical: 10 },
  statIcon: { fontSize: 18 },
  statVal: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 2, fontVariant: ['tabular-nums'] },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, fontWeight: '700' },
  rankCard: { marginTop: 14, borderRadius: 22, padding: 16, backgroundColor: 'rgba(120,80,10,0.45)', borderWidth: 1, borderColor: 'rgba(255,215,106,0.6)', alignItems: 'center' },
  rankLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700' },
  rankBig: { color: '#ffd76a', fontSize: 30, fontWeight: '900', marginTop: 4 },
  rankOf: { color: 'rgba(255,255,255,0.75)', fontSize: 16, fontWeight: '700' },
  rankMid: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 4 },
  liveCard: {
    marginTop: 14, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(40,50,140,0.75)', borderWidth: 1, borderColor: 'rgba(160,180,255,0.55)',
  },
  liveTag: { color: '#ffd76a', fontSize: 13, fontWeight: '800' },
  liveName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  liveMoney: { color: '#ffd76a', fontSize: 17, fontWeight: '700', marginTop: 2 },
  play: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#5b4bff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#9fb2ff',
  },
  playIcon: { color: '#fff', fontSize: 24, marginLeft: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 12, color: '#fff', fontSize: 16, fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sex: { height: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  sexOn: { backgroundColor: 'rgba(255,215,106,0.25)', borderColor: '#ffd76a' },
  sexText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700' },
  go: { marginTop: 12, height: 54, borderRadius: 16, backgroundColor: '#e8a317', alignItems: 'center', justifyContent: 'center' },
  goPractice: { backgroundColor: '#5b4bff' },
  goDanger: { backgroundColor: 'rgba(240,68,56,0.85)' },
  goText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  cancel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 10 },
  rule: { color: 'rgba(255,255,255,0.55)', fontSize: 12.5, textAlign: 'center', marginTop: 10 },
  board: { marginTop: 18, borderRadius: 22, padding: 12, backgroundColor: C.bg },
});
