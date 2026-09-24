// Reunion10sScene.jsx
// 同學會十秒場：四個選項各有自己的十秒動畫
// 需要：react、framer-motion、tailwindcss
//
// 時間軸：0 待機用餐 → 1 起手式（0–2s）→ 2 核心特效（2–5s）
//         → 3 全場敬酒拍手（5–8s）→ 4 結果卡（8–10s）
//
// 人物圖請用「全身、透明背景」的直式 PNG，切齊頭頂和鞋底。
// 六個人平均分散成一排，不互相遮住；版面用身高排，每個人在畫面上一樣高
// （玩家高一點），鞋子剛好落在前景圓桌的上緣。
// 「跟第一名的同學拚一下」維持遊戲原本的做法：座位不動，資產折線圖放在舞台下方。
// 下面先放 placehold.co 的 300x600 佔位圖，換成自己的網址就好。
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// ==========================================
// 模擬資料：頭像換成你自己的網址就能直接接上去
// ==========================================
const mockPlayerData = {
  id: 'player_0',
  name: '童振坤',
  job: '玩家',
  avatar: 'https://placehold.co/300x600/2b3270/ffd76a?text=%E4%BD%A0',
  netWorth: 5000,
  isPlayer: true,
};

const mockSelectedClassmates = [
  { id: 'c1', name: '林怡君', job: '醫師',     avatar: 'https://placehold.co/300x600/2b3270/ffffff?text=%E9%86%AB%E5%B8%AB',    netWorth: 12000 },
  { id: 'c2', name: '楊智豪', job: '公務員',   avatar: 'https://placehold.co/300x600/2b3270/ffffff?text=%E5%85%AC%E5%8B%99%E5%93%A1', netWorth: 3500 },
  { id: 'c3', name: '廖依梅', job: '設計師',   avatar: 'https://placehold.co/300x600/2b3270/ffffff?text=%E8%A8%AD%E8%A8%88%E5%B8%AB', netWorth: 4200 },
  { id: 'c4', name: '蔡欣怡', job: '家庭主婦', avatar: 'https://placehold.co/300x600/2b3270/ffffff?text=%E4%B8%BB%E5%A9%A6',  netWorth: 2800 },
  { id: 'c5', name: '溫智強', job: '小店主',   avatar: 'https://placehold.co/300x600/2b3270/ffffff?text=%E5%B0%8F%E5%BA%97%E4%B8%BB',    netWorth: 6100 },
];

// 六個人平均分散成一排，不互相擋住。
// 全身圖都切齊頭頂和鞋底，所以用「身高」h 定位，每個人在畫面上一樣高
// （玩家高一點）；腳踩在圓桌後方，鞋子被桌子擋住。
// cx = 人物中心；top 讓腳踝連成一條微彎的弧線，中間的人站得比較後面。
const BOX_W = 16;
// feet = top + h，就是腳底在舞台上的位置（畫影子用）
const SEATS = [
  { cx: 9,  top: '14%', h: '44%', z: 2, plate: 'a', feet: 58 },
  { cx: 25, top: '16%', h: '44%', z: 3, plate: 'b', feet: 60 },
  { cx: 41, top: '18%', h: '44%', z: 4, plate: 'a', feet: 62 },
  { cx: 57, top: '13%', h: '50%', z: 6, plate: 'b', feet: 63 },  // 玩家
  { cx: 73, top: '16%', h: '44%', z: 3, plate: 'a', feet: 60 },
  { cx: 89, top: '14%', h: '44%', z: 2, plate: 'b', feet: 58 },
];
// 名牌在桌上排成一前一後兩列，這樣六張牌不會擠在一起
const PLATE_Y = { a: '64%', b: '74%' };

const OPTIONS = [
  { key: 'treat',   label: '大方請客',           sub: '花一筆錢，人緣大增，可能談到生意', icon: '💳' },
  { key: 'chat',    label: '低調吃飯聊天',       sub: '不花什麼錢',                       icon: '🍜' },
  { key: 'invest',  label: '跟同學交換投資情報', sub: '可能學到東西，也可能被帶進坑',     icon: '📈' },
  { key: 'compete', label: '跟第一名的同學拚一下', sub: '不服氣就衝，輸了很傷',           icon: '⚔️' },
];

const RESULTS = {
  treat: {
    tone: 'good',
    title: '你把帳單收走了',
    text: '一整桌都在敬你，散場時有人塞了名片給你，說下次有案子找你談。',
    deltas: [['💰 現金', '-8 萬', 'bad'], ['🤝 人緣', '+12', 'good'], ['😄 快樂', '+5', 'good']],
  },
  chat: {
    tone: 'neutral',
    title: '吃得很飽，話也講夠了',
    text: '沒有人在比誰過得好，你們聊了三個小時國中的事，回家路上心情意外地輕。',
    deltas: [['😄 快樂', '+7', 'good'], ['🤝 人緣', '+2', 'good']],
  },
  invest: {
    tone: 'good',
    title: '有人偷偷跟你說了一支',
    text: '你記下了代號，也記下了他講話時閃爍的眼神。回家查了三個晚上的財報才決定。',
    deltas: [['📊 投資眼光', '+6', 'good'], ['😄 快樂', '-2', 'bad']],
  },
  compete: {
    tone: 'bad',
    title: '你認真了，他笑笑的',
    text: '你把這些年做的都講了一遍，他只說「不錯啊」。回家的車上你安靜了很久。',
    deltas: [['🔥 鬥志', '+10', 'good'], ['😄 快樂', '-6', 'bad']],
  },
};

const TONE = {
  good: { ring: 'ring-emerald-400/60', text: 'text-emerald-300' },
  bad: { ring: 'ring-rose-400/60', text: 'text-rose-300' },
  neutral: { ring: 'ring-indigo-400/60', text: 'text-indigo-200' },
};

// ─────────── 一個人 ───────────
function Character({ c, seat, opt, stage, isTop, idx = 0 }) {
  const isPlayer = !!c.isPlayer;
  const idle = !opt || stage === 0;

  // 每個選項在每個階段，這個人要做什麼動作
  const anim = (() => {
    // 待機：一桌人正在吃飯，輕輕晃、輕輕呼吸，每個人節奏錯開
    if (idle) return { y: [0, -3.5, 0], scale: 1, rotate: [0, idx % 2 ? 0.7 : -0.7, 0] };
    if (opt === 'treat') {
      if (isPlayer) return { y: stage >= 1 ? -14 : 0, scale: stage >= 1 ? 1.1 : 1, rotate: 0 };
      if (stage >= 3) return { y: [0, -16, 0], scale: 1.04, rotate: [0, -4, 4, 0] };
      return { y: 0, scale: 1, rotate: 0 };
    }
    if (opt === 'chat') {
      if (stage >= 2) return { y: [0, -4, 0], scale: 1, rotate: 0 };
      return { y: 0, scale: 1, rotate: 0 };
    }
    if (opt === 'invest') {
      if (stage >= 2) return { y: 8, scale: isPlayer ? 1.06 : 1.02, rotate: 0 };
      return { y: 0, scale: 1, rotate: 0 };
    }
    // 拚一下：座位完全不動，比較的內容放在舞台下面的折線圖
    if (opt === 'compete') return { y: 0, scale: 1, rotate: 0 };
    return { y: 0, scale: 1, rotate: 0 };
  })();

  const spotlight = opt === 'compete' && stage >= 2 && (isPlayer || isTop);

  return (
    <div
      className="absolute no-sel flex justify-center items-start"
      style={{ left: seat.cx - BOX_W / 2 + '%', top: seat.top, width: BOX_W + '%', height: seat.h, zIndex: seat.z }}
    >
      <motion.div
        className="h-full flex justify-center items-start"
        style={{ originY: 1 }}
        animate={anim}
        transition={
          idle
            ? { duration: 2.4 + idx * 0.28, repeat: Infinity, ease: 'easeInOut' }
            : {
                duration: stage >= 3 ? 0.55 : 0.5,
                repeat: (opt === 'treat' && stage >= 3 && !isPlayer) || (opt === 'chat' && stage >= 2) ? Infinity : 0,
                repeatDelay: opt === 'chat' ? 0.9 : 0.35,
                ease: 'easeOut',
              }
        }
      >
        <img
          src={c.avatar}
          alt={c.name}
          draggable="false"
          style={{
            height: '100%',
            width: 'auto',
            maxWidth: 'none',
            objectFit: 'contain',
            filter: isPlayer
              ? 'drop-shadow(0 0 12px rgba(255,215,106,0.55))'
              : spotlight
              ? 'drop-shadow(0 0 14px rgba(157,140,255,0.9))'
              : 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))',
          }}
        />
      </motion.div>
    </div>
  );
}

// 桌上的名牌
function PlaceCard({ c, seat }) {
  const isPlayer = !!c.isPlayer;
  return (
    <div
      className="absolute z-[7] no-sel pointer-events-none"
      style={{ left: seat.cx + '%', top: PLATE_Y[seat.plate], transform: 'translateX(-50%)' }}
    >
      <div
        className={
          'plate px-1.5 py-0.5 rounded text-center leading-tight border ' +
          (isPlayer ? 'bg-amber-200 border-amber-500' : 'bg-white border-amber-900/30')
        }
      >
        <div className="text-[10px] sm:text-xs font-black text-slate-900 whitespace-nowrap">
          {isPlayer ? '你' : c.name}
        </div>
        <div className="text-[8px] sm:text-[10px] text-slate-500 whitespace-nowrap">{c.job}</div>
      </div>
    </div>
  );
}

// ─────────── 請客：信用卡 + 對話框 + 彩帶 ───────────
function TreatFx({ stage }) {
  const confetti = useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.8,
      color: ['#ffd76a', '#9d8cff', '#4ade80', '#ff8fa3', '#7dd3fc'][i % 5],
    })),
    []
  );
  return (
    <>
      <AnimatePresence>
        {stage >= 2 && (
          <motion.div
            key="card"
            className="absolute z-[8]"
            style={{ left: '62%', top: '24%', width: '12%' }}
            initial={{ opacity: 0, y: 50, rotate: -20 }}
            animate={{ opacity: 1, y: 0, rotate: [-5, 5, -5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, rotate: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }}
          >
            <div className="w-full aspect-[1.6/1] rounded-lg bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 shadow-xl border border-amber-100/70 p-[6%] flex flex-col justify-between">
              <div className="w-[26%] aspect-[1.35/1] rounded-[3px] bg-amber-100/80 border border-amber-700/40" />
              <div className="text-[7px] sm:text-[9px] font-black text-amber-900 tracking-widest text-right">VIP</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage >= 2 && (
          <motion.div
            key="bubble"
            className="absolute z-[8]"
            style={{ left: '2%', top: '22%' }}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <div className="bg-white rounded-full px-3 py-1.5 shadow-lg">
              <span className="text-[11px] sm:text-sm font-black text-slate-900">今天我請客！</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage >= 3 && (
          <div key="conf" className="absolute inset-0 z-[9] pointer-events-none overflow-hidden">
            {confetti.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-[1px]"
                style={{ left: p.x + '%', top: '-6%', width: 6, height: 11, backgroundColor: p.color }}
                initial={{ y: 0, opacity: 0, rotate: 0 }}
                animate={{ y: 420, opacity: [0, 1, 1, 0], rotate: 540 }}
                transition={{ duration: 2.4, delay: p.delay, repeat: Infinity, ease: 'linear' }}
              />
            ))}
            {['🙌', '👏', '🥂', '🎉'].map((e, i) => (
              <motion.div
                key={e}
                className="absolute text-lg sm:text-2xl"
                style={{ left: [10, 34, 62, 86][i] + '%', top: '4%' }}
                initial={{ opacity: 0, scale: 0.4, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
                transition={{ duration: 1, delay: i * 0.12, repeat: Infinity, repeatType: 'reverse' }}
              >
                {e}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────── 低調吃飯：碗、熱氣、對話 ───────────
function ChatFx({ stage }) {
  const lines = ['還記得三年二班嗎', '你女兒幾歲了', '欸那個老師還在', '最近還好嗎'];
  return (
    <>
      <AnimatePresence>
        {stage >= 2 && (
          <div key="bowls" className="absolute inset-0 z-[7] pointer-events-none">
            {[9, 25, 41, 57, 73, 89].map((x, i) => (
              <motion.div
                key={x}
                className="absolute text-base sm:text-xl"
                style={{ left: x - 2 + '%', top: '78%' }}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              >
                {i % 2 ? '🍵' : '🍜'}
                <motion.span
                  className="absolute -top-3 left-1 text-[10px] text-white/80"
                  animate={{ y: [2, -8], opacity: [0.15, 0.85, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.25 }}
                >
                  〰
                </motion.span>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage >= 3 && (
          <div key="talk" className="absolute inset-0 z-[9] pointer-events-none">
            {lines.map((t, i) => (
              <motion.div
                key={t}
                className="absolute bg-white/95 rounded-full px-2.5 py-1 shadow"
                style={{ left: [6, 62, 20, 70][i] + '%', top: [10, 4, 40, 36][i] + '%' }}
                initial={{ opacity: 0, scale: 0.5, y: 8 }}
                animate={{ opacity: [0, 1, 1, 0], scale: 1, y: 0 }}
                transition={{ duration: 2.6, delay: i * 0.55, repeat: Infinity, repeatDelay: 1.2 }}
              >
                <span className="text-[9px] sm:text-[11px] font-bold text-slate-800 whitespace-nowrap">{t}</span>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────── 交換情報：走勢圖面板 ───────────
function InvestFx({ stage }) {
  const path = 'M5,40 L26,35 L48,39 L69,25 L91,29 L112,14 L134,18 L155,6';
  return (
    <>
      <AnimatePresence>
        {stage >= 2 && (
          <motion.div
            key="chart"
            className="absolute z-[9]"
            style={{ bottom: '4%', left: '25%', width: '50%' }}
            initial={{ opacity: 0, y: 40, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          >
            <div className="rounded-xl bg-slate-900/90 border border-indigo-400/40 p-2 backdrop-blur">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] sm:text-[11px] font-bold text-slate-300">他說的那一支</span>
                <span className="text-[9px] sm:text-[11px] font-black text-emerald-400">+184%</span>
              </div>
              <svg viewBox="0 0 160 46" className="w-full h-auto">
                {[11, 25, 39].map((y) => (
                  <line key={y} x1="5" x2="155" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                ))}
                <motion.path
                  d={path}
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2.2, ease: 'easeInOut' }}
                />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage >= 3 && (
          <div key="react" className="absolute inset-0 z-[9] pointer-events-none">
            {['📈', '🤫', '💸', '📉'].map((e, i) => (
              <motion.div
                key={e}
                className="absolute text-lg sm:text-2xl"
                style={{ left: [10, 33, 60, 85][i] + '%', top: [8, 2, 6, 10][i] + '%' }}
                initial={{ opacity: 0, y: 14, scale: 0.4 }}
                animate={{ opacity: 1, y: [0, -7, 0], scale: 1 }}
                transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity, repeatType: 'reverse' }}
              >
                {e}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────── 5–8 秒：全場舉杯敬酒、拍手 ───────────
// 每個人頭上冒出一個動作，錯開時間，看起來像一桌人真的在互動。
const TOAST = {
  treat:  ['🥂', '🙌', '🍻', '🥂', '🍻', '🎉'],
  chat:   ['😆', '🍻', '😄', '🥢', '😆', '🍵'],
  invest: ['👏', '🤔', '📈', '😮', '👏', '🤫'],
};
function ToastFx({ stage, opt }) {
  const set = TOAST[opt];
  return (
    <AnimatePresence>
      {stage >= 3 && set && (
        <div key="toast" className="absolute inset-0 z-[9] pointer-events-none">
          {SEATS.map((s, i) => (
            <motion.div
              key={'t' + i}
              className="absolute text-lg sm:text-2xl"
              style={{ left: s.cx - 2 + '%', top: 'calc(' + s.top + ' - 7%)' }}
              initial={{ opacity: 0, scale: 0.3, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: [0, -9, 0] }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{
                duration: 1.1,
                delay: i * 0.13,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeOut',
              }}
            >
              {set[i] || null}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// ─────────── 拚一下：舞台下方的資產折線圖（跟遊戲裡原本的做法一樣）───────────
// 從 22 歲（或更早）一路畫到現在，你是金色、對手是紅色，線一格一格長出來。
function rivalSeries(player, top) {
  const ages = [];
  for (let a = 18; a <= 25; a += 1) ages.push(a);
  const grow = (end) => ages.map((_, i) => {
    const t = i / Math.max(1, ages.length - 1);
    return Math.round(end * t * t);
  });
  return { ages, mine: grow(player.netWorth), theirs: grow(top.netWorth) };
}

function RivalChart({ player, top, w = 100, h = 132 }) {
  const { ages, mine, theirs } = useMemo(() => rivalSeries(player, top), [player, top]);
  const [n, setN] = useState(2);
  useEffect(() => {
    let i = 2;
    const id = setInterval(() => {
      i += 1;
      setN(Math.min(i, ages.length));
      if (i >= ages.length) clearInterval(id);
    }, Math.max(60, 1600 / ages.length));
    return () => clearInterval(id);
  }, [ages.length]);

  const W = 320;
  const H = h;
  const max = Math.max(1, ...mine, ...theirs);
  const px = (i) => 14 + (i / Math.max(1, ages.length - 1)) * (W - 28);
  const py = (v) => H - 24 - (v / max) * (H - 50);
  const pts = (arr) => arr.slice(0, n).map((v, i) => px(i) + ',' + py(v)).join(' ');
  const end = (arr) => ({ x: px(n - 1), y: py(arr[n - 1]) });
  const e1 = end(mine);
  const e2 = end(theirs);

  return (
    <div className="relative w-full rounded-xl bg-slate-950/85 border border-amber-300/35 overflow-hidden">
      <svg viewBox={'0 0 ' + W + ' ' + H} className="w-full h-auto block">
        {[0.3, 0.55, 0.8].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        ))}
        <polyline points={pts(theirs)} fill="none" stroke="#ff6b6b" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={pts(mine)} fill="none" stroke="#ffd76a" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={e2.x} cy={e2.y} r="5" fill="#ff6b6b" stroke="#fff" strokeWidth="2" />
        <circle cx={e1.x} cy={e1.y} r="5" fill="#ffd76a" stroke="#fff" strokeWidth="2" />
        <text x="12" y="16" fontSize="11" fontWeight="800" fill="#ffd76a">━ 你</text>
        <text x="52" y="16" fontSize="11" fontWeight="800" fill="#ff8a8a">{'━ ' + top.name}</text>
        <text x={W - 12} y={H - 6} fontSize="10" fill="rgba(255,255,255,0.45)" textAnchor="end">{ages[n - 1] + ' 歲'}</text>
        <text x="12" y={H - 6} fontSize="10" fill="rgba(255,255,255,0.45)">{ages[0] + ' 歲'}</text>
      </svg>
    </div>
  );
}

// ==========================================
export default function Reunion10sScene({
  player = mockPlayerData,
  selectedClassmates = mockSelectedClassmates,
  onFinish = () => {},
}) {
  // 玩家排在正中間（index 4），共 6 人
  const allCharacters = useMemo(() => {
    const list = [...selectedClassmates];
    list.splice(3, 0, player);
    return list.slice(0, 6);
  }, [player, selectedClassmates]);

  // 資產最高的同學（拚一下的對手）
  const topRankedClassmate = useMemo(
    () => [...selectedClassmates].sort((a, b) => b.netWorth - a.netWorth)[0],
    [selectedClassmates]
  );

  const [activeOption, setActiveOption] = useState(null);
  const [animStage, setAnimStage] = useState(0);
  // 0 待機｜1 起手式（0–2s）｜2 核心特效（2–5/6s）｜3 全場互動（–8s）｜4 結果卡（8–10s）
  const [timerProgress, setTimerProgress] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const timers = useRef([]);

  const clearAll = () => {
    timers.current.forEach((t) => (typeof t === 'number' ? clearTimeout(t) : clearInterval(t)));
    timers.current = [];
  };
  useEffect(() => clearAll, []);

  const handleSelectOption = (option) => {
    if (isLocked) return;
    setIsLocked(true);
    setActiveOption(option);
    setAnimStage(1);
    setTimerProgress(0);

    timers.current.push(setTimeout(() => setAnimStage(2), 2000));   // 起手式結束
    timers.current.push(setTimeout(() => setAnimStage(3), 5000));   // 全場敬酒拍手
    timers.current.push(setTimeout(() => setAnimStage(4), 8000));   // 結果卡

    const started = Date.now();
    const iv = setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / 10000) * 100);
      setTimerProgress(p);
      if (p >= 100) clearInterval(iv);
    }, 50);
    timers.current.push(iv);
  };

  const handleContinue = () => {
    clearAll();
    setActiveOption(null);
    setAnimStage(0);
    setTimerProgress(0);
    setIsLocked(false);
    onFinish(activeOption);
  };

  const result = activeOption ? RESULTS[activeOption] : null;
  const tone = result ? TONE[result.tone] : TONE.neutral;

  return (
    <div className="min-h-full w-full px-4 py-6 flex justify-center">
      <div className="w-full max-w-[560px] flex flex-col gap-4">
        <header className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold tracking-[0.2em] text-amber-300">25 歲．同學會</div>
            <h1 className="text-2xl font-black leading-tight">今晚這一桌</h1>
          </div>
          <div className="text-[11px] text-indigo-200/70 text-right leading-snug">
            選一個做法<br />看完十秒鐘
          </div>
        </header>

        {/* 舞台 */}
        <div className="stage-bg relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-indigo-400/25 shadow-2xl">
          {/* 暖燈 */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[46%] h-[16%] rounded-b-full bg-amber-200/25 blur-xl" />

          {/* 低調吃飯時整桌暗一點 */}
          <AnimatePresence>
            {activeOption === 'chat' && animStage >= 1 && (
              <motion.div
                key="dim"
                className="absolute inset-0 bg-slate-950 z-[6]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.32 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>

          {/* 腳下的影子 */}
          {SEATS.map((s, i) => (
            <div
              key={'sh' + i}
              className="absolute z-[1] pointer-events-none"
              style={{
                left: s.cx - 5 + '%', top: s.feet - 1.6 + '%', width: '10%', height: '3.2%',
                borderRadius: '50%',
                background: 'radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 72%)',
              }}
            />
          ))}

          {allCharacters.map((c, i) => (
            <Character
              key={c.id}
              c={c}
              idx={i}
              seat={SEATS[i]}
              opt={activeOption}
              stage={animStage}
              isTop={topRankedClassmate && c.id === topRankedClassmate.id}
            />
          ))}

          {/* 前景圓桌 */}
          <div
            className="table-top absolute z-[6] pointer-events-none"
            style={{ left: '-12%', right: '-12%', top: '60%', height: '62%', borderRadius: '50%' }}
          />

          {/* 玻璃轉盤＋幾道菜 */}
          <div
            className="absolute z-[6] pointer-events-none left-1/2 -translate-x-1/2 rounded-[50%] border border-white/50"
            style={{ top: '86%', width: '58%', height: '8%', background: 'linear-gradient(180deg,rgba(255,255,255,0.55),rgba(190,205,215,0.35))' }}
          />
          <motion.div
            className="absolute z-[6] pointer-events-none left-1/2 flex gap-[18%] text-sm sm:text-lg"
            style={{ top: '85%' }}
            animate={{ x: ['-50%', '-46%', '-54%', '-50%'] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span>🥟</span><span>🍲</span><span>🍗</span>
          </motion.div>

          {allCharacters.map((c, i) => (
            <PlaceCard key={'p' + c.id} c={c} seat={SEATS[i]} />
          ))}

          {activeOption === 'treat' && <TreatFx stage={animStage} />}
          {activeOption === 'chat' && <ChatFx stage={animStage} />}
          {activeOption === 'invest' && <InvestFx stage={animStage} />}
          <ToastFx stage={animStage} opt={activeOption} />


          {/* 十秒進度條 */}
          <AnimatePresence>
            {isLocked && (
              <motion.div
                key="bar"
                className="absolute left-0 right-0 bottom-0 h-1.5 bg-black/40 z-[10]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className="h-full bg-gradient-to-r from-amber-300 to-fuchsia-400"
                  style={{ width: timerProgress + '%' }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 拚一下：座位不動，折線圖放在舞台下方 */}
        <AnimatePresence>
          {activeOption === 'compete' && animStage >= 2 && topRankedClassmate && (
            <motion.div
              key="rival"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <RivalChart player={player} top={topRankedClassmate} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 選項 / 結果 */}
        <AnimatePresence mode="wait">
          {animStage < 4 ? (
            <motion.div
              key="options"
              className="flex flex-col gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {OPTIONS.map((o) => {
                const picked = activeOption === o.key;
                return (
                  <button
                    key={o.key}
                    onClick={() => handleSelectOption(o.key)}
                    disabled={isLocked}
                    className={
                      'group flex items-center gap-3 text-left rounded-2xl px-4 py-3 border transition ' +
                      (picked
                        ? 'bg-indigo-500/25 border-indigo-400 ring-2 ring-indigo-400/60'
                        : isLocked
                        ? 'bg-slate-800/40 border-white/10 opacity-40'
                        : 'bg-slate-800/60 border-indigo-400/35 hover:bg-slate-700/70 active:scale-[0.99]')
                    }
                  >
                    <span className="text-xl">{o.icon}</span>
                    <span className="flex-1">
                      <span className="block text-base font-bold">{o.label}</span>
                      <span className="block text-[11.5px] text-indigo-200/60">{o.sub}</span>
                    </span>
                    <span className={'text-xl ' + (picked ? 'text-indigo-300' : 'text-white/30')}>
                      {picked ? '✓' : '›'}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              className={'rounded-2xl bg-slate-900/80 border border-white/10 ring-1 p-4 flex flex-col gap-3 ' + tone.ring}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            >
              <div className={'text-lg font-black ' + tone.text}>{result.title}</div>
              <p className="text-[14.5px] leading-relaxed text-slate-200">{result.text}</p>
              <div className="flex flex-wrap gap-2">
                {result.deltas.map(([k, v, t], di) => (
                  <motion.span
                    key={k}
                    className={
                      'rounded-full px-3 py-1 text-[13px] font-bold ' +
                      (t === 'good' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300')
                    }
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 + di * 0.08 }}
                  >
                    {k} {v}
                  </motion.span>
                ))}
              </div>
              <button
                onClick={handleContinue}
                className="mt-1 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:scale-[0.99] transition py-3 text-base font-black text-white"
              >
                繼續
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[11px] leading-relaxed text-indigo-200/45">
          時間軸：0–2 秒起手式 → 2–5 秒核心特效 → 5–8 秒全場敬酒拍手 → 8–10 秒結果卡。沒選之前一桌人會自己輕輕動。
          四個選項的動作完全不同，可以按「繼續」再選別的看。
        </p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Reunion10sScene />);
