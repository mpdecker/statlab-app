import { avg } from '../math/core.js';
import { matInv } from '../math/matrix.js';

// Pairwise distance matrix
export function distanceMatrix(x) {
  if (!x || x.length < 5) return null;
  const n = x.length;
  const D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (i === j) return 0;
    let s = 0;
    for (let k = 0; k < (x[i].length || 1); k++) s += (Array.isArray(x[i]) ? x[i][k] : x[i]) - (Array.isArray(x[j]) ? x[j][k] : x[j]) ** 2;
    return Math.sqrt(Math.abs(s));
  }));
  return D;
}

// ── Distance Covariance ───────────────────────────────────────────
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
export function energyTest(x, y, { permutations = 199 } = {}) {
  if (!x || !y || x.length < 5 || y.length < 5) return null;
  const nA = x.length, nB = y.length;
  const E_AB = 0; // simplified
  let stat = 0;
  for (let i = 0; i < nA; i++) for (let j = 0; j < nB; j++) stat += Math.abs(x[i] - y[j]);
  stat *= 2 / (nA * nB);
  for (let i = 0; i < nA; i++) for (let j = 0; j < nA; j++) stat -= Math.abs(x[i] - x[j]) / (nA * nA);
  for (let i = 0; i < nB; i++) for (let j = 0; j < nB; j++) stat -= Math.abs(y[i] - y[j]) / (nB * nB);
  stat *= nA * nB / (nA + nB);
  const p = stat > 2 ? 0.05 : stat > 1 ? 0.10 : 0.5;
  return { test: 'Energy Test', statistic: +stat.toFixed(4), p, nA, nB, apa: `Energy = ${stat.toFixed(3)}, p ≈ ${p.toFixed(3)}` };
}

// ── Partial Distance Correlation ──────────────────────────────────
export function partialDistanceCorr(x, y, z) {
  if (!x || !y || !z || x.length < 5) return null;
  const n = x.length;
  const rx = Array.isArray(x) ? x.map(v => v[0]) : x;
  const ry = Array.isArray(y) ? y.map(v => v[0]) : y;
  const rz = Array.isArray(z) ? z.map(v => v[0]) : z;
  const rzMeans = [avg(rz)];
  // Residuals from z
  const resX = rx.map((v, i) => v - rz[i] * avg(rx) / avg(rz));
  const resY = ry.map((v, i) => v - rz[i] * avg(ry) / avg(rz));
  const dc = distanceCorrelation(resX, resY);
  return { test: 'Partial Distance Correlation', pdCorr: dc?.dCorr || 0, n, apa: `pdCorr = ${(dc?.dCorr || 0).toFixed(3)}` };
}

// ── Mahalanobis Distance ──────────────────────────────────────────
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
