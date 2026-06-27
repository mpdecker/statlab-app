import { avg } from '../math/core.js';
import { matInv, jacobiEigen } from '../math/matrix.js';

// Classical MDS (Torgerson)
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

// Sammon Mapping
export function sammonMapping(data, vars, { nDimensions = 2, maxIter = 50 } = {}) {
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
  let points = init ? init.points : Array.from({ length: n }, () => Array(nDimensions).fill(0).map(() => (Math.random() - 0.5)));

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

// Non-Metric MDS (Shepard-Kruskal)
export function nonMetricMDS(data, vars, { nDimensions = 2, maxIter = 50 } = {}) {
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
  let points = init ? init.points : Array.from({ length: n }, () => Array(nDimensions).fill(0).map(() => (Math.random() - 0.5)));

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
