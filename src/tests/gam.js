import { avg } from '../math/core.js';

function cubicSpline(x, knots = 10) {
  const n = x.length;
  const xMin = Math.min(...x), xMax = Math.max(...x);
  const range = xMax - xMin || 1;
  const k = Math.min(knots, n - 4);
  const basis = [Array(n).fill(1), x.map(v => v)];
  for (let j = 0; j < k; j++) {
    const knot = xMin + (j + 1) * range / (k + 1);
    basis.push(x.map(v => Math.max(0, v - knot) ** 3));
  }
  return basis;
}

function backfitOne(y, basis, beta, lambda = 0.1) {
  const n = y.length, m = basis.length;
  if (!m || !n) return null;
  const Xt = basis[0].map((_, j) => basis.map(r => r[j]));
  const XtX = Xt.map(r1 => basis[0].map((_, j) => r1.reduce((s, _, a) => s + basis[a][j] * r1[a], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, a) => s + v * y[a], 0));
  for (let i = 0; i < m; i++) XtX[i][i] += lambda;
  // Simple diagonal solve
  return XtY.map((v, i) => v / Math.max(XtX[i][i], 1e-8));
}

// GAM Backfitting
export function gamBackfitting(y, X, smoothVars, { family = 'gaussian', maxIter = 20 } = {}) {
  if (!y || !X || !smoothVars || !y.length || !X.length) return null;
  const n = y.length;
  const smoothIdx = smoothVars.map(v => X[0].indexOf(v)).filter(i => i >= 0);
  const linearIdx = Array.from({ length: X[0].length }, (_, i) => i).filter(i => !smoothIdx.includes(i));
  let alpha = avg(y);
  const betas = Array(X[0].length).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    const fitted = X.map(xi => alpha + xi.reduce((s, v, j) => s + v * betas[j], 0));
    const resid = y.map((yi, i) => yi - fitted[i]);
    // Update smooth components
    for (const idx of smoothIdx) {
      const xvals = X.map(r => r[idx]);
      const basis = cubicSpline(xvals, 5);
      const contrib = basis.map(b => b.map((_, j) => resid[j]));
      const b = backfitOne(resid, basis, betas);
      if (b) betas[idx] = b[0] || 0;
    }
    alpha = avg(resid) + alpha;
    const maxDelta = Math.max(...smoothIdx.map(i => Math.abs(betas[i])));
    if (maxDelta < 1e-4) break;
  }
  const fitted = X.map(xi => alpha + xi.reduce((s, v, j) => s + v * betas[j], 0));
  let ssr = 0, sst = 0;
  const my = avg(y);
  for (let i = 0; i < n; i++) { ssr += (y[i] - fitted[i]) ** 2; sst += (y[i] - my) ** 2; }
  const r2 = sst > 0 ? 1 - ssr / sst : 0;
  return { test: 'GAM Backfitting', alpha: +alpha.toFixed(4), betas: betas.map(v => +v.toFixed(4)), rSquared: +r2.toFixed(4), n, smoothVars, apa: `GAM: smooth = ${smoothVars.join(', ')}, R² = ${r2.toFixed(3)}` };
}

// GAM Spline
export function gamSpline(data, yVar, smoothVar, { df = 5 } = {}) {
  if (!data || data.length < 10 || !yVar || !smoothVar) return null;
  const y = data.map(r => +r[yVar]);
  const x = data.map(r => +r[smoothVar]);
  const basis = cubicSpline(x, df);
  const betas = backfitOne(y, basis, Array(df + 2).fill(0));
  if (!betas) return null;
  const fitted = basis.reduce((acc, b, j) => acc.map((v, i) => v + b[i] * (betas[j] || 0)), Array(x.length).fill(0));
  return { test: 'GAM Spline', fitted: fitted.map(v => +v.toFixed(4)).slice(0, 10), df, n, apa: `GAM spline: ${smoothVar}, df = ${df}` };
}

// GAM Local Scoring
export function gamLocalScoring(y, X, { family = 'binomial', maxIter = 10 } = {}) {
  if (!y || !X || !y.length) return null;
  const n = y.length;
  const p = X[0].length;
  let eta = Array(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    let mu, w;
    if (family === 'binomial') {
      mu = eta.map(e => 1 / (1 + Math.exp(-e)));
      w = mu.map((m, i) => Math.max(0.01, m * (1 - m)));
    } else {
      mu = eta.map(e => e);
      w = Array(n).fill(1);
    }
    const z = eta.map((e, i) => e + (y[i] - mu[i]) / Math.max(w[i], 0.01));
    const Xt = X[0].map((_, j) => X.map(r => r[j]));
    const XtWX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + w[k] * X[k][j] * r1[k], 0)));
    const XtWz = Xt.map(r1 => r1.reduce((s, v, k) => s + v * z[k], 0));
    const diag = XtWX.map((r, i) => r[i] || 1);
    const beta = XtWz.map((v, i) => v / diag[i]);
    eta = X.map(xi => xi.reduce((s, v, j) => s + v * beta[j], 0));
  }
  const mu = eta.map(e => 1 / (1 + Math.exp(-e)));
  const ll = y.reduce((s, yi, i) => s + (yi ? Math.log(Math.max(mu[i], 1e-10)) : Math.log(Math.max(1 - mu[i], 1e-10))), 0);
  return { test: 'GAM Local Scoring', logLik: +ll.toFixed(4), n, p, apa: `Local scoring (${family}): LL = ${ll.toFixed(2)}` };
}

// GAM Effective DF
export function gamEffectiveDf(splineComponents) {
  if (!splineComponents || !splineComponents.length) return null;
  const totalDf = splineComponents.reduce((s, c) => s + (c.df || 1), 1);
  return { test: 'GAM Effective DF', edf: totalDf, nSmooths: splineComponents.length, apa: `GAM edf = ${totalDf.toFixed(1)}` };
}

// GAM Predict
export function gamPredict(gamFit, newData) {
  if (!gamFit || !newData) return null;
  const pred = gamFit.alpha || 0;
  return { test: 'GAM Predict', prediction: +pred.toFixed(4), apa: `GAM pred = ${pred.toFixed(3)}` };
}

// GAM Interaction
export function gamInteraction(data, yVar, var1, var2, { df = 5 } = {}) {
  if (!data || data.length < 10 || !yVar || !var1 || !var2) return null;
  const y = data.map(r => +r[yVar]);
  const x1 = data.map(r => +r[var1]);
  const x2 = data.map(r => +r[var2]);
  const basis1 = cubicSpline(x1, Math.floor(df / 2));
  const basis2 = cubicSpline(x2, Math.floor(df / 2));
  const n = y.length;
  const interaction = basis1.flatMap((b1, i) => basis2.map(b2 => b1.map((v, j) => v * b2[j])));
  return { test: 'GAM Interaction', n, apa: `GAM interaction: ${var1} × ${var2}, n = ${n}` };
}
