// 今年摘要：把一整年的結果整理成好讀的一張卡（取代以前擠在一起的長句子）
import { StyleSheet, Text, View } from 'react-native';
import { C, STAT_META } from './theme';
import { formatMoney } from '../game/engine';

const FOCUS_ICON = {
  study: '📖', cram: '✏️', sport: '🏃', play: '🎮', friends: '👫', parttime: '🧋', finance: '📊', date: '💕',
  work: '💼', gig: '🛵', runbiz: '🏭', learn: '🎓', rest: '🌴', gym: '🏋️', network: '🥂', invest: '📈',
  family: '👨‍👩‍👧', jobhunt: '🔍', startbiz: '🚀', grow: '🌱',
};

const metaOf = (k) => STAT_META.find((m) => m.key === k);
const short = (n) => formatMoney(Math.round(n));

function Delta({ k, v }) {
  const m = metaOf(k);
  if (!m) return null;
  return (
    <Text style={[styles.delta, { color: v > 0 ? C.green : C.red }]}>
      {m.icon}{v > 0 ? '+' : ''}{v}
    </Text>
  );
}

function Money({ label, value, color, dim }) {
  return (
    <View style={styles.col}>
      <Text style={styles.colLabel}>{label}</Text>
      <Text style={[styles.colValue, { color: dim ? C.muted : color }]}>{dim ? '—' : short(value)}</Text>
    </View>
  );
}

export default function YearSummary({ s }) {
  const y = s.lastYear;
  const fd = (s.focusDetail || []).filter((f) => f.key !== 'grow' || Object.keys(f.d).length);
  if (!y && !fd.length) return null;

  const focusCost = fd.reduce((t, f) => t + (f.money < 0 ? -f.money : 0), 0);
  const focusGain = fd.reduce((t, f) => t + (f.money > 0 ? f.money : 0), 0);
  const pets = y?.pets || [];
  const petCost = pets.filter((p) => !p.byParents).reduce((t, p) => t + p.cost, 0);

  const income = (y?.salary || 0) + (y?.side || 0) + (y?.bizIncome || 0) + (y?.rent || 0)
    + (y?.spouse || 0) + (y?.allowance || 0) + (y?.filial || 0) + focusGain;
  const spend = (y?.living || 0) + (y?.kids || 0) + (y?.debtPay || 0) + (y?.dating || 0) + (y?.tax || 0) + petCost + focusCost;
  const saved = y?.dca || 0;

  // 明細：只列有金額的，最多 6 項，看起來才清爽
  const items = [
    { t: '薪水', v: y?.salary },
    { t: y?.scholarship ? '零用錢＋獎學金' : '零用錢', v: y?.allowance },
    { t: '副業', v: y?.side },
    { t: '公司分紅', v: y?.bizIncome },
    { t: '房租收入', v: y?.rent },
    { t: `${s.married ? '另一半' : '對方'}收入`, v: y?.spouse },
    { t: '孝親費', v: y?.filial },
    { t: '生活費', v: y?.living, out: true },
    { t: '稅＋勞健保', v: y?.tax, out: true },
    { t: '養小孩', v: y?.kids, out: true },
    { t: '還債', v: y?.debtPay, out: true },
    { t: '約會', v: y?.dating, out: true },
    ...pets.map((p) => ({ t: `${p.kind === '貓' ? '🐱' : '🐶'} ${p.name}`, v: p.cost, out: true, note: p.byParents ? '爸媽付' : '' })),
  ].filter((x) => x.v > 0).slice(0, 7);

  return (
    <View style={styles.wrap}>
      {fd.length ? (
        <View style={styles.chips}>
          {fd.map((f, i) => (
            <View key={`${f.key}${i}`} style={styles.chip}>
              <Text style={styles.chipIcon}>{FOCUS_ICON[f.key] || '•'}</Text>
              <Text style={styles.chipLabel}>{f.label}</Text>
              {f.money ? (
                <Text style={[styles.delta, { color: f.money > 0 ? C.green : C.muted }]}>
                  {f.money > 0 ? '+' : '−'}{short(Math.abs(f.money))}
                </Text>
              ) : null}
              {Object.entries(f.d).map(([k, v]) => <Delta key={k} k={k} v={v} />)}
            </View>
          ))}
        </View>
      ) : null}

      {income || spend || saved ? (
        <>
          <View style={styles.row}>
            <Money label="收入" value={income} color={C.green} dim={!income} />
            <View style={styles.sep} />
            <Money label="支出" value={spend} color={C.red} dim={!spend} />
            <View style={styles.sep} />
            <Money label="投入投資" value={saved} color={C.primaryInk} dim={!saved} />
          </View>
          {y && y.cashStart != null ? (
            <Text style={styles.flow}>
              現金：年初 {short(y.cashStart)}{y.cashStart < 0 ? '（透支）' : ''}
              <Text style={{ color: C.green }}> +{short(income)}</Text>
              <Text style={{ color: C.red }}> −{short(spend)}</Text>
              {saved ? <Text style={{ color: C.primaryInk }}> −{short(saved)}投資</Text> : null}
              {y.cashEnd < 0 && y.cashStart < 0 ? <Text style={{ color: C.red }}> −利息</Text> : null}
              {' '}→ 年末 <Text style={{ fontWeight: '700', color: y.cashEnd < 0 ? C.red : C.ink }}>{short(y.cashEnd)}</Text>
            </Text>
          ) : null}
          {items.length ? (
            <View style={styles.items}>
              {items.map((x, i) => (
                <Text key={i} style={styles.item}>
                  {x.t} <Text style={{ color: x.out ? C.red : C.green, fontWeight: '700' }}>{x.out ? '−' : '+'}{short(x.v)}</Text>
                  {x.note ? <Text style={styles.note}>（{x.note}）</Text> : null}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.page, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5,
  },
  chipIcon: { fontSize: 12 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: C.ink },
  delta: { fontSize: 11.5, fontWeight: '600' },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  col: { flex: 1, alignItems: 'center' },
  colLabel: { fontSize: 11, color: C.muted, fontWeight: '700' },
  colValue: { fontSize: 16.5, fontWeight: '700', marginTop: 2 },
  sep: { width: 1, height: 26, backgroundColor: C.line },

  flow: { fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 18 },
  items: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  item: { fontSize: 11.5, color: C.muted },
  note: { fontSize: 11, color: C.muted },
});
