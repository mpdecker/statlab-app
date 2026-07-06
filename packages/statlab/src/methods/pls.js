import { avg, corr } from '../math/core.js';
import { jacobiEigen, matInv } from '../math/matrix.js';

// ── PLS1 ──────────────────────────────────────────────────────────
/** @param {number[][]} X @param {number[]} y @param {number} [nComponents] */
export function pls1(X, y, nComponents = 2) {
  if (!X || !y || X.length < 10 || X.length !== y.length || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const comps = Math.min(nComponents, p, n - 1);
  const T = Array.from({ length: n }, () => Array(comps).fill(0));
  const P = Array.from({ length: p }, () => Array(comps).fill(0));
  const weights = [];      // normalised weight vector per component (for VIP)
  const ssExplained = [];  // y-SS explained per component  = b²·(tᵀt)
  const ybar = avg(y);
  const xMean = X[0].map((_, j) => avg(X.map(r => r[j])));
  let Xres = X.map(r => r.map((v, j) => v - xMean[j]));
  let yres = y.map(v => v - ybar);
  let fitted = Array(n).fill(ybar);
  for (let h = 0; h < comps; h++) {
    const wh = Xres[0].map((_, j) => yres.reduce((s, yi, i) => s + yi * Xres[i][j], 0));
    const nw = Math.sqrt(wh.reduce((s, v) => s + v * v, 0)) || 1;
    const w = wh.map(v => v / nw);
    weights.push(w);
    const t = Xres.map(row => row.reduce((s, v, j) => s + v * w[j], 0));
    for (let i = 0; i < n; i++) T[i][h] = t[i];
    const tt = Math.max(t.reduce((s, v) => s + v * v, 0), 1e-12);
    const pj = Xres[0].map((_, j) => t.reduce((s, ti, i) => s + ti * Xres[i][j], 0) / tt);
    for (let j = 0; j < p; j++) P[j][h] = pj[j];
    for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) Xres[i][j] -= t[i] * pj[j];
    const b = t.reduce((s, ti, i) => s + ti * yres[i], 0) / tt;
    ssExplained.push(b * b * tt);
    for (let i = 0; i < n; i++) { yres[i] -= t[i] * b; fitted[i] += t[i] * b; }
  }
  const r2y = 1 - yres.reduce((s, v) => s + v * v, 0) / Math.max(y.reduce((s, v) => s + (v - ybar) ** 2, 0), 1);
  return { test: 'PLS1', nComponents: comps, rSquared: +r2y.toFixed(4), weights, ssExplained, fitted: fitted.map(v => +v.toFixed(4)), n, p, apa: `PLS1: ${comps} comps, R² = ${r2y.toFixed(3)}` };
}

// ── PLS2 ──────────────────────────────────────────────────────────
/** @param {number[][]} X @param {number[][]} Y @param {number} [nComponents] */
export function pls2(X, Y, nComponents = 2) {
  if (!X || !Y || X.length < 10 || X.length !== Y.length || !X[0] || !Y[0]) return null;
  const n = X.length, p = X[0].length, m = Y[0].length;
  const comps = Math.min(nComponents, p, n - 1);
  const xMean = X[0].map((_, j) => avg(X.map(r => r[j])));
  const yMean = Y[0].map((_, j) => avg(Y.map(r => r[j])));
  let Xres = X.map(r => r.map((v, j) => v - xMean[j]));
  let Yres = Y.map(r => r.map((v, j) => v - yMean[j]));
  let Yhat = Array.from({ length: n }, () => [...yMean]);
  for (let h = 0; h < comps; h++) {
    // NIPALS inner loop: iterate w,t,c,u to convergence on the leading direction.
    let u = Yres.map(r => r[0]);
    let t = Array(n).fill(0), c = Array(m).fill(0), w = Array(p).fill(0);
    for (let iter = 0; iter < 50; iter++) {
      w = Xres[0].map((_, j) => Xres.reduce((s, r, i) => s + r[j] * u[i], 0));
      const nw = Math.sqrt(w.reduce((s, v) => s + v * v, 0)) || 1; w = w.map(v => v / nw);
      t = Xres.map(r => r.reduce((s, v, j) => s + v * w[j], 0));
      const tt = Math.max(t.reduce((s, v) => s + v * v, 0), 1e-12);
      c = Yres[0].map((_, j) => Yres.reduce((s, r, i) => s + r[j] * t[i], 0) / tt);
      const cc = Math.max(c.reduce((s, v) => s + v * v, 0), 1e-12);
      const uNew = Yres.map(r => r.reduce((s, v, j) => s + v * c[j], 0) / cc);
      let diff = 0; for (let i = 0; i < n; i++) diff += (uNew[i] - u[i]) ** 2;
      u = uNew;
      if (diff < 1e-10) break;
    }
    const tt = Math.max(t.reduce((s, v) => s + v * v, 0), 1e-12);
    const pj = Xres[0].map((_, j) => Xres.reduce((s, r, i) => s + r[j] * t[i], 0) / tt);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) Xres[i][j] -= t[i] * pj[j];
      for (let j = 0; j < m; j++) { Yres[i][j] -= t[i] * c[j]; Yhat[i][j] += t[i] * c[j]; }
    }
  }
  // Overall R² across all Y columns.
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { ssRes += (Y[i][j] - Yhat[i][j]) ** 2; ssTot += (Y[i][j] - yMean[j]) ** 2; }
  const rSquared = +(1 - ssRes / Math.max(ssTot, 1e-12)).toFixed(4);
  return { test: 'PLS2', nComponents: comps, rSquared, fitted: Yhat.map(r => r.map(v => +v.toFixed(4))), n, p, m, apa: `PLS2: ${comps} comps, R²=${rSquared}, n = ${n}` };
}

// ── VIP Scores ────────────────────────────────────────────────────
/** @param {object} plsModel */
export function vipScores(plsModel) {
  if (!plsModel || !Array.isArray(plsModel.weights) || !plsModel.weights.length || !Array.isArray(plsModel.ssExplained)) return null;
  const { weights, ssExplained } = plsModel;
  const p = weights[0].length, H = weights.length;
  const totalSS = ssExplained.reduce((s, v) => s + v, 0) || 1e-12;
  // VIPⱼ = √( p · Σ_h (w_hj/‖w_h‖)²·SSY_h / Σ_h SSY_h ).  By construction Σⱼ VIPⱼ² = p.
  const scores = Array.from({ length: p }, (_, j) => {
    let acc = 0;
    for (let h = 0; h < H; h++) {
      const wn = weights[h].reduce((s, v) => s + v * v, 0) || 1e-12;
      acc += (weights[h][j] ** 2 / wn) * ssExplained[h];
    }
    return { variable: j + 1, vip: +Math.sqrt(p * acc / totalSS).toFixed(4) };
  });
  return { test: 'VIP Scores', scores, nComponents: H, apa: `VIP: ${p} variables` };
}

// ── RDA ───────────────────────────────────────────────────────────
/** @param {number[][]} X @param {number[][]} Y */
export function rda(Y, X, { permutations = 199, seed = 42 } = {}) {
  if (!Y || !X || Y.length < 10 || X.length < 10) return null;
  const n = Math.min(Y.length, X.length);
  const yMeans = Y[0].map((_, j) => avg(Y.map(r => r[j])));
  const yCent = Y.map(r => r.map((v, j) => v - yMeans[j]));
  let ssY = 0;
  for (const r of yCent) for (const v of r) ssY += v * v;
  const k = X[0].length, dy = yCent[0].length;
  // Centre X and precompute (XᵀX)⁻¹ once (the constraint design is fixed).
  const xMeans = X[0].map((_, j) => avg(X.map(r => r[j])));
  const Xc = X.map(r => r.map((v, j) => v - xMeans[j]));
  const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => Xc.reduce((s, r) => s + r[i] * r[j], 0)));
  const XtXi = matInv(XtX);
  // Constrained (fitted) SS for a pairing: trace(Ŷᵀ Ŷ) with Ŷ = Xc·(XᵀX)⁻¹·Xᵀ·Yperm.
  const ssFitFor = order => {
    if (!XtXi) return 0;
    const Yp = order.map(o => yCent[o]);
    const XtY = Array.from({ length: k }, (_, i) => Array.from({ length: dy }, (_, j) => Xc.reduce((s, r, t) => s + r[i] * Yp[t][j], 0)));
    const B = XtXi.map(row => Array.from({ length: dy }, (_, j) => row.reduce((s, v, t) => s + v * XtY[t][j], 0))); // k×dy
    let ssFit = 0;
    for (let t = 0; t < n; t++) for (let j = 0; j < dy; j++) { let yh = 0; for (let i = 0; i < k; i++) yh += Xc[t][i] * B[i][j]; ssFit += yh * yh; }
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
/** @param {number[]} D @param {number[][]} X */
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
/** @param {number[][]} X @param {number[]} y */
export function sPLSRegression(X, y, { nComp = 2, lambda = 0.5, maxIter = 20 } = {}) {
  if (!X || !y || X.length < 5 || y.length < 5 || nComp < 1) return null;
  const n = X.length, p = X[0].length;
  const ybar = avg(y);
  const weights = Array.from({ length: nComp }, () => Array(p).fill(0));
  let Xres = X.map(r => [...r]);
  let yres = y.map(v => v - ybar);
  let fitted = Array(n).fill(ybar);
  const sstot = Math.max(y.reduce((s, v) => s + (v - ybar) ** 2, 0), 1e-12);
  for (let c = 0; c < nComp; c++) {
    // Soft-thresholded weight w = S(Xᵀy, λ), normalised (sparse direction).
    const xy = Xres[0].map((_, j) => { let s = 0; for (let i = 0; i < n; i++) s += Xres[i][j] * yres[i]; return s; });
    const wSoft = xy.map(v => { const m = Math.abs(v) - lambda; return m > 0 ? Math.sign(v) * m : 0; });
    const wNorm = Math.sqrt(wSoft.reduce((s, v) => s + v * v, 0)) || 1;
    const w = wSoft.map(v => v / wNorm);
    weights[c] = w.map(v => +v.toFixed(4));
    const t = Xres.map(row => w.reduce((s, wj, j) => s + wj * row[j], 0));
    const tt = Math.max(t.reduce((s, ti) => s + ti * ti, 0), 1e-12);
    // X-loading p = Xresᵀt/(tᵀt); proper NIPALS deflation Xres -= t·pᵀ (the old
    // `pt*(Xres/pt)` cancelled to Xres, zeroing X after the first component).
    const pj = Xres[0].map((_, j) => { let s = 0; for (let i = 0; i < n; i++) s += t[i] * Xres[i][j]; return s / tt; });
    const q = t.reduce((s, ti, i) => s + ti * yres[i], 0) / tt;
    for (let i = 0; i < n; i++) { for (let j = 0; j < p; j++) Xres[i][j] -= t[i] * pj[j]; yres[i] -= q * t[i]; fitted[i] += q * t[i]; }
  }
  const rSquared = +(1 - yres.reduce((s, v) => s + v * v, 0) / sstot).toFixed(4);
  return { test: 'Sparse PLS', weights: weights.slice(0, 2), rSquared, fitted: fitted.map(v => +v.toFixed(4)), nComp, lambda, n, p, apa: `sPLS: ${nComp} comps, lambda=${lambda}, R²=${rSquared}` };
}

// ── Sparse PLS (simpler variant) ──────────────────────────────────
/** @param {number[][]} X @param {number[]} y */
export function sparsePLS(X, y, { nComp = 2, keepX = null } = {}) {
  if (!X || !y || X.length < 5 || nComp < 1) return null;
  const p = X[0].length;
  const keep = keepX || Math.ceil(p / 2);
  const corrs = X[0].map((_, j) => {
    const xj = X.map(r => r[j]);
    return { idx: j, corr: Math.abs(corr(xj, y)) };
  }).sort((a, b) => b.corr - a.corr);
  const selected = new Set(corrs.slice(0, keep).map(c => c.idx));
  // Real loadings on the selected variables: the (sign-bearing) correlation of
  // each kept predictor with y, normalised to unit length; unselected → 0.
  const raw = X[0].map((_, j) => (selected.has(j) ? corr(X.map(r => r[j]), y) : 0));
  const norm = Math.sqrt(raw.reduce((s, v) => s + v * v, 0)) || 1;
  const loadings = raw.map(v => +(v / norm).toFixed(4));
  return { test: 'Sparse PLS', loadings, keepX: keep, nComp, n: X.length, p, apa: `Sparse PLS: ${keep}/${p} vars selected` };
}
