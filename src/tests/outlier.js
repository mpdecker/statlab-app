import { avg } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Local Outlier Factor ──────────────────────────────────────────
export function localOutlierFactor(X, { k = 5 } = {}) {
  if (!X || X.length < k + 2 || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const dists = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    if (i === j) return Infinity;
    let s = 0;
    for (let t = 0; t < p; t++) s += (X[i][t] - X[j][t]) ** 2;
    return Math.sqrt(s);
  }));
  const kDists = dists.map(row => [...row].sort((a, b) => a - b)[k - 1]);
  const lof = Array.from({length: n}, (_, i) => {
    const neighbors = dists[i].map((d, j) => ({j, d})).filter(x => x.j !== i && x.d <= kDists[i]).slice(0, k);
    if (!neighbors.length) return 0;
    const lrd = k / neighbors.reduce((s, nb) => s + Math.max(nb.d, kDists[nb.j] || 1), 0);
    let lrdSum = 0;
    for (const nb of neighbors) {
      const nbNeighbors = dists[nb.j].map((d, jj) => ({jj, d})).filter(x => x.jj !== nb.j && x.d <= kDists[nb.j]).slice(0, k);
      lrdSum += nbNeighbors.length > 0 ? k / nbNeighbors.reduce((s2, nn) => s2 + Math.max(nn.d, kDists[nn.jj] || 1), 0) : 0;
    }
    return lrd > 0 ? +(lrdSum / (neighbors.length * lrd)).toFixed(4) : 0;
  });
  const threshold = avg(lof) + 2 * Math.sqrt(lof.reduce((s, v) => s + (v - avg(lof)) ** 2, 0) / (n - 1));
  const outliers = lof.map((v, i) => ({ index: i, lof: v, outlier: v > threshold })).filter(o => o.outlier);
  return { test: 'Local Outlier Factor', lof: lof.slice(0, 20), outliers: outliers.slice(0, 10), threshold: +threshold.toFixed(4), k, n, apa: `LOF: ${outliers.length} outliers (k=${k})` };
}

// ── Isolation Forest (simplified) ─────────────────────────────────
export function isolationForest(X, { seed = 42, nTrees = 50, sampleSize = 64 } = {}) {
  __rng = mulberry32(seed);
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, p = X[0].length;
  const anomalyScores = Array(n).fill(0);
  const actualSample = Math.min(sampleSize, n);
  for (let t = 0; t < nTrees; t++) {
    const sample = [...Array(n).keys()].sort(() => __rng() - 0.5).slice(0, actualSample);
    const depths = sample.map(i => {
      const remaining = [...sample];
      let depth = 0, subset = remaining;
      while (subset.length > 1 && depth < 20) {
        const feat = Math.floor(__rng() * p);
        const vals = subset.map(j => X[j][feat]);
        const split = Math.min(...vals) + __rng() * (Math.max(...vals) - Math.min(...vals));
        subset = subset.filter(j => X[j][feat] <= split);
        if (!subset.length) subset = remaining.filter(j => X[j][feat] > split);
        depth++;
      }
      return depth;
    });
    sample.forEach((i, idx) => { anomalyScores[i] += depths[idx]; });
  }
  const avgDepths = anomalyScores.map(v => v / nTrees);
  const c = 2 * (Math.log(actualSample - 1) + 0.577) - 2 * (actualSample - 1) / actualSample;
  const scores = avgDepths.map(d => +Math.pow(2, -d / (c || 1)).toFixed(4));
  const threshold = avg(scores) + 1.5 * Math.sqrt(scores.reduce((s, v) => s + (v - avg(scores)) ** 2, 0) / (n - 1));
  const outliers = scores.map((v, i) => ({ index: i, score: v, outlier: v > threshold })).filter(o => o.outlier);
  return { test: 'Isolation Forest', scores: scores.slice(0, 20), outliers: outliers.slice(0, 10), threshold: +threshold.toFixed(4), nTrees, apa: `iForest: ${outliers.length} outliers` };
}
