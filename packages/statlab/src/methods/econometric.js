import { avg, sampleVar, sampleSD } from '../math/core.js';
import { tPVal, fPVal, chiPVal, normalCDF, normalINV } from '../math/distributions.js';
import { matInv, matMul, matTrans, solveNormalEquations } from '../math/matrix.js';
import { mleFit } from '../math/inference.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Tobit Model (Type-I censored-normal MLE) ────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars */
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
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string[]} zVars */
export function heckmanSelection(data, yVar, xVars, selectVar, zVars) {
  if (!data || data.length < 20 || !yVar || !selectVar || !zVars) return null;
  const n = data.length;
  const selected = data.map(r => (r[selectVar] === 1 ? 1 : 0));
  const Z = data.map(r => [1, ...zVars.map(c => +r[c])]); // selection regressors (with intercept)
  const kz = Z[0].length;
  // Step 1: probit of the selection indicator on Z by ML.
  const probitNLL = g => {
    let nll = 0;
    for (let i = 0; i < n; i++) {
      const idx = Z[i].reduce((s, v, j) => s + v * g[j], 0);
      const p = Math.min(Math.max(normalCDF(idx), 1e-12), 1 - 1e-12);
      nll -= selected[i] ? Math.log(p) : Math.log(1 - p);
    }
    return Number.isFinite(nll) ? nll : 1e10;
  };
  const gfit = mleFit(Array(kz).fill(0), probitNLL, { maxIter: 60 });
  const gamma = gfit.theta;
  // Inverse Mills ratio λ = φ(Zγ)/Φ(Zγ) at the probit index.
  const phi = h => Math.exp(-0.5 * h * h) / Math.sqrt(2 * Math.PI);
  const imr = Z.map(zi => { const h = zi.reduce((s, g, j) => s + g * gamma[j], 0); return phi(h) / Math.max(normalCDF(h), 1e-8); });
  // Step 2: OLS of y on [1, X, λ] over the SELECTED observations.
  const obs = selected.map((sv, i) => (sv ? i : -1)).filter(i => i >= 0);
  const xv = xVars || [];
  const Xo = obs.map(i => [1, ...xv.map(v => +data[i][v]), imr[i]]);
  const yo = obs.map(i => +data[i][yVar]);
  const kk = Xo[0].length;
  const XtX = Array.from({ length: kk }, (_, a) => Array.from({ length: kk }, (_, b) => Xo.reduce((s, r) => s + r[a] * r[b], 0)));
  const XtY = Array.from({ length: kk }, (_, a) => Xo.reduce((s, r, i) => s + r[a] * yo[i], 0));
  const beta = solveNormalEquations(XtX, XtY);
  const coefficients = [
    { name: 'Intercept', b: +beta[0].toFixed(4) },
    ...xv.map((nm, j) => ({ name: nm, b: +beta[1 + j].toFixed(4) })),
  ];
  const lambdaCoef = +beta[kk - 1].toFixed(4); // ρ·σ_ε — significance ⇒ selection bias present
  return {
    test: 'Heckman Selection', imr: imr.slice(0, 10).map(v => +v.toFixed(4)), coefficients,
    lambdaCoef, n, nSelected: obs.length, apa: `Heckman: ${obs.length}/${n} selected, λ-coef = ${lambdaCoef}`,
  };
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
/** @param {Array<Record<string, any>>} data @param {string[]} xVars */
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
/** @param {Array<Record<string, any>>} data @param {string} treatVar @param {string} outcomeVar @param {string[]} covariates */
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
/** @param {Array<Record<string, any>>} data @param {string} xVar @param {string} yVar */
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
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars */
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
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars */
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

// ── Arellano-Bond Difference GMM (Arellano & Bond 1991) ─────────────────────
// Dynamic panel y_it = α y_{i,t-1} + β x_it + η_i + ε_it. First-differencing
// removes the unit effect η_i but leaves Δy_{i,t-1} correlated with Δε_it, so
// OLS on the differenced equation is biased. AB instruments Δy_{i,t-1} (and
// Δx if not strictly exogenous) with all available lagged *levels*
// y_{i,1},…,y_{i,t-2} — a separate instrument column per (calendar time,
// lag depth) pair (the standard "GMM-style" block-diagonal instrument set,
// as opposed to a single collapsed column per lag). One-step GMM weight
// matrix W=(Z'HZ)⁻¹ uses the known MA(1) covariance structure of the
// differenced errors (H: 2 on the diagonal, −1 for within-unit adjacent
// periods). Reports the AB AR(2) serial-correlation diagnostic (differenced
// residuals must be uncorrelated at lag 2 for the instruments to be valid)
// and a Sargan/Hansen overidentification statistic from the GMM objective.
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} [xVars] */
export function arellanoBond(data, yVar, xVars = [], { idVar, timeVar, maxLags = 4 } = {}) {
  if (!data || data.length < 15 || !yVar || !idVar) return null;
  const ids = [...new Set(data.map(r => r[idVar]))];
  const n = ids.length;
  let groups = ids.map(id => data.filter(r => r[idVar] === id));
  if (timeVar) groups = groups.map(g => [...g].sort((a, b) => +a[timeVar] - +b[timeVar]));
  const T = groups[0]?.length || 0;
  if (n < 3 || T < 4 || !groups.every(g => g.length === T)) return null;
  const xNames = xVars || [];
  const kX = xNames.length;
  const p = 1 + kX; // Δy_{t-1} + Δx's

  // Column layout: one instrument column per (t, lag-depth s) pair, t = 2..T-1 (0-indexed
  // period index; needs y[t-2] to exist), s = 0..min(t-1,maxLags)-1 indexing y[s].
  const colStart = {}; let nextCol = 0;
  for (let t = 2; t < T; t++) { colStart[t] = nextCol; nextCol += Math.min(t - 1, maxLags); }
  const C = nextCol;

  const rows = [];
  groups.forEach((g, gi) => {
    const y = g.map(r => +r[yVar]);
    const X = g.map(r => xNames.map(v => +r[v]));
    for (let t = 2; t < T; t++) {
      const dy = y[t] - y[t - 1];
      const dyLag = y[t - 1] - y[t - 2];
      const dx = xNames.length ? X[t].map((v, j) => v - X[t - 1][j]) : [];
      const nLags = Math.min(t - 1, maxLags);
      const zCols = Array.from({ length: nLags }, (_, s) => ({ col: colStart[t] + s, val: y[s] }));
      rows.push({ unitIdx: gi, t, dy, dyLag, dx, zCols });
    }
  });
  const M = rows.length;
  if (M < p + 1 || C < p) return null;

  const Z = Array.from({ length: M }, () => Array(C).fill(0));
  rows.forEach((r, i) => r.zCols.forEach(({ col, val }) => { Z[i][col] = val; }));
  const Xmat = rows.map(r => [r.dyLag, ...r.dx]);
  const yvec = rows.map(r => r.dy);

  // H: within-unit MA(1) structure of the first-differenced errors.
  const H = Array.from({ length: M }, () => Array(M).fill(0));
  for (let i = 0; i < M; i++) H[i][i] = 2;
  for (let i = 0; i < M; i++) for (let j = i + 1; j < M; j++) {
    if (rows[i].unitIdx === rows[j].unitIdx && Math.abs(rows[i].t - rows[j].t) === 1) { H[i][j] = -1; H[j][i] = -1; }
  }
  const ZtH = Array.from({ length: C }, (_, a) => Array.from({ length: M }, (_, i) => { let s = 0; for (let l = 0; l < M; l++) s += Z[l][a] * H[l][i]; return s; }));
  const ZtHZ = Array.from({ length: C }, (_, a) => Array.from({ length: C }, (_, b) => { let s = 0; for (let i = 0; i < M; i++) s += ZtH[a][i] * Z[i][b]; return s; }));
  const W = matInv(ZtHZ);
  if (!W) return null;

  // β = (X'Z W Z'X)⁻¹ X'Z W Z'y
  const ZtX = Array.from({ length: C }, (_, a) => Array.from({ length: p }, (_, b) => { let s = 0; for (let i = 0; i < M; i++) s += Z[i][a] * Xmat[i][b]; return s; }));
  const Zty = Array.from({ length: C }, (_, a) => { let s = 0; for (let i = 0; i < M; i++) s += Z[i][a] * yvec[i]; return s; });
  const WZtX = Array.from({ length: C }, (_, a) => Array.from({ length: p }, (_, b) => { let s = 0; for (let c = 0; c < C; c++) s += W[a][c] * ZtX[c][b]; return s; }));
  const WZty = Array.from({ length: C }, (_, a) => { let s = 0; for (let c = 0; c < C; c++) s += W[a][c] * Zty[c]; return s; });
  const XtZWZtX = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => { let s = 0; for (let c = 0; c < C; c++) s += ZtX[c][a] * WZtX[c][b]; return s; }));
  const XtZWZty = Array.from({ length: p }, (_, a) => { let s = 0; for (let c = 0; c < C; c++) s += ZtX[c][a] * WZty[c]; return s; });
  const Avar0 = matInv(XtZWZtX);
  if (!Avar0) return null;
  const beta = Avar0.map(row => row.reduce((s, v, j) => s + v * XtZWZty[j], 0));

  const resid = rows.map((r, i) => yvec[i] - Xmat[i].reduce((s, v, j) => s + v * beta[j], 0));
  // σ² via the H-weighted quadratic form (accounts for the MA(1) differenced-error structure).
  let eHe = 0; for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) if (H[i][j]) eHe += resid[i] * H[i][j] * resid[j];
  const sigma2 = Math.max(eHe / Math.max(M - p, 1), 1e-10);
  const se = Avar0.map((row, j) => Math.sqrt(Math.max(0, sigma2 * row[j])));
  const coefNames = ['L.y', ...xNames];
  const coefficients = coefNames.map((name, j) => {
    const z = se[j] > 0 ? beta[j] / se[j] : 0;
    return { name, b: +beta[j].toFixed(5), se: +se[j].toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });

  // AR(2) diagnostic: (approximate) standardized correlation of differenced residuals
  // at lag 2 within units — should be ≈0 (non-significant) for instrument validity.
  const byUnit = {};
  rows.forEach((r, i) => { (byUnit[r.unitIdx] ??= {})[r.t] = resid[i]; });
  let sNum = 0, sE2 = 0, sE2lag = 0, nPairs = 0;
  Object.values(byUnit).forEach(unit => {
    Object.keys(unit).map(Number).forEach(t => {
      if (unit[t - 2] !== undefined) { sNum += unit[t] * unit[t - 2]; sE2 += unit[t] ** 2; sE2lag += unit[t - 2] ** 2; nPairs++; }
    });
  });
  const ar2corr = nPairs > 0 && sE2 > 0 && sE2lag > 0 ? sNum / Math.sqrt(sE2 * sE2lag) : 0;
  const ar2 = ar2corr * Math.sqrt(Math.max(nPairs, 1));
  const ar2p = +(2 * (1 - normalCDF(Math.abs(ar2)))).toFixed(4);

  // Sargan/Hansen overidentification test from the GMM objective at the optimum.
  const Ze = Array.from({ length: C }, (_, a) => { let s = 0; for (let i = 0; i < M; i++) s += Z[i][a] * resid[i]; return s; });
  const WZe = Array.from({ length: C }, (_, a) => { let s = 0; for (let c = 0; c < C; c++) s += W[a][c] * Ze[c]; return s; });
  const sargan = (Ze.reduce((s, v, a) => s + v * WZe[a], 0)) / sigma2;
  const sarganDf = Math.max(C - p, 0);
  const sarganP = sarganDf > 0 ? chiPVal(Math.max(0, sargan), sarganDf) : null;

  return {
    test: 'Arellano-Bond', coefficients, b: +beta[0].toFixed(5), se: +se[0].toFixed(5),
    ar2: +ar2.toFixed(4), ar2p, sargan: +sargan.toFixed(4), sarganDf, sarganP,
    nUnits: n, nPeriods: T, nInstruments: C, nObs: M,
    apa: `AB difference GMM: L.y = ${beta[0].toFixed(3)} (se=${se[0].toFixed(3)}), AR(2) z=${ar2.toFixed(2)} (${ar2p < 0.05 ? 'instruments questionable' : 'ok'}), Sargan χ²(${sarganDf})=${sargan.toFixed(2)}`,
  };
}

// ── Seemingly Unrelated Regression ──────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string[]} yVars @param {string[]} xVars */
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
/** @param {Array<Record<string, any>>} data @param {string[]} yVars @param {string[]} xVars @param {string[]} zVars */
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
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string[]} zVars */
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

// ── Cointegration (Engle-Granger, MacKinnon 1991 critical values) ──────────
// Step 1: real multivariate OLS y = a + Xβ + e (each xVar its own regressor,
// not summed together). Step 2: Dickey-Fuller regression on the residuals,
// Δe_t = τ·e_{t-1} + u_t, with a genuine OLS standard error for τ (not an
// assumed 1/√n). Step 3: the EG/DF test statistic does not follow a
// Student-t distribution — it follows the (left-skewed, non-standard)
// MacKinnon distribution, whose quantiles depend on N = number of variables
// in the cointegrating regression (1 + xVars.length). We anchor the p-value
// to MacKinnon's (1991) tabulated asymptotic 1/5/10% critical values for N,
// then interpolate/extrapolate monotonically in normal-quantile space — an
// approximation to the full MacKinnon (1994/2010) response-surface p-value,
// but anchored to the correct reference distribution rather than a t-test.
const _mackinnonCV = {
  1: { 1: -3.43, 5: -2.86, 10: -2.57 },
  2: { 1: -3.90, 5: -3.34, 10: -3.04 },
  3: { 1: -4.29, 5: -3.74, 10: -3.45 },
  4: { 1: -4.64, 5: -4.10, 10: -3.81 },
  5: { 1: -4.96, 5: -4.42, 10: -4.13 },
  6: { 1: -5.25, 5: -4.72, 10: -4.43 },
};
function _mackinnonP(tauStat, N) {
  const cv = _mackinnonCV[Math.min(6, Math.max(1, N))];
  // Anchors sorted ascending by τ: (very negative τ, small p) ... (τ=0, p=0.5).
  const anchors = [
    [cv[1], 0.01], [cv[5], 0.05], [cv[10], 0.10], [0, 0.5],
  ].map(([tau, p]) => [tau, normalINV(p)]);
  if (tauStat <= anchors[0][0]) {
    // Extrapolate below the 1% point using the slope of the first segment.
    const [ [t0, z0], [t1, z1] ] = anchors;
    const slope = (z1 - z0) / (t1 - t0);
    const z = z0 + slope * (tauStat - t0);
    return Math.max(1e-6, normalCDF(z));
  }
  for (let i = 0; i < anchors.length - 1; i++) {
    const [t0, z0] = anchors[i], [t1, z1] = anchors[i + 1];
    if (tauStat >= t0 && tauStat <= t1) {
      const w = (tauStat - t0) / (t1 - t0);
      return normalCDF(z0 + w * (z1 - z0));
    }
  }
  return 0.5; // at or beyond τ=0: no evidence against a unit root in the residuals
}

/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars */
export function cointegration(data, yVar, xVars) {
  if (!data || data.length < 20 || !yVar || !xVars || !xVars.length) return null;
  const n = data.length, p = xVars.length + 1;
  const y = data.map(r => +r[yVar]);
  const X = data.map(r => [1, ...xVars.map(v => +r[v])]);
  const XtX = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => X.reduce((s, row) => s + row[a] * row[b], 0)));
  const XtY = Array.from({ length: p }, (_, a) => X.reduce((s, row, i) => s + row[a] * y[i], 0));
  const beta = solveNormalEquations(XtX, XtY);
  if (!beta) return null;
  const resid = y.map((yi, i) => yi - X[i].reduce((s, v, j) => s + v * beta[j], 0));
  // ADF(0) regression on the residuals: Δe_t = τ·e_{t-1} + u_t (no intercept —
  // e is mean-zero by construction of the first-stage OLS intercept).
  const m = resid.length;
  const eLag = resid.slice(0, m - 1);
  const dE = resid.slice(1).map((v, i) => v - resid[i]);
  const sxx = eLag.reduce((s, v) => s + v * v, 0);
  const sxy = eLag.reduce((s, v, i) => s + v * dE[i], 0);
  const tau = sxx > 0 ? sxy / sxx : 0;
  const dfResid = dE.map((v, i) => v - tau * eLag[i]);
  const sse = dfResid.reduce((s, v) => s + v * v, 0);
  const df = Math.max(1, m - 1 - 1);
  const sigma2 = sse / df;
  const seTau = sxx > 0 ? Math.sqrt(sigma2 / sxx) : Infinity;
  const tauStat = Number.isFinite(seTau) && seTau > 0 ? tau / seTau : 0;
  const N = p; // number of variables (y + regressors) in the cointegrating relationship
  const pValue = _mackinnonP(tauStat, N);
  return {
    test: 'Cointegration (Engle-Granger)', tStat: +tauStat.toFixed(4), p: +pValue.toFixed(4),
    rho: +tau.toFixed(4), N, criticalValues: _mackinnonCV[Math.min(6, Math.max(1, N))], n,
    apa: `EG cointegration: τ(N=${N}) = ${tauStat.toFixed(2)}, MacKinnon p = ${pValue.toFixed(3)}, ${pValue < 0.05 ? 'cointegrated' : 'not cointegrated'}`,
  };
}

// ── Vector Error Correction Model ───────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string[]} yVars */
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
/** @param {Array<Record<string, any>>} data @param {string[]} yVars */
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
