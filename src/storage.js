// 存檔：失敗時靜默略過，不影響遊戲
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVE_KEY = 'yiyi-save-v3';
const BEST_KEY = 'yiyi-best-v1';
const TUTORIAL_KEY = 'yiyi-tutorial-v1';
const LEGEND_KEY = 'yiyi-legends-v1';
const META_KEY = 'yiyi-meta-v1';

async function getJSON(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setJSON(key, value) {
  try {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 忽略
  }
}

export const loadSave = () => getJSON(SAVE_KEY);
export const writeSave = (s) => setJSON(SAVE_KEY, s);
export const clearSave = () => setJSON(SAVE_KEY, null);
export const loadBest = () => getJSON(BEST_KEY);
export const writeBest = (b) => setJSON(BEST_KEY, b);
export const loadTutorialDone = () => getJSON(TUTORIAL_KEY);
export const writeTutorialDone = (v) => setJSON(TUTORIAL_KEY, v);
// 傳說職業圖鑑：跨存檔永久保留 { id: { age, name } }
export const loadLegendBook = () => getJSON(LEGEND_KEY);
export const writeLegendBook = (b) => setJSON(LEGEND_KEY, b);
// 傳承點數與永久升級：跨存檔保留
export const loadMeta = () => getJSON(META_KEY);
export const writeMeta = (m) => setJSON(META_KEY, m);
// 排行榜：每一輩子結束都記一筆，跨存檔保留（最多 50 筆）
const BOARD_KEY = 'yiyi-board-v1';
export const loadBoard = () => getJSON(BOARD_KEY);
export const writeBoard = (b) => setJSON(BOARD_KEY, b);
