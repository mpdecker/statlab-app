import { avg } from '../math/core.js';
import { solveNormalEquations, matInv } from '../math/matrix.js';

// ── STAR Model ────────────────────────────────────────────────────
export function starModel(data, yVar, xVars, W, { p = 1 } = {}) {
  if (!data || data.length < 10 || !yVar || !xVars || !W) return null;
  const n = data.length, k = xVars.length;
  const y = data.map(r => +r[yVar]);
  const X = data.map(r => xVars.map(c => +r[c]));
  const Wy = W.map(row => row.reduce((s, wi, j) => s + wi * y[j], 0));
  const Xall = X.map((xi, i) => [Wy[i], ...xi]);
  const Xt = Xall[0].map((_, j) => Xall.map(r => r[j]));
  const XtX = Xt.map(r1 => Xall[0].map((_, j) => r1.reduce((s, _, a) => s + Xall[a][j] * r1[a], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, a) => s + v * y[a], 0));
  const beta = solveNormalEquations(XtX, XtY);
  const fitted = Xall.map(xi => xi.reduce((s, v, j) => s + v * beta[j], 0));
  let ssr = 0, sst = 0;
  const my = avg(y);
  for (let i = 0; i < n; i++) { ssr += (y[i] - fitted[i]) ** 2; sst += (y[i] - my) ** 2; }
  const r2 = sst > 0 ? 1 - ssr / sst : 0;
  return {
    test: 'STAR Model', rho: +beta[0].toFixed(4), coefficients: xVars.map((n, j) => ({ name: n, b: +beta[1 + j].toFixed(4) })), rSquared: +r2.toFixed(4), n,
    _rho: beta[0], _betaX: beta.slice(1), _W: W, _X: X, _y: y,
    apa: `STAR: ρ = ${beta[0].toFixed(3)}, R² = ${r2.toFixed(3)}`,
  };
}

// ── GSTAR ─────────────────────────────────────────────────────────
export function gstarModel(data, yVar, xVars, W, { p = 1, q = 1 } = {}) {
  if (!data || data.length < 10 || !yVar || !W) return null;
  const n = data.length;
  const y = data.map(r => +r[yVar]);
  const Wy = W.map(row => row.reduce((s, wi, j) => s + wi * y[j], 0));
  const X = data.map(r => (xVars || []).map(c => +r[c]));
  const Xall = X.map((xi, i) => [Wy[i], ...xi]);
  const Xt = Xall[0].map((_, j) => Xall.map(r => r[j]));
  const XtX = Xt.map(r1 => Xall[0].map((_, j) => r1.reduce((s, _, a) => s + Xall[a][j] * r1[a], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, a) => s + v * y[a], 0));
  let beta = solveNormalEquations(XtX, XtY);
  const fitted = Xall.map(xi => xi.reduce((s, v, j) => s + v * beta[j], 0));
  return {
    test: 'GSTAR Model', rho: +beta[0].toFixed(4), coefficients: (xVars || []).map((n, j) => ({ name: n, b: +beta[1 + j].toFixed(4) })), n,
    _rho: beta[0], _betaX: beta.slice(1), _W: W, _X: X, _y: y,
    apa: `GSTAR: ρ = ${beta[0].toFixed(3)}, n = ${n}`,
  };
}

// ── Space-Time Interaction ────────────────────────────────────────
export function spaceTimeInteraction(data, yVar, xVars, timeVar) {
  if (!data || data.length < 10 || !yVar || !timeVar) return null;
  const n = data.length;
  const y = data.map(r => +r[yVar]);
  const t = data.map(r => +r[timeVar]);
  const X = data.map(r => (xVars || []).map(c => +r[c]));
  const Xt = X[0].map((_, j) => X.map(r => r[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, a) => s + X[a][j] * r1[a], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, a) => s + v * y[a], 0));
  const beta = solveNormalEquations(XtX, XtY);
  const resid = y.map((yi, i) => yi - X[i].reduce((s, v, j) => s + v * beta[j], 0));
  const tResid = t.map((ti, i) => ti * resid[i]);
  const inter = avg(tResid);
  return { test: 'Space-Time Interaction', interaction: +inter.toFixed(4), n, apa: `ST interaction = ${inter.toFixed(3)}, n = ${n}` };
}

// ── Spatiotemporal Moran's I ──────────────────────────────────────
export function spatiotemporalMoran(data, yVar, timeVar, W = null) {
  if (!data || data.length < 10 || !yVar || !timeVar) return null;
  const n = data.length;
  const y = data.map(r => +r[yVar]);
  const t = data.map(r => +r[timeVar]);
  const mu = avg(y);
  const z = y.map(v => v - mu);
  // Weights: a supplied spatial matrix W, else symmetric temporal contiguity
  // (units adjacent in time get weight 1). Standard Moran I = (n/S0)·Σ wᵢⱼzᵢzⱼ/Σzᵢ².
  let wMat;
  if (Array.isArray(W) && W.length === n) {
    wMat = W;
  } else {
    const order = [...Array(n).keys()].sort((a, b) => t[a] - t[b]);
    const rank = Array(n); order.forEach((idx, r) => { rank[idx] = r; });
    wMat = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (Math.abs(rank[i] - rank[j]) === 1 ? 1 : 0)));
  }
  let S0 = 0, num = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { S0 += wMat[i][j]; num += wMat[i][j] * z[i] * z[j]; }
  const denom = z.reduce((s, v) => s + v * v, 0);
  const I = (denom > 0 && S0 > 0) ? (n / S0) * (num / denom) : 0;
  return { test: 'Spatiotemporal Moran', I: +I.toFixed(4), n, apa: `ST Moran I = ${I.toFixed(3)}` };
}

// ── Space-Time Forecast ───────────────────────────────────────────
// Projects a fitted STAR/GSTAR model forward via its own reduced-form recursion
// y_{t+h} = ρ·W·y_{t+h-1} + Xβ (X held at its last observed values), which converges
// geometrically to the fixed point (I-ρW)⁻¹Xβ. Falls back to a scalar ρ^h decay when
// no spatial state (W, X, y) is available on the model.
export function spaceTimeForecast(model, nSteps = 1) {
  if (!model || model.rho == null || nSteps < 1) return null;
  const rho = model._rho != null ? model._rho : model.rho;
  const n = Math.max(1, Math.floor(nSteps));

  if (model._W && model._y) {
    const W = model._W, k = W.length;
    const betaX = model._betaX || [];
    const X = model._X || Array.from({ length: k }, () => []);
    const c = X.map(xi => xi.reduce((s, v, j) => s + v * (betaX[j] || 0), 0));
    let yVec = model._y.slice();
    const forecastVectors = [];
    for (let h = 0; h < n; h++) {
      const Wy = W.map(row => row.reduce((s, wi, j) => s + wi * yVec[j], 0));
      yVec = Wy.map((wy, i) => rho * wy + c[i]);
      forecastVectors.push(yVec.slice());
    }
    const forecasts = forecastVectors.map(v => +avg(v).toFixed(4));
    const I = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1 : 0) - rho * W[i][j]));
    const Ainv = matInv(I);
    const equilibrium = Ainv ? avg(Ainv.map(row => row.reduce((s, v, j) => s + v * c[j], 0))) : null;
    return {
      test: 'Space-Time Forecast', forecasts, nSteps: n,
      equilibrium: equilibrium != null ? +equilibrium.toFixed(4) : null,
      apa: `ST forecast: ${n} steps, ρ = ${rho.toFixed(3)}${equilibrium != null ? `, converging toward ${equilibrium.toFixed(3)}` : ''}`,
    };
  }

  const forecasts = Array.from({ length: n }, (_, h) => +Math.pow(rho, h + 1).toFixed(4));
  return { test: 'Space-Time Forecast', forecasts, nSteps: n, apa: `ST forecast: ${n} steps, ρ = ${rho.toFixed(3)} (no spatial state supplied)` };
}
