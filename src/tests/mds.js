import { avg } from '../math/core.js';
import { matInv, jacobiEigen } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

// Pool-adjacent-violators isotonic regression: best monotone non-decreasing
// least-squares fit to y (used to turn distances into MDS disparities).
function pava(y) {
  const blocks = [];
  for (const v of y) {
    let b = { sum: v, w: 1, val: v };
    while (blocks.length && blocks[blocks.length - 1].val >= b.val) {
      const last = blocks.pop();
      b = { sum: b.sum + last.sum, w: b.w + last.w, val: (b.sum + last.sum) / (b.w + last.w) };
    }
    blocks.push(b);
  }
  const out = [];
  for (const b of blocks) for (let k = 0; k < b.w; k++) out.push(b.val);
  return out;
}

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Classical MDS (Torgerson) ─────────────────────────────────────
export function classicalMDS(data, vars, { nDimensions = 2 } = {}) {
  if (!data || data.length < 5 || !vars || vars.length < 2) return null;
  const n = data.length, m = vars.length;
  const X = data.map(r => vars.map(v => +r[v]));
  if (X.some(r => r.some(v => !Number.isFinite(v)))) return null;

  // Distance matrix
  const D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (i === j) return 0;
    let s = 0;
    for (let k = 0; k < m; k++) s += (X[i][k] - X[j][k]) ** 2;
    return Math.sqrt(s);
  }));

  // Double-centering: B = -0.5 * J * D² * J
  const D2 = D.map(r => r.map(v => v * v));
  const rowMeans = D2.map(r => avg(r));
  const grandMean = avg(rowMeans);
  const B = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) =>
    -0.5 * (D2[i][j] - rowMeans[i] - rowMeans[j] + grandMean)
  ));

  // Eigendecomposition: pair eigenvalues with their eigenvectors and sort
  // descending. The embedding coordinate is eᵢⱼ = vⱼ(i)·√λⱼ; dimensions beyond
  // the number of positive eigenvalues (degenerate/low-rank data) are zero.
  const eigs = jacobiEigen(B);
  const pairs = eigs.eigenvalues.map((e, idx) => ({ e, vec: eigs.eigenvectors[idx] })).sort((a, b) => b.e - a.e);
  const usedDims = Math.min(nDimensions, pairs.filter(p => p.e > 1e-8).length);

  const points = Array.from({ length: n }, (_, i) =>
    Array.from({ length: nDimensions }, (_, d) => {
      const pr = pairs[d];
      if (!pr || pr.e <= 1e-8) return 0;
      return +(pr.vec[i] * Math.sqrt(pr.e)).toFixed(4);
    })
  );

  let stress = 0, dTotal = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let dHat = 0;
      for (let d = 0; d < nDimensions; d++) dHat += (points[i][d] - points[j][d]) ** 2;
      dHat = Math.sqrt(dHat);
      stress += (D[i][j] - dHat) ** 2;
      dTotal += D[i][j] ** 2;
    }
  }
  stress = stress / Math.max(dTotal, 1e-10);

  return {
    test: 'Classical MDS', points, nDimensions: usedDims, stress: +stress.toFixed(4), n,
    apa: `Classical MDS: ${usedDims}D, stress = ${stress.toFixed(3)}, n = ${n}`,
  };
}

// ── Sammon Mapping ────────────────────────────────────────────────
export function sammonMapping(data, vars, { seed = 42, nDimensions = 2, maxIter = 50 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 5 || !vars || vars.length < 2) return null;
  const n = data.length, m = vars.length;
  const X = data.map(r => vars.map(v => +r[v]));
  if (X.some(r => r.some(v => !Number.isFinite(v)))) return null;

  // Distance matrix
  const D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (i === j) return 0;
    let s = 0;
    for (let k = 0; k < m; k++) s += (X[i][k] - X[j][k]) ** 2;
    return Math.sqrt(Math.max(s, 1e-10));
  }));

  // Initialize from classical MDS
  const init = classicalMDS(data, vars, { nDimensions });
  let points = init ? init.points : Array.from({ length: n }, () => Array(nDimensions).fill(0).map(() => (__rng() - 0.5)));

  for (let iter = 0; iter < maxIter; iter++) {
    const grad = points.map(() => Array(nDimensions).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dHat = 0;
        for (let d = 0; d < nDimensions; d++) dHat += (points[i][d] - points[j][d]) ** 2;
        dHat = Math.sqrt(Math.max(dHat, 1e-10));
        const term = (D[i][j] - dHat) / (D[i][j] * dHat + 1e-10);
        for (let d = 0; d < nDimensions; d++) {
          const gd = term * (points[i][d] - points[j][d]);
          grad[i][d] += gd;
          grad[j][d] -= gd;
        }
      }
    }
    const lr = 0.3 / (1 + 0.01 * iter);
    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < nDimensions; d++) {
        const delta = lr * grad[i][d];
        points[i][d] -= delta;
        maxDelta = Math.max(maxDelta, Math.abs(delta));
      }
    }
    if (maxDelta < 1e-6) break;
  }

  return {
    test: 'Sammon Mapping', points, nDimensions, n,
    apa: `Sammon mapping: ${nDimensions}D, n = ${n}`,
  };
}

// ── Non-Metric MDS (Shepard-Kruskal) ──────────────────────────────
export function nonMetricMDS(data, vars, { seed = 42, nDimensions = 2, maxIter = 100, dissimilarities = null } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 6 || !vars || vars.length < 2) return null;
  const n = data.length, m = vars.length;
  // Dissimilarity matrix: a supplied matrix, else Euclidean distances of the vars.
  let D;
  if (dissimilarities) {
    D = dissimilarities;
  } else {
    const X = data.map(r => vars.map(v => +r[v]));
    if (X.some(r => r.some(v => !Number.isFinite(v)))) return null;
    D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
      if (i === j) return 0;
      let s = 0; for (let k = 0; k < m; k++) s += (X[i][k] - X[j][k]) ** 2;
      return Math.sqrt(Math.max(s, 1e-10));
    }));
  }

  // Classical-MDS initial configuration from D (double-centre D², eigendecompose).
  const D2 = D.map(r => r.map(v => v * v));
  const rm = D2.map(r => avg(r)); const gm = avg(rm);
  const Binit = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => -0.5 * (D2[i][j] - rm[i] - rm[j] + gm)));
  const eig = jacobiEigen(Binit);
  const epairs = eig.eigenvalues.map((e, idx) => ({ e, vec: eig.eigenvectors[idx] })).sort((a, b) => b.e - a.e);
  let points = Array.from({ length: n }, (_, i) => Array.from({ length: nDimensions }, (_, d) => {
    const pr = epairs[d]; return pr && pr.e > 1e-8 ? pr.vec[i] * Math.sqrt(pr.e) : (__rng() - 0.5);
  }));

  // Ordered off-diagonal pairs (ascending dissimilarity) for the isotonic step.
  const pairsList = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairsList.push({ i, j });
  pairsList.sort((a, b) => D[a.i][a.j] - D[b.i][b.j]);

  let stress = 1;
  const dist = (i, j) => { let s = 0; for (let d = 0; d < nDimensions; d++) s += (points[i][d] - points[j][d]) ** 2; return Math.sqrt(Math.max(s, 1e-12)); };
  for (let iter = 0; iter < maxIter; iter++) {
    const dHat = pairsList.map(p => dist(p.i, p.j));
    // Disparities: PAVA of the current distances in dissimilarity order (Kruskal's
    // monotone regression), giving the best monotone-increasing targets.
    const dstar = pava(dHat);
    let num = 0, den = 0;
    for (let k = 0; k < pairsList.length; k++) { num += (dHat[k] - dstar[k]) ** 2; den += dHat[k] ** 2; }
    stress = Math.sqrt(den > 0 ? num / den : 0); // Kruskal stress-1
    if (stress < 1e-6) break;
    // SMACOF Guttman transform toward the disparities.
    const B = Array.from({ length: n }, () => Array(n).fill(0));
    for (let k = 0; k < pairsList.length; k++) {
      const { i, j } = pairsList[k];
      const b = dHat[k] > 1e-10 ? -dstar[k] / dHat[k] : 0;
      B[i][j] = b; B[j][i] = b;
    }
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) if (j !== i) s += B[i][j]; B[i][i] = -s; }
    points = Array.from({ length: n }, (_, i) => Array.from({ length: nDimensions }, (_, d) => {
      let acc = 0; for (let j = 0; j < n; j++) acc += B[i][j] * points[j][d];
      return acc / n;
    }));
  }

  return {
    test: 'Non-Metric MDS', points, nDimensions, stress: +stress.toFixed(4), n,
    apa: `Non-metric MDS: ${nDimensions}D, stress = ${stress.toFixed(3)}, n = ${n}`,
  };
}

// ── Sammon Mapping (distance matrix input) ────────────────────────
export function sammonMappingDM(D, { seed = 42, nDim = 2, maxIter = 50, lr = 0.1 } = {}) {
  __rng = mulberry32(seed);
  if (!D || D.length < 3 || !D[0]) return null;
  const n = D.length;
  let Y = Array.from({length: n}, () => Array.from({length: nDim}, () => (__rng() - 0.5) * 0.1));
  let stress = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    stress = 0;
    const grad = Array.from({length: n}, () => Array(nDim).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (D[i][j] < 1e-10) continue;
        let dy = 0;
        for (let k = 0; k < nDim; k++) dy += (Y[i][k] - Y[j][k]) ** 2;
        dy = Math.sqrt(dy) || 1e-10;
        stress += ((D[i][j] - dy) ** 2) / D[i][j];
        const term = (D[i][j] - dy) / (D[i][j] * dy);
        for (let k = 0; k < nDim; k++) {
          const g = term * (Y[i][k] - Y[j][k]);
          grad[i][k] += g; grad[j][k] -= g;
        }
      }
    }
    for (let i = 0; i < n; i++) for (let k = 0; k < nDim; k++) Y[i][k] -= lr * grad[i][k] / n;
  }
  return { test: 'Sammon Mapping', points: Y.slice(0, 15).map(r => r.map(v => +v.toFixed(4))), stress: +stress.toFixed(4), n, apa: `Sammon: stress=${stress.toFixed(2)}` };
}

// ── Landmark MDS ──────────────────────────────────────────────────
export function landmarkMDS(D, { seed = 42, nLandmarks = 10, nDim = 2 } = {}) {
  __rng = mulberry32(seed);
  if (!D || D.length < nLandmarks + 2) return null;
  const n = D.length;
  const L = Math.min(nLandmarks, n);
  const landmarks = [...Array(n).keys()].sort(() => __rng() - 0.5).slice(0, L);
  // Classical MDS on the landmark squared-distance submatrix Δ (de Silva & Tenenbaum).
  const Delta = landmarks.map(li => landmarks.map(lj => D[li][lj] ** 2));
  const rowMean = Delta.map(r => avg(r));
  const grand = avg(rowMean);
  const Bl = Delta.map((row, i) => row.map((v, j) => -0.5 * (v - rowMean[i] - rowMean[j] + grand)));
  const { eigenvalues, eigenvectors } = jacobiEigen(Bl);
  const dims = eigenvalues.map((e, idx) => ({ e, vec: eigenvectors[idx] })).sort((a, b) => b.e - a.e)
    .slice(0, nDim).filter(p => p.e > 1e-8);
  // Distance-based triangulation: place every point a (landmark or not) by
  //   x_a[k] = −½ · (1/√λ_k) · Σ_i v_k[i] (‖a−Lᵢ‖² − δ̄ᵢ),  δ̄ᵢ = mean_j Δ[i][j].
  const points = Array.from({ length: n }, (_, a) => dims.map(pr => {
    let acc = 0;
    for (let i = 0; i < L; i++) { const da = D[a][landmarks[i]] ** 2; acc += (pr.vec[i] / Math.sqrt(pr.e)) * (da - rowMean[i]); }
    return +(-0.5 * acc).toFixed(4);
  }));
  return { test: 'Landmark MDS', points: points.slice(0, 15), nLandmarks: L, nDim: dims.length, n, apa: `Landmark MDS: ${L} landmarks, n=${n}` };
}
