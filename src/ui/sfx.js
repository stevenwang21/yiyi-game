// 音效：全部用 Web Audio 當場合成，沒有任何音檔。
// 這樣做的好處：不用多下載幾 MB、離線照樣有聲音、曲子是自己寫的所以能隨時調。
// 網頁版才有聲音；App 版（Expo）沒裝 expo-av，直接當作沒這回事。
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEB = Platform.OS === 'web' && typeof window !== 'undefined';
const KEY = 'yiyi-sfx-v1';

let on = true;
let ac = null;
let master = null;

export const getSfx = () => on;
export const setSfx = (v) => {
  on = v;
  AsyncStorage.setItem(KEY, v ? 'on' : 'off').catch(() => {});
  if (v) play('tap');
};
AsyncStorage.getItem(KEY).then((v) => { if (v === 'off') on = false; }).catch(() => {});

function ctx() {
  if (!WEB) return null;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.32;      // 整體音量，不要吵到人
      master.connect(ac.destination);
    } catch (_) { return null; }
  }
  // 瀏覽器規定要有使用者動作才能出聲，所以每次播放前都試著喚醒
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}

// 音名 → 頻率（A4 = 440）
const SEMI = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
function f(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) return 440;
  let n = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  n += (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (n / 12);
}

// 一個音：兩個微微走音的振盪器疊起來比較厚，再走一個低通把刺耳的高頻磨掉
function note(a, t0, freq, dur, { type = 'triangle', gain = 0.5, detune = 6, cut = 4200, attack = 0.012 } = {}) {
  const g = a.createGain();
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = cut;
  g.connect(lp).connect(master);
  const peak = Math.max(0.0001, gain);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(peak * 0.55, t0 + Math.min(dur * 0.5, attack + 0.12));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  for (const d of [-detune, detune]) {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = d;
    o.connect(g);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
}

// 打擊感的短音（按鈕、金幣）
function blip(a, t0, freq, dur, gain = 0.35) {
  const g = a.createGain();
  g.connect(master);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const o = a.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t0);
  o.connect(g);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

// 噪音（煙火的「咻」）
function noise(a, t0, dur, { from = 2600, to = 400, gain = 0.12 } = {}) {
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(from, t0);
  bp.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(master);
  src.start(t0);
}

// ── 曲子 ──────────────────────────────────────────────
// [音名, 第幾拍, 長度(拍), 音量]；BPM 決定一拍幾秒。全部原創，沒有抄任何曲子。
const SONGS = {
  // 結婚：明亮的小號式號角，附點節奏＋底下墊一個大三和弦
  wedding: {
    bpm: 96,
    lead: [
      ['G4', 0, 0.75, 0.5], ['C5', 0.75, 0.25, 0.5],
      ['E5', 1, 1, 0.55], ['C5', 2, 0.5, 0.45], ['E5', 2.5, 0.5, 0.45],
      ['G5', 3, 1.6, 0.6],
    ],
    pad: [['C3', 0, 4.6, 0.22], ['E3', 0, 4.6, 0.18], ['G3', 0, 4.6, 0.18], ['C4', 1, 3.6, 0.14]],
    type: 'triangle',
  },
  // 寶寶出生：音樂盒，軟軟的上行
  baby: {
    bpm: 108,
    lead: [
      ['C5', 0, 0.5, 0.35], ['E5', 0.5, 0.5, 0.35], ['G5', 1, 0.5, 0.35],
      ['C6', 1.5, 0.9, 0.4], ['A5', 2.4, 0.5, 0.3], ['G5', 2.9, 1.2, 0.3],
    ],
    pad: [['C4', 0, 4, 0.12], ['G4', 0, 4, 0.1]],
    type: 'sine', cut: 6000,
  },
  // 破億：一路往上衝，最後停在大三和弦
  achieve: {
    bpm: 132,
    lead: [
      ['C4', 0, 0.25, 0.4], ['E4', 0.25, 0.25, 0.4], ['G4', 0.5, 0.25, 0.45],
      ['C5', 0.75, 0.25, 0.45], ['E5', 1, 0.25, 0.5], ['G5', 1.25, 0.25, 0.5],
      ['C6', 1.5, 2.2, 0.62],
    ],
    pad: [['C3', 1.5, 2.4, 0.24], ['G3', 1.5, 2.4, 0.2], ['E4', 1.5, 2.4, 0.18]],
    type: 'sawtooth', cut: 3000,
  },
  // 升職、找到工作：俐落的三個上行音
  promote: { bpm: 150, lead: [['G4', 0, 0.25, 0.4], ['B4', 0.25, 0.25, 0.4], ['D5', 0.5, 0.8, 0.45]], type: 'triangle' },
  // 買房：溫暖的琶音
  house: { bpm: 120, lead: [['F4', 0, 0.35, 0.35], ['A4', 0.35, 0.35, 0.35], ['C5', 0.7, 0.35, 0.38], ['F5', 1.05, 1.1, 0.4]], type: 'triangle' },
  // 過關：兩聲清脆的叮
  checkpoint: { bpm: 150, lead: [['D5', 0, 0.2, 0.4], ['A5', 0.22, 0.9, 0.45]], type: 'sine', cut: 7000 },
  // 股災：小調下行，聲音悶悶的
  crash: { bpm: 84, lead: [['A4', 0, 0.4, 0.4], ['F4', 0.4, 0.4, 0.4], ['D4', 0.8, 0.4, 0.4], ['A3', 1.2, 1.4, 0.45]], type: 'sawtooth', cut: 1400 },
  // 人生結束：很低、很慢
  death: { bpm: 60, lead: [['A3', 0, 1.2, 0.3], ['F3', 1, 1.4, 0.28], ['D3', 2, 2.6, 0.3]], type: 'sine', cut: 900 },
  // 事件結果
  good: { bpm: 160, lead: [['E5', 0, 0.18, 0.32], ['A5', 0.18, 0.5, 0.34]], type: 'triangle', cut: 6000 },
  bad: { bpm: 160, lead: [['E4', 0, 0.2, 0.3], ['B3', 0.2, 0.6, 0.3]], type: 'triangle', cut: 1800 },
};

function song(a, name) {
  const s = SONGS[name];
  if (!s) return;
  const t0 = a.currentTime + 0.03;
  const beat = 60 / s.bpm;
  for (const [n, t, d, g] of s.lead) {
    note(a, t0 + t * beat, f(n), d * beat, { type: s.type, gain: g, cut: s.cut || 4200 });
  }
  for (const [n, t, d, g] of s.pad || []) {
    note(a, t0 + t * beat, f(n), d * beat, { type: 'sine', gain: g, cut: 1600, attack: 0.08 });
  }
}

export function play(name) {
  if (!on || !WEB) return;
  const a = ctx();
  if (!a) return;
  try {
    const t = a.currentTime + 0.01;
    if (name === 'tap') { blip(a, t, 720, 0.05, 0.16); return; }
    if (name === 'year') { blip(a, t, 300, 0.12, 0.2); blip(a, t + 0.06, 460, 0.14, 0.14); return; }
    if (name === 'coin') { blip(a, t, 1180, 0.07, 0.24); blip(a, t + 0.07, 1560, 0.16, 0.2); return; }
    if (name === 'firework') { noise(a, t, 0.5); return; }
    song(a, name);
    if (name === 'achieve' || name === 'wedding') { noise(a, t + 0.02, 0.6, { gain: 0.08 }); }
  } catch (_) { /* 有聲音只是加分，壞了不能影響遊戲 */ }
}

// 慶祝畫面的層級 → 要放哪首
export const CELEBRATE_SOUND = { mega: 'achieve', big: 'promote', small: 'coin' };
