import { avg, sampleSD } from '../math/core.js';
import { normalCDF, normalINV } from '../math/distributions.js';
import { matInv } from '../math/matrix.js';
import { mleFit, numericGradient } from '../math/inference.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── CAPM Beta ──────────────────────────────────────────────────────────────
export function capmBeta(stockReturns, marketReturns, { riskFree = 0 } = {}) {
  if (!stockReturns || !marketReturns || stockReturns.length < 10 || stockReturns.length !== marketReturns.length) return null;
  const n = stockReturns.length;
  const exStock = stockReturns.map(r => r - riskFree);
  const exMarket = marketReturns.map(r => r - riskFree);
  const mx = avg(exMarket), my = avg(exStock);
  let cov = 0, varM = 0;
  for (let i = 0; i < n; i++) { cov += (exStock[i] - my) * (exMarket[i] - mx); varM += (exMarket[i] - mx) ** 2; }
  if (!varM) return null;
  const beta = cov / varM;
  const alpha = my - beta * mx;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) { const pred = alpha + beta * exMarket[i]; ssRes += (exStock[i] - pred) ** 2; ssTot += (exStock[i] - my) ** 2; }
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    test: 'CAPM Beta',
    beta: +beta.toFixed(4), alpha: +alpha.toFixed(6), rSquared: +rSquared.toFixed(4), n,
    apa: `CAPM: β = ${beta.toFixed(2)}, α = ${alpha.toFixed(4)}, R² = ${rSquared.toFixed(3)}, n = ${n}`,
  };
}

// ── Sharpe Ratio ────────────────────────────────────────────────────────────
/** @param {number[]} returns */
export function sharpeRatio(returns, { riskFree = 0, annualize = true } = {}) {
  if (!returns || returns.length < 5) return null;
  const n = returns.length;
  const excess = returns.map(r => r - riskFree);
  const mu = avg(excess);
  const sd = sampleSD(excess);
  if (!sd) return null;
  const sharpe = mu / sd;
  const factor = annualize ? Math.sqrt(252) : 1;
  return {
    test: 'Sharpe Ratio',
    sharpe: +(sharpe * factor).toFixed(4),
    meanReturn: +mu.toFixed(6),
    sd: +sd.toFixed(6),
    riskFree,
    annualized: annualize,
    n,
    apa: `Sharpe = ${(sharpe * factor).toFixed(2)}${annualize ? ' (annualized)' : ''}, n = ${n}`,
  };
}

// ── Sortino Ratio ───────────────────────────────────────────────────────────
/** @param {number[]} returns */
export function sortinoRatio(returns, { riskFree = 0, mar = 0 } = {}) {
  if (!returns || returns.length < 5) return null;
  const n = returns.length;
  const excess = returns.map(r => r - riskFree);
  const mu = avg(excess);
  let downsideSum = 0;
  for (const r of returns) if (r < mar) downsideSum += (r - mar) ** 2;
  const downsideDev = Math.sqrt(downsideSum / n);
  if (!downsideDev) return null;
  const sortino = mu / downsideDev;

  return {
    test: 'Sortino Ratio',
    sortino: +sortino.toFixed(4),
    downsideDeviation: +downsideDev.toFixed(6),
    mar, n,
    apa: `Sortino = ${sortino.toFixed(2)} (MAR = ${mar}), n = ${n}`,
  };
}

// ── Max Drawdown ────────────────────────────────────────────────────────────
/** @param {number[]} returns */
export function maxDrawdown(returns) {
  if (!returns || returns.length < 3) return null;
  const n = returns.length;
  let cum = 1, peak = 1, peakIdx = 0, troughIdx = 0;
  let maxDD = 0, ddPeak = 0, ddTrough = 0;
  for (let i = 0; i < n; i++) {
    cum *= (1 + returns[i]);
    if (cum > peak) { peak = cum; peakIdx = i; }
    const dd = (peak - cum) / peak;
    if (dd > maxDD) { maxDD = dd; ddPeak = peakIdx; ddTrough = i; }
  }

  return {
    test: 'Max Drawdown',
    maxDrawdown: +(maxDD * 100).toFixed(2),
    peakIndex: ddPeak,
    troughIndex: ddTrough,
    n,
    apa: `Max drawdown = ${(maxDD * 100).toFixed(1)}%, from t=${ddPeak} to t=${ddTrough}, n = ${n}`,
  };
}

// ── Historical VaR ──────────────────────────────────────────────────────────
/** @param {number[]} returns */
export function historicalVaR(returns, { alpha = 0.05 } = {}) {
  if (!returns || returns.length < 20) return null;
  const n = returns.length;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor(alpha * n);
  const varVal = -sorted[idx];
  const tail = sorted.slice(0, Math.max(1, idx));
  const cvar = tail.length ? -avg(tail) : varVal;

  return {
    test: 'Historical VaR',
    var: +varVal.toFixed(4),
    cvar: +cvar.toFixed(4),
    alpha, n,
    apa: `VaR(${alpha}) = ${varVal.toFixed(3)}, CVaR = ${cvar.toFixed(3)}, n = ${n}`,
  };
}

// ── Parametric VaR ──────────────────────────────────────────────────────────
/** @param {number[]} returns */
export function parametricVaR(returns, { alpha = 0.05, horizon = 1 } = {}) {
  if (!returns || returns.length < 5) return null;
  const n = returns.length;
  const mu = avg(returns);
  const sigma = sampleSD(returns);
  if (!sigma) return null;
  const z = normalINV(alpha);
  const varVal = -(mu * horizon + z * sigma * Math.sqrt(horizon));

  return {
    test: 'Parametric VaR',
    var: +varVal.toFixed(4),
    mean: +mu.toFixed(6),
    sd: +sigma.toFixed(6),
    alpha, horizon, n,
    apa: `VaR_par(${alpha}) = ${varVal.toFixed(3)}, μ = ${mu.toFixed(4)}, σ = ${sigma.toFixed(4)}, n = ${n}`,
  };
}

// ── Rolling Window ──────────────────────────────────────────────────────────
/** @param {Function} fn @param {Array<Record<string, any>>} data */
export function rollingWindow(data, fn, windowSize, { step = 1 } = {}) {
  if (!data || !fn || data.length < windowSize) return null;
  const n = data.length;
  const values = [];
  for (let i = 0; i <= n - windowSize; i += step) {
    const win = data.slice(i, i + windowSize);
    const result = fn(win, i);
    if (result != null) values.push(Number.isFinite(result) ? +result.toFixed(6) : result);
  }
  if (!values.length) return null;

  return {
    test: 'Rolling Window',
    values,
    windowSize,
    step,
    n,
    apa: `Rolling window: ${values.length} windows of size ${windowSize}, n = ${n}`,
  };
}

// ── Fama-French 3-Factor ──────────────────────────────────────────
/** @param {number[]} returns */
export function famaFrench3F(returns, market, smb, hml) {
  if (!returns || !market || !smb || !hml) return null;
  const n = Math.min(returns.length, market.length, smb.length, hml.length);
  if (n < 10) return null;
  const y = returns.slice(0, n), x1 = market.slice(0, n), x2 = smb.slice(0, n), x3 = hml.slice(0, n);
  const X = [x1, x2, x3];
  const Xt = [0, 1, 2].map(j => X[j].map(r => r));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const resid = y.map((yi, i) => yi - beta[0] * x1[i] - beta[1] * x2[i] - beta[2] * x3[i]);
  const rss = resid.reduce((s, e) => s + e * e, 0);
  const rsq = 1 - rss / y.reduce((s, yi) => s + (yi - y.reduce((a, v) => a + v, 0) / n) ** 2, 0);
  return { test: 'Fama-French 3F', coefficients: [{ name: 'Market', b: +beta[0].toFixed(4) }, { name: 'SMB', b: +beta[1].toFixed(4) }, { name: 'HML', b: +beta[2].toFixed(4) }], rSquared: +rsq.toFixed(4), n, apa: `FF3: R² = ${rsq.toFixed(3)}, n = ${n}` };
}

// ── Carhart 4-Factor ──────────────────────────────────────────────
/** @param {number[]} returns */
export function carhart4F(returns, market, smb, hml, mom) {
  if (!returns || !market || !smb || !hml || !mom) return null;
  const n = Math.min(returns.length, market.length, smb.length, hml.length, mom.length);
  if (n < 10) return null;
  const y = returns.slice(0, n), x = [market.slice(0, n), smb.slice(0, n), hml.slice(0, n), mom.slice(0, n)];
  const Xt = [0, 1, 2, 3].map(j => x[j].map(r => r));
  const XtX = Xt.map(r1 => x[0].map((_, j) => r1.reduce((s, _, k) => s + x[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const resid = y.map((yi, i) => yi - x[0][i] * beta[0] - x[1][i] * beta[1] - x[2][i] * beta[2] - x[3][i] * beta[3]);
  const rsq = 1 - resid.reduce((s, e) => s + e * e, 0) / y.reduce((s, yi) => s + (yi - y.reduce((a, v) => a + v, 0) / n) ** 2, 0);
  return { test: 'Carhart 4F', coefficients: [{ name: 'Market', b: +beta[0].toFixed(4) }, { name: 'SMB', b: +beta[1].toFixed(4) }, { name: 'HML', b: +beta[2].toFixed(4) }, { name: 'MOM', b: +beta[3].toFixed(4) }], rSquared: +rsq.toFixed(4), n, apa: `C4F: R² = ${rsq.toFixed(3)}, n = ${n}` };
}

const _logistic = x => 1 / (1 + Math.exp(-x));

// Gaussian conditional log-likelihood Σ −½[ln 2π + ln σ²_t + ε²_t/σ²_t].
function _gaussianLL(eps, s2) {
  let ll = 0;
  for (let t = 0; t < eps.length; t++) ll -= 0.5 * (Math.log(2 * Math.PI) + Math.log(s2[t]) + eps[t] * eps[t] / s2[t]);
  return ll;
}
// MLE for a GARCH-family variance recursion (returns null on an invalid path).
// Gradient descent (robust on the often ill-conditioned GARCH surface) gets into
// a good region, then a Newton polish via mleFit yields the Hessian-based SEs.
function _garchFit(eps, sigma2From, init) {
  const n = eps.length;
  const negLogLik = theta => {
    const s2 = sigma2From(theta, eps);
    if (!s2) return 1e10;
    let nll = 0;
    for (let t = 0; t < n; t++) { if (!(s2[t] > 1e-12) || !Number.isFinite(s2[t])) return 1e10; nll += 0.5 * (Math.log(2 * Math.PI) + Math.log(s2[t]) + eps[t] * eps[t] / s2[t]); }
    return Number.isFinite(nll) ? nll : 1e10;
  };
  let theta = init.slice(), f = negLogLik(theta), lr = 1e-3;
  for (let iter = 0; iter < 500; iter++) {
    const g = numericGradient(theta, negLogLik);
    if (Math.sqrt(g.reduce((s, v) => s + v * v, 0)) < 1e-7) break;
    let stepped = false;
    for (let ls = 0; ls < 15; ls++) {
      const cand = theta.map((t, j) => t - lr * g[j]);
      const fc = negLogLik(cand);
      if (Number.isFinite(fc) && fc < f - 1e-12) { theta = cand; f = fc; lr *= 1.2; stepped = true; break; }
      lr *= 0.5;
    }
    if (!stepped) break;
  }
  const fit = mleFit(theta, negLogLik, { maxIter: 80 });
  return negLogLik(fit.theta) <= f + 1e-9 ? fit : { ...fit, theta, se: fit.se };
}

// ── EGARCH(1,1) — Gaussian MLE ──────────────────────────────────────────────
/** @param {number[]} returns */
export function egarch(returns) {
  if (!returns || returns.length < 20) return null;
  const n = returns.length;
  const eps = returns.map(v => v - avg(returns));
  const v0 = eps.reduce((s, v) => s + v * v, 0) / n;
  const Eabs = Math.sqrt(2 / Math.PI);
  // ln σ²_t = ω + β ln σ²_{t-1} + α(|z|−E|z|) + γ z;  β = tanh(θ2) ∈ (−1,1).
  const recur = theta => {
    const omega = theta[0], alpha = theta[1], beta = Math.tanh(theta[2]), gamma = theta[3];
    const logS2 = Array(n); logS2[0] = Math.log(Math.max(v0, 1e-8));
    for (let t = 1; t < n; t++) {
      const sPrev = Math.sqrt(Math.exp(logS2[t - 1]));
      const z = sPrev > 0 ? eps[t - 1] / sPrev : 0;
      logS2[t] = omega + beta * logS2[t - 1] + alpha * (Math.abs(z) - Eabs) + gamma * z;
      if (!Number.isFinite(logS2[t]) || logS2[t] > 50) return null;
    }
    return logS2.map(l => Math.exp(l));
  };
  const fit = _garchFit(eps, recur, [Math.log(Math.max(v0, 1e-8)) * 0.1, 0.1, 1.5, -0.05]);
  const omega = fit.theta[0], alpha = fit.theta[1], beta = Math.tanh(fit.theta[2]), gamma = fit.theta[3];
  const s2 = recur(fit.theta) || Array(n).fill(v0);
  return {
    test: 'EGARCH', omega: +omega.toFixed(5), alpha: +alpha.toFixed(5), beta: +beta.toFixed(5), gamma: +gamma.toFixed(5),
    persistence: +beta.toFixed(5), logLik: +_gaussianLL(eps, s2).toFixed(4),
    conditionalVar: s2.slice(-10).map(v => +v.toFixed(6)), n, apa: `EGARCH (MLE): β = ${beta.toFixed(3)}, γ = ${gamma.toFixed(3)}, n = ${n}`,
  };
}

// ── TGARCH / GJR-GARCH(1,1) — Gaussian MLE ──────────────────────────────────
/** @param {number[]} returns */
export function tgarch(returns) {
  if (!returns || returns.length < 20) return null;
  const n = returns.length;
  const eps = returns.map(v => v - avg(returns));
  const v0 = eps.reduce((s, v) => s + v * v, 0) / n;
  // σ²_t = ω + α ε² + γ·1(ε<0)·ε² + β σ²_{t-1}; transforms keep ω>0, α,β≥0, α+γ≥0.
  const recur = theta => {
    const omega = Math.exp(theta[0]);
    const alpha = 0.5 * _logistic(theta[1]);
    const beta = 0.98 * _logistic(theta[2]);
    const gamma = alpha * (2 * _logistic(theta[3]) - 1);
    const s2 = Array(n); s2[0] = v0;
    for (let t = 1; t < n; t++) {
      s2[t] = omega + alpha * eps[t - 1] * eps[t - 1] + (eps[t - 1] < 0 ? gamma * eps[t - 1] * eps[t - 1] : 0) + beta * s2[t - 1];
      if (!(s2[t] > 0) || !Number.isFinite(s2[t])) return null;
    }
    return s2;
  };
  const fit = _garchFit(eps, recur, [Math.log(0.1 * v0 + 1e-8), -1.4, 0.5, 0]);
  const omega = Math.exp(fit.theta[0]);
  const alpha = 0.5 * _logistic(fit.theta[1]);
  const beta = 0.98 * _logistic(fit.theta[2]);
  const gamma = alpha * (2 * _logistic(fit.theta[3]) - 1);
  const s2 = recur(fit.theta) || Array(n).fill(v0);
  return {
    test: 'TGARCH', omega: +omega.toFixed(5), alpha: +alpha.toFixed(5), beta: +beta.toFixed(5), gamma: +gamma.toFixed(5),
    persistence: +(alpha + gamma / 2 + beta).toFixed(5), logLik: +_gaussianLL(eps, s2).toFixed(4),
    conditionalVar: s2.slice(-10).map(v => +v.toFixed(6)), n, apa: `TGARCH (GJR-MLE): α=${alpha.toFixed(3)}, γ=${gamma.toFixed(3)}, β=${beta.toFixed(3)}, n = ${n}`,
  };
}

// ── Treynor Ratio ─────────────────────────────────────────────────
/** @param {number[]} returns @param {number} beta @param {number} [riskFree] */
export function treynorRatio(returns, beta, riskFree = 0) {
  if (!returns || !returns.length || !beta || beta === 0) return null;
  const n = returns.length;
  const excess = avg(returns) - riskFree;
  const treynor = excess / beta;
  return { test: 'Treynor Ratio', treynor: +treynor.toFixed(4), beta, mean: +avg(returns).toFixed(6), riskFree, n, apa: `Treynor = ${treynor.toFixed(2)} (β = ${beta.toFixed(2)})` };
}

// ── Black-Scholes ─────────────────────────────────────────────────
/** @param {number} time @param {number} sigma @param {string} [type] @param {number} spot @param {number} strike @param {number} rate */
export function blackScholes(spot, strike, time, rate, sigma, type = 'call') {
  if (![spot, strike, time, rate, sigma].every(Number.isFinite) || spot <= 0 || strike <= 0 || sigma <= 0) return null;
  const d1 = (Math.log(spot / strike) + (rate + sigma * sigma / 2) * time) / (sigma * Math.sqrt(time));
  const d2 = d1 - sigma * Math.sqrt(time);
  const phi = normalCDF(d1);
  const phi2 = normalCDF(d2);
  const price = type === 'call' ? spot * phi - strike * Math.exp(-rate * time) * phi2 : strike * Math.exp(-rate * time) * (1 - phi2) - spot * (1 - phi);
  return { test: 'Black-Scholes', price: +price.toFixed(4), type, spot, strike, time, rate, sigma, apa: `BS ${type}: ${price.toFixed(2)}` };
}

// ── Implied Volatility ────────────────────────────────────────────
/** @param {number} time @param {string} [type] @param {number} spot @param {number} strike @param {number} rate */
export function impliedVolatility(marketPrice, spot, strike, time, rate, type = 'call') {
  if (![marketPrice, spot, strike, time, rate].every(Number.isFinite)) return null;
  let lo = 0.01, hi = 3;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const price = blackScholes(spot, strike, time, rate, mid, type)?.price || 0;
    if (price < marketPrice) lo = mid; else hi = mid;
    if (Math.abs(price - marketPrice) < 0.001) break;
  }
  return { test: 'Implied Volatility', iv: +((lo + hi) / 2).toFixed(4), marketPrice, spot, strike, time, rate, type, apa: `IV = ${((lo + hi) / 2 * 100).toFixed(1)}%` };
}

// ── Option Greeks ─────────────────────────────────────────────────
/** @param {number} time @param {number} sigma @param {number} spot @param {number} strike @param {number} rate */
export function optionGreeks(spot, strike, time, rate, sigma) {
  if (![spot, strike, time, rate, sigma].every(Number.isFinite)) return null;
  const d1 = (Math.log(spot / strike) + (rate + sigma * sigma / 2) * time) / (sigma * Math.sqrt(time));
  const d2 = d1 - sigma * Math.sqrt(time);
  const phi = normalCDF(d1);
  const pdf = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  const delta = phi;
  const gamma = pdf / (spot * sigma * Math.sqrt(time));
  const theta = -spot * pdf * sigma / (2 * Math.sqrt(time)) - rate * strike * Math.exp(-rate * time) * normalCDF(d2);
  const vega = spot * Math.sqrt(time) * pdf / 100;
  const rho = strike * time * Math.exp(-rate * time) * normalCDF(d2) / 100;
  return { test: 'Option Greeks', delta: +delta.toFixed(4), gamma: +gamma.toFixed(4), theta: +theta.toFixed(4), vega: +vega.toFixed(4), rho: +rho.toFixed(4), apa: `Greeks: δ=${delta.toFixed(3)}, γ=${gamma.toFixed(4)}` };
}

// ── Binomial Tree (CRR) ───────────────────────────────────────────
/** @param {number} time @param {number} sigma @param {number} [steps] @param {string} [type] @param {number} spot @param {number} strike @param {number} rate */
export function binomialTree(spot, strike, time, rate, sigma, steps = 100, type = 'call') {
  if (![spot, strike, time, rate, sigma].every(Number.isFinite) || steps < 2) return null;
  const dt = time / steps;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const p = (Math.exp(rate * dt) - d) / (u - d);
  let prices = Array.from({ length: steps + 1 }, (_, i) => {
    const sT = spot * Math.pow(u, steps - i) * Math.pow(d, i);
    return type === 'call' ? Math.max(0, sT - strike) : Math.max(0, strike - sT);
  });
  for (let j = steps - 1; j >= 0; j--) {
    for (let i = 0; i <= j; i++) prices[i] = Math.exp(-rate * dt) * (p * prices[i] + (1 - p) * prices[i + 1]);
  }
  return { test: 'Binomial Tree', price: +prices[0].toFixed(4), steps, type, apa: `Binomial: ${prices[0].toFixed(2)} (${steps} steps)` };
}

// ── Monte Carlo Pricing ───────────────────────────────────────────
/** @param {number} time @param {number} sigma @param {number} [nPaths] @param {string} [type] @param {number} [seed] @param {number} spot @param {number} strike @param {number} rate */
export function monteCarloPricing(spot, strike, time, rate, sigma, nPaths = 10000, type = 'call', seed = 42) {
  __rng = mulberry32(seed);
  if (![spot, strike, time, rate, sigma].every(Number.isFinite) || nPaths < 100) return null;
  let sumPayoff = 0;
  for (let i = 0; i < nPaths; i++) {
    const z = Math.sqrt(-2 * Math.log(Math.max(__rng(), 0.001))) * Math.cos(2 * Math.PI * __rng());
    const sT = spot * Math.exp((rate - sigma * sigma / 2) * time + sigma * Math.sqrt(time) * z);
    const payoff = type === 'call' ? Math.max(0, sT - strike) : Math.max(0, strike - sT);
    sumPayoff += payoff;
  }
  const price = Math.exp(-rate * time) * sumPayoff / nPaths;
  return { test: 'Monte Carlo Pricing', price: +price.toFixed(4), nPaths, type, apa: `MC price: ${price.toFixed(2)} (${nPaths} paths)` };
}

// ── Variance Reduction ────────────────────────────────────────────
export function varReduction(payoffs, target) {
  if (!payoffs || !payoffs.length || !Number.isFinite(target)) return null;
  const n = payoffs.length;
  const mu = payoffs.reduce((s, v) => s + v, 0) / n;
  const rawVar = payoffs.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 1);
  const control = payoffs.map(v => v - target);
  const cMu = control.reduce((s, v) => s + v, 0) / n;
  const reducedVar = control.reduce((s, v) => s + (v - cMu) ** 2, 0) / (n - 1);
  return { test: 'Variance Reduction', rawVar: +rawVar.toFixed(6), reducedVar: +reducedVar.toFixed(6), reduction: +((1 - reducedVar / Math.max(rawVar, 1e-10)) * 100).toFixed(1), n, apa: `Var reduction: ${((1 - reducedVar / Math.max(rawVar, 1e-10)) * 100).toFixed(0)}%` };
}

// ── Monte Carlo Option Pricing (extended) ─────────────────────────
/** @param {number} sigma @param {number} r */
export function monteCarloOption(S, K, T, r, sigma, { seed = 42, nSim = 1000, type = 'call' } = {}) {
  __rng = mulberry32(seed);
  if (!Number.isFinite(S) || S <= 0 || K <= 0 || T <= 0) return null;
  let sumPayoff = 0;
  for (let i = 0; i < nSim; i++) {
    const z = Math.sqrt(-2 * Math.log(Math.max(__rng(), 1e-10))) * Math.cos(2 * Math.PI * __rng());
    const ST = S * Math.exp((r - sigma * sigma / 2) * T + sigma * Math.sqrt(T) * z);
    const payoff = type === 'call' ? Math.max(0, ST - K) : Math.max(0, K - ST);
    sumPayoff += payoff;
  }
  const price = Math.exp(-r * T) * sumPayoff / nSim;
  return { test: 'Monte Carlo Option', price: +price.toFixed(4), nSim, S, K, T, type, apa: `MC ${type}: ${price.toFixed(2)} (${nSim} sim)` };
}

// ── Option Greeks ─────────────────────────────────────────────────
/** @param {number} sigma @param {number} r */
export function greeks(S, K, T, r, sigma) {
  if (!Number.isFinite(S) || S <= 0 || K <= 0 || T <= 0) return null;
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const nd1 = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  const delta = normalCDF(d1);
  const gamma = nd1 / (S * sigma * Math.sqrt(T));
  const theta = -S * nd1 * sigma / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normalCDF(d2);
  const vega = S * Math.sqrt(T) * nd1 / 100;
  const rho = K * T * Math.exp(-r * T) * normalCDF(d2) / 100;
  return { test: 'Option Greeks', delta: +delta.toFixed(4), gamma: +gamma.toFixed(4), theta: +theta.toFixed(4), vega: +vega.toFixed(4), rho: +rho.toFixed(4), apa: `Greeks: delta=${delta.toFixed(3)}, gamma=${gamma.toFixed(3)}` };
}
