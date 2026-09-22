// 首頁的「微縮人生城市」：用等角投影的 SVG 畫一座小城，資產越多、房子和公司越多越高。
import { useMemo } from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Polygon, Rect, Circle, G, Path, Text as SvgText } from 'react-native-svg';

const TW = 46; // 一格的寬（等角菱形的一半寬 = TW/2）
const TH = 23; // 一格的高（菱形的一半高 = TH/2）

// 格子座標 → 畫面座標
const iso = (x, y, ox, oy) => [ox + (x - y) * (TW / 2), oy + (x + y) * (TH / 2)];

// 一個等角方塊（頂面、左面、右面）
function Block({ x, y, h, w = 1, d = 1, top, left, right, ox, oy, roof, windows }) {
  const [px, py] = iso(x, y, ox, oy);
  const hw = (TW / 2) * w; const hd = (TW / 2) * d;
  const vh = (TH / 2) * w; const vd = (TH / 2) * d;
  // 底面四個角（以 (x,y) 為後角）
  const A = [px, py]; // 後
  const B = [px + hw, py + vh]; // 右
  const Cc = [px + hw - hd, py + vh + vd]; // 前
  const D = [px - hd, py + vd]; // 左
  const up = (p) => [p[0], p[1] - h];
  const tA = up(A); const tB = up(B); const tC = up(Cc); const tD = up(D);
  const pts = (arr) => arr.map((p) => p.join(',')).join(' ');
  const wins = [];
  if (windows && h > 26) {
    const rows = Math.floor((h - 14) / 12);
    const faceWin = (from, to, n, key) => {
      for (let i = 0; i < n; i += 1) {
        const t = (i + 0.5) / n;
        const wx = from[0] + (to[0] - from[0]) * t;
        const wy = from[1] + (to[1] - from[1]) * t;
        for (let r = 0; r < rows; r += 1) {
          wins.push(<Rect key={`${key}${i}-${r}`} x={wx - 2.5} y={wy - 12 - r * 12} width={5} height={6} fill={windows} opacity={0.9} />);
        }
      }
    };
    faceWin(D, Cc, 2, 'l');
    faceWin(Cc, B, 2, 'r');
  }
  return (
    <G>
      <Polygon points={pts([D, Cc, tC, tD])} fill={left} />
      <Polygon points={pts([Cc, B, tB, tC])} fill={right} />
      <Polygon points={pts([tA, tB, tC, tD])} fill={roof || top} />
      {wins}
    </G>
  );
}

// 樹
function Tree({ x, y, ox, oy, size = 1 }) {
  const [px, py] = iso(x + 0.5, y + 0.5, ox, oy);
  return (
    <G>
      <Rect x={px - 1.5} y={py - 8 * size} width={3} height={8 * size} fill="#6b4f3a" />
      <Circle cx={px} cy={py - 12 * size} r={7 * size} fill="#3ddc97" />
      <Circle cx={px - 4 * size} cy={py - 8 * size} r={5 * size} fill="#2bbf7f" />
    </G>
  );
}

// 金幣（上升中的資產）
function Coin({ cx, cy, r, glow }) {
  return (
    <G>
      {glow ? <Circle cx={cx} cy={cy} r={r * 1.9} fill="url(#coinGlow)" /> : null}
      <Circle cx={cx} cy={cy} r={r} fill="url(#coin)" stroke="#ffe08a" strokeWidth={1} />
      <SvgText x={cx} y={cy + r * 0.42} fontSize={r * 1.2} fontWeight="900" fill="#b8730a" textAnchor="middle">$</SvgText>
    </G>
  );
}

// 依資產決定城市長什麼樣
export function cityTier(nw) {
  if (nw >= 1e8) return 5;
  if (nw >= 3e7) return 4;
  if (nw >= 1e7) return 3;
  if (nw >= 2e6) return 2;
  if (nw >= 2e5) return 1;
  return 0;
}

export default function City({ nw = 0, houses = 0, bizs = 0, achieved = false, width = 340, height = 230, empty = false }) {
  const tier = empty ? 0 : cityTier(nw);
  const ox = width / 2; const oy = height * 0.42;
  const scene = useMemo(() => {
    const items = [];
    // 地面：4x4 的草地格
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const [px, py] = iso(x, y, ox, oy);
        const light = (x + y) % 2 === 0;
        items.push(<Polygon key={`g${x}${y}`} points={`${px},${py} ${px + TW / 2},${py + TH / 2} ${px},${py + TH} ${px - TW / 2},${py + TH / 2}`} fill={light ? '#2f3d7a' : '#2a366e'} />);
      }
    }
    // 道路（一條斜的）
    for (let i = 0; i < 4; i += 1) {
      const [px, py] = iso(i, 1.5, ox, oy);
      items.push(<Polygon key={`road${i}`} points={`${px},${py} ${px + TW / 2},${py + TH / 2} ${px},${py + TH} ${px - TW / 2},${py + TH / 2}`} fill="#3b4a8f" opacity={0.9} />);
    }
    const push = (el) => items.push(el);
    const P = { ox, oy };
    // 依畫面深度排序：後面的先畫（x+y 小的先）
    const buildings = [];
    const add = (x, y, h, w, d, palette, extra = {}) => buildings.push({ x, y, h, w, d, palette, ...extra });
    const HOUSE = { top: '#ff9f7a', left: '#f2d9c4', right: '#e9c7ad' };
    const APT = { top: '#a7b8ff', left: '#dfe6ff', right: '#c7d2ff', windows: '#ffd76a' };
    const OFFICE = { top: '#9d8cff', left: '#6c5ce7', right: '#5546c9', windows: '#cdefff' };
    const TOWER = { top: '#b39cff', left: '#7d6bff', right: '#6151e0', windows: '#ffe9a3' };
    const MANSION = { top: '#ffd76a', left: '#fff1c9', right: '#f2ddaa', windows: '#ffb547' };

    // tier 0：一間小房子和幾棵樹
    add(0, 3, 16, 0.9, 0.9, HOUSE, { roof: '#ff7f5c' });
    push(<Tree key="t1" x={3} y={3} {...P} />);
    push(<Tree key="t2" x={0} y={0} {...P} size={0.9} />);
    if (tier >= 1) { add(1, 3, 18, 0.9, 0.9, HOUSE, { roof: '#ff8f6a' }); push(<Tree key="t3" x={3} y={0} {...P} />); }
    if (tier >= 2) { add(3, 2, 48, 0.9, 0.9, APT); add(2, 3, 20, 0.9, 0.9, HOUSE, { roof: '#ffa07a' }); }
    if (tier >= 3) { add(0, 0, 70, 0.9, 0.9, OFFICE); add(2, 0, 40, 0.9, 0.9, APT); }
    if (tier >= 4) { add(3, 0, 100, 0.9, 0.9, TOWER); add(1, 0, 56, 0.9, 0.9, OFFICE); }
    if (tier >= 5) { add(3, 3, 30, 1.1, 1.1, MANSION, { roof: '#ffc850' }); add(0, 2, 120, 0.9, 0.9, TOWER); }
    // 玩家真的買的房子／公司：加在空格上
    const extraH = Math.min(houses, 2); const extraB = Math.min(bizs, 2);
    if (extraH >= 1 && tier < 5) add(3, 3, 26, 1, 1, MANSION, { roof: '#ffc850' });
    if (extraH >= 2 && tier < 2) add(2, 3, 20, 0.9, 0.9, HOUSE, { roof: '#ffa07a' });
    if (extraB >= 1 && tier < 3) add(0, 0, 60, 0.9, 0.9, OFFICE);
    if (extraB >= 2 && tier < 4) add(1, 0, 50, 0.9, 0.9, OFFICE);
    // 去重（同一格只留最高的）
    const byCell = {};
    for (const b of buildings) { const k = `${b.x},${b.y}`; if (!byCell[k] || byCell[k].h < b.h) byCell[k] = b; }
    Object.values(byCell).sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.x - b.x).forEach((b, i) => {
      push(<Block key={`b${i}`} x={b.x} y={b.y} h={b.h} w={b.w} d={b.d} {...b.palette} roof={b.roof} windows={b.palette.windows} {...P} />);
    });
    // 上升中的資產：右上角一串越來越高的金幣
    const coins = Math.min(6, 1 + tier);
    for (let i = 0; i < coins; i += 1) {
      push(<Coin key={`c${i}`} cx={width - 40 - i * 4} cy={height * 0.36 - i * 16} r={9 + i * 0.6} glow={i === coins - 1} />);
    }
    return items;
  }, [tier, houses, bizs, width, height, ox, oy]);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="coin" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffe28a" /><Stop offset="1" stopColor="#f5a524" />
        </LinearGradient>
        <RadialGradient id="coinGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffd76a" stopOpacity="0.55" /><Stop offset="1" stopColor="#ffd76a" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="ground" cx="50%" cy="45%" r="60%">
          <Stop offset="0" stopColor="#6c5ce7" stopOpacity={achieved ? 0.45 : 0.25} /><Stop offset="1" stopColor="#6c5ce7" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#ground)" />
      {/* 地面陰影 */}
      <Path d={`M ${ox} ${oy + 4} L ${ox + TW * 2} ${oy + TH * 2 + 4} L ${ox} ${oy + TH * 4 + 4} L ${ox - TW * 2} ${oy + TH * 2 + 4} Z`} fill="#000" opacity={0.28} />
      {scene}
    </Svg>
  );
}
