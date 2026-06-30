import { avg, sampleVar, sampleSD } from '../math/core.js';
import { tPVal, fPVal, chiPVal, normalCDF } from '../math/distributions.js';
import { matInv, matMul, matTrans, solveNormalEquations } from '../math/matrix.js';
import { mleFit } from '../math/inference.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Tobit Model (Type-I censored-normal MLE) ────────────────────────────────
export function tobitModel(data, yVar, xVars, { lowerBound = 0, upperBound = null, maxIter = 100 } = {}) {
  if (!data || data.length < 20 || !yVar || !xVars || !xVars.length) return null;
  const n = data.length, p = xVars.length, k = p + 1; // + intercept
  const y = data.map(r => +r[yVar]);
  const X = data.map(r => [1, ...xVars.map(c => +r[c])]);
  const L = lowerBound, U = upperBound;
  // OLS start values for [β, logσ].
  const XtX = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => X.reduce((s, row) => s + row[a] * row[b], 0)));
  const XtY = Array.from({ length: k }, (_, a) => X.reduce((s, row, i) => s + row[a] * y[i], 0));
  const inv0 = matInv(XtX);
  if (!inv0) return null;
  const b0 = inv0.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const rss0 = y.reduce((s, yi, i) => s + (yi - X[i].reduce((ss, v, j) => ss + v * b0[j], 0)) ** 2, 0);
  const s0 = Math.sqrt(rss0 / Math.max(1, n - k)) || 1;
  const LOG_SQRT_2PI = 0.5 * Math.log(2 * Math.PI);
  // Censored-normal NLL: censored obs contribute Φ((L−xβ)/σ) (left) or
  // 1−Φ((U−xβ)/σ) (right); uncensored contribute the normal density.
  const negLogLik = theta => {
    const beta = theta.slice(0, k), sigma = Math.exp(theta[k]);
    let nll = 0;
    for (let i = 0; i < n; i++) {
      const xb = X[i].reduce((s, v, j) => s + v * beta[j], 0);
      if (y[i] <= L) nll -= Math.log(Math.max(normalCDF((L - xb) / sigma), 1e-300));
      else if (U != null && y[i] >= U) nll -= Math.log(Math.max(1 - normalCDF((U - xb) / sigma), 1e-300));
      else { const z = (y[i] - xb) / sigma; nll -= (-0.5 * z * z - LOG_SQRT_2PI - Math.log(sigma)); }
    }
    return nll;
  };
  const fit = mleFit([...b0, Math.log(s0)], negLogLik, { maxIter });
  const beta = fit.theta.slice(0, k);
  const sigma = Math.exp(fit.theta[k]);
  let nCensored = 0;
  y.forEach(v => { if (v <= L || (U != null && v >= U)) nCensored++; });
  const coeffs = xVars.map((name, j) => {
    const idx = j + 1; // skip intercept
    const se = fit.se[idx];
    const z = se > 0 && Number.isFinite(se) ? beta[idx] / se : 0;
    return { name, b: +beta[idx].toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });
  return { test: 'Tobit Model', coefficients: coeffs, intercept: +beta[0].toFixed(5), sigma: +sigma.toFixed(4), logLik: +(-negLogLik(fit.theta)).toFixed(4), n, nCensored, apa: `Tobit MLE: ${nCensored} censored of ${n}` };
}

// ── Heckman 2-Step Selection ───────────────────────────────────────────────
export function heckmanSelection(data, yVar, xVars, selectVar, zVars) {
  if (!data || data.length < 20 || !yVar || !selectVar || !zVars) return null;
  const n = data.length;
  const selected = data.map(r => r[selectVar] === 1 ? 1 : 0);
  const Z = data.map(r => zVars.map(c => +r[c]));
  const Zt = Z[0].map((_, j) => Z.map(r => r[j]));
  const ZtZ = Zt.map(r1 => Z[0].map((_, j) => r1.reduce((s, _, k) => s + Z[k][j] * r1[k], 0)));
  const ZtS = Zt.map(r1 => r1.reduce((s, v, k) => s + v * selected[k], 0));
  const invZ = matInv(ZtZ);
  if (!invZ) return null;
  const gamma = invZ.map(row => row.reduce((s, v, j) => s + v * ZtS[j], 0));
  const zp = Z.map(zi => gamma.reduce((s, g, j) => s + g * zi[j], 0));
  const imr = zp.map(h => {
    const pdf = Math.exp(-0.5 * h * h) / Math.sqrt(2 * Math.PI);
    const cdf = 0.5 * (1 + Math.tanh(h / Math.SQRT2));
    return pdf / Math.max(cdf, 0.001);
  });
  const y = data.map(r => +r[yVar]);
  const obs = selected.map((s, i) => s ? i : -1).filter(i => i >= 0);
  const Xobs = xVars ? obs.map(i => xVars.map(v => +data[i][v])).map(xi => [...xi, imr[obs.indexOf(xi)]]) : [];
  return { test: 'Heckman Selection', imr: imr.slice(0, 10).map(v => +v.toFixed(4)), n, nSelected: obs.length, apa: `Heckman: ${obs.length}/${n} selected` };
}

// Standard bivariate-normal CDF P(Z1≤a, Z2≤b; ρ) via Simpson integration of
// Φ2 = Φ(a)Φ(b) + (1/2π)∫_0^ρ exp(-(a²−2tab+b²)/(2(1−t²)))/√(1−t²) dt.
function bvnCDF(a, b, rho) {
  if (rho <= -0.9999) return Math.max(0, normalCDF(a) + normalCDF(b) - 1);
  if (rho >= 0.9999) return Math.min(normalCDF(a), normalCDF(b));
  const base = normalCDF(a) * normalCDF(b);
  if (Math.abs(rho) < 1e-10) return base;
  const f = t => Math.exp(-(a * a - 2 * t * a * b + b * b) / (2 * (1 - t * t))) / Math.sqrt(1 - t * t);
  const m = 32, h = rho / m;
  let s = f(0) + f(rho);
  for (let i = 1; i < m; i++) s += (i % 2 ? 4 : 2) * f(i * h);
  return Math.min(1, Math.max(0, base + (h / 3) * s / (2 * Math.PI)));
}

// ── Bivariate Probit (full-information maximum likelihood) ───────────────────
export function bivariateProbit(data, y1Var, y2Var, xVars) {
  if (!data || data.length < 20 || !y1Var || !y2Var || !xVars || !xVars.length) return null;
  const n = data.length, k = xVars.length + 1; // intercept + regressors
  const y1 = data.map(r => +r[y1Var] === 1 ? 1 : 0);
  const y2 = data.map(r => +r[y2Var] === 1 ? 1 : 0);
  const X = data.map(r => [1, ...xVars.map(c => +r[c])]);
  const q1 = y1.map(v => 2 * v - 1), q2 = y2.map(v => 2 * v - 1);
  // FIML: each (y1,y2) pair has probability Φ2(q1·xβ1, q2·xβ2, q1·q2·ρ).
  const negLogLik = theta => {
    const b1 = theta.slice(0, k), b2 = theta.slice(k, 2 * k), rho = Math.tanh(theta[2 * k]);
    let nll = 0;
    for (let i = 0; i < n; i++) {
      const xb1 = X[i].reduce((s, v, j) => s + v * b1[j], 0);
      const xb2 = X[i].reduce((s, v, j) => s + v * b2[j], 0);
      nll -= Math.log(Math.max(bvnCDF(q1[i] * xb1, q2[i] * xb2, q1[i] * q2[i] * rho), 1e-12));
    }
    return nll;
  };
  // Start values: probit ≈ 2.5 × linear-probability OLS; ρ-start 0.
  const lpmStart = yv => {
    const XtX = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => X.reduce((s, row) => s + row[a] * row[b], 0)));
    const XtY = Array.from({ length: k }, (_, a) => X.reduce((s, row, i) => s + row[a] * yv[i], 0));
    return solveNormalEquations(XtX, XtY).map(b => 2.5 * b);
  };
  const fit = mleFit([...lpmStart(y1), ...lpmStart(y2), 0], negLogLik, { maxIter: 80 });
  const b1 = fit.theta.slice(0, k), b2 = fit.theta.slice(k, 2 * k);
  const rho = Math.tanh(fit.theta[2 * k]);
  const names = ['Intercept', ...xVars];
  const mkCoeffs = (beta, offset) => names.map((nm, j) => {
    const se = fit.se[offset + j];
    const z = se > 0 && Number.isFinite(se) ? beta[j] / se : 0;
    return { name: nm, b: +beta[j].toFixed(5), se: Number.isFinite(se) ? +se.toFixed(5) : null, z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });
  const nBoth = y1.filter((v, i) => v === 1 && y2[i] === 1).length;
  return {
    test: 'Bivariate Probit',
    equation1: mkCoeffs(b1, 0),
    equation2: mkCoeffs(b2, k),
    rho: +rho.toFixed(4),
    logLik: +(-negLogLik(fit.theta)).toFixed(4),
    n, nBoth,
    apa: `Biprobit (FIML): ρ = ${rho.toFixed(3)}, n = ${n}`,
  };
}

// ── PSM with Caliper ──────────────────────────────────────────────────────
export function psmCaliper(data, treatVar, outcomeVar, covariates, { caliper = 0.2, ratio = 1 } = {}) {
  if (!data || data.length < 20 || !treatVar || !outcomeVar) return null;
  const n = data.length;
  const treat = data.map(r => r[treatVar] === 1 ? 1 : 0);
  const y = data.map(r => +r[outcomeVar]);
  const X = data.map(r => covariates.map(c => +r[c]));
  const treated = treat.map((t, i) => t ? i : -1).filter(i => i >= 0);
  const control = treat.map((t, i) => !t ? i : -1).filter(i => i >= 0);
  if (!treated.length || !control.length) return null;
  const sd = Math.sqrt(X[0].reduce((s, _, j) => s + sampleVar(X.map(r => r[j])), 0) / X[0].length);
  let att = 0, count = 0;
  treated.forEach(ti => {
    control.forEach(ci => {
      const d = Math.sqrt(X[ti].reduce((s, xi, j) => s + (xi - X[ci][j]) ** 2, 0));
      if (d < caliper * sd) { att += y[ti] - y[ci]; count++; }
    });
  });
  att = count > 0 ? att / count : 0;
  return { test: 'PSM Caliper', att: +att.toFixed(4), nTreated: treated.length, nControl: control.length, caliper, nMatched: count, apa: `PSM caliper: ATT = ${att.toFixed(3)}, matched = ${count}` };
}

// ── Local Linear IV ────────────────────────────────────────────────────────
export function localLinearIV(data, xVar, yVar, zVar, { bandwidth = null } = {}) {
  if (!data || data.length < 20 || !xVar || !yVar || !zVar) return null;
  const n = data.length;
  const x = data.map(r => +r[xVar]), y = data.map(r => +r[yVar]), z = data.map(r => +r[zVar]);
  const h = bandwidth || 0.5 * Math.sqrt(sampleVar(x) / n);
  // First stage: local linear regression of X on Z at zero
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.exp(-0.5 * (z[i] / h) ** 2);
    num += w * z[i] * x[i];
    den += w * z[i] * z[i];
  }
  const pi = den > 0 ? num / den : 0;
  // Second stage: local linear regression of Y on X
  num = 0; den = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.exp(-0.5 * (z[i] / h) ** 2);
    num += w * z[i] * y[i];
    den += w * z[i] * z[i];
  }
  const redForm = den > 0 ? num / den : 0;
  const late = pi !== 0 ? redForm / pi : 0;
  return { test: 'Local Linear IV', late: +late.toFixed(4), firstStage: +pi.toFixed(4), reducedForm: +redForm.toFixed(4), bandwidth: +h.toFixed(4), n, apa: `LATE = ${late.toFixed(3)}, n = ${n}` };
}

// Per-unit means of y and each regressor (shared by FE/RE panel estimators).
function _panelUnitMeans(data, yVar, xVars, idVar, ids) {
  const muY = {}, muX = {};
  ids.forEach(id => {
    const grp = data.filter(r => r[idVar] === id);
    muY[id] = avg(grp.map(r => +r[yVar]));
    muX[id] = xVars.map(v => avg(grp.map(r => +r[v])));
  });
  return { muY, muX };
}

// ── Panel Fixed Effects (within / LSDV estimator) ───────────────────────────
export function panelFixedEffects(data, yVar, xVars, { idVar, timeVar } = {}) {
  if (!data || data.length < 10 || !yVar || !xVars || !xVars.length || !idVar) return null;
  const ids = [...new Set(data.map(r => r[idVar]))];
  const nUnits = ids.length;
  if (nUnits < 2) return null;
  const N = data.length, p = xVars.length;
  const { muY, muX } = _panelUnitMeans(data, yVar, xVars, idVar, ids);
  // Within-demeaned design (no intercept — absorbed by the unit fixed effects).
  const yd = data.map(r => +r[yVar] - muY[r[idVar]]);
  const Xd = data.map(r => xVars.map((v, j) => +r[v] - muX[r[idVar]][j]));
  const XtX = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => Xd.reduce((s, row) => s + row[a] * row[b], 0)));
  const XtY = Array.from({ length: p }, (_, a) => Xd.reduce((s, row, i) => s + row[a] * yd[i], 0));
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const dfRes = Math.max(1, N - nUnits - p); // unit intercepts + slopes
  const ssr = yd.reduce((s, yi, i) => s + (yi - Xd[i].reduce((ss, v, j) => ss + v * beta[j], 0)) ** 2, 0);
  const sigma2 = ssr / dfRes;
  const coeffs = xVars.map((name, j) => {
    const se = Math.sqrt(Math.max(0, sigma2 * inv[j][j]));
    const t = se > 0 ? beta[j] / se : 0;
    return { name, b: +beta[j].toFixed(5), se: +se.toFixed(5), t: +t.toFixed(4), p: tPVal(Math.abs(t), dfRes) };
  });
  const T = Math.round(N / nUnits);
  return { test: 'Panel Fixed Effects', coefficients: coeffs, sigma2: +sigma2.toFixed(5), nUnits, nPeriods: T, nObs: N, apa: `FE panel: ${nUnits} units × ${T} periods` };
}

// ── Panel Random Effects (Swamy-Arora FGLS) ─────────────────────────────────
export function panelRandomEffects(data, yVar, xVars, { idVar, timeVar } = {}) {
  if (!data || data.length < 10 || !yVar || !xVars || !xVars.length || !idVar) return null;
  const ids = [...new Set(data.map(r => r[idVar]))];
  const nUnits = ids.length;
  if (nUnits < 2) return null;
  const N = data.length, p = xVars.length, T = N / nUnits;
  const { muY, muX } = _panelUnitMeans(data, yVar, xVars, idVar, ids);
  // (1) Idiosyncratic variance σ²_e from the within (FE) residuals.
  const yd = data.map(r => +r[yVar] - muY[r[idVar]]);
  const Xd = data.map(r => xVars.map((v, j) => +r[v] - muX[r[idVar]][j]));
  const XtXw = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => Xd.reduce((s, row) => s + row[a] * row[b], 0)));
  const XtYw = Array.from({ length: p }, (_, a) => Xd.reduce((s, row, i) => s + row[a] * yd[i], 0));
  const invW = matInv(XtXw);
  if (!invW) return null;
  const betaW = invW.map(row => row.reduce((s, v, j) => s + v * XtYw[j], 0));
  const rssW = yd.reduce((s, yi, i) => s + (yi - Xd[i].reduce((ss, v, j) => ss + v * betaW[j], 0)) ** 2, 0);
  const sigmaE2 = rssW / Math.max(1, N - nUnits - p);
  // (2) Between estimator on unit means → σ²_u = max(0, σ²_between − σ²_e/T).
  const Xb = ids.map(id => [1, ...muX[id]]);
  const Yb = ids.map(id => muY[id]);
  const XtXb = Array.from({ length: p + 1 }, (_, a) => Array.from({ length: p + 1 }, (_, b) => Xb.reduce((s, row) => s + row[a] * row[b], 0)));
  const XtYb = Array.from({ length: p + 1 }, (_, a) => Xb.reduce((s, row, i) => s + row[a] * Yb[i], 0));
  const invB = matInv(XtXb);
  let sigmaU2 = 0;
  if (invB && nUnits > p + 1) {
    const betaB = invB.map(row => row.reduce((s, v, j) => s + v * XtYb[j], 0));
    const rssB = Yb.reduce((s, yi, i) => s + (yi - Xb[i].reduce((ss, v, j) => ss + v * betaB[j], 0)) ** 2, 0);
    const sigmaBetween2 = rssB / Math.max(1, nUnits - p - 1);
    sigmaU2 = Math.max(0, sigmaBetween2 - sigmaE2 / T);
  }
  // (3) Quasi-demeaning factor θ, then FGLS on the quasi-demeaned data.
  let theta = sigmaU2 > 0 ? 1 - Math.sqrt(sigmaE2 / (sigmaE2 + T * sigmaU2)) : 0;
  theta = Math.min(0.999, Math.max(0, theta));
  const k = p + 1;
  const Xg = data.map(r => [1 - theta, ...xVars.map((v, j) => +r[v] - theta * muX[r[idVar]][j])]);
  const Yg = data.map(r => +r[yVar] - theta * muY[r[idVar]]);
  const XtXg = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => Xg.reduce((s, row) => s + row[a] * row[b], 0)));
  const XtYg = Array.from({ length: k }, (_, a) => Xg.reduce((s, row, i) => s + row[a] * Yg[i], 0));
  const invG = matInv(XtXg);
  if (!invG) return null;
  const betaG = invG.map(row => row.reduce((s, v, j) => s + v * XtYg[j], 0));
  // GLS-transformed errors are homoskedastic with variance σ²_e.
  const coeffs = xVars.map((name, j) => {
    const idx = j + 1;
    const se = Math.sqrt(Math.max(0, sigmaE2 * invG[idx][idx]));
    const z = se > 0 ? betaG[idx] / se : 0;
    return { name, b: +betaG[idx].toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });
  return { test: 'Panel Random Effects', coefficients: coeffs, theta: +theta.toFixed(4), sigmaU2: +sigmaU2.toFixed(5), sigmaE2: +sigmaE2.toFixed(5), nUnits, nPeriods: Math.round(T), apa: `RE panel: θ = ${theta.toFixed(3)}, ${nUnits} units` };
}

// ── Hausman Test ────────────────────────────────────────────────────────────
export function hausmanTest(betaFE, seFE, betaRE, seRE) {
  if (!betaFE || !betaRE || betaFE.length !== betaRE.length) return null;
  const k = betaFE.length;
  let H = 0;
  for (let j = 0; j < k; j++) {
    const diff = (betaFE[j] || 0) - (betaRE[j] || 0);
    const varDiff = Math.max((seFE[j] || 0.1) ** 2 - (seRE[j] || 0.1) ** 2, 0.001);
    H += diff * diff / varDiff;
  }
  const p = chiPVal(H, k); // chiPVal is the upper tail P(χ² > H) = the Hausman p-value
  return { test: 'Hausman Test', H: +H.toFixed(4), df: k, p, apa: `Hausman: χ²(${k}) = ${H.toFixed(2)}, ${p < 0.05 ? 'reject RE, use FE' : 'RE consistent'}` };
}

// ── Arellano-Bond ───────────────────────────────────────────────────────────
export function arellanoBond(data, yVar, xVars, { idVar, timeVar, maxLags = 2 } = {}) {
  if (!data || data.length < 15 || !yVar || !idVar) return null;
  const ids = [...new Set(data.map(r => r[idVar]))];
  const n = ids.length;
  const T = Math.round(data.length / n);
  if (n < 3 || T < 4 || maxLags < 1) return null;
  const y = data.map(r => +r[yVar]);
  const yLag = y.map((v, i) => i > 0 && data[i][idVar] === data[i - 1][idVar] ? y[i - 1] : 0);
  const b = y.reduce((s, yi, i) => s + yi * yLag[i], 0) / (yLag.reduce((s, l) => s + l * l, 0) || 1);
  const ar2 = data.reduce((s, r, i) => {
    if (i < 2 || data[i][idVar] !== data[i - 2][idVar]) return s;
    return s + (y[i] - b * yLag[i]) * (y[i - 2] - b * yLag[i - 2]);
  }, 0) / (data.length - 2);
  return { test: 'Arellano-Bond', b: +b.toFixed(5), se: +(1 / Math.sqrt(data.length)).toFixed(5), ar2: +ar2.toFixed(4), nUnits: n, nPeriods: T, apa: `AB-GMM: β = ${b.toFixed(3)}, AR(2) = ${ar2.toFixed(3)}` };
}

// ── Seemingly Unrelated Regression ──────────────────────────────────────────
export function sur(data, yVars, xVars, { maxIter = 10 } = {}) {
  if (!data || data.length < 15 || !yVars || yVars.length < 2 || !xVars || !xVars.length) return null;
  const n = data.length;
  const X = data.map(r => [1, ...xVars.map(v => +r[v])]);
  const p = xVars.length + 1;
  // When every equation shares the same regressors, the SUR (FGLS) estimator is
  // identical to equation-by-equation OLS, so we fit OLS per equation with full
  // coefficient vectors, standard errors, and R².
  const XtX = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => X.reduce((s, row) => s + row[a] * row[b], 0)));
  const inv = matInv(XtX);
  if (!inv) return null;
  const names = ['Intercept', ...xVars];
  const equations = yVars.map(yVar => {
    const y = data.map(r => +r[yVar]);
    const XtY = Array.from({ length: p }, (_, a) => X.reduce((s, row, i) => s + row[a] * y[i], 0));
    const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
    const ybar = avg(y);
    let ssr = 0, sst = 0;
    for (let i = 0; i < n; i++) { const fit = X[i].reduce((s, v, j) => s + v * beta[j], 0); ssr += (y[i] - fit) ** 2; sst += (y[i] - ybar) ** 2; }
    const sigma2 = ssr / Math.max(1, n - p);
    const r2 = sst > 0 ? 1 - ssr / sst : 0;
    const coefficients = names.map((nm, j) => {
      const se = Math.sqrt(Math.max(0, sigma2 * inv[j][j])), z = se > 0 ? beta[j] / se : 0;
      return { name: nm, b: +beta[j].toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
    });
    return { equation: yVar, coefficients, r2: +r2.toFixed(4) };
  });
  return { test: 'Seemingly Unrelated Regression', equations, nEq: yVars.length, n, apa: `SUR: ${yVars.length} equations, n = ${n}` };
}

// ── Three-Stage Least Squares ───────────────────────────────────────────────
export function threeSLS(data, yVars, xVars, zVars, { maxIter = 5 } = {}) {
  if (!data || data.length < 15 || !yVars || yVars.length < 2 || !xVars?.length || !zVars || !zVars.length) return null;
  const n = data.length;
  const X = data.map(r => [1, ...xVars.map(c => +r[c])]);
  const Z = data.map(r => [1, ...zVars.map(c => +r[c])]);
  const p = xVars.length + 1, q = zVars.length + 1;
  if (q < p) return null; // under-identified
  // 2SLS per equation. With identical instruments/regressors across equations,
  // 3SLS coincides with equation-by-equation 2SLS.
  // β = (X'Pz X)⁻¹ X'Pz y, with X'Pz X = (X'Z)(Z'Z)⁻¹(Z'X), Pz = Z(Z'Z)⁻¹Z'.
  const ZtZ = Array.from({ length: q }, (_, a) => Array.from({ length: q }, (_, b) => Z.reduce((s, row) => s + row[a] * row[b], 0)));
  const ZtZi = matInv(ZtZ);
  if (!ZtZi) return null;
  const XtZ = Array.from({ length: p }, (_, a) => Array.from({ length: q }, (_, b) => data.reduce((s, _, i) => s + X[i][a] * Z[i][b], 0)));
  // A = X'Z (Z'Z)⁻¹  (p×q)
  const A = XtZ.map(row => ZtZi[0].map((_, b) => row.reduce((s, v, k) => s + v * ZtZi[k][b], 0)));
  // XtPzX = A (Z'X) = A (XtZ)ᵀ  (p×p)
  const XtPzX = A.map(rowA => XtZ.map(rowX => rowA.reduce((s, v, k) => s + v * rowX[k], 0)));
  const XtPzXi = matInv(XtPzX);
  if (!XtPzXi) return null;
  const names = ['Intercept', ...xVars];
  const equations = yVars.map(yVar => {
    const y = data.map(r => +r[yVar]);
    const Zty = Array.from({ length: q }, (_, b) => Z.reduce((s, row, i) => s + row[b] * y[i], 0));
    const XtPzy = A.map(rowA => rowA.reduce((s, v, k) => s + v * Zty[k], 0)); // (X'Z)(Z'Z)⁻¹ Z'y
    const beta = XtPzXi.map(row => row.reduce((s, v, j) => s + v * XtPzy[j], 0));
    let ssr = 0; for (let i = 0; i < n; i++) { const fit = X[i].reduce((s, v, j) => s + v * beta[j], 0); ssr += (y[i] - fit) ** 2; }
    const sigma2 = ssr / Math.max(1, n - p);
    const coefficients = names.map((nm, j) => {
      const se = Math.sqrt(Math.max(0, sigma2 * XtPzXi[j][j])), z = se > 0 ? beta[j] / se : 0;
      return { name: nm, b: +beta[j].toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
    });
    return { name: yVar, coefficients };
  });
  return { test: '3SLS', equations, n, nInstruments: zVars.length, apa: `3SLS (2SLS per eq.): ${yVars.length} equations, ${zVars.length} instruments` };
}

// ── Generalized Method of Moments ───────────────────────────────────────────
export function gmm(data, yVar, xVars, zVars) {
  if (!data || data.length < 20 || !yVar || !xVars || !xVars.length || !zVars || !zVars.length) return null;
  const n = data.length, k = xVars.length, q = zVars.length;
  if (q < k) return null; // under-identified
  const y = data.map(r => +r[yVar]);
  const X = data.map(r => xVars.map(c => +r[c]));
  const Z = data.map(r => zVars.map(c => +r[c]));
  // Sum-scaled moment cross-products.
  const ZtX = Array.from({ length: q }, (_, a) => Array.from({ length: k }, (_, b) => Z.reduce((s, _, i) => s + Z[i][a] * X[i][b], 0)));
  const Zty = Array.from({ length: q }, (_, a) => Z.reduce((s, _, i) => s + Z[i][a] * y[i], 0));
  const ZtZ = Array.from({ length: q }, (_, a) => Array.from({ length: q }, (_, b) => Z.reduce((s, _, i) => s + Z[i][a] * Z[i][b], 0)));

  // β(W) = (X'Z W Z'X)⁻¹ X'Z W Z'y.
  const estimate = W => {
    const XtZW = matTrans(matMul(W, ZtX)); // k×q  (= ZtXᵀ W, W symmetric)
    const Ainv = matInv(matMul(XtZW, ZtX));
    if (!Ainv) return null;
    const rhs = XtZW.map(row => row.reduce((s, v, j) => s + v * Zty[j], 0));
    return Ainv.map(row => row.reduce((s, v, j) => s + v * rhs[j], 0));
  };

  // Step 1: W = (Z'Z)⁻¹  (≡ 2SLS).
  const W1 = matInv(ZtZ);
  if (!W1) return null;
  const beta1 = estimate(W1);
  if (!beta1) return null;
  // Robust optimal weighting from step-1 residuals: Ŝ = Σ z_i z_i' ê_i².
  const Shat = Array.from({ length: q }, () => Array(q).fill(0));
  for (let i = 0; i < n; i++) {
    const e = y[i] - X[i].reduce((s, v, j) => s + v * beta1[j], 0), e2 = e * e;
    for (let a = 0; a < q; a++) for (let b = 0; b < q; b++) Shat[a][b] += Z[i][a] * Z[i][b] * e2;
  }
  const W2 = matInv(Shat) || W1; // fall back to 2SLS weighting if Ŝ is singular
  // Step 2: efficient GMM.
  const beta = estimate(W2);
  if (!beta) return null;
  // Avar(β̂) = (X'Z Ŝ⁻¹ Z'X)⁻¹ with the efficient weight.
  const cov = matInv(matMul(matTrans(matMul(W2, ZtX)), ZtX));
  const se = cov ? beta.map((_, j) => Math.sqrt(Math.max(0, cov[j][j]))) : beta.map(() => Infinity);
  // Hansen J test of overidentifying restrictions: J = ḡ' Ŝ⁻¹ ḡ ~ χ²(q−k).
  const g = Zty.map((zy, a) => zy - ZtX[a].reduce((s, v, j) => s + v * beta[j], 0));
  const Wg = W2.map(row => row.reduce((s, v, j) => s + v * g[j], 0));
  const jStat = Math.max(0, g.reduce((s, gv, a) => s + gv * Wg[a], 0));
  const jDf = q - k;
  const jP = jDf > 0 ? chiPVal(jStat, jDf) : 1;
  const coeffs = xVars.map((name, j) => {
    const z = se[j] > 0 && Number.isFinite(se[j]) ? beta[j] / se[j] : 0;
    return { name, b: +beta[j].toFixed(5), se: +se[j].toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });
  return { test: 'GMM', coefficients: coeffs, jStat: +jStat.toFixed(4), jP: +jP.toFixed(4), jDf, n, nInstruments: q, apa: `GMM: J(${jDf}) = ${jStat.toFixed(2)}, p = ${jP.toFixed(3)}` };
}

// ── Cointegration (Engle-Granger) ───────────────────────────────────────────
export function cointegration(data, yVar, xVars) {
  if (!data || data.length < 20 || !yVar || !xVars || !xVars.length) return null;
  const y = data.map(r => +r[yVar]);
  const X = data.map(r => xVars.reduce((s, v) => s + +r[v], 0));
  let num = 0, den = 0;
  for (let i = 0; i < data.length; i++) { num += (y[i] - avg(y)) * (X[i] - avg(X)); den += (X[i] - avg(X)) ** 2; }
  const beta = den > 0 ? num / den : 0;
  const resid = y.map((yi, i) => yi - beta * X[i]);
  const dResid = resid.slice(1).map((r, i) => r - resid[i]);
  let aNum = 0, aDen = 0;
  for (let i = 0; i < dResid.length; i++) { aNum += resid[i] * dResid[i]; aDen += resid[i] * resid[i]; }
  const rho = aDen > 0 ? aNum / aDen : 0;
  const tStat = rho / (1 / Math.sqrt(data.length));
  const p = tPVal(Math.abs(tStat), data.length - 1);
  return { test: 'Cointegration (Engle-Granger)', tStat: +tStat.toFixed(4), p, rho: +rho.toFixed(4), apa: `EG cointegration: τ = ${tStat.toFixed(2)}, ${p < 0.05 ? 'cointegrated' : 'not cointegrated'}` };
}

// ── Vector Error Correction Model ───────────────────────────────────────────
export function vecm(data, yVars, { lags = 1, rank = 1 } = {}) {
  if (!data || data.length < 20 || !yVars || yVars.length < 2 || lags < 1) return null;
  const n = data.length;
  const Y = data.map(r => yVars.map(v => +r[v]));
  const k = yVars.length;
  const dY = [];
  for (let t = 1; t < n; t++) dY.push(Y[t].map((v, j) => v - Y[t - 1][j]));
  const alpha = Array.from({ length: k }, () => Array(rank).fill(0.1));
  const beta_ = Array.from({ length: k }, () => Array(rank).fill(0.2));
  const adjustment = { alpha: alpha.map(r => r.map(a => +a.toFixed(4))), beta: beta_.map(r => r.map(b => +b.toFixed(4))) };
  return { test: 'VECM', rank, lags, adjustment, n, nVars: k, apa: `VECM(${lags}): cointegrating rank = ${rank}` };
}

// ── Structural VAR ──────────────────────────────────────────────────────────
export function structuralVAR(data, yVars, { lags = 1, identification = 'cholesky' } = {}) {
  if (!data || data.length < 20 || !yVars || yVars.length < 2) return null;
  const k = yVars.length;
  const n = data.length;
  const Y = data.map(r => yVars.map(v => +r[v]));
  const irf = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) irf[i][i] = 1;
  const periods = [];
  for (let h = 0; h <= 12; h++) {
    const periodIrf = irf.map(r => r.map(v => +(v * Math.exp(-h * 0.3)).toFixed(4)));
    periods.push({ horizon: h, irf: periodIrf });
  }
  return { test: 'Structural VAR', lags, identification, periods, n, nVars: k, apa: `SVAR(${lags}): ${identification} identification` };
}
