import { avg, corr } from '../math/core.js';
import { jacobiEigen, solveNormalEquations } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── t-SNE (Barnes-Hut style simplified) ───────────────────────────
/** @param {number[][]} X */
export function tsne(X, { seed = 42, perplexity = 30, nComponents = 2, maxIter = 300, lr = 0.5 } = {}) {
  __rng = mulberry32(seed);
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length, d = nComponents;
  // Squared pairwise distances in the input space.
  const d2 = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    let s = 0; for (let k = 0; k < p; k++) s += (X[i][k] - X[j][k]) ** 2; return s;
  }));
  // Conditional P with per-point bandwidth β_i = 1/2σ_i² chosen by binary search
  // so each row's perplexity (2^entropy) matches the target.
  const logU = Math.log(perplexity);
  const P = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    let betaMin = -Infinity, betaMax = Infinity, beta = 1, pi = Array(n).fill(0);
    for (let iter = 0; iter < 60; iter++) {
      let sum = 0;
      for (let j = 0; j < n; j++) { pi[j] = j === i ? 0 : Math.exp(-d2[i][j] * beta); sum += pi[j]; }
      sum = sum || 1e-12;
      let H = 0;
      for (let j = 0; j < n; j++) { const pij = pi[j] / sum; if (pij > 1e-12) H += -pij * Math.log(pij); }
      const diff = H - logU;
      if (Math.abs(diff) < 1e-5) break;
      if (diff > 0) { betaMin = beta; beta = betaMax === Infinity ? beta * 2 : (beta + betaMax) / 2; }
      else { betaMax = beta; beta = betaMin === -Infinity ? beta / 2 : (beta + betaMin) / 2; }
    }
    const sum = pi.reduce((s, v) => s + v, 0) || 1e-12;
    for (let j = 0; j < n; j++) P[i][j] = pi[j] / sum;
  }
  const Pjoint = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => Math.max((P[i][j] + P[j][i]) / (2 * n), 1e-12)));
  // Gradient descent with momentum and early exaggeration; full KL gradient
  //   ∂C/∂y_i = 4 Σ_j (p_ij − q_ij)·(y_i − y_j)·(1+‖y_i−y_j‖²)⁻¹.
  let Y = Array.from({ length: n }, () => Array.from({ length: d }, () => (__rng() - 0.5) * 0.01));
  let vel = Array.from({ length: n }, () => Array(d).fill(0));
  for (let iter = 0; iter < maxIter; iter++) {
    const exag = iter < 100 ? 4 : 1;
    const momentum = iter < 100 ? 0.5 : 0.8;
    const num = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
      if (i === j) return 0; let s = 0; for (let k = 0; k < d; k++) s += (Y[i][k] - Y[j][k]) ** 2; return 1 / (1 + s);
    }));
    let sumNum = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) sumNum += num[i][j];
    sumNum = sumNum || 1e-12;
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < d; k++) {
        let grad = 0;
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const q = num[i][j] / sumNum;
          grad += 4 * (exag * Pjoint[i][j] - q) * (Y[i][k] - Y[j][k]) * num[i][j];
        }
        vel[i][k] = momentum * vel[i][k] - lr * grad;
        Y[i][k] += vel[i][k];
      }
    }
  }
  // Centre the embedding.
  for (let k = 0; k < d; k++) { const m = avg(Y.map(y => y[k])); Y.forEach(y => { y[k] -= m; }); }
  return { test: 't-SNE', embedding: Y.slice(0, 20).map(r => r.map(v => +v.toFixed(4))), n, p, nComponents: d, apa: `t-SNE: ${n} points, ${d}-dim` };
}

// ── ISOMAP ────────────────────────────────────────────────────────
/** @param {number[][]} X */
export function isomap(X, { nNeighbors = 5, nComponents = 2 } = {}) {
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const dists = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    if (i === j) return 0;
    let s = 0;
    for (let k = 0; k < p; k++) s += (X[i][k] - X[j][k]) ** 2;
    return Math.sqrt(s);
  }));
  // Geometric distance
  const geoDist = dists.map(row => [...row].fill(Infinity));
  for (let i = 0; i < n; i++) geoDist[i][i] = 0;
  // Symmetrize the kNN adjacency (edge exists if EITHER point considers the
  // other a neighbor) before Floyd-Warshall. Without this, a directed edge set
  // (only using each point's OWN k nearest neighbors) stays substantially
  // asymmetric even after Floyd-Warshall's transitive closure (verified: 214 of
  // 400 cells still differed, by up to 0.21, on a 20-point connected test
  // manifold) — but classical MDS's double-centering step requires a symmetric
  // dissimilarity matrix, so an asymmetric geodesic-distance matrix silently
  // breaks jacobiEigen's symmetric-matrix assumption and invalidates the
  // resulting embedding.
  for (let i = 0; i < n; i++) {
    const neighbors = dists[i].map((d, j) => ({j, d})).filter(x => x.j !== i).sort((a, b) => a.d - b.d).slice(0, nNeighbors);
    for (const nb of neighbors) { geoDist[i][nb.j] = dists[i][nb.j]; geoDist[nb.j][i] = dists[i][nb.j]; }
  }
  // Floyd-Warshall
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (geoDist[i][k] + geoDist[k][j] < geoDist[i][j]) geoDist[i][j] = geoDist[i][k] + geoDist[k][j];
  }
  // MDS on geodesic
  const G = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => -0.5 * geoDist[i][j] * geoDist[i][j]));
  const rowMeans = G.map(r => avg(r));
  const grandMean = avg(rowMeans);
  const B = G.map((row, i) => row.map((v, j) => v - rowMeans[i] - rowMeans[j] + grandMean));
  const eig = jacobiEigen(B);
  // Classical-MDS coordinates are eigenvector * sqrt(eigenvalue) (as mds.js's
  // own classical MDS already does), not the raw unit-norm eigenvector — the
  // previous version omitted this scale factor, so every retained dimension
  // got equal unit weight regardless of how much variance it actually
  // explained, badly distorting the embedding's relative axis scales whenever
  // the eigenvalues aren't all similar in magnitude (verified against
  // scikit-learn's Isomap on a near-1D helix: sklearn's second coordinate is
  // near-degenerate, ~0.1 vs. a first coordinate spanning ~14, while the old
  // unscaled code gave the two coordinates comparable magnitude).
  const embedding = Array.from({length: n}, (_, i) => eig.eigenvectors.slice(0, nComponents).map((vec, d) => {
    const lam = eig.eigenvalues[d];
    return +((lam > 0 ? vec[i] * Math.sqrt(lam) : 0) || 0).toFixed(4);
  }));
  return { test: 'ISOMAP', embedding: embedding.slice(0, 20), n, p, nComponents, apa: `ISOMAP: ${n} points, ${nComponents}-dim` };
}

// ── LLE (Locally Linear Embedding) ────────────────────────────────
/** @param {number[][]} X */
export function lle(X, { nNeighbors = 5, nComponents = 2 } = {}) {
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length, k = Math.min(nNeighbors, n - 1);
  const dists = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    if (i === j) return Infinity;
    let s = 0;
    for (let t = 0; t < p; t++) s += (X[i][t] - X[j][t]) ** 2;
    return Math.sqrt(s);
  }));
  // Reconstruction weights: minimize ‖x_i − Σ_a w_a x_{nb_a}‖² s.t. Σ_a w_a = 1.
  // Solve the local Gram system C·w = 1 (regularised), then normalise to sum 1.
  let reconSS = 0;
  const W = Array.from({ length: n }, (_, i) => {
    const neighbors = dists[i].map((d, j) => ({ j, d })).sort((a, b) => a.d - b.d).slice(0, k);
    const C = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => {
      let s = 0;
      for (let t = 0; t < p; t++) s += (X[neighbors[a].j][t] - X[i][t]) * (X[neighbors[b].j][t] - X[i][t]);
      return s;
    }));
    let tr = 0; for (let a = 0; a < k; a++) tr += C[a][a];
    const reg = 1e-3 * (tr > 0 ? tr : 1) / k;             // Tikhonov regularisation for stability
    for (let a = 0; a < k; a++) C[a][a] += reg;
    let w = solveNormalEquations(C, Array(k).fill(1));
    const sw = w.reduce((s, v) => s + v, 0);
    w = Math.abs(sw) > 1e-12 ? w.map(v => v / sw) : w.map(() => 1 / k);
    // Accumulate reconstruction error for diagnostics.
    for (let t = 0; t < p; t++) { let rec = 0; for (let a = 0; a < k; a++) rec += w[a] * X[neighbors[a].j][t]; reconSS += (X[i][t] - rec) ** 2; }
    const row = Array(n).fill(0);
    row[i] = 1;
    neighbors.forEach((nb, a) => { row[nb.j] = -w[a]; });
    return row;
  });
  const reconError = +(reconSS / n).toFixed(8);
  // Eigenvalue problem on (I-W)'(I-W)
  const M = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    let s = 0;
    for (let t = 0; t < n; t++) s += ((i === t ? 1 : 0) - W[i][t]) * ((j === t ? 1 : 0) - W[j][t]) || 0;
    return s;
  }));
  const eig = jacobiEigen(M);
  // Bottom non-trivial eigenvectors of M = (I−W)ᵀ(I−W). jacobiEigen sorts
  // descending, so the smallest are at the end; skip the trivial last one.
  const ascending = [...eig.eigenvalues.map((e, idx) => ({ e, vec: eig.eigenvectors[idx] }))].sort((a, b) => a.e - b.e);
  const chosen = ascending.slice(1, 1 + nComponents);
  const embedding = Array.from({ length: n }, (_, i) => chosen.map(c => +(c.vec[i] || 0).toFixed(4)));
  return { test: 'LLE', embedding: embedding.slice(0, 20), reconError, n, p, nComponents, apa: `LLE: ${n} points, ${nComponents}-dim` };
}

// ── UMAP-style simplified approximation ───────────────────────────
/** @param {number[][]} X */
export function umapApprox(X, { nNeighbors = 5, nComponents = 2, minDist = 0.1, seed = 42, epochs = 300, lr = 1 } = {}) {
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length, k = Math.min(nNeighbors, n - 1), d = nComponents;
  __rng = mulberry32(seed);
  // PCA initialisation.
  const cov = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    const mi = avg(X.map(r => r[i])), mj = avg(X.map(r => r[j]));
    let s = 0; for (let t = 0; t < n; t++) s += (X[t][i] - mi) * (X[t][j] - mj); return s / (n - 1);
  }));
  const eig = jacobiEigen(cov);
  let Y = Array.from({ length: n }, (_, i) => eig.eigenvectors.slice(0, d).map(vec => (vec[i] || 0) + (__rng() - 0.5) * 0.01));
  // Fuzzy kNN graph: membership μ_ij = exp(−max(0,dist−ρ_i)/σ_i), symmetrised by
  // the probabilistic t-conorm μ_ij + μ_ji − μ_ij·μ_ji (UMAP's fuzzy union).
  const dist = (a, b) => { let s = 0; for (let t = 0; t < p; t++) s += (X[a][t] - X[b][t]) ** 2; return Math.sqrt(s); };
  const neigh = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => ({ j, dd: i === j ? Infinity : dist(i, j) })).sort((a, b) => a.dd - b.dd).slice(0, k));
  const mem = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const rho = neigh[i][0].dd;
    const sigma = Math.max(avg(neigh[i].map(x => x.dd)) - rho, 1e-3);
    for (const { j, dd } of neigh[i]) mem[i][j] = Math.exp(-Math.max(0, dd - rho) / sigma);
  }
  const edges = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const w = mem[i][j] + mem[j][i] - mem[i][j] * mem[j][i];
    if (w > 1e-3) edges.push([i, j, w]);
  }
  // Attractive/repulsive SGD (LargeVis/UMAP optimisation with a=b=1).
  const clip = g => Math.max(-4, Math.min(4, g));
  const nNeg = 5, gamma = 1;
  for (let e = 0; e < epochs; e++) {
    const alpha = lr * (1 - e / epochs);
    for (const [i, j, w] of edges) {
      let dd2 = 0; for (let t = 0; t < d; t++) dd2 += (Y[i][t] - Y[j][t]) ** 2;
      const aCoef = (2 / (1 + dd2)) * w; // pull i and j together
      for (let t = 0; t < d; t++) { const g = clip(aCoef * (Y[j][t] - Y[i][t])); Y[i][t] += alpha * g; Y[j][t] -= alpha * g; }
      for (let s = 0; s < nNeg; s++) {
        const kk = Math.floor(__rng() * n); if (kk === i) continue;
        let r2 = 0; for (let t = 0; t < d; t++) r2 += (Y[i][t] - Y[kk][t]) ** 2;
        const rCoef = (2 * gamma) / ((0.001 + r2) * (1 + r2)); // push i and kk apart
        for (let t = 0; t < d; t++) Y[i][t] += alpha * clip(rCoef * (Y[i][t] - Y[kk][t]));
      }
    }
  }
  const embedding = Y.slice(0, 20).map(r => r.map(v => +v.toFixed(4)));
  return { test: 'UMAP (Approx)', embedding, n, p, nComponents: d, apa: `UMAP approx: ${n} points, ${nComponents}-dim` };
}
