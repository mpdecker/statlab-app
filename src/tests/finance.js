import { avg, sampleSD } from '../math/core.js';
import { normalCDF, normalINV } from '../math/distributions.js';
import { matInv } from '../math/matrix.js';

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

// Fama-French 3-Factor
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

// Carhart 4-Factor
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

// EGARCH
export function egarch(returns) {
  if (!returns || returns.length < 20) return null;
  const n = returns.length;
  const mu = avg(returns);
  const res = returns.map(v => v - mu);
  let omega = -1, alpha = 0.1, beta = 0.9, gamma = 0.05;
  const sigma2 = Array(n).fill(0);
  sigma2[0] = res.reduce((s, v) => s + v * v, 0) / n;
  for (let t = 1; t < n; t++) {
    const z = Math.abs(res[t - 1]) / Math.sqrt(Math.max(sigma2[t - 1], 1e-6));
    sigma2[t] = Math.exp(omega + beta * Math.log(Math.max(sigma2[t - 1], 1e-6)) + alpha * z + gamma * (Math.abs(z) - Math.SQRT2));
  }
  return { test: 'EGARCH', omega, alpha, beta, gamma, conditionalVar: sigma2.slice(-10).map(v => +v.toFixed(6)), n, apa: `EGARCH: γ = ${gamma.toFixed(3)}, n = ${n}` };
}

// TGARCH
export function tgarch(returns) {
  if (!returns || returns.length < 20) return null;
  const n = returns.length;
  const mu = avg(returns);
  const res = returns.map(v => v - mu);
  let omega = 0.01, alpha = 0.05, beta = 0.9, gamma = 0.05;
  const sigma2 = Array(n).fill(0);
  sigma2[0] = res.reduce((s, v) => s + v * v, 0) / n;
  for (let t = 1; t < n; t++) {
    const neg = res[t - 1] < 0 ? 1 : 0;
    sigma2[t] = omega + alpha * res[t - 1] * res[t - 1] + gamma * neg * res[t - 1] * res[t - 1] + beta * sigma2[t - 1];
  }
  return { test: 'TGARCH', omega, alpha, beta, gamma, conditionalVar: sigma2.slice(-10).map(v => +v.toFixed(6)), n, apa: `TGARCH: γ = ${gamma.toFixed(3)}, n = ${n}` };
}

// Treynor Ratio
export function treynorRatio(returns, beta, riskFree = 0) {
  if (!returns || !returns.length || !beta || beta === 0) return null;
  const n = returns.length;
  const excess = avg(returns) - riskFree;
  const treynor = excess / beta;
  return { test: 'Treynor Ratio', treynor: +treynor.toFixed(4), beta, mean: +avg(returns).toFixed(6), riskFree, n, apa: `Treynor = ${treynor.toFixed(2)} (β = ${beta.toFixed(2)})` };
}
