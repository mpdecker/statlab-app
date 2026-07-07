import { avg } from '../math/core.js';
import { matInv, matMul, matTrans, solveNormalEquations, jacobiEigen } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

// Real CP-ALS for a dense 3-way tensor → factor matrices {A,B,C} (rank-R each).
// Alternating least squares: each factor solves a normal-equation system whose
// Gram matrix is the Hadamard product of the other two factors' Gram matrices.
// Uses several random restarts and keeps the lowest reconstruction error to
// avoid ALS local minima.
function cpALS(tensor, rank, maxIter, seed, restarts = 5) {
  const d1 = tensor.length, d2 = tensor[0].length, d3 = tensor[0][0].length;
  const gram = M => { const g = Array.from({ length: rank }, () => Array(rank).fill(0)); for (let a = 0; a < rank; a++) for (let b = 0; b < rank; b++) { let acc = 0; for (let r = 0; r < M.length; r++) acc += M[r][a] * M[r][b]; g[a][b] = acc; } return g; };
  const had = (P, Q) => P.map((row, a) => row.map((v, b) => v * Q[a][b]));
  const mode = (rows, inv, accum) => { if (!inv) return null; const M = Array.from({ length: rows }, () => Array(rank).fill(0)); accum(M); return M.map(row => inv.map(ir => ir.reduce((acc, v, f) => acc + v * row[f], 0))); };
  const reconErr = (A, B, C) => { let e = 0; for (let i = 0; i < d1; i++) for (let j = 0; j < d2; j++) for (let k = 0; k < d3; k++) { let rec = 0; for (let r = 0; r < rank; r++) rec += A[i][r] * B[j][r] * C[k][r]; e += (tensor[i][j][k] - rec) ** 2; } return e; };
  let best = null, bestErr = Infinity;
  for (let rs = 0; rs < restarts; rs++) {
    let s = (seed + rs * 0x9e3779b1) >>> 0;
    const rand = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
    const randMat = rows => Array.from({ length: rows }, () => Array.from({ length: rank }, () => rand() - 0.5));
    let A = randMat(d1), B = randMat(d2), C = randMat(d3);
    for (let iter = 0; iter < maxIter; iter++) {
      const nA = mode(d1, matInv(had(gram(B), gram(C))), M => { for (let i = 0; i < d1; i++) for (let j = 0; j < d2; j++) for (let k = 0; k < d3; k++) { const x = tensor[i][j][k]; for (let f = 0; f < rank; f++) M[i][f] += x * B[j][f] * C[k][f]; } });
      if (nA) A = nA;
      const nB = mode(d2, matInv(had(gram(A), gram(C))), M => { for (let i = 0; i < d1; i++) for (let j = 0; j < d2; j++) for (let k = 0; k < d3; k++) { const x = tensor[i][j][k]; for (let f = 0; f < rank; f++) M[j][f] += x * A[i][f] * C[k][f]; } });
      if (nB) B = nB;
      const nC = mode(d3, matInv(had(gram(A), gram(B))), M => { for (let i = 0; i < d1; i++) for (let j = 0; j < d2; j++) for (let k = 0; k < d3; k++) { const x = tensor[i][j][k]; for (let f = 0; f < rank; f++) M[k][f] += x * A[i][f] * B[j][f]; } });
      if (nC) C = nC;
    }
    const e = reconErr(A, B, C);
    if (e < bestErr) { bestErr = e; best = { A, B, C }; }
  }
  return best;
}

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// Mode-n unfold / matricization
function unfoldTensor(X, mode) {
  const dims = [X.length, X[0]?.length || 1, X[0]?.[0]?.length || 1];
  const nRows = dims[mode];
  const nCols = dims.reduce((p, d, i) => i !== mode ? p * d : p, 1);
  const result = Array.from({ length: nRows }, () => Array(nCols).fill(0));
  for (let i = 0; i < dims[0]; i++) {
    for (let j = 0; j < dims[1]; j++) {
      for (let k = 0; k < dims[2]; k++) {
        const val = X[i]?.[j]?.[k] || 0;
        let col = 0, row;
        // The unfolded matrix's ROW index is the mode's own tensor index (i for
        // mode 0, j for mode 1, k for mode 2) — the previous version always used
        // `i`, so for mode 1/2 nearly every cell was written to the wrong row
        // (or clamped into row 0 whenever i >= nRows), silently destroying most
        // of the tensor's data in the unfolded matrix.
        if (mode === 0) { col = j * dims[2] + k; row = i; }
        else if (mode === 1) { col = i * dims[2] + k; row = j; }
        else { col = i * dims[1] + j; row = k; }
        result[row][col] = val;
      }
    }
  }
  return result;
}

// ── PARAFAC (CP decomposition via Alternating Least Squares) ──────
/** @param {number[][][]} X @param {number} [nFactors] */
export function parafac(X, nFactors = 2, { maxIter = 50, seed = 42, tol = 1e-8 } = {}) {
  if (!X || !X.length || !X[0]?.length) return null;
  const I = X.length, J = X[0].length, K = X[0]?.[0]?.length || 1;
  if (I < 2 || J < 2) return null;
  const F = Math.max(1, nFactors);
  let s = seed >>> 0;
  const rand = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
  const randMat = rows => Array.from({ length: rows }, () => Array.from({ length: F }, () => rand() - 0.5));
  /** @returns {number} */
  const get = (i, j, k) => K > 1 ? (X[i]?.[j]?.[k] ?? 0) : /** @type {number} */ (X[i]?.[j] ?? 0);

  let A = randMat(I), B = randMat(J), C = randMat(K);

  const gram = M => {                       // Mᵀ M  (F×F)
    const g = Array.from({ length: F }, () => Array(F).fill(0));
    for (let a = 0; a < F; a++) for (let b = 0; b < F; b++) {
      let acc = 0; for (let r = 0; r < M.length; r++) acc += M[r][a] * M[r][b];
      g[a][b] = acc;
    }
    return g;
  };
  const hadamard = (P, Q) => P.map((row, a) => row.map((v, b) => v * Q[a][b]));

  // Mode-n least-squares update: factor = MTTKRP · pinv(gram∘gram)
  const update = (rows, accum, inv) => {
    const M = Array.from({ length: rows }, () => Array(F).fill(0));
    accum(M);
    if (!inv) return null;
    return M.map(row => inv.map(ir => ir.reduce((acc, v, f) => acc + v * row[f], 0)));
  };

  const reconErr = () => {
    let err = 0;
    for (let i = 0; i < I; i++) for (let j = 0; j < J; j++) for (let k = 0; k < K; k++) {
      let rec = 0; for (let f = 0; f < F; f++) rec += A[i][f] * B[j][f] * C[k][f];
      err += (get(i, j, k) - rec) ** 2;
    }
    return err;
  };

  let prev = Infinity;
  for (let iter = 0; iter < maxIter; iter++) {
    const nA = update(I, M => {
      for (let i = 0; i < I; i++) for (let j = 0; j < J; j++) for (let k = 0; k < K; k++) {
        const x = get(i, j, k); if (!x) continue;
        for (let f = 0; f < F; f++) M[i][f] += x * B[j][f] * C[k][f];
      }
    }, matInv(hadamard(gram(B), gram(C))));
    if (nA) A = nA;
    const nB = update(J, M => {
      for (let i = 0; i < I; i++) for (let j = 0; j < J; j++) for (let k = 0; k < K; k++) {
        const x = get(i, j, k); if (!x) continue;
        for (let f = 0; f < F; f++) M[j][f] += x * A[i][f] * C[k][f];
      }
    }, matInv(hadamard(gram(A), gram(C))));
    if (nB) B = nB;
    const nC = update(K, M => {
      for (let i = 0; i < I; i++) for (let j = 0; j < J; j++) for (let k = 0; k < K; k++) {
        const x = get(i, j, k); if (!x) continue;
        for (let f = 0; f < F; f++) M[k][f] += x * A[i][f] * B[j][f];
      }
    }, matInv(hadamard(gram(A), gram(B))));
    if (nC) C = nC;
    const err = reconErr();
    if (Math.abs(prev - err) < tol * Math.max(1, prev)) { prev = err; break; }
    prev = err;
  }

  return { test: 'PARAFAC', factors: { A: A.map(r => r.map(v => +v.toFixed(4))).slice(0, 5), B: B.map(r => r.map(v => +v.toFixed(4))).slice(0, 5) }, nFactors: F, dims: [I, J, K], reconError: +prev.toFixed(6), n: I, apa: `PARAFAC: ${F} factors, ${I}×${J}×${K}, err=${prev.toFixed(4)}` };
}

// ── Tucker Decomposition ──────────────────────────────────────────
/** @param {number[][][]} X */
export function tuckerDecomp(X, ranks = [2, 2, 2], { seed = 42, maxIter = 30 } = {}) {
  __rng = mulberry32(seed);
  if (!X || !X.length) return null;
  const I = X.length, J = X[0]?.length || 1, K = X[0]?.[0]?.length || 1;
  // SVD per mode unfolding
  const factors = [];
  for (let m = 0; m < 3; m++) {
    const M = unfoldTensor(X, m);
    const r = Math.min(ranks[m], M.length);
    // Truncated SVD via power iteration for top r eigenvectors
    const U = Array.from({ length: M.length }, () => Array(r).fill(0));
    for (let d = 0; d < r; d++) {
      let v = Array.from({ length: M[0].length }, () => __rng());
      for (let iter = 0; iter < 10; iter++) {
        const u = M.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
        const nu = Math.sqrt(u.reduce((s, x) => s + x * x, 0)) || 1;
        u.forEach((x, i) => { U[i][d] = x / nu; });
        v = M[0].map((_, j) => M.reduce((s, row, i) => s + row[j] * U[i][d], 0));
      }
    }
    factors.push({ mode: m + 1, U: U.map(r => r.map(v => +v.toFixed(4))).slice(0, 5) });
  }
  return { test: 'Tucker Decomposition', factors, ranks, dims: [I, J, K], apa: `Tucker: ranks ${ranks.join('×')}, ${I}×${J}×${K}` };
}

// ── Unfold ────────────────────────────────────────────────────────
/** @param {number[][][]} X @param {number} [mode] */
export function unfold(X, mode = 1) {
  if (!X || !X.length) return null;
  const M = unfoldTensor(X, mode);
  return { test: 'Unfold (Mode-n Matricization)', matrix: M.map(r => r.map(v => +v.toFixed(4))).slice(0, 5), mode, dims: [M.length, M[0]?.length || 0], apa: `Mode-${mode+1} unfold: ${M.length}×${M[0]?.length}` };
}

// ── Multiway PCA ──────────────────────────────────────────────────
/** @param {number[][][]} X @param {number} [nComp] @param {number} [seed] */
export function multiwayPCA(X, nComp = 2, seed = 42) {
  __rng = mulberry32(seed);
  if (!X || !X.length) return null;
  const I = X.length, J = X[0]?.length || 1, K = X[0]?.[0]?.length || 1;
  const M = unfoldTensor(X, 0);
  const r = Math.min(nComp, M.length);
  // SVD via power iteration
  const scores = Array.from({ length: I }, () => Array(r).fill(0));
  const loadings = Array.from({ length: J * K }, () => Array(r).fill(0));
  for (let d = 0; d < r; d++) {
    let v = Array.from({ length: M[0]?.length || 1 }, () => __rng());
    for (let iter = 0; iter < 10; iter++) {
      const u = M.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
      const nu = Math.sqrt(u.reduce((s, x) => s + x * x, 0)) || 1;
      u.forEach((x, i) => { scores[i][d] = x / nu; });
      v = M[0].map((_, j) => M.reduce((s, row, i) => s + row[j] * scores[i][d], 0));
    }
    const nv = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    v.forEach((x, i) => { loadings[i] = loadings[i] || []; loadings[i][d] = x / nv; });
  }
  return { test: 'Multiway PCA', scores: scores.map(r => r.map(v => +v.toFixed(4))).slice(0, 5), loadings: loadings.map(r => r.map(v => +v.toFixed(4))).slice(0, 10), nComp: r, apa: `MPCA: ${r} components, ${I}×${J}×${K}` };
}

// ── Tensor Regression (CP) ────────────────────────────────────────
/** @param {number[][][]} X @param {number[]} y */
export function tensorRegression(X, y, ranks = [2]) {
  if (!X || !y || !X.length || X.length !== y.length) return null;
  const n = X.length;
  // Flatten each X_i into vector
  /** @type {number[][]} */
  const flat = X.map(xi => {
    if (Array.isArray(xi[0])) return /** @type {number[]} */ (xi.flat(Infinity));
    return /** @type {number[]} */ (/** @type {unknown} */ (xi));
  });
  const p = flat[0]?.length || 0;
  if (!p) return null;
  const Xt = flat[0].map((_, j) => flat.map(row => row[j]));
  const XtX = Xt.map(r1 => flat[0].map((_, j) => r1.reduce((s, _, k) => s + flat[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const fitted = flat.map(xi => beta.reduce((s, b, j) => s + b * xi[j], 0));
  let ssRes = 0, ssTot = 0;
  const my = avg(y);
  for (let i = 0; i < n; i++) { ssRes += (y[i] - fitted[i]) ** 2; ssTot += (y[i] - my) ** 2; }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { test: 'Tensor Regression', coefficients: beta.slice(0, 10).map(v => +v.toFixed(4)), rSquared: +r2.toFixed(4), n, apa: `Tensor reg: R² = ${r2.toFixed(3)}, n = ${n}` };
}

// ── CP Decomposition (CANDECOMP/PARAFAC) ──────────────────────────
/** @param {number} [rank] @param {number[][][]} tensor */
export function cpDecomposition(tensor, rank = 2, { seed = 42, maxIter = 50 } = {}) {
  if (!tensor || !tensor.length || rank < 1) return null;
  const d1 = tensor.length, d2 = tensor[0]?.length || 0, d3 = tensor[0]?.[0]?.length || 0;
  if (d2 < 2 || d3 < 2) return null;
  const { A, B, C } = cpALS(tensor, rank, maxIter, seed);
  let fit = 0;
  for (let i = 0; i < d1; i++) for (let j = 0; j < d2; j++) for (let k = 0; k < d3; k++) {
    let pred = 0; for (let r = 0; r < rank; r++) pred += A[i][r] * B[j][r] * C[k][r];
    fit += Math.abs(tensor[i][j][k] - pred);
  }
  return { test: 'CP Decomposition', rank, dims: [d1, d2, d3], fit: +fit.toFixed(4), factors: { A, B, C }, apa: `CP: rank=${rank}, fit=${fit.toFixed(1)}` };
}

// ── Tucker Regression ─────────────────────────────────────────────
/** @param {number[][][]} X @param {number[]} y */
export function tuckerRegression(X, y, { seed = 42, rank = [2, 2], maxIter = 50 } = {}) {
  if (!X || !y || X.length < 5 || y.length < 5) return null;
  const n = X.length, d1 = X[0]?.length || 0, d2 = X[0]?.[0]?.length || 0;
  if (d1 < 2 || d2 < 2) return null;
  // Low-rank tensor-on-scalar regression: y_i ≈ ⟨β, X_i⟩. Fit the full
  // coefficient matrix β by ordinary least squares on the vectorised predictors
  // (a convex problem), then truncate β to matrix rank r via its SVD — the
  // multilinear-rank constraint of a 2-way Tucker/low-rank regression.
  const r = Math.max(1, Math.min(rank[0], rank[1], d1, d2));
  const p = d1 * d2;
  const F = X.map(Xi => { const v = []; for (let a = 0; a < d1; a++) for (let b = 0; b < d2; b++) v.push(Xi[a][b] || 0); return v; });
  const FtF = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => F.reduce((acc, row) => acc + row[a] * row[b], 0)));
  const FtY = Array.from({ length: p }, (_, a) => F.reduce((acc, row, i) => acc + row[a] * y[i], 0));
  const bvec = solveNormalEquations(FtF, FtY);
  const bFull = Array.from({ length: d1 }, (_, a) => Array.from({ length: d2 }, (_, b) => bvec[a * d2 + b]));
  // Rank-r truncated SVD of bFull via the eigendecomposition of bFullᵀ·bFull.
  const M = Array.from({ length: d2 }, (_, a) => Array.from({ length: d2 }, (_, b) => { let acc = 0; for (let i = 0; i < d1; i++) acc += bFull[i][a] * bFull[i][b]; return acc; }));
  const { eigenvalues, eigenvectors } = jacobiEigen(M);
  const beta = Array.from({ length: d1 }, () => Array(d2).fill(0));
  for (let kk = 0; kk < r; kk++) {
    const lam = eigenvalues[kk];
    if (!(lam > 1e-12)) continue;
    const sigma = Math.sqrt(lam);
    const vvec = eigenvectors[kk];                       // right singular vector (length d2)
    const uvec = bFull.map(row => row.reduce((acc, v, b) => acc + v * vvec[b], 0) / sigma); // left (length d1)
    for (let a = 0; a < d1; a++) for (let b = 0; b < d2; b++) beta[a][b] += sigma * uvec[a] * vvec[b];
  }
  let mse = 0;
  for (let i = 0; i < n; i++) { let pred = 0; for (let a = 0; a < d1; a++) for (let b = 0; b < d2; b++) pred += beta[a][b] * (X[i][a][b] || 0); mse += (y[i] - pred) ** 2; }
  return { test: 'Tucker Regression', mse: +(mse / n).toFixed(4), coefficients: beta.map(row => row.map(v => +v.toFixed(4))), rank, dims: [d1, d2], n, apa: `Tucker reg (low-rank ALS): MSE=${(mse / n).toFixed(2)}` };
}

// ── Tensor Completion ─────────────────────────────────────────────
/** @param {number[][][]} tensor @param {number[][][]} mask */
export function tensorCompletion(tensor, mask, { rank = 2, maxIter = 20 } = {}) {
  if (!tensor || !mask || !tensor.length) return null;
  const d1 = tensor.length, d2 = tensor[0]?.length || 0, d3 = tensor[0]?.[0]?.length || 0;
  // Low-rank completion via weighted CP (CP-WOPT): fit a rank-R CP model to the
  // OBSERVED cells only — each factor row solves its own small weighted least
  // squares over the cells observed in that slice — then read the model's
  // reconstruction at the missing cells. Fitting only observed cells avoids the
  // self-consistent wrong fixed point of impute-then-refit EM. Random restarts
  // guard against ALS local minima.
  const obs = (i, j, k) => !!mask[i]?.[j]?.[k];
  const solveRow = (G, b) => solveNormalEquations(G, b);
  let best = null, bestErr = Infinity;
  for (let rs = 0; rs < 8; rs++) {
    let s = (1234567 + rs * 0x9e3779b1) >>> 0;
    const rnd = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32 - 0.5; };
    let A = Array.from({ length: d1 }, () => Array.from({ length: rank }, rnd));
    let B = Array.from({ length: d2 }, () => Array.from({ length: rank }, rnd));
    let C = Array.from({ length: d3 }, () => Array.from({ length: rank }, rnd));
    const fitMode = (rows, feat, target) => { // per-row weighted LS over observed cells
      const out = [];
      for (let p = 0; p < rows; p++) {
        const G = Array.from({ length: rank }, () => Array(rank).fill(0)), bb = Array(rank).fill(0);
        feat(p, (f, t) => { for (let a = 0; a < rank; a++) { for (let b = 0; b < rank; b++) G[a][b] += f[a] * f[b]; bb[a] += f[a] * t; } });
        out.push(solveRow(G, bb));
      }
      return out;
    };
    for (let iter = 0; iter < maxIter; iter++) {
      A = fitMode(d1, (i, add) => { for (let j = 0; j < d2; j++) for (let k = 0; k < d3; k++) if (obs(i, j, k)) add(B[j].map((bv, r) => bv * C[k][r]), tensor[i][j][k]); });
      B = fitMode(d2, (j, add) => { for (let i = 0; i < d1; i++) for (let k = 0; k < d3; k++) if (obs(i, j, k)) add(A[i].map((av, r) => av * C[k][r]), tensor[i][j][k]); });
      C = fitMode(d3, (k, add) => { for (let i = 0; i < d1; i++) for (let j = 0; j < d2; j++) if (obs(i, j, k)) add(A[i].map((av, r) => av * B[j][r]), tensor[i][j][k]); });
    }
    let err = 0;
    for (let i = 0; i < d1; i++) for (let j = 0; j < d2; j++) for (let k = 0; k < d3; k++) if (obs(i, j, k)) { let rec = 0; for (let r = 0; r < rank; r++) rec += A[i][r] * B[j][r] * C[k][r]; err += (tensor[i][j][k] - rec) ** 2; }
    if (err < bestErr) { bestErr = err; best = { A, B, C }; }
  }
  const { A, B, C } = best;
  const completed = tensor.map((r1, i) => r1.map((r2, j) => r2.map((v, k) => {
    if (obs(i, j, k)) return +v.toFixed(4);
    let rec = 0; for (let r = 0; r < rank; r++) rec += A[i][r] * B[j][r] * C[k][r];
    return +rec.toFixed(4);
  })));
  let nMissing = 0;
  for (let i = 0; i < d1; i++) for (let j = 0; j < d2; j++) for (let k = 0; k < d3; k++) if (!mask[i]?.[j]?.[k]) nMissing++;
  return { test: 'Tensor Completion', dims: [d1, d2, d3], completed, nMissing, rank, apa: `Completion: ${nMissing} missing, rank=${rank}` };
}
