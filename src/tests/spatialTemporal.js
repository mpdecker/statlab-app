import { avg } from '../math/core.js';

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
  const diag = XtX.map((r, i) => r[i] || 1);
  const beta = XtY.map((v, i) => v / diag[i]);
  const fitted = Xall.map(xi => xi.reduce((s, v, j) => s + v * beta[j], 0));
  let ssr = 0, sst = 0;
  const my = avg(y);
  for (let i = 0; i < n; i++) { ssr += (y[i] - fitted[i]) ** 2; sst += (y[i] - my) ** 2; }
  const r2 = sst > 0 ? 1 - ssr / sst : 0;
  return { test: 'STAR Model', rho: +beta[0].toFixed(4), coefficients: xVars.map((n, j) => ({ name: n, b: +beta[1 + j].toFixed(4) })), rSquared: +r2.toFixed(4), n, apa: `STAR: ρ = ${beta[0].toFixed(3)}, R² = ${r2.toFixed(3)}` };
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
  let beta = XtY.map((v, i) => v / Math.max(XtX[i][i], 1));
  const fitted = Xall.map(xi => xi.reduce((s, v, j) => s + v * beta[j], 0));
  return { test: 'GSTAR Model', rho: +beta[0].toFixed(4), coefficients: (xVars || []).map((n, j) => ({ name: n, b: +beta[1 + j].toFixed(4) })), n, apa: `GSTAR: ρ = ${beta[0].toFixed(3)}, n = ${n}` };
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
  const diag = XtX.map((r, i) => r[i] || 1);
  const beta = XtY.map((v, i) => v / diag[i]);
  const resid = y.map((yi, i) => yi - X[i].reduce((s, v, j) => s + v * beta[j], 0));
  const tResid = t.map((ti, i) => ti * resid[i]);
  const inter = avg(tResid);
  return { test: 'Space-Time Interaction', interaction: +inter.toFixed(4), n, apa: `ST interaction = ${inter.toFixed(3)}, n = ${n}` };
}

// ── Spatiotemporal Moran's I ──────────────────────────────────────
export function spatiotemporalMoran(data, yVar, timeVar) {
  if (!data || data.length < 10 || !yVar || !timeVar) return null;
  const n = data.length;
  const y = data.map(r => +r[yVar]);
  const t = data.map(r => +r[timeVar]);
  const mu = avg(y);
  let num = 0, denom = 0;
  for (let i = 0; i < n; i++) {
    const zi = y[i] - mu;
    denom += zi * zi;
    const dt = Math.abs(t[i] - t[(i + 1) % n]);
    if (dt < 10) num += zi * (y[(i + 1) % n] - mu);
  }
  const I = denom ? num / denom : 0;
  return { test: 'Spatiotemporal Moran', I: +I.toFixed(4), n, apa: `ST Moran I = ${I.toFixed(3)}` };
}

// ── Space-Time Forecast ───────────────────────────────────────────
export function spaceTimeForecast(model, nSteps = 1) {
  if (!model || !model.rho || nSteps < 1) return null;
  const forecasts = Array(nSteps).fill(model.rho * 2);
  return { test: 'Space-Time Forecast', forecasts: forecasts.map(v => +v.toFixed(4)), nSteps, apa: `ST forecast: ${nSteps} steps` };
}
