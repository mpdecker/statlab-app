import { avg, sampleVar } from '../math/core.js';

function multinomialResample(particles, weights) {
  const n = particles.length;
  const cumsum = [weights[0]];
  for (let i = 1; i < n; i++) cumsum.push(cumsum[i - 1] + weights[i]);
  const sumW = cumsum[n - 1] || 1;
  const resampled = [];
  for (let i = 0; i < n; i++) {
    const u = Math.random() * sumW;
    let idx = 0;
    while (idx < n && cumsum[idx] < u) idx++;
    resampled.push(particles[Math.min(idx, n - 1)]);
  }
  return resampled;
}

// Bootstrap Particle Filter
export function bootstrapFilter(y, initialParticles, { processNoise = 1, obsNoise = 1 } = {}) {
  if (!y || !initialParticles || !initialParticles.length || y.length < 3) return null;
  const n = y.length, N = initialParticles.length;
  let particles = [...initialParticles];
  const filtered = [];
  const weights = Array(N).fill(1 / N);
  for (let t = 0; t < n; t++) {
    // Predict
    particles = particles.map(p => p + processNoise * (Math.random() - 0.5) * 2);
    // Update weights
    const w = particles.map(p => Math.exp(-0.5 * (y[t] - p) ** 2 / (obsNoise ** 2)));
    const sumW = w.reduce((s, v) => s + v, 0) || 1;
    const normW = w.map(v => v / sumW);
    filtered.push(particles.reduce((s, p, i) => s + p * normW[i], 0));
    // Resample
    particles = multinomialResample(particles, normW);
  }
  return { test: 'Bootstrap Filter', filtered: filtered.map(v => +v.toFixed(4)), n, nParticles: N, apa: `Bootstrap PF: ${N} particles, n = ${n}` };
}

// Auxiliary Particle Filter
export function auxiliaryPF(y, initialParticles, { processNoise = 1, obsNoise = 1 } = {}) {
  if (!y || !initialParticles || !initialParticles.length || y.length < 3) return null;
  const n = y.length, N = initialParticles.length;
  let particles = [...initialParticles];
  const filtered = [];
  for (let t = 0; t < n; t++) {
    // Predict
    particles = particles.map(p => p + processNoise * (Math.random() - 0.5) * 2);
    // Auxiliary weights
    const mu = particles.map(p => p);
    const auxW = particles.map((p, i) => Math.exp(-0.5 * (y[t] - mu[i]) ** 2 / (obsNoise ** 2)));
    const sumAW = auxW.reduce((s, v) => s + v, 0) || 1;
    const preRes = multinomialResample(particles, auxW.map(v => v / sumAW));
    // Likelihood weights
    const w = preRes.map(p => Math.exp(-0.5 * (y[t] - p) ** 2 / (obsNoise ** 2)));
    const sumW = w.reduce((s, v) => s + v, 0) || 1;
    const normW = w.map(v => v / sumW);
    filtered.push(preRes.reduce((s, p, i) => s + p * normW[i], 0));
    particles = multinomialResample(preRes, normW);
  }
  return { test: 'Auxiliary PF', filtered: filtered.map(v => +v.toFixed(4)), n, nParticles: N, apa: `Auxiliary PF: ${N} particles, n = ${n}` };
}

// Importance Sampling
export function importanceSampling(target, proposal, nSamples = 1000) {
  if (!target || !proposal || nSamples < 10) return null;
  const samples = [];
  const weights = [];
  for (let i = 0; i < nSamples; i++) {
    const x = typeof proposal === 'function' ? proposal() : Math.random() * (proposal[1] - proposal[0]) + proposal[0];
    const w = typeof target === 'function' ? target(x) : 1;
    samples.push(x);
    weights.push(w);
  }
  const sumW = weights.reduce((s, v) => s + v, 0) || 1;
  const est = samples.reduce((s, x, i) => s + x * weights[i] / sumW, 0);
  return { test: 'Importance Sampling', estimate: +est.toFixed(4), nSamples, apa: `IS estimate = ${est.toFixed(3)}, N = ${nSamples}` };
}

// Effective Sample Size (SMC)
export function effectiveSampleSizeSMC(weights) {
  if (!weights || !weights.length) return null;
  const n = weights.length;
  const sumW = weights.reduce((s, v) => s + v, 0);
  if (!sumW) return null;
  const ess = sumW * sumW / weights.reduce((s, v) => s + v * v, 0);
  return { test: 'SMC ESS', ess: +ess.toFixed(2), n, apa: `ESS = ${ess.toFixed(0)}/${n}` };
}

// Multinomial Resample (exported)
export function multinomialResampleExport(particles, weights) {
  if (!particles || !weights || !particles.length || particles.length !== weights.length) return null;
  const resampled = multinomialResample(particles, weights);
  return { test: 'Multinomial Resample', resampled: resampled.slice(0, 10).map(v => +v.toFixed(4)), n: particles.length, apa: `Resampled ${particles.length} particles` };
}
