// 網頁版：手機「加到主畫面」時，狀態列顏色跟著網頁底色走。這裡統一管理底色：
// 首頁／創角頁是深藍，遊戲中是淺灰；面板打開時再一起壓暗。
import { Platform } from 'react-native';

let base = '#121840';
let dimCount = 0;

const apply = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const color = dimCount > 0 ? '#0a0e2a' : base;
  document.body.style.backgroundColor = color;
  document.documentElement.style.backgroundColor = color;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color);
};

export function setPageBase(color) { base = color; apply(); }
export function dimPage(on) { dimCount = Math.max(0, dimCount + (on ? 1 : -1)); apply(); }
