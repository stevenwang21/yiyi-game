import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PHOTO } from './art/photos';
import Sheet from './Sheet';
import LineChart from './LineChart';
import { Button, Card, Chip, Tag } from './components';
import AmountSlider from './AmountSlider';
import { C, toneColor } from './theme';
import * as E from '../game/engine';
import { DCA_OPTIONS } from '../game/data';

const WAN = 10000;
// 快速金額按鈕
const QUICK = [
  { label: '10萬', v: 10 * WAN },
  { label: '50萬', v: 50 * WAN },
  { label: '100萬', v: 100 * WAN },
  { label: '全部', v: Infinity },
];

// 可以長按連續加碼的按鈕：按住 0.4 秒後，每 0.15 秒重複一次
function HoldButton({ title, kind, disabled, onFire, repeat }) {
  const hold = useRef(null);
  const tick = useRef(null);
  const repeated = useRef(false);
  const fire = useRef(onFire);
  fire.current = onFire;
  const stop = () => {
    if (hold.current) clearTimeout(hold.current);
    if (tick.current) clearInterval(tick.current);
    hold.current = null;
    tick.current = null;
  };
  useEffect(() => stop, []);
  return (
    <Button
      small
      kind={kind}
      title={title}
      disabled={disabled}
      style={styles.quickBtn}
      onPressIn={() => {
        repeated.current = false;
        if (!repeat || disabled) return;
        stop();
        hold.current = setTimeout(() => {
          repeated.current = true;
          if (!fire.current()) return;
          tick.current = setInterval(() => { if (!fire.current()) stop(); }, 150);
        }, 400);
      }}
      onPressOut={stop}
      onPress={() => {
        if (!repeated.current) fire.current();
        repeated.current = false;
      }}
    />
  );
}

// 一排快速按鈕：前面是標題（買進／賣出），後面是金額；長按 10萬／50萬／100萬 會一直加
function QuickRow({ label, kind, onPick, disabled }) {
  return (
    <View style={styles.quickRow}>
      <Text style={[styles.quickLabel, kind === 'green' && { color: C.green }]}>{label}</Text>
      {QUICK.map((q) => (
        <HoldButton
          key={q.label}
          kind={kind}
          title={q.label}
          disabled={disabled}
          repeat={q.v !== Infinity}
          onFire={() => onPick(q.v, q.label)}
        />
      ))}
    </View>
  );
}
const TABS = ['金融', '房地產', '公司', '收購', '貸款'];
const TRADE_NAME = { buy: '買進', sell: '賣出', dca: '定期定額', forced: '被迫賣出' };
const INV_DESC = { etf: '一籃子佈局\n掌握全球機會', deposit: '穩健累積\n安心增值', stock: '精選企業\n創造超越', gold: '價值永恆\n對抗風險', crypto: '擁抱創新\n探索未來' };
const RISK = (r) => (r <= 1 ? ['低風險', '#7db4ff'] : r <= 2 ? ['中風險', '#3ddc97'] : r <= 4 ? ['中高風險', '#ffb547'] : ['高風險', '#d58bff']);
const FADE = (dir) => (Platform.OS === 'web'
  ? { backgroundImage: `linear-gradient(${dir}, rgba(10,14,45,0.92) 0%, rgba(10,14,45,0.55) 45%, rgba(10,14,45,0) 75%)` }
  : { backgroundColor: 'rgba(10,14,45,0.35)' });

// 投資中心的圖片卡
function InvestTile({ img, name, risk, desc, held, ret, big, onPress }) {
  const [label, color] = RISK(risk);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, big ? styles.tileBig : styles.tileSmall, { borderColor: `${color}88` }, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}>
      <Image source={PHOTO[img]} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, FADE(big ? 'to right' : 'to top')]} />
      <View style={[styles.tileBody, !big && { justifyContent: 'flex-end' }]}>
        <Text style={[styles.tileName, big && { fontSize: 34 }]}>{name}</Text>
        <View style={[styles.riskPill, { borderColor: color }]}><Text style={[styles.riskText, { color }]}>{label}</Text></View>
        {big ? <Text style={styles.tileDesc}>{desc}</Text> : null}
        <Text style={[styles.tileHeld, { marginRight: 32 }]} numberOfLines={big ? 1 : 2}>
          {held > 0 ? `持有 ${E.formatMoney(held)}` : '還沒買'}
          {held > 0 && ret != null ? <Text style={{ color: ret >= 0 ? '#3ddc97' : '#ff8a80' }}>{big ? '　' : '\n'}{pct(ret)}</Text> : null}
        </Text>
      </View>
      <View style={styles.tileGo}><Text style={styles.tileGoText}>›</Text></View>
    </Pressable>
  );
}
const ICON_BG = { deposit: C.page, etf: C.greenSoft, stock: C.blueSoft, gold: C.goldSoft, crypto: '#2e2560' };
const ICON_FG = { deposit: C.muted, etf: C.green, stock: C.blue, gold: C.goldInk, crypto: C.purple };
const CRASH_IDS = ['pandemic', 'war', 'crisis'];

const pct = (r) => (r == null ? '' : `${r >= 0 ? '+' : ''}${(r * 100).toFixed(1)}%`);
const shortMoney = (v) => (Math.abs(v) >= 1e8 ? `${(v / 1e8).toFixed(1)}億` : `${Math.round(v / WAN)}萬`);

export default function InvestSheet({ visible, onClose, game, setGame, initialTab }) {
  const [tab, setTab] = useState(0);
  const [showAll, setShowAll] = useState(false);   // 交易紀錄要不要全部展開
  useEffect(() => { if (visible && initialTab != null) setTab(initialTab); }, [visible, initialTab]);
  // 每次打開投資頁都從投資中心開始
  useEffect(() => { if (visible) setAsset(null); }, [visible]);
  const [chartKey, setChartKey] = useState('compare');
  const [asset, setAsset] = useState(null); // null = 投資中心（卡片牆）
  const [allNews, setAllNews] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showAllYears, setShowAllYears] = useState(false);
  const [bids, setBids] = useState({});
  const s = game;

  // 用 ref 記住最新狀態，長按連續操作時才不會用到舊資料
  const latest = useRef(game);
  latest.current = game;
  const totals = useRef({ key: null, sum: 0 });

  // fn 可以是結果，也可以是 (最新狀態) => 結果；成功回傳 true
  const loan = E.loanInfo(s);
  const run = (fn, okMsg, tally) => {
    const result = typeof fn === 'function' ? fn(latest.current) : fn;
    if (result.error) {
      if (tally && totals.current.key === tally.key && totals.current.sum > 0) {
        setMsg({ text: `${tally.label}，累計 ${E.formatMoney(totals.current.sum)}（${result.error}，已停止）` });
      } else {
        setMsg({ text: result.error, bad: true });
      }
      return false;
    }
    latest.current = result.state;
    setGame(result.state);
    if (tally) {
      if (totals.current.key !== tally.key) totals.current = { key: tally.key, sum: 0 };
      totals.current.sum += tally.amount;
      setMsg({ text: `${tally.label}，累計 ${E.formatMoney(totals.current.sum)}` });
    } else {
      totals.current = { key: null, sum: 0 };
      setMsg(okMsg ? { text: okMsg } : null);
    }
    return true;
  };

  // 買賣金額：「全部」要看當下的現金／持有量
  const doTrade = (kind, key, name, v, l) => {
    const st = latest.current;
    const amt = v === Infinity ? (kind === 'buy' ? st.money : st[key]) : Math.min(v, kind === 'buy' ? st.money : st[key]);
    return run(
      (x) => (kind === 'buy' ? E.buyAsset(x, key, v) : E.sellAsset(x, key, v)),
      null,
      { key: `${kind}-${key}`, amount: Math.max(0, amt), label: `${kind === 'buy' ? '買進' : '賣出'}${name}${l === '全部' ? '（全部）' : ''}` },
    );
  };

  const locked = !E.canInvest(s);
  const hist = s.idxHistory;
  const mySeries = { key: 'my', label: '我的個股', color: C.gold, values: hist.map((h) => h.myStock ?? h.stock) };
  let chartSeries;
  if (chartKey === 'compare') {
    chartSeries = [
      { key: 'etf', label: '大盤（ETF）', color: C.green, values: hist.map((h) => h.etf) },
      { key: 'stock', label: '個股平均', color: C.blue, values: hist.map((h) => h.stock) },
      mySeries,
    ];
  } else {
    const meta = E.INDEX_META.find((m) => m.key === chartKey);
    chartSeries = [{ key: chartKey, label: meta.label, color: meta.color, values: hist.map((h) => h[chartKey]) }];
    if (chartKey === 'stock') chartSeries.push(mySeries);
  }
  const mainValues = chartKey === 'compare' ? chartSeries[0].values : chartSeries[0].values;
  const idxNow = mainValues[mainValues.length - 1];
  const idxPrev = mainValues.length > 1 ? mainValues[mainValues.length - 2] : 100;
  const myNow = mySeries.values[mySeries.values.length - 1];
  // 每年明細：新存檔有完整紀錄，舊存檔用歷史資料補
  const byAge = new Map((s.invYears || []).map((r) => [r.age, r]));
  const yearRows = [];
  for (let a = s.age; a >= 1; a -= 1) {
    const r = byAge.get(a);
    if (r) { yearRows.push(r); continue; }
    const h = hist[a];
    const h0 = hist[a - 1];
    if (!h || !h0) continue;
    const w = s.worldHistory.find((x) => x.age === a);
    const v = s.invHistory[a] ?? 0;
    const v0 = s.invHistory[a - 1] ?? 0;
    yearRows.push({ age: a, world: w ? w.title : '', crash: w && CRASH_IDS.includes(w.id), market: h.etf / h0.etf - 1, marketIdx: h.etf, value: v, gain: v - v0, mine: null });
  }
  const shownRows = showAllYears ? yearRows : yearRows.slice(0, 10);
  const crashAges = s.worldHistory.filter((w) => CRASH_IDS.includes(w.id)).map((w) => w.age);
  const invStart = E.INVEST_MIN_AGE;
  // 最後一點用現在的投資總額（剛買賣完也會馬上反映）
  const invValues = [...s.invHistory.slice(invStart, -1), E.investTotal(s)];
  // 股票、投資、房市和世界新聞（從「今年發生的事」搬過來的）
  const news = E.marketNews(s, 3);

  return (
    <Sheet visible={visible} onClose={() => { setMsg(null); onClose(); }} title="投資與資產" tall>
      <View style={styles.cashRow}>
        <Text style={styles.cashLabel}>可用現金</Text>
        <Text style={[styles.cash, s.money < 0 && { color: C.red }]}>{E.formatMoney(s.money)}</Text>
      </View>
      <View style={styles.tabs}>
        {TABS.map((t, i) => (
          <Text key={t} onPress={() => { setTab(i); setMsg(null); }} style={[styles.tab, tab === i && styles.tabOn]}>{t}</Text>
        ))}
      </View>

      {/* 固定高度的訊息列：避免訊息出現時畫面跳動，長按才不會中斷 */}
      <Text
        numberOfLines={2}
        style={[styles.msg, !msg && styles.msgEmpty, msg && msg.bad && { color: C.red, backgroundColor: C.redSoft }]}
      >
        {msg ? msg.text : '買賣後的結果會顯示在這裡'}
      </Text>

      {locked ? (
        <Card><Text style={styles.muted}>🔒 滿 {E.INVEST_MIN_AGE} 歲才能自己開戶投資、買房和貸款（還差 {E.INVEST_MIN_AGE - s.age} 年）。在那之前，零用錢和紅包會先存成現金；小時候選「學理財」可以先把投資眼光練起來。</Text></Card>
      ) : null}


      {tab === 0 && news.length ? (
        <Card style={{ marginTop: 8, paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.h}>📈 市場消息</Text>
            {news.length > 3 ? (
              <Text style={styles.link} onPress={() => setAllNews(!allNews)}>{allNews ? '收起 ▲' : `全部 ${news.length} 則 ▼`}</Text>
            ) : null}
          </View>
          {(allNews ? news : news.slice(0, 3)).map((l, i) => (
            <Text key={`${l.age}-${i}`} style={[styles.newsItem, { color: toneColor(l.tone) }]}>
              <Text style={styles.newsAge}>{l.age} 歲　</Text>{l.text.replace(/（(智力|健康|快樂|人緣)[+-]\d+[^）]*）/g, '')}
            </Text>
          ))}
        </Card>
      ) : null}

      {!locked && tab === 0 ? (
        <>
          {/* 投資中心：ETF 大卡＋四張小卡，點進去才看那一樣 */}
          {!asset ? (() => {
            const inv = E.investTotal(s);
            const last = yearRows.find((r) => r.gain != null || r.mine != null);
            const tile = (key, big) => {
              const a = E.ASSETS.find((x) => x.key === key);
              return (
                <InvestTile
                  key={key}
                  big={big}
                  img={`inv_${key}`}
                  name={key === 'etf' ? 'ETF' : key === 'crypto' ? '加密幣' : a.name}
                  risk={a.risk}
                  desc={INV_DESC[key]}
                  held={s[key]}
                  ret={s.lastReturns ? s.lastReturns[key] : null}
                  onPress={() => { setAsset(key); setMsg(null); }}
                />
              );
            };
            return (
              <>
                <View style={styles.sumBar}>
                  <View style={styles.sumItem}>
                    <Text style={styles.sumLabel}>投資總額</Text>
                    <Text style={styles.sumVal} numberOfLines={1} adjustsFontSizeToFit>{E.formatMoney(inv)}</Text>
                  </View>
                  <View style={styles.sumLine} />
                  <View style={styles.sumItem}>
                    <Text style={styles.sumLabel}>去年損益</Text>
                    <Text style={[styles.sumVal, last && last.gain != null && { color: last.gain >= 0 ? C.green : C.red }]} numberOfLines={1} adjustsFontSizeToFit>
                      {last && last.gain ? `${last.gain >= 0 ? '+' : ''}${E.formatMoney(last.gain)}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.sumLine} />
                  <View style={styles.sumItem}>
                    <Text style={styles.sumLabel}>累計賺賠</Text>
                    {(() => {
                      const ic = E.investCost(s);
                      if (!ic.net) return <Text style={styles.sumVal}>—</Text>;
                      return (
                        <>
                          <Text style={[styles.sumVal, { color: ic.gain >= 0 ? C.green : C.red }]} numberOfLines={1} adjustsFontSizeToFit>
                            {ic.gain >= 0 ? '+' : ''}{E.formatMoney(ic.gain)}
                          </Text>
                          {ic.pct != null ? <Text style={[styles.sumLabel, { color: ic.gain >= 0 ? C.green : C.red }]}>{pct(ic.pct)}</Text> : null}
                        </>
                      );
                    })()}
                  </View>
                  <View style={styles.sumLine} />
                  <View style={styles.sumItem}>
                    <Text style={styles.sumLabel}>去年報酬率</Text>
                    <Text style={[styles.sumVal, last && last.mine != null && { color: last.mine >= 0 ? C.green : C.red }]}>{last && last.mine != null ? pct(last.mine) : '—'}</Text>
                  </View>
                </View>
                {tile('etf', true)}
                <View style={styles.tileRow}>{tile('deposit')}{tile('stock')}</View>
                <View style={styles.tileRow}>{tile('gold')}{tile('crypto')}</View>
              </>
            );
          })() : null}

          {asset ? (() => {
            const a = E.ASSETS.find((x) => x.key === asset);
            const r = s.lastReturns ? s.lastReturns[a.key] : null;
            const meta = E.INDEX_META.find((m) => m.key === a.key);
            const series = a.key === 'stock'
              ? [{ key: 'etf', label: '大盤（ETF）', color: C.green, values: hist.map((h) => h.etf) }, { key: 'stock', label: '個股平均', color: C.blue, values: hist.map((h) => h.stock) }, mySeries]
              : meta ? [{ key: a.key, label: meta.label, color: meta.color, values: hist.map((h) => h[a.key]) }] : null;
            const vals = series ? series[0].values : [];
            const now = vals[vals.length - 1]; const prev = vals.length > 1 ? vals[vals.length - 2] : 100;
            return (
              <>
              <Pressable onPress={() => { setAsset(null); setMsg(null); }} hitSlop={8} style={styles.back}>
                <Text style={styles.backText}>‹ 回投資中心</Text>
              </Pressable>
              <Card>
                <View style={styles.assetTop}>
                  <View style={[styles.icon, { backgroundColor: ICON_BG[a.key] }]}>
                    <Text style={[styles.iconText, { color: ICON_FG[a.key] }]}>{a.short}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.h}>{a.name}　<Text style={styles.risk}>{'●'.repeat(a.risk)}<Text style={{ color: C.line }}>{'●'.repeat(5 - a.risk)}</Text></Text></Text>
                    <Text style={styles.muted}>{a.key === 'deposit' && s.world ? `今年利率 ${pct(s.world.returns.deposit)}` : a.desc}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.muted}>持有</Text>
                    <Text style={styles.val}>{E.formatMoney(s[a.key])}</Text>
                    {r != null && s[a.key] > 0 ? <Text style={[styles.small, { color: r >= 0 ? C.green : C.red }]}>去年 {pct(r)}</Text> : null}
                  </View>
                </View>

                {series ? (
                  <>
                    <LineChart
                      series={series}
                      height={140}
                      marks={crashAges}
                      format={(v) => String(Math.round(v))}
                      trades={E.tradesOf(s, a.key).map((t) => ({ age: t.age, amt: t.amt }))}
                      tradeFormat={(v) => E.formatMoney(v)}
                    />
                    <Text style={[styles.muted, { color: C.primaryInk }]}>👆 按住圖表可以看那一年的指數和漲跌．▲ 是你買進、▼ 是賣出</Text>
                    {a.key === 'crypto' ? (
                      <Text style={[styles.muted, { color: C.red, marginTop: 6 }]}>
                        ⚠️ 波動大會「來回磨損」：漲 50% 再跌 50% 剩下的是 75%，不是 100%。加密幣長期實際拿到的，通常比平均報酬看起來的少很多，不要全押。
                      </Text>
                    ) : null}
                    <Text style={styles.muted}>
                      {a.key === 'stock'
                        ? `大盤 ${Math.round(hist[hist.length - 1].etf)}．我的個股 ${Math.round(myNow)}${myNow >= hist[hist.length - 1].etf ? '，贏過大盤！' : '，輸給大盤。'}選股準不準看「投資眼光」。`
                        : `指數 ${Math.round(now)}（出生時 = 100），去年 ${pct(now / prev - 1)}．紅色直條 = 疫情、戰爭、金融海嘯`}
                    </Text>
                  </>
                ) : null}

                {(() => {
                  const cst = E.assetCost(s, a.key);
                  const list = E.tradesOf(s, a.key).slice().reverse();
                  if (!cst.in && !cst.out) return null;
                  return (
                    <View style={styles.costBox}>
                      <View style={styles.costRow}>
                        <View style={styles.costItem}>
                          <Text style={styles.costLabel}>投入本金</Text>
                          <Text style={styles.costVal} numberOfLines={1} adjustsFontSizeToFit>{E.formatMoney(cst.net)}</Text>
                        </View>
                        <View style={styles.costItem}>
                          <Text style={styles.costLabel}>現在價值</Text>
                          <Text style={styles.costVal} numberOfLines={1} adjustsFontSizeToFit>{E.formatMoney(cst.now)}</Text>
                        </View>
                        <View style={styles.costItem}>
                          <Text style={styles.costLabel}>賺賠</Text>
                          <Text style={[styles.costVal, { color: cst.gain >= 0 ? C.green : C.red }]} numberOfLines={1} adjustsFontSizeToFit>
                            {cst.gain >= 0 ? '+' : ''}{E.formatMoney(cst.gain)}
                          </Text>
                          {cst.pct != null ? (
                            <Text style={[styles.costPct, { color: cst.gain >= 0 ? C.green : C.red }]}>{pct(cst.pct)}</Text>
                          ) : null}
                        </View>
                      </View>
                      <Text style={styles.costNote}>投入本金 = 買進＋定期定額 − 賣出。賣掉的部分不算在裡面，所以這是「還放在裡面的錢」賺賠多少。</Text>

                      <Text style={[styles.h, { marginTop: 10 }]}>交易紀錄</Text>
                      {list.slice(0, showAll ? 999 : 6).map((t, i) => (
                        <View key={i} style={styles.tradeRow}>
                          <Text style={styles.tradeAge}>{t.age} 歲</Text>
                          <Text style={[styles.tradeKind, { color: t.amt > 0 ? C.green : C.red }]}>{TRADE_NAME[t.kind] || (t.amt > 0 ? '買進' : '賣出')}</Text>
                          <Text style={[styles.tradeAmt, { color: t.amt > 0 ? C.green : C.red }]}>{t.amt > 0 ? '+' : '−'}{E.formatMoney(Math.abs(t.amt))}</Text>
                        </View>
                      ))}
                      {list.length > 6 ? (
                        <Text onPress={() => setShowAll(!showAll)} style={styles.moreLink}>
                          {showAll ? '收合' : `看全部 ${list.length} 筆 ›`}
                        </Text>
                      ) : null}
                    </View>
                  );
                })()}

                <AmountSlider
                  key={a.key}
                  modes={[
                    { key: 'buy', label: '買進', max: s.money, verb: '買進', color: '#1fa971' },
                    { key: 'sell', label: '賣出', max: s[a.key], verb: '賣出', color: '#e0564b' },
                  ]}
                  disabledText="沒有可用的錢"
                  preview={(k, amt) => (k === 'buy' ? `買完剩現金 ${E.formatMoney(s.money - amt)}` : `賣完還持有 ${E.formatMoney(s[a.key] - amt)}`)}
                  onConfirm={(k, amt) => run(
                    (x) => (k === 'buy' ? E.buyAsset(x, a.key, amt) : E.sellAsset(x, a.key, amt)),
                    `${k === 'buy' ? '買進' : '賣出'}${a.name} ${E.formatMoney(amt)}`,
                  )}
                />

                {a.key === 'etf' ? (
                  <View style={styles.dcaBox}>
                    <Text style={styles.h}>定期定額</Text>
                    <Text style={styles.muted}>每年自動把{s.job ? '薪水' : s.studying || s.age < 18 ? '零用錢' : '收入'}的一部分買進 ETF，越早開始複利越大。</Text>
                    <View style={[styles.row, { marginTop: 8 }]}>
                      {DCA_OPTIONS.map((p) => (
                        <Chip key={p} label={`${p}%`} on={s.dca === p} onPress={() => setGame(E.setDca(s, p))} style={styles.dcaChip} plain />
                      ))}
                    </View>
                    {s.dca > 0 && s.lastYear && (s.lastYear.dca || 0) > 0 ? (
                      <Text style={[styles.muted, { marginTop: 6, color: C.green }]}>去年投入了 {E.formatMoney(s.lastYear.dca)}</Text>
                    ) : null}
                  </View>
                ) : null}
              </Card>
              </>
            );
          })() : null}

          {!asset ? (
          <>
          <Card>
            <View style={styles.between}>
              <Text style={styles.h}>大盤 vs 我的個股</Text>
              <Text style={styles.muted}>出生時 = 100</Text>
            </View>
            <LineChart
              series={[
                { key: 'etf', label: '大盤（ETF）', color: C.green, values: hist.map((h) => h.etf) },
                { key: 'stock', label: '個股平均', color: C.blue, values: hist.map((h) => h.stock) },
                mySeries,
              ]}
              height={150}
              marks={crashAges}
              format={(v) => String(Math.round(v))}
            />
            <Text style={[styles.muted, { color: C.primaryInk }]}>👆 按住圖表可以看那一年的數字，左右滑動換年份</Text>
            {s.world ? <Text style={styles.muted}>今年：{s.world.title}．通膨 {pct(s.inflation)}．物價是出生時的 {s.priceIndex.toFixed(2)} 倍</Text> : null}
          </Card>
          <Text style={[styles.muted, { marginTop: 10 }]}>
            點上面任一張卡就能單獨看、單獨買賣那一樣。🔒 遊戲不會自己賣掉你的資產，現金變負的會先算成負債（有利息）。
          </Text>
          {yearRows.length ? (
            <Card>
              <Text style={styles.h}>每年明細：大盤 vs 我的投資</Text>
              <Text style={styles.muted}>大盤指數出生時 = 100；「我的報酬」是當年投資的漲跌（不含新買進的錢）。</Text>
              <View style={[styles.tr, styles.thead]}>
                <Text style={[styles.th, styles.cAge]}>年齡／大事</Text>
                <Text style={[styles.th, styles.cNum, { textAlign: 'right' }]}>大盤</Text>
                <Text style={[styles.th, styles.cNum, { textAlign: 'right' }]}>我的投資</Text>
                <Text style={[styles.th, styles.cPct]}>報酬</Text>
              </View>
              {shownRows.map((r) => (
                <View key={r.age} style={styles.tr}>
                  <View style={styles.cAge}>
                    <Text style={styles.td}>{r.age} 歲</Text>
                    <Text style={[styles.tdSmall, r.crash && { color: C.red }]} numberOfLines={1}>{r.world}</Text>
                  </View>
                  <View style={styles.cNum}>
                    <Text style={styles.tdNum}>{Math.round(r.marketIdx)}</Text>
                    <Text style={[styles.tdSmallNum, { color: r.market >= 0 ? C.green : C.red }]}>{pct(r.market)}</Text>
                  </View>
                  <View style={styles.cNum}>
                    <Text style={styles.tdNum}>{r.value ? E.formatMoney(r.value) : '0'}</Text>
                    {r.gain ? (
                      <Text style={[styles.tdSmallNum, { color: r.gain >= 0 ? C.green : C.red }]}>{r.gain >= 0 ? '+' : ''}{E.formatMoney(r.gain)}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.tdNum, styles.cPct, { color: r.mine == null ? C.muted : r.mine >= 0 ? C.green : C.red }]}>
                    {r.mine == null ? '—' : pct(r.mine)}
                  </Text>
                </View>
              ))}
              {yearRows.length > 10 ? (
                <Button
                  small
                  kind="ghost"
                  style={{ marginTop: 8 }}
                  title={showAllYears ? '收起來' : `顯示全部 ${yearRows.length} 年`}
                  onPress={() => setShowAllYears(!showAllYears)}
                />
              ) : null}
            </Card>
          ) : null}

          {invValues.length > 1 && Math.max(...invValues) > 0 ? (
            <Card>
              <Text style={styles.h}>我的投資總額</Text>
              <LineChart
                series={[{ key: 'inv', label: '投資總額', color: C.green, values: invValues }]}
                xStart={invStart}
                height={130}
                marks={crashAges}
                format={shortMoney}
                tipFormat={(v) => E.formatMoney(v)}
              />
              <Text style={[styles.muted, { color: C.primaryInk }]}>👆 按住圖表可以看那一年投資總共值多少</Text>
            </Card>
          ) : null}
          </>
          ) : null}
        </>
      ) : null}

      {!locked && tab === 1 ? (
        <>
          <Text style={[styles.muted, { marginTop: 10 }]}>付 {E.DOWN_PAYMENT * 100}% 頭期款就能買，剩下的每年繳房貸。第一間自己住（省房租），第二間起可以收租金。房價會跟著房市和通膨變動。</Text>
          <Card>
            <Text style={styles.h}>房價走勢</Text>
            <LineChart
              series={[{ key: 'house', label: '房價', color: C.red, values: s.idxHistory.map((h) => h.house) }]}
              height={120}
              marks={crashAges}
            />
            <Text style={[styles.muted, { color: C.primaryInk }]}>👆 按住圖表可以看那一年的房價指數和漲跌</Text>
          </Card>
          {s.houses.length ? (
            <Card>
              <Text style={styles.h}>我的房子</Text>
              {s.houses.map((h, i) => {
                const d = s.debts.find((x) => x.houseUid === h.uid);
                const gain = h.value / h.price - 1;
                return (
                  <View key={h.uid} style={styles.line}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.body}>{h.name}{i === 0 ? '（自住）' : '（出租中）'}</Text>
                      <Text style={styles.muted}>
                        市值 {E.formatMoney(h.value)}（<Text style={{ color: gain >= 0 ? C.green : C.red }}>{pct(gain)}</Text>）{d ? `．房貸剩 ${E.formatMoney(d.balance)}` : '．已繳清'}
                      </Text>
                    </View>
                    <Button small kind="ghost" title="賣掉" onPress={() => run(E.sellHouse(s, h.uid), `賣掉${h.name}`)} />
                  </View>
                );
              })}
            </Card>
          ) : null}
          <Card>
            <Text style={styles.h}>買房（現在的房價）</Text>
            {E.HOUSES.map((h) => {
              const price = E.housePrice(s, h);
              return (
                <View key={h.id} style={styles.line}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.body}>{h.name}</Text>
                    <Text style={styles.muted}>總價 {E.formatMoney(price)}．頭期款 {E.formatMoney(price * E.DOWN_PAYMENT)}</Text>
                  </View>
                  <Button small kind="green" title="買下" onPress={() => run(E.buyHouse(s, h.id), `買下${h.name}！`)} />
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      {!locked && tab === 2 ? (
        <>
          <Text style={[styles.muted, { marginTop: 10 }]}>
            自己開的公司最多 {E.MAX_BIZ} 家（目前 {s.bizs.filter((b) => !b.group).length} 家）；收購來的不算在內。集團現在共 {s.bizs.length} 家。
          </Text>
          {s.bizs.map((b) => {
            const L = E.bizLevel(b, s);
            return (
            <Card key={b.uid}>
              <View style={styles.between}>
                <Text style={styles.h}>{b.name}{b.group ? ' 🏷' : ''}</Text>
                <Text style={styles.muted}>{E.BUSINESSES[b.type].name}{b.group ? '．收購' : ''}</Text>
              </View>
              {!b.group ? (
                <View style={styles.lvRow}>
                  <View style={[styles.lvPill, L.lv >= 5 && styles.lvMax]}>
                    <Text style={[styles.lvText, L.lv >= 5 && { color: '#3a2600' }]}>Lv{L.lv} {L.name}{L.lv >= 5 ? (L.byRoute ? '（逆襲完成・滿級）' : '（滿級）') : ''}</Text>
                  </View>
                  <View style={styles.lvDots}>
                    {E.BIZ_LEVELS.map((x) => <View key={x.lv} style={[styles.lvDot, x.lv <= L.lv && styles.lvDotOn]} />)}
                  </View>
                </View>
              ) : null}
              <Text style={[styles.big, { marginTop: 4 }]}>{E.formatMoney(b.value)}</Text>
              <Text style={styles.muted}>
                已經營 {b.years} 年．去年成長 <Text style={{ color: b.lastR >= 0 ? C.green : C.red }}>{pct(b.lastR)}</Text>．投入本金 {E.formatMoney(b.capital)}
              </Text>
              {!b.group && L.next ? (
                <Text style={[styles.muted, { marginTop: 4 }]}>
                  升到 Lv{L.next.lv}：公司價值達本金 {L.next.mult} 倍（現在 {L.mult.toFixed(1)} 倍）、經營滿 {L.next.years} 年（現在 {b.years} 年）
                </Text>
              ) : null}
              <AmountSlider
                modes={[{ key: 'add', label: '追加', max: s.money, verb: '追加投資', color: '#1fa971' }]}
                disabledText="沒有現金可以追加"
                preview={(k, amt) => {
                  const after = E.bizLevel({ ...b, value: b.value + amt, capital: b.capital + amt }, s);
                  return after.lv < L.lv && !b.group
                    ? `⚠️ 本金變多，倍數會降到 ${after.mult.toFixed(1)} 倍（掉到 Lv${after.lv}）`
                    : `投入後剩現金 ${E.formatMoney(s.money - amt)}`;
                }}
                onConfirm={(k, amt) => run((x) => E.investBiz(x, b.uid, amt), `追加投資「${b.name}」${E.formatMoney(amt)}`)}
              />
              <Button small kind="ghost" title="整間賣掉" style={{ marginTop: 8 }} onPress={() => run(E.sellBiz(s, b.uid), `「${b.name}」已賣出`)} />
            </Card>
            );
          })}
          {s.bizs.filter((b) => !b.group).length < E.MAX_BIZ ? (
            <Card>
              <Text style={styles.body}>
                {s.bizs.filter((b) => !b.group).length
                  ? (E.canOpenSecondBiz(s) ? '第一家公司已經是產業龍頭，可以開第二家了！' : '第一家公司升到 Lv5「產業龍頭」，才能開第二家。')
                  : '你還沒有自己的公司。'}
              </Text>
              <Text style={[styles.muted, { marginTop: 4 }]}>方法一：年度重點選「創業」（需要 50 萬現金）。{'\n'}方法二：認真工作，等職業的逆襲路線出現開店機會。</Text>
            </Card>
          ) : null}
        </>
      ) : null}

      {tab === 3 ? (
        !E.canAcquire(s) ? (
          <Card>
            <Text style={styles.h}>🏷 收購公司</Text>
            <Text style={[styles.muted, { marginTop: 6 }]}>
              等你的淨資產突破一個億，就會有人排隊想把公司賣給你。到時候這裡每年都會有幾家待售公司，買下來的公司直接併進你的集團，不占「自己開的兩家」名額（集團最多 {E.MAX_GROUP} 家）。
            </Text>
          </Card>
        ) : (
          <>
            <Text style={[styles.muted, { marginTop: 10 }]}>
              收購來的公司會併進集團（目前 {s.bizs.length} / {E.MAX_GROUP} 家），一樣會每年成長、配息，也會受世界大事影響。名單每年換一批。
            </Text>
            {(s.targets || []).length ? (s.targets || []).map((d) => {
              const okReq = E.meetsReq(s, d);
              const syn = E.synergy(s, d.type);
              const full = s.bizs.length >= E.MAX_GROUP;
              const bid = bids[d.id] || 0;
              const price = Math.round(d.price * (1 + bid));
              const loanCash = Math.round(price * 0.4);
              const toneBg = d.tone === 'good' ? C.greenSoft : d.tone === 'warn' ? C.goldSoft : C.card;
              return (
                <Card key={d.id} style={{ backgroundColor: toneBg }}>
                  <View style={styles.between}>
                    <Tag
                      text={d.kindLabel}
                      color={d.tone === 'good' ? C.green : d.tone === 'warn' ? C.goldInk : C.primaryInk}
                      bg={C.card}
                    />
                    <Text style={styles.muted}>{d.typeName}</Text>
                  </View>
                  <Text style={[styles.h, { marginTop: 6 }]}>{d.name}</Text>
                  <Text style={[styles.big, { marginTop: 2 }]}>{E.formatMoney(price)}</Text>
                  <Text style={styles.muted}>
                    公司價值 {E.formatMoney(d.value)}．
                    <Text style={{ color: d.premium > 0 ? C.red : C.green, fontWeight: '700' }}>
                      {d.premium > 0 ? `溢價 ${d.premium}%` : `折價 ${-d.premium}%`}
                    </Text>
                    {d.roll ? '．實際價值接手後才知道' : ''}
                  </Text>
                  <Text style={styles.muted}>
                    年成長約 {((E.BUSINESSES[d.type].mean + d.bonus + syn) * 100).toFixed(1)}%．波動 {((E.BUSINESSES[d.type].sd + (d.sdBump || 0) - (d.sdCut || 0)) * 100).toFixed(0)}%
                    {syn > 0 ? `（含同產業綜效 +${(syn * 100).toFixed(1)}%）` : ''}
                  </Text>
                  <Text style={[styles.muted, { marginTop: 4 }]}>{d.note}</Text>
                  {d.reqText ? (
                    <Text style={[styles.muted, { color: okReq ? C.green : C.red, fontWeight: '700' }]}>
                      {okReq ? '✓ ' : '✗ '}{d.reqText}
                    </Text>
                  ) : null}

                  {d.auction ? (
                    <View style={[styles.row, { marginTop: 8 }]}>
                      {E.AUCTION_BIDS.map((b) => (
                        <Chip
                          key={b.id}
                          label={b.label}
                          sub={`${Math.round(b.win * 100)}% 標到`}
                          on={Math.abs(bid - b.add) < 0.001}
                          onPress={() => setBids({ ...bids, [d.id]: b.add })}
                          style={{ flexBasis: '30%', paddingVertical: 6 }}
                          plain
                        />
                      ))}
                    </View>
                  ) : null}

                  <View style={[styles.row, { marginTop: 8 }]}>
                    <Button
                      small
                      kind={price <= s.money && okReq && !full ? 'green' : 'ghost'}
                      title={price <= s.money ? '現金買下' : '現金不夠'}
                      style={{ flex: 1 }}
                      disabled={price > s.money || !okReq || full}
                      onPress={() => run(E.acquire(s, d.id, { bid }), `收購「${d.name}」！`)}
                    />
                    <Button
                      small
                      kind={loanCash <= s.money && okReq && !full ? 'ghost' : 'ghost'}
                      title="貸款六成"
                      sub={`自備 ${E.formatMoney(loanCash)}`}
                      style={{ flex: 1 }}
                      disabled={loanCash > s.money || !okReq || full}
                      onPress={() => run(E.acquire(s, d.id, { bid, loan: 0.6 }), `貸款收購「${d.name}」！`)}
                    />
                  </View>
                </Card>
              );
            }) : (

              <Card><Text style={styles.body}>今年沒有合適的標的，明年再看看。</Text></Card>
            )}
          </>
        )
      ) : null}

      {!locked && tab === 4 && s.money < 0 ? (
        <Card style={{ backgroundColor: C.redSoft }}>
          <Text style={[styles.body, { color: C.red }]}>⚠️ 現金透支 {E.formatMoney(-s.money)}</Text>
          <Text style={styles.muted}>入不敷出的部分先記成透支，每年滾利息。按下面一鍵賣投資補回來，或是到「金融」分頁自己選要賣什麼。</Text>
          <Button
            kind="red"
            title="賣投資，把透支還清"
            sub={`會賣掉約 ${E.formatMoney(Math.min(-s.money, E.investTotal(s)))} 的投資`}
            style={{ marginTop: 10 }}
            disabled={E.investTotal(s) <= 0}
            onPress={() => run((x) => E.clearOverdraft(x), '透支還清了')}
          />
        </Card>
      ) : null}
      {!locked && tab === 4 ? (
        <Card style={{ backgroundColor: C.blueSoft }}>
          <Text style={styles.body}>🏦 信用貸款</Text>
          {loan.why ? (
            <Text style={styles.muted}>{loan.why}</Text>
          ) : (
            <Text style={styles.muted}>
              還可以借 {E.formatMoney(loan.limit)}．利率 {(loan.rate * 100).toFixed(0)}%．分 {loan.years} 年還{loan.owed ? `．已借 ${E.formatMoney(loan.owed)}` : ''}
              {'\n'}額度看收入和資產：薪水越高、存款、投資和房子越多，能借越多。錢會直接進現金，每年自動扣還款。
            </Text>
          )}
          <AmountSlider
            modes={[{ key: 'borrow', label: '借款', max: loan.limit, verb: '借', color: C.primary }]}
            disabledText="目前借不到錢"
            onConfirm={(k, amt) => run((x) => E.borrow(x, amt), `借了信用貸款 ${E.formatMoney(amt)}`)}
          />
        </Card>
      ) : null}
      {!locked && tab === 4 ? (
        s.debts.length ? (
          <Card>
            {s.debts.map((d) => (
              <View key={d.uid} style={[styles.asset, { paddingVertical: 8 }]}>
                <Text style={styles.body}>{d.name}</Text>
                <Text style={styles.muted}>剩 {E.formatMoney(d.balance)}．每年繳 {E.formatMoney(d.payment)}．利率 {(d.rate * 100).toFixed(1)}%</Text>
                <AmountSlider
                  modes={[{ key: 'repay', label: '還款', max: Math.min(Math.max(0, s.money), d.balance), verb: '提前還', color: C.primary }]}
                  disabledText="沒有現金可以還"
                  preview={(k, amt) => `還完剩 ${E.formatMoney(d.balance - amt)}`}
                  onConfirm={(k, amt) => run((x) => E.repayDebt(x, d.uid, amt), `提前還款「${d.name}」${E.formatMoney(amt)}`)}
                />
              </View>
            ))}
          </Card>
        ) : (
          <Card><Text style={styles.body}>目前沒有任何貸款。</Text></Card>
        )
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sumBar: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 10, paddingVertical: 12, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardLine },
  sumItem: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  sumLine: { width: 1, height: 30, backgroundColor: C.line },
  sumLabel: { fontSize: 12, color: C.muted },
  sumVal: { fontSize: 16.5, fontWeight: '800', color: C.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
  tile: { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, backgroundColor: '#1a2150' },
  tileBig: { width: '100%', aspectRatio: 1296 / 724 },
  tileSmall: { flex: 1, aspectRatio: 528 / 668 },
  tileRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  tileBody: { flex: 1, padding: 14 },
  tileName: { fontSize: 24, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  riskPill: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, marginTop: 6, backgroundColor: 'rgba(10,14,45,0.55)' },
  riskText: { fontSize: 12.5, fontWeight: '800' },
  tileDesc: { fontSize: 13.5, color: 'rgba(255,255,255,0.9)', marginTop: 8, lineHeight: 20 },
  tileHeld: { fontSize: 12.5, color: '#fff', fontWeight: '700', marginTop: 8, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4 },
  tileGo: { position: 'absolute', right: 10, bottom: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(10,14,45,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  tileGoText: { color: '#fff', fontSize: 18, lineHeight: 20, marginTop: -2 },
  back: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.primarySoft, borderWidth: 1, borderColor: '#9d8cff' },
  backText: { color: C.ink, fontWeight: '700', fontSize: 14 },
  pickRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  pick: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardLine },
  pickOn: { backgroundColor: C.primarySoft, borderColor: '#9d8cff' },
  pickIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  pickIconText: { fontSize: 12, fontWeight: '800' },
  pickName: { fontSize: 11.5, fontWeight: '700', color: C.muted, marginTop: 4 },
  pickVal: { fontSize: 10.5, color: C.muted, marginTop: 1, fontVariant: ['tabular-nums'] },
  dcaBox: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line },
  lvRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  lvPill: { backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#9d8cff' },
  lvMax: { backgroundColor: '#ffd76a', borderColor: '#ffe9a3' },
  lvText: { fontSize: 12.5, fontWeight: '800', color: C.ink },
  lvDots: { flexDirection: 'row', gap: 4 },
  lvDot: { width: 14, height: 6, borderRadius: 3, backgroundColor: C.page },
  lvDotOn: { backgroundColor: '#ffd76a' },
  cashRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cashLabel: { fontSize: 13, color: C.muted },
  cash: { fontSize: 22, fontWeight: '600', color: C.ink },
  link: { color: C.primaryInk, fontSize: 12.5, fontWeight: '600' },
  newsItem: { fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  newsAge: { color: C.muted, fontSize: 11.5 },
  costBox: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: C.page, borderWidth: 1, borderColor: C.cardLine },
  costRow: { flexDirection: 'row', gap: 8 },
  costItem: { flex: 1, alignItems: 'center' },
  costLabel: { fontSize: 11, color: C.muted },
  costVal: { fontSize: 15.5, fontWeight: '800', color: C.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
  costPct: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  costNote: { fontSize: 10.5, color: C.muted, marginTop: 8, lineHeight: 15 },
  tradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.line },
  tradeAge: { fontSize: 12.5, color: C.muted, width: 46, fontVariant: ['tabular-nums'] },
  tradeKind: { fontSize: 12.5, fontWeight: '700', flex: 1 },
  tradeAmt: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  moreLink: { marginTop: 7, fontSize: 12, color: C.primaryInk, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: C.page, borderRadius: 14, padding: 4, marginTop: 8 },
  tab: { flex: 1, textAlign: 'center', paddingVertical: 8, fontSize: 14, color: C.muted, fontWeight: '700', borderRadius: 12, overflow: 'hidden' },
  tabOn: { backgroundColor: C.card, fontWeight: '600', color: C.primaryInk },
  msg: { marginTop: 10, paddingHorizontal: 8, paddingVertical: 6, height: 46, borderRadius: 10, backgroundColor: C.greenSoft, color: C.green, fontSize: 13, lineHeight: 17, overflow: 'hidden' },
  msgEmpty: { backgroundColor: C.page, color: C.muted },
  label: { fontSize: 12.5, color: C.muted, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line, gap: 4 },
  thead: { marginTop: 8, borderBottomColor: C.ink },
  th: { fontSize: 11.5, fontWeight: '700', color: C.muted },
  cAge: { flex: 1.3 },
  cNum: { flex: 1, alignItems: 'flex-end' },
  cPct: { flex: 0.8, textAlign: 'right' },
  td: { fontSize: 13, color: C.ink, fontWeight: '600' },
  tdSmall: { fontSize: 10.5, color: C.muted },
  tdNum: { fontSize: 13, color: C.ink, fontVariant: ['tabular-nums'], textAlign: 'right' },
  tdSmallNum: { fontSize: 10.5, fontVariant: ['tabular-nums'], textAlign: 'right' },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  quickLabel: { width: 32, fontSize: 12.5, fontWeight: '700', color: C.muted },
  quickBtn: { flex: 1, paddingHorizontal: 2 },
  dcaChip: { flexBasis: '14%', paddingVertical: 6 },
  idxChip: { flexBasis: '30%', paddingVertical: 5 },
  h: { fontSize: 15, fontWeight: '700', color: C.ink },
  body: { fontSize: 14.5, color: C.ink },
  muted: { fontSize: 12.5, color: C.muted, lineHeight: 18 },
  small: { fontSize: 11.5 },
  big: { fontSize: 26, fontWeight: '600', color: C.ink },
  val: { fontSize: 14, fontWeight: '700', color: C.ink },
  risk: { fontSize: 9, color: C.red, letterSpacing: 1 },
  asset: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  assetTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontWeight: '600', fontSize: 13 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
});
