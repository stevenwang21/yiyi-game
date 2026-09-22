// 同屆同學的排行榜
import { StyleSheet, Text, View } from 'react-native';
import Sheet from './Sheet';
import { Card } from './components';
import { C } from './theme';
import * as E from '../game/engine';
import { Avatar } from './art';
import { Head } from './Character';
import { mateStory, MONEY_RANK_AGE } from '../game/mates';

export default function MatesSheet({ visible, onClose, game }) {
  const s = game;
  const nw = E.netWorth(s);
  const list = E.ranking(s, nw);
  const mates = E.mateList(s);

  return (
    <Sheet visible={visible} onClose={onClose} title="同屆同學" tall>
      <Text style={styles.muted}>
        從國小就同班的 {mates.length} 個人，各自過各自的人生。{s.age < MONEY_RANK_AGE ? `現在比的是成績；${MONEY_RANK_AGE} 歲以後比資產。` : '出社會後靠自己升遷、累積資產，每 5 年有一次同學會。'}
      </Text>
      <Card style={{ marginTop: 10, paddingVertical: 6 }}>
        {list.map((x) => {
          const m = mates.find((q) => q.name === x.name);
          return (
            <View key={x.name} style={[styles.row, x.me && styles.me]}>
              <Text style={[styles.rank, x.rank === 1 && { color: C.goldInk }]}>{x.rank === 1 ? '👑' : x.rank}</Text>
              {x.me ? <Head age={s.age} gender={s.gender} size={34} /> : <Avatar name={x.name} gender={x.gender} age={s.age} size={34} />}
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, x.me && { color: C.primaryInk }]}>
                  {x.name}{x.me ? '（你）' : `（${x.title}）`}
                </Text>
                {!x.me && m ? <Text style={styles.story}>{mateStory(m)}</Text> : null}
                {x.me ? <Text style={styles.story}>{E.stageOf(s)}</Text> : null}
              </View>
              <Text style={[styles.money, x.me && { color: C.primaryInk }]}>{x.label}</Text>
            </View>
          );
        })}
      </Card>
      <Text style={[styles.muted, { marginTop: 10 }]}>
        同學會依成績升學（高中／高職 → 大學／頂大／直接工作 → 研究所），出社會後才有職業，每隔幾年靠努力升一級。資產也會受世界大事影響。退休結算時會比最後的名次。
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  muted: { fontSize: 12.5, color: C.muted, lineHeight: 19 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  me: { backgroundColor: C.primarySoft, borderRadius: 12, paddingHorizontal: 8, borderBottomColor: 'transparent' },
  rank: { width: 26, textAlign: 'center', fontSize: 15, fontWeight: '700', color: C.muted },
  name: { fontSize: 15, fontWeight: '600', color: C.ink },
  story: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  money: { fontSize: 14.5, fontWeight: '600', color: C.ink },
});
