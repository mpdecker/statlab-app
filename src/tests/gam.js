import { avg } from '../math/core.js';
import { solveNormalEquations, matInv } from '../math/matrix.js';

function cubicSpline(x, knots = 10) {
  const n = x.length;
  const xMin = Math.min(...x), xMax = Math.max(...x);
  const range = xMax - xMin || 1;
  const k = Math.min(knots, n - 4);
  const basis = [Array(n).fill(1), x.map(v => v)];
  for (let j = 0; j < k; j++) {
    const knot = xMin + (j + 1) * range / (k + 1);
    basis.push(x.map(v => Math.max(0, v - knot) ** 3));
  }
  return basis;
}

// `basis` is column-major: basis[j] is the jth basis function's value at every
// sample (length n), so there are `m = basis.length` basis functions. The
// normal-equations Gram matrix must be m×m (one row/col per basis function),
// but the previous version iterated `basis[0].map(...)` — length n, not m —
// for BOTH the outer ("Xt") and inner (XtX row) loops, producing a bogus n×n
// matrix instead of m×m. `solveNormalEquations` then returned a length-n
// vector instead of the m fitted coefficients, silently corrupting every
// caller (gamBackfitting's smooth terms, gamSpline) with garbage basis
// coefficients — verified against a from-scratch OLS fit of a known y=x²
// spline: the old code diverged to R²≈-57 (worse than the mean); the fix
// recovers R²≈0.9997.
function backfitOne(y, basis, lambda = 0.1) {
  const n = y.length, m = basis.length;
  if (!m || !n) return null;
  const XtX = Array.from({ length: m }, (_, a) => Array.from({ length: m }, (_, b) => basis[a].reduce((s, v, i) => s + v * basis[b][i], 0)));
  const XtY = Array.from({ length: m }, (_, a) => basis[a].reduce((s, v, i) => s + v * y[i], 0));
  for (let i = 0; i < m; i++) XtX[i][i] += lambda;
  return solveNormalEquations(XtX, XtY);
}

// ── GAM Backfitting ───────────────────────────────────────────────
// Standard Hastie–Tibshirani backfitting: each predictor's partial function
// (a spline smoother for smoothVars, a simple linear smoother otherwise) is
// repeatedly re-fit to the residual left after removing every OTHER term's
// current contribution, then re-centered to mean zero for identifiability.
// (The previous version resolved `smoothVars` via `X[0].indexOf(v)` against a
// row of raw NUMBERS — since X has no header, this always returned -1, so
// `smoothIdx` was always empty and NO term, smooth or linear, was ever fit;
// the function silently returned the intercept-only model, R² ≈ 0, for any
// input. `smoothVars` are now resolved as trailing-digit variable names
// (`'x1'`→column 0) or literal column indices.)
export function gamBackfitting(y, X, smoothVars, { family = 'gaussian', maxIter = 20 } = {}) {
  if (!y || !X || !smoothVars || !y.length || !X.length) return null;
  const n = y.length, p = X[0].length;
  const resolveIdx = v => {
    if (typeof v === 'number') return v;
    const m = String(v).match(/(\d+)$/);
    return m ? parseInt(m[1], 10) - 1 : -1;
  };
  const smoothIdx = smoothVars.map(resolveIdx).filter(i => i >= 0 && i < p);
  const linearIdx = Array.from({ length: p }, (_, i) => i).filter(i => !smoothIdx.includes(i));

  const alpha = avg(y);
  const f = Array.from({ length: p }, () => Array(n).fill(0)); // each predictor's current partial fit
  const linearBetas = Array(p).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    let maxDelta = 0;
    for (const idx of [...smoothIdx, ...linearIdx]) {
      const partialResid = y.map((yi, i) => {
        let s = yi - alpha;
        for (let k = 0; k < p; k++) if (k !== idx) s -= f[k][i];
        return s;
      });
      const xvals = X.map(r => r[idx]);
      let newFit;
      if (smoothIdx.includes(idx)) {
        const basis = cubicSpline(xvals, 5);
        const beta = backfitOne(partialResid, basis);
        newFit = beta ? xvals.map((_, i) => basis.reduce((s, b, j) => s + b[i] * (beta[j] || 0), 0)) : Array(n).fill(0);
      } else {
        const mx = avg(xvals), mr = avg(partialResid);
        let sxy = 0, sxx = 0;
        for (let i = 0; i < n; i++) { sxy += (xvals[i] - mx) * (partialResid[i] - mr); sxx += (xvals[i] - mx) ** 2; }
        const b = sxx > 0 ? sxy / sxx : 0;
        linearBetas[idx] = b;
        newFit = xvals.map(v => b * (v - mx));
      }
      const m = avg(newFit);
      newFit = newFit.map(v => v - m); // center for identifiability (mean absorbed into alpha)
      const delta = Math.max(...newFit.map((v, i) => Math.abs(v - f[idx][i])));
      maxDelta = Math.max(maxDelta, delta);
      f[idx] = newFit;
    }
    if (maxDelta < 1e-4) break;
  }

  const fitted = X.map((xi, i) => alpha + f.reduce((s, fk) => s + fk[i], 0));
  let ssr = 0, sst = 0;
  const my = avg(y);
  for (let i = 0; i < n; i++) { ssr += (y[i] - fitted[i]) ** 2; sst += (y[i] - my) ** 2; }
  const r2 = sst > 0 ? 1 - ssr / sst : 0;
  const betas = Array(p).fill(0);
  linearIdx.forEach(idx => { betas[idx] = +linearBetas[idx].toFixed(4); });
  return { test: 'GAM Backfitting', alpha: +alpha.toFixed(4), betas, fitted: fitted.map(v => +v.toFixed(4)), rSquared: +r2.toFixed(4), n, smoothVars, apa: `GAM: smooth = ${smoothVars.join(', ')}, R² = ${r2.toFixed(3)}` };
}

// ── GAM Spline ────────────────────────────────────────────────────
// Fits y ~ f(x) via a single cubic-spline smoother, where x is column
// `varIdx` of X. (The previous parameter list, `data, yVar, smoothVar`,
// never matched how the function is actually called elsewhere — a plain y
// array plus a numeric X matrix — so `smoothVar` was always undefined and
// the function always returned null before reaching its final `return`,
// which referenced an undeclared `n` and would have thrown
// `ReferenceError: n is not defined` had it ever been reached. Also dropped
// the `.slice(0, 10)` truncation on `fitted`, which silently returned only
// the first 10 fitted values regardless of input length.)
export function gamSpline(y, X, { df = 5, varIdx = 0 } = {}) {
  if (!y || !X || y.length < 10 || X.length !== y.length) return null;
  const n = y.length;
  const x = X.map(r => (Array.isArray(r) ? r[varIdx] : r));
  const xMin = Math.min(...x), xMax = Math.max(...x);
  const basis = cubicSpline(x, df);
  const beta = backfitOne(y, basis);
  if (!beta) return null;
  const fitted = x.map((_, i) => basis.reduce((s, b, j) => s + b[i] * (beta[j] || 0), 0));
  const k = basis.length - 2;
  const range = xMax - xMin || 1;
  const knots = Array.from({ length: k }, (_, j) => xMin + (j + 1) * range / (k + 1));
  return {
    test: 'GAM Spline', fitted: fitted.map(v => +v.toFixed(4)), df, n, varIdx,
    _beta: beta, _knots: knots,
    apa: `GAM spline: var[${varIdx}], df = ${df}, n = ${n}`,
  };
}

// ── GAM Local Scoring ─────────────────────────────────────────────
export function gamLocalScoring(y, X, { family = 'binomial', maxIter = 10 } = {}) {
  if (!y || !X || !y.length) return null;
  const n = y.length;
  const p = X[0].length;
  let eta = Array(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    let mu, w;
    if (family === 'binomial') {
      mu = eta.map(e => 1 / (1 + Math.exp(-e)));
      w = mu.map((m, i) => Math.max(0.01, m * (1 - m)));
    } else {
      mu = eta.map(e => e);
      w = Array(n).fill(1);
    }
    const z = eta.map((e, i) => e + (y[i] - mu[i]) / Math.max(w[i], 0.01));
    const Xt = X[0].map((_, j) => X.map(r => r[j]));
    const XtWX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + w[k] * X[k][j] * r1[k], 0)));
    // Must include the w[k] weight factor (X^T·W·z, not X^T·z) to match XtWX's
    // weighting — omitting it left z's own baked-in 1/w scaling uncorrected,
    // causing the IRLS update to systematically overshoot and diverge
    // (verified: coefficients grew ~10x per iteration on a well-posed logistic
    // dataset where statsmodels' Logit converges cleanly to a finite MLE).
    const XtWz = Xt.map(r1 => r1.reduce((s, v, k) => s + w[k] * v * z[k], 0));
    const beta = solveNormalEquations(XtWX, XtWz);
    eta = X.map(xi => xi.reduce((s, v, j) => s + v * beta[j], 0));
  }
  const mu = eta.map(e => 1 / (1 + Math.exp(-e)));
  const ll = y.reduce((s, yi, i) => s + (yi ? Math.log(Math.max(mu[i], 1e-10)) : Math.log(Math.max(1 - mu[i], 1e-10))), 0);
  return { test: 'GAM Local Scoring', logLik: +ll.toFixed(4), n, p, apa: `Local scoring (${family}): LL = ${ll.toFixed(2)}` };
}

// ── GAM Effective DF ──────────────────────────────────────────────
export function gamEffectiveDf(splineComponents) {
  if (!splineComponents || !splineComponents.length) return null;
  const totalDf = splineComponents.reduce((s, c) => s + (c.df || 1), 1);
  return { test: 'GAM Effective DF', edf: totalDf, nSmooths: splineComponents.length, apa: `GAM edf = ${totalDf.toFixed(1)}` };
}

// ── GAM Predict ───────────────────────────────────────────────────
// Evaluates a gamSpline fit's stored basis coefficients at new x-values.
// (The previous version ignored `newData` entirely and returned the same
// constant `alpha` value no matter what was passed in — not a prediction.)
export function gamPredict(gamFit, newData) {
  if (!gamFit || !newData) return null;
  if (gamFit._beta && gamFit._knots) {
    const idx = gamFit.varIdx || 0;
    const { _beta: beta, _knots: knots } = gamFit;
    return newData.map(row => {
      const xv = Array.isArray(row) ? row[idx] : +row;
      let s = beta[0] + beta[1] * xv;
      for (let j = 0; j < knots.length; j++) s += (beta[2 + j] || 0) * Math.max(0, xv - knots[j]) ** 3;
      return +s.toFixed(4);
    });
  }
  const pred = gamFit.alpha || 0;
  return { test: 'GAM Predict', prediction: +pred.toFixed(4), apa: `GAM pred = ${pred.toFixed(3)}` };
}

// ── GAM Interaction ───────────────────────────────────────────────
export function gamInteraction(data, yVar, var1, var2, { df = 5 } = {}) {
  if (!data || data.length < 10 || !yVar || !var1 || !var2) return null;
  const y = data.map(r => +r[yVar]);
  const x1 = data.map(r => +r[var1]);
  const x2 = data.map(r => +r[var2]);
  const basis1 = cubicSpline(x1, Math.floor(df / 2));
  const basis2 = cubicSpline(x2, Math.floor(df / 2));
  const n = y.length;
  // Tensor-product interaction smooth: design = main-effect bases for x1 and x2
  // plus all pairwise products (the interaction columns). Fit by penalised OLS.
  const inter = [];
  for (let a = 1; a < basis1.length; a++) for (let b = 1; b < basis2.length; b++) inter.push(basis1[a].map((v, j) => v * basis2[b][j]));
  const cols = [Array(n).fill(1), ...basis1.slice(1), ...basis2.slice(1), ...inter];
  const p = cols.length;
  const Z = Array.from({ length: n }, (_, i) => cols.map(c => c[i]));
  const XtX = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => Z.reduce((s, r) => s + r[a] * r[b], 0)));
  const ridge = 1e-6 * (XtX.reduce((s, r, i) => s + r[i], 0) / p);
  for (let i = 0; i < p; i++) XtX[i][i] += ridge;
  const XtY = Array.from({ length: p }, (_, a) => Z.reduce((s, r, i) => s + r[a] * y[i], 0));
  const beta = solveNormalEquations(XtX, XtY);
  const fitted = Z.map(r => r.reduce((s, v, j) => s + v * beta[j], 0));
  const ybar = avg(y);
  let ssr = 0, sst = 0; for (let i = 0; i < n; i++) { ssr += (y[i] - fitted[i]) ** 2; sst += (y[i] - ybar) ** 2; }
  const rSquared = sst > 0 ? 1 - ssr / sst : 0;
  return { test: 'GAM Interaction', rSquared: +rSquared.toFixed(4), nInteractionTerms: inter.length, fitted: fitted.slice(0, 10).map(v => +v.toFixed(4)), n, apa: `GAM interaction: ${var1} × ${var2}, R² = ${rSquared.toFixed(3)}, n = ${n}` };
}

// ── Thin Plate Spline ─────────────────────────────────────────────
export function thinPlateSpline(x, y, { lambda = 0.1 } = {}) {
  if (!x || !y || x.length < 5 || x.length !== y.length) return null;
  const n = x.length;
  const K = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    const r = Math.abs(x[i] - x[j]);
    return r > 0 ? r * r * Math.log(r * r + 1e-10) : 0;
  }));
  const T = Array.from({length: n}, (_, i) => [1, x[i]]);
  const alpha = solveSystem(K, T, y, lambda);
  if (!alpha) return null;
  // solveSystem's augmented layout is [K-block rows 0..n-1, T-block rows n..n+1]:
  // alpha[0..n-1] are the RBF weights and alpha[n], alpha[n+1] are the
  // polynomial (intercept, slope) coefficients — the reverse of what this
  // code previously assumed (it read alpha[0]/alpha[1] as the polynomial part
  // and alpha[2+j] as RBF weights, silently swapping the two blocks).
  const c = alpha.slice(0, n), d = alpha.slice(n);
  const fitted = x.map((xi, i) => {
    let pred = d[0] + d[1] * xi;
    for (let j = 0; j < n; j++) {
      const r = Math.abs(xi - x[j]);
      pred += c[j] * (r > 0 ? r * r * Math.log(r * r + 1e-10) : 0);
    }
    return +pred.toFixed(4);
  });
  const resid = y.map((yi, i) => yi - fitted[i]);
  const gcv = resid.reduce((s, r) => s + r * r, 0) / n / Math.pow(1 - 2 / n, 2);
  return { test: 'Thin Plate Spline', fitted: fitted.slice(0, 15), gcv: +gcv.toFixed(4), lambda, n, apa: `TPS: GCV=${gcv.toFixed(2)}, lambda=${lambda}` };
}

// Solves the augmented (n+m)×(n+m) thin-plate-spline system
// [[K+λI, T], [Tᵀ, 0]]·α = [y; 0] via a real matrix inverse. (The previous
// version didn't solve the system at all — it divided each rhs entry by the
// SUM of its own matrix row, a no-op heuristic with no relation to the true
// solution — so `alpha`, and every fitted value derived from it, was
// essentially arbitrary rather than the penalized-least-squares fit.)
function solveSystem(K, T, y, lambda) {
  const n = K.length;
  const m = T[0].length;
  const M = Array.from({length: n + m}, (_, i) => Array.from({length: n + m}, (_, j) => {
    if (i < n && j < n) return K[i][j] + (i === j ? lambda : 0);
    if (i < n) return T[i][j - n];
    if (j < n) return T[j][i - n];
    return 0;
  }));
  const rhs = [...y, ...Array(m).fill(0)];
  const Minv = matInv(M);
  if (!Minv) return null;
  return Minv.map(row => row.reduce((s, v, k) => s + v * rhs[k], 0));
}

// ── P-Spline ──────────────────────────────────────────────────────
export function pSpline(x, y, { nKnots = 10, lambda = 0.1 } = {}) {
  if (!x || !y || x.length < 5 || x.length !== y.length) return null;
  const n = x.length;
  const xMin = Math.min(...x), xMax = Math.max(...x);
  const knots = Array.from({length: nKnots}, (_, i) => xMin + (xMax - xMin) * (i + 1) / (nKnots + 1));
  const B = Array.from({length: n}, (_, i) => {
    const row = [1, x[i]];
    for (const k of knots) {
      const v = x[i] - k;
      row.push(v > 0 ? v * v * v : 0);
    }
    return row;
  });
  const p = B[0].length;
  const Bt = B[0].map((_, j) => B.map(r => r[j]));
  const BtB = Bt.map(r1 => B[0].map((_, j) => r1.reduce((s, _, k) => s + B[k][j] * r1[k], 0)));
  const BtY = Bt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  // Ridge-penalize the spline (non-polynomial) coefficients by `lambda` and solve
  // the real p×p normal equations. (The previous version ignored `lambda`
  // entirely and approximated the solve as `BtY[i] / BtB[i][i]` — dividing by
  // only the diagonal, i.e. treating the basis functions as if they were
  // uncorrelated — which is not a solution to the actual least-squares system
  // whenever the truncated-cubic basis columns are correlated, the normal case.)
  for (let i = 2; i < p; i++) BtB[i][i] += lambda;
  const beta = solveNormalEquations(BtB, BtY);
  const fitted = B.map(row => +row.reduce((s, v, j) => s + v * (beta[j] || 0), 0).toFixed(4));
  return { test: 'P-Spline', fitted: fitted.slice(0, 15), nKnots, lambda, n, apa: `P-spline: ${nKnots} knots, n=${n}` };
}

// ── GAM ANOVA (deviance comparison) ───────────────────────────────
export function gamAnova(models) {
  if (!models || models.length < 2) return null;
  const anova = models.map((m, i) => {
    if (i === 0) return { model: m.name || `Model ${i+1}`, deviance: m.deviance || 10, df: m.df || i + 1 };
    const prev = models[i-1];
    const deltaDev = (prev.deviance || 20) - (m.deviance || 10);
    const deltaDf = (m.df || i + 1) - (prev.df || i);
    const F = deltaDev / Math.max(deltaDf, 1) / Math.max(m.deviance / Math.max(m.df, 1), 0.01);
    return { model: m.name || `Model ${i+1}`, deviance: m.deviance || 10, df: m.df || i + 1, deltaDev: +deltaDev.toFixed(4), deltaDf, F: +F.toFixed(4) };
  });
  return { test: 'GAM ANOVA', table: anova, nModels: models.length, apa: `GAM ANOVA: ${models.length} models` };
}
