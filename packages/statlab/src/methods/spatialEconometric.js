import { avg, sampleVar } from '../math/core.js';
import { jacobiEigen, matInv } from '../math/matrix.js';
import { normalCDF, chiPVal } from '../math/distributions.js';

// log|det(M)| via Gaussian elimination with partial pivoting (M real, n×n).
function logAbsDet(M0) {
  const n = M0.length;
  const M = M0.map(r => [...r]);
  let ld = 0;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-300) return -Infinity;
    if (piv !== c) [M[c], M[piv]] = [M[piv], M[c]];
    ld += Math.log(Math.abs(M[c][c]));
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let j = c; j < n; j++) M[r][j] -= f * M[c][j]; }
  }
  return ld;
}

// ── Spatial Durbin Model: y = ρWy + Xβ + WXθ + ε (Gaussian MLE) ──────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {number[][]} W */
export function spatialDurbin(data, yVar, xVars, W) {
  if (!data || data.length < 10 || !yVar || !xVars || !xVars.length || !W || W.length !== data.length) return null;
  const n = data.length, p = xVars.length;
  const y = data.map(r => +r[yVar]);
  const X = data.map(r => xVars.map(v => +r[v]));
  const Wy = W.map(row => row.reduce((s, w, j) => s + w * y[j], 0));
  const WX = data.map((_, i) => xVars.map((_, v) => W[i].reduce((s, w, j) => s + w * X[j][v], 0)));
  // Design Z = [intercept, X, WX]; coefficients δ = [α, β, θ].
  const Z = data.map((_, i) => [1, ...X[i], ...WX[i]]);
  const kz = 1 + 2 * p;
  const ZtZ = Array.from({ length: kz }, (_, a) => Array.from({ length: kz }, (_, b) => Z.reduce((s, row) => s + row[a] * row[b], 0)));
  const ridge = 1e-7 * (ZtZ.reduce((s, r, i) => s + r[i], 0) / kz); // regularise near-collinear WX
  for (let i = 0; i < kz; i++) ZtZ[i][i] += ridge;
  const ZtZi = matInv(ZtZ);
  if (!ZtZi) return null;
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const solveDelta = Ay => {
    const ZtAy = Array.from({ length: kz }, (_, a) => Z.reduce((s, row, i) => s + row[a] * Ay[i], 0));
    return ZtZi.map(row => row.reduce((s, v, j) => s + v * ZtAy[j], 0));
  };
  // Concentrated log-likelihood in ρ: −n/2·ln σ²(ρ) + ln|I − ρW|.
  const concLL = rho => {
    const Ay = y.map((yi, i) => yi - rho * Wy[i]);
    const delta = solveDelta(Ay);
    let e2 = 0;
    for (let i = 0; i < n; i++) { const e = Ay[i] - Z[i].reduce((s, v, j) => s + v * delta[j], 0); e2 += e * e; }
    const A = I.map((row, i) => row.map((v, j) => v - rho * W[i][j]));
    return -0.5 * n * Math.log(Math.max(e2 / n, 1e-300)) + logAbsDet(A);
  };
  // Grid search then golden-section refine over ρ ∈ (−0.99, 0.99).
  let rho = 0, best = -Infinity;
  for (let g = 0; g <= 80; g++) { const r = -0.99 + 1.98 * g / 80; const ll = concLL(r); if (ll > best) { best = ll; rho = r; } }
  let lo = Math.max(-0.99, rho - 0.025), hi = Math.min(0.99, rho + 0.025);
  for (let it = 0; it < 50; it++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (concLL(m1) < concLL(m2)) lo = m1; else hi = m2; }
  rho = (lo + hi) / 2;
  // Coefficients and conditional-on-ρ SEs at ρ̂.
  const Ay = y.map((yi, i) => yi - rho * Wy[i]);
  const delta = solveDelta(Ay);
  let rss = 0;
  for (let i = 0; i < n; i++) { const e = Ay[i] - Z[i].reduce((s, v, j) => s + v * delta[j], 0); rss += e * e; }
  const sigma2 = rss / Math.max(1, n - kz);
  const mk = (name, idx) => {
    const b = delta[idx], se = Math.sqrt(Math.max(0, sigma2 * ZtZi[idx][idx])), z = se > 0 ? b / se : 0;
    return { name, b: +b.toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  };
  const coefficients = xVars.map((nm, j) => mk(nm, 1 + j));              // β on X
  const lagCoefficients = xVars.map((nm, j) => mk('W_' + nm, 1 + p + j)); // θ on WX
  return {
    test: 'Spatial Durbin Model', coefficients, lagCoefficients,
    intercept: +delta[0].toFixed(5), rho: +rho.toFixed(4), sigma2: +sigma2.toFixed(5),
    logLik: +concLL(rho).toFixed(4), n, apa: `SDM (ML): ρ = ${rho.toFixed(3)}, ${p} vars`,
  };
}

// ── Spatial Panel Model: y = ρWy + Xβ + μ_i + ε (fixed-effects SAR, MLE) ──────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {number[][]} W @param {{idVar?: string, timeVar?: string}} [options] */
export function spatialPanel(data, yVar, xVars, W, { idVar, timeVar } = {}) {
  if (!data || data.length < 15 || !yVar || !xVars || !xVars.length || !idVar || !W || W.length !== data.length) return null;
  const n = data.length, p = xVars.length;
  const ids = [...new Set(data.map(r => r[idVar]))];
  const nUnits = ids.length;
  if (nUnits < 2) return null;
  const T = Math.round(n / nUnits);
  const y = data.map(r => +r[yVar]);
  const X = data.map(r => xVars.map(v => +r[v]));
  const Wy = W.map(row => row.reduce((s, w, j) => s + w * y[j], 0));
  // Per-unit means for the within (fixed-effects) transform.
  const ix = {}; ids.forEach(id => { ix[id] = []; });
  data.forEach((r, i) => ix[r[idVar]].push(i));
  const mY = {}, mWy = {}, mX = {};
  ids.forEach(id => {
    mY[id] = avg(ix[id].map(i => y[i]));
    mWy[id] = avg(ix[id].map(i => Wy[i]));
    mX[id] = xVars.map((_, v) => avg(ix[id].map(i => X[i][v])));
  });
  // Within-demeaned regressors (constant across ρ); FE absorbs the intercept.
  const Xd = data.map((r, i) => xVars.map((_, v) => X[i][v] - mX[r[idVar]][v]));
  const XtX = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => Xd.reduce((s, row) => s + row[a] * row[b], 0)));
  const ridge = 1e-7 * (XtX.reduce((s, r, i) => s + r[i], 0) / p);
  for (let i = 0; i < p; i++) XtX[i][i] += ridge;
  const XtXi = matInv(XtX);
  if (!XtXi) return null;
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const solveBeta = yd => {
    const XtY = Array.from({ length: p }, (_, a) => Xd.reduce((s, row, i) => s + row[a] * yd[i], 0));
    return XtXi.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  };
  // Concentrated log-lik over ρ: within-demean (y − ρWy), OLS on X̃, + ln|I − ρW|.
  const demean = rho => data.map((r, i) => (y[i] - rho * Wy[i]) - (mY[r[idVar]] - rho * mWy[r[idVar]]));
  const concLL = rho => {
    const yd = demean(rho);
    const beta = solveBeta(yd);
    let e2 = 0;
    for (let i = 0; i < n; i++) { const e = yd[i] - Xd[i].reduce((s, v, j) => s + v * beta[j], 0); e2 += e * e; }
    const A = I.map((row, i) => row.map((v, j) => v - rho * W[i][j]));
    return -0.5 * n * Math.log(Math.max(e2 / n, 1e-300)) + logAbsDet(A);
  };
  let rho = 0, best = -Infinity;
  for (let g = 0; g <= 80; g++) { const r = -0.99 + 1.98 * g / 80; const ll = concLL(r); if (ll > best) { best = ll; rho = r; } }
  let lo = Math.max(-0.99, rho - 0.025), hi = Math.min(0.99, rho + 0.025);
  for (let it = 0; it < 50; it++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (concLL(m1) < concLL(m2)) lo = m1; else hi = m2; }
  rho = (lo + hi) / 2;
  const yd = demean(rho);
  const beta = solveBeta(yd);
  let rss = 0;
  for (let i = 0; i < n; i++) { const e = yd[i] - Xd[i].reduce((s, v, j) => s + v * beta[j], 0); rss += e * e; }
  const sigma2 = rss / Math.max(1, n - nUnits - p);
  const coefficients = xVars.map((nm, j) => {
    const se = Math.sqrt(Math.max(0, sigma2 * XtXi[j][j])), z = se > 0 ? beta[j] / se : 0;
    return { name: nm, b: +beta[j].toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });
  return {
    test: 'Spatial Panel', coefficients, spatialRho: +rho.toFixed(4), sigma2: +sigma2.toFixed(5),
    logLik: +concLL(rho).toFixed(4), nUnits, nPeriods: T, n,
    apa: `Spatial panel (FE-SAR ML): ρ = ${rho.toFixed(3)}, ${nUnits} units × ${T} periods`,
  };
}

// ── Spatial Hausman Test ──────────────────────────────────────────
/** @param {number[]} betaFE @param {number[]} seFE @param {number[]} betaRE @param {number[]} seRE */
export function spatialHausman(betaFE, seFE, betaRE, seRE) {
  if (!betaFE || !betaRE || betaFE.length !== betaRE.length) return null;
  const k = betaFE.length;
  let H = 0;
  for (let j = 0; j < k; j++) {
    const diff = (betaFE[j] || 0) - (betaRE[j] || 0);
    const varDiff = Math.max((seFE[j] || 0.1) ** 2 - (seRE[j] || 0.1) ** 2, 0.001);
    H += diff * diff / varDiff;
  }
  const p = chiPVal(H, k); // χ²(k) upper tail, not the df=2-only exp(−H/2)
  return { test: 'Spatial Hausman', H: +H.toFixed(4), df: k, p: +p.toFixed(4), apa: `Spatial Hausman: H=${H.toFixed(2)}, p=${p.toFixed(3)}` };
}

// ── Direct and Indirect Effects ───────────────────────────────────
/** @param {object} durbinResult */
export function directIndirectEffects(durbinResult) {
  if (!durbinResult || !durbinResult.coefficients) return null;
  const n = durbinResult.n || 0;
  const rho = durbinResult.rho || 0.3;
  const lagCoefs = durbinResult.lagCoefficients || [];
  // For row-standardized W, (I-ρW)⁻¹·1 = 1/(1-ρ)·1 and W·1 = 1, so the average
  // TOTAL effect has the exact closed form (β+θ)/(1-ρ) — the previous version
  // silently dropped θ (the WX/"lagCoefficients" term) from this sum entirely,
  // understating Total by exactly θ/(1-ρ) whenever a Durbin (WX) term is
  // present. The exact split of Total into Direct/Indirect requires the trace
  // structure of the actual W matrix (not available from β/θ/ρ alone), so
  // Direct is kept as the β approximation and Indirect is the remainder
  // (Total − Direct), preserving internal consistency.
  const effects = durbinResult.coefficients.map((c, j) => {
    const theta = lagCoefs[j] ? lagCoefs[j].b : 0;
    const direct = c.b;
    const total = (c.b + theta) / (1 - rho);
    const indirect = total - direct;
    return {
      variable: c.name,
      direct: +direct.toFixed(5),
      indirect: +indirect.toFixed(5),
      total: +total.toFixed(5),
    };
  });
  return { test: 'Direct & Indirect Effects', effects, rho: +rho.toFixed(4), apa: `Effects: direct + indirect` };
}
