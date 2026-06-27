import { avg } from '../math/core.js';
import { chiPVal } from '../math/distributions.js';
import { jacobiEigen } from '../math/matrix.js';

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
