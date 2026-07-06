import { avg, sampleSD } from '../math/core.js';
import { normalCDF, normalINV } from '../math/distributions.js';
import { matInv } from '../math/matrix.js';

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
}

function _bootstrapSamples(n, B, seed) {
  const rand = lcg(seed);
  const samples = [];
  for (let b = 0; b < B; b++) {
    const idx = [];
    for (let i = 0; i < n; i++) idx.push(Math.floor(rand() * n));
    samples.push(idx);
  }
  return samples;
}

// ── Bootstrap CI ────────────────────────────────────────────────────────────
/** Bootstrap confidence interval (percentile, basic, or BCa) for an arbitrary statistic. @param {any[]} data sample to resample. @param {(sample: any[]) => number} statistic */
export function bootstrapCI(data, statistic, { method = 'percentile', B = 2000, alpha = 0.05, seed = 42 } = {}) {
  if (!data || data.length < 5 || !statistic) return null;
  const n = data.length;
  const thetaHat = statistic(data);
  const samples = _bootstrapSamples(n, B, seed);
  const reps = samples.map(idx => statistic(idx.map(i => data[i])));
  const sorted = [...reps].sort((a, b) => a - b);

  let ci;
  if (method === 'basic') {
    ci = [2 * thetaHat - sorted[Math.floor((1 - alpha / 2) * B)], 2 * thetaHat - sorted[Math.floor(alpha / 2 * B)]];
  } else if (method === 'bca') {
    const z0 = normalINV(Math.max(0.001, Math.min(0.999, reps.filter(r => r < thetaHat).length / B)));
    const jackInflu = [];
    for (let i = 0; i < n; i++) {
      const loo = data.filter((_, j) => j !== i);
      jackInflu.push(statistic(loo));
    }
    const jMean = avg(jackInflu);
    let sum3 = 0, sum2 = 0;
    for (const j of jackInflu) { const d = jMean - j; sum3 += d * d * d; sum2 += d * d; }
    let a = sum2 > 0 ? sum3 / (6 * Math.pow(sum2, 1.5)) : 0;
    a = Math.max(-0.99, Math.min(0.99, a));
    const zAlpha = normalINV(alpha / 2), z1Alpha = normalINV(1 - alpha / 2);
    const alpha1Val = normalCDF(z0 + (z0 + zAlpha) / (1 - a * (z0 + zAlpha)));
    const alpha2Val = normalCDF(z0 + (z0 + z1Alpha) / (1 - a * (z0 + z1Alpha)));
    ci = [sorted[Math.floor(alpha1Val * B)], sorted[Math.floor(alpha2Val * B)]];
  } else {
    ci = [sorted[Math.floor(alpha / 2 * B)], sorted[Math.floor((1 - alpha / 2) * B)]];
  }

  return {
    test: 'Bootstrap CI', ci: [+ci[0].toFixed(4), +ci[1].toFixed(4)], method, B, alpha, originalEstimate: +thetaHat.toFixed(4), n,
    apa: `Bootstrap ${method} CI: [${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}], B = ${B}`,
  };
}

// ── Bootstrap SE ────────────────────────────────────────────────────────────
/** Bootstrap standard error of a statistic. @param {any[]} data @param {(sample: any[]) => number} statistic */
export function bootstrapSE(data, statistic, { B = 2000, seed = 42 } = {}) {
  if (!data || data.length < 5 || !statistic) return null;
  const n = data.length;
  const thetaHat = statistic(data);
  const samples = _bootstrapSamples(n, B, seed);
  const reps = samples.map(idx => statistic(idx.map(i => data[i])));
  const se = sampleSD(reps);

  return {
    test: 'Bootstrap SE', se: +se.toFixed(4), originalEstimate: +thetaHat.toFixed(4), B, n,
    apa: `Bootstrap SE = ${se.toFixed(3)}, B = ${B}`,
  };
}

// ── Bootstrap Test ──────────────────────────────────────────────────────────
/** Bootstrap hypothesis test of a statistic against a null value. @param {any[]} data @param {(sample: any[]) => number} statistic @param {number} nullValue */
export function bootstrapTest(data, statistic, nullValue, { B = 2000, alternative = 'two-sided', seed = 42 } = {}) {
  if (!data || data.length < 5 || !statistic) return null;
  const n = data.length;
  const thetaHat = statistic(data);
  const samples = _bootstrapSamples(n, B, seed);
  const reps = samples.map(idx => statistic(idx.map(i => data[i])));

  let p;
  if (alternative === 'greater') {
    p = reps.filter(r => r >= thetaHat).length / B;
  } else if (alternative === 'less') {
    p = reps.filter(r => r <= thetaHat).length / B;
  } else {
    // Shift replicates to be centred at nullValue, then count extremes
    const shifted = reps.map(r => r - thetaHat + nullValue);
    const obs = Math.abs(thetaHat - nullValue);
    const extreme = shifted.filter(r => Math.abs(r - nullValue) >= obs).length;
    p = Math.max(1 / B, extreme / B);
  }
  p = Math.max(0.0001, Math.min(1, p));

  return {
    test: 'Bootstrap Test', p: +p.toFixed(4), nullValue, alternative, B, originalEstimate: +thetaHat.toFixed(4), n,
    apa: `Bootstrap ${alternative}: p = ${p.toFixed(3)} (H₀: θ = ${nullValue}), B = ${B}`,
  };
}

// ── Jackknife ───────────────────────────────────────────────────────────────
/** Jackknife (leave-one-out) bias and SE of a statistic. @param {any[]} data @param {(sample: any[]) => number} statistic */
export function jackknife(data, statistic) {
  if (!data || data.length < 5 || !statistic) return null;
  const n = data.length;
  const thetaHat = statistic(data);
  const looVals = [];
  for (let i = 0; i < n; i++) {
    looVals.push(statistic(data.filter((_, j) => j !== i)));
  }
  const pseudo = looVals.map(v => n * thetaHat - (n - 1) * v);
  const jEst = avg(pseudo);
  const se = Math.sqrt(pseudo.reduce((s, p) => s + (p - jEst) ** 2, 0) / (n * (n - 1)));
  const bias = (n - 1) * (jEst - thetaHat);

  return {
    test: 'Jackknife', estimate: +jEst.toFixed(4), se: +se.toFixed(4), bias: +bias.toFixed(6), originalEstimate: +thetaHat.toFixed(4), n,
    apa: `Jackknife: θ̂ = ${jEst.toFixed(3)}, SE = ${se.toFixed(3)}, bias = ${bias.toFixed(4)}`,
  };
}

// ── Bootstrap-t CI ──────────────────────────────────────────────────────────
/** Bootstrap-t confidence interval. @param {any[]} data @param {(sample: any[]) => number} statistic */
export function bootstrapT_CI(data, statistic, { B = 2000, alpha = 0.05, seed = 42 } = {}) {
  if (!data || data.length < 10 || !statistic) return null;
  const n = data.length;
  const thetaHat = statistic(data);
  const samples = _bootstrapSamples(n, B, seed);
  const tVals = [];

  for (let b = 0; b < B; b++) {
    const bootData = samples[b].map(i => data[i]);
    const bootEst = statistic(bootData);
    // Inner bootstrap for SE of bootEst (B2 = 30)
    const innerSamples = _bootstrapSamples(n, 30, seed + b * 137 + 42);
    const innerReps = innerSamples.map(idx => statistic(idx.map(i => bootData[i])));
    const innerSE = sampleSD(innerReps);
    if (innerSE > 0) tVals.push((bootEst - thetaHat) / innerSE);
  }

  const sorted = [...tVals].sort((a, b) => a - b);
  const tLo = sorted[Math.floor(alpha / 2 * tVals.length)];
  const tHi = sorted[Math.floor((1 - alpha / 2) * tVals.length)];
  const seOrig = sampleSD(samples.map(idx => statistic(idx.map(i => data[i]))));
  const ci = [thetaHat - tHi * seOrig, thetaHat - tLo * seOrig];

  return {
    test: 'Bootstrap-t CI', ci: [+ci[0].toFixed(4), +ci[1].toFixed(4)], B, alpha, originalEstimate: +thetaHat.toFixed(4), n,
    apa: `Bootstrap-t CI: [${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}], B = ${B}`,
  };
}

// ── Empirical Influence ─────────────────────────────────────────────────────
/** Empirical influence values of a statistic. @param {any[]} data @param {(sample: any[]) => number} statistic */
export function empiricalInfluence(data, statistic) {
  if (!data || data.length < 5 || !statistic) return null;
  const n = data.length;
  const thetaHat = statistic(data);
  const influence = [];
  for (let i = 0; i < n; i++) {
    const loo = statistic(data.filter((_, j) => j !== i));
    influence.push({ index: i, value: +(thetaHat - loo).toFixed(6) });
  }

  return {
    test: 'Empirical Influence', influence, n,
    apa: `Influence: max |Δ| = ${Math.max(...influence.map(i => Math.abs(i.value))).toFixed(4)}, n = ${n}`,
  };
}

// ── Bootstrap Mediation ───────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} treatVar @param {string} outcomeVar */
export function bootstrapMediation(data, treatVar, mediator, outcomeVar, { B = 500, seed = 42 } = {}) {
  if (!data || data.length < 15 || !treatVar || !mediator || !outcomeVar) return null;
  const n = data.length;
  const samples = _bootstrapSamples(n, B, seed);
  const indirects = [];
  for (const idx of samples) {
    const boot = idx.map(i => data[i]);
    const x = boot.map(r => +r[treatVar]);
    const m = boot.map(r => +r[mediator]);
    const y = boot.map(r => +r[outcomeVar]);
    let sx = 0, sm = 0, sy = 0, sxx = 0, sxm = 0, smy = 0;
    for (let i = 0; i < n; i++) { sx += x[i]; sm += m[i]; sy += y[i]; sxx += x[i] * x[i]; sxm += x[i] * m[i]; smy += m[i] * y[i]; }
    const a = (n * sxm - sx * sm) / Math.max(n * sxx - sx * sx, 1);
    const smm = m.reduce((s, v) => s + v * v, 0);
    const b = (n * smy - sm * sy) / Math.max(n * smm - sm * sm, 1);
    indirects.push(a * b);
  }
  indirects.sort((a, b) => a - b);
  const lo = indirects[Math.floor(0.025 * B)], hi = indirects[Math.floor(0.975 * B)];
  return { test: 'Bootstrap Mediation', indirect: +(indirects[Math.floor(B / 2)]).toFixed(4), ci: [+lo.toFixed(4), +hi.toFixed(4)], B, n, apa: `Bootstrap IE = ${indirects[Math.floor(B / 2)].toFixed(3)}, CI [${lo.toFixed(3)}, ${hi.toFixed(3)}]` };
}

// ── Moderated Mediation ───────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} treatVar @param {string} outcomeVar */
export function moderatedMediation(data, treatVar, mediator, moderator, outcomeVar) {
  if (!data || data.length < 20 || !treatVar || !mediator || !moderator || !outcomeVar) return null;
  const n = data.length;
  const x = data.map(r => +r[treatVar]); const m = data.map(r => +r[mediator]);
  const w = data.map(r => +r[moderator]); const y = data.map(r => +r[outcomeVar]);
  // Index of moderated mediation: a * b_w
  let sx = 0, sm = 0, sxx = 0, sxm = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sm += m[i]; sxx += x[i] * x[i]; sxm += x[i] * m[i]; }
  const a = (n * sxm - sx * sm) / Math.max(n * sxx - sx * sx, 1);
  // Index of moderated mediation (Hayes) = a · β_{MW}, where β_{MW} is the
  // coefficient on the M×W interaction in the outcome model
  // Y = β0 + β_M·M + β_W·W + β_{MW}·(M·W) (the W-dependence of the M→Y path).
  // The old b_w was an ad-hoc ratio Σ(w·m·y)/Σ(w·m).
  const Z = data.map((_, i) => [1, m[i], w[i], m[i] * w[i]]);
  const ZtZ = Array.from({ length: 4 }, (_, p) => Array.from({ length: 4 }, (_, q) => Z.reduce((s, r) => s + r[p] * r[q], 0)));
  const ZtY = Array.from({ length: 4 }, (_, p) => Z.reduce((s, r, i) => s + r[p] * y[i], 0));
  const inv = matInv(ZtZ);
  const beta = inv ? inv.map(row => row.reduce((s, v, j) => s + v * ZtY[j], 0)) : [0, 0, 0, 0];
  const bw = beta[3];
  return { test: 'Moderated Mediation', a: +a.toFixed(4), bw: +bw.toFixed(4), bMW: +bw.toFixed(4), index: +(a * bw).toFixed(4), n, apa: `ModMed index = ${(a * bw).toFixed(3)}` };
}

// ── Split Conformal (Lei et al. 2018; Vovk et al. 2005) ────────────
// Fits a point predictor on the training fold, scores absolute residuals on a
// disjoint calibration fold, and returns the finite-sample-corrected
// (1-alpha) empirical quantile (⌈(1-α)(n+1)⌉-th order statistic) as the
// conformal radius — the classical split-conformal guarantee. If covariate
// arrays (xTrain/xCal) are supplied the model is OLS y = a + b·x fit on the
// training fold; otherwise it falls back to the constant (mean) predictor.
export function splitConformal(yTrain, yCal, { alpha = 0.1, xTrain = null, xCal = null } = {}) {
  if (!yTrain || !yCal || yTrain.length < 10 || yCal.length < 10) return null;
  const nCal = yCal.length;
  const useX = Array.isArray(xTrain) && Array.isArray(xCal) && xTrain.length === yTrain.length && xCal.length === nCal;
  let predict, model;
  if (useX) {
    const mx = avg(xTrain), my = avg(yTrain);
    let sxy = 0, sxx = 0;
    for (let i = 0; i < xTrain.length; i++) { sxy += (xTrain[i] - mx) * (yTrain[i] - my); sxx += (xTrain[i] - mx) ** 2; }
    const b = sxx > 1e-12 ? sxy / sxx : 0;
    const a = my - b * mx;
    predict = (x) => a + b * x;
    model = 'linear';
  } else {
    const muHat = avg(yTrain);
    predict = () => muHat;
    model = 'mean';
  }
  const residuals = (useX ? yCal.map((v, i) => Math.abs(v - predict(xCal[i]))) : yCal.map(v => Math.abs(v - predict())));
  residuals.sort((a, b) => a - b);
  const k = Math.min(nCal - 1, Math.ceil((1 - alpha) * (nCal + 1)) - 1);
  const radius = residuals[Math.max(0, k)];
  return { test: 'Split Conformal', radius: +radius.toFixed(4), model, alpha, nTrain: yTrain.length, nCal, apa: `Conformal radius = ${radius.toFixed(3)} (${model} model), α = ${alpha}` };
}

// ── Conformal P-values ────────────────────────────────────────────
/** @param {number[]} scores */
export function conformalPvalues(scores, testScore) {
  if (!scores || !scores.length || !Number.isFinite(testScore)) return null;
  const n = scores.length;
  const geq = scores.filter(s => s >= testScore).length;
  const p = (geq + 1) / (n + 1);
  return { test: 'Conformal P-values', p: +p.toFixed(4), n, apa: `Conformal p = ${p.toFixed(3)}` };
}

// ── Jackknife+ (Barber, Candès, Ramdas & Tibshirani 2021) ──────────
// For each i, fits an intercept+slope OLS model on all points except i,
// records the leave-one-out residual R_i = |y_i − f_{-i}(x_i)|, and evaluates
// f_{-i} at the target point (xNew, default = mean(X)). The predictive
// interval is [ (1-α)-lower quantile of f_{-i}(xNew) − R_i , (1-α)-upper
// quantile of f_{-i}(xNew) + R_i ] — the asymmetric min/max construction
// that gives Jackknife+ its distribution-free coverage guarantee (unlike a
// plain quantile of centered residuals around a single full-data fit).
/** @param {number[]} X @param {number[]} y */
export function jackknifePlus(X, y, { alpha = 0.1, xNew = null } = {}) {
  if (!X || !y || X.length < 10 || X.length !== y.length) return null;
  const n = X.length;
  const target = xNew != null ? xNew : avg(X);
  const lower = [], upper = [];
  for (let i = 0; i < n; i++) {
    const xi = X.filter((_, j) => j !== i);
    const yi = y.filter((_, j) => j !== i);
    const mx = avg(xi), my = avg(yi);
    let sxy = 0, sxx = 0;
    for (let j = 0; j < xi.length; j++) { sxy += (xi[j] - mx) * (yi[j] - my); sxx += (xi[j] - mx) ** 2; }
    const b = sxx > 1e-12 ? sxy / sxx : 0;
    const a = my - b * mx;
    const residual = Math.abs(y[i] - (a + b * X[i]));
    const predAtTarget = a + b * target;
    lower.push(predAtTarget - residual);
    upper.push(predAtTarget + residual);
  }
  lower.sort((a, b) => a - b);
  upper.sort((a, b) => a - b);
  const kLo = Math.max(0, Math.floor(alpha * (n + 1)) - 1);
  const kHi = Math.min(n - 1, Math.ceil((1 - alpha) * (n + 1)) - 1);
  const lo = lower[kLo], hi = upper[kHi];
  const radius = Math.max(0, (hi - lo) / 2);
  return { test: 'Jackknife+', lower: +lo.toFixed(4), upper: +hi.toFixed(4), radius: +radius.toFixed(4), target: +target.toFixed(4), alpha, n, apa: `Jackknife+ interval [${lo.toFixed(3)}, ${hi.toFixed(3)}] at x=${target.toFixed(2)}` };
}
