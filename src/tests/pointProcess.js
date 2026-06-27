import { avg } from '../math/core.js';
import { jacobiEigen } from '../math/matrix.js';

// Hawkes Intensity
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

// Hawkes Fit (MLE)
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

// Cox Process
export function coxProcess(surface, { n = 100 } = {}) {
  if (!surface || !surface.length || !surface[0]) return null;
  const rows = surface.length; const cols = surface[0].length;
  const points = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (Math.random() < (surface[r][c] || 0)) points.push({ x: r, y: c });
  }
  return { test: 'Cox Process', points: points.slice(0, 20), nEvents: points.length, n, apa: `Cox: ${points.length} events` };
}

// Inter-Arrival Test
export function interArrivalTest(events) {
  if (!events || events.length < 10) return null;
  const n = events.length;
  const sorted = [...events].sort((a, b) => a - b);
  const intervals = sorted.slice(1).map((v, i) => v - sorted[i]);
  const cv = Math.sqrt(intervals.reduce((s, v) => s + (v - avg(intervals)) ** 2, 0) / (n - 1)) / avg(intervals);
  const clustering = cv > 1 ? 'clustered' : cv < 1 ? 'regular' : 'Poisson';
  return { test: 'Inter-Arrival Test', cv: +cv.toFixed(4), clustering, n, apa: `CV = ${cv.toFixed(2)} → ${clustering}` };
}

// Burstiness Index
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
