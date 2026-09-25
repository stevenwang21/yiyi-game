import { useEffect, useRef, useState } from 'react';
import { play as playSfx } from './sfx';
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FadeIn, SmoothBar } from './ios';
import Celebration, { haptic } from './celebrate';
import { canShareCard, makeShareCard, shareCard, downloadCard, shareText } from './shareCard';
import LifeReplay from './LifeReplay';
import { Button, Card } from './components';
import { C, toneColor } from './theme';
import Sheet from './Sheet';
import LineChart from './LineChart';
import * as E from '../game/engine';
import { artForEnd } from './art';
import { CharScene, Head, MateFace } from './Character';

export default function EndScreen({ game, meta, onAgain, onHome }) {
  const sum = E.summary(game);
  const score = game.metaScore || E.lifeScore(game);
  const [showLog, setShowLog] = useState(false);
  const canBuy = !!meta && Object.entries(E.META_UPGRADES).some(([k, u]) => (meta[k] || 0) < u.max && meta.points >= u.cost(meta[k] || 0));

  // 結算的順序：① 先自動播「人生回顧」→ ② 關掉後結算畫面一段一段跑出來 → ③ 破億的話放煙火
  const [showReplay, setShowReplay] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [cel, setCel] = useState(null);
  const [nwShown, setNwShown] = useState(0);
  const [barOn, setBarOn] = useState(false);
  useEffect(() => {
    if (!revealed) return undefined;
    const ts = [];
    ts.push(setTimeout(() => haptic('tap'), T.badge));
    ts.push(setTimeout(() => playSfx(sum.achieved ? 'achieve' : (game.ended && game.ended.reason === 'death') ? 'death' : 'bad'), T.badge));
    ts.push(setTimeout(() => setNwShown(sum.nw), T.money));
    ts.push(setTimeout(() => { setBarOn(true); haptic('small'); }, T.money + 1500));
    if (sum.achieved && !sum.dead) {
      ts.push(setTimeout(() => {
        const c = { tier: sum.achievedAge === game.ended.age ? 'mega' : 'big', icon: '🏆', title: sum.headline, sub: `稱號：${sum.title}`, key: `end-${game.bornAt}` };
        setCel(c); haptic(c.tier);
      }, T.money + 1900));
    }
    return () => ts.forEach(clearTimeout);
  }, [revealed]);
  const closeReplay = () => { setShowReplay(false); if (!revealed) setRevealed(true); };
  // 人生成績單
  const [card, setCard] = useState(null);
  const [showCard, setShowCard] = useState(false);
  const [cardMsg, setCardMsg] = useState(null);
  const openCard = async () => {
    if (!canShareCard()) { shareText(game); return; }
    setShowCard(true);
    setCardMsg(null);
    if (!card) {
      try { setCard(await makeShareCard(game, meta)); } catch { setCardMsg('成績單產生失敗，再試一次'); }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.body}>
        {!revealed ? <View style={{ height: 600 }} /> : (
        <>
        <ZoomIn delay={T.art}>
          <CharScene
            kind={artForEnd(sum)} age={game.ended ? game.ended.age : game.age} gender={game.gender}
            partner={!!game.spouse} mood={sum.achieved ? '😆' : sum.nw < 0 ? '😢' : '😌'} bad={sum.nw < 0}
            height={210} radius={20} style={{ marginBottom: 14 }}
          />
        </ZoomIn>
        <FadeIn delay={T.kicker}><Text style={styles.kicker}>人 生 結 算</Text></FadeIn>
        <ZoomIn delay={T.headline} from={0.6}><Text style={[styles.headline, sum.achieved ? { color: C.goldInk } : { color: C.ink }]}>{sum.headline}</Text></ZoomIn>
        <Stamp delay={T.badge}><View style={styles.badge}><Text style={styles.badgeText}>稱號：{sum.title}</Text></View></Stamp>
        {sum.play ? (
          <Stamp delay={T.badge + 220}>
            <View style={styles.playBadge}>
              <Text style={styles.playName}>{sum.play.icon} {sum.play.name}</Text>
              <Text style={styles.playDesc}>{sum.play.desc}</Text>
              <Text style={styles.playCp}>階段目標過了 {sum.cpDone} / {sum.cpTotal} 關</Text>
            </View>
          </Stamp>
        ) : null}
        <FadeIn delay={T.money - 150}>
          <CountUp value={nwShown} duration={1500} format={(v) => E.formatMoney(v)} style={[styles.nw, sum.nw >= E.YI && { color: C.goldInk }]} />
          <Text style={styles.nwLabel}>
            {game.name} {game.ended.age} 歲時的淨資產{sum.achievedAge ? `．${sum.achievedAge} 歲突破一億` : ''}
          </Text>
          <View style={styles.goalBar}>
            <SmoothBar value={barOn ? Math.min(1, sum.pct / 100) : 0} color={sum.pct >= 100 ? C.gold : C.primary} height={10} />
          </View>
          <Text style={[styles.pctBig, sum.pct >= 100 && { color: C.green }]}>一億目標的 {sum.pct.toFixed(1)}%</Text>
        </FadeIn>

        <FadeIn delay={T.btns}>
        <View style={styles.endBtns}>
          <Pressable onPress={() => setShowReplay(true)} style={({ pressed }) => [styles.shareBtn, styles.replayBtn, pressed && { transform: [{ scale: 0.97 }] }]}>
            <Text style={styles.shareText}>🎬 人生回顧</Text>
          </Pressable>
          <Pressable onPress={openCard} style={({ pressed }) => [styles.shareBtn, pressed && { transform: [{ scale: 0.97 }] }]}>
            <Text style={styles.shareText}>📸 分享成績單</Text>
          </Pressable>
        </View>
        </FadeIn>

        <FadeIn delay={T.score}>
        <Card style={styles.scoreCard}>
          <View style={styles.scoreHead}>
            <Text style={styles.h}>🏅 這一生的成就</Text>
            <ScoreTotal list={score.list} total={score.total} start={T.score + 300} />
          </View>
          {score.list.map((a, i) => (
            <FadeIn key={a.id} delay={T.score + 300 + i * ROW_MS}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>✓ {a.label}</Text>
                <Text style={styles.scorePts}>+{a.pts}</Text>
              </View>
            </FadeIn>
          ))}
          {score.mult !== 1 ? (
            <Text style={styles.scoreNote}>{E.diffOf(game).name}難度加成：{score.base} × {score.mult} = {score.total} 點</Text>
          ) : null}
          <Text style={styles.scoreNote}>
            點數已經存起來了{meta ? `（目前共 ${meta.points} 點）` : ''}。回到首頁可以買永久升級：每年多一點精力、延後退休。
          </Text>
        </Card>
        </FadeIn>

        <FadeIn delay={T.score + 400 + score.list.length * ROW_MS}>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.h}>資產變化</Text>
            <Pressable onPress={() => setShowReplay(true)} hitSlop={8}><Text style={{ color: '#ffd76a', fontWeight: '700', fontSize: 13.5 }}>▶ 播放回顧</Text></Pressable>
          </View>
          <LineChart
            series={[{ key: 'nw', label: '淨資產', color: C.gold, values: sum.history }]}
            height={170}
            refLine={{ value: E.YI, label: '1 億' }}
            marks={game.worldHistory.filter((w) => ['pandemic', 'war', 'crisis'].includes(w.id)).map((w) => w.age)}
            format={(v) => (Math.abs(v) >= 1e8 ? `${(v / 1e8).toFixed(1)}億` : `${Math.round(v / 1e4)}萬`)}
          />
          <Text style={styles.axisNote}>紅色直條：疫情、戰爭、金融海嘯的年份（一生遇到 {sum.crashes} 次）</Text>
        </Card>


        <MatesFinal game={game} nw={sum.nw} />

        {sum.advice.length ? (
          <Card style={{ backgroundColor: C.goldSoft }}>
            <Text style={styles.h}>下次可以試試</Text>
            {sum.advice.map((a) => <Text key={a} style={styles.advice}>・{a}</Text>)}
          </Card>
        ) : null}

        <Button kind="ghost" title="查看完整人生紀錄" style={{ marginTop: 16 }} onPress={() => setShowLog(true)} />
        </FadeIn>
        </>
        )}
      </ScrollView>

      {/* 固定在底部：下一步要做什麼 */}
      <View style={styles.footer}>
        <Button kind="soft" title={canBuy ? '⭐ 去升級' : '回首頁'} sub={canBuy ? `有 ${meta.points} 點可用` : null} style={{ flex: 1 }} onPress={onHome} />
        <Button title="再活一次 ▶" sub={`${E.diffOf(game).name}難度`} style={{ flex: 1.3 }} onPress={onAgain} />
      </View>

      <Sheet visible={showCard} onClose={() => setShowCard(false)} title="人生成績單" tall>
        <View style={styles.cardWrap}>
          {card ? (
            <Image source={{ uri: card }} style={styles.cardImg} resizeMode="contain" />
          ) : (
            <View style={[styles.cardImg, { alignItems: 'center', justifyContent: 'center' }]}>
              {cardMsg ? <Text style={styles.nwLabel}>{cardMsg}</Text> : <ActivityIndicator color={C.primary} />}
            </View>
          )}
        </View>
        <Button
          title="分享到 IG／LINE"
          icon="📤"
          style={{ marginTop: 14 }}
          onPress={async () => { if (!card) return; const r = await shareCard(card, game); if (r === 'downloaded') setCardMsg('已下載圖片，可以到相簿／下載資料夾找'); }}
        />
        <Button kind="ghost" title="存成圖片" style={{ marginTop: 10 }} onPress={() => { if (card) { downloadCard(card, game); setCardMsg('已下載圖片'); } }} />
        {cardMsg && card ? <Text style={[styles.nwLabel, { marginTop: 8 }]}>{cardMsg}</Text> : null}
      </Sheet>

      <Celebration data={cel} onDone={() => setCel(null)} />
      <LifeReplay game={game} visible={showReplay} onClose={closeReplay} />

      <Sheet visible={showLog} onClose={() => setShowLog(false)} title="完整人生紀錄" tall>
        {game.log.map((l, i) => (
          <View key={i} style={styles.logRow}>
            <Text style={styles.logAge}>{l.age} 歲</Text>
            <Text style={[styles.logText, { color: toneColor(l.tone) }]}>{l.text}</Text>
          </View>
        ))}
      </Sheet>
    </View>
  );
}

// 出場時間（毫秒）
const T = { art: 0, kicker: 250, headline: 500, badge: 1000, money: 1500, btns: 3200, score: 3500 };
const ROW_MS = 230;
const ND = Platform.OS !== 'web';

// 放大淡入
// 最後結算：同學會的六個人各自賺到多少，一次攤開來看
function MatesFinal({ game, nw }) {
  const list = E.ranking(game, nw);
  if (list.length < 2) return null;
  const me = list.find((x) => x.me);
  const top = list[0];
  const gap = me && !me.me ? 0 : top.nw - (me ? me.nw : 0);
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.h}>🎓 同學最後賺到多少</Text>
        <Text style={styles.mateNote}>{list.length} 個人</Text>
      </View>
      <View style={{ marginTop: 6 }}>
        {list.map((x) => (
          <View key={x.id || x.name} style={[styles.mateRow, x.me && styles.mateMe]}>
            <Text style={[styles.mateRank, x.rank === 1 && { color: C.goldInk }]}>{x.rank === 1 ? '👑' : x.rank}</Text>
            {x.me
              ? <Head age={game.age} gender={game.gender} size={32} />
              : <MateFace asset={x.characterAsset} size={32} />}
            <View style={{ flex: 1 }}>
              <Text style={[styles.mateName, x.me && { color: C.primaryInk }]} numberOfLines={1}>
                {x.me ? `${x.name}（你）` : x.name}
              </Text>
              <Text style={styles.mateNote} numberOfLines={1}>
                {x.me ? (game.job ? game.job.name : E.stageOf(game)) : x.title}
              </Text>
            </View>
            <Text style={[styles.mateMoney, x.me && { color: C.primaryInk }]}>{E.formatMoney(x.nw)}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.mateNote, { marginTop: 10, lineHeight: 18 }]}>
        {me && me.rank === 1
          ? `你是這一屆最有錢的，第二名差你 ${E.formatMoney(me.nw - list[1].nw)}。`
          : `第一名是「${top.name}」（${top.title}），比你多 ${E.formatMoney(gap)}。`}
      </Text>
    </Card>
  );
}

function ZoomIn({ children, delay = 0, from = 0.85 }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.back(1.6)), useNativeDriver: ND }).start(); }, []);
  return <Animated.View style={{ opacity: a.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }] }}>{children}</Animated.View>;
}

// 稱號像蓋章一樣「碰」一聲蓋下來
function Stamp({ children, delay = 0 }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.sequence([Animated.delay(delay), Animated.spring(a, { toValue: 1, friction: 5, tension: 120, useNativeDriver: ND })]).start(); }, []);
  return (
    <Animated.View style={{ opacity: a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) }, { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'] }) }] }}>
      {children}
    </Animated.View>
  );
}

// 數字從 0 跑到目標（跑錢用）
function CountUp({ value, duration = 1500, format, style }) {
  const [shown, setShown] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (!value) { setShown(0); return undefined; }
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <Text style={style} numberOfLines={1} adjustsFontSizeToFit>{format(shown)}</Text>;
}

// 成就點數：每跳出一行就加上去
function ScoreTotal({ list, total, start }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const ts = [];
    let acc = 0;
    const base = list.reduce((s, a) => s + a.pts, 0) || 1;
    list.forEach((a, i) => {
      acc += a.pts;
      const v = Math.round((acc / base) * total);
      ts.push(setTimeout(() => { setN(v); haptic('tap'); }, start + i * ROW_MS + 120));
    });
    if (!list.length) setN(total);
    return () => ts.forEach(clearTimeout);
  }, []);
  return <Text style={styles.scoreTotal}>+{n} 點</Text>;
}


const styles = StyleSheet.create({
  scoreCard: { backgroundColor: C.goldSoft, marginTop: 14 },
  scoreHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  scoreTotal: { fontSize: 20, fontWeight: '700', color: C.goldInk },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.goldLine },
  scoreLabel: { fontSize: 13.5, color: C.ink, flex: 1 },
  scorePts: { fontSize: 13.5, fontWeight: '600', color: C.goldInk },
  scoreNote: { fontSize: 12, color: C.goldInk, marginTop: 8, lineHeight: 18 },
  body: { padding: 16, paddingTop: 20, paddingBottom: 30 },
  footer: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16,
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#0f1426', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12,
  },
  kicker: { textAlign: 'center', color: C.primaryInk, fontWeight: '600', fontSize: 13, letterSpacing: 2 },
  headline: { textAlign: 'center', fontSize: 30, fontWeight: '700', color: C.primary, marginTop: 6 },
  playBadge: {
    alignSelf: 'center', alignItems: 'center', marginTop: 10, paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 14, backgroundColor: 'rgba(30,38,96,0.75)', borderWidth: 1, borderColor: 'rgba(157,140,255,0.4)',
  },
  playName: { fontSize: 19, fontWeight: '900', color: C.primaryInk, letterSpacing: 1 },
  playDesc: { fontSize: 12, color: C.muted, marginTop: 4, textAlign: 'center' },
  playCp: { fontSize: 11.5, color: C.goldInk, marginTop: 6, fontWeight: '700' },
  badge: { alignSelf: 'center', backgroundColor: 'rgba(255,215,106,0.14)', borderWidth: 1, borderColor: 'rgba(255,215,106,0.6)', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 7, marginTop: 12 },
  badgeText: { color: '#ffd76a', fontWeight: '600', fontSize: 14 },
  nw: { textAlign: 'center', fontSize: 40, fontWeight: '700', color: C.ink, marginTop: 16 },
  nwLabel: { textAlign: 'center', fontSize: 12.5, color: C.muted },
  pctBig: { textAlign: 'center', fontSize: 16, fontWeight: '600', color: C.goldInk, marginTop: 6 },
  goalBar: { marginTop: 14, marginHorizontal: 30 },
  endBtns: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 16 },
  replayBtn: { backgroundColor: '#f5a524', shadowColor: '#f5a524' },
  shareBtn: {
    alignSelf: 'center', backgroundColor: '#6a5cff', borderRadius: 999, paddingHorizontal: 22, paddingVertical: 12,
    shadowColor: '#6a5cff', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  shareText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardWrap: { alignItems: 'center' },
  cardImg: { width: '78%', aspectRatio: 1080 / 1920, borderRadius: 16, backgroundColor: '#0f1636' },
  axisNote: { fontSize: 11, color: C.muted, marginTop: 4 },
  h: { fontSize: 14, fontWeight: '700', color: C.ink },
  yiLine: { position: 'absolute', left: 0, right: 0, height: 1, borderTopWidth: 1, borderColor: C.red, borderStyle: 'dashed' },
  yiLabel: { position: 'absolute', left: 2, fontSize: 10, color: C.red },
  axis: { flex: 1, fontSize: 9, color: C.muted, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  kv: { width: '48.5%', backgroundColor: C.card, borderRadius: 16, padding: 12 },
  kvK: { fontSize: 11.5, color: C.muted },
  kvV: { fontSize: 14.5, fontWeight: '600', color: C.ink, marginTop: 3 },
  mateRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line },
  mateMe: { backgroundColor: C.primarySoft, borderRadius: 12, paddingHorizontal: 8, borderBottomColor: 'transparent' },
  mateRank: { width: 22, textAlign: 'center', fontSize: 14, fontWeight: '700', color: C.muted },
  mateName: { fontSize: 14.5, fontWeight: '600', color: C.ink },
  mateNote: { fontSize: 11.5, color: C.muted },
  mateMoney: { fontSize: 14, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  advice: { fontSize: 13.5, color: C.ink, marginTop: 6, lineHeight: 20 },
  logRow: { flexDirection: 'row', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line },
  logAge: { width: 42, fontSize: 12, color: C.muted, paddingTop: 1 },
  logText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
