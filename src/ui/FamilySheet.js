import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Sheet from './Sheet';
import { Bar, Button, Card } from './components';
import { C } from './theme';
import * as E from '../game/engine';
import { Avatar, Art } from './art';
import { Head } from './Character';

export default function FamilySheet({ visible, onClose, game, setGame }) {
  const s = game;
  const ptype = E.currentType(s);
  const pInfo = E.proposeInfo(s);
  const [pMsg, setPMsg] = useState(null);
  const doPropose = (wedding) => {
    const r = E.propose(s, wedding);
    if (r.error) { setPMsg(r.error); return; }
    setPMsg(null);
    setGame(r.state);
  };
  const infos = s.kids.map((k) => ({ k, info: E.kidInfo(s, k) }));
  const yearly = infos.reduce((t, x) => t + x.info.yearly, 0);
  const pets = s.pets || [];
  const [openPet, setOpenPet] = useState(null);

  return (
    <Sheet visible={visible} onClose={onClose} title="家庭" tall>
      {s.married ? (
        <Card style={{ marginTop: 4 }}>
          <View style={styles.kidTop}>
            <Head gender={s.gender === 'male' ? 'female' : 'male'} age={s.age} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={styles.h}>{E.partnerWord(s)}：{s.spouse.name}{ptype ? `（${ptype.title}）` : ''}</Text>
              <Text style={styles.muted}>結婚 {s.age - s.spouse.since} 年．Lv.{s.spouseLevel} {E.spouseInfo(s).title}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.muted}>每年收入</Text>
              <Text style={styles.money}>{E.formatMoney(E.spouseInfo(s).income + (ptype ? Math.round(ptype.income * 10000 * s.priceIndex) : 0))}</Text>
            </View>
          </View>
          {ptype ? <Text style={styles.perk}>✨ {ptype.perkText}</Text> : null}
          <Text style={[styles.muted, { marginTop: 8 }]}>
            {E.partnerWord(s)}會在自己的行業裡慢慢升遷（同一個職位至少 3 年）。家裡快樂、你多選「家庭時光」，升得比較快。
            {s.spouseLevel < 5 ? `下一步：${E.spouseTitle(s, s.spouseLevel + 1)}` : '已經是這一行的頂點了！'}
          </Text>
        </Card>
      ) : s.partner ? (
        <Card style={{ marginTop: 4 }}>
          <View style={styles.kidTop}>
            <Head gender={s.gender === 'male' ? 'female' : 'male'} age={s.age} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={styles.h}>交往中：{s.partner.name}{ptype ? `（${ptype.title}）` : ''}</Text>
              <Text style={styles.muted}>在一起 {s.age - s.partner.since} 年．每年約會約花 {E.formatMoney((s.studying ? 1.5 : 5) * 10000 * s.priceIndex)}</Text>
            </View>
          </View>
          <View style={[styles.between, { marginTop: 10 }]}>
            <Text style={styles.muted}>感情</Text>
            <Text style={[styles.muted, { color: s.partner.love < 30 ? C.red : C.ink }]}>{s.partner.love} / 100</Text>
          </View>
          <Bar value={s.partner.love} color={s.partner.love < 30 ? C.red : C.pink} height={7} />
          {ptype ? <Text style={styles.perk}>✨ {ptype.perkText}</Text> : null}
          {ptype ? <Text style={styles.muted}>結婚後，對方每年還會為家裡賺約 {E.formatMoney(ptype.income * 10000 * s.priceIndex)}。</Text> : null}
          <Text style={[styles.muted, { marginTop: 8 }]}>
            年度重點選「約會」感情會加 24；太久沒約會或沒錢約會，感情會慢慢變淡。
          </Text>
          {pInfo.ok ? (
            <>
              <Text style={[styles.perk, { marginTop: 10 }]}>💍 可以求婚了！</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Button
                  small
                  kind="primary"
                  title="求婚並辦婚禮"
                  sub={E.formatMoney(pInfo.cost)}
                  style={{ flex: 1 }}
                  onPress={() => doPropose(true)}
                />
                <Button
                  small
                  kind="ghost"
                  title="登記就好"
                  sub="不花錢"
                  style={{ flex: 1 }}
                  onPress={() => doPropose(false)}
                />
              </View>
              {pMsg ? <Text style={[styles.muted, { marginTop: 8, color: C.red, fontWeight: '700' }]}>{pMsg}</Text> : null}
            </>
          ) : (
            <Text style={[styles.muted, { marginTop: 8, color: C.goldInk, fontWeight: '700' }]}>💍 求婚條件：{pInfo.reason}</Text>
          )}
        </Card>
      ) : null}

      <Card style={{ marginTop: 4 }}>
        <View style={styles.row}>
          <Stat label="婚姻" value={s.married ? '已婚' : s.partner ? '交往中' : '單身'} />
          <Stat label="孩子" value={`${s.kids.length} 個`} />
          <Stat label="明年養小孩" value={E.formatMoney(yearly)} />
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.muted}>到目前為止，花在孩子身上的錢</Text>
          <Text style={styles.total}>{E.formatMoney(s.kidSpent)}</Text>
        </View>
        <Text style={styles.muted}>
          {s.married
            ? `年度重點選「家庭時光」，年底就能決定要不要再生一個（最多 ${E.MAX_KIDS} 個）。養小孩的花費會隨物價上漲。`
            : '還沒結婚。先交往（會有「有人想介紹對象給你」讓你挑），交往滿 1 年、感情 40 以上就可以直接求婚，結婚後就能生小孩。'}
        </Text>
        {s.married ? (
          <View style={styles.fertBox}>
            <Text style={styles.fertTitle}>
              🤰 媽媽今年 {E.motherAge(s)} 歲．受孕成功率約 {Math.round(E.conceiveChance(E.motherAge(s)) * 100)}%
            </Text>
            <Text style={styles.fertText}>
              年紀越大越不容易懷上（35 歲後明顯下降、40 歲後更低），高齡懷孕唐氏症的機率也會上升
              （遊戲用的是接近真實的數字：35 歲約 0.4%、40 歲約 1%、43 歲約 2.8%、45 歲以上約 4%）。
              目前這個年紀約 {(E.downsChance(E.motherAge(s)) * 100).toFixed(1)}%。
            </Text>
          </View>
        ) : null}
      </Card>

      {infos.map(({ k, info }) => (
        <Card key={k.uid}>
          <View style={styles.kidTop}>
            <Avatar name={k.name} gender={k.gender || 'male'} age={s.age - k.born} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={styles.h}>{k.name}</Text>
              <Text style={styles.muted}>
                {info.age} 歲．{info.stage}{info.style && info.stage !== '已成年' && info.stage !== '已獨立' ? `．${info.style.icon} ${info.style.name}` : ''}
              </Text>
              {info.downs ? <Text style={styles.tag}>唐氏症．每年多一筆早療和療育的費用</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.muted}>已經花了</Text>
              <Text style={styles.money}>{E.formatMoney(k.spent)}</Text>
            </View>
          </View>
          {info.stage !== '已獨立' ? (
            <>
              <Text style={[styles.muted, { marginTop: 8 }]}>
                要怎麼養？每年約 <Text style={{ color: C.ink, fontWeight: '600' }}>{E.formatMoney(info.yearly)}</Text>
              </Text>
              <View style={styles.styleRow}>
                {E.KID_STYLES.map((st) => (
                  <Pressable
                    key={st.id}
                    onPress={() => {
                      const r = E.setKidStyle(s, k.uid, st.id);
                      if (r.state) setGame(r.state);
                    }}
                    style={[styles.styleChip, info.style.id === st.id && styles.styleOn]}
                  >
                    <Text style={styles.styleIcon}>{st.icon}</Text>
                    <Text style={[styles.styleName, info.style.id === st.id && { color: C.primaryInk }]}>{st.name}</Text>
                    <Text style={styles.styleSub}>{st.sub}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.styleDesc}>{info.style.desc}</Text>
            </>
          ) : (
            <Text style={[styles.muted, { marginTop: 8 }]}>
              {info.downs
                ? `已經成年，有自己的工作，你們還是固定給生活費，每年約 ${E.formatMoney(info.yearly)}。`
                : `已經長大獨立，不用再花錢了。${info.outcome ? `現在是「${info.outcome.title}」` : ''}${info.filial > 0 ? `，每年給你 ${E.formatMoney(info.filial)} 孝親費。` : info.outcome ? '，暫時還幫不上家裡。' : ''}`}
            </Text>
          )}
        </Card>
      ))}

      {pets.length ? (
        <Card>
          <View style={styles.between}>
            <Text style={styles.h}>寵物</Text>
            <Text style={styles.muted}>寵物總花費 {E.formatMoney(s.petSpent || 0)}</Text>
          </View>
          {pets.map((p) => {
            const open = openPet === p.uid;
            const bills = [...p.bills].reverse();
            return (
              <View key={p.uid} style={styles.petBox}>
                <Pressable onPress={() => setOpenPet(open ? null : p.uid)} style={styles.kidTop}>
                  <View style={[styles.avatar, { backgroundColor: p.alive ? C.greenSoft : C.page }]}>
                    <Text style={[styles.avatarText, { color: p.alive ? C.green : C.muted }]}>{p.kind}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.h}>{p.name}{p.alive ? '' : '（已離開）'}</Text>
                    <Text style={styles.muted}>
                      {p.alive ? `${s.age - p.since} 歲．陪伴你 ${s.age - p.since} 年` : `陪伴了你 ${p.diedAt - p.since} 年`}．共 {p.bills.length} 筆花費
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.muted}>已經花了</Text>
                    <Text style={styles.money}>{E.formatMoney(p.spent)}</Text>
                  </View>
                </Pressable>
                <Text style={styles.linkText} onPress={() => setOpenPet(open ? null : p.uid)}>{open ? '收起花費明細 ▲' : '看每一筆花費 ▼'}</Text>
                {open ? (
                  <View style={{ marginTop: 4 }}>
                    {bills.map((b, i) => (
                      <View key={i} style={styles.billRow}>
                        <Text style={styles.billAge}>{b.age} 歲</Text>
                        <Text style={styles.billItem}>{b.item}{b.byParents ? '（爸媽付）' : ''}</Text>
                        <Text style={styles.billAmt}>{E.formatMoneyFine(b.amount)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      <Card style={{ backgroundColor: C.goldSoft }}>
        <Text style={styles.h}>每個孩子每年的花費（出生時的物價）</Text>
        <Text style={styles.tip}>0–5 歲：約 20 萬（托嬰、奶粉、尿布）</Text>
        <Text style={styles.tip}>6–11 歲：約 12 萬</Text>
        <Text style={styles.tip}>12–17 歲：約 15 萬</Text>
        <Text style={styles.tip}>18–21 歲：約 25 萬（大學學費、生活費）</Text>
        <Text style={styles.tip}>以上是「標準」的費用。窮養 ×0.55、富養 ×2.2，隨時可以改。</Text>
        <Text style={styles.tip}>22 歲獨立，之後不用再花錢，還會依成就每年給你孝親費（25 歲起，普通上班族 3 萬／專業人士 8 萬／很有成就 18 萬），富養的孩子出人頭地的機率高很多。</Text>
      </Card>
    </Sheet>
  );
}

function Stat({ label, value }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.h}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fertBox: { backgroundColor: C.page, borderRadius: 12, padding: 10, marginTop: 10 },
  fertTitle: { fontSize: 13, fontWeight: '600', color: C.ink },
  fertText: { fontSize: 11.5, color: C.muted, lineHeight: 17, marginTop: 4 },
  tag: {
    alignSelf: 'flex-start', marginTop: 4, fontSize: 11, fontWeight: '700',
    color: C.primaryInk, backgroundColor: C.primarySoft, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  styleRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  styleChip: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12,
    backgroundColor: C.page, borderWidth: 1.5, borderColor: 'transparent',
  },
  styleOn: { backgroundColor: C.primarySoft, borderColor: C.primary },
  styleIcon: { fontSize: 17 },
  styleName: { fontSize: 13, fontWeight: '600', color: C.ink, marginTop: 2 },
  styleSub: { fontSize: 10.5, color: C.muted, marginTop: 1 },
  styleDesc: { fontSize: 11.5, color: C.muted, lineHeight: 17, marginTop: 8 },
  row: { flexDirection: 'row' },
  between: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  h: { fontSize: 15, fontWeight: '700', color: C.ink },
  muted: { fontSize: 12.5, color: C.muted, lineHeight: 18 },
  perk: { fontSize: 13, color: C.primaryInk, fontWeight: '700', lineHeight: 19, marginTop: 8 },
  totalBox: { alignItems: 'center', marginVertical: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: C.page },
  total: { fontSize: 28, fontWeight: '700', color: C.ink },
  kidTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600', color: C.goldInk },
  money: { fontSize: 16, fontWeight: '600', color: C.ink },
  kidBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  tip: { fontSize: 13, color: C.ink, marginTop: 5 },
  petBox: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line, marginTop: 6 },
  linkText: { fontSize: 12.5, color: C.blue, marginTop: 6 },
  billRow: { flexDirection: 'row', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.line },
  billAge: { width: 40, fontSize: 12, color: C.muted },
  billItem: { flex: 1, fontSize: 12.5, color: C.ink },
  billAmt: { fontSize: 12.5, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
});
