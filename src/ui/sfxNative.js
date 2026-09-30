// App 版的音效：預先算好的 m4a（跟網頁版的合成曲一模一樣），用 expo-audio 播。
// 網頁版不會用到這個檔案裡的播放器；expo-audio 在網頁上沒有實作，所以只在手機上才建播放器。
import { Platform } from 'react-native';

const FILES = {
  tap: require('../../assets/sfx/tap.m4a'),
  year: require('../../assets/sfx/year.m4a'),
  coin: require('../../assets/sfx/coin.m4a'),
  firework: require('../../assets/sfx/firework.m4a'),
  shutter: require('../../assets/sfx/shutter.m4a'),
  clicks: require('../../assets/sfx/clicks.m4a'),
  snap: require('../../assets/sfx/snap.m4a'),
  wedding: require('../../assets/sfx/wedding.m4a'),
  baby: require('../../assets/sfx/baby.m4a'),
  achieve: require('../../assets/sfx/achieve.m4a'),
  fanfare: require('../../assets/sfx/fanfare.m4a'),
  spotlight: require('../../assets/sfx/spotlight.m4a'),
  promote: require('../../assets/sfx/promote.m4a'),
  house: require('../../assets/sfx/house.m4a'),
  checkpoint: require('../../assets/sfx/checkpoint.m4a'),
  crash: require('../../assets/sfx/crash.m4a'),
  death: require('../../assets/sfx/death.m4a'),
  good: require('../../assets/sfx/good.m4a'),
  bad: require('../../assets/sfx/bad.m4a'),
};

let Audio = null;
let ready = false;
const players = {};

function setup() {
  if (ready || Platform.OS === 'web') return;
  ready = true;
  try {
    // eslint-disable-next-line global-require
    Audio = require('expo-audio');
    // 跟著手機的靜音開關走（遊戲音效不該蓋過靜音）
    Audio.setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  } catch (_) { Audio = null; }
}

export const NATIVE_SFX = {
  play(name) {
    setup();
    if (!Audio || !FILES[name]) return;
    try {
      let p = players[name];
      if (!p) { p = Audio.createAudioPlayer(FILES[name]); players[name] = p; }
      p.seekTo(0);
      p.play();
    } catch (_) { /* 有聲音只是加分，壞了不能影響遊戲 */ }
  },
};
