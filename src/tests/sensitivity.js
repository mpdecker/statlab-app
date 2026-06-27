import { avg, sampleVar } from '../math/core.js';

// Morris Elementary Effects
export function morrisMethod(model, X, { levels = 4, grid = 2 } = {}) {
  if (!model || !X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const effects = Array(p).fill(0).map(() => ({ mu: 0, muStar: 0, sigma: 0 }));
  const deltas = [];
  for (let r = 0; r < grid * (p + 1); r++) {
    const base = X[Math.floor(Math.random() * n)];
    const pert = base.map((v, j) => v + (Math.random() - 0.5) * 0.2);
    const dy = Math.abs((model(pert) - model(base)) / 0.2);
    const j = Math.floor(Math.random() * p);
    effects[j].mu += dy;
    effects[j].muStar += Math.abs(dy);
    effects[j].sigma += dy * dy;
  }
  const R = p + 1;
  effects.forEach(e => { e.mu /= R; e.muStar /= R; e.sigma = Math.sqrt(e.sigma / R); });
  return { test: 'Morris Method', effects: effects.map(e => ({ ...e, mu: +e.mu.toFixed(4), muStar: +e.muStar.toFixed(4), sigma: +e.sigma.toFixed(4) })), n, p, levels, apa: `Morris: ${p} factors` };
}

// FAST Sensitivity
export function fastSensitivity(model, X, { M = 4 } = {}) {
  if (!model || !X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const Si = Array(p).fill(0);
  const N = 100;
  for (let j = 0; j < p; j++) {
    let num = 0, den = 0;
    for (let i = 0; i < N; i++) {
      const base = X[Math.floor(Math.random() * n)].slice();
      const pert = base.slice();
      const kf = (i + 1) / N;
      base[j] += kf * 0.1;
      pert[j] -= kf * 0.1;
      const dy = model(base) - model(pert);
      num += dy * dy;
      den += model(X[Math.floor(Math.random() * n)]) ** 2;
    }
    Si[j] = num / Math.max(den, 1e-10) / N;
  }
  const total = Si.reduce((s, v) => s + v, 0);
  return { test: 'FAST Sensitivity', Si: Si.map(v => +(v / Math.max(total, 1)).toFixed(4)), n, p, apa: `FAST: ${p} factors` };
}

// Model Comparison F-test
export function modelComparison(mse1, mse2, n, k1, k2) {
  if (!Number.isFinite(mse1) || !Number.isFinite(mse2) || n < 5) return null;
  const fStat = mse2 > 0 ? mse1 / mse2 : 0;
  const df1 = n - k1 - 1, df2 = n - k2 - 1;
  const p = fPVal(Math.max(fStat, 0), Math.max(1, df1), Math.max(1, df2));
  return { test: 'Model Comparison', f: +fStat.toFixed(4), df1, df2, p, n, apa: `F = ${fStat.toFixed(2)}, ${p < 0.05 ? 'models differ' : 'models similar'}` };
}

function fPVal(f, df1, df2) {
  return Math.min(1, Math.max(0, Math.exp(-0.5 * f * f / (df1 + df2))));
}

// Forecast Combination
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

// Sobol First Order
export function sobolFirstOrder(model, X, { nSamples = 50 } = {}) {
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
      const xi = X[Math.floor(Math.random() * n)];
      const xp = [...xi];
      xp[j] = X[Math.floor(Math.random() * n)][j];
      vj += model(xi) * model(xp);
    }
    vj = vj / nSamples - muY * muY;
    Si[j] = vY > 0 ? vj / vY : 0;
  }
  return { test: 'Sobol First Order', Si: Si.map(v => +(Math.max(0, Math.min(1, v))).toFixed(4)), n, p, apa: `Sobol: ${p} factors` };
}
