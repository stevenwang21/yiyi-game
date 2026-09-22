import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Sheet from './Sheet';
import LineChart from './LineChart';
import { Bar, Button, Card } from './components';
import { C } from './theme';
import * as E from '../game/engine';

const LEVEL = {
  bad: { color: C.red, bg: C.redSoft, tag: '危險' },
  warn: { color: C.goldInk, bg: C.goldSoft, tag: '注意' },
  info: { color: C.blue, bg: C.blueSoft, tag: '提醒' },
  good: { color: C.green, bg: C.greenSoft, tag: '良好' },
};

const hpColor = (hp) => (hp < 30 ? C.red : hp < 50 ? C.gold : C.green);

export default function HealthSheet({ visible, onClose, game, setGame }) {
  const [msg, setMsg] = useState(null);
  const s = game;
  const r = E.healthReport(s);

  const check = () => {
    const res = E.healthCheck(s);
    if (res.error) setMsg({ text: res.error, bad: true });
    else {
      setMsg({ text: res.msg });
      setGame(res.state);
      if (res.state.pending) onClose();
    }
  };

  const riskColor = r.riskLevel ? LEVEL[r.riskLevel.tone === 'warn' ? 'warn' : r.riskLevel.tone].color : C.muted;

  return (
    <Sheet visible={visible} onClose={() => { setMsg(null); onClose(); }} title="健康偵測" tall>
      <View style={styles.top}>
        <View style={[styles.gauge, { borderColor: hpColor(r.hp) }]}>
          <Text style={[styles.gaugeNum, { color: hpColor(r.hp) }]}>{r.hp}</Text>
          <Text style={styles.gaugeLabel}>健康</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View>
            <Text style={styles.muted}>近 5 年變化</Text>
            <Text style={[styles.h, { color: r.trend < 0 ? C.red : C.green }]}>{r.trend > 0 ? '+' : ''}{r.trend}</Text>
          </View>
          <View>
            <Text style={styles.muted}>健康風險（生大病的機率）</Text>
            {r.risk != null ? (
              <>
                <Text style={[styles.h, { color: riskColor }]}>{r.riskLevel.label}（{r.risk} / 100）</Text>
                <View style={{ marginTop: 4 }}><Bar value={r.risk} color={riskColor} height={6} /></View>
              </>
            ) : (
              <Text style={[styles.h, { color: C.muted }]}>未知，要做健康檢查才看得到</Text>
            )}
          </View>
        </View>
      </View>

      {msg ? <Text style={[styles.msg, msg.bad && { color: C.red, backgroundColor: C.redSoft }]}>{msg.text}</Text> : null}

      <Button
        kind="green"
        style={{ marginTop: 12 }}
        title={r.checkedThisYear ? '今年已經做過健康檢查' : `做健康檢查（${E.formatMoney(r.checkupCost)}）`}
        sub={r.since != null ? `上次檢查：${r.since === 0 ? '今年' : `${r.since} 年前`}` : '可以看到隱藏的健康風險，早期發現早期治療'}
        disabled={r.checkedThisYear || s.age < 18}
        onPress={check}
      />

      <Card>
        <Text style={styles.h}>偵測結果</Text>
        {r.warnings.map((w) => {
          const lv = LEVEL[w.level];
          return (
            <View key={w.text} style={styles.warn}>
              <Text style={[styles.warnTag, { color: lv.color, backgroundColor: lv.bg }]}>{lv.tag}</Text>
              <Text style={styles.warnText}>{w.text}</Text>
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={styles.h}>健康走勢</Text>
        <LineChart
          series={[{ key: 'hp', label: '健康', color: C.green, values: s.hpHistory }]}
          height={130}
          refLine={{ value: 30, label: '危險線' }}
        />
      </Card>

      <Card style={{ backgroundColor: C.goldSoft }}>
        <Text style={styles.h}>怎麼讓身體變好？</Text>
        <Text style={styles.tip}>・年度重點選「運動健身」：健康大幅上升，風險下降最多。</Text>
        <Text style={styles.tip}>・選「休息旅遊」或「家庭時光」：快樂上升，也能降低風險。</Text>
        <Text style={styles.tip}>・連續好幾年「認真工作」「經營事業」，過勞風險會越來越高。</Text>
        <Text style={styles.tip}>・健康檢查發現問題時，及早治療最划算。</Text>
      </Card>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 4 },
  gauge: { width: 96, height: 96, borderRadius: 48, borderWidth: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  gaugeNum: { fontSize: 30, fontWeight: '700' },
  gaugeLabel: { fontSize: 11, color: C.muted },
  h: { fontSize: 15, fontWeight: '700', color: C.ink },
  muted: { fontSize: 12, color: C.muted },
  msg: { marginTop: 10, padding: 8, borderRadius: 10, backgroundColor: C.greenSoft, color: C.green, fontSize: 13, overflow: 'hidden' },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 8 },
  warnTag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  warnText: { flex: 1, fontSize: 13.5, color: C.ink, lineHeight: 19 },
  tip: { fontSize: 13, color: C.ink, marginTop: 6, lineHeight: 19 },
});
