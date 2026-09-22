import { Pressable, StyleSheet, Text, View } from 'react-native';
import Sheet from './Sheet';
import { Tag } from './components';
import { C, STAT_META, toneColor } from './theme';
import { Button } from './components';
import { formatMoney } from '../game/engine';
import { Art, artForEvent } from './art';

// 選完之後的結果：讓玩家看到自己的選擇換來了什麼，再繼續
export function ResultSheet({ result, onContinue }) {
  if (!result) return null;
  const r = result;
  const stats = STAT_META.filter((m) => r.stats[m.key]);
  const main = r.items[0];
  const good = main && (main.tone === 'good' || main.tone === 'milestone');
  const bad = main && main.tone === 'bad';
  return (
    <Sheet visible onClose={onContinue} clear>
      <View style={[styles.resHead, good && { backgroundColor: C.greenSoft }, bad && { backgroundColor: C.redSoft }]}>
        <Text style={styles.resIcon}>{good ? '🎉' : bad ? '😣' : '📌'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.resKicker}>{r.title}</Text>
          <Text style={styles.resChoice} numberOfLines={2}>你選了：{r.choice}</Text>
        </View>
      </View>

      {r.items.length ? r.items.map((l, i) => (
        <Text key={i} style={[styles.resText, i > 0 && styles.resTextMore, { color: i === 0 ? C.ink : toneColor(l.tone) }]}>{l.text}</Text>
      )) : <Text style={styles.resText}>日子照常過下去。</Text>}

      {r.nw || stats.length ? (
        <View style={styles.deltaRow}>
          {r.nw ? (
            <View style={[styles.delta, { backgroundColor: r.nw > 0 ? C.greenSoft : C.redSoft }]}>
              <Text style={[styles.deltaText, { color: r.nw > 0 ? C.green : C.red }]}>
                💰 {r.nw > 0 ? '+' : '−'}{formatMoney(Math.abs(r.nw))}
              </Text>
            </View>
          ) : null}
          {stats.map((m) => (
            <View key={m.key} style={[styles.delta, { backgroundColor: r.stats[m.key] > 0 ? C.greenSoft : C.redSoft }]}>
              <Text style={[styles.deltaText, { color: r.stats[m.key] > 0 ? C.green : C.red }]}>
                {m.icon} {m.label} {r.stats[m.key] > 0 ? '+' : ''}{r.stats[m.key]}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Button title={r.hasNext ? '下一件事 ›' : '繼續'} style={{ marginTop: 18 }} onPress={onContinue} />
    </Sheet>
  );
}

export default function EventSheet({ pending, onChoose, game }) {
  if (!pending) return null;
  const p = pending;
  return (
    <Sheet visible onClose={null} clear>
      <Art id={artForEvent(p, game)} height={p.choices.length >= 5 ? 92 : p.choices.length >= 4 ? 115 : 150} pad={0} radius={18} style={{ marginBottom: 10 }} />
      {p.tag ? <Tag text={p.tag} color={C.goldInk} bg={C.goldSoft} /> : null}
      <Text style={styles.title}>{p.title}</Text>
      {p.text ? (p.text.includes('（你）') ? (
        <View style={{ marginTop: 8 }}>
          {p.text.split('\n').map((line, i) => (
            <Text key={i} style={[styles.text, { marginTop: 0 }, line.includes('（你）') && styles.me]}>{line}</Text>
          ))}
        </View>
      ) : <Text style={styles.text}>{p.text}</Text>) : null}

      {p.progress ? (
        <View style={{ marginTop: 14 }}>
          <View style={styles.route}>
            {p.progress.names.map((n, i) => (
              <View key={n} style={[styles.seg, i <= p.progress.step && { backgroundColor: C.gold }]} />
            ))}
          </View>
          <View style={styles.routeNames}>
            {p.progress.names.map((n) => (
              <Text key={n} style={styles.routeName} numberOfLines={1}>{n}</Text>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.group}>
        {p.choices.map((c, i) => (
          <Pressable
            key={`${i}-${c.label}`}
            onPress={() => onChoose(i)}
            style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceLabel}>{c.label}</Text>
              {c.sub ? <Text style={styles.choiceSub}>{c.sub}</Text> : null}
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  resHead: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.page, borderRadius: 18, padding: 14 },
  resIcon: { fontSize: 30 },
  resKicker: { fontSize: 12.5, fontWeight: '500', color: C.muted },
  resChoice: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 2 },
  resText: { fontSize: 15.5, lineHeight: 25, marginTop: 14 },
  resTextMore: { fontSize: 14, lineHeight: 21, marginTop: 8, fontWeight: '700' },
  deltaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  delta: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  deltaText: { fontSize: 13.5, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: C.ink, marginTop: 8, letterSpacing: -0.2 },
  text: { fontSize: 15.5, lineHeight: 25, color: C.ink, marginTop: 8 },
  me: { backgroundColor: 'rgba(255,215,106,0.25)', color: '#ffd76a', fontWeight: '700', borderRadius: 6, paddingHorizontal: 4, alignSelf: 'flex-start' },
  route: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 7, borderRadius: 4, backgroundColor: C.line },
  routeNames: { flexDirection: 'row', marginTop: 5 },
  routeName: { flex: 1, fontSize: 10.5, color: C.muted, textAlign: 'center' },
  pick: { fontSize: 12.5, color: C.muted, fontWeight: '500', marginTop: 18, marginBottom: 2 },
  group: { marginTop: 14, gap: 8 },
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10, paddingLeft: 18, paddingRight: 14,
    borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: 'rgba(157,140,255,0.45)',
  },
  choiceFirst: { backgroundColor: C.primarySoft, borderColor: '#9d8cff' },
  choiceLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  choicePressed: { backgroundColor: C.primary, transform: [{ scale: 0.98 }] },
  num: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  numText: { fontSize: 13, fontWeight: '700', color: C.primaryInk },
  choiceLabel: { fontSize: 17, fontWeight: '700', color: C.ink },
  choiceSub: { fontSize: 12.5, color: C.muted, marginTop: 2, lineHeight: 17 },
  arrow: { fontSize: 22, color: C.muted, marginTop: -2 },
});
