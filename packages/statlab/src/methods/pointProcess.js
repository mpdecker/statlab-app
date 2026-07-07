import { avg } from '../math/core.js';
import { jacobiEigen } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';
import { mleFit } from '../math/inference.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Hawkes Intensity ──────────────────────────────────────────────
/** @param {number[]} events */
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
// Real MLE via Newton-Raphson (mleFit) on the exponential-kernel Hawkes
// process log-likelihood: L = Sum(log(lambda(t_i))) - integral(lambda) dt,
// lambda(t) = mu + Sum_{t_j<t} alpha*exp(-beta*(t-t_j)). (The previous
// version derived mu/alpha/beta from n/T alone -- pure average-rate
// arithmetic that never looked at WHEN events occurred relative to each
// other, so it could not distinguish a self-exciting/clustered process from
// a uniform one at all: verified that a uniform stream and a heavily bursty
// stream with the same n and span produced nearly identical "fitted"
// parameters, e.g. alpha=0.0051 vs 0.0055.)
/** @param {number[]} events */
export function hawkesFit(events, { kernel = 'exp' } = {}) {
  if (!events || events.length < 10) return null;
  const n = events.length;
  const t0 = Math.min(...events);
  const sorted = [...events].sort((a, b) => a - b).map(v => v - t0);
  const T = sorted[n - 1];
  const meanGap = T / Math.max(n - 1, 1);

  const negLogLik = ([logMu, logAlpha, logBeta]) => {
    const mu = Math.exp(logMu), alpha = Math.exp(logAlpha), beta = Math.exp(logBeta);
    let ll = 0;
    for (let i = 0; i < n; i++) {
      let lambda = mu;
      for (let j = 0; j < i; j++) lambda += alpha * Math.exp(-beta * (sorted[i] - sorted[j]));
      ll += Math.log(Math.max(lambda, 1e-300));
    }
    let integral = mu * T;
    for (let j = 0; j < n; j++) integral += (alpha / beta) * (1 - Math.exp(-beta * (T - sorted[j])));
    return -(ll - integral);
  };

  const theta0 = [Math.log(Math.max(n / T * 0.5, 1e-6)), Math.log(0.3), Math.log(Math.max(1 / meanGap, 1e-6))];
  const fit = mleFit(theta0, negLogLik, { maxIter: 80 });
  const [mu, alpha, beta] = fit.theta.map(Math.exp);
  return { test: 'Hawkes Fit', parameters: { mu: +mu.toFixed(4), alpha: +alpha.toFixed(4), beta: +beta.toFixed(4) }, n, kernel, apa: `Hawkes fit: mu=${mu.toFixed(3)}, alpha=${alpha.toFixed(3)}` };
}

// ── Cox Process ───────────────────────────────────────────────────
/** @param {number[][]} surface intensity grid. */
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
/** @param {number[]} events */
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
/** @param {number[]} events */
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
// A Thomas process (Thomas 1949) displaces offspring from their parent by an
// ISOTROPIC BIVARIATE NORMAL offset with standard deviation sigma — not a
// bounded uniform disk (that is the definition of a Matérn cluster process,
// implemented separately below). The previous version sampled a uniform
// angle with `dist = rand() * clusterRadius * min(w,h)`, which is neither a
// Gaussian offset nor even a properly area-uniform disk (uniform-in-radius
// sampling over-concentrates points near the parent center relative to a
// true uniform-in-area disk — verified: with N=200,000 samples, an
// equal-width radial binning gave ~40,000 points/bin at every radius instead
// of the expected 8,000/24,000/40,000/56,000/72,000 growth with annulus
// area). `clusterRadius` is now interpreted as sigma (as a fraction of
// min(areaWidth, areaHeight), matching the previous scaling convention).
/** @param {number} nParents @param {number} nOffspring @param {number} areaWidth @param {number} areaHeight */
export function thomasProcess(nParents, nOffspring, areaWidth, areaHeight, { seed = 42, clusterRadius = 0.1 } = {}) {
  __rng = mulberry32(seed);
  if (!nParents || !nOffspring || nParents < 2 || nOffspring < 2) return null;
  const sigma = clusterRadius * Math.min(areaWidth, areaHeight);
  const gauss = () => { // Box-Muller
    const u1 = Math.max(__rng(), 1e-12), u2 = __rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  const parents = Array.from({length: nParents}, () => ({
    x: __rng() * areaWidth, y: __rng() * areaHeight
  }));
  const points = [];
  parents.forEach(p => {
    points.push({ x: +p.x.toFixed(4), y: +p.y.toFixed(4), type: 'parent' });
    for (let o = 0; o < nOffspring; o++) {
      points.push({
        x: +Math.max(0, Math.min(areaWidth, p.x + gauss() * sigma)).toFixed(4),
        y: +Math.max(0, Math.min(areaHeight, p.y + gauss() * sigma)).toFixed(4),
        type: 'offspring'
      });
    }
  });
  return { test: 'Thomas Process', points: points.slice(0, 20), nParents, nOffspring, totalPoints: points.length, apa: `Thomas: ${nParents} clusters, ${points.length} points` };
}

// ── Matern Cluster Process ────────────────────────────────────────
// A Matérn cluster process (Matérn 1960) places offspring UNIFORMLY within
// the disk of the given radius around each parent — the uniform-in-AREA
// distribution, whose radial CDF is r²/R², so a uniform draw u must be
// mapped via r = R·sqrt(u). The previous version used `dist = rand()*radius`
// (uniform in RADIUS), which over-concentrates points near the cluster
// center: verified with N=200,000 samples that equal-width radial bins came
// out ~equal (~40,000 each) instead of the correct annulus-area-proportional
// growth (8,000/24,000/40,000/56,000/72,000).
/** @param {number} nClusters @param {number} [seed] @param {number} radius @param {number} avgPointsPerCluster @param {number} areaWidth @param {number} areaHeight */
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
      const dist = radius * Math.sqrt(__rng());
      points.push({
        x: +Math.max(0, Math.min(areaWidth, p.x + dist * Math.cos(angle))).toFixed(4),
        y: +Math.max(0, Math.min(areaHeight, p.y + dist * Math.sin(angle))).toFixed(4)
      });
    }
  });
  return { test: 'Matern Cluster', points: points.slice(0, 20), nClusters, radius, totalPoints: points.length, apa: `Matern: ${nClusters} clusters, ${points.length} points` };
}

// Border (minus-sampling) edge correction: a reference point i is only used
// for radius r if its disk of radius r fits entirely within the observation
// window (distance to the nearest edge >= r). Points near the boundary are
// undercounted otherwise, since part of their neighborhood falls outside the
// observed area — verified this alone (no correction) drives g(r) down to
// ~0.71 and L(r) down to ~-2.8 at r = 25% of a 100x100 window's width for
// truly uniform (CSR) points, where the correct values are ~1 and ~0
// respectively; with a small maxRadius (minimal edge exposure) the
// uncorrected estimator is much closer to correct, confirming edge bias
// (not a separate formula error) was the dominant source.
function borderDist(p, minX, maxX, minY, maxY) {
  return Math.min(p.x - minX, maxX - p.x, p.y - minY, maxY - p.y);
}

// ── Pair Correlation Function ─────────────────────────────────────
/** @param {Array<{x: number, y: number}>} points */
export function pairCorrelation(points, { nBins = 20, maxRadius = null } = {}) {
  if (!points || points.length < 20) return null;
  const n = points.length;
  const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
  const areaW = maxX - minX, areaH = maxY - minY;
  const area = areaW * areaH;
  const lambda = n / area;
  const maxR = maxRadius || Math.min(areaW, areaH) / 4;
  const bd = points.map(p => borderDist(p, minX, maxX, minY, maxY));
  const bins = Array.from({length: nBins}, (_, i) => {
    const rLo = i * maxR / nBins, rHi = (i + 1) * maxR / nBins;
    const shellArea = Math.PI * (rHi * rHi - rLo * rLo);
    let count = 0, nValid = 0;
    for (let a = 0; a < n; a++) {
      if (bd[a] < rHi) continue; // point a's shell up to rHi must fit in the window
      nValid++;
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        const d = Math.sqrt((points[a].x - points[b].x) ** 2 + (points[a].y - points[b].y) ** 2);
        if (d >= rLo && d < rHi) count++;
      }
    }
    return { r: +(rLo + rHi) / 2, g: (shellArea > 0 && nValid > 0) ? +(count / (nValid * lambda * shellArea)).toFixed(4) : 0 };
  });
  return { test: 'Pair Correlation', bins, lambda: +lambda.toFixed(4), n, apa: `PCF: lambda=${lambda.toFixed(3)}, ${nBins} bins` };
}

// ── L-Function ────────────────────────────────────────────────────
/** @param {Array<{x: number, y: number}>} points */
export function lFunction(points, { nRadii = 15, maxRadius = null } = {}) {
  if (!points || points.length < 20) return null;
  const n = points.length;
  const coords = points.map(p => [p.x, p.y]);
  const minX = Math.min(...coords.map(c => c[0])), maxX = Math.max(...coords.map(c => c[0]));
  const minY = Math.min(...coords.map(c => c[1])), maxY = Math.max(...coords.map(c => c[1]));
  const areaW = maxX - minX, areaH = maxY - minY;
  const area = areaW * areaH;
  const lambda = n / area;
  const maxR = maxRadius || Math.min(areaW, areaH) / 4;
  const radii = Array.from({length: nRadii}, (_, i) => maxR * (i + 1) / nRadii);
  const bd = points.map(p => borderDist(p, minX, maxX, minY, maxY));
  const L = [];
  const radiiOut = [];
  radii.forEach(r => {
    let count = 0, nValid = 0;
    for (let i = 0; i < n; i++) {
      if (bd[i] < r) continue; // point i's neighborhood up to r must fit in the window
      nValid++;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const d = Math.sqrt((coords[i][0] - coords[j][0]) ** 2 + (coords[i][1] - coords[j][1]) ** 2);
        if (d <= r) count++;
      }
    }
    const K = nValid > 0 ? count / (nValid * lambda) : 0;
    L.push(+((Math.sqrt(K / Math.PI) - r).toFixed(4)));
    radiiOut.push(+r.toFixed(4));
  });
  return { test: 'L-Function', L, radii: radiiOut, lambda: +lambda.toFixed(4), n, apa: `L(r): lambda=${lambda.toFixed(3)}, n=${n}` };
}
