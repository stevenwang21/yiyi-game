// 把「才藝」和「另一半」帶來的加成合成一份，存在 s.perk 給引擎和畫面用
import { talentBonus } from './talents.js';
import { partnerPerk } from './partners.js';

const EMPTY = {
  salary: 0, side: 0, hpKeep: 0, promo: 0, alpha: 0, biz: 0, living: 0,
  kid: 0, house: 0, risk: 0, hp: 0, happy: 0, charm: 0,
};

export function perksOf(s) {
  const t = talentBonus(s);
  const p = partnerPerk(s);
  const out = { ...EMPTY };
  for (const src of [t, p]) {
    for (const k of Object.keys(src)) {
      if (k in out) out[k] += src[k] || 0;
    }
  }
  // 上限，避免疊太多壞了平衡
  out.salary = Math.min(0.15, out.salary);
  out.hpKeep = Math.min(0.7, out.hpKeep);
  out.promo = Math.min(0.2, out.promo);
  out.alpha = Math.min(0.02, out.alpha);
  out.biz = Math.min(0.025, out.biz);
  out.living = Math.max(-0.3, out.living);
  out.kid = Math.max(-0.5, out.kid);
  out.house = Math.min(0.2, out.house);
  return out;
}

// 舊存檔還沒有 s.perk 時的安全讀法
export const perk = (s, key) => (s.perk && s.perk[key]) || 0;
