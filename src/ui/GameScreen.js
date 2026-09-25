import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bar, Button, Card, Chip } from './components';
import { RollingNumber, SmoothBar, FadeIn, TabItem, GroupHead, BLUR } from './ios';
import { C, SHADOW, STAT_META, toneColor } from './theme';
import EventSheet, { ResultSheet } from './EventSheet';
import InvestSheet from './InvestSheet';
import HealthSheet from './HealthSheet';
import FamilySheet from './FamilySheet';
import UpgradeSheet from './UpgradeSheet';
import Sheet from './Sheet';
import Tutorial from './Tutorial';
import MatesSheet from './MatesSheet';
import { play as playSfx, getSfx, setSfx } from './sfx';
import YearSummary from './YearSummary';
import { sceneForState } from './art';
import { CharScene, Head, castFor, stageOf } from './Character';
import * as E from '../game/engine';
import { familyById } from '../game/data';
import { routeLabel } from '../game/routes';
import { TALENTS, learned, talentBonusText } from '../game/talents';
import { loadTutorialDone, writeTutorialDone } from '../storage';
import Celebration, { detect, haptic, getHaptics, setHaptics } from './celebrate';
import { DarkBackdrop } from './StartScreen';
import { useWindowDimensions } from 'react-native';

// 每年可以做的事，配一個圖示比較好認
const FOCUS_ICON = {
  study: '📖', cram: '✏️', sport: '🏃', play: '🎮', friends: '👫', parttime: '🧋', finance: '📊', date: '💕',
  work: '💼', gig: '🛵', runbiz: '🏭', learn: '🎓', rest: '🌴', gym: '🏋️', network: '🥂', invest: '📈',
  family: '👨‍👩‍👧', jobhunt: '🔍', startbiz: '🚀',
};

const TUT_STEPS = [
  {
    key: null, title: '歡迎來到「一個億的小目標」',
    text: '從 0 歲活到退休，目標是賺到一個億。三十秒看完怎麼玩。',
  },
  {
    key: 'hero', title: '① 這裡看你離目標多遠',
    text: '大字是淨資產（現金＋投資＋房產＋公司－負債）。進度條到 100% 就破億了。',
  },
  {
    key: 'focus', title: '② 每年要做的事（最重要）',
    text: '每年有幾點精力（右上角 ⚡）。輕鬆的事 1 點，標 ⚡2 的比較累。身體好精力多，老了會變少。',
  },
  {
    key: 'stats', title: '③ 四個屬性',
    text: '智力管考試和工作，健康歸零就結束，快樂太低會影響表現，人緣影響升遷。',
  },
  {
    key: 'bar', title: '④ 下面這排是隨時能做的事',
    text: '錢放著不會變多，去「投資」買點東西。「健康」做檢查，「家庭」看另一半和小孩。',
  },
  {
    key: 'next', title: '⑤ 按「過一年」讓時間前進',
    text: '長一歲、跑事件、結算這年的收支。遇到事件選一個就好。',
  },
  {
    key: null, title: '就這樣，開始吧！',
    text: '不用怕做錯，每個職業都有自己的逆襲路線。要重看教學點右上角 ⋯。',
  },
];

export default function GameScreen({ game, setGame, onHome, onRestart }) {
  const s = game;
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [showInvest, setShowInvest] = useState(false);
  const [investTab, setInvestTab] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showMates, setShowMates] = useState(false);
  const [openWorld, setOpenWorld] = useState(false);
  const [showAllLog, setShowAllLog] = useState(false);
  const logY = useRef(0);
  const statsY = useRef(0);
  const [result, setResult] = useState(null);

  // ── 慶祝：每次狀態改變都跟上一個比，有里程碑就放特效＋震動 ──
  const prevRef = useRef(s);
  const [cel, setCel] = useState([]);
  const [hapticsOn, setHapticsOn] = useState(getHaptics());
  const [sfxOn, setSfxOn] = useState(getSfx());
  useLayoutEffect(() => {
    const d = detect(prevRef.current, s);
    prevRef.current = s;
    if (d) {
      setCel((q) => [...q, d]);
      // 震動要在點擊的同一刻觸發（iPhone 才吃得到），畫面特效稍後才出來
      haptic(d.tier);
    }
  }, [s]);

  // 做完選擇：先算出這個選擇造成的變化，給玩家看結果
  const choose = (i) => {
    const p = s.pending;
    const nw0 = E.netWorth(s);
    const n0 = s.log.length;
    const s2 = E.resolveChoice(s, i);
    const strip = (x) => x.replace(`【${p.title}】`, '').replace(/（(智力|健康|快樂|人緣)[+-]\d+[^）]*）/g, '').trim();
    const items = s2.log.slice(n0).filter((l) => l.tone !== 'money' && l.tone !== 'focus').map((l) => ({ text: strip(l.text), tone: l.tone })).filter((l) => l.text);
    const stats = {};
    for (const m of STAT_META) { const d = s2.stats[m.key] - s.stats[m.key]; if (d) stats[m.key] = d; }
    const nwD = E.netWorth(s2) - nw0;
    haptic('tap');
    // 事件結果：好消息一個上行、壞消息一個下行
    {
      const tones = items.map((x) => x.tone);
      playSfx(tones.includes('milestone') ? 'checkpoint'
        : (tones.includes('bad') && !tones.includes('good')) ? 'bad'
          : tones.includes('good') ? 'good' : 'tap');
    }
    setResult({
      title: p.title, choice: p.choices[i].label, items, stats,
      // 這個選項有專屬動畫就用它的，沒有就沿用事件本身的
      clip: p.choices[i].clip || p.clip,
      nw: Math.abs(nwD) >= 1000 ? nwD : 0,
      hasNext: !!s2.pending && !s2.ended,
    });
    setGame(s2);
  };

  const nw = E.netWorth(s);
  const pctNum = (nw / E.YI) * 100;
  const progress = Math.max(0, Math.min(1, nw / E.YI));
  const focusOpts = E.focusOptions(s);
  const chosen = E.getFocuses(s);
  const slots = E.focusEnergy(s);          // 這一年的精力上限
  const usedEnergy = E.focusUsed(E.getFocuses(s));
  const [focusMsg, setFocusMsg] = useState(null);
  const route = routeLabel(s);
  const fam = familyById(s.family).name;

  // ── 新手教學 ──
  const [tut, setTut] = useState(-1);
  const [tutRect, setTutRect] = useState(null);
  const scrollRef = useRef(null);
  const refs = { hero: useRef(null), stats: useRef(null), focus: useRef(null), bar: useRef(null), next: useRef(null) };
  const focusY = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const done = await loadTutorialDone();
      if (alive && !done && s.age <= 1) setTut(0);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (tut < 0) return undefined;
    const step = TUT_STEPS[tut];
    setTutRect(null);
    if (!step.key) return undefined;
    if (step.key === 'focus') scrollRef.current?.scrollTo({ y: Math.max(0, focusY.current - 90), animated: true });
    else if (step.key === 'stats') scrollRef.current?.scrollTo({ y: Math.max(0, statsY.current - 90), animated: true });
    else if (step.key === 'hero') scrollRef.current?.scrollTo({ y: 0, animated: true });
    const t = setTimeout(() => {
      const node = refs[step.key]?.current;
      if (node && node.measureInWindow) {
        node.measureInWindow((x, y, w, h) => setTutRect({ x, y, w, h }));
      }
    }, 420);
    return () => clearTimeout(t);
  }, [tut]);

  // 跳出事件時，把能力值捲到最上面，面板就不會蓋住它
  const hasPending = !!s.pending;
  const eventMode = hasPending || !!result;
  const wasEvent = useRef(false);
  useEffect(() => {
    if (eventMode) {
      wasEvent.current = true;
      const t = setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, statsY.current - 6), animated: true }), 60);
      return () => clearTimeout(t);
    }
    // 事件都處理完：捲回最上面看今年的結果
    if (wasEvent.current) { wasEvent.current = false; scrollRef.current?.scrollTo({ y: 0, animated: true }); }
    return undefined;
  }, [eventMode, s.age]);

  const endTutorial = () => { setTut(-1); setTutRect(null); scrollRef.current?.scrollTo({ y: 0, animated: false }); writeTutorialDone(true); };

  const sub = [
    E.stageOf(s),
    fam,
    s.age >= 15 ? E.eduName(s) : null,
    s.married ? `${E.partnerWord(s)}：${s.spouse.name}（${E.spouseInfo(s).title}）` : s.partner ? `交往中：${s.partner.name}${E.currentType(s) ? `（${E.currentType(s).title}）` : ''}` : null,
    s.kids.length ? `${s.kids.length} 個孩子` : null,
    s.flags.band && s.flags.bandName ? `🎸 ${s.flags.bandName}${s.flags.band === 4 ? '（爆紅中）' : s.flags.band === 3 ? '（職業）' : ''}` : null,
  ].filter(Boolean).join('．');

  const talentNames = learned(s).map((id) => (TALENTS.find((t) => t.id === id) || {}).label).filter(Boolean);
  const bonusText = talentNames.length ? talentBonusText(s) : '';
  const invest = E.investTotal(s);
  const houses = E.houseTotal(s);
  const debts = E.debtTotal(s);
  const bizs = E.bizTotal(s);
  const rank = (s.mates || []).length && s.age >= 6 ? E.myRank(s, nw) : null;
  // 跟去年比：淨資產變化、今年發生的事
  const prevNw = s.history && s.history.length >= 2 ? s.history[s.history.length - 2] : null;
  const yearDelta = prevNw == null ? 0 : nw - prevNw;
  // 股票、投資、房市和世界新聞都丟到投資頁，這裡只留「人生」發生的事
  const yearLogs = s.log.filter((l) => l.age === s.age && l.tone !== 'money' && l.tone !== 'focus');
  const happened = yearLogs.filter((l) => !E.isMarketLog(l));
  const marketCount = yearLogs.length - happened.length;
  const [showAllHappened, setShowAllHappened] = useState(false);

  // 新手提示：只在真的需要的時候出現一行；同一種提示出現過一次，之後幾年都不會再跳（不要一直通知）
  const hintInfo = (() => {
    const ly = s.lastYear;
    const net = ly ? (ly.salary + ly.bizIncome + ly.rent + ly.spouse + (ly.filial || 0) + (ly.side || 0))
      - (ly.living + ly.kids + ly.debtPay + (ly.dating || 0) + (ly.tax || 0)) : 0;
    if (s.age >= 18 && s.money < 0) {
      return { key: 'overdraft', amt: -s.money, text: `現金透支 ${E.formatMoney(-s.money)}，會滾利息。點這裡一鍵賣投資還清。` };
    }
    // 照去年的收支，明年現金就會變負的才提醒
    if (s.age >= 18 && invest > 0 && ly && s.money + net < 0) {
      return { key: 'cash', text: '照去年的收支，明年現金會不夠。點這裡看貸款，或先賣一點投資。' };
    }
    if (s.stats.hp < 32) return { key: 'hp', gap: 3, text: '健康快見底了！選「運動」或「休息旅遊」，歸零就結束。' };
    if (s.partner && !s.married && E.proposeInfo(s).ok) {
      return {
        key: 'propose',
        text: E.heProposes(s)
          ? `感情夠穩定了，點「家庭」讓「${s.partner.name}」知道你想定下來了。`
          : `感情夠穩定了，點「家庭」可以跟「${s.partner.name}」求婚。`,
      };
    }
    if (!s.job && !s.bizs.length && !s.studying && s.age >= 18) return { key: 'nojob', text: '沒有工作。選「找新工作」，年底會有職缺。' };
    if (invest === 0 && s.money > 30 * 10000 && E.canInvest(s)) return { key: 'idle', text: '現金放著會被通膨吃掉。去「投資」買點 ETF 或設定期定額。' };
    if (s.route && !s.route.done && s.job && s.age >= 22) return { key: 'route', text: '多選「認真工作」或「經營事業」，逆襲路線比較容易觸發。' };
    return null;
  })();
  const seen = (s.flags && s.flags.hintSeen) || {};
  const hintVisible = (() => {
    if (!hintInfo) return false;
    const last = seen[hintInfo.key];
    if (!last) return true;
    if (last.age === s.age) return !last.closed;
    if (hintInfo.key === 'overdraft' && hintInfo.amt > (last.amt || 0) * 2) return true; // 透支變成兩倍以上才再提醒
    return s.age - last.age >= (hintInfo.gap || 5);
  })();
  const hint = hintVisible ? hintInfo.text : null;
  // 記下這一年已經提醒過
  useEffect(() => {
    if (!hintVisible || !hintInfo) return;
    const last = seen[hintInfo.key];
    if (last && last.age === s.age) return;
    setGame((x) => ({ ...x, flags: { ...x.flags, hintSeen: { ...((x.flags && x.flags.hintSeen) || {}), [hintInfo.key]: { age: x.age, amt: hintInfo.amt || 0 } } } }));
  }, [hintVisible, hintInfo && hintInfo.key, s.age]);
  const closeHint = () => {
    if (!hintInfo) return;
    setGame((x) => ({ ...x, flags: { ...x.flags, hintSeen: { ...((x.flags && x.flags.hintSeen) || {}), [hintInfo.key]: { age: x.age, amt: hintInfo.amt || 0, closed: true } } } }));
  };


  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <DarkBackdrop width={Math.min(win.width, 480)} height={win.height} />
      {/* 固定在上面：名字列 */}
      <View style={[styles.fixedTop, BLUR]}>
        {/* 上方：名字、身分、點數 */}
        <View style={styles.top}>
          <View style={styles.nameRow}>
            <Head age={s.age} gender={s.gender} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
              <Text style={styles.subText} numberOfLines={2}>{sub}</Text>
            </View>
          </View>
          <Pressable onPress={() => setShowUpgrade(true)} hitSlop={6} style={styles.pointsPill}>
            <Text style={styles.pointsNum}>🏅 {E.lifeScore(s).total}</Text>
          </Pressable>
          <Pressable onPress={() => setShowMenu(true)} hitSlop={8} style={styles.moreBtn}>
            <Text style={styles.moreText}>⋯</Text>
          </Pressable>
        </View>


      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* 主卡：年齡＋淨資產＋進度 */}
          <View ref={refs.hero} collapsable={false} style={[styles.hero, SHADOW]}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={styles.heroAge}>{s.age}</Text>
                  <Text style={styles.heroAgeUnit}>歲</Text>
                  <Text style={[styles.heroLabel, { marginLeft: 4 }]}>淨資產</Text>
                </View>
                <RollingNumber
                  value={nw}
                  format={(v) => E.formatMoney(v)}
                  style={[styles.heroMoney, nw < 0 && { color: C.red }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                />
                {yearDelta && Math.abs(yearDelta) >= 1000 ? (
                  <Text style={[styles.heroDelta, { color: yearDelta > 0 ? C.green : C.red }]}>
                    {yearDelta > 0 ? '▲' : '▼'} {E.formatMoney(Math.abs(yearDelta))}<Text style={{ color: C.muted, fontWeight: '400' }}>　比去年</Text>
                  </Text>
                ) : <Text style={[styles.heroDelta, { color: C.muted, fontWeight: '400' }]}>目標 1 億</Text>}
              </View>
              {/* 右半邊留給插圖 */}
              <View style={{ width: '44%', height: 100 }} />
            </View>
            {/* 插圖貼齊卡片右上，佔滿整個右半邊，左邊淡出 */}
            <View
              pointerEvents="none"
              style={[
                { position: 'absolute', top: 0, right: 0, width: '54%', height: 130 },
                Platform.OS === 'web' ? { maskImage: 'linear-gradient(to right, transparent 0%, #000 22%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 22%)' } : null,
              ]}
            >
              <CharScene
                key={`${stageOf(s.age)}-${sceneForState(s)}`}
                kind={sceneForState(s)} age={s.age} gender={s.gender}
                partner={castFor(sceneForState(s), s).partner}
                mood={s.stats.happy < 30 ? '😞' : undefined}
                height={130} radius={0} compact
              />
              {Platform.OS === 'web' ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 26, backgroundImage: `linear-gradient(to bottom, rgba(27,34,86,0), ${C.card})` }} /> : null}
            </View>
            <View style={styles.heroBar}>
              <SmoothBar value={progress} color={progress >= 1 ? C.gold : C.primary} height={6} />
            </View>
            {!focusOpts.length ? (
              <View style={styles.babyNote}>
                <Text style={styles.babyTitle}>🍼 還小，只要健康長大就好</Text>
                <Text style={styles.babyText}>6 歲以後才要自己選。現在直接按「過一年」。</Text>
              </View>
            ) : null}
            <View style={styles.between}>
              <Text style={styles.heroFoot}>
                {s.achievedAge
                  ? `${E.isTop(s) ? '👑 最強的那一個．' : '🎉 '}${s.achievedAge} 歲破億，目標的 ${(pctNum / 100).toFixed(2)} 倍`
                  : `還差 ${E.formatMoney(E.YI - nw)}．${s.endAge} 歲退休（剩 ${Math.max(0, s.endAge - s.age)} 年）`}
              </Text>
              <Text style={styles.pctNum}>{pctNum >= 100 ? pctNum.toFixed(0) : pctNum.toFixed(1)}%</Text>
            </View>
            {/* 階段目標：讓玩家每一年都知道自己跟不跟得上，不用等到 65 歲才發現 */}
            {(() => {
              if (s.achievedAge || s.age < 6) return null;
              const cp = E.nextCheckpoint(s, nw);
              if (!cp) return null;
              return (
                <View style={styles.cpBar}>
                  <Text style={styles.cpLabel} numberOfLines={1}>
                    下一關 <Text style={styles.cpAge}>{cp.age} 歲</Text> {E.formatMoney(cp.nw)}
                  </Text>
                  <Text style={[styles.cpGap, cp.ok ? { color: C.green } : null]}>
                    {cp.ok ? `✓ 已達標（剩 ${cp.years} 年）` : `還差 ${E.formatMoney(cp.gap)}`}
                  </Text>
                </View>
              );
            })()}
          </View>

          {/* 狀態：屬性＋資產，一眼看完 */}
          <View ref={refs.stats} collapsable={false} onLayout={(e) => { statsY.current = e.nativeEvent.layout.y; }}>
            <Card style={styles.statCard}>
              <View style={styles.stats}>
                {STAT_META.map((m) => (
                  <Pressable key={m.key} style={styles.stat} onPress={m.key === 'hp' ? () => setShowHealth(true) : undefined}>
                    <Text style={styles.statLabel} numberOfLines={1}>{m.icon} {m.label}</Text>
                    <Text style={[styles.statVal, s.stats[m.key] < 25 && { color: C.red }]}>{s.stats[m.key]}</Text>
                    <Bar value={s.stats[m.key]} color={m.color} height={6} />
                  </Pressable>
                ))}
              </View>
              {/* 資產：點一下打開投資 */}
              <Pressable onPress={() => setShowInvest(true)} style={styles.assets}>
                <Asset label={s.money < 0 ? '現金（透支）' : '現金'} value={Math.max(0, s.money)} bad={s.money < 0} />
                <Asset label="投資" value={invest} />
                <Asset label={bizs ? (houses ? '房產+公司' : '公司') : '房產'} value={bizs + houses} />
                <Asset label={s.money < 0 ? '負債+透支' : '負債'} value={-(debts + Math.max(0, -s.money))} bad={debts + Math.max(0, -s.money) > 0} />
              </Pressable>
              {talentNames.length ? (
                <Text style={[styles.small, { marginTop: 8 }]} numberOfLines={1}>🎨 才藝（{talentNames.length}）：{talentNames.join('、')}</Text>
              ) : null}
            </Card>
          </View>


          {/* 今年發生的事：過完一年先看發生了什麼，再決定下一年 */}
          {(happened.length || marketCount) && s.age > 0 ? (
            <>
            <GroupHead
              title={`${s.age} 歲發生的事`}
              right={<Pressable onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, logY.current - 10), animated: true })} hitSlop={8}><Text style={styles.link}>人生紀錄</Text></Pressable>}
            />
            <Card style={styles.happened}>
              {(showAllHappened ? happened : happened.slice(0, 2)).map((l, i) => (
                <FadeIn key={i} delay={i * 90} replay={s.age}>
                  <Text style={[styles.happenedItem, { color: toneColor(l.tone) }]} numberOfLines={showAllHappened ? undefined : 2}>{l.text.replace(/（(智力|健康|快樂|人緣)[+-]\d+[^）]*）/g, '')}</Text>
                </FadeIn>
              ))}
              {happened.length > 2 ? (
                <Pressable onPress={() => setShowAllHappened(!showAllHappened)} hitSlop={6}>
                  <Text style={[styles.link, { marginTop: 6 }]}>{showAllHappened ? '收起 ▲' : `還有 ${happened.length - 2} 件 ▼`}</Text>
                </Pressable>
              ) : null}
              {marketCount ? (
                // 股票、投資和新聞改放在投資頁
                <Pressable onPress={() => { setInvestTab(0); setShowInvest(true); }} hitSlop={6}>
                  <Text style={[styles.link, { marginTop: happened.length ? 8 : 2 }]}>📈 今年有 {marketCount} 則市場消息，到投資頁看 ›</Text>
                </Pressable>
              ) : null}
            </Card>
            </>
          ) : null}

          {hint ? (
            <Pressable onPress={hint.includes('貸款') ? () => { setInvestTab(4); setShowInvest(true); } : undefined}>
              <Card style={[styles.hint, { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }]}>
                <Text style={[styles.hintText, { flex: 1 }]}>💡 {hint}{hint.includes('貸款') ? ' ›' : ''}</Text>
                <Pressable onPress={closeHint} hitSlop={10}><Text style={{ color: C.muted, fontSize: 16, fontWeight: '700' }}>✕</Text></Pressable>
              </Card>
            </Pressable>
          ) : null}

          {/* 今年要做的事 */}
          <View
            ref={refs.focus}
            collapsable={false}
            onLayout={(e) => { focusY.current = e.nativeEvent.layout.y; }}
          >
            {focusOpts.length ? (
              <GroupHead title="今年要做什麼" right={<Text style={[styles.slotText, usedEnergy >= slots && { color: C.primaryInk }]}>{`⚡ ${usedEnergy} / ${slots}`}</Text>} />
            ) : null}
            {focusOpts.length ? (
            <Card style={styles.focusCard}>
              <>
                  {focusMsg ? (
                    <Text style={[styles.focusHint, { color: C.red, fontWeight: '600' }]}>{focusMsg}</Text>
                  ) : <View style={{ height: 10 }} />}
                  <View style={styles.chips}>
                    {focusOpts.map((o) => (
                      <Chip
                        key={o.id}
                        label={o.label}
                        sub={o.sub}
                        subParts={o.subParts}
                        urgent={o.urgent}
                        cost={o.cost}
                        icon={FOCUS_ICON[o.id]}
                        on={chosen.includes(o.id)}
                        // 精力不夠的直接變灰按不動，不用再跳紅字罵人
                        disabled={o.disabled || (!chosen.includes(o.id) && usedEnergy + o.cost > slots)}
                        onPress={() => {
                          const r = E.toggleFocus(s, o.id);
                          setFocusMsg(r.error || null);
                          if (!r.error) setGame(r.state);
                        }}
                      />
                    ))}
                  </View>
              </>
            </Card>
            ) : null}
          </View>

          {/* 今年的世界＋同屆排名：合成一張卡，上下兩段 */}
          {(s.world && s.age > 0) || rank ? (
            <Card style={[styles.world, { paddingVertical: 0, overflow: 'hidden' }]}>
              {s.world && s.age > 0 ? (
                <Pressable onPress={() => setOpenWorld(!openWorld)} style={[{ paddingVertical: 12 }, s.world.crash && { backgroundColor: C.redSoft, marginHorizontal: -14, paddingHorizontal: 14 }]}>
                <View style={styles.between}>
                  <Text style={[styles.worldTitle, s.world.crash && { color: C.red }]} numberOfLines={1}>
                    {s.world.crash ? '⚠️' : '🌍'} {s.world.title}
                  </Text>
                  <Text style={styles.small}>通膨 {pctStr(s.inflation)} {openWorld ? '▲' : '▼'}</Text>
                </View>
                {openWorld ? (
                  <>
                    <Text style={styles.worldDesc}>{s.world.desc}</Text>
                    <View style={styles.retRow}>
                      {RET_KEYS.map(([k, label]) => (
                        <View key={k} style={styles.retItem}>
                          <Text style={styles.retLabel}>{label}</Text>
                          <Text style={[styles.retVal, { color: s.world.returns[k] >= 0 ? C.green : C.red }]}>{pctStr(s.world.returns[k], 0)}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.small}>物價是出生時的 {s.priceIndex.toFixed(2)} 倍</Text>
                  </>
                ) : (
                  <View style={styles.retRowTight}>
                    {RET_KEYS.map(([k, label, shortLabel]) => (
                      <Text key={k} style={styles.retTight}>
                        {shortLabel || label} <Text style={{ color: s.world.returns[k] >= 0 ? C.green : C.red, fontWeight: '600' }}>{pctStr(s.world.returns[k], 0)}</Text>
                      </Text>
                    ))}
                  </View>
                )}
                </Pressable>
              ) : null}
              {s.world && s.age > 0 && rank ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginHorizontal: -2 }} /> : null}
              {rank ? (
                <Pressable onPress={() => setShowMates(true)} style={{ paddingVertical: 12 }}>
                <View style={styles.between}>
                  <Text style={styles.rankTitle}>
                    🏆 {rank.mode === 'grade' ? '班上排名' : '同屆排名'} <Text style={{ color: rank.rank === 1 ? C.goldInk : C.ink }}>{rank.rank}</Text> / {rank.total}
                  </Text>
                  <Text style={styles.link}>看排行榜 ›</Text>
                </View>
                <Text style={styles.small} numberOfLines={1}>
                  {rank.rank === 1
                    ? `你是${rank.mode === 'grade' ? '班上第一名' : '同屆最有錢的'}！第二名 ${E.ranking(s, nw)[1].name} ${E.ranking(s, nw)[1].label}`
                    : `第一名 ${rank.top.name}（${rank.top.title}）${rank.top.label}${rank.mode === 'nw' ? `．還差 ${E.formatMoney(rank.top.nw - nw)}` : ''}`}
                </Text>
                </Pressable>
              ) : null}
            </Card>
          ) : null}

          {s.job || s.bizs.length ? (
            <Text style={styles.jobLine}>
              {[
                s.job ? `${s.job.name}．${s.job.volatile ? '收入看人緣' : `年薪 ${E.formatMoney(s.job.salary)}`}` : null,
                s.bizs.length ? `老闆：${s.bizs.map((b) => b.name).join('、')}` : null,
                s.dca ? `定期定額 ${s.dca}%` : null,
              ].filter(Boolean).join('　')}
            </Text>
          ) : null}

          {/* 逆襲路線 */}
          {route ? (
            <Card style={styles.routeCard}>
              <View style={styles.between}>
                <Text style={styles.routeName}>⭐ {route.name}</Text>
                <Text style={styles.small}>{route.done ? '已完成！' : `${route.step} / ${route.total}`}</Text>
              </View>
              <View style={styles.routeBar}>
                {route.stepNames.map((n, i) => (
                  <View key={n} style={{ flex: 1 }}>
                    <View style={[styles.seg, i <= route.step && { backgroundColor: C.gold }]} />
                    <Text style={styles.segName} numberOfLines={1}>{n}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}
          {/* 今年摘要 */}
          {s.age >= 6 ? (
            <>
              <GroupHead title="今年摘要" />
              <Card style={{ marginTop: 0 }}>
                <YearSummary s={s} />
              </Card>
            </>
          ) : null}

          {/* 人生紀錄：只放最近幾年，點開看全部 */}
          <View onLayout={(e) => { logY.current = e.nativeEvent.layout.y; }}>
            <GroupHead title="人生紀錄" right={<Pressable onPress={() => setShowAllLog(!showAllLog)} hitSlop={8}><Text style={styles.link}>{showAllLog ? '只看最近' : '看全部'}</Text></Pressable>} />
            <Card style={{ marginTop: 0 }}><LogList log={s.log} limit={showAllLog ? 0 : 3} /></Card>
          </View>
      </ScrollView>

      {/* 底部固定操作列 */}
      <View style={[styles.actions, BLUR, { paddingBottom: insets.bottom + 6 }]}>
        <View ref={refs.bar} collapsable={false} style={styles.tabLeft}>
          <TabItem icon="📈" label="投資" onPress={() => setShowInvest(true)} />
          <TabItem icon="❤️" label="健康" alert={s.stats.hp < 30} onPress={() => setShowHealth(true)} />
        </View>
        <View ref={refs.next} collapsable={false} style={styles.nextWrap}>
          <Pressable
            onPress={() => {
              setFocusMsg(null);
              setShowAllHappened(false);
              setShowAllLog(false);
              scrollRef.current?.scrollTo({ y: 0, animated: false });
              haptic('tap');
              playSfx('year');
              setGame(E.nextYear(s));
            }}
            style={({ pressed }) => [styles.nextBtn, pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 }]}
          >
            <Text style={styles.nextText}>過一年</Text>
            <Text style={styles.nextSub}>{s.age + 1} 歲 ›</Text>
          </Pressable>
        </View>
        <View style={styles.tabLeft}>
          <TabItem icon="👨‍👩‍👧" label="家庭" onPress={() => setShowFamily(true)} />
          <TabItem icon="🏆" label={rank ? `第${rank.rank}名` : '排名'} onPress={() => rank && setShowMates(true)} />
        </View>
      </View>

      <EventSheet pending={result ? null : s.pending} onChoose={choose} game={s} />
      <ResultSheet result={result} onContinue={() => setResult(null)} game={s} />
      <InvestSheet visible={showInvest && !s.pending} onClose={() => { setShowInvest(false); setInvestTab(null); }} game={s} setGame={setGame} initialTab={investTab} />
      <HealthSheet visible={showHealth && !s.pending} onClose={() => setShowHealth(false)} game={s} setGame={setGame} />
      <FamilySheet visible={showFamily && !s.pending} onClose={() => setShowFamily(false)} game={s} setGame={setGame} />
      <UpgradeSheet visible={showUpgrade && !s.pending} onClose={() => setShowUpgrade(false)} game={s} setGame={setGame} />
      <MatesSheet visible={showMates && !s.pending} onClose={() => setShowMates(false)} game={s} />

      <Sheet visible={showMenu} onClose={() => setShowMenu(false)} title="選單">
        <Text style={[styles.small, { marginBottom: 12 }]}>性別：{E.genderById(s.gender).name}．難度：{E.diffOf(s).name}（{E.diffOf(s).sub}）。遊戲每一年都會自動存檔，換難度要開新的人生。</Text>
        <Button kind="soft" title={hapticsOn ? '震動：開' : '震動：關'} icon="📳" onPress={() => { const v = !hapticsOn; setHaptics(v); setHapticsOn(v); if (v) haptic('small'); }} />
        <Button kind="soft" title={sfxOn ? '音效：開' : '音效：關'} icon="🔊" onPress={() => { const v = !sfxOn; setSfx(v); setSfxOn(v); }} />
        <Button kind="soft" title="重看新手教學" icon="💡" style={{ marginTop: 10 }} onPress={() => { setShowMenu(false); setTut(0); }} />
        <Button kind="ghost" title="回到首頁" style={{ marginTop: 10 }} onPress={() => { setShowMenu(false); onHome(); }} />
        <Button kind="red" title="放棄這一生，重新開始" style={{ marginTop: 10 }} onPress={() => { setShowMenu(false); onRestart(); }} />
      </Sheet>

      <Celebration data={cel.length ? cel[0] : null} onDone={() => setCel((q) => q.slice(1))} />

      <Tutorial
        visible={tut >= 0 && !s.pending && !result}
        step={tut}
        total={TUT_STEPS.length}
        title={TUT_STEPS[Math.max(0, tut)].title}
        text={TUT_STEPS[Math.max(0, tut)].text}
        rect={tutRect}
        onNext={() => { if (tut >= TUT_STEPS.length - 1) endTutorial(); else setTut(tut + 1); }}
        onSkip={endTutorial}
      />
    </View>
  );
}

const RET_KEYS = [['etf', 'ETF', 'ETF'], ['stock', '個股', '股'], ['gold', '黃金', '金'], ['crypto', '加密幣', '幣'], ['house', '房價', '房']];
const pctStr = (r, d = 1) => `${r >= 0 ? '+' : ''}${(r * 100).toFixed(d)}%`;

// 人生紀錄：依年齡分段，收支那種雜訊用灰色小字
function LogList({ log, limit = 0 }) {
  const years = [];
  for (const l of log) {
    const last = years[years.length - 1];
    if (last && last.age === l.age) last.items.push(l);
    else years.push({ age: l.age, items: [l] });
  }
  return (
    <View style={{ paddingTop: 4 }}>
      {(limit ? years.reverse().slice(0, limit) : years.reverse()).map((y) => (
        <View key={y.age} style={styles.logYear}>
          <View style={styles.logYearHead}>
            <Text style={styles.logYearAge}>{y.age} 歲</Text>
            <View style={styles.logYearLine} />
          </View>
          {y.items.map((l, i) => {
            const quiet = l.tone === 'money' || l.tone === 'focus';
            return (
              <Text
                key={i}
                style={[styles.logItem, { color: toneColor(l.tone) }, quiet && { color: C.muted, fontSize: 12.5 }]}
              >
                {quiet ? '' : '・'}{l.text}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Asset({ label, value, bad }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.assetLabel}>{label}</Text>
      <Text
        style={[styles.assetVal, value === 0 && { color: C.muted, fontWeight: '600' }, bad && { color: C.red }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value === 0 ? '0' : E.formatMoney(value).replace(' ', '')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 0 },
  fixedTop: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: 'rgba(15,22,54,0.85)', zIndex: 2 },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: C.page, borderRadius: 999, padding: 4, marginTop: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  tabOn: { backgroundColor: C.card, ...SHADOW, shadowOpacity: 0.06 },
  tabText: { fontSize: 13.5, fontWeight: '600', color: C.muted },
  tabTextOn: { color: C.primaryInk },
  miniHero: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.primarySoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, marginTop: 8,
  },
  miniAge: { fontSize: 13, fontWeight: '600', color: C.primaryInk },
  miniMoney: { flex: 1, fontSize: 17, fontWeight: '700', color: C.ink },
  miniPct: { fontSize: 13, fontWeight: '600', color: C.primaryInk },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 22, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  menu: { fontSize: 16, color: C.muted },
  subText: { fontSize: 12, color: C.muted, marginTop: 1 },

  hero: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginTop: 10, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroDelta: { fontSize: 13, fontWeight: '600', marginTop: 4, fontVariant: ['tabular-nums'] },
  moreBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.page, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 18, fontWeight: '700', color: C.ink, lineHeight: 20 },
  tabLeft: { flexDirection: 'row', flex: 1 },
  nextWrap: { paddingHorizontal: 6, marginTop: -18 },
  nextBtn: {
    backgroundColor: C.primary, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 22, alignItems: 'center',
    shadowColor: '#2b2160', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  nextSub: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, fontWeight: '500', marginTop: 1 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ageBox: {
    width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  ageNum: { color: '#fff', fontSize: 23, fontWeight: '700', lineHeight: 26, fontVariant: ['tabular-nums'] },
  ageLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10.5, fontWeight: '500' },
  heroLabel: { color: C.muted, fontSize: 13, fontWeight: '500' },
  heroAge: { color: C.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  heroAgeUnit: { color: C.ink, fontSize: 16, fontWeight: '700' },
  babyNote: { marginTop: 12, backgroundColor: C.primarySoft, borderRadius: 12, padding: 10, borderLeftWidth: 3, borderLeftColor: C.primary },
  babyTitle: { color: C.ink, fontSize: 13.5, fontWeight: '700' },
  babyText: { color: C.muted, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  heroMoney: { color: C.ink, fontSize: 36, fontWeight: '700', marginTop: 2, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  pctBox: { alignItems: 'flex-end' },
  pctNum: { color: C.primaryInk, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pctLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10.5 },
  heroBar: { marginTop: 14 },
  cpBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(140,170,255,0.18)',
  },
  cpLabel: { fontSize: 12, color: 'rgba(200,215,255,0.75)', flexShrink: 1 },
  cpAge: { fontWeight: '800', color: C.goldInk },
  cpGap: { fontSize: 12, fontWeight: '700', color: C.goldInk, fontVariant: ['tabular-nums'] },
  heroFoot: { color: C.muted, fontSize: 11.5, marginTop: 8, fontWeight: '400', flex: 1 },

  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  small: { fontSize: 12.5, color: C.muted },
  link: { fontSize: 13, color: C.primaryInk, fontWeight: '500' },

  statCard: { paddingVertical: 12 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 3 },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: '500' },
  statVal: { fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 1, fontVariant: ['tabular-nums'] },

  assets: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
  assetLabel: { fontSize: 11, color: C.muted, fontWeight: '500' },
  assetVal: { fontSize: 15, fontWeight: '600', color: C.ink, marginTop: 3, fontVariant: ['tabular-nums'] },
  jobLine: { fontSize: 12.5, color: C.muted, marginTop: 8, textAlign: 'center' },

  bonus: { fontSize: 12, color: C.primaryInk, fontWeight: '700', marginTop: 3 },
  hint: { backgroundColor: C.card, paddingVertical: 10, borderLeftWidth: 3, borderLeftColor: C.gold },
  hintText: { fontSize: 13, color: C.ink, lineHeight: 19, fontWeight: '400' },
  rankCard: { backgroundColor: C.card, paddingVertical: 10 },
  rankTitle: { fontSize: 14.5, fontWeight: '600', color: C.ink },
  routeCard: { backgroundColor: C.card, borderLeftWidth: 3, borderLeftColor: C.gold },
  routeName: { fontSize: 14.5, fontWeight: '600', color: C.ink },
  routeBar: { flexDirection: 'row', gap: 4, marginTop: 10 },
  seg: { height: 6, borderRadius: 3, backgroundColor: C.page },
  segName: { fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 4 },

  focusCard: { backgroundColor: C.card, marginTop: 0 },
  section: { fontSize: 15, fontWeight: '600', color: C.ink },
  slotPill: { backgroundColor: C.page, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  slotText: { fontSize: 12, fontWeight: '600', color: C.muted, fontVariant: ['tabular-nums'] },
  focusHint: { fontSize: 11.5, color: C.muted, marginTop: 4, marginBottom: 8, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  thisYear: { fontSize: 12.5, color: C.muted, paddingVertical: 3 },
  logRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  logAge: { width: 42, fontSize: 12, color: C.muted, paddingTop: 2, fontWeight: '600' },
  logText: { flex: 1, fontSize: 14, lineHeight: 20 },
  logYear: { marginBottom: 14 },
  logYearHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  logYearAge: { fontSize: 12.5, fontWeight: '600', color: C.muted },
  logYearLine: { flex: 1, height: 1, backgroundColor: C.line },
  logItem: { fontSize: 14, lineHeight: 21, marginBottom: 2 },

  pointsPill: { backgroundColor: C.page, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  pointsNum: { fontSize: 14, fontWeight: '600', color: C.ink, fontVariant: ['tabular-nums'] },
  pointsLabel: { fontSize: 10, color: C.muted, fontWeight: '500' },

  world: { backgroundColor: C.card },
  worldTitle: { fontSize: 14.5, fontWeight: '600', color: C.ink, flex: 1 },
  worldDesc: { fontSize: 12.5, color: C.ink, marginTop: 4, lineHeight: 18 },
  retRow: { flexDirection: 'row', marginVertical: 10 },
  retItem: { flex: 1, alignItems: 'center' },
  retLabel: { fontSize: 10.5, color: C.muted },
  retVal: { fontSize: 13.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  retRowTight: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2, marginTop: 6 },
  retTight: { fontSize: 11.5, color: C.muted },

  actions: {
    flexDirection: 'row', paddingHorizontal: 8, paddingTop: 4,
    backgroundColor: 'rgba(14,19,52,0.88)', borderTopWidth: 1, borderTopColor: C.cardLine,
    alignItems: 'center',
  },
  iconRow: { flexDirection: 'row', gap: 6, flex: 1.7 },
  happened: { backgroundColor: C.card, paddingVertical: 8, marginTop: 0 },
  happenedItem: { fontSize: 14, lineHeight: 20, paddingVertical: 5, fontWeight: '400' },
});
