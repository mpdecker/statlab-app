import { avg } from '../math/core.js';
import { jacobiEigen, solveNormalEquations } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── FPCA via B-spline expansion ───────────────────────────────────
/** @param {number[][]} data @param {number[]} timePoints */
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
  // FPC scores = projection of each centred coefficient vector onto the leading
  // eigenfunctions: ξ_ik = Σ_b (c_ib − c̄_b)·v_k[b]  (var(ξ_·k) = λ_k).
  const meanCoef = scores[0].map((_, b) => avg(scores.map(s => s[b])));
  const nc = Math.min(2, nBasis);
  const fpcScores = scores.map(sc =>
    eigs.eigenvectors.slice(0, nc).map(vec => +sc.reduce((acc, cv, b) => acc + (cv - meanCoef[b]) * vec[b], 0).toFixed(4)));
  const evals = eigs.eigenvalues.slice(0, nc).map(v => +v.toFixed(4));
  const totalVar = eigs.eigenvalues.reduce((s, v) => s + Math.max(v, 0), 0) || 1;
  const propVar = evals.map(v => +(Math.max(v, 0) / totalVar).toFixed(4));
  return { test: 'FPCA', fpcScores, eigenvalues: evals, propVar, n, nBasis, apa: `FPCA: ${nBasis} basis functions, n = ${n}` };
}

// ── Functional Mean ───────────────────────────────────────────────
/** @param {number[][]} data */
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

// ── Functional Covariance ─────────────────────────────────────────
/** @param {number[][]} data */
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

// ── Scalar-on-Function Regression ─────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {number[]} y @param {number[]} timePoints */
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

// ── Functional Clustering ─────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {number} [nClusters] */
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

// ── FPCA Expanded (with smoothed eigenfunctions) ──────────────────
/** @param {Array<Record<string, any>>} data @param {string[]} vars @param {string} timeVar @param {string} idVar */
export function fpcaExpanded(data, vars, timeVar, idVar, { seed = 42, nBasis = 10, nComponents = 3 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 2 || !timeVar) return null;
  const ids = [...new Set(data.map(r => r[idVar] || r[timeVar]))];
  const n = ids.length;
  const times = [...new Set(data.map(r => +r[timeVar]))].sort((a, b) => a - b);
  const T = times.length;
  if (n < 2 || T < 2) return null;
  // Reshape to a subject × time matrix using the first functional variable;
  // missing cells fall back to the subject's mean over its observed times.
  const fvar = vars[0];
  const Y = ids.map(id => {
    const rows = data.filter(r => (r[idVar] || r[timeVar]) === id);
    const subjMean = rows.length ? avg(rows.map(r => +r[fvar])) : 0;
    return times.map(t => { const row = rows.find(r => +r[timeVar] === t); return row ? +row[fvar] : subjMean; });
  });
  // Mean curve, then the time × time covariance surface; eigen-decompose.
  const meanCurve = times.map((_, t) => avg(Y.map(c => c[t])));
  const Yc = Y.map(c => c.map((v, t) => v - meanCurve[t]));
  const cov = Array.from({ length: T }, (_, i) => Array.from({ length: T }, (_, j) => Yc.reduce((s, c) => s + c[i] * c[j], 0) / (n - 1)));
  const eig = jacobiEigen(cov);
  const p = Math.min(nComponents, T);
  const pairs = eig.eigenvalues.map((e, idx) => ({ e, vec: eig.eigenvectors[idx] })).sort((a, b) => b.e - a.e);
  const eigenvalues = pairs.slice(0, p).map(pr => +pr.e.toFixed(4));
  const totalVar = eig.eigenvalues.reduce((s, v) => s + Math.max(v, 0), 0) || 1;
  const propVar = pairs.slice(0, p).map(pr => +(Math.max(pr.e, 0) / totalVar).toFixed(4));
  // FPC scores = projection of each centred curve onto the eigenfunctions.
  const scores = Yc.map(c => pairs.slice(0, p).map(pr => +c.reduce((s, cv, t) => s + cv * pr.vec[t], 0).toFixed(4)));
  return { test: 'FPCA Expanded', eigenvalues, propVar, scores, nBasis, nSubjects: n, nTimePoints: T, apa: `FPCA: ${p} components, ${n} subjects` };
}

// ── Functional Regression ─────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string} xVar @param {string} timeVar @param {string} idVar */
export function functionalRegression(data, yVar, xVar, timeVar, idVar, { ridge = 1e-6 } = {}) {
  if (!data || data.length < 10 || !yVar || !xVar || !timeVar) return null;
  const ids = [...new Set(data.map(r => r[idVar] || r[timeVar]))];
  const times = [...new Set(data.map(r => +r[timeVar]))].sort((a, b) => a - b);
  const n = ids.length, T = times.length;
  // Build the functional predictor matrix x_i(t) and scalar response y_i.
  const y = ids.map(id => { const rows = data.filter(r => (r[idVar] || r[timeVar]) === id); return rows.length ? avg(rows.map(r => +r[yVar])) : 0; });
  const Xfun = ids.map(id => times.map(t => {
    const row = data.find(r => (r[idVar] || r[timeVar]) === id && +r[timeVar] === t);
    return row ? +row[xVar] : 0;
  }));
  // Functional linear model y_i = α + Σ_t β(t) x_i(t): OLS on [1, x_i(·)] (ridge-stabilised).
  const Z = Xfun.map(row => [1, ...row]);
  const kz = T + 1;
  const ZtZ = Array.from({ length: kz }, (_, a) => Array.from({ length: kz }, (_, b) => Z.reduce((s, r) => s + r[a] * r[b], 0)));
  for (let i = 1; i < kz; i++) ZtZ[i][i] += ridge;
  const ZtY = Array.from({ length: kz }, (_, a) => Z.reduce((s, r, i) => s + r[a] * y[i], 0));
  const coef = solveNormalEquations(ZtZ, ZtY);
  const betaCurve = coef.slice(1).map(v => +v.toFixed(4));
  const beta = +betaCurve.reduce((s, v) => s + v, 0).toFixed(4); // integrated effect ∫β(t)dt (unit spacing)
  return { test: 'Functional Regression', beta, betaCurve, intercept: +coef[0].toFixed(4), nSubjects: n, nTimePoints: T, apa: `FuncReg: ∫β = ${beta.toFixed(3)}, n=${n}` };
}
