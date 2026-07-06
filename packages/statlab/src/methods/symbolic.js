import { avg } from '../math/core.js';
import { solveNormalEquations, jacobiEigen } from '../math/matrix.js';

// ── Interval Mean ─────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} loVar @param {string} hiVar */
export function intervalMean(data, loVar, hiVar) {
  if (!data || data.length < 3 || !loVar || !hiVar) return null;
  const n = data.length;
  const loMean = data.reduce((s, r) => s + (+r[loVar]), 0) / n;
  const hiMean = data.reduce((s, r) => s + (+r[hiVar]), 0) / n;
  return { test: 'Interval Mean', lo: +loMean.toFixed(4), hi: +hiMean.toFixed(4), n, apa: `Interval mean: [${loMean.toFixed(2)}, ${hiMean.toFixed(2)}]` };
}

// ── Interval Variance ─────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} loVar @param {string} hiVar */
export function intervalVariance(data, loVar, hiVar) {
  if (!data || data.length < 3 || !loVar || !hiVar) return null;
  const n = data.length;
  const loV = data.reduce((s, r) => s + (+r[loVar] - avg(data.map(d => +d[loVar]))) ** 2, 0) / (n - 1);
  const hiV = data.reduce((s, r) => s + (+r[hiVar] - avg(data.map(d => +d[hiVar]))) ** 2, 0) / (n - 1);
  const loVarVal = Math.min(loV, hiV); const hiVarVal = Math.max(loV, hiV);
  return { test: 'Interval Variance', lo: +loVarVal.toFixed(4), hi: +hiVarVal.toFixed(4), n, apa: `Interval var: [${loVarVal.toFixed(2)}, ${hiVarVal.toFixed(2)}]` };
}

// ── Interval Correlation ──────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} loVar1 @param {string} hiVar1 @param {string} loVar2 @param {string} hiVar2 */
export function intervalCorrelation(data, loVar1, hiVar1, loVar2, hiVar2) {
  if (!data || data.length < 5 || !loVar1 || !loVar2) return null;
  const n = data.length;
  const m1 = data.map(r => (+r[loVar1] + +r[hiVar1]) / 2);
  const m2 = data.map(r => (+r[loVar2] + +r[hiVar2]) / 2);
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += m1[i]; sy += m2[i]; sxx += m1[i] * m1[i]; syy += m2[i] * m2[i]; sxy += m1[i] * m2[i]; }
  const r = (n * sxy - sx * sy) / Math.sqrt(Math.max((n * sxx - sx * sx) * (n * syy - sy * sy), 1));
  return { test: 'Interval Correlation', r: +r.toFixed(4), n, apa: `Interval corr = ${r.toFixed(3)}` };
}

// ── Interval PCA ──────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string[]} loVars @param {string[]} hiVars */
export function intervalPCA(data, loVars, hiVars) {
  if (!data || data.length < 5 || !loVars || !loVars.length) return null;
  const n = data.length; const p = loVars.length;
  const centers = data.map(r => loVars.map((v, j) => (+r[v] + +r[hiVars[j]]) / 2));
  const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    const mi = avg(centers.map(r => r[i])); const mj = avg(centers.map(r => r[j]));
    return centers.reduce((s, r) => s + (r[i] - mi) * (r[j] - mj), 0) / (n - 1);
  }));
  // Eigen-decompose the center covariance (Centers method for interval PCA).
  const { eigenvalues, eigenvectors } = jacobiEigen(S);
  const total = eigenvalues.reduce((s, v) => s + Math.max(v, 0), 0) || 1;
  const propVar = eigenvalues.map(e => +(Math.max(e, 0) / total).toFixed(4));
  return {
    test: 'Interval PCA', covDim: `${p}×${p}`,
    eigenvalues: eigenvalues.map(v => +v.toFixed(6)), propVar,
    loadings: eigenvectors.map(vec => vec.map(v => +v.toFixed(4))), n, apa: `Interval PCA: ${p} vars`,
  };
}

// ── Histogram Distance (Wasserstein) ──────────────────────────────
/** @param {number[]} hist1 @param {number[]} hist2 */
export function histogramDistance(hist1, hist2) {
  if (!hist1 || !hist2 || hist1.length < 2 || hist1.length !== hist2.length) return null;
  const n = hist1.length;
  let dist = 0;
  for (let i = 0; i < n; i++) {
    let c1 = hist1.slice(0, i + 1).reduce((s, v) => s + v, 0);
    let c2 = hist2.slice(0, i + 1).reduce((s, v) => s + v, 0);
    dist += Math.abs(c1 - c2);
  }
  return { test: 'Histogram Distance', wasserstein: +dist.toFixed(4), nBins: n, apa: `Wasserstein = ${dist.toFixed(4)}` };
}

// ── Histogram PCA ─────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string[]} histCols */
export function histogramPCA(data, histCols) {
  if (!data || data.length < 5 || !histCols || histCols.length < 2) return null;
  const n = data.length, p = histCols.length;
  const X = data.map(r => histCols.map(h => {
    const hist = r[h];
    if (Array.isArray(hist)) return avg(hist);
    if (typeof hist === 'object' && hist.mean) return hist.mean;
    return +hist;
  }));
  const means = X[0].map((_, j) => avg(X.map(r => r[j])));
  const cov = Array.from({length: p}, (_, i) => Array.from({length: p}, (_, j) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += (X[k][i] - means[i]) * (X[k][j] - means[j]);
    return s / (n - 1);
  }));
  const { eigenvalues } = jacobiEigen(cov); // real eigen-decomposition of the histogram-mean covariance
  const evals = eigenvalues.map(e => +e.toFixed(4));
  const total = eigenvalues.reduce((s, v) => s + Math.max(v, 0), 0) || 1;
  const propVar = eigenvalues.map(e => +(Math.max(e, 0) / total).toFixed(4));
  return { test: 'Histogram PCA', eigenvalues: evals, propVar, n, p, apa: `HistPCA: ${p} vars, n=${n}` };
}

// ── Symbolic Regression (on interval data) ────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars */
export function symbolicRegression(data, yVar, xVars) {
  if (!data || data.length < 5 || !yVar || !xVars || xVars.length < 1) return null;
  const n = data.length;
  const y = data.map(r => {
    const v = r[yVar];
    if (Array.isArray(v)) return avg(v);
    if (typeof v === 'object' && v.mean) return v.mean;
    return +v;
  });
  const X = data.map(r => xVars.map(x => {
    const v = r[x];
    if (Array.isArray(v)) return avg(v);
    if (typeof v === 'object' && v.mean) return v.mean;
    return +v;
  }));
  const Xaug = X.map(row => [1, ...row]);
  const Xt = Xaug[0].map((_, j) => Xaug.map(r => r[j]));
  const XtX = Xt.map(r1 => Xaug[0].map((_, j) => r1.reduce((s, _, k) => s + Xaug[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  const beta = solveNormalEquations(XtX, XtY);
  const coeffs = xVars.map((name, j) => ({ name, b: +beta[1 + j].toFixed(5) }));
  return { test: 'Symbolic Regression', coefficients: coeffs, interc: +beta[0].toFixed(5), n, p: xVars.length, apa: `SymReg: ${xVars.length} vars, n=${n}` };
}
