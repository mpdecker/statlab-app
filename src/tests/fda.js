import { avg } from '../math/core.js';
import { jacobiEigen } from '../math/matrix.js';

// FPCA via B-spline expansion
export function fpca(data, timePoints, { nBasis = 5 } = {}) {
  if (!data || !timePoints || data.length < 5 || !data[0] || data[0].length !== timePoints.length) return null;
  const n = data.length, m = timePoints.length;
  const basis = Array.from({ length: nBasis }, (_, b) => timePoints.map(t => Math.exp(-b * 0.5 * (t - avg(timePoints)) ** 2)));
  const scores = data.map(row => {
    const coef = [];
    for (let b = 0; b < nBasis; b++) {
      let s = 0;
      for (let j = 0; j < m; j++) s += row[j] * basis[b][j];
      coef.push(s / m);
    }
    return coef;
  });
  const cov = Array.from({ length: nBasis }, (_, i) => Array.from({ length: nBasis }, (_, j) => {
    const mi = avg(scores.map(s => s[i]));
    const mj = avg(scores.map(s => s[j]));
    return scores.reduce((s, sc) => s + (sc[i] - mi) * (sc[j] - mj), 0) / n;
  }));
  const eigs = jacobiEigen(cov);
  const fpcScores = scores.map(sc => eigs.eigenvalues.slice(0, 2).map((v, k) => +(sc[k] * Math.sqrt(Math.max(v, 0))).toFixed(4)));
  return { test: 'FPCA', fpcScores: fpcScores.slice(0, 5), eigenvalues: eigs.eigenvalues.slice(0, 2).map(v => +v.toFixed(4)), n, nBasis, apa: `FPCA: ${nBasis} basis functions, n = ${n}` };
}

// Functional Mean
export function functionalMean(data) {
  if (!data || !data.length || !data[0]) return null;
  const n = data.length, m = data[0].length;
  const mean = Array(m).fill(0).map((_, j) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += data[i][j];
    return +(s / n).toFixed(4);
  });
  return { test: 'Functional Mean', mean, n, nPoints: m, apa: `Functional mean: ${m} points, n = ${n}` };
}

// Functional Covariance
export function functionalCovariance(data) {
  if (!data || data.length < 3 || !data[0]) return null;
  const n = data.length, m = data[0].length;
  const mean = functionalMean(data)?.mean || [];
  const cov = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += (data[k][i] - mean[i]) * (data[k][j] - mean[j]);
    return +(s / (n - 1)).toFixed(4);
  }));
  return { test: 'Functional Covariance', cov: cov.slice(0, 5).map(r => r.slice(0, 5)), n, nPoints: m, apa: `Functional cov: ${m}×${m}` };
}

// Scalar-on-Function Regression
export function scalarOnFunction(data, y, timePoints) {
  if (!data || !y || data.length < 5 || data.length !== y.length) return null;
  const n = data.length, m = data[0]?.length || 0;
  const rowSums = data.map(row => row.reduce((s, v) => s + v, 0));
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += rowSums[i]; sy += y[i]; sxx += rowSums[i] * rowSums[i]; sxy += rowSums[i] * y[i]; }
  const denom = n * sxx - sx * sx;
  if (!denom) return null;
  const b1 = (n * sxy - sx * sy) / denom;
  const b0 = (sxx * sy - sx * sxy) / denom;
  const fitted = rowSums.map(xi => b0 + b1 * xi);
  let ssr = 0, sst = 0;
  const my = avg(y);
  for (let i = 0; i < n; i++) { ssr += (y[i] - fitted[i]) ** 2; sst += (y[i] - my) ** 2; }
  const r2 = sst > 0 ? 1 - ssr / sst : 0;
  return { test: 'Scalar-on-Function', intercept: +b0.toFixed(4), slope: +b1.toFixed(4), rSquared: +r2.toFixed(4), n, apa: `SoF reg: R² = ${r2.toFixed(3)}` };
}

// Functional Clustering
export function functionalClustering(data, nClusters = 2) {
  if (!data || data.length < 5 || !data[0]) return null;
  const n = data.length;
  const rowSums = data.map(row => row.reduce((s, v) => s + v, 0));
  const sorted = [...rowSums].sort((a, b) => a - b);
  const thresholds = Array.from({ length: nClusters - 1 }, (_, i) => sorted[Math.floor((i + 1) * n / nClusters)]);
  const labels = rowSums.map(v => {
    let cluster = 0;
    for (let i = 0; i < thresholds.length; i++) { if (v > thresholds[i]) cluster = i + 1; }
    return cluster;
  });
  return { test: 'Functional Clustering', labels, nClusters, n, apa: `FClust: ${nClusters} clusters, n = ${n}` };
}
