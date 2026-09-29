// 每日挑戰的全球排行榜：今天／昨天兩頁，前 50 名＋你的名次。
// 首頁的排行榜和結算畫面共用這一塊。
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from './theme';
import { formatMoney } from '../game/engine';
import { todayKey, dayShift, dailyNo } from '../game/daily';
import { boardReady, fetchTop } from '../leaderboard';

const MEDAL = ['🥇', '🥈', '🥉'];
const md = (day) => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;

// 一行成績的說明：幾歲破億，或最後身價
export const scoreLine = (r) => (r.yi_age != null ? `${r.yi_age} 歲破億` : r.end_age < 85 ? `${r.end_age} 歲離世` : '沒破億');

export default function DailyBoard({ daily, startDay }) {
  const today = todayKey();
  const [day, setDay] = useState(startDay || today);
  const [data, setData] = useState({});   // day → { rows, total } | 'err'
  const [loading, setLoading] = useState(false);
  const mine = daily && daily.runs ? daily.runs[day] : null;
  const myRes = mine && mine.result;

  useEffect(() => {
    if (!boardReady()) return undefined;
    let alive = true;
    setLoading(true);
    fetchTop(day).then((r) => { if (alive) setData((p) => ({ ...p, [day]: r })); })
      .catch(() => { if (alive) setData((p) => ({ ...p, [day]: 'err' })); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [day, myRes && myRes.rank]);

  const cur = data[day];
  const days = [today, dayShift(today, -1)].filter((d) => dailyNo(d) >= 1);
  return (
    <View>
      <View style={styles.tabs}>
        {days.map((d, i) => (
          <Pressable key={d} onPress={() => setDay(d)} style={[styles.tab, day === d && styles.tabOn]}>
            <Text style={[styles.tabText, day === d && styles.tabTextOn]}>{i === 0 ? '今天' : '昨天'}　#{dailyNo(d)}　{md(d)}</Text>
          </Pressable>
        ))}
      </View>

      {/* 你今天的成績 */}
      {mine && mine.payload ? (
        <View style={styles.me}>
          <Text style={styles.meRank}>{myRes ? `第 ${myRes.rank} 名` : '成績還沒交出去'}</Text>
          <Text style={styles.meSub}>
            {mine.nick || (daily && daily.nick)}．{mine.payload.yiAge != null ? `${mine.payload.yiAge} 歲破億` : '沒破億'}．{formatMoney(mine.payload.nw)}
            {myRes ? `　共 ${myRes.total} 人` : '　有網路時會自動補交'}
          </Text>
        </View>
      ) : null}

      {!boardReady() ? (
        <View style={styles.empty}><Text style={styles.emptyText}>全球排行榜還沒開通，今天的成績會先記在手機裡。</Text></View>
      ) : loading && !cur ? (
        <View style={styles.empty}><ActivityIndicator color={C.primary} /></View>
      ) : cur === 'err' ? (
        <View style={styles.empty}><Text style={styles.emptyText}>連不上排行榜，等一下再試。</Text></View>
      ) : !cur || !cur.rows.length ? (
        <View style={styles.empty}><Text style={styles.emptyText}>{day === today ? '今天還沒有人上榜，搶第一個！' : '這天沒有人上榜。'}</Text></View>
      ) : (
        <>
          <Text style={styles.count}>{cur.total} 人參加．越早破億越前面，沒破億比身價</Text>
          <View style={styles.card}>
            {cur.rows.map((r, i) => {
              const isMe = myRes && myRes.rank === i + 1 && r.nick === (mine.nick || daily.nick);
              return (
                <View key={i} style={[styles.row, i > 0 && styles.line, isMe && styles.rowMe]}>
                  <Text style={[styles.rank, i > 2 && styles.rankNum]}>{i < 3 ? MEDAL[i] : i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nick} numberOfLines={1}>{r.nick}{isMe ? '（你）' : ''}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{scoreLine(r)}{r.title ? `．${r.title}` : ''}</Text>
                  </View>
                  <Text style={[styles.nw, r.nw < 0 && { color: C.red }, r.yi_age != null && { color: C.goldInk }]}>{formatMoney(r.nw)}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center' },
  tabOn: { backgroundColor: C.primarySoft, borderColor: C.primary },
  tabText: { fontSize: 13.5, fontWeight: '700', color: C.muted },
  tabTextOn: { color: C.primaryInk },
  me: { backgroundColor: C.goldSoft, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 10 },
  meRank: { fontSize: 22, fontWeight: '800', color: C.goldInk },
  meSub: { fontSize: 13, color: C.ink, marginTop: 2 },
  empty: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center' },
  count: { fontSize: 12.5, color: C.muted, marginBottom: 6 },
  card: { backgroundColor: C.card, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  rowMe: { backgroundColor: C.primarySoft },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  rank: { fontSize: 20, width: 30, textAlign: 'center' },
  rankNum: { fontSize: 15, color: C.muted, fontWeight: '700' },
  nick: { fontSize: 16, fontWeight: '700', color: C.ink },
  sub: { fontSize: 12.5, color: C.muted, marginTop: 2 },
  nw: { fontSize: 15, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
});
