// 本局成就：這一輩子目前拿到哪些成就、結算時可以換幾點傳承點數
import { StyleSheet, Text, View } from 'react-native';
import Sheet from './Sheet';
import { Card } from './components';
import { C } from './theme';
import * as E from '../game/engine';

export default function UpgradeSheet({ visible, onClose, game }) {
  const s = game;
  const score = E.lifeScore(s);

  return (
    <Sheet visible={visible} onClose={onClose} title="這一生的成就" tall>
      <View style={styles.pointsBox}>
        <Text style={styles.pointsNum}>{score.total}</Text>
        <Text style={styles.muted}>
          目前可以換到的點數{score.mult !== 1 ? `（${score.base} 點 × ${E.diffOf(s).name}難度 ${score.mult} 倍）` : ''}
        </Text>
      </View>

      <Card style={{ paddingVertical: 6 }}>
        {score.list.length ? score.list.map((a) => (
          <View key={a.id} style={styles.row}>
            <Text style={styles.label}>✓ {a.label}</Text>
            <Text style={styles.pts}>+{a.pts}</Text>
          </View>
        )) : <Text style={[styles.muted, { paddingVertical: 12 }]}>還沒有成就，繼續努力！</Text>}
      </Card>

      <Card style={{ backgroundColor: C.goldSoft }}>
        <Text style={styles.h}>點數怎麼用？</Text>
        <Text style={styles.tip}>
          退休（或人生結束）的時候，這些成就會換成「傳承點數」存起來。
          回到首頁可以用點數買<Text style={{ fontWeight: '600' }}>永久升級</Text>：每年多一點精力、延後退休。
          買了之後，以後的每一輩子都有效。
        </Text>
        <Text style={[styles.tip, { marginTop: 8, fontWeight: '600' }]}>還沒拿到、可以挑戰的：</Text>
        <Text style={styles.tip}>
          {E.ACH_HINTS.filter(([id]) => !score.list.some((a) => a.id === id) || id === 'double' || id === 'kids').map(([, t]) => t).join('、')}
        </Text>
      </Card>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pointsBox: { alignItems: 'center', paddingVertical: 8, marginBottom: 6 },
  pointsNum: { fontSize: 42, fontWeight: '700', color: C.goldInk },
  muted: { fontSize: 12.5, color: C.muted, textAlign: 'center' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  label: { fontSize: 14, color: C.ink, fontWeight: '600', flex: 1 },
  pts: { fontSize: 14.5, fontWeight: '700', color: C.goldInk },
  h: { fontSize: 14.5, fontWeight: '600', color: C.goldInk },
  tip: { fontSize: 12.5, color: C.goldInk, lineHeight: 19, marginTop: 4 },
});
