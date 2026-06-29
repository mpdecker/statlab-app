import { avg, sampleVar } from '../math/core.js';
import { jacobiEigen, solveNormalEquations, matInv } from '../math/matrix.js';
import { normalCDF } from '../math/distributions.js';

// Full-data coordinate helpers (the exported transforms slice to 5 rows for
// display; downstream models must use the full matrices).
function _clrCoords(data, vars) {
  return data.map(r => {
    const row = vars.map(v => +r[v]);
    const gm = Math.exp(row.reduce((s, v) => s + Math.log(Math.max(v, 1e-10)), 0) / row.length);
    return row.map(v => Math.log(Math.max(v, 1e-10)) - Math.log(gm));
  });
}
function _ilrBasis(p) {
  return Array.from({ length: p - 1 }, (_, i) => {
    const row = Array(p).fill(0);
    const k = i + 1, sqrtK = Math.sqrt(k * (k + 1));
    for (let j = 0; j <= i; j++) row[j] = 1 / sqrtK;
    row[i + 1] = -k / sqrtK;
    return row;
  });
}
function _ilrCoords(data, vars) {
  const Psi = _ilrBasis(vars.length);
  return _clrCoords(data, vars).map(row => Psi.map(psi => psi.reduce((s, v, j) => s + v * row[j], 0)));
}

// ── CLR Transform (centered log-ratio) ────────────────────────────
export function clrTransform(data, vars) {
  if (!data || data.length < 5 || !vars || vars.length < 2) return null;
  const result = _clrCoords(data, vars).map(row => row.map(v => +v.toFixed(6)));
  const n = data.length;
  return { test: 'CLR Transform', transformed: result.slice(0, 5), p: vars.length, n, apa: `CLR: ${n} obs, ${vars.length} parts` };
}

// ── ILR Transform (isometric log-ratio) ───────────────────────────
export function ilrTransform(data, vars) {
  if (!data || data.length < 5 || !vars || vars.length < 2) return null;
  const p = vars.length;
  const result = _ilrCoords(data, vars).map(row => row.map(v => +v.toFixed(6)));
  return { test: 'ILR Transform', transformed: result.slice(0, 5), p, n: data.length, apa: `ILR: ${data.length} obs, ${p - 1} coordinates` };
}

// ── ALR Transform (additive log-ratio) ────────────────────────────
export function alrTransform(data, vars, denominatorIndex = 0) {
  if (!data || data.length < 5 || !vars || vars.length < 2) return null;
  const X = data.map(r => vars.map(v => +r[v]));
  const denom = X.map(row => row[denominatorIndex] || 1e-10);
  const result = X.map((row, i) => row
    .filter((_, j) => j !== denominatorIndex)
    .map(v => +Math.log(Math.max(v, 1e-10) / denom[i]).toFixed(6)));
  return { test: 'ALR Transform', transformed: result.slice(0, 5), p: vars.length, denominator: vars[denominatorIndex], n: data.length, apa: `ALR: ${data.length} obs, denom=${vars[denominatorIndex]}` };
}

// ── Compositional PCA ─────────────────────────────────────────────
export function compPCA(data, vars) {
  if (!data || data.length < 5 || !vars || vars.length < 2) return null;
  const X = _clrCoords(data, vars); // full n×p CLR coords, not the 5-row display slice
  if (!X.length) return null;
  const n = X.length, p = X[0].length;
  const cov = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    const mi = avg(X.map(r => r[i]));
    const mj = avg(X.map(r => r[j]));
    let s = 0;
    for (let k = 0; k < n; k++) s += (X[k][i] - mi) * (X[k][j] - mj);
    return s / (n - 1);
  }));
  const eig = jacobiEigen(cov);
  const loadings = eig.eigenvectors.map(vec => +(Math.sqrt(Math.abs(eig.eigenvalues[eig.eigenvectors.indexOf(vec)])) || 0).toFixed(4));
  return { test: 'Compositional PCA', eigenvalues: eig.eigenvalues.slice(0, 5).map(e => +e.toFixed(4)), cumulative: cumSum(eig.eigenvalues).slice(0, 5).map(v => +v.toFixed(4)), n, p, apa: `CompPCA: ${p} parts, n=${n}` };
}

function cumSum(arr) {
  let s = 0;
  return arr.map(v => { s += v; return s; });
}

// ── Compositional Regression ──────────────────────────────────────
export function compRegression(data, yVar, compVars, xVars = []) {
  if (!data || data.length < 10 || !yVar || !compVars || compVars.length < 2) return null;
  const ilrCoords = _ilrCoords(data, compVars); // full n×(p-1), not the 5-row display slice
  if (!ilrCoords.length) return null;
  const y = data.map(r => +r[yVar]);
  const Xraw = ilrCoords.map((row, i) => [...row, ...xVars.map(v => +data[i][v])]);
  const n = Xraw.length;
  const X = Xraw.map(row => [1, ...row]);
  const Xt = X[0].map((_, j) => X.map(r => r[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  const beta = solveNormalEquations(XtX, XtY);
  // Analytic OLS inference: σ̂² = SSR/(n−p), SE_j = √(σ̂²·(XᵀX)⁻¹_jj).
  const inv = matInv(XtX);
  const pK = X[0].length;
  const fitted = X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
  const ssr = y.reduce((s, yi, i) => s + (yi - fitted[i]) ** 2, 0);
  const sigma2 = ssr / Math.max(1, n - pK);
  const coeffs = compVars.slice(0, -1).map((name, j) => {
    const idx = 1 + j;
    const se = inv ? Math.sqrt(Math.max(0, sigma2 * inv[idx][idx])) : Infinity;
    const z = se > 0 && Number.isFinite(se) ? beta[idx] / se : 0;
    const pVal = 2 * (1 - normalCDF(Math.abs(z)));
    return { name: `ILR_${name}`, b: +beta[idx].toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: +pVal.toFixed(4) };
  });
  return { test: 'Compositional Regression', coefficients: coeffs, n, p: compVars.length, apa: `CompReg: ${compVars.length} parts, n=${n}` };
}
