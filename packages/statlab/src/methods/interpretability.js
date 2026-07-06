import { avg } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';
import { solveNormalEquations } from '../math/matrix.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// Fit an interpretable linear model y ≈ b0 + Σ bⱼxⱼ via normal equations.
// Returns the coefficients and a predict() closure; used as the surrogate that
// the model-agnostic explainers (SHAP, LIME, PDP) explain when no model is given.
function fitLinear(X, y) {
  const p = X[0].length;
  const Z = X.map(r => [1, ...r]);
  const kz = p + 1;
  const ZtZ = Array.from({ length: kz }, (_, a) => Array.from({ length: kz }, (_, b) => Z.reduce((s, row) => s + row[a] * row[b], 0)));
  const ZtY = Array.from({ length: kz }, (_, a) => Z.reduce((s, row, i) => s + row[a] * y[i], 0));
  const beta = solveNormalEquations(ZtZ, ZtY);
  return { intercept: beta[0], coef: beta.slice(1), predict: row => beta[0] + row.reduce((s, v, j) => s + v * beta[1 + j], 0) };
}

// ── SHAP Values (simplified feature importance) ───────────────────
/** @param {number[][]} X @param {number[]} y */
export function shapValues(X, y, { seed = 42, nSamples = 50, model = null } = {}) {
  __rng = mulberry32(seed);
  if (!X || !y || X.length < 5 || y.length < 5 || X.length !== y.length) return null;
  const n = X.length, p = X[0].length;
  // Explain a supplied model, or a linear surrogate fit to (X, y).
  const f = model || fitLinear(X, y).predict;
  // Štrumbelj–Kononenko permutation-sampling SHAP (interventional, background = X).
  // For each permutation, walk features in order, flipping each from the background
  // instance z to the explained instance x_i; the prediction change is feature j's
  // marginal contribution for that ordering. Global importance = mean_i |φ_ij|.
  const globalPhi = Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    const phi = Array(p).fill(0);
    for (let m = 0; m < nSamples; m++) {
      const perm = [...Array(p).keys()];
      for (let a = p - 1; a > 0; a--) { const b = Math.floor(__rng() * (a + 1)); [perm[a], perm[b]] = [perm[b], perm[a]]; }
      const z = X[Math.floor(__rng() * n)];
      const cur = [...z];
      let prev = f(cur);
      for (const j of perm) {
        cur[j] = X[i][j];
        const now = f(cur);
        phi[j] += now - prev;
        prev = now;
      }
    }
    for (let j = 0; j < p; j++) globalPhi[j] += Math.abs(phi[j] / nSamples);
  }
  const shap = globalPhi.map(v => v / n);
  const absTotal = shap.reduce((s, v) => s + Math.abs(v), 0);
  const normalized = absTotal > 0 ? shap.map(v => +(Math.abs(v) / absTotal).toFixed(4)) : shap.map(() => 0);
  return { test: 'SHAP Values', shap: shap.map(v => +v.toFixed(4)), normalized, n, p, nSamples, apa: `SHAP: ${p} features, n=${n}` };
}


// ── LIME Importance ───────────────────────────────────────────────
/** @param {number[][]} X */
export function limeImportance(X, y, queryPoint, { seed = 42, nSamples = 50, model = null, kernelWidth = null } = {}) {
  __rng = mulberry32(seed);
  if (!X || !y || !queryPoint || X.length < 5) return null;
  const n = X.length, p = X[0].length;
  // Explain a supplied model, or a linear surrogate fit to (X, y).
  const f = model || fitLinear(X, y).predict;
  // Per-feature scale for sampling + the proximity kernel.
  const std = Array.from({ length: p }, (_, j) => {
    const c = X.map(r => +r[j]); const m = avg(c);
    return Math.sqrt(avg(c.map(v => (v - m) ** 2))) || 1;
  });
  const sigma = kernelWidth || Math.sqrt(p);
  // Sample perturbations near the query, label with the model, weight by proximity,
  // then fit a weighted local linear surrogate; |coefficients| = local importance.
  const N = Math.max(nSamples, 30);
  const Zaug = [], preds = [], weights = [];
  for (let s = 0; s < N; s++) {
    const z = queryPoint.map((q, j) => q + (__rng() * 2 - 1) * std[j]);
    Zaug.push([1, ...z]);
    preds.push(f(z));
    let d2 = 0; for (let j = 0; j < p; j++) { const dz = (z[j] - queryPoint[j]) / std[j]; d2 += dz * dz; }
    weights.push(Math.exp(-d2 / (2 * sigma * sigma)));
  }
  const kz = p + 1;
  const ZtWZ = Array.from({ length: kz }, (_, a) => Array.from({ length: kz }, (_, b) => Zaug.reduce((s, row, i) => s + weights[i] * row[a] * row[b], 0)));
  const ZtWy = Array.from({ length: kz }, (_, a) => Zaug.reduce((s, row, i) => s + weights[i] * row[a] * preds[i], 0));
  const beta = solveNormalEquations(ZtWZ, ZtWy);
  const coef = beta.slice(1);
  const importance = coef.map(Math.abs);
  const total = importance.reduce((s, v) => s + v, 0);
  const normalized = total > 0 ? importance.map(v => +(v / total).toFixed(4)) : importance.map(() => 0);
  return { test: 'LIME Importance', importance: importance.map(v => +v.toFixed(4)), coefficients: coef.map(v => +v.toFixed(4)), normalized, p, nSamples, apa: `LIME: ${p} features` };
}

// ── Partial Dependence Plot ───────────────────────────────────────
/** @param {number[][]} X @param {number[]} y */
export function partialDependence(X, y, featureIndex, { nGrid = 20, model = null } = {}) {
  if (!X || !y || X.length < 5 || featureIndex == null || featureIndex >= X[0].length) return null;
  const n = X.length;
  // Explain a supplied model, or a linear surrogate fit to (X, y).
  const f = model || fitLinear(X, y).predict;
  const featVals = X.map(r => r[featureIndex]);
  const minVal = Math.min(...featVals), maxVal = Math.max(...featVals);
  const grid = Array.from({ length: nGrid }, (_, i) => minVal + (maxVal - minVal) * i / (nGrid - 1));
  // PDP(g) = (1/n) Σ_i f(x_i with feature := g)  — Friedman partial dependence.
  const pdp = grid.map(g => {
    let accum = 0;
    for (let i = 0; i < n; i++) {
      const row = [...X[i]];
      row[featureIndex] = g;
      accum += f(row);
    }
    return +(accum / n).toFixed(4);
  });
  return { test: 'Partial Dependence', grid: grid.map(v => +v.toFixed(4)), pdp, featureIndex, n, apa: `PDP: feature ${featureIndex}, ${nGrid} grid points` };
}

// ── Permutation Importance ────────────────────────────────────────
/** @param {number[][]} X @param {number[]} y */
export function permutationImportance(X, y, baselineScore, { nRepeats = 10 } = {}) {
  if (!X || !y || X.length < 5 || !Number.isFinite(baselineScore)) return null;
  const n = X.length, p = X[0].length;
  // No model is supplied, so true permutation importance is not computable.
  // Use a model-free importance: how much each feature's predictive association
  // with y degrades under permutation, measured by drop in |correlation| with y.
  const ybar = y.reduce((s, v) => s + v, 0) / n;
  const sy2 = y.reduce((s, v) => s + (v - ybar) ** 2, 0) || 1e-12;
  const absCorr = j => {
    const col = X.map(r => +r[j]);
    const xbar = col.reduce((s, v) => s + v, 0) / n;
    const sx2 = col.reduce((s, v) => s + (v - xbar) ** 2, 0);
    if (sx2 < 1e-12) return 0;
    const cov = col.reduce((s, v, k) => s + (v - xbar) * (y[k] - ybar), 0);
    return Math.abs(cov / Math.sqrt(sx2 * sy2));
  };
  let seed = 1234567;
  const rand = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const importance = Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    const base = absCorr(j);
    let degraded = 0;
    for (let r = 0; r < nRepeats; r++) {
      const col = X.map(row => +row[j]);
      for (let k = n - 1; k > 0; k--) { const m = Math.floor(rand() * (k + 1)); [col[k], col[m]] = [col[m], col[k]]; }
      const xbar = col.reduce((s, v) => s + v, 0) / n;
      const sx2 = col.reduce((s, v) => s + (v - xbar) ** 2, 0) || 1e-12;
      const cov = col.reduce((s, v, kk) => s + (v - xbar) * (y[kk] - ybar), 0);
      degraded += Math.abs(cov / Math.sqrt(sx2 * sy2));
    }
    importance[j] = Math.max(0, base - degraded / nRepeats);
  }
  const total = importance.reduce((s, v) => s + Math.abs(v), 0);
  const normalized = total > 0 ? importance.map(v => +(v / total).toFixed(4)) : importance.map(() => 0);
  return { test: 'Permutation Importance', importance: importance.map(v => +v.toFixed(4)), normalized, p, nRepeats, apa: `Perm imp: ${p} features (model-free, correlation-based)` };
}

// ── ALE Plot (Accumulated Local Effects) ──────────────────────────
/** @param {number} model */
export function alePlot(X, model, featureIndex, { nIntervals = 10 } = {}) {
  if (!X || X.length < 5 || !X[0] || featureIndex == null) return null;
  const n = X.length;
  const vals = X.map(r => r[featureIndex]);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const intervals = Array.from({length: nIntervals + 1}, (_, i) => minV + (maxV - minV) * i / nIntervals);
  const ale = Array(nIntervals).fill(0);
  for (let k = 0; k < nIntervals; k++) {
    const lo = intervals[k], hi = intervals[k + 1];
    // The last interval must be closed on the right ([lo, hi]) — otherwise the
    // single point (or points) sitting exactly at the feature's maximum value
    // never satisfies `< hi` for any bin and is silently dropped from the ALE
    // estimate entirely (verified: with a max-value point isolated from its
    // neighbors, its bin's local effect stayed 0 instead of reflecting that
    // point's actual contribution).
    const inBin = X.filter(r => r[featureIndex] >= lo && (k === nIntervals - 1 ? r[featureIndex] <= hi : r[featureIndex] < hi));
    // ALE is a running cumulative sum: an empty bin (no data to estimate a
    // local effect from) must carry the previous bin's cumulative value
    // forward unchanged, not reset to 0 — the previous version's `continue`
    // left ale[k] at its Array(nIntervals).fill(0) initial value instead,
    // producing spurious drops to zero at any gap in the data.
    if (!inBin.length) { ale[k] = k > 0 ? ale[k - 1] : 0; continue; }
    let effect = 0;
    for (const row of inBin) {
      const rowLo = [...row]; rowLo[featureIndex] = lo;
      const rowHi = [...row]; rowHi[featureIndex] = hi;
      effect += (model(rowHi) - model(rowLo)) / inBin.length;
    }
    ale[k] = +((k > 0 ? ale[k - 1] : 0) + effect).toFixed(4);
  }
  return { test: 'ALE Plot', intervals: intervals.map(v => +v.toFixed(4)), ale, featureIndex, n, apa: `ALE: feature ${featureIndex}` };
}

// ── Feature Interaction (Friedman's H) ────────────────────────────
/** @param {number} model */
export function featureInteraction(X, model, i, j) {
  if (!X || X.length < 5 || i == null || j == null) return null;
  const n = X.length;
  // Friedman's H: variance of the pure interaction (joint PD minus the two
  // marginal PDs) relative to the variance of the joint PD.
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const pdJoint = (a, b) => mean(X.map(r => model(r.map((v, idx) => idx === i ? a : idx === j ? b : v))));
  const pdI = a => mean(X.map(r => model(r.map((v, idx) => idx === i ? a : v))));
  const pdJ = b => mean(X.map(r => model(r.map((v, idx) => idx === j ? b : v))));
  const fij = X.map(r => pdJoint(r[i], r[j]));
  const fi = X.map(r => pdI(r[i]));
  const fj = X.map(r => pdJ(r[j]));
  const center = a => { const m = mean(a); return a.map(v => v - m); };
  const cij = center(fij), ci = center(fi), cj = center(fj);
  let num = 0, den = 0;
  for (let k = 0; k < n; k++) { num += (cij[k] - ci[k] - cj[k]) ** 2; den += cij[k] ** 2; }
  const H2 = den > 1e-12 ? Math.sqrt(Math.max(0, num / den)) : 0;
  return { test: 'Feature Interaction', H: +H2.toFixed(4), i, j, n, apa: `Interaction F(${i},${j}) = ${H2.toFixed(3)}` };
}

// ── Global Surrogate Model ────────────────────────────────────────
/** @param {number[]} X @param {number[]} y */
export function globalSurrogate(X, y, { model = null } = {}) {
  if (!X || !y || X.length < 5 || y.length < 5) return null;
  const n = X.length;
  // Fit an interpretable linear surrogate to the target (or to a supplied
  // model's predictions), then report its fidelity to y.
  const target = model ? X.map(r => model(r)) : y;
  const lin = fitLinear(X, target);
  const predictions = X.map(r => +lin.predict(r).toFixed(4));
  const sse = predictions.reduce((s, p, i) => s + (p - y[i]) ** 2, 0);
  const rmse = Math.sqrt(sse / n);
  const ybar = avg(y);
  const sst = y.reduce((s, v) => s + (v - ybar) ** 2, 0) || 1e-12;
  const r2 = Math.max(0, Math.min(1, 1 - sse / sst));
  return {
    test: 'Global Surrogate', r2: +r2.toFixed(4), rmse: +rmse.toFixed(4),
    coefficients: lin.coef.map(v => +v.toFixed(4)), intercept: +lin.intercept.toFixed(4), n,
    apa: `Surrogate (linear): R2=${r2.toFixed(3)}, RMSE=${rmse.toFixed(2)}`,
  };
}
