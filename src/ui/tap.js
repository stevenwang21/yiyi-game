// 按鈕的「叩」一下：手機用 expo-haptics 的輕觸回饋；網頁交給 celebrate.js 的模擬。
// 獨立成一個小檔案是為了讓 components.js／ios.js 這種底層元件也能用，不會跟 celebrate.js 互相引用。
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTING_KEY = 'yiyi-haptics-v1';
let hapticsOn = true;
AsyncStorage.getItem(SETTING_KEY).then((v) => { if (v === 'off') hapticsOn = false; }).catch(() => {});
export const getHaptics = () => hapticsOn;
export const setHaptics = (on) => { hapticsOn = on; AsyncStorage.setItem(SETTING_KEY, on ? 'on' : 'off').catch(() => {}); };

// 網頁版的 tap 由 celebrate.js 註冊進來（它有 iPhone Safari 的模擬法）
let webTap = null;
export const registerWebTap = (fn) => { webTap = fn; };

export function tap() {
  if (!hapticsOn) return;
  if (Platform.OS === 'web') { if (webTap) webTap(); return; }
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* 沒關係 */ }
}
