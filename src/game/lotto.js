// 刮刮樂、樂透：自己決定買幾張。
//
// 以前是「買一張試試 / 豪賭 10 萬」兩個固定選項，而且一張刮刮樂 25% 中 1～10 萬 —— 期望值比本金高好幾倍，
// 買越多越賺，這不是刮刮樂。現在每一張都照真的獎金結構開獎（大部分槓龜、常常中回本、偶爾小獎、
// 極少數大獎），買 100 張就真的開 100 次，回收率大概六到七成 —— 跟真的差不多，但頭獎機率比真的高很多，
// 不然一輩子都碰不到。
import { addStats, formatMoney, WAN } from './utils.js';

const good = (text) => ({ text, tone: 'good' });
const bad = (text) => ({ text, tone: 'bad' });
const P = (s, v) => Math.round(v * (s.priceIndex || 1));

// 獎金表：[機率, 獎金]，由大到小；每張獨立開獎，只算最高中的那一個
export const SCRATCH = {
  name: '刮刮樂', price: 200,
  tiers: [[0.00002, 100 * WAN], [0.0002, 10 * WAN], [0.002, 1 * WAN], [0.012, 2000], [0.05, 500], [0.12, 200]],   // 回收率約 65%
  qty: [1, 5, 20, 100],
};
export const LOTTO = {
  name: '樂透', price: 100,
  tiers: [[0.0000002, 20000 * WAN], [0.000002, 1000 * WAN], [0.00005, 10 * WAN], [0.0008, 1 * WAN], [0.01, 1000], [0.08, 200]],   // 不算頭獎回收率約 60%；頭獎 1/500 萬
  qty: [1, 10, 100, 1000],
};

// 開獎：回傳 { hits: 中幾張, back: 拿回多少, top: 最大的一筆獎金 }
export function draw(rng, game, n) {
  let hits = 0; let back = 0; let top = 0;
  for (let i = 0; i < n; i += 1) {
    const r = rng();
    let acc = 0;
    for (const [p, prize] of game.tiers) {
      acc += p;
      if (r < acc) { hits += 1; back += prize; if (prize > top) top = prize; break; }
    }
  }
  return { hits, back, top };
}

const tierName = (game, prize) => {
  const i = game.tiers.findIndex(([, v]) => v === prize);
  return i === 0 ? '頭獎' : i === 1 ? '二獎' : i === 2 ? '三獎' : '小獎';
};

// 買 n 張的選項
function buyChoice(game, n) {
  return {
    label: (s) => `買 ${n.toLocaleString('en-US')} 張（${formatMoney(P(s, game.price * n))}）`,
    cond: (s) => s.money >= P(s, game.price * n),
    effect: (s, rng) => {
      const cost = P(s, game.price * n);
      s.money -= cost;
      const { hits, back, top } = draw(rng, game, n);
      const prize = P(s, back);
      const net = prize - cost;
      s.money += prize;   // 淨賺賠讓結果卡的籌碼自己算，文字裡不再重複一次
      const head = `買了 ${n.toLocaleString('en-US')} 張${game.name}（${formatMoney(cost)}）`;
      if (top >= game.tiers[2][1]) {
        // 三獎以上：特別講出來
        const tn = tierName(game, top);
        const happy = top >= game.tiers[0][1] ? 30 : top >= game.tiers[1][1] ? 20 : 8;
        return good(`${head}，${tn === '頭獎' ? '中頭獎了！！！人生翻轉！' : `中了${tn}！`}${hits > 1 ? `一共中 ${hits} 張，` : ''}拿回 ${formatMoney(prize)}。${addStats(s, { happy })}`);
      }
      if (hits === 0) return net < -5 * WAN ? bad(`${head}，一張都沒中。${addStats(s, { happy: -6 })}`) : `${head}，一張都沒中。就當作買個希望。`;
      if (net >= 0) return good(`${head}，中了 ${hits} 張，拿回 ${formatMoney(prize)}，還小賺 ${formatMoney(net)}。${addStats(s, { happy: 3 })}`);
      const tone = net < -5 * WAN ? bad : (t) => t;
      return tone(`${head}，中了 ${hits} 張，拿回 ${formatMoney(prize)}，淨賠 ${formatMoney(-net)}。${net < -5 * WAN ? addStats(s, { happy: -4 }) : ''}`);
    },
  };
}

export const scratchChoices = () => SCRATCH.qty.map((n) => buyChoice(SCRATCH, n)).concat([{ label: '不買', effect: () => '你看了一眼就走了。' }]);
export const lottoChoices = () => LOTTO.qty.map((n) => buyChoice(LOTTO, n)).concat([{ label: '不買', effect: () => '你相信靠自己比較實在。' }]);
