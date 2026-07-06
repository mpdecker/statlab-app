import { avg } from '../math/core.js';
import { matInv } from '../math/matrix.js';

// Pairwise distance matrix
/** @param {number[]} x */
export function distanceMatrix(x) {
  if (!x || x.length < 5) return null;
  const n = x.length;
  const D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (i === j) return 0;
    let s = 0;
    for (let k = 0; k < (x[i].length || 1); k++) {
      const d = (Array.isArray(x[i]) ? x[i][k] : x[i]) - (Array.isArray(x[j]) ? x[j][k] : x[j]);
      s += d * d;
    }
    return Math.sqrt(Math.abs(s));
  }));
  return D;
}

// ── Distance Covariance ───────────────────────────────────────────
/** @param {number[]} x @param {number[]} y */
export function distanceCovariance(x, y) {
  if (!x || !y || x.length < 5 || x.length !== y.length) return null;
  const n = x.length;
  const a = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (i === j) return 0;
    const xi = Array.isArray(x[i]) ? x[i][0] : x[i];
    const xj = Array.isArray(x[j]) ? x[j][0] : x[j];
    return Math.abs(xi - xj);
  }));
  const b = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (i === j) return 0;
    const yi = Array.isArray(y[i]) ? y[i][0] : y[i];
    const yj = Array.isArray(y[j]) ? y[j][0] : y[j];
    return Math.abs(yi - yj);
  }));
  // Double-centering
  let sumAB = 0;
  const rowMeansA = a.map(r => avg(r));
  const colMeansA = a[0].map((_, j) => avg(a.map(r => r[j])));
  const grandMeanA = avg(a.flat());
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const aC = a[i][j] - rowMeansA[i] - colMeansA[j] + grandMeanA;
      const bC = b[i][j] - avg(b[i]) - avg(b.map(r => r[j])) + avg(b.flat());
      sumAB += aC * bC;
    }
  }
  const dCov = Math.sqrt(Math.max(0, sumAB / (n * n)));
  return { test: 'Distance Covariance', dCov: +dCov.toFixed(4), n, apa: `dCov = ${dCov.toFixed(4)}` };
}

// ── Distance Correlation ──────────────────────────────────────────
/** @param {number[]} x @param {number[]} y */
export function distanceCorrelation(x, y) {
  if (!x || !y || x.length < 5 || x.length !== y.length) return null;
  const dCov = distanceCovariance(x, y)?.dCov || 0;
  const dVarX = distanceCovariance(x, x)?.dCov || 0;
  const dVarY = distanceCovariance(y, y)?.dCov || 0;
  const denom = Math.sqrt(Math.max(dVarX * dVarY, 0));
  const dCorr = denom > 0 ? dCov / denom : 0;
  return { test: 'Distance Correlation', dCorr: +dCorr.toFixed(4), dCov: +dCov.toFixed(4), n: x.length, apa: `dCorr = ${dCorr.toFixed(3)}, dCov = ${dCov.toFixed(3)}` };
}

// ── Energy Test for Equal Distributions ───────────────────────────
/** @param {number[]} x @param {number[]} y */
export function energyTest(x, y, { permutations = 199, seed = 42 } = {}) {
  if (!x || !y || x.length < 5 || y.length < 5) return null;
  const nA = x.length, nB = y.length;
  const energyStat = (a, b) => {
    const na = a.length, nb = b.length;
    let s = 0;
    for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) s += Math.abs(a[i] - b[j]);
    s *= 2 / (na * nb);
    for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) s -= Math.abs(a[i] - a[j]) / (na * na);
    for (let i = 0; i < nb; i++) for (let j = 0; j < nb; j++) s -= Math.abs(b[i] - b[j]) / (nb * nb);
    return s * na * nb / (na + nb);
  };
  const stat = energyStat(x, y);
  // Permutation test: pool, reshuffle into groups of the same sizes.
  const pool = [...x, ...y];
  let seedS = seed >>> 0;
  const rand = () => { seedS = (Math.imul(1664525, seedS) + 1013904223) >>> 0; return seedS / 2 ** 32; };
  let ge = 1; // +1 for the observed statistic (Davison-Hinkley convention)
  for (let perm = 0; perm < permutations; perm++) {
    const pl = [...pool];
    for (let k = pl.length - 1; k > 0; k--) { const m = Math.floor(rand() * (k + 1)); [pl[k], pl[m]] = [pl[m], pl[k]]; }
    if (energyStat(pl.slice(0, nA), pl.slice(nA)) >= stat) ge++;
  }
  const p = ge / (permutations + 1);
  return { test: 'Energy Test', statistic: +stat.toFixed(4), p: +p.toFixed(4), permutations, nA, nB, apa: `Energy = ${stat.toFixed(3)}, p = ${p.toFixed(3)} (${permutations} perms)` };
}

// ── Partial Distance Correlation ──────────────────────────────────
/** @param {number[]} x @param {number[]} y @param {number[]} z */
export function partialDistanceCorr(x, y, z) {
  if (!x || !y || !z || x.length < 5) return null;
  const n = x.length;
  const toNum = v => (Array.isArray(v) ? v[0] : +v);
  const X = x.map(toNum), Y = y.map(toNum), Z = z.map(toNum);
  // Bias-corrected (U-centered) distance correlation and the Székely–Rizzo
  // partial distance correlation: R*(x,y;z) = (R*xy − R*xz·R*yz)/√((1−R*xz²)(1−R*yz²)).
  const uCentered = v => {
    const A = v.map(vi => v.map(vj => Math.abs(vi - vj)));
    const rowSum = A.map(r => r.reduce((s, a) => s + a, 0));
    const grand = rowSum.reduce((s, a) => s + a, 0);
    const U = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === j) continue;
      U[i][j] = A[i][j] - rowSum[i] / (n - 2) - rowSum[j] / (n - 2) + grand / ((n - 1) * (n - 2));
    }
    return U;
  };
  const inner = (A, B) => { let s = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) s += A[i][j] * B[i][j]; return s / (n * (n - 3)); };
  const Ax = uCentered(X), Ay = uCentered(Y), Az = uCentered(Z);
  const Rstar = (A, B) => { const d = Math.sqrt(Math.max(inner(A, A), 0) * Math.max(inner(B, B), 0)); return d > 1e-12 ? inner(A, B) / d : 0; };
  const Rxy = Rstar(Ax, Ay), Rxz = Rstar(Ax, Az), Ryz = Rstar(Ay, Az);
  const denom = Math.sqrt(Math.max(1 - Rxz * Rxz, 0) * Math.max(1 - Ryz * Ryz, 0));
  const pd = denom > 1e-9 ? (Rxy - Rxz * Ryz) / denom : 0;
  return { test: 'Partial Distance Correlation', pdCorr: +pd.toFixed(4), n, apa: `pdCorr = ${pd.toFixed(3)}` };
}

// ── Mahalanobis Distance ──────────────────────────────────────────
/** @param {number[]} x @param {number[]} y @param {number[][]} cov */
export function mahalanobisDistance(x, y, cov) {
  if (!x || !y || x.length < 2 || x.length !== y.length) return null;
  const p = x.length;
  const diff = x.map((v, i) => v - (y[i] || 0));
  const covInv = cov ? matInv(cov) : Array.from({length: p}, (_, i) => Array.from({length: p}, (_, j) => i === j ? 1 : 0));
  if (!covInv) return null;
  let d2 = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) d2 += diff[i] * covInv[i][j] * diff[j];
  return { test: 'Mahalanobis Distance', distance: +Math.sqrt(Math.max(0, d2)).toFixed(4), p, apa: `Mahalanobis: ${Math.sqrt(Math.max(0, d2)).toFixed(3)}` };
}

// ── Gower Distance ────────────────────────────────────────────────
/** @param {number[]} x @param {number[]} y */
export function gowerDistance(x, y) {
  if (!x || !y || x.length < 2 || x.length !== y.length) return null;
  const p = x.length;
  let sum = 0, count = 0;
  for (let j = 0; j < p; j++) {
    if (x[j] == null || y[j] == null) continue;
    if (typeof x[j] === 'number' && typeof y[j] === 'number') {
      const range = 1;
      sum += range > 0 ? Math.abs(x[j] - y[j]) / Math.max(range, 1) : 0;
    } else {
      sum += x[j] === y[j] ? 0 : 1;
    }
    count++;
  }
  const dist = count > 0 ? sum / count : 1;
  return { test: 'Gower Distance', distance: +dist.toFixed(4), p, apa: `Gower: ${dist.toFixed(3)}` };
}
