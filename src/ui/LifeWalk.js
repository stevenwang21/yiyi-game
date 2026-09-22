// 人生回顧上方的小劇場：主角從嬰兒爬、學走路、背書包上學、畢業、上班、到老，一路往前走。
// 背景（家 → 幼兒園 → 小學 → 中學 → 大學 → 辦公大樓 → 公園）會跟著年紀換，並且一直往後捲，看起來像在走路。
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Avatar } from './art';

const ND = Platform.OS !== 'web';

export function lifeStage(age) {
  if (age < 1) return 'baby';
  if (age < 3) return 'toddler';
  if (age < 6) return 'kinder';
  if (age < 12) return 'pupil';
  if (age < 18) return 'teen';
  if (age < 23) return 'college';
  if (age < 60) return 'adult';
  return 'old';
}

const SCALE = { baby: 0.5, toddler: 0.58, kinder: 0.66, pupil: 0.76, teen: 0.9, college: 0.97, adult: 1, old: 0.95 };
const SKY = {
  baby: ['#ffd6e8', '#fff1d6'], toddler: ['#ffd6e8', '#fff1d6'], kinder: ['#bfe6ff', '#fff4d6'],
  pupil: ['#8fd3ff', '#e6f7ff'], teen: ['#6fb8ff', '#d7efff'], college: ['#5a8cff', '#c9dcff'],
  adult: ['#3b4a9e', '#8aa2ff'], old: ['#ff9a6b', '#ffd6a3'],
};
const CLOTHES = {
  baby: '#ffd76a', toddler: '#ff9fc4', kinder: '#ffb547', pupil: '#ffffff', teen: '#ffffff',
  college: '#6a5cff', adult: '#2d3570', old: '#8a6e55',
};
const PANTS = { baby: '#ffd76a', toddler: '#7db4ff', kinder: '#3ddc97', pupil: '#2e4a9e', teen: '#223a7a', college: '#34405f', adult: '#1b2140', old: '#5b5b66' };

// ── 背景道具（每個階段一組，畫在 0..w 的範圍，會重複兩份一起捲動）──
function Props({ stage, w, h, ground, offset }) {
  const g = ground;
  const items = [];
  const tree = (x, s = 1, k = '') => (
    <G key={`t${k}${x}`}>
      <Rect x={x - 2 * s} y={g - 22 * s} width={4 * s} height={22 * s} fill="#7a5537" />
      <Circle cx={x} cy={g - 26 * s} r={12 * s} fill="#3ddc97" />
      <Circle cx={x - 7 * s} cy={g - 20 * s} r={8 * s} fill="#2bbf7f" />
    </G>
  );
  const building = (x, bw, bh, color, label, k, roof) => (
    <G key={`b${k}${x}`}>
      {roof ? <Polygon points={`${x - 4},${g - bh} ${x + bw / 2},${g - bh - roof} ${x + bw + 4},${g - bh}`} fill="#ff7f5c" /> : null}
      <Rect x={x} y={g - bh} width={bw} height={bh} fill={color} rx={3} />
      {Array.from({ length: Math.max(1, Math.floor(bw / 16)) }).map((_, i) => (
        Array.from({ length: Math.max(1, Math.floor((bh - 14) / 16)) }).map((__, j) => (
          <Rect key={`${i}-${j}`} x={x + 5 + i * 16} y={g - bh + 6 + j * 16} width={8} height={8} fill="rgba(255,255,255,0.75)" rx={1.5} />
        ))
      ))}
      {label ? <SvgText x={x + bw / 2} y={g - bh - (roof ? roof + 4 : 5)} fontSize={11} fontWeight="700" fill="#1b2140" textAnchor="middle">{label}</SvgText> : null}
    </G>
  );
  const k = `${offset}`;
  if (stage === 'baby' || stage === 'toddler') {
    items.push(building(w * 0.08, 70, 46, '#fff4e6', '家', k, 20), tree(w * 0.45, 1, k), tree(w * 0.62, 0.8, k), building(w * 0.72, 60, 40, '#ffe3ea', '', k, 18));
  } else if (stage === 'kinder') {
    items.push(building(w * 0.06, 96, 44, '#ffe07a', '幼兒園', k, 16), tree(w * 0.5, 0.9, k), <Circle key={`ball${k}`} cx={w * 0.62} cy={g - 7} r={7} fill="#ff6b8b" />, tree(w * 0.86, 1.1, k));
  } else if (stage === 'pupil') {
    items.push(building(w * 0.05, 120, 58, '#ffd6a3', '國小', k), <Rect key={`fl${k}`} x={w * 0.05 + 58} y={g - 86} width={2} height={28} fill="#555" />, <Rect key={`fg${k}`} x={w * 0.05 + 60} y={g - 86} width={14} height={9} fill="#ff5d52" />, tree(w * 0.55, 1, k), tree(w * 0.8, 0.9, k));
  } else if (stage === 'teen') {
    items.push(building(w * 0.04, 140, 70, '#d7e3ff', '中學', k), tree(w * 0.6, 1.1, k), building(w * 0.74, 50, 34, '#ffe9c7', '', k, 14));
  } else if (stage === 'college') {
    items.push(
      <G key={`col${k}`}>
        <Rect x={w * 0.05} y={g - 70} width={130} height={70} fill="#e9e3ff" rx={2} />
        <Polygon points={`${w * 0.05 - 6},${g - 70} ${w * 0.05 + 65},${g - 96} ${w * 0.05 + 136},${g - 70}`} fill="#b3a8ff" />
        {[0, 1, 2, 3, 4].map((i) => <Rect key={i} x={w * 0.05 + 12 + i * 24} y={g - 62} width={8} height={62} fill="#fff" />)}
        <SvgText x={w * 0.05 + 65} y={g - 100} fontSize={11} fontWeight="700" fill="#1b2140" textAnchor="middle">大學</SvgText>
      </G>,
      tree(w * 0.62, 1.2, k), tree(w * 0.85, 0.9, k),
    );
  } else if (stage === 'adult') {
    items.push(building(w * 0.02, 44, 92, '#5c6bd6', '', k), building(w * 0.02 + 50, 56, 120, '#7d8bff', '', k), building(w * 0.02 + 112, 40, 70, '#4a57b8', '', k), tree(w * 0.62, 0.9, k), building(w * 0.72, 60, 104, '#6a78e6', '', k));
  } else {
    items.push(
      tree(w * 0.12, 1.3, k), tree(w * 0.28, 1, k),
      <G key={`bench${k}`}>
        <Rect x={w * 0.45} y={g - 16} width={46} height={5} fill="#a0703f" rx={2} />
        <Rect x={w * 0.45} y={g - 26} width={46} height={4} fill="#a0703f" rx={2} />
        <Rect x={w * 0.45 + 4} y={g - 12} width={3} height={12} fill="#5b4028" />
        <Rect x={w * 0.45 + 39} y={g - 12} width={3} height={12} fill="#5b4028" />
      </G>,
      tree(w * 0.75, 1.2, k), tree(w * 0.9, 0.9, k),
    );
  }
  return <G transform={`translate(${offset},0)`}>{items}</G>;
}

// ── 主角的身體（頭用 Avatar 疊上去）──
function Body({ stage, frame, female, s = 1 }) {
  const clothes = CLOTHES[stage];
  const pants = PANTS[stage];
  const swing = stage === 'old' ? 10 : 22;
  const a = frame ? swing : -swing;
  if (stage === 'baby') {
    // 爬行：身體橫的，手腳一前一後
    return (
      <Svg width={80} height={60} viewBox="0 0 80 60">
        <Ellipse cx={42} cy={34} rx={20} ry={11} fill={clothes} />
        <G transform={`rotate(${frame ? 18 : -10} 28 40)`}><Rect x={25} y={38} width={6} height={16} rx={3} fill="#ffdbb4" /></G>
        <G transform={`rotate(${frame ? -12 : 16} 52 40)`}><Rect x={49} y={38} width={7} height={16} rx={3} fill="#ffdbb4" /></G>
        <Ellipse cx={42} cy={56} rx={22} ry={3} fill="rgba(0,0,0,0.18)" />
      </Svg>
    );
  }
  const skirt = female && (stage === 'teen' || stage === 'pupil');
  return (
    <Svg width={60 * s} height={100 * s} viewBox="0 0 60 100">
      <Ellipse cx={30} cy={97} rx={16} ry={3} fill="rgba(0,0,0,0.2)" />
      {/* 後面的手 */}
      <G transform={`rotate(${a} 16 38)`}><Rect x={13} y={36} width={6} height={24} rx={3} fill={stage === 'adult' || stage === 'old' || stage === 'college' ? clothes : '#ffdbb4'} /></G>
      {/* 書包 */}
      {stage === 'pupil' || stage === 'kinder' ? <Rect x={34} y={36} width={16} height={22} rx={4} fill={stage === 'pupil' ? '#ff5d52' : '#7db4ff'} /> : null}
      {stage === 'teen' ? <Rect x={36} y={38} width={13} height={20} rx={3} fill="#2d3570" /> : null}
      {/* 腳 */}
      <G transform={`rotate(${a} 26 62)`}><Rect x={23} y={60} width={7} height={30} rx={3} fill={pants} /><Ellipse cx={27} cy={91} rx={6} ry={3} fill="#1b1b24" /></G>
      <G transform={`rotate(${-a} 34 62)`}><Rect x={31} y={60} width={7} height={30} rx={3} fill={pants} /><Ellipse cx={35} cy={91} rx={6} ry={3} fill="#1b1b24" /></G>
      {/* 身體 */}
      <Rect x={17} y={32} width={26} height={32} rx={8} fill={clothes} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      {skirt ? <Polygon points="16,58 44,58 48,72 12,72" fill="#2e4a9e" /> : null}
      {stage === 'teen' || stage === 'pupil' ? <Polygon points="26,34 30,44 34,34" fill="#2e4a9e" /> : null}
      {stage === 'adult' ? <Polygon points="28,33 30,52 32,33" fill="#ff5d52" /> : null}
      {/* 前面的手（上班族拿公事包、老人拿拐杖） */}
      <G transform={`rotate(${-a} 44 38)`}>
        <Rect x={41} y={36} width={6} height={24} rx={3} fill={stage === 'adult' || stage === 'old' || stage === 'college' ? clothes : '#ffdbb4'} />
        {stage === 'adult' ? <Rect x={37} y={58} width={16} height={12} rx={2} fill="#6b4a2e" /> : null}
      </G>
      {stage === 'old' ? <Line x1={50} y1={52} x2={54} y2={96} stroke="#6b4a2e" strokeWidth={3} strokeLinecap="round" /> : null}
    </Svg>
  );
}

function GradCap({ size }) {
  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 50 30">
      <Polygon points="25,2 49,11 25,20 1,11" fill="#1b1b24" />
      <Rect x={15} y={13} width={20} height={9} fill="#1b1b24" />
      <Line x1={40} y1={11} x2={42} y2={24} stroke="#ffd76a" strokeWidth={2} />
    </Svg>
  );
}

export default function LifeWalk({ age, name, gender, width, height = 210, grad, playing }) {
  const stage = lifeStage(age);
  const [frame, setFrame] = useState(0);
  const scroll = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  // 走路：兩格動畫輪流
  useEffect(() => {
    if (!playing) return undefined;
    const ms = stage === 'old' ? 360 : stage === 'baby' ? 300 : 220;
    const id = setInterval(() => setFrame((f) => 1 - f), ms);
    return () => clearInterval(id);
  }, [playing, stage]);

  // 背景一直往後捲
  useEffect(() => {
    scroll.setValue(0);
    if (!playing) return undefined;
    const speed = stage === 'old' ? 9000 : stage === 'baby' ? 10000 : 6000;
    const loop = Animated.loop(Animated.timing(scroll, { toValue: 1, duration: speed, easing: Easing.linear, useNativeDriver: ND }));
    loop.start();
    return () => loop.stop();
  }, [playing, stage, width]);

  useEffect(() => {
    if (!playing) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 200, useNativeDriver: ND }),
      Animated.timing(bob, { toValue: 0, duration: 200, useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [playing]);

  const g = height - 26; // 地面
  const sky = SKY[stage];
  const s = SCALE[stage];
  const headSize = Math.round(stage === 'baby' ? 36 : 46 * Math.max(0.78, s));
  const bodyH = stage === 'baby' ? 60 : 100 * s;
  const bodyW = stage === 'baby' ? 80 : 60 * s;

  return (
    <View style={{ width, height, borderRadius: 20, overflow: 'hidden' }}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="lwSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky[0]} /><Stop offset="1" stopColor={sky[1]} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#lwSky)" />
        {stage === 'old' ? <Circle cx={width * 0.8} cy={height * 0.42} r={22} fill="#ffb36b" opacity={0.9} /> : <Circle cx={width * 0.85} cy={36} r={16} fill={stage === 'adult' ? '#fff4c2' : '#ffe07a'} opacity={0.95} />}
        <Ellipse cx={width * 0.25} cy={40} rx={30} ry={9} fill="rgba(255,255,255,0.7)" />
        <Ellipse cx={width * 0.55} cy={58} rx={22} ry={7} fill="rgba(255,255,255,0.55)" />
      </Svg>
      {/* 捲動的背景：兩份接在一起 */}
      <Animated.View style={[StyleSheet.absoluteFill, { width: width * 2, transform: [{ translateX: scroll.interpolate({ inputRange: [0, 1], outputRange: [0, -width] }) }] }]}>
        <Svg width={width * 2} height={height}>
          <Props stage={stage} w={width} h={height} ground={g} offset={0} />
          <Props stage={stage} w={width} h={height} ground={g} offset={width} />
          <Rect x={0} y={g} width={width * 2} height={height - g} fill={stage === 'adult' ? '#3a4278' : '#7ccf8a'} />
          {Array.from({ length: 24 }).map((_, i) => <Rect key={i} x={i * (width / 12)} y={g + 10} width={width / 24} height={3} fill="rgba(255,255,255,0.35)" />)}
        </Svg>
      </Animated.View>
      {/* 主角 */}
      <Animated.View
        style={{
          position: 'absolute', left: width / 2 - bodyW / 2, top: g - bodyH + (stage === 'baby' ? 4 : 2), width: bodyW, alignItems: 'center',
          transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, stage === 'baby' ? -1 : -3] }) }],
        }}
      >
        <Body stage={stage} frame={frame} female={gender === 'female'} s={s} />
        <View style={{ position: 'absolute', top: stage === 'baby' ? -6 : 32 * s - headSize * 0.86, left: stage === 'baby' ? -2 : bodyW / 2 - headSize / 2, alignItems: 'center' }}>
          {grad ? <View style={{ position: 'absolute', top: -headSize * 0.12, zIndex: 2 }}><GradCap size={headSize * 0.7} /></View> : null}
          <Avatar name={name} gender={gender} age={Math.max(8, age)} size={headSize} style={{ backgroundColor: 'transparent' }} />
        </View>
      </Animated.View>
    </View>
  );
}
