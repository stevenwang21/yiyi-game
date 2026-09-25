// 首頁：手遊主頁。上面是主視覺，接著玩家卡（名字·年齡·資產·▶ 繼續），
// 創角卡（名字／性別／難度／開始新人生），三張圖片入口，底部 Tab Bar。
import { useState } from 'react';
import { Image, ImageBackground, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { PHOTO } from './art/photos';
import Sheet from './Sheet';
import { Button } from './components';
import { C } from './theme';
import { formatMoney, netWorth, DIFFICULTIES, GENDERS, LEGENDS, META_UPGRADES, stageOf, rollDifficulty, RANDOM_WEIGHTS } from '../game/engine';
import { APP_VERSION } from '../version';
import { STUDIO_NAME } from './StudioIntro';

const HOW = [
  { icon: '👶', title: '從 0 歲開始', text: '每按一次「過一年」就長一歲，一路活到退休。中間會遇到隨機事件，選項不同、結果就不同。' },
  { icon: '✅', title: '每年選要做的事', text: '每年有幾點精力，輕鬆的事花 1 點、累的事花 2 點。身體好精力多，上年紀會變少。' },
  { icon: '📈', title: '光靠薪水不夠', text: '滿 18 歲後，按下面的「投資」把現金換成 ETF、股票、黃金、房子或公司。世界大事每年都會影響漲跌，定期定額最省事。' },
  { icon: '⭐', title: '每個職業都能翻身', text: '不管做什麼工作，都有一條專屬的「逆襲路線」：升遷 → 開公司 → 擴張 → 大躍進。多選「認真工作」比較容易觸發。' },
  { icon: '❤️', title: '別把身體搞壞', text: '健康歸零人生就結束了。過勞、壓力、年紀都會累積隱形風險，記得運動、休息，偶爾做健康檢查。' },
  { icon: '🎯', title: '目標：一個億', text: '退休前讓淨資產（現金＋投資＋房產＋公司－負債）達到一億。達成後還可以繼續衝，看能到幾倍。' },
];

export const GLASS = Platform.OS === 'web' ? { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' } : {};
// 圖片往右淡出，跟卡片底色融在一起
const FADE_RIGHT = Platform.OS === 'web' ? { maskImage: 'linear-gradient(to right, #000 55%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, #000 55%, transparent 100%)' } : {};
const DIFF_ICON = { easy: 'ic_easy', normal: 'ic_normal', hard: 'ic_hard', hell: 'ic_hell' };

// 深藍紫的背景：漸層＋兩團光暈
export function DarkBackdrop({ width, height }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0f1636" /><Stop offset="0.6" stopColor="#151b46" /><Stop offset="1" stopColor="#221a55" />
        </LinearGradient>
        <RadialGradient id="glow1" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#6c5ce7" stopOpacity="0.5" /><Stop offset="1" stopColor="#6c5ce7" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="glow2" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#2e90fa" stopOpacity="0.35" /><Stop offset="1" stopColor="#2e90fa" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#bg)" />
      <Circle cx={width * 0.85} cy={height * 0.55} r={width * 0.55} fill="url(#glow1)" />
      <Circle cx={width * 0.1} cy={height * 0.85} r={width * 0.5} fill="url(#glow2)" />
    </Svg>
  );
}

// 圖片式入口
function Tile({ img, title, value, badge, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}>
      <ImageBackground source={PHOTO[img]} style={styles.tileImg} resizeMode="cover">
        <View style={styles.tileText}>
          <Text style={styles.tileTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.tileValue} numberOfLines={1}>{value}</Text>
        </View>
      </ImageBackground>
      {badge ? <View style={styles.tileBadge}><Text style={styles.tileBadgeText}>{badge}</Text></View> : null}
    </Pressable>
  );
}

function TabBtn({ icon, label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.tabBtn}>
      <Text style={[styles.tabIcon, active && { color: '#7db4ff' }]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && { color: '#fff' }]}>{label}</Text>
      {active ? <View style={styles.tabDot} /> : null}
    </Pressable>
  );
}

export default function StartScreen({ save, best, board, book, meta, onBuyMeta, onNew, onContinue }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const W = Math.min(width, 480);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [diff, setDiff] = useState('normal');
  const [showHow, setShowHow] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [showBest, setShowBest] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [metaMsg, setMetaMsg] = useState(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [rolling, setRolling] = useState(null); // 隨機難度抽到什麼，先給玩家看一下再進遊戲
  const m = meta || { points: 0, earned: 0, lives: 0, slots: 0, retire: 0 };
  const got = book || {};
  const gotCount = LEGENDS.filter((l) => got[l.id]).length;
  const canContinue = save && !save.ended;
  const canBuy = Object.entries(META_UPGRADES).some(([k, u]) => (m[k] || 0) < u.max && m.points >= u.cost(m[k] || 0));
  const nw = canContinue ? netWorth(save) : 0;
  const ready = name.trim().length > 0;

  const startNew = () => {
    if (!ready || rolling) return;
    if (canContinue && !confirmNew) { setConfirmNew(true); return; }
    setConfirmNew(false);
    if (diff === 'random') {
      // 抽完先蓋一層卡片給玩家看 1.7 秒，不然不知道自己被分到什麼
      const picked = DIFFICULTIES.find((d) => d.id === rollDifficulty()) || DIFFICULTIES[1];
      setRolling(picked);
      setTimeout(() => onNew(name.trim(), picked.id, gender), 1700);
      return;
    }
    onNew(name.trim(), diff, gender);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f1636' }}>
      <DarkBackdrop width={W} height={height} />
      <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: 96 + insets.bottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* 頂列 */}
        <View style={styles.topBar}>
          <View style={[styles.lvPill, GLASS]}><Text style={styles.lvText}>第 {m.lives + 1} 世</Text></View>
          <Text style={styles.brand}>一個億的小目標</Text>
          <Pressable onPress={() => { setMetaMsg(null); setShowMeta(true); }} style={[styles.ptsPill, GLASS]}>
            <Text style={styles.ptsText}>⭐ {m.points}</Text>
          </Pressable>
        </View>

        {/* 主視覺 */}
        <Image source={PHOTO.hero} style={{ width: W, height: Math.round(W * 444 / 780) }} resizeMode="cover" />

        {/* 玩家卡 */}
        <ImageBackground source={PHOTO.card_bg} imageStyle={{ borderRadius: 22, opacity: 0.55 }} style={[styles.player, GLASS]}>
          <View style={{ flex: 1 }}>
            {canContinue ? (
              <>
                <Text style={styles.playerName} numberOfLines={1}>{save.name} · {save.age} 歲</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <View style={styles.coin}><Text style={styles.coinText}>$</Text></View>
                  <Text style={styles.playerMoney} numberOfLines={1}>{formatMoney(nw)}</Text>
                </View>
                <Text style={styles.playerStage} numberOfLines={1}>{stageOf(save)}</Text>
              </>
            ) : (
              <>
                <Text style={styles.playerName}>還沒有人生</Text>
                <Text style={styles.playerStage}>在下面取個名字，按開始</Text>
              </>
            )}
          </View>
          <Pressable
            onPress={canContinue ? onContinue : startNew}
            style={({ pressed }) => [styles.play, !canContinue && !ready && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.95 }] }]}
          >
            <Text style={styles.playIcon}>▶</Text>
          </Pressable>
        </ImageBackground>

        {/* 創角卡 */}
        <View style={[styles.form, GLASS]}>
          <View style={styles.nameRow}>
            <Text style={styles.nameIcon}>👤</Text>
            <View style={[styles.inputWrap, !ready && { borderColor: 'rgba(255,215,106,0.6)' }]}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="輸入名字"
                placeholderTextColor="rgba(255,255,255,0.45)"
                maxLength={10}
                returnKeyType="done"
              />
              <Text style={styles.pen}>✎</Text>
            </View>
          </View>

          <View style={styles.row}>
            {GENDERS.map((g) => {
              const on = gender === g.id;
              return (
                <Pressable key={g.id} onPress={() => setGender(g.id)} style={[styles.genderCard, on && styles.pickOn, !on && { opacity: 0.8 }]}>
                  <View style={[styles.face, FADE_RIGHT]}><Image source={PHOTO[g.id === 'female' ? 'face_girl' : 'face_boy']} style={{ width: '100%', height: '100%' }} resizeMode="cover" /></View>
                  <Text style={[styles.pickText, styles.genderName, on && { color: '#fff' }]}>{g.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            {DIFFICULTIES.map((x) => {
              const on = diff === x.id;
              return (
                <Pressable key={x.id} onPress={() => setDiff(x.id)} style={[styles.diffCard, on && styles.pickOn, on && x.id === 'hell' && styles.pickHell, !on && { opacity: 0.8 }]}>
                  <Image source={PHOTO[DIFF_ICON[x.id]]} style={styles.diffBg} resizeMode="cover" />
                  <View style={styles.diffLabel}>
                    <Text style={[styles.pickText, on && { color: '#fff' }]}>{x.name}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => setDiff('random')}
            style={[styles.randCard, diff === 'random' && styles.pickOn, diff !== 'random' && { opacity: 0.8 }]}
          >
            <Text style={styles.randDice}>🎲</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickText, diff === 'random' && { color: '#fff' }]}>隨機</Text>
              <Text style={styles.randSub}>交給命運決定，地獄只有 {RANDOM_WEIGHTS.hell}%</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={startNew}
            disabled={!ready}
            style={({ pressed }) => [styles.primary, !ready && styles.primaryOff, confirmNew && styles.danger, pressed && ready && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}
          >
            <Text style={styles.primaryText}>{confirmNew ? `確定？「${save.name}」的存檔會被覆蓋` : '▶  開始新人生'}</Text>
          </Pressable>
          {confirmNew ? (
            <Pressable onPress={() => setConfirmNew(false)} hitSlop={8}><Text style={styles.cancel}>先不要</Text></Pressable>
          ) : null}
        </View>

        {/* 三個入口 */}
        <View style={styles.tiles}>
          <Tile img="tile_star" title="永久升級" value={`${m.points}`} badge={canBuy ? '可升級' : null} onPress={() => { setMetaMsg(null); setShowMeta(true); }} />
          <Tile img="tile_book" title="職業圖鑑" value={`${gotCount} / ${LEGENDS.length}`} onPress={() => setShowLegend(true)} />
          <Tile img="tile_crown" title="最佳紀錄" value={best ? formatMoney(best.nw) : '—'} onPress={() => setShowBest(true)} />
        </View>

        {/* 版本號：手機上一眼就知道有沒有更新到 */}
        <Text style={styles.credit}>{STUDIO_NAME}　{APP_VERSION}</Text>
      </ScrollView>

      {/* 隨機難度：抽到什麼先蓋一張卡給玩家看 */}
      {rolling ? (
        <View style={styles.rollWrap} pointerEvents="none">
          <View style={[styles.rollCard, rolling.id === 'hell' && styles.rollHell]}>
            <Text style={styles.rollDice}>🎲</Text>
            <Text style={styles.rollLabel}>命運決定的難度</Text>
            <Text style={[styles.rollName, rolling.id === 'hell' && { color: '#e5b3ff' }]}>{rolling.name}</Text>
            <Text style={styles.rollSub}>{rolling.sub}</Text>
          </View>
        </View>
      ) : null}

      {/* 底部 Tab Bar */}
      <View style={[styles.tabBar, GLASS, { paddingBottom: insets.bottom + 6, width: W }]}>
        <TabBtn icon="🏠" label="人生" active />
        <TabBtn icon="🏆" label="成就" onPress={() => { setMetaMsg(null); setShowMeta(true); }} />
        <TabBtn icon="📊" label="排行榜" onPress={() => setShowBoard(true)} />
        <TabBtn icon="⚙" label="設定" onPress={() => setShowHow(true)} />
      </View>

      {/* 永久升級 */}
      <Sheet visible={showMeta} onClose={() => setShowMeta(false)} title="永久升級">
        <View style={styles.ptsBox}>
          <Text style={styles.ptsNum}>{m.points}</Text>
          <Text style={styles.ptsLabel}>可用點數{m.lives ? `．已經玩了 ${m.lives} 輩子，總共拿過 ${m.earned} 點` : ''}</Text>
        </View>
        <View style={styles.card}>
          {Object.entries(META_UPGRADES).map(([key, u], i) => {
            const lv = m[key] || 0;
            const maxed = lv >= u.max;
            const cost = maxed ? null : u.cost(lv);
            const can = !maxed && m.points >= cost;
            return (
              <View key={key} style={[styles.metaRow, i > 0 && styles.rowLine]}>
                <Text style={styles.rowIcon}>{u.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{u.name}　<Text style={styles.metaLv}>Lv.{lv}/{u.max}</Text></Text>
                  <Text style={styles.metaNow}>{u.now(lv)}</Text>
                </View>
                <Pressable
                  disabled={!can}
                  onPress={() => {
                    const r = onBuyMeta ? onBuyMeta(key) : { error: '無法升級' };
                    setMetaMsg(r.error || `升級成功：${u.next(lv)}`);
                  }}
                  style={[styles.metaBtn, !can && styles.metaBtnOff]}
                >
                  <Text style={[styles.metaBtnText, !can && { color: C.muted }]}>{maxed ? '已滿級' : `${cost} 點`}</Text>
                  {!maxed ? <Text style={[styles.metaBtnSub, !can && { color: C.muted }]}>{u.next(lv)}</Text> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
        {metaMsg ? <Text style={styles.metaMsg}>{metaMsg}</Text> : null}
        <Text style={styles.foot}>每玩完一輩子，會依照那一生的成就換成點數（難度越高換越多）。買了的升級每一輩子都有效。</Text>
      </Sheet>

      {/* 傳說職業圖鑑 */}
      <Sheet visible={showLegend} onClose={() => setShowLegend(false)} title="傳說職業圖鑑" tall>
        <Text style={styles.foot}>
          這 {LEGENDS.length} 個職業沒辦法在「找工作」裡選到。每一輩子只會遇到一次，而且要真的達到條件，才會有人來找你。解鎖過的會永久記在這裡。
        </Text>
        <View style={[styles.card, { marginTop: 12 }]}>
          {LEGENDS.map((l, i) => {
            const on = got[l.id];
            return (
              <View key={l.id} style={[styles.metaRow, i > 0 && styles.rowLine]}>
                <Text style={[styles.rowIcon, !on && { opacity: 0.45 }]}>{on ? l.icon : '🔒'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, !on && { color: C.muted }]}>{l.name}{on ? `　${on.age} 歲達成` : ''}</Text>
                  <Text style={styles.metaNow}>{l.hint}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </Sheet>

      {/* 最佳紀錄 */}
      <Sheet visible={showBest} onClose={() => setShowBest(false)} title="最佳紀錄">
        {best ? (
          <View style={styles.ptsBox}>
            <Text style={styles.ptsNum}>{formatMoney(best.nw)}</Text>
            <Text style={styles.ptsLabel}>{best.name}．{best.title}{best.achievedAge ? `．${best.achievedAge} 歲破億` : ''}</Text>
          </View>
        ) : (
          <View style={styles.ptsBox}><Text style={styles.ptsLabel}>還沒有紀錄，玩完一輩子就會出現。</Text></View>
        )}
        <View style={styles.card}>
          <View style={styles.metaRow}><Text style={styles.rowIcon}>🔁</Text><Text style={styles.rowTitle}>玩過的人生</Text><Text style={styles.metaNow}>{m.lives} 輩子</Text></View>
          <View style={[styles.metaRow, styles.rowLine]}><Text style={styles.rowIcon}>⭐</Text><Text style={styles.rowTitle}>累積拿過的點數</Text><Text style={styles.metaNow}>{m.earned} 點</Text></View>
          <View style={[styles.metaRow, styles.rowLine]}><Text style={styles.rowIcon}>🏆</Text><Text style={styles.rowTitle}>解鎖的傳說職業</Text><Text style={styles.metaNow}>{gotCount} / {LEGENDS.length}</Text></View>
        </View>
      </Sheet>

      {/* 排行榜：歷代人生 */}
      <Sheet visible={showBoard} onClose={() => setShowBoard(false)} title="排行榜" tall>
        <Text style={styles.boardHint}>你玩過的每一輩子都會上榜，依最後的淨資產排名。</Text>
        {(board || []).length === 0 ? (
          <View style={styles.ptsBox}><Text style={styles.ptsLabel}>還沒有人上榜，玩完一輩子就會出現。</Text></View>
        ) : (
          <View style={styles.card}>
            {(board || []).map((x, i) => {
              const d = DIFFICULTIES.find((q) => q.id === x.diff);
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
              return (
                <View key={x.id || i} style={[styles.metaRow, i > 0 && styles.rowLine]}>
                  <Text style={[styles.rowIcon, i > 2 && { fontSize: 15, color: C.muted, fontWeight: '700' }]}>{medal}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{x.name}{x.achievedAge ? '　🏆' : ''}</Text>
                    <Text style={styles.metaNow} numberOfLines={1}>
                      {d ? d.name : '普通'}．{x.title}．活到 {x.age} 歲{x.achievedAge ? `．${x.achievedAge} 歲破億` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.boardNw, x.nw < 0 && { color: C.red }]}>{formatMoney(x.nw)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Sheet>

      {/* 怎麼玩 */}
      <Sheet visible={showHow} onClose={() => setShowHow(false)} title="怎麼玩" tall>
        <View style={styles.card}>
          {HOW.map((h, i) => (
            <View key={h.title} style={[styles.metaRow, i > 0 && styles.rowLine, { alignItems: 'flex-start' }]}>
              <Text style={styles.rowIcon}>{h.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{h.title}</Text>
                <Text style={styles.howText}>{h.text}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.foot}>開始遊戲後，畫面上還會有一步步的新手教學帶你走一遍。</Text>
        <Button title="知道了" style={{ marginTop: 14, marginBottom: 6 }} onPress={() => setShowHow(false)} />
      </Sheet>
    </View>
  );
}

const GLASS_BG = 'rgba(20,28,70,0.55)';
const GLASS_LINE = 'rgba(140,170,255,0.35)';

const styles = StyleSheet.create({
  wrap: { paddingTop: 6 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 6 },
  lvPill: { backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_LINE, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  lvText: { color: '#ffd76a', fontSize: 12, fontWeight: '700' },
  brand: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ptsPill: { backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_LINE, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  ptsText: { color: '#fff', fontSize: 12.5, fontWeight: '700', fontVariant: ['tabular-nums'] },

  player: {
    marginHorizontal: 14, marginTop: -26, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(40,50,140,0.75)', borderWidth: 1, borderColor: 'rgba(160,180,255,0.55)', overflow: 'hidden',
    shadowColor: '#4c6fff', shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  playerName: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  playerMoney: { color: '#ffd76a', fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  coin: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f5a524', borderWidth: 2, borderColor: '#ffe08a', alignItems: 'center', justifyContent: 'center' },
  coinText: { color: '#8a5a00', fontSize: 11, fontWeight: '900', lineHeight: 13 },
  playerStage: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  play: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: '#5b4bff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#9fb2ff', shadowColor: '#7b8dff', shadowOpacity: 0.8, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  playIcon: { color: '#fff', fontSize: 26, marginLeft: 4 },

  form: { marginHorizontal: 14, marginTop: 14, borderRadius: 22, padding: 12, backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_LINE },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(10,15,50,0.6)', borderWidth: 1, borderColor: 'rgba(140,170,255,0.35)', paddingRight: 12 },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#fff', outlineStyle: 'none' },
  pen: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  genderCard: { flex: 1, height: 76, flexDirection: 'row', alignItems: 'center', borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(10,15,50,0.55)', borderWidth: 1, borderColor: 'rgba(140,170,255,0.3)' },
  face: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 118, height: 76 },
  genderName: { position: 'absolute', right: 16, fontSize: 17, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  pickOn: { backgroundColor: 'rgba(80,90,255,0.55)', borderColor: '#9fb2ff' },
  pickHell: { backgroundColor: 'rgba(120,40,200,0.6)', borderColor: '#c68cff' },
  pickText: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  divider: { height: 1, backgroundColor: 'rgba(140,170,255,0.25)', marginTop: 12 },
  diffCard: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(10,15,50,0.55)', borderWidth: 1, borderColor: 'rgba(140,170,255,0.3)' },
  diffBg: { width: '100%', aspectRatio: 100 / 82 },
  diffLabel: { paddingVertical: 5, alignItems: 'center' },
  randCard: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: 'rgba(10,15,50,0.55)', borderWidth: 1, borderColor: 'rgba(140,170,255,0.3)',
  },
  randDice: { fontSize: 24 },
  randSub: { marginTop: 2, fontSize: 11.5, color: 'rgba(200,215,255,0.65)' },
  rollWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,11,34,0.88)',
  },
  rollCard: {
    alignItems: 'center', paddingVertical: 30, paddingHorizontal: 40, borderRadius: 22,
    backgroundColor: 'rgba(24,32,86,0.95)', borderWidth: 1.5, borderColor: 'rgba(159,178,255,0.6)',
  },
  rollHell: { backgroundColor: 'rgba(56,20,92,0.95)', borderColor: '#c68cff' },
  rollDice: { fontSize: 46 },
  rollLabel: { marginTop: 10, fontSize: 12, letterSpacing: 2, color: 'rgba(200,215,255,0.6)' },
  rollName: { marginTop: 6, fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  rollSub: { marginTop: 8, fontSize: 12.5, color: 'rgba(200,215,255,0.75)' },
  primary: {
    marginTop: 14, backgroundColor: '#6a5cff', borderRadius: 18, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#b39cff',
    shadowColor: '#7b6cff', shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  primaryOff: { backgroundColor: 'rgba(106,92,255,0.3)', borderColor: 'rgba(179,156,255,0.3)', shadowOpacity: 0 },
  primaryText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  danger: { backgroundColor: 'rgba(240,68,56,0.85)', borderColor: '#ff8a80' },
  cancel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 10 },

  tiles: { flexDirection: 'row', gap: 10, marginTop: 14, marginHorizontal: 14 },
  tile: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_LINE },
  tileImg: { width: '100%', aspectRatio: 0.92, justifyContent: 'flex-end' },
  tileText: { alignItems: 'center', paddingVertical: 6, backgroundColor: 'rgba(5,8,30,0.6)' },
  tileTitle: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  tileValue: { fontSize: 14, fontWeight: '700', color: '#ffd76a', marginTop: 2, fontVariant: ['tabular-nums'] },
  tileBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: C.green, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  tileBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  credit: { marginTop: 18, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: 1.5 },
  tabBar: {
    position: 'absolute', bottom: 0, left: 0, flexDirection: 'row', paddingTop: 8, paddingHorizontal: 6,
    backgroundColor: 'rgba(12,18,50,0.85)', borderTopWidth: 1, borderTopColor: 'rgba(140,170,255,0.3)',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 22, color: 'rgba(255,255,255,0.7)' },
  tabLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: '600' },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7db4ff', marginTop: 3 },

  // sheet 內的清單（淺色）
  card: { backgroundColor: C.card, borderRadius: 14, overflow: 'hidden' },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#c8c8cc' },
  rowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  rowTitle: { flex: 1, fontSize: 16, color: C.ink },
  foot: { fontSize: 12.5, color: C.muted, lineHeight: 18, marginTop: 8, paddingHorizontal: 4 },
  ptsBox: { alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  boardHint: { fontSize: 12.5, color: C.muted, marginBottom: 10, paddingHorizontal: 4 },
  boardNw: { fontSize: 15, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  ptsNum: { fontSize: 40, fontWeight: '700', color: C.ink, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  ptsLabel: { fontSize: 12.5, color: C.muted, marginTop: 2, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  metaLv: { fontSize: 12.5, color: C.primaryInk, fontWeight: '500' },
  metaNow: { fontSize: 12.5, color: C.muted, marginTop: 2, lineHeight: 17 },
  metaBtn: { alignItems: 'center', backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, minWidth: 84 },
  metaBtnOff: { backgroundColor: C.page },
  metaBtnText: { fontSize: 13.5, fontWeight: '600', color: '#fff' },
  metaBtnSub: { fontSize: 10.5, fontWeight: '500', color: 'rgba(255,255,255,0.9)', marginTop: 1 },
  metaMsg: { fontSize: 13, color: C.primaryInk, fontWeight: '500', marginTop: 10, textAlign: 'center' },
  howText: { fontSize: 13.5, color: C.muted, lineHeight: 19, marginTop: 3 },
});
