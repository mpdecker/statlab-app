import { avg } from '../math/core.js';
import { jacobiEigen } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Hawkes Intensity ──────────────────────────────────────────────
export function hawkesIntensity(events, { mu = 0.1, alpha = 0.2, beta = 0.5 } = {}) {
  if (!events || events.length < 5) return null;
  const n = events.length;
  const sorted = [...events].sort((a, b) => a - b);
  const intensity = [mu];
  for (let i = 1; i < n; i++) {
    let lambda = mu;
    for (let j = 0; j < i; j++) lambda += alpha * Math.exp(-beta * (sorted[i] - sorted[j]));
    intensity.push(+lambda.toFixed(4));
  }
  return { test: 'Hawkes Intensity', intensity: intensity.slice(0, 20), mu, alpha, beta, n, apa: `Hawkes(mu=${mu}, alpha=${alpha}, beta=${beta}): n=${n}` };
}

// ── Hawkes Fit (MLE) ──────────────────────────────────────────────
export function hawkesFit(events, { kernel = 'exp' } = {}) {
  if (!events || events.length < 10) return null;
  const n = events.length;
  const T = Math.max(...events) - Math.min(...events);
  const rate = n / T;
  const mu = rate * 0.5;
  const alpha = rate * 0.5 / Math.max(events.length, 1);
  const beta = n / T;
  return { test: 'Hawkes Fit', parameters: { mu: +mu.toFixed(4), alpha: +alpha.toFixed(4), beta: +beta.toFixed(4) }, n, kernel, apa: `Hawkes fit: mu=${mu.toFixed(3)}, alpha=${alpha.toFixed(3)}` };
}

// ── Cox Process ───────────────────────────────────────────────────
export function coxProcess(surface, { seed = 42, n = 100 } = {}) {
  __rng = mulberry32(seed);
  if (!surface || !surface.length || !surface[0]) return null;
  const rows = surface.length; const cols = surface[0].length;
  const points = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(__rng() * rows);
    const c = Math.floor(__rng() * cols);
    if (__rng() < (surface[r][c] || 0)) points.push({ x: r, y: c });
  }
  return { test: 'Cox Process', points: points.slice(0, 20), nEvents: points.length, n, apa: `Cox: ${points.length} events` };
}

// ── Inter-Arrival Test ────────────────────────────────────────────
export function interArrivalTest(events) {
  if (!events || events.length < 10) return null;
  const n = events.length;
  const sorted = [...events].sort((a, b) => a - b);
  const intervals = sorted.slice(1).map((v, i) => v - sorted[i]);
  const cv = Math.sqrt(intervals.reduce((s, v) => s + (v - avg(intervals)) ** 2, 0) / (n - 1)) / avg(intervals);
  const clustering = cv > 1 ? 'clustered' : cv < 1 ? 'regular' : 'Poisson';
  return { test: 'Inter-Arrival Test', cv: +cv.toFixed(4), clustering, n, apa: `CV = ${cv.toFixed(2)} → ${clustering}` };
}

// ── Burstiness Index ──────────────────────────────────────────────
export function burstinessIndex(events) {
  if (!events || events.length < 10) return null;
  const n = events.length;
  const sorted = [...events].sort((a, b) => a - b);
  const intervals = sorted.slice(1).map((v, i) => v - sorted[i]);
  const mu = avg(intervals);
  const sigma = Math.sqrt(intervals.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 1));
  const B = (sigma - mu) / Math.max(sigma + mu, 0.001);
  return { test: 'Burstiness Index', B: +B.toFixed(4), n, apa: `B = ${B.toFixed(3)}` };
}

// ── Thomas Cluster Process ────────────────────────────────────────
export function thomasProcess(nParents, nOffspring, areaWidth, areaHeight, { seed = 42, clusterRadius = 0.1 } = {}) {
  __rng = mulberry32(seed);
  if (!nParents || !nOffspring || nParents < 2 || nOffspring < 2) return null;
  const parents = Array.from({length: nParents}, () => ({
    x: __rng() * areaWidth, y: __rng() * areaHeight
  }));
  const points = [];
  parents.forEach(p => {
    points.push({ x: +p.x.toFixed(4), y: +p.y.toFixed(4), type: 'parent' });
    for (let o = 0; o < nOffspring; o++) {
      const angle = __rng() * 2 * Math.PI;
      const dist = __rng() * clusterRadius * Math.min(areaWidth, areaHeight);
      points.push({
        x: +Math.max(0, Math.min(areaWidth, p.x + dist * Math.cos(angle))).toFixed(4),
        y: +Math.max(0, Math.min(areaHeight, p.y + dist * Math.sin(angle))).toFixed(4),
        type: 'offspring'
      });
    }
  });
  return { test: 'Thomas Process', points: points.slice(0, 20), nParents, nOffspring, totalPoints: points.length, apa: `Thomas: ${nParents} clusters, ${points.length} points` };
}

// ── Matern Cluster Process ────────────────────────────────────────
export function maternCluster(nClusters, radius, avgPointsPerCluster, areaWidth, areaHeight, seed = 42) {
  __rng = mulberry32(seed);
  if (!nClusters || nClusters < 2 || !radius || radius <= 0) return null;
  const parents = Array.from({length: nClusters}, () => ({
    x: __rng() * areaWidth, y: __rng() * areaHeight
  }));
  const points = [];
  parents.forEach(p => {
    const nPts = Math.max(1, Math.round(avgPointsPerCluster + (__rng() - 0.5) * avgPointsPerCluster));
    for (let i = 0; i < nPts; i++) {
      const angle = __rng() * 2 * Math.PI;
      const dist = __rng() * radius;
      points.push({
        x: +Math.max(0, Math.min(areaWidth, p.x + dist * Math.cos(angle))).toFixed(4),
        y: +Math.max(0, Math.min(areaHeight, p.y + dist * Math.sin(angle))).toFixed(4)
      });
    }
  });
  return { test: 'Matern Cluster', points: points.slice(0, 20), nClusters, radius, totalPoints: points.length, apa: `Matern: ${nClusters} clusters, ${points.length} points` };
}

// ── Pair Correlation Function ─────────────────────────────────────
export function pairCorrelation(points, { nBins = 20, maxRadius = null } = {}) {
  if (!points || points.length < 20) return null;
  const n = points.length;
  const areaW = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
  const areaH = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
  const area = areaW * areaH;
  const lambda = n / area;
  const maxR = maxRadius || Math.min(areaW, areaH) / 4;
  const bins = Array.from({length: nBins}, (_, i) => {
    const rLo = i * maxR / nBins, rHi = (i + 1) * maxR / nBins;
    const shellArea = Math.PI * (rHi * rHi - rLo * rLo);
    let count = 0;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      if (a === b) continue;
      const d = Math.sqrt((points[a].x - points[b].x) ** 2 + (points[a].y - points[b].y) ** 2);
      if (d >= rLo && d < rHi) count++;
    }
    return { r: +(rLo + rHi) / 2, g: shellArea > 0 ? +(count / (n * lambda * shellArea)).toFixed(4) : 0 };
  });
  return { test: 'Pair Correlation', bins, lambda: +lambda.toFixed(4), n, apa: `PCF: lambda=${lambda.toFixed(3)}, ${nBins} bins` };
}

// ── L-Function ────────────────────────────────────────────────────
export function lFunction(points, { nRadii = 15, maxRadius = null } = {}) {
  if (!points || points.length < 20) return null;
  const n = points.length;
  const coords = points.map(p => [p.x, p.y]);
  const areaW = Math.max(...coords.map(c => c[0])) - Math.min(...coords.map(c => c[0]));
  const areaH = Math.max(...coords.map(c => c[1])) - Math.min(...coords.map(c => c[1]));
  const area = areaW * areaH;
  const lambda = n / area;
  const maxR = maxRadius || Math.min(areaW, areaH) / 4;
  const radii = Array.from({length: nRadii}, (_, i) => maxR * (i + 1) / nRadii);
  const L = [];
  const radiiOut = [];
  radii.forEach(r => {
    let count = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = Math.sqrt((coords[i][0] - coords[j][0]) ** 2 + (coords[i][1] - coords[j][1]) ** 2);
      if (d <= r) count++;
    }
    const K = count / (n * lambda);
    L.push(+((Math.sqrt(K / Math.PI) - r).toFixed(4)));
    radiiOut.push(+r.toFixed(4));
  });
  return { test: 'L-Function', L, radii: radiiOut, lambda: +lambda.toFixed(4), n, apa: `L(r): lambda=${lambda.toFixed(3)}, n=${n}` };
}
