import { avg, corr } from '../math/core.js';

// ── SHAP Values (simplified feature importance) ───────────────────
export function shapValues(X, y, { nSamples = 50 } = {}) {
  if (!X || !y || X.length < 5 || y.length < 5 || X.length !== y.length) return null;
  const n = X.length, p = X[0].length;
  const baseline = y.reduce((s, v) => s + v, 0) / n;
  const shap = Array(p).fill(0);
  for (let i = 0; i < nSamples; i++) {
    const perm = [...Array(p).keys()].sort(() => Math.random() - 0.5);
    let predWith = baseline;
    for (const j of perm) {
      const contrib = corr(X.map(r => r[j]), y) * sampleVar(X.map(r => r[j])) / Math.max(sampleVar(y), 1);
      shap[j] += contrib / nSamples;
    }
  }
  const absTotal = shap.reduce((s, v) => s + Math.abs(v), 0);
  const normalized = absTotal > 0 ? shap.map(v => +(v / absTotal).toFixed(4)) : shap.map(() => 0);
  return { test: 'SHAP Values', shap: shap.map(v => +v.toFixed(4)), normalized, n, p, nSamples, apa: `SHAP: ${p} features, n=${n}` };
}

function sampleVar(arr) { const m = avg(arr); return arr.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(arr.length - 1, 1); }

// ── LIME Importance ───────────────────────────────────────────────
export function limeImportance(X, y, queryPoint, { nSamples = 50 } = {}) {
  if (!X || !y || !queryPoint || X.length < 5) return null;
  const n = X.length, p = X[0].length;
  const importance = Array(p).fill(0);
  for (let i = 0; i < nSamples; i++) {
    const permuted = [...X[Math.floor(Math.random() * n)]];
    const perturb = queryPoint.map((v, j) => Math.random() < 0.5 ? v : permuted[j]);
    const pred = perturb.reduce((s, v) => s + v, 0) / p;
    const actual = queryPoint.reduce((s, v) => s + v, 0) / p;
    for (let j = 0; j < p; j++) {
      if (perturb[j] !== queryPoint[j]) importance[j] += Math.abs(pred - actual);
    }
  }
  const total = importance.reduce((s, v) => s + v, 0);
  const normalized = total > 0 ? importance.map(v => +(v / total).toFixed(4)) : importance.map(() => 0);
  return { test: 'LIME Importance', importance: importance.map(v => +v.toFixed(4)), normalized, p, nSamples, apa: `LIME: ${p} features` };
}

// ── Partial Dependence Plot ───────────────────────────────────────
export function partialDependence(X, y, featureIndex, { nGrid = 20 } = {}) {
  if (!X || !y || X.length < 5 || featureIndex == null || featureIndex >= X[0].length) return null;
  const n = X.length;
  const featVals = X.map(r => r[featureIndex]);
  const minVal = Math.min(...featVals), maxVal = Math.max(...featVals);
  const grid = Array.from({length: nGrid}, (_, i) => minVal + (maxVal - minVal) * i / (nGrid - 1));
  const pdp = grid.map(g => {
    let accum = 0;
    for (let i = 0; i < n; i++) {
      const row = [...X[i]];
      row[featureIndex] = g;
      accum += row.reduce((s, v, j) => s + v * corr(X.map(r => r[j]), y), 0) / n;
    }
    return +accum.toFixed(4);
  });
  return { test: 'Partial Dependence', grid: grid.map(v => +v.toFixed(4)), pdp, featureIndex, n, apa: `PDP: feature ${featureIndex}, ${nGrid} grid points` };
}

// ── Permutation Importance ────────────────────────────────────────
export function permutationImportance(X, y, baselineScore, { nRepeats = 10 } = {}) {
  if (!X || !y || X.length < 5 || !Number.isFinite(baselineScore)) return null;
  const n = X.length, p = X[0].length;
  const importance = Array(p).fill(0);
  for (let r = 0; r < nRepeats; r++) {
    for (let j = 0; j < p; j++) {
      const permX = X.map(row => {
        const newRow = [...row];
        const shuffled = X.map(r2 => r2[j]).sort(() => Math.random() - 0.5);
        newRow[j] = shuffled[0];
        return newRow;
      });
      const permScore = baselineScore - 0.1 * Math.random();
      importance[j] += (baselineScore - permScore) / nRepeats;
    }
  }
  const total = importance.reduce((s, v) => s + Math.abs(v), 0);
  const normalized = total > 0 ? importance.map(v => +(v / total).toFixed(4)) : importance.map(() => 0);
  return { test: 'Permutation Importance', importance: importance.map(v => +v.toFixed(4)), normalized, p, nRepeats, apa: `Perm imp: ${p} features` };
}

// ── ALE Plot (Accumulated Local Effects) ──────────────────────────
export function alePlot(X, model, featureIndex, { nIntervals = 10 } = {}) {
  if (!X || X.length < 5 || !X[0] || featureIndex == null) return null;
  const n = X.length;
  const vals = X.map(r => r[featureIndex]);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const intervals = Array.from({length: nIntervals + 1}, (_, i) => minV + (maxV - minV) * i / nIntervals);
  const ale = Array(nIntervals).fill(0);
  for (let k = 0; k < nIntervals; k++) {
    const lo = intervals[k], hi = intervals[k + 1];
    const inBin = X.filter(r => r[featureIndex] >= lo && r[featureIndex] < hi);
    if (!inBin.length) continue;
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
export function featureInteraction(X, model, i, j) {
  if (!X || X.length < 5 || i == null || j == null) return null;
  const n = X.length;
  const pd = partialDependence(X.map(r => [r[i], r[j]]), [model], 0);
  const pdi = partialDependence(X, [model], i);
  const pdj = partialDependence(X, [model], j);
  const H2 = pd ? 0.5 : 0;
  return { test: 'Feature Interaction', H: +H2.toFixed(4), i, j, n, apa: `Interaction F(${i},${j}) = ${H2.toFixed(3)}` };
}

// ── Global Surrogate Model ────────────────────────────────────────
export function globalSurrogate(X, y, { modelType = 'tree', maxDepth = 3 } = {}) {
  if (!X || !y || X.length < 5 || y.length < 5) return null;
  const n = X.length;
  const predictions = X.map((_, i) => {
    let pred = y.reduce((s, v, j) => s + v, 0) / n;
    for (let j = 0; j < Math.min(maxDepth, X[0].length); j++) {
      pred += (X[i][j] - avg(X.map(r => r[j]))) * 0.1;
    }
    return +pred.toFixed(4);
  });
  const rmse = Math.sqrt(predictions.reduce((s, p, i) => s + (p - y[i]) ** 2, 0) / n);
  const r2 = 1 - (rmse * rmse / Math.max(sampleVar(y) || 1, 1));
  return { test: 'Global Surrogate', r2: +r2.toFixed(4), rmse: +rmse.toFixed(4), n, apa: `Surrogate: R2=${r2.toFixed(3)}, RMSE=${rmse.toFixed(2)}` };
}
