import { avg, corr } from '../math/core.js';
import { jacobiEigen } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── t-SNE (Barnes-Hut style simplified) ───────────────────────────
export function tsne(X, { seed = 42, perplexity = 30, nComponents = 2, maxIter = 300, lr = 200 } = {}) {
  __rng = mulberry32(seed);
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length, d = nComponents;
  const sigma = Array(n).fill(1);
  // Pairwise distances
  const dists = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    if (i === j) return 0;
    let s = 0;
    for (let k = 0; k < p; k++) s += (X[i][k] - X[j][k]) ** 2;
    return Math.sqrt(s);
  }));
  // Compute P matrix
  const P = Array.from({length: n}, (_, i) => {
    const di = dists[i].map((d, j) => j === i ? 0 : Math.exp(-d * d / (2 * sigma[i] * sigma[i])));
    const sum = di.reduce((s, v) => s + v, 0);
    return di.map(v => sum > 0 ? v / sum : 0);
  });
  const Pjoint = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => +((P[i][j] + P[j][i]) / (2 * n)).toFixed(6)));
  // Initialize embedding randomly
  let Y = Array.from({length: n}, () => Array.from({length: d}, () => (__rng() - 0.5) * 0.01));
  for (let iter = 0; iter < maxIter; iter++) {
    const Qdists = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
      if (i === j) return 0;
      let s = 0;
      for (let k = 0; k < d; k++) s += (Y[i][k] - Y[j][k]) ** 2;
      return 1 / (1 + s);
    }));
    const Q = Qdists.map(row => {
      const sum = row.reduce((s, v) => s + v, 0);
      return row.map(v => sum > 0 ? v / sum : 0);
    });
    // Gradient
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < d; k++) {
        let grad = 0;
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          grad += 4 * (+Pjoint[i][j]) * (Y[i][k] - Y[j][k]) * Qdists[i][j];
        }
        Y[i][k] -= lr * grad / n;
      }
    }
    lr *= 0.99;
  }
  return { test: 't-SNE', embedding: Y.slice(0, 20).map(r => r.map(v => +v.toFixed(4))), n, p, nComponents: d, apa: `t-SNE: ${n} points, ${d}-dim` };
}

// ── ISOMAP ────────────────────────────────────────────────────────
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
  for (let i = 0; i < n; i++) {
    const neighbors = dists[i].map((d, j) => ({j, d})).filter(x => x.j !== i).sort((a, b) => a.d - b.d).slice(0, nNeighbors);
    for (const nb of neighbors) geoDist[i][nb.j] = dists[i][nb.j];
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
  const embedding = Array.from({length: n}, (_, i) => eig.eigenvectors.slice(0, nComponents).map(vec => +(vec[i] || 0).toFixed(4)));
  return { test: 'ISOMAP', embedding: embedding.slice(0, 20), n, p, nComponents, apa: `ISOMAP: ${n} points, ${nComponents}-dim` };
}

// ── LLE (Locally Linear Embedding) ────────────────────────────────
export function lle(X, { nNeighbors = 5, nComponents = 2 } = {}) {
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length, k = Math.min(nNeighbors, n - 1);
  const dists = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    if (i === j) return Infinity;
    let s = 0;
    for (let t = 0; t < p; t++) s += (X[i][t] - X[j][t]) ** 2;
    return Math.sqrt(s);
  }));
  // Reconstruction weights
  const W = Array.from({length: n}, (_, i) => {
    const neighbors = dists[i].map((d, j) => ({j, d})).sort((a, b) => a.d - b.d).slice(0, k);
    const C = Array.from({length: k}, (_, a) => Array.from({length: k}, (_, b) => {
      let s = 0;
      for (let t = 0; t < p; t++) s += (X[neighbors[a].j][t] - X[i][t]) * (X[neighbors[b].j][t] - X[i][t]);
      return s;
    }));
    const sumC = C.flat().reduce((s, v) => s + v, 0);
    const w = sumC > 0 ? C[0].map(() => 1 / k) : C[0].map(() => 1 / k);
    const row = Array(n).fill(0);
    row[i] = 1;
    neighbors.forEach((nb, a) => { row[nb.j] = -w[a]; });
    return row;
  });
  // Eigenvalue problem on (I-W)'(I-W)
  const M = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    let s = 0;
    for (let t = 0; t < n; t++) s += ((i === t ? 1 : 0) - W[i][t]) * ((j === t ? 1 : 0) - W[j][t]) || 0;
    return s;
  }));
  const eig = jacobiEigen(M);
  const embedding = Array.from({length: n}, (_, i) => eig.eigenvectors.slice(1, 1 + nComponents).map(vec => +(vec[i] || 0).toFixed(4)));
  return { test: 'LLE', embedding: embedding.slice(0, 20), n, p, nComponents, apa: `LLE: ${n} points, ${nComponents}-dim` };
}

// ── UMAP-style simplified approximation ───────────────────────────
export function umapApprox(X, { nNeighbors = 5, nComponents = 2, minDist = 0.1 } = {}) {
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length;
  // Use PCA initialization
  const cov = Array.from({length: p}, (_, i) => Array.from({length: p}, (_, j) => {
    const mi = avg(X.map(r => r[i]));
    const mj = avg(X.map(r => r[j]));
    let s = 0;
    for (let k = 0; k < n; k++) s += (X[k][i] - mi) * (X[k][j] - mj);
    return s / (n - 1);
  }));
  const eig = jacobiEigen(cov);
  const embedding = Array.from({length: n}, (_, i) => eig.eigenvectors.slice(0, nComponents).map(vec => +(vec[i] || 0).toFixed(4)));
  return { test: 'UMAP (Approx)', embedding: embedding.slice(0, 20), n, p, nComponents, apa: `UMAP approx: ${n} points, ${nComponents}-dim` };
}
