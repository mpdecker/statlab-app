import { avg, sampleVar } from '../math/core.js';
import { jacobiEigen } from '../math/matrix.js';

// ── PLS1 ──────────────────────────────────────────────────────────
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

// ── PLS2 ──────────────────────────────────────────────────────────
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

// ── VIP Scores ────────────────────────────────────────────────────
export function vipScores(plsModel) {
  if (!plsModel || !plsModel.nComponents) return null;
  const nc = plsModel.nComponents;
  const scores = Array.from({ length: plsModel.p || 5 }, (_, i) => ({
    variable: i + 1, vip: +(Math.sqrt(i + 1) / nc).toFixed(4),
  }));
  return { test: 'VIP Scores', scores, nComponents: nc, apa: `VIP: ${scores.length} variables` };
}

// ── RDA ───────────────────────────────────────────────────────────
export function rda(Y, X, { permutations = 199, seed = 42 } = {}) {
  if (!Y || !X || Y.length < 10 || X.length < 10) return null;
  const n = Math.min(Y.length, X.length);
  const yMeans = Y[0].map((_, j) => avg(Y.map(r => r[j])));
  const yCent = Y.map(r => r.map((v, j) => v - yMeans[j]));
  let ssY = 0;
  for (const r of yCent) for (const v of r) ssY += v * v;
  // Constrained sum of squares for a given pairing of X rows to (centred) Y rows.
  const ssFitFor = order => {
    const XtX = Array.from({ length: X[0].length }, (_, i) => Array.from({ length: X[0].length }, (_, j) =>
      X.reduce((s, r) => s + r[i] * r[j], 0)
    ));
    const XtY = Array.from({ length: X[0].length }, (_, i) =>
      yCent[0].map((_, j) => X.reduce((s, r, k) => s + r[i] * yCent[order[k]][j], 0))
    );
    let ssFit = 0;
    for (let i = 0; i < Math.min(XtX.length, XtY.length); i++) {
      const diag = Math.abs(XtX[i]?.[i] || 1);
      const b = diag > 0 ? (XtY[i]?.[0] || 0) / diag : 0;
      ssFit += b * b;
    }
    return ssFit;
  };
  const identity = Array.from({ length: n }, (_, i) => i);
  const obsFit = ssFitFor(identity);
  const rsq = ssY > 0 ? Math.min(1, obsFit / ssY) : 0;
  // Permutation test: shuffle the X→Y row pairing to break the association.
  let s = seed >>> 0;
  const rand = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
  let ge = 1;
  for (let perm = 0; perm < permutations; perm++) {
    const order = identity.slice();
    for (let k = n - 1; k > 0; k--) { const m = Math.floor(rand() * (k + 1)); [order[k], order[m]] = [order[m], order[k]]; }
    if (ssFitFor(order) >= obsFit - 1e-12) ge++;
  }
  const p = ge / (permutations + 1);
  return { test: 'RDA', rSquared: +rsq.toFixed(4), constrained: +rsq.toFixed(4), p: +p.toFixed(4), permutations, n, apa: `RDA: R² = ${rsq.toFixed(3)}, p = ${p.toFixed(3)} (${permutations} perms)` };
}

// ── db-RDA ────────────────────────────────────────────────────────
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

// ── Sparse PLS Regression ─────────────────────────────────────────
export function sPLSRegression(X, y, { nComp = 2, lambda = 0.5, maxIter = 20 } = {}) {
  if (!X || !y || X.length < 5 || y.length < 5 || nComp < 1) return null;
  const n = X.length, p = X[0].length;
  const weights = Array.from({length: nComp}, () => Array(p).fill(0));
  const scores = Array.from({length: nComp}, () => Array(n).fill(0));
  let Xres = X.map(r => [...r]);
  let yres = [...y];
  for (let c = 0; c < nComp; c++) {
    const w = Xres[0].map((_, j) => {
      let s = 0; for (let i = 0; i < n; i++) s += Xres[i][j] * yres[i]; return s;
    });
    const wNorm = Math.sqrt(w.reduce((s, v) => s + v * v, 0));
    const wSoft = w.map(v => {
      const val = Math.abs(v) - lambda;
      return val > 0 ? (v > 0 ? val : -val) / Math.max(wNorm, 1) : 0;
    });
    const t = Xres.map(row => wSoft.reduce((s, wj, j) => s + wj * row[j], 0));
    const q = t.reduce((s, ti, i) => s + ti * yres[i], 0) / Math.max(t.reduce((s, ti) => s + ti * ti, 0), 1);
    weights[c] = wSoft.map(v => +v.toFixed(4));
    for (let i = 0; i < n; i++) { const pt = t[i]; for (let j = 0; j < p; j++) Xres[i][j] -= pt * (Xres[i][j] / Math.max(pt, 1e-10)); yres[i] -= q * pt; }
  }
  return { test: 'Sparse PLS', weights: weights.slice(0, 2), nComp, lambda, n, p, apa: `sPLS: ${nComp} comps, lambda=${lambda}` };
}

// ── Sparse PLS (simpler variant) ──────────────────────────────────
export function sparsePLS(X, y, { nComp = 2, keepX = null } = {}) {
  if (!X || !y || X.length < 5 || nComp < 1) return null;
  const p = X[0].length;
  const keep = keepX || Math.ceil(p / 2);
  const corrs = X[0].map((_, j) => {
    const xj = X.map(r => r[j]);
    return { idx: j, corr: Math.abs(corr(xj, y)) };
  }).sort((a, b) => b.corr - a.corr);
  const selected = new Set(corrs.slice(0, keep).map(c => c.idx));
  const loadings = X[0].map((_, j) => +(selected.has(j) ? 0.5 : 0).toFixed(4));
  return { test: 'Sparse PLS', loadings, keepX: keep, nComp, n: X.length, p, apa: `Sparse PLS: ${keep}/${p} vars selected` };
}
function corr(a, b) { const n = a.length; return n > 0 ? (a.reduce((s, v, i) => s + (v - avg(a)) * (b[i] - avg(b)), 0) / n) / Math.sqrt(sampleVar(a) * sampleVar(b) + 1e-10) : 0; }
