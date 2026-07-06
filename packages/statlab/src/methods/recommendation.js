import { avg } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Collaborative Filtering (user-based) ──────────────────────────
/** @param {number[][]} ratings */
export function collaborativeFilter(ratings, { nNeighbors = 5 } = {}) {
  if (!ratings || !ratings.length) return null;
  const nUsers = ratings.length, nItems = ratings[0]?.length || 0;
  if (nUsers < 3 || nItems < 2) return null;
  const predictions = Array.from({length: nUsers}, (_, u) => Array(nItems).fill(null));
  for (let u = 0; u < nUsers; u++) {
    const ur = ratings[u];
    const sim = ratings.map((vr, v) => {
      if (v === u) return 0;
      let num = 0, d1 = 0, d2 = 0;
      for (let i = 0; i < nItems; i++) {
        if (ur[i] != null && vr[i] != null) {
          num += ur[i] * vr[i];
          d1 += ur[i] * ur[i];
          d2 += vr[i] * vr[i];
        }
      }
      return Math.sqrt(d1 * d2) > 0 ? num / Math.sqrt(d1 * d2) : 0;
    });
    const neighbors = sim.map((s, v) => ({v, s})).sort((a, b) => b.s - a.s).slice(0, nNeighbors).filter(n => n.s > 0);
    for (let i = 0; i < nItems; i++) {
      if (ur[i] == null && neighbors.length > 0) {
        let num = 0, den = 0;
        for (const nbr of neighbors) {
          if (ratings[nbr.v][i] != null) {
            num += nbr.s * ratings[nbr.v][i];
            den += Math.abs(nbr.s);
          }
        }
        if (den > 0) predictions[u][i] = +(num / den).toFixed(4);
      }
    }
  }
  return { test: 'Collaborative Filter', nUsers, nItems, nNeighbors, predictions: predictions.slice(0, 5).map(r => r.slice(0, 5)), apa: `CF: ${nUsers} users, ${nItems} items` };
}

// ── Matrix Factorization (SVD-based) ──────────────────────────────
/** @param {number} [k] @param {number[][]} R */
export function matrixFactorize(R, k = 3, { seed = 42, steps = 30, lr = 0.01, lambda = 0.1 } = {}) {
  __rng = mulberry32(seed);
  if (!R || !R.length || !R[0] || k < 1) return null;
  const m = R.length, n = R[0].length;
  let U = Array.from({length: m}, () => Array.from({length: k}, () => __rng()));
  let V = Array.from({length: n}, () => Array.from({length: k}, () => __rng()));
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (R[i][j] == null) continue;
        let pred = 0;
        for (let f = 0; f < k; f++) pred += U[i][f] * V[j][f];
        const err = R[i][j] - pred;
        for (let f = 0; f < k; f++) {
          U[i][f] += lr * (err * V[j][f] - lambda * U[i][f]);
          V[j][f] += lr * (err * U[i][f] - lambda * V[j][f]);
        }
      }
    }
  }
  const reconstructed = Array.from({length: m}, (_, i) => Array.from({length: n}, (_, j) => {
    let s = 0;
    for (let f = 0; f < k; f++) s += U[i][f] * V[j][f];
    return +s.toFixed(4);
  }));
  return { test: 'Matrix Factorization', reconstructed: reconstructed.slice(0, 5).map(r => r.slice(0, 5)), k, m, n, apa: `MF: ${m}x${n}, k=${k}` };
}

// ── Top-N Recommendations ─────────────────────────────────────────
/** @param {number[][]} ratings @param {number} userIndex */
export function topNRecommend(ratings, userIndex, { n = 5, excludeRated = true } = {}) {
  if (!ratings || !ratings.length || userIndex == null || userIndex >= ratings.length) return null;
  const ur = ratings[userIndex];
  const scores = ur.map((r, i) => ({ item: i, score: r != null ? r : 0 }));
  if (excludeRated) {
    const recommendations = scores.filter(s => ur[s.item] == null).sort((a, b) => b.score - a.score).slice(0, n);
    return { test: 'Top-N Recommendations', recommendations, n, userIndex, apa: `Top-${n}: user ${userIndex}` };
  }
  return { test: 'Top-N Recommendations', recommendations: scores.sort((a, b) => b.score - a.score).slice(0, n), n, userIndex, apa: `Top-${n}: user ${userIndex}` };
}
