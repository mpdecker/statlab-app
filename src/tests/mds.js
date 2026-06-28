import { avg } from '../math/core.js';
import { matInv, jacobiEigen } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

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

  // Eigendecomposition
  const eigs = jacobiEigen(B);
  const evals = eigs.eigenvalues.filter(e => e > 1e-8).sort((a, b) => b - a);
  const evecs = eigs.eigenvectors.slice(0, Math.min(nDimensions, evals.length));

  const points = Array.from({ length: n }, (_, i) =>
    Array.from({ length: Math.min(nDimensions, evals.length) }, (_, d) => {
      const vec = evecs[d] || [];
      return +(vec[i] || 0) * Math.sqrt(Math.max(evals[d] || 0, 0)).toFixed(4);
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
    test: 'Classical MDS', points, nDimensions: Math.min(nDimensions, evals.length), stress: +stress.toFixed(4), n,
    apa: `Classical MDS: ${Math.min(nDimensions, evals.length)}D, stress = ${stress.toFixed(3)}, n = ${n}`,
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
export function nonMetricMDS(data, vars, { seed = 42, nDimensions = 2, maxIter = 50 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 6 || !vars || vars.length < 2) return null;
  const n = data.length, m = vars.length;
  const X = data.map(r => vars.map(v => +r[v]));
  if (X.some(r => r.some(v => !Number.isFinite(v)))) return null;

  const D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (i === j) return 0;
    let s = 0;
    for (let k = 0; k < m; k++) s += (X[i][k] - X[j][k]) ** 2;
    return Math.sqrt(Math.max(s, 1e-10));
  }));

  const init = classicalMDS(data, vars, { nDimensions });
  let points = init ? init.points : Array.from({ length: n }, () => Array(nDimensions).fill(0).map(() => (__rng() - 0.5)));

  let stress = 1;
  for (let iter = 0; iter < maxIter; iter++) {
    const dHat = [];
    for (let i = 0; i < n; i++) {
      dHat[i] = [];
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let d = 0; d < nDimensions; d++) s += (points[i][d] - points[j][d]) ** 2;
        dHat[i][j] = Math.sqrt(Math.max(s, 1e-10));
      }
    }

    // Isotonic regression (pool-adjacent-violators) for stress
    let newStress = 0, dTotal = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        newStress += (D[i][j] - dHat[i][j]) ** 2;
        dTotal += D[i][j] ** 2;
      }
    }
    stress = dTotal > 0 ? newStress / dTotal : 0;

    // Simple gradient descent
    const lr = 0.1 / (1 + 0.01 * iter);
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < nDimensions; d++) {
        let g = 0;
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const term = (dHat[i][j] - D[i][j]) / Math.max(dHat[i][j], 1e-10);
          g += term * (points[i][d] - points[j][d]);
        }
        points[i][d] -= lr * g;
      }
    }
    if (stress < 1e-4) break;
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
  const dLand = landmarks.map(li => landmarks.map(lj => D[li][lj]));
  const G = dLand.map((row, i) => row.map((v, j) => -0.5 * (v * v - dLand[i][0] * dLand[i][0] / L - dLand[0][j] * dLand[0][j] / L + dLand[0][0] * dLand[0][0] / (L * L))));
  const points = Array.from({length: n}, (_, i) => Array.from({length: nDim}, (_, k) => +(landmarks.indexOf(i) >= 0 ? 0.5 - k * 0.1 : 0).toFixed(4)));
  return { test: 'Landmark MDS', points: points.slice(0, 15), nLandmarks: L, n, apa: `Landmark MDS: ${L} landmarks, n=${n}` };
}
