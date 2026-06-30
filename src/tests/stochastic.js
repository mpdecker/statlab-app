import { avg, sampleVar } from '../math/core.js';
import { chiPVal } from '../math/distributions.js';
import { jacobiEigen } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Markov Chain ────────────────────────────────────────────────────────────
export function markovChain(sequence, { nStates = null } = {}) {
  if (!sequence || sequence.length < 20) return null;
  const n = sequence.length;
  const states = nStates ? Array.from({ length: nStates }, (_, i) => i) : [...new Set(sequence)].sort((a, b) => a - b);
  const k = states.length;
  if (k < 2) return null;
  const stateIdx = Object.fromEntries(states.map((s, i) => [s, i]));
  const counts = Array.from({ length: k }, () => Array(k).fill(0));
  for (let t = 0; t < n - 1; t++) {
    const i = stateIdx[sequence[t]], j = stateIdx[sequence[t + 1]];
    if (i != null && j != null) counts[i][j]++;
  }
  const P = counts.map(row => {
    const sum = row.reduce((s, v) => s + v, 0);
    return sum > 0 ? row.map(v => +((v / sum)).toFixed(4)) : row.map(() => +(1 / k).toFixed(4));
  });
  return {
    test: 'Markov Chain', transitionMatrix: P, states, n,
    apa: `Markov: ${k} states, n = ${n}`,
  };
}

// ── Markov Steady State ────────────────────────────────────────────────────
export function markovSteadyState(P) {
  if (!P || !P.length || P.length < 2) return null;
  const k = P.length;
  // Power iteration
  let pi = Array(k).fill(1 / k);
  for (let iter = 0; iter < 200; iter++) {
    const newPi = Array(k).fill(0);
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) newPi[i] += P[j][i] * pi[j];
    let delta = 0;
    for (let i = 0; i < k; i++) delta += Math.abs(newPi[i] - pi[i]);
    pi = newPi;
    if (delta < 1e-10) break;
  }
  return {
    test: 'Steady State', pi: pi.map(v => +v.toFixed(4)), k,
    apa: `Steady-state: π = ${pi.map(v => v.toFixed(3)).join(', ')}`,
  };
}

// ── Poisson Process ─────────────────────────────────────────────────────────
export function poissonProcess(arrivalTimes, { interval = 1 } = {}) {
  if (!arrivalTimes || arrivalTimes.length < 10) return null;
  const n = arrivalTimes.length;
  const sorted = [...arrivalTimes].sort((a, b) => a - b);
  const interArrivals = [];
  for (let i = 1; i < n; i++) interArrivals.push(sorted[i] - sorted[i - 1]);
  const rate = n / (sorted[n - 1] - sorted[0]) * interval;
  const expMean = 1 / rate;
  const expVals = interArrivals.map(() => expMean);
  // Chi-square dispersion test
  const meanIA = avg(interArrivals);
  let chi2 = 0;
  for (const ia of interArrivals) chi2 += (ia - meanIA) ** 2 / meanIA;
  const p = chiPVal(Math.max(0, chi2), n - 2);
  return {
    test: 'Poisson Process', rate: +rate.toFixed(4), meanInterArrival: +meanIA.toFixed(4), chi2Dispersion: +chi2.toFixed(4), p, n,
    apa: `Poisson: rate = ${rate.toFixed(3)}, p = ${p.toFixed(3)}, n = ${n}`,
  };
}

// ── Brownian Motion ────────────────────────────────────────────────────────
export function brownianMotion(data, { dt = 1 } = {}) {
  if (!data || data.length < 10) return null;
  const n = data.length;
  const increments = [];
  for (let i = 1; i < n; i++) increments.push(data[i] - data[i - 1]);
  const mu = avg(increments) / dt;
  const sigma2 = increments.reduce((s, v) => s + (v - avg(increments)) ** 2, 0) / (n - 2) / dt;
  return {
    test: 'Brownian Motion', drift: +mu.toFixed(6), diffusion: +sigma2.toFixed(6), n, dt,
    apa: `Brownian: μ = ${mu.toFixed(5)}, σ² = ${sigma2.toFixed(5)}, n = ${n}`,
  };
}

// ── Random Walk Test (Variance Ratio) ──────────────────────────────────────
export function randomWalkTest(data, { q = 2 } = {}) {
  if (!data || data.length < 20) return null;
  const n = data.length;
  const ret = [];
  for (let i = 1; i < n; i++) ret.push(data[i] - data[i - 1]);
  const mu = avg(ret);
  // Variance ratio: var(q-period) / (q * var(1-period))
  const var1 = ret.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 2);
  let varQ = 0;
  const m = n - q;
  for (let i = 0; i < m; i++) {
    const d = data[i + q] - data[i];
    varQ += (d - q * mu) ** 2;
  }
  varQ /= (m - 1);
  const VR = varQ / (q * Math.max(var1, 1e-10));
  const se = Math.sqrt(2 * (2 * q - 1) * (q - 1) / (3 * q * n));
  const z = (VR - 1) / Math.max(se, 1e-10);
  const p = 2 * (1 - (0.5 + 0.5 * Math.tanh(Math.abs(z) / Math.SQRT2)));
  return {
    test: 'Random Walk Test', varianceRatio: +VR.toFixed(4), z: +z.toFixed(4), p, q, n,
    apa: `VR(${q}) = ${VR.toFixed(3)}, z = ${z.toFixed(2)}, ${p < 0.05 ? 'not RW' : 'RW holds'}`,
  };
}

// ── Ornstein-Uhlenbeck Process ────────────────────────────────────
export function ornsteinUhlenbeck(data, dt = 1) {
  if (!data || data.length < 10) return null;
  const n = data.length;
  const dx = data.slice(1).map((v, i) => v - data[i]);
  const y = dx;
  const x = data.slice(0, -1);
  let num = 0, den = 0;
  for (let i = 0; i < n - 1; i++) { num += x[i] * y[i]; den += x[i] * x[i]; }
  const thetaHat = -Math.log(Math.max(num / Math.max(den, 1e-10), 0.01)) / dt;
  const muHat = -num / Math.max(den * (1 - Math.exp(-thetaHat * dt)), 1e-10);
  const resid = y.map((yi, i) => yi - thetaHat * (muHat - x[i]) * dt);
  const sigmaHat = Math.sqrt(sampleVar(resid) / dt);
  return { test: 'Ornstein-Uhlenbeck', theta: +thetaHat.toFixed(4), mu: +muHat.toFixed(4), sigma: +sigmaHat.toFixed(4), n, dt, apa: `OU: theta=${thetaHat.toFixed(3)}, mu=${muHat.toFixed(3)}, sigma=${sigmaHat.toFixed(3)}` };
}

// ── Jump Diffusion ────────────────────────────────────────────────
export function jumpDiffusion(data, dt = 1) {
  if (!data || data.length < 20) return null;
  const n = data.length;
  const returns = data.slice(1).map((v, i) => Math.log(v / Math.max(data[i], 1e-10)));
  const mu = avg(returns) / dt;
  const sigma = Math.sqrt(sampleVar(returns) / dt);
  const thresh = 3 * sigma * Math.sqrt(dt);
  const jumps = returns.map(r => Math.abs(r) > thresh ? r : 0);
  const jumpCount = jumps.filter(j => j !== 0).length;
  const lambda = jumpCount / (n * dt);
  const jumpMean = jumpCount > 0 ? avg(jumps.filter(j => j !== 0)) : 0;
  return { test: 'Jump Diffusion', mu: +mu.toFixed(6), sigma: +sigma.toFixed(6), lambda: +lambda.toFixed(4), jumpMean: +jumpMean.toFixed(6), jumpCount, n, apa: `Jump diff: lambda=${lambda.toFixed(3)}, ${jumpCount} jumps` };
}

// ── Regime Switching (2-state) ────────────────────────────────────
export function regimeSwitching(data, { nStates = 2, maxIter = 20 } = {}) {
  if (!data || data.length < 20 || nStates < 2) return null;
  const n = data.length;
  const mu = [avg(data) * 0.8, avg(data) * 1.2];
  const sigma = [Math.sqrt(sampleVar(data)) * 0.7, Math.sqrt(sampleVar(data)) * 1.3];
  const trans = [[0.95, 0.05], [0.05, 0.95]];
  let probs = [0.5, 0.5];
  let gamma = [[], []];

  for (let iter = 0; iter < maxIter; iter++) {
    const xi = Array.from({ length: n }, () => Array(nStates).fill(0));
    for (let t = 0; t < n; t++) {
      for (let s = 0; s < nStates; s++) {
        const z = (data[t] - mu[s]) / Math.max(sigma[s], 1e-10);
        xi[t][s] = Math.exp(-0.5 * z * z) / (Math.sqrt(2 * Math.PI) * sigma[s]);
      }
    }
    gamma = Array.from({ length: n }, () => Array(nStates).fill(0));
    gamma[0] = probs.map((p, s) => p * xi[0][s]);
    const sum0 = gamma[0].reduce((s, v) => s + v, 0);
    if (sum0 > 0) gamma[0] = gamma[0].map(v => v / sum0);
    for (let t = 1; t < n; t++) {
      for (let s = 0; s < nStates; s++) {
        gamma[t][s] = xi[t][s] * gamma[t-1].reduce((sum, v, prev) => sum + v * trans[prev][s], 0);
      }
      const sumT = gamma[t].reduce((s, v) => s + v, 0);
      if (sumT > 0) gamma[t] = gamma[t].map(v => v / sumT);
    }
    probs = [avg(gamma.map(g => g[0])), avg(gamma.map(g => g[1]))];
  }
  
  const regimes = data.map((d, t) => gamma[t][0] > gamma[t][1] ? 1 : 2);
  const regimeMeans = [avg(data.filter((_, i) => regimes[i] === 1)), avg(data.filter((_, i) => regimes[i] === 2))];
  return { test: 'Regime Switching', mu: mu.map(v => +v.toFixed(4)), sigma: sigma.map(v => +v.toFixed(4)), stationary: probs.map(p => +p.toFixed(4)), regimeCounts: [regimes.filter(r => r === 1).length, regimes.filter(r => r === 2).length], n, apa: `Regime switch: mu1=${mu[0].toFixed(3)}, mu2=${mu[1].toFixed(3)}` };
}

// ── Heston Stochastic Volatility Model ────────────────────────────
export function hestonModel(returns, dt = 1 / 252) {
  if (!returns || returns.length < 20) return null;
  const n = returns.length;
  const mu = avg(returns);
  // Calibrate by method of moments on the realized-variance proxy v_t≈(r_t−μ)²/dt
  // (the old code returned the input default parameters unchanged).
  const v = returns.map(r => (r - mu) ** 2 / dt);
  const theta = avg(v);               // long-run variance E[v]
  const v0 = v[0];
  // AR(1) of v: v_t = a + b·v_{t-1} + e ⇒ mean-reversion κ = (1−b)/dt.
  const m = n - 1;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let t = 1; t < n; t++) { sx += v[t - 1]; sy += v[t]; sxx += v[t - 1] ** 2; sxy += v[t - 1] * v[t]; }
  const b = (m * sxy - sx * sy) / Math.max(m * sxx - sx * sx, 1e-12);
  const a = (sy - b * sx) / m;
  const kappa = Math.max(1e-3, (1 - b) / dt);
  // Residual variance of the AR(1) ⇒ vol-of-vol: Var(e) ≈ ξ²·θ·dt.
  let rss = 0; for (let t = 1; t < n; t++) { const e = v[t] - (a + b * v[t - 1]); rss += e * e; }
  const residVar = rss / Math.max(m - 2, 1);
  const xi = Math.sqrt(Math.max(residVar / Math.max(theta * dt, 1e-12), 0));
  // Leverage ρ = corr(r_{t−1}−μ, Δv_t).
  const dr = [], dv = [];
  for (let t = 1; t < n; t++) { dr.push(returns[t - 1] - mu); dv.push(v[t] - v[t - 1]); }
  const mdr = avg(dr), mdv = avg(dv);
  let c = 0, sdr = 0, sdv = 0;
  for (let i = 0; i < dr.length; i++) { c += (dr[i] - mdr) * (dv[i] - mdv); sdr += (dr[i] - mdr) ** 2; sdv += (dv[i] - mdv) ** 2; }
  const rho = sdr * sdv > 0 ? Math.max(-0.999, Math.min(0.999, c / Math.sqrt(sdr * sdv))) : 0;
  const sigma = Math.sqrt(theta);
  return {
    test: 'Heston Model', mu: +mu.toFixed(6), sigma: +sigma.toFixed(6),
    kappa: +kappa.toFixed(4), theta: +theta.toFixed(6), xi: +xi.toFixed(4), rho: +rho.toFixed(4), v0: +v0.toFixed(6), n,
    apa: `Heston (MoM): θ=${theta.toFixed(4)}, κ=${kappa.toFixed(2)}, ξ=${xi.toFixed(2)}, ρ=${rho.toFixed(2)}`,
  };
}

function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = __rng();
  while (v === 0) v = __rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Rough Volatility (fractional Ornstein-Uhlenbeck) ──────────────
export function roughVolatility(returns, H = 0.07, { dt = 1/252 } = {}) {
  if (!returns || returns.length < 20) return null;
  const n = returns.length;
  const logVar = Array(n).fill(Math.log(sampleVar(returns) || 0.01));
  for (let t = 1; t < n; t++) {
    let inc = 0;
    const maxLag = Math.min(t, 50);
    for (let k = 1; k <= maxLag; k++) {
      inc += (Math.pow(k, H - 0.5) - Math.pow(k - 1, H - 0.5)) * (logVar[t - k] || 0);
    }
    logVar[t] = avg(logVar) + 0.5 * inc;
  }
  const sigma = Math.sqrt(Math.exp(avg(logVar)));
  return { test: 'Rough Volatility', H, sigma: +sigma.toFixed(6), n, apa: `Rough vol: H=${H}, sigma=${sigma.toFixed(4)}` };
}

// ── SABR Model ────────────────────────────────────────────────────
export function sabrModel(F, K, T, { alpha = 0.3, beta = 0.5, nu = 0.4, rho = -0.3 } = {}) {
  if (!Number.isFinite(F) || !Number.isFinite(K) || F <= 0 || K <= 0 || T <= 0) return null;
  const FK = Math.pow(F * K, (1 - beta) / 2);
  const logFK = Math.log(F / K);
  const z = nu / alpha * FK * logFK;
  const xz = Math.log((Math.sqrt(1 - 2 * rho * z + z * z) + z - rho) / (1 - rho));
  const sigma = alpha / (FK * (1 + (1 - beta) ** 2 / 24 * logFK * logFK + (1 - beta) ** 4 / 1920 * logFK ** 4)) * (z / Math.max(xz, 1e-10));
  return { test: 'SABR Model', impliedVol: +sigma.toFixed(4), F, K, T, apa: `SABR: vol=${sigma.toFixed(3)}, F=${F}, K=${K}` };
}

// ── Vasicek Interest Rate Model ───────────────────────────────────
export function vasicekModel(data, dt = 1/252) {
  if (!data || data.length < 10) return null;
  const n = data.length;
  const dx = data.slice(1).map((v, i) => v - data[i]);
  const x = data.slice(0, -1);
  let Sx = 0, Sy = 0, Sxx = 0;
  for (let i = 0; i < n - 1; i++) { Sx += x[i]; Sy += dx[i]; Sxx += x[i] * x[i]; }
  const kappa = (dx.reduce((s, v) => s + v * x[data.indexOf(v)], 0) - Sx * Sy / (n - 1)) / (Sxx - Sx * Sx / (n - 1));
  const theta = (Sy / (n - 1) - kappa * Sx / (n - 1)) / Math.max(-kappa, 1e-6);
  const resid = dx.map((d, i) => d - kappa * (theta - x[i]) * dt);
  const sigma = Math.sqrt(sampleVar(resid) / dt);
  return { test: 'Vasicek Model', kappa: +Math.abs(kappa).toFixed(4), theta: +theta.toFixed(4), sigma: +sigma.toFixed(6), n, apa: `Vasicek: kappa=${Math.abs(kappa).toFixed(2)}, theta=${theta.toFixed(3)}` };
}
