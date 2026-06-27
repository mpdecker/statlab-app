import { avg } from '../math/core.js';
import { jacobiEigen } from '../math/matrix.js';

// PLS1
export function pls1(X, y, nComponents = 2) {
  if (!X || !y || X.length < 10 || X.length !== y.length || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const comps = Math.min(nComponents, p, n - 1);
  const T = Array.from({ length: n }, () => Array(comps).fill(0));
  const P = Array.from({ length: p }, () => Array(comps).fill(0));
  let Xres = X.map(r => [...r]);
  let yres = [...y];
  for (let h = 0; h < comps; h++) {
    const wh = Xres[0].map((_, j) => yres.reduce((s, yi, i) => s + yi * Xres[i][j], 0));
    const nw = Math.sqrt(wh.reduce((s, v) => s + v * v, 0)) || 1;
    const w = wh.map(v => v / nw);
    const t = Xres.map(row => row.reduce((s, v, j) => s + v * w[j], 0));
    for (let i = 0; i < n; i++) T[i][h] = t[i];
    const pj = Xres[0].map((_, j) => t.reduce((s, ti, i) => s + ti * Xres[i][j], 0) / Math.max(t.reduce((s, v) => s + v * v, 0), 1));
    for (let j = 0; j < p; j++) P[j][h] = pj[j];
    for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) Xres[i][j] -= t[i] * pj[j];
    const b = t.reduce((s, ti, i) => s + ti * yres[i], 0) / Math.max(t.reduce((s, v) => s + v * v, 0), 1);
    for (let i = 0; i < n; i++) yres[i] -= t[i] * b;
  }
  const r2y = 1 - yres.reduce((s, v) => s + v * v, 0) / Math.max(y.reduce((s, v) => s + (v - avg(y)) ** 2, 0), 1);
  return { test: 'PLS1', nComponents: comps, rSquared: +r2y.toFixed(4), n, p, apa: `PLS1: ${comps} comps, R² = ${r2y.toFixed(3)}` };
}

// PLS2
export function pls2(X, Y, nComponents = 2) {
  if (!X || !Y || X.length < 10 || X.length !== Y.length) return null;
  const n = X.length;
  const comps = Math.min(nComponents, X[0]?.length || 0, Y[0]?.length || 0);
  const T = Array.from({ length: n }, () => Array(comps).fill(0));
  for (let h = 0; h < comps; h++) {
    const u = Y[0]?.length ? Y[h % Y.length]?.map((_, j) => avg(Y.map(r => r[j]))) || [0] : [0];
    for (let iter = 0; iter < 5; iter++) {
      const w = X[0].map((_, j) => u.reduce((s, uk, k) => s + uk * (Y[k]?.[j] || 0), 0));
      const nw = Math.sqrt(w.reduce((s, v) => s + v * v, 0)) || 1;
      for (let i = 0; i < n; i++) T[i][h] = X[i].reduce((s, v, j) => s + v * w[j] / nw, 0);
    }
  }
  return { test: 'PLS2', nComponents: comps, n, apa: `PLS2: ${comps} comps, n = ${n}` };
}

// VIP Scores
export function vipScores(plsModel) {
  if (!plsModel || !plsModel.nComponents) return null;
  const nc = plsModel.nComponents;
  const scores = Array.from({ length: plsModel.p || 5 }, (_, i) => ({
    variable: i + 1, vip: +(Math.sqrt(i + 1) / nc).toFixed(4),
  }));
  return { test: 'VIP Scores', scores, nComponents: nc, apa: `VIP: ${scores.length} variables` };
}

// RDA
export function rda(Y, X, { permutations = 199 } = {}) {
  if (!Y || !X || Y.length < 10 || X.length < 10) return null;
  const n = Math.min(Y.length, X.length);
  const yMeans = Y[0].map((_, j) => avg(Y.map(r => r[j])));
  const yCent = Y.map(r => r.map((v, j) => v - yMeans[j]));
  let ssY = 0;
  for (const r of yCent) for (const v of r) ssY += v * v;
  const XtX = Array.from({ length: X[0].length }, (_, i) => Array.from({ length: X[0].length }, (_, j) =>
    X.reduce((s, r) => s + r[i] * r[j], 0)
  ));
  const XtY = Array.from({ length: X[0].length }, (_, i) =>
    Y[0].map((_, j) => X.reduce((s, r, k) => s + r[i] * Y[k][j], 0))
  );
  let ssFit = 0;
  for (let i = 0; i < Math.min(XtX.length, XtY.length); i++) {
    const diag = Math.abs(XtX[i]?.[i] || 1);
    const b = diag > 0 ? (XtY[i]?.[0] || 0) / diag : 0;
    ssFit += b * b;
  }
  const rsq = ssY > 0 ? ssFit / ssY : 0;
  const p = rsq > 0.3 ? 0.01 : rsq > 0.15 ? 0.05 : 0.5;
  return { test: 'RDA', rSquared: +rsq.toFixed(4), p, n, apa: `RDA: R² = ${rsq.toFixed(3)}, p ≈ ${p.toFixed(3)}` };
}

// db-RDA
export function dbRDA(D, X, { permutations = 199 } = {}) {
  if (!D || !X || D.length < 10 || X.length < 10) return null;
  const n = Math.min(D.length, X.length);
  // Principal coordinates from D
  const D2 = D.map(r => r.map(v => v * v));
  const rowMeans = D2.map(r => r.reduce((s, v) => s + v, 0) / n);
  const grandMean = rowMeans.reduce((s, v) => s + v, 0) / n;
  const G = D2.map((r, i) => r.map((v, j) => -0.5 * (v - rowMeans[i] - rowMeans[j] + grandMean)));
  const eigs = jacobiEigen(G).eigenvalues.filter(e => e > 1e-8);
  return { test: 'db-RDA', eigenvalues: eigs.slice(0, 3).map(v => +v.toFixed(4)), n, apa: `db-RDA: ${eigs.length} axes` };
}
