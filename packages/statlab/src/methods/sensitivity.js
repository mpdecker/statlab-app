import { avg, sampleVar } from '../math/core.js';
import { fPVal } from '../math/distributions.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Morris Elementary Effects ─────────────────────────────────────
/** @param {number} model @param {number[][]} X */
export function morrisMethod(model, X, { seed = 42, levels = 4, grid = 2 } = {}) {
  __rng = mulberry32(seed);
  if (!model || !X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const effects = Array(p).fill(0).map(() => ({ mu: 0, muStar: 0, sigma: 0 }));
  const deltas = [];
  for (let r = 0; r < grid * (p + 1); r++) {
    const base = X[Math.floor(__rng() * n)];
    const pert = base.map((v, j) => v + (__rng() - 0.5) * 0.2);
    const dy = Math.abs((model(pert) - model(base)) / 0.2);
    const j = Math.floor(__rng() * p);
    effects[j].mu += dy;
    effects[j].muStar += Math.abs(dy);
    effects[j].sigma += dy * dy;
  }
  const R = p + 1;
  effects.forEach(e => { e.mu /= R; e.muStar /= R; e.sigma = Math.sqrt(e.sigma / R); });
  return { test: 'Morris Method', effects: effects.map(e => ({ ...e, mu: +e.mu.toFixed(4), muStar: +e.muStar.toFixed(4), sigma: +e.sigma.toFixed(4) })), n, p, levels, apa: `Morris: ${p} factors` };
}

// ── FAST Sensitivity ──────────────────────────────────────────────
/** @param {number} model @param {number[][]} X */
export function fastSensitivity(model, X, { seed = 42, M = 4 } = {}) {
  __rng = mulberry32(seed);
  if (!model || !X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const Si = Array(p).fill(0);
  const N = 100;
  for (let j = 0; j < p; j++) {
    let num = 0, den = 0;
    for (let i = 0; i < N; i++) {
      const base = X[Math.floor(__rng() * n)].slice();
      const pert = base.slice();
      const kf = (i + 1) / N;
      base[j] += kf * 0.1;
      pert[j] -= kf * 0.1;
      const dy = model(base) - model(pert);
      num += dy * dy;
      den += model(X[Math.floor(__rng() * n)]) ** 2;
    }
    Si[j] = num / Math.max(den, 1e-10) / N;
  }
  const total = Si.reduce((s, v) => s + v, 0);
  return { test: 'FAST Sensitivity', Si: Si.map(v => +(v / Math.max(total, 1)).toFixed(4)), n, p, apa: `FAST: ${p} factors` };
}

// ── Model Comparison F-test ───────────────────────────────────────
/** @param {number} n */
export function modelComparison(mse1, mse2, n, k1, k2) {
  if (!Number.isFinite(mse1) || !Number.isFinite(mse2) || n < 5) return null;
  const fStat = mse2 > 0 ? mse1 / mse2 : 0;
  const df1 = n - k1 - 1, df2 = n - k2 - 1;
  const p = fPVal(Math.max(fStat, 0), Math.max(1, df1), Math.max(1, df2));
  return { test: 'Model Comparison', f: +fStat.toFixed(4), df1, df2, p, n, apa: `F = ${fStat.toFixed(2)}, ${p < 0.05 ? 'models differ' : 'models similar'}` };
}


// ── Forecast Combination ──────────────────────────────────────────
/** @param {number[]} actual */
export function forecastCombination(forecasts, actual, { method = 'equal' } = {}) {
  if (!forecasts || !actual || !forecasts.length || actual.length < 5) return null;
  const k = forecasts.length, n = actual.length;
  let combined;
  if (method === 'equal') {
    combined = actual.map((_, i) => +avg(forecasts.map(f => f[i])).toFixed(4));
  } else {
    combined = actual.map((_, i) => +forecasts[0][i].toFixed(4));
  }
  let mse = 0;
  for (let i = 0; i < n; i++) mse += (combined[i] - actual[i]) ** 2;
  return { test: 'Forecast Combination', mse: +(mse / n).toFixed(4), method, n, k, apa: `Combination: MSE = ${(mse / n).toFixed(4)}` };
}

// ── Sobol First Order ─────────────────────────────────────────────
/** @param {number} model @param {number[][]} X */
export function sobolFirstOrder(model, X, { seed = 42, nSamples = 50 } = {}) {
  __rng = mulberry32(seed);
  if (!model || !X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const Si = Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    let vY = 0;
    const yOrig = X.map(x => model(x));
    const muY = avg(yOrig);
    for (const y of yOrig) vY += (y - muY) ** 2;
    vY /= n;
    let vj = 0;
    for (let s = 0; s < nSamples; s++) {
      const xi = X[Math.floor(__rng() * n)];
      const xp = [...xi];
      xp[j] = X[Math.floor(__rng() * n)][j];
      vj += model(xi) * model(xp);
    }
    vj = vj / nSamples - muY * muY;
    Si[j] = vY > 0 ? vj / vY : 0;
  }
  return { test: 'Sobol First Order', Si: Si.map(v => +(Math.max(0, Math.min(1, v))).toFixed(4)), n, p, apa: `Sobol: ${p} factors` };
}

// ── Sobol Total Index ─────────────────────────────────────────────
/** @param {number} model @param {number[][]} X */
export function sobolTotalIndex(model, X, { seed = 42, nSamples = 50 } = {}) {
  __rng = mulberry32(seed);
  if (!model || !X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const Y = X.map(row => model(row));
  const varY = sampleVar(Y);
  if (varY < 1e-10) return null;
  const totalIndices = Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    let Vj = 0;
    for (let s = 0; s < nSamples; s++) {
      const Xj = X.map(row => {
        const newRow = [...row];
        const altIdx = Math.floor(__rng() * n);
        newRow[j] = X[altIdx][j];
        return newRow;
      });
      const Yj = Xj.map(row => model(row));
      Vj += Yj.reduce((s, v, i) => s + v * Y[i], 0) / nSamples;
    }
    totalIndices[j] = +(1 - Vj / (nSamples * n * avg(Y) * avg(Y))).toFixed(4);
  }
  return { test: 'Sobol Total Index', totalIndices: totalIndices.map(v => +Math.max(0, Math.min(1, v)).toFixed(4)), n, p, nSamples, apa: `Sobol total: ${p} factors` };
}

// ── Delta Method (propagation of error) ───────────────────────────
/** @param {Function} fn */
export function deltaMethod(means, ses, fn, h = 1e-6) {
  if (!means || !ses || means.length < 1 || means.length !== ses.length) return null;
  const p = means.length;
  const grad = means.map((m, i) => {
    const plus = [...means]; plus[i] = m + h;
    const minus = [...means]; minus[i] = m - h;
    return (fn(plus) - fn(minus)) / (2 * h);
  });
  const variance = grad.reduce((s, g, i) => s + g * g * ses[i] * ses[i], 0);
  const se = Math.sqrt(Math.max(variance, 0));
  return { test: 'Delta Method', estimate: +fn(means).toFixed(4), se: +se.toFixed(4), p, apa: `Delta: est=${fn(means).toFixed(3)}, se=${se.toFixed(3)}` };
}

// ── Andrews Plot Data ─────────────────────────────────────────────
/** @param {number[][]} X @param {number[]} [labels] */
export function andrewsPlot(X, labels = null, { nPts = 50 } = {}) {
  if (!X || X.length < 2 || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const t = Array.from({length: nPts}, (_, i) => -Math.PI + 2 * Math.PI * i / (nPts - 1));
  const curves = X.map((row, idx) => ({
    label: labels ? labels[idx] : (idx + 1),
    curve: t.map(ti => {
      let s = row[0] / Math.SQRT2;
      for (let j = 1; j < p; j++) {
        const freq = Math.floor((j + 1) / 2);
        s += j % 2 === 1 ? row[j] * Math.sin(freq * ti) : row[j] * Math.cos(freq * ti);
      }
      return { t: +ti.toFixed(4), f: +s.toFixed(4) };
    })
  }));
  return { test: 'Andrews Plot', curves, nCurves: n, p, nPts, apa: `Andrews: ${n} curves, ${p} vars` };
}
