import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import StartScreen from './src/ui/StartScreen';
import StudioIntro from './src/ui/StudioIntro';
import CreateScreen from './src/ui/CreateScreen';
import { setPageBase } from './src/ui/pageBg';
import GameScreen from './src/ui/GameScreen';
import EndScreen from './src/ui/EndScreen';
import { C } from './src/ui/theme';
import * as E from './src/game/engine';
import { dailyGame, dailyResult, todayKey, dayShift } from './src/game/daily';
import { loadDaily, saveDaily, submitDaily, flushPending } from './src/leaderboard';
import { clearDailySave, loadDailySave, writeDailySave, loadBadges, writeBadges } from './src/storage';
import { newBadges } from './src/game/badges';
import BadgeToast from './src/ui/BadgeToast';
import { clearSave, loadBest, loadBoard, loadLegendBook, loadMeta, loadSave, writeBest, writeBoard, writeLegendBook, writeMeta, writeSave } from './src/storage';

export default function App() {
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState(true); // 開場片頭，約 5 秒或點一下跳過
  const [screen, setScreen] = useState('start');
  const [game, setGameState] = useState(null);     // 主線人生
  const [dgame, setDGameState] = useState(null);   // 每日挑戰那一局（另一格存檔）
  const [mode, setMode] = useState('main');        // 現在畫面上玩的是哪一局
  const [homeTab, setHomeTab] = useState('home');  // 首頁停在「人生」還是「挑戰」分頁
  const [best, setBest] = useState(null);
  const [board, setBoard] = useState([]);
  const [book, setBook] = useState({});
  const [meta, setMetaState] = useState(E.emptyMeta());
  const setMeta = useCallback((m) => { setMetaState(m); writeMeta(m); }, []);
  // 每日挑戰：這台裝置的代號、暱稱、每天的成績（跨存檔保留）
  const [daily, setDailyState] = useState(null);
  const dailyRef = useRef(null);
  const setDaily = useCallback((d) => { dailyRef.current = d; setDailyState({ ...d, runs: { ...d.runs } }); saveDaily(d); }, []);
  // 成就徽章（跨存檔永久）＋解鎖通知的佇列
  const [badges, setBadges] = useState({ got: {}, memes: [] });
  const [toasts, setToasts] = useState([]);
  const badgesRef = useRef(null);
  const metaRef = useRef(meta);
  const bookRef = useRef(book);
  useEffect(() => { metaRef.current = meta; }, [meta]);
  useEffect(() => { bookRef.current = book; }, [book]);
  // 看這一局（加上跨存檔的資料）有沒有新拿到的徽章；silent＝剛打開 App 補發，不跳通知
  const checkBadges = useCallback((s, silent = false) => {
    const b = badgesRef.current;
    if (!b || !s) return;
    const mset = new Set(b.memes || []);
    let memeNew = false;
    for (const id of Object.keys(s.seen || {})) if (id.startsWith('mm_') && !mset.has(id)) { mset.add(id); memeNew = true; }
    const ctx = { book: bookRef.current, meta: metaRef.current, daily: dailyRef.current, memes: mset.size };
    const fresh = newBadges(s, b.got, ctx);
    if (!fresh.length && !memeNew) return;
    const got = { ...b.got };
    for (const x of fresh) got[x.id] = { at: Date.now(), name: s.name, age: s.age, life: s.lifeNo || null };
    const next = { got, memes: [...mset] };
    badgesRef.current = next;
    setBadges(next);
    writeBadges(next);
    if (fresh.length && !silent) setToasts((q) => [...q, ...fresh]);
  }, []);

  useEffect(() => {
    (async () => {
      const [s, b, lb, m, bd, ds] = await Promise.all([loadSave(), loadBest(), loadLegendBook(), loadMeta(), loadBoard(), loadDailySave()]);
      // 舊版把挑戰存在主線那一格：搬過去
      if (s && s.version === E.SAVE_VERSION && s.daily) { if (!ds) { setDGameState(s); writeDailySave(s); } clearSave(); }
      else if (s && s.version === E.SAVE_VERSION) setGameState(s);
      // 挑戰只留今天和昨天的（昨天的還能補交），更早的就清掉
      if (ds && ds.version === E.SAVE_VERSION && ds.daily && ds.daily.day >= dayShift(todayKey(), -1)) setDGameState(ds);
      else if (ds) clearDailySave();
      setBest(b);
      if (Array.isArray(bd)) setBoard(bd);
      setBook(lb || {});
      if (m) setMetaState(E.normalizeMeta(m));
      else {
        // 第一次升到這一版：把舊存檔裡累積的點數轉成傳承點數，不讓玩家吃虧
        const carry = s && s.points > 0 ? s.points : 0;
        const first = { ...E.emptyMeta(), points: carry, earned: carry };
        setMetaState(first);
        writeMeta(first);
      }
      // 成就：讀回來，順便用現有的存檔補發（不跳通知）
      const bg = (await loadBadges()) || { got: {}, memes: [] };
      badgesRef.current = { got: bg.got || {}, memes: bg.memes || [] };
      setBadges(badgesRef.current);
      metaRef.current = m ? E.normalizeMeta(m) : metaRef.current;
      bookRef.current = lb || {};
      setReady(true);
      // 每日挑戰：讀回來，上次沒網路沒交出去的成績補交
      const d = await loadDaily();
      dailyRef.current = d; setDailyState({ ...d });
      saveDaily(d);
      const d2 = await flushPending(d);
      dailyRef.current = d2; setDailyState({ ...d2, runs: { ...d2.runs } });
      if (s && s.version === E.SAVE_VERSION) checkBadges(s, true);
      if (ds && ds.version === E.SAVE_VERSION) checkBadges(ds, true);
    })();
  }, []);

  // 排名賽那一局結束：成績先記在手機，再交給排行榜（交不出去就等下次打開補交）
  const sendDaily = useCallback(async (s) => {
    const d = dailyRef.current;
    if (!d || !s.daily || !s.daily.ranked) return;
    const run = d.runs[s.daily.day] || (d.runs[s.daily.day] = { started: true });
    if (run.payload) return;
    run.payload = dailyResult(s);
    run.nick = s.name;
    setDaily(d);
    try {
      const r = await submitDaily(d.device, s.name, run.payload);
      run.sent = true; run.result = { rank: r.rank, total: r.total };
    } catch { run.sent = false; }
    setDaily(d);
    checkBadges(s);   // 每日挑戰的名次出來了，看看有沒有拿到挑戰的徽章
  }, [setDaily, checkBadges]);

  useEffect(() => { setPageBase(screen === 'start' || screen === 'create' ? '#0f1636' : C.bg); }, [screen]);

  const recordBest = useCallback((s) => {
    const sum = E.summary(s);
    setBest((prev) => {
      if (prev && prev.nw >= sum.nw) return prev;
      const next = { name: s.name, nw: sum.nw, title: sum.title, achievedAge: sum.achievedAge };
      writeBest(next);
      return next;
    });
    // 排行榜：每一輩子都記一筆
    const entry = {
      id: s.bornAt || Date.now(), name: s.name, gender: s.gender || 'male', diff: s.difficulty || 'normal',
      nw: sum.nw, title: sum.title, age: s.ended ? s.ended.age : s.age, reason: s.ended ? s.ended.reason : 'age',
      achievedAge: sum.achievedAge, date: Date.now(),
    };
    setBoard((prev) => {
      if (prev.some((x) => x.id === entry.id)) return prev;
      const next = [...prev, entry].sort((a, b) => b.nw - a.nw).slice(0, 50);
      writeBoard(next);
      return next;
    });
  }, []);

  const setGame = useCallback((s0) => {
    let s = s0;
    if (s.ended && !s.metaAwarded) {
      const score = E.lifeScore(s);
      s = { ...s, metaAwarded: true, metaScore: score };
      setMetaState((prev) => {
        const m = E.normalizeMeta(prev);
        const next = { ...m, points: m.points + score.total, earned: m.earned + score.total, lives: m.lives + 1 };
        writeMeta(next);
        return next;
      });
    }
    if (s.daily) { setDGameState(s); writeDailySave(s); } else { setGameState(s); writeSave(s); }
    checkBadges(s);
    // 傳說職業：永久記在圖鑑裡
    if ((s.legends || []).length) {
      setBook((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of s.legends) {
          if (!next[id]) { next[id] = { age: s.age, name: s.name }; changed = true; }
        }
        if (changed) writeLegendBook(next);
        return changed ? next : prev;
      });
    }
    if (s.ended) {
      recordBest(s);
      sendDaily(s);
      setScreen('end');
    }
  }, [recordBest, sendDaily, checkBadges]);
  // 玩完一輩子，輪迴次數 +1 之後再檢查一次（「輪迴十世」這種）
  useEffect(() => { if (ready) checkBadges(mode === 'daily' ? dgame : game); }, [meta.lives]);

  const startNew = (name, difficulty = 'normal', gender = 'male') => {
    setGame({ ...E.newGame(name, undefined, difficulty, gender, meta), lifeNo: (meta.lives || 0) + 1 });
    setMode('main');
    setScreen('game');
  };

  // 每日挑戰：今天第一次開始的那一局是排名賽，之後（包含中途重來）都算練習
  const startDaily = (name, gender = 'male') => {
    const d = dailyRef.current || { device: '', nick: '', runs: {} };
    const day = todayKey();
    const ranked = !d.runs[day];
    if (ranked) d.runs[day] = { started: true, nick: name };
    d.nick = name;
    setDaily(d);
    setGame({ ...dailyGame(name, gender, day, ranked), lifeNo: (meta.lives || 0) + 1 });
    setMode('daily');
    setScreen('game');
  };
  const again = (g) => (g.daily ? startDaily(g.name, g.gender || 'male') : startNew(g.name, g.difficulty || 'normal', g.gender || 'male'));

  const goHome = () => { setHomeTab(mode === 'daily' ? 'challenge' : 'home'); setScreen('start'); };
  const cur = mode === 'daily' ? dgame : game;

  let content;
  if (!ready) {
    content = <View style={styles.center}><ActivityIndicator color={C.red} /></View>;
  } else if (screen === 'game' && cur && !cur.ended) {
    content = (
      <GameScreen
        game={cur}
        setGame={setGame}
        onHome={goHome}
        onRestart={() => { if (cur.daily) clearDailySave(); else clearSave(); again(cur); }}
      />
    );
  } else if (screen === 'end' && cur && cur.ended) {
    content = <EndScreen game={cur} meta={meta} daily={daily} onAgain={() => again(cur)} onHome={goHome} />;
  } else if (screen === 'create') {
    content = <CreateScreen meta={meta} onBack={goHome} onStart={startNew} />;
  } else {
    content = (
      <StartScreen
        save={game}
        best={best}
        board={board}
        book={book}
        meta={meta}
        onBuyMeta={(key) => { const r = E.buyMeta(meta, key); if (!r.error) setMeta(r.meta); return r; }}
        onNew={startNew}
        daily={daily}
        dsave={dgame}
        onDaily={startDaily}
        onDailyContinue={() => { setMode('daily'); setScreen(dgame && dgame.ended ? 'end' : 'game'); }}
        badges={badges}
        tab={homeTab}
        onTab={setHomeTab}
        onContinue={() => { setMode('main'); setScreen('game'); }}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <SafeAreaView style={[styles.root, (screen === 'start' || screen === 'create') && { backgroundColor: '#0f1636' }]} edges={['top', 'left', 'right']}>
          <StatusBar style="light" />
          {content}
        </SafeAreaView>
        <BadgeToast queue={toasts} onDone={() => setToasts((q) => q.slice(1))} />
        {intro ? <StudioIntro onDone={() => setIntro(false)} /> : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
