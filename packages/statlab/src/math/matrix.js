/** Matrix product A·B. @param {number[][]} A @param {number[][]} B @returns {number[][]} */
export const matMul = (A, B) =>
  A.map(r => B[0].map((_, j) => r.reduce((s, _, k) => s + r[k] * B[k][j], 0)));

/** Matrix transpose. @param {number[][]} A @returns {number[][]} */
export const matTrans = A => A[0].map((_, j) => A.map(r => r[j]));

/** Matrix inverse via Gauss–Jordan elimination. @param {number[][]} A @returns {number[][]|null} null if singular. */
export function matInv(A) {
  const n = A.length;
  const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c];
    if (Math.abs(d) < 1e-14) return null;
    for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r !== c) {
        const f = M[r][c];
        for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j];
      }
    }
  }
  return M.map(r => r.slice(n));
}

/**
 * Solve the normal equations (XᵀX)β = XᵀY for β via a full matrix inverse.
 * Falls back to the diagonal solve ONLY when XᵀX is singular (matInv === null),
 * matching the degenerate-case guard in regression.js's ols(). Use this instead
 * of the bare `XtY[i] / XtX[i][i]` diagonal approximation, which is correct only
 * when predictors are orthogonal.
 * @param {number[][]} XtX @param {number[]} XtY @returns {number[]} the coefficient vector β.
 */
export function solveNormalEquations(XtX, XtY) {
  const inv = matInv(XtX);
  if (inv) return inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  return XtX.map((r, i) => XtY[i] / (r[i] || 1)); // singular fallback
}

/**
 * Jacobi eigendecomposition for real symmetric matrices.
 * Returns { eigenvalues, eigenvectors } sorted descending.
 * @param {number[][]} A0 a real symmetric matrix.
 * @returns {{eigenvalues: number[], eigenvectors: number[][]}} eigenvectors as rows, aligned to eigenvalues.
 */
export function jacobiEigen(A0) {
  const n = A0.length;
  const A = A0.map(r => [...r]);
  let V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));

  for (let it = 0; it < 200; it++) {
    let mx = 0, p = 0, q = 1;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (Math.abs(A[i][j]) > mx) { mx = Math.abs(A[i][j]); p = i; q = j; }
    if (mx < 1e-10) break;

    const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
    const t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)); // th=0 ⇒ 45° rotation (Math.sign(0)=0 would stall)
    const c = 1 / Math.sqrt(1 + t * t), s = t * c;
    const Ap = [...A[p]], Aq = [...A[q]];

    for (let r = 0; r < n; r++) {
      A[p][r] = c * Ap[r] - s * Aq[r];
      A[q][r] = s * Ap[r] + c * Aq[r];
    }
    for (let r = 0; r < n; r++) { A[r][p] = A[p][r]; A[r][q] = A[q][r]; }
    A[p][p] = c * c * Ap[p] - 2 * s * c * Ap[q] + s * s * Aq[q];
    A[q][q] = s * s * Ap[p] + 2 * s * c * Ap[q] + c * c * Aq[q];
    A[p][q] = A[q][p] = 0;

    const Vp = V.map(r => r[p]), Vq = V.map(r => r[q]);
    V.forEach((r, i) => { r[p] = c * Vp[i] - s * Vq[i]; r[q] = s * Vp[i] + c * Vq[i]; });
  }

  const ev = A.map((r, i) => r[i]);
  const ord = [...ev.keys()].sort((a, b) => ev[b] - ev[a]);
  return {
    eigenvalues:  ord.map(i => ev[i]),
    eigenvectors: ord.map(i => V.map(r => r[i])),
  };
}
