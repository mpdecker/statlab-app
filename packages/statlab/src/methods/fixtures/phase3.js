/** Deterministic fixtures for Phase 3 module tests */

// Single source of truth for the seeded PRNG — re-exported so existing fixture
// consumers keep importing `mulberry32` from here.
export { mulberry32 } from '../../math/rng.js';
import { mulberry32 } from '../../math/rng.js';

export function itemMatrix(n = 40, k = 5, seed = 42) {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: k }, (_, j) => +(i * 0.2 + j * 0.5 + rnd() * 0.3).toFixed(4)));
}

export function itemRows(n = 40, vars = ['x1', 'x2', 'x3', 'x4'], seed = 42) {
  const m = itemMatrix(n, vars.length, seed);
  return m.map((row, i) => {
    const r = { id: i };
    vars.forEach((v, j) => { r[v] = row[j]; });
    return r;
  });
}

export function binaryMatrix(n = 50, k = 6, seed = 7, threshold = 2) {
  const m = itemMatrix(n, k, seed);
  return m.map(row => row.map(v => (v > threshold ? 1 : 0)));
}

/** Two well-separated blobs + noise for clustering */
export function clusterRows(n = 60, seed = 11) {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => ({
    x: (i < n / 2 ? 1 : 8) + rnd() * 0.4,
    y: (i < n / 2 ? 2 : 9) + rnd() * 0.4,
    g: i < n / 2 ? 'A' : 'B',
    c1: i % 2 ? 'yes' : 'no',
    c2: i % 3 === 0 ? 'low' : i % 3 === 1 ? 'mid' : 'high',
  }));
}

export function nestedHLM({ schools = 10, pupilsPer = 15, seed = 99 } = {}) {
  const rnd = mulberry32(seed);
  const data = [];
  for (let s = 0; s < schools; s++) {
    const intercept = 40 + s * 4;
    const slope = 0.3 + s * 0.05;
    for (let i = 0; i < pupilsPer; i++) {
      const x = i + rnd();
      data.push({
        school: `S${s}`,
        y: intercept + slope * x + (rnd() - 0.5) * 2,
        x,
      });
    }
  }
  return data;
}

export function causalRows(n = 100, seed = 3) {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const x1 = i * 0.08 + rnd();
    const z = (i % 7) + rnd() * 0.2;
    const treat = i < n / 2 ? 'T' : 'C';
    const treated = treat === 'T';
    return {
      treat,
      y: 8 + (treated ? 4 : 0) + x1 * 0.5 + Math.sin(i * 0.2) + rnd(),
      x1,
      x2: Math.cos(i * 0.15) + rnd() * 0.1,
      z,
    };
  });
}

export function starEdgeList() {
  return 'Hub-A,Hub-B,Hub-C,Hub-D,A-B,B-C';
}

export function ringEdgeList(k = 6) {
  const nodes = Array.from({ length: k }, (_, i) => String.fromCharCode(65 + i));
  const edges = [];
  for (let i = 0; i < k; i++) edges.push(`${nodes[i]}-${nodes[(i + 1) % k]}`);
  return edges.join(',');
}
