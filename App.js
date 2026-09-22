import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import StartScreen from './src/ui/StartScreen';
import CreateScreen from './src/ui/CreateScreen';
import { setPageBase } from './src/ui/pageBg';
import GameScreen from './src/ui/GameScreen';
import EndScreen from './src/ui/EndScreen';
import { C } from './src/ui/theme';
import * as E from './src/game/engine';
import { clearSave, loadBest, loadBoard, loadLegendBook, loadMeta, loadSave, writeBest, writeBoard, writeLegendBook, writeMeta, writeSave } from './src/storage';

export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState('start');
  const [game, setGameState] = useState(null);
  const [best, setBest] = useState(null);
  const [board, setBoard] = useState([]);
  const [book, setBook] = useState({});
  const [meta, setMetaState] = useState(E.emptyMeta());
  const setMeta = useCallback((m) => { setMetaState(m); writeMeta(m); }, []);

  useEffect(() => {
    (async () => {
      const [s, b, lb, m, bd] = await Promise.all([loadSave(), loadBest(), loadLegendBook(), loadMeta(), loadBoard()]);
      if (s && s.version === E.SAVE_VERSION) setGameState(s);
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
      setReady(true);
    })();
  }, []);

  useEffect(() => { setPageBase(screen === 'start' || screen === 'create' ? '#0f1636' : '#121840'); }, [screen]);

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
    setGameState(s);
    writeSave(s);
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
      setScreen('end');
    }
  }, [recordBest]);

  const startNew = (name, difficulty = 'normal', gender = 'male') => {
    setGame(E.newGame(name, undefined, difficulty, gender, meta));
    setScreen('game');
  };

  const goHome = () => setScreen('start');

  let content;
  if (!ready) {
    content = <View style={styles.center}><ActivityIndicator color={C.red} /></View>;
  } else if (screen === 'game' && game && !game.ended) {
    content = (
      <GameScreen
        game={game}
        setGame={setGame}
        onHome={goHome}
        onRestart={() => { clearSave(); startNew(game.name, game.difficulty || 'normal', game.gender || 'male'); }}
      />
    );
  } else if (screen === 'end' && game && game.ended) {
    content = <EndScreen game={game} meta={meta} onAgain={() => startNew(game.name, game.difficulty || 'normal', game.gender || 'male')} onHome={goHome} />;
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
        onContinue={() => setScreen('game')}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, (screen === 'start' || screen === 'create') && { backgroundColor: '#0f1636' }]} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        {content}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
