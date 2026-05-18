import { normalCDF, tInv2, fPVal, chiPVal } from './distributions.js';
import { avg } from './core.js';
import { mulberry32, boxMullerN } from './rng.js';

export function fCritUpper(alpha, df1, df2) {
  let lo = 1e-4, hi = 1000 + df2 * df1;
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    if (fPVal(m, df1, df2) < alpha) hi = m; else lo = m;
  }
  return (lo + hi) / 2;
}

export function chiCrit(alpha, df) {
  let lo = 1e-4, hi = df * 60 + 200;
  for (let i = 0; i < 110; i++) {
    const m = (lo + hi) / 2;
    if (chiPVal(m, df) < alpha) hi = m; else lo = m;
  }
  return (lo + hi) / 2;
}

function groupMeansForF(cohenF, k, sigma = 1) {
  const raw = Array.from({ length: k }, (_, j) => Math.cos((2 * Math.PI * j) / k));
  const m = avg(raw);
  const centered = raw.map(x => x - m);
  const rms = Math.sqrt(avg(centered.map(x => x * x))) || 1;
  const sc = sigma * cohenF / rms;
  return centered.map(x => x * sc);
}

/** Balanced one-way ANOVA — Monte Carlo empirical power for Cohen's f */
export function powerANOVA(cohenF, k, nPerGroup, alpha = .05, seed = 42) {
  if (k < 2 || nPerGroup < 2 || !(cohenF >= 0)) return null;
  const rand = mulberry32(seed ?? 42);
  const dfB = k - 1;
  const dfW = k * (nPerGroup - 1);
  const fc = fCritUpper(alpha, dfB, dfW);
  const tau = groupMeansForF(cohenF, k, 1);
  const sigma = 1;
  let hits = 0;
  const R = 3200;
  for (let rep = 0; rep < R; rep++) {
    let ssb = 0;
    let ssw = 0;
    const all = [];
    for (let j = 0; j < k; j++) {
      for (let i = 0; i < nPerGroup; i++) {
        const e = boxMullerN(rand);
        all.push(tau[j] + e * sigma);
      }
    }
    const g = avg(all);
    for (let j = 0; j < k; j++) {
      const slice = all.slice(j * nPerGroup, (j + 1) * nPerGroup);
      const mm = avg(slice);
      ssb += nPerGroup * (mm - g) ** 2;
      slice.forEach(v => { ssw += (v - mm) ** 2; });
    }
    const F = (ssb / dfB) / (ssw / dfW || 1e-9);
    if (F >= fc) hits++;
  }
  return +(hits / R).toFixed(4);
}

/** χ² approximate power vs Cohen's w (normal approx to non-central χ² mean/var) */
export function powerChi(cohenW, df, sampleN, alpha = .05) {
  if (df < 1 || sampleN < 2 || !(cohenW >= 0)) return null;
  const crit = chiCrit(alpha, df);
  const λ = sampleN * cohenW ** 2;
  const mn = df + λ;
  const vn = Math.sqrt(Math.max(1e-9, 2 * (df + 2 * λ)));
  const pow = 1 - normalCDF((crit - mn) / vn);
  return +Math.min(.9999, Math.max(0, pow)).toFixed(4);
}

/** Two-group logistic effect (OR vs control p) Wald power heuristic */
export function powerLogistic(or, pControl, nPerGroup, alpha = .05) {
  if (or <= 0 || !(pControl > 0 && pControl < 1) || nPerGroup < 5) return null;
  const oddC = pControl / (1 - pControl);
  const oddT = oddC * or;
  const pT = oddT / (1 + oddT);
  const pHat = avg([pControl, pT]);
  const zc = tInv2(alpha, 999999);
  const se = Math.sqrt(Math.max(pHat * (1 - pHat), 1e-9) * (2 / nPerGroup));
  const zStat = Math.abs(pT - pControl) / se;
  return +(normalCDF(zStat - zc)).toFixed(4);
}

/** ICC design effect power (two-cluster arms, pooled t heuristic) */
export function powerMixed(ICC, mClustersEach, subjectsPerCluster, CohenD, alpha = .05) {
  if (!(ICC >= 0 && ICC < 1) || mClustersEach < 2 || subjectsPerCluster < 1 || CohenD <= 0) return null;
  const deff = Math.max(1, 1 + (subjectsPerCluster - 1) * ICC);
  const NeffPair = Math.max(10, Math.floor((mClustersEach * subjectsPerCluster) / deff));
  /** Two-sample t power */
  const df = Math.max(4, Math.floor(NeffPair * .8));
  const tc = tInv2(alpha, df);
  const se = Math.sqrt(2 / NeffPair);
  const zp = CohenD / se;
  return +(normalCDF(Math.abs(zp) - tc)).toFixed(4);
}

/** Mediation indirect effect power — Sobel statistic MC from asymptotic normals */
export function powerMediation(aHat, bHat, seA, seB, B = 2000, alpha = .05, seed = 42) {
  if (!Number.isFinite(aHat) || !Number.isFinite(bHat)) return null;
  if (!(seA > 0) || !(seB > 0) || B < 100) return null;
  const rand = mulberry32(seed ?? 42);
  const zCrit = Math.min(40, binaryInvNormalCDF(1 - alpha / 2));
  /** Product normal approx Sobel denominator */
  const sobelSe = Math.sqrt(bHat ** 2 * seA ** 2 + aHat ** 2 * seB ** 2) || Math.sqrt(seA ** 2 * seB ** 2);
  const zObs = (aHat * bHat) / sobelSe;
  let hit = 0;
  for (let rep = 0; rep < B; rep++) {
    const g1 = boxMullerN(rand);
    const g2 = boxMullerN(rand);
    const a = aHat + g1 * seA / Math.sqrt(2);
    const bb = bHat + g2 * seB / Math.sqrt(2);
    const sse = Math.sqrt(Math.max(bb ** 2 * seA ** 2 + a ** 2 * seB ** 2, 1e-12));
    if (Math.abs((a * bb) / sse) > zCrit) hit++;
  }
  /** blend MC with asymptotic Sobel decision */
  const asym = +(normalCDF(Math.abs(zObs) - zCrit)).toFixed(4);
  return { powerMC: +(hit / B).toFixed(4), powerAsymp: asym, zObs: +zObs.toFixed(4) };
}

export function binaryInvNormalCDF(target) {
  let lo = -8, hi = 8;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (normalCDF(mid) >= target) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}
