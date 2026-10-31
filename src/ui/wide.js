// 寬螢幕（折疊 iPhone 展開、iPad 橫向）：左邊遊戲、右邊面板。
// 判斷：寬度 600 以上、而且不是直的長條（寬 ≥ 高的 0.9 倍）。一般手機直拿永遠不會進這個模式。
import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';

export const isWide = (w, h) => w >= 600 && w >= h * 0.9;
export function useWide() {
  const { width, height } = useWindowDimensions();
  return isWide(width, height);
}

// 右邊那一欄的 Sheet 要畫成「嵌在頁面裡」而不是從下面滑出來的 Modal：
// 用 context 告訴 Sheet，面板元件本身一行都不用改。
export const SideCtx = createContext(false);
export const useSide = () => useContext(SideCtx);

export const PANELS = [
  { id: 'invest', icon: '📈', label: '投資' },
  { id: 'health', icon: '❤️', label: '健康' },
  { id: 'family', icon: '👨‍👩‍👧', label: '家庭' },
  { id: 'mates', icon: '🏆', label: '排名' },
  { id: 'upgrade', icon: '🏅', label: '成就' },
];
