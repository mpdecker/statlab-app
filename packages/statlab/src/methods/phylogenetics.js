import { avg, sampleVar } from '../math/core.js';
import { matInv } from '../math/matrix.js';

// ── Phylogenetic variance-covariance (the enabling primitive) ──────
// All comparative methods below operate on the phylogenetic VCV C, where
// C[i][j] = shared root-to-MRCA branch length for tips i,j and C[i][i] =
// root-to-tip length. A "tree" may be supplied as:
//   • { vcv: [[...]] }                              — a precomputed VCV, or
//   • { parent: [...], length: [...] }              — a node list (tips 0..n-1,
//     internal nodes after, root has parent < 0), branch length to the parent.
// When no real tree is given (e.g. a bare array), we fall back to a star
// phylogeny (C = I): "no phylogenetic information", under which these methods
// reduce to their ordinary, tree-free counterparts.
function vcvFromNodes(tree, n) {
  const { parent, length } = tree;
  const N = parent.length;
  const depth = Array(N).fill(null);
  const getDepth = node => {
    if (depth[node] != null) return depth[node];
    depth[node] = parent[node] < 0 ? 0 : getDepth(parent[node]) + (length[node] || 0);
    return depth[node];
  };
  for (let i = 0; i < N; i++) getDepth(i);
  const anc = i => { const set = new Set(); let c = i; while (c >= 0) { set.add(c); c = parent[c]; } return set; };
  const A = Array.from({ length: n }, (_, i) => anc(i));
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    let best = -1; for (const a of A[i]) if (A[j].has(a) && depth[a] > best) best = depth[a];
    return best >= 0 ? best : 0;
  }));
}
function phyloVCV(tree, n) {
  if (tree && Array.isArray(tree.vcv) && tree.vcv.length === n) return tree.vcv;
  if (tree && Array.isArray(tree.parent) && Array.isArray(tree.length)) return vcvFromNodes(tree, n);
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))); // star
}
function cholesky(A) {
  const n = A.length, L = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / (L[j][j] || 1e-12);
  }
  return L;
}
function logDet(A) { const L = cholesky(A); let s = 0; for (let i = 0; i < A.length; i++) s += Math.log(Math.max(L[i][i], 1e-300)); return 2 * s; }
function forwardSolve(L, b) { const n = L.length, y = Array(n).fill(0); for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / (L[i][i] || 1e-12); } return y; }
// GLS estimate of β for y = Xβ + ε, Cov(ε) ∝ V (returns { beta, mu, sigma2 }).
function glsFit(X, y, V) {
  const n = y.length, p = X[0].length, Vi = matInv(V);
  if (!Vi) return null;
  const A = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => {
    let s = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += X[i][a] * Vi[i][j] * X[j][b]; return s;
  }));
  const rhs = Array.from({ length: p }, (_, a) => { let s = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += X[i][a] * Vi[i][j] * y[j]; return s; });
  const Ai = matInv(A);
  const beta = Ai ? Ai.map(row => row.reduce((s, v, j) => s + v * rhs[j], 0)) : Array(p).fill(0);
  const resid = y.map((v, i) => v - X[i].reduce((s, xv, k) => s + xv * beta[k], 0));
  let q = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) q += resid[i] * Vi[i][j] * resid[j];
  return { beta, sigma2: q / n, q, Vi };
}
function glsFitMean(x, V) { return glsFit(x.map(() => [1]), x, V); }
function whiten(trait, tree) { const n = trait.length; return forwardSolve(cholesky(phyloVCV(tree, n)), trait); } // L⁻¹·trait, decorrelated under BM

// ── Independent Contrasts (Felsenstein) ───────────────────────────
export function independentContrasts(tree, trait) {
  if (!tree || !trait || trait.length < 5 || (Array.isArray(tree) && tree.length < 5)) return null;
  const n = trait.length;
  // Phylogenetically independent contrasts via whitening: u = L⁻¹·trait with
  // C = L·Lᵀ. The components of u are decorrelated and equal-variance under BM;
  // dropping the root component gives the n−1 standardised contrasts.
  const u = whiten(trait, tree);
  const contrasts = u.slice(1);
  const mean = avg(contrasts);
  const se = Math.sqrt(contrasts.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(contrasts.length - 1, 1)) / Math.sqrt(Math.max(contrasts.length, 1));
  const t = se > 0 ? mean / se : 0;
  return { test: 'Independent Contrasts', contrasts: contrasts.map(v => +v.toFixed(4)), mean: +mean.toFixed(4), t: +t.toFixed(4), n, apa: `PIC: mean = ${mean.toFixed(3)}, t = ${t.toFixed(2)}` };
}

// Pagel's Lambda
export function pagelsLambda(trait, tree) {
  if (!trait || trait.length < 5) return null;
  const n = trait.length, C = phyloVCV(tree, n);
  // Profile-likelihood MLE of λ, which scales the off-diagonal covariance:
  // V(λ) = λ·C_offdiag + diag(C). λ→1 ⇒ Brownian motion, λ→0 ⇒ no signal.
  const restLL = lam => {
    const V = C.map((row, i) => row.map((v, j) => (i === j ? v : lam * v)));
    const fit = glsFitMean(trait, V);
    if (!fit || !(fit.sigma2 > 0)) return -Infinity;
    return -0.5 * (n * Math.log(2 * Math.PI * fit.sigma2) + logDet(V) + n);
  };
  let bestL = 0, bestLL = -Infinity;
  for (let g = 0; g <= 40; g++) { const lam = g / 40; const ll = restLL(lam); if (ll > bestLL) { bestLL = ll; bestL = lam; } }
  return { test: "Pagel's Lambda", lambda: +bestL.toFixed(4), logLik: +bestLL.toFixed(2), n, apa: `lambda = ${bestL.toFixed(3)}` };
}

// Blomberg's K
export function blombergK(trait, tree) {
  if (!trait || trait.length < 5) return null;
  const n = trait.length, C = phyloVCV(tree, n);
  const Ci = matInv(C);
  if (!Ci) return { test: "Blomberg's K", K: 1, n, apa: 'K = 1' };
  // K = (MSE₀/MSE) / E[MSE₀/MSE], MSE = aᵀC⁻¹a/(n−1), MSE₀ = aᵀa/(n−1) about the
  // GLS (phylogenetic) mean, with the BM expectation (tr(C) − n/(1ᵀC⁻¹1))/(n−1).
  const Cix = Ci.map(r => r.reduce((s, v, j) => s + v * trait[j], 0));
  const oCi1 = Ci.reduce((s, row) => s + row.reduce((a, v) => a + v, 0), 0);
  const muHat = Cix.reduce((s, v) => s + v, 0) / oCi1;
  const a = trait.map(v => v - muHat);
  let mse = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) mse += a[i] * Ci[i][j] * a[j];
  mse /= (n - 1);
  const mse0 = a.reduce((s, v) => s + v * v, 0) / (n - 1);
  const trC = C.reduce((s, row, i) => s + row[i], 0);
  const expected = (trC - n / oCi1) / (n - 1);
  const K = (expected > 0 && mse > 0) ? (mse0 / mse) / expected : 0;
  return { test: "Blomberg's K", K: +Math.max(0, K).toFixed(4), n, apa: `K = ${K.toFixed(3)}` };
}

// ── Phylogenetic Signal ───────────────────────────────────────────
export function phylogeneticSignal(trait, tree, { method = 'lambda', permutations = 999, seed = 42 } = {}) {
  if (!trait || trait.length < 5) return null;
  let stat = 0;
  if (method === 'lambda') stat = pagelsLambda(trait, tree)?.lambda || 0;
  else stat = blombergK(trait, tree)?.K || 0;
  // Randomization test. The simplified λ/K above are permutation-invariant
  // (functions of Σ(x−x̄)²), so significance is assessed with a permutation-
  // sensitive statistic: the mean squared difference between adjacent tips
  // (sister contrasts under the input ordering). Strong signal ⇒ adjacent tips
  // are similar ⇒ unusually SMALL adjacent-contrast variance vs. random orderings.
  const adjacentSS = arr => {
    let s = 0, c = 0;
    for (let i = 0; i + 1 < arr.length; i += 2) { s += (arr[i] - arr[i + 1]) ** 2; c++; }
    return c ? s / c : 0;
  };
  const obs = adjacentSS(trait);
  let sd = seed >>> 0;
  const rand = () => { sd = (Math.imul(1664525, sd) + 1013904223) >>> 0; return sd / 2 ** 32; };
  let le = 1;
  for (let perm = 0; perm < permutations; perm++) {
    const a = trait.slice();
    for (let k = a.length - 1; k > 0; k--) { const m = Math.floor(rand() * (k + 1)); [a[k], a[m]] = [a[m], a[k]]; }
    if (adjacentSS(a) <= obs + 1e-12) le++;
  }
  const p = le / (permutations + 1);
  return { test: 'Phylogenetic Signal', statistic: +stat.toFixed(4), p: +p.toFixed(4), method, permutations, n: trait.length, apa: `Signal: ${method} = ${stat.toFixed(3)}, p = ${p.toFixed(3)} (${permutations} perms)` };
}

// ── PIC Correlation ───────────────────────────────────────────────
export function picCorrelation(trait1, trait2, tree) {
  if (!trait1 || !trait2 || trait1.length < 5 || trait1.length !== trait2.length) return null;
  // Correlation of the two traits' phylogenetic contrasts (whitened by the same
  // tree); through the origin, as PIC contrasts are sign-arbitrary.
  const c1 = whiten(trait1, tree).slice(1), c2 = whiten(trait2, tree).slice(1), m = c1.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < m; i++) { sxy += c1[i] * c2[i]; sxx += c1[i] * c1[i]; syy += c2[i] * c2[i]; }
  const r = sxx * syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  return { test: 'PIC Correlation', r: +Math.max(-1, Math.min(1, r)).toFixed(4), n: m, apa: `PIC r = ${r.toFixed(3)}` };
}

// ── PGLS Regression ───────────────────────────────────────────────
// GLS fit of y = a + b·x under phylogenetic error, V(λ) = λ·C_offdiag + diag(C)
// (Pagel's λ transform of the real phylogenetic VCV — same convention as
// pagelsLambda/ouTraitModel). The previous version didn't accept a `tree`
// argument at all (silently dropping it — the test suite already called this
// with a 5th `{ tree }` argument that the old 4-parameter signature ignored),
// and fabricated a covariance matrix from each row's ARRAY INDEX distance
// (`exp(-|i-j|·0.5)`) instead of any phylogenetic relationship. It also had a
// numerically unstable λ→1 singularity (`1/(1-lambda+1e-10)` blows up).
/** @param {Array<Record<string, any>>} data @param {string} xVar @param {string} yVar @param {number} [lambda] */
export function pglsRegression(data, xVar, yVar, lambda = 1, { tree = null } = {}) {
  if (!data || data.length < 5 || !xVar || !yVar) return null;
  const n = data.length;
  const x = data.map(r => +r[xVar]);
  const y = data.map(r => +r[yVar]);
  const C = phyloVCV(tree, n);
  const V = C.map((row, i) => row.map((v, j) => (i === j ? v : lambda * v)));
  const X = x.map(xi => [1, xi]);
  const fit = glsFit(X, y, V);
  const beta = fit ? fit.beta : [avg(y), 0];
  return { test: 'PGLS Regression', beta: beta.map(b => +b.toFixed(5)), lambda, n, apa: `PGLS: lambda=${lambda}, beta=${beta.map(b => b.toFixed(3)).join(', ')}` };
}

// ── Diversification Rate (Yule process) ───────────────────────────
export function diversificationRate(branchLengths) {
  if (!branchLengths || branchLengths.length < 5) return null;
  const n = branchLengths.length;
  const totalTime = branchLengths.reduce((s, v) => s + v, 0);
  const rate = totalTime > 0 ? n / totalTime : 0;
  const se = Math.sqrt(n) / Math.max(totalTime, 1);
  return { test: 'Diversification Rate', lambda: +rate.toFixed(6), se: +se.toFixed(6), n, apa: `Diversification: lambda=${rate.toFixed(4)}, n=${n}` };
}

// ── OU Trait Model (Ornstein-Uhlenbeck on phylogeny) ──────────────
/** @param {Array<Record<string, any>>} data */
export function ouTraitModel(data, traitVar, { tree = null } = {}) {
  if (!data || data.length < 5 || !traitVar) return null;
  const n = data.length;
  const trait = data.map(r => +r[traitVar]);
  const C = phyloVCV(tree, n);
  const T = Math.max(...C.map((row, i) => row[i])); // tree height
  // Ornstein–Uhlenbeck covariance on the tree (shared time s_ij = C[i][j]):
  //   V_α[i][j] = (1/2α)·e^{−2α(T−s_ij)}·(1 − e^{−2α s_ij}).
  // α is the pull-to-optimum (phylogenetic-signal erosion); fit by ML over α,
  // with θ (optimum) and σ² from the GLS fit. The old code mis-indexed with
  // indexOf and ignored the tree.
  const ouV = alpha => C.map((row, i) => row.map((v) => (1 / (2 * alpha)) * Math.exp(-2 * alpha * (T - v)) * (1 - Math.exp(-2 * alpha * v))));
  const restLL = alpha => { const fit = glsFitMean(trait, ouV(alpha)); if (!fit || !(fit.sigma2 > 0)) return -Infinity; return -0.5 * (n * Math.log(2 * Math.PI * fit.sigma2) + logDet(ouV(alpha)) + n); };
  let bestA = 0.1, bestLL = -Infinity;
  for (let g = 0; g <= 50; g++) { const alpha = Math.exp(-4 + 9 * g / 50); const ll = restLL(alpha); if (ll > bestLL) { bestLL = ll; bestA = alpha; } }
  const fit = glsFitMean(trait, ouV(bestA));
  const theta = fit ? fit.beta[0] : avg(trait);
  const sigma2 = fit ? fit.sigma2 : sampleVar(trait);
  return { test: 'OU Trait Model', alpha: +bestA.toFixed(4), theta: +theta.toFixed(4), sigma2: +sigma2.toFixed(6), logLik: +bestLL.toFixed(2), n, apa: `OU: alpha=${bestA.toFixed(3)}, theta=${theta.toFixed(3)}` };
}
