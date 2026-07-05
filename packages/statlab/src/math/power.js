import { normalCDF, tInv2, fPVal, chiPVal, normalINV, ncChiSqCDF, ncFCDF } from './distributions.js';
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

/** χ² power vs Cohen's w via the exact noncentral χ² CDF (Poisson-mixture
 * series; verified against scipy.stats.ncx2 — the previous normal
 * approximation to the noncentral χ² mean/variance could be off by several
 * percentage points, e.g. 6+ points for moderate noncentrality). */
export function powerChi(cohenW, df, sampleN, alpha = .05) {
  if (df < 1 || sampleN < 2 || !(cohenW >= 0)) return null;
  const crit = chiCrit(alpha, df);
  const λ = sampleN * cohenW ** 2;
  const pow = 1 - ncChiSqCDF(crit, df, λ);
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
  const zCrit = Math.min(40, normalINV(1 - alpha / 2));
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

/** Two-sample t-test power — analytical non-central t via delta method */
export function computePowerT(n1, n2, d, alpha = .05, seed = 42) {
  const df = n1 + n2 - 2;
  if (df < 1 || !Number.isFinite(d)) return 0;
  const delta = Math.abs(d) * Math.sqrt(n1 * n2 / (n1 + n2));
  const tc = tInv2(alpha, df);
  if (df > 30) return normalCDF(delta - tc) + normalCDF(-delta - tc);
  const rand = mulberry32(seed ?? 42);
  let hits = 0;
  const R = 10000;
  for (let rep = 0; rep < R; rep++) {
    let chi = 0;
    for (let i = 0; i < df; i++) chi += boxMullerN(rand) ** 2;
    const scale = Math.sqrt(chi / df) || 1;
    const t = (boxMullerN(rand) + delta) / scale;
    if (Math.abs(t) > tc) hits++;
  }
  return hits / R;
}

/** Pearson r power via Fisher z */
export function computePowerCorr(n, r, alpha = .05) {
  const z = .5 * Math.log((1 + r) / (1 - r)), se = 1 / Math.sqrt(n - 3), zc = normalINV(1 - alpha / 2);
  return normalCDF(Math.abs(z) / se - zc);
}

/** Required sample size per group for two-sample t-test */
export function requiredN(d, power = .8, alpha = .05) {
  let n = 4;
  while (n < 10000) { if (computePowerT(n, n, Math.abs(d), alpha) >= power) return n; n++; }
  return n;
}

/** Required sample size for correlation power */
export function requiredNCorr(r, power = .8, alpha = .05) {
  let n = 5;
  while (n < 10000) { if (computePowerCorr(n, Math.abs(r), alpha) >= power) return n; n++; }
  return n;
}

// ── Unified t-test power ───────────────────────────────────────────────────────
export function powerTTest(n1, n2 = n1, d, type = 'two-sample', alpha = .05) {
  if (n1 < 2 || !Number.isFinite(d) || !(alpha > 0 && alpha < 1)) return null;
  if (type === 'paired') {
    const n = Math.min(n1, n2);
    if (n < 3) return null;
    const df = n - 1;
    const delta = Math.abs(d) * Math.sqrt(n);
    const tc = tInv2(alpha / 2, df);
    return { power: +normalCDF(delta - tc).toFixed(4), type, n, d, alpha, apa: `Power = ${normalCDF(delta - tc).toFixed(3)} (paired t, n = ${n}, d = ${d})` };
  }
  if (type === 'one-sample') {
    const df = n1 - 1;
    if (df < 1) return null;
    const delta = Math.abs(d) * Math.sqrt(n1);
    const tc = tInv2(alpha / 2, df);
    return { power: +normalCDF(delta - tc).toFixed(4), type, n: n1, d, alpha, apa: `Power = ${normalCDF(delta - tc).toFixed(3)} (one-sample t, n = ${n1}, d = ${d})` };
  }
  const power = computePowerT(n1, n2, d, alpha, 42);
  return { power: +power.toFixed(4), type, n1, n2, d, alpha, apa: `Power = ${power.toFixed(3)} (two-sample t, n = ${n1}+${n2}, d = ${d})` };
}

// ── Proportion power ───────────────────────────────────────────────────────────
export function powerOneProportion(n, p0, p1, alpha = .05) {
  if (n < 5 || !(p0 > 0 && p0 < 1) || !(p1 > 0 && p1 < 1) || p0 === p1) return null;
  const se = Math.sqrt(p1 * (1 - p1) / n);
  const zc = normalINV(1 - alpha / 2);
  const delta = Math.abs(p1 - p0) / se;
  return { power: +normalCDF(delta - zc).toFixed(4), n, p0, p1, alpha, apa: `Power = ${normalCDF(delta - zc).toFixed(3)} (one proportion, n = ${n}, p = ${p0} vs ${p1})` };
}

export function powerTwoProportion(n1, n2, p1, p2, alpha = .05) {
  if (n1 < 5 || n2 < 5 || !(p1 >= 0 && p2 >= 0 && p1 <= 1 && p2 <= 1)) return null;
  const pBar = (n1 * p1 + n2 * p2) / (n1 + n2);
  const se = Math.sqrt(pBar * (1 - pBar) * (1 / n1 + 1 / n2));
  const zc = normalINV(1 - alpha / 2);
  const delta = Math.abs(p1 - p2) / (se || 1e-10);
  return { power: +normalCDF(delta - zc).toFixed(4), n1, n2, p1, p2, alpha, apa: `Power = ${normalCDF(delta - zc).toFixed(3)} (two prop, n = ${n1}+${n2})` };
}

// ── Wilcoxon power (Pitman ARE) ────────────────────────────────────────────────
export function powerWilcoxon(n1, n2 = n1, d, alpha = .05) {
  const ARE = 0.955;
  const neff = Math.round((n1 + n2) * ARE);
  const nEffPer = Math.round(neff / 2);
  if (nEffPer < 3 || !Number.isFinite(d)) return null;
  const res = powerTTest(nEffPer, nEffPer, d, 'two-sample', alpha);
  if (!res) return null;
  return { ...res, test: 'Mann-Whitney', n1, n2, are: ARE, apa: `Power = ${res.power.toFixed(3)} (MWU via ARE, n = ${n1}+${n2}, d = ${d})` };
}

// ── Log-rank test power (Schoenfeld 1983) ──────────────────────────────────────
export function powerLogRank(nEvents, hr, alpha = .05) {
  if (!Number.isFinite(nEvents) || nEvents < 4 || !Number.isFinite(hr) || hr <= 0) return null;
  const zc = normalINV(1 - alpha / 2);
  const zBeta = Math.abs(Math.log(hr)) * Math.sqrt(nEvents / 4) - zc;
  return { power: +normalCDF(zBeta).toFixed(4), nEvents, hr, alpha, apa: `Power = ${normalCDF(zBeta).toFixed(3)} (log-rank, events = ${nEvents}, HR = ${hr})` };
}

// ── RM ANOVA power ─────────────────────────────────────────────────────────────
// Power via the exact noncentral F CDF (Poisson-mixture series; verified
// against scipy.stats.ncf). The previous version approximated the noncentral
// F by a normal density integrated numerically over x in steps of 0.2 — a
// double approximation (normal-to-noncentral-F, then a coarse Riemann sum)
// that could be off by several percentage points.
export function powerRMANOVA(k, n, epsilon, f, alpha = .05) {
  if (k < 2 || n < 3 || !(epsilon > 0 && epsilon <= 1) || !(f >= 0)) return null;
  const df1 = (k - 1) * epsilon;
  const df2 = (k - 1) * (n - 1) * epsilon;
  const ncp = n * k * f * f;
  const crit = fCritUpper(alpha, df1, df2);
  const power = Math.min(0.9999, Math.max(0, 1 - ncFCDF(crit, df1, df2, ncp)));
  return { power: +power.toFixed(4), k, n, epsilon, f, alpha, apa: `Power = ${power.toFixed(3)} (RM ANOVA, k = ${k}, n = ${n}, f = ${f})` };
}

// ── OLS regression F-test power ────────────────────────────────────────────────
// Power via the exact noncentral F CDF (Poisson-mixture series; verified
// against scipy.stats.ncf and R's pwr::pwr.f2.test, ncp = f2*n). The previous
// normal approximation to the noncentral F could overstate power by several
// percentage points at moderate-to-large effect sizes (e.g. R²=0.13, n=100,
// k=3: normal approx gave 0.970 vs. the exact 0.905).
export function powerOLS(rSquared, n, k, alpha = .05) {
  if (!(rSquared >= 0 && rSquared < 1) || n < k + 2 || k < 1) return null;
  const f2 = rSquared / (1 - rSquared);
  const ncp = n * f2;
  const df1 = k;
  const df2 = n - k - 1;
  const crit = fCritUpper(alpha, df1, df2);
  const power = 1 - ncFCDF(crit, df1, df2, ncp);
  return { power: +Math.min(0.9999, Math.max(0, power)).toFixed(4), rSquared, n, k, alpha, apa: `Power = ${power.toFixed(3)} (OLS, R2 = ${rSquared}, n = ${n}, k = ${k})` };
}

// ── Spearman power ─────────────────────────────────────────────────────────────
export function powerSpearman(n, rho, alpha = .05) {
  if (n < 5 || !(rho >= -1 && rho <= 1)) return null;
  const z = 0.5 * Math.log((1 + rho) / (1 - rho));
  const se = 1 / Math.sqrt(n - 3);
  const zc = normalINV(1 - alpha / 2);
  return { power: +normalCDF(Math.abs(z) / se - zc).toFixed(4), n, rho, alpha, apa: `Power = ${normalCDF(Math.abs(z) / se - zc).toFixed(3)} (Spearman, n = ${n}, rho = ${rho})` };
}

// ── Required-N functions ───────────────────────────────────────────────────────
export function requiredNTTest(d, type = 'two-sample', power = .8, alpha = .05) {
  if (!Number.isFinite(d) || d <= 0) return null;
  let lo = 3, hi = 5000;
  for (let i = 0; i < 60; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const pwr = powerTTest(mid, type === 'paired' ? mid : mid, d, type, alpha);
    if (pwr?.power >= power) hi = mid; else lo = mid;
  }
  return hi;
}

export function requiredNOneProp(p0, p1, power = .8, alpha = .05) {
  let lo = 5, hi = 20000;
  for (let i = 0; i < 60; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const pwr = powerOneProportion(mid, p0, p1, alpha);
    if (pwr?.power >= power) hi = mid; else lo = mid;
  }
  return hi;
}

export function requiredNTwoProp(p1, p2, power = .8, alpha = .05) {
  let lo = 5, hi = 20000;
  for (let i = 0; i < 60; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const pwr = powerTwoProportion(mid, mid, p1, p2, alpha);
    if (pwr?.power >= power) hi = mid; else lo = mid;
  }
  return hi;
}

export function requiredNWilcoxon(d, power = .8, alpha = .05) {
  let lo = 3, hi = 5000;
  for (let i = 0; i < 60; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const pwr = powerWilcoxon(mid, mid, d, alpha);
    if (pwr?.power >= power) hi = mid; else lo = mid;
  }
  return hi;
}

export function requiredNLogRank(hr, power = .8, alpha = .05) {
  let lo = 4, hi = 20000;
  for (let i = 0; i < 60; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const pwr = powerLogRank(mid, hr, alpha);
    if (pwr?.power >= power) hi = mid; else lo = mid;
  }
  return hi;
}

export function requiredNOLS(rSquared, k = 1, power = .8, alpha = .05) {
  let lo = k + 5, hi = 5000;
  for (let i = 0; i < 60; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const pwr = powerOLS(rSquared, mid, k, alpha);
    if (pwr?.power >= power) hi = mid; else lo = mid;
  }
  return hi;
}

// ── Power curve generator ──────────────────────────────────────────────────────
export function powerCurve(powerFn, varyParam, varyRange, fixedParams, options = {}) {
  const { steps = 40 } = options;
  const [lo, hi] = varyRange;
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const val = lo + (i / Math.max(1, steps - 1)) * (hi - lo);
    const params = { ...fixedParams, [varyParam]: val };
    const result = powerFn(params);
    pts.push({ [varyParam]: val, power: result?.power ?? 0 });
  }
  return pts;
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
