import { avg, sampleVar } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

function multinomialResample(particles, weights) {
  const n = particles.length;
  const cumsum = [weights[0]];
  for (let i = 1; i < n; i++) cumsum.push(cumsum[i - 1] + weights[i]);
  const sumW = cumsum[n - 1] || 1;
  const resampled = [];
  for (let i = 0; i < n; i++) {
    const u = __rng() * sumW;
    let idx = 0;
    while (idx < n && cumsum[idx] < u) idx++;
    resampled.push(particles[Math.min(idx, n - 1)]);
  }
  return resampled;
}

// ── Bootstrap Particle Filter ─────────────────────────────────────
/** @param {number[]} y */
export function bootstrapFilter(y, initialParticles, { seed = 42, processNoise = 1, obsNoise = 1 } = {}) {
  __rng = mulberry32(seed);
  if (!y || !initialParticles || !initialParticles.length || y.length < 3) return null;
  const n = y.length, N = initialParticles.length;
  let particles = [...initialParticles];
  const filtered = [];
  const weights = Array(N).fill(1 / N);
  for (let t = 0; t < n; t++) {
    // Predict
    particles = particles.map(p => p + processNoise * (__rng() - 0.5) * 2);
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

// ── Auxiliary Particle Filter ─────────────────────────────────────
/** @param {number[]} y */
export function auxiliaryPF(y, initialParticles, { seed = 42, processNoise = 1, obsNoise = 1 } = {}) {
  __rng = mulberry32(seed);
  if (!y || !initialParticles || !initialParticles.length || y.length < 3) return null;
  const n = y.length, N = initialParticles.length;
  let particles = [...initialParticles];
  const filtered = [];
  for (let t = 0; t < n; t++) {
    // Predict (one transition draw, reused as the final particle — no second,
    // independent transition draw is taken for the resampled particles).
    particles = particles.map(p => p + processNoise * (__rng() - 0.5) * 2);
    // Auxiliary weights: resample proportional to the observation likelihood of
    // the predicted particle. Because the resampled particle IS the predicted
    // particle (no fresh draw follows), the second-stage correction weight
    // p(y|x_t)/p(y|mu) is exactly 1 for every kept particle — the filter is
    // already correctly weighted after this one resample. The previous version
    // recomputed the SAME likelihood on the resampled values and reweighted by
    // it again, double-counting the observation and biasing the filtered mean
    // toward whichever particles happened to be resampled (e.g. pulling the
    // estimate too far toward the most recent observation).
    const auxW = particles.map(p => Math.exp(-0.5 * (y[t] - p) ** 2 / (obsNoise ** 2)));
    const sumAW = auxW.reduce((s, v) => s + v, 0) || 1;
    const preRes = multinomialResample(particles, auxW.map(v => v / sumAW));
    filtered.push(avg(preRes));
    particles = preRes;
  }
  return { test: 'Auxiliary PF', filtered: filtered.map(v => +v.toFixed(4)), n, nParticles: N, apa: `Auxiliary PF: ${N} particles, n = ${n}` };
}

// ── Importance Sampling ───────────────────────────────────────────
/** @param {number} [nSamples] @param {number} [seed] */
export function importanceSampling(target, proposal, nSamples = 1000, seed = 42) {
  __rng = mulberry32(seed);
  if (!target || !proposal || nSamples < 10) return null;
  const samples = [];
  const weights = [];
  for (let i = 0; i < nSamples; i++) {
    const x = typeof proposal === 'function' ? proposal() : __rng() * (proposal[1] - proposal[0]) + proposal[0];
    const w = typeof target === 'function' ? target(x) : 1;
    samples.push(x);
    weights.push(w);
  }
  const sumW = weights.reduce((s, v) => s + v, 0) || 1;
  const est = samples.reduce((s, x, i) => s + x * weights[i] / sumW, 0);
  return { test: 'Importance Sampling', estimate: +est.toFixed(4), nSamples, apa: `IS estimate = ${est.toFixed(3)}, N = ${nSamples}` };
}

// ── Effective Sample Size (SMC) ───────────────────────────────────
/** @param {number[]} weights */
export function effectiveSampleSizeSMC(weights) {
  if (!weights || !weights.length) return null;
  const n = weights.length;
  const sumW = weights.reduce((s, v) => s + v, 0);
  if (!sumW) return null;
  const ess = sumW * sumW / weights.reduce((s, v) => s + v * v, 0);
  return { test: 'SMC ESS', ess: +ess.toFixed(2), n, apa: `ESS = ${ess.toFixed(0)}/${n}` };
}

// ── Multinomial Resample (exported) ───────────────────────────────
/** @param {number[]} weights @param {number} [seed] */
export function multinomialResampleExport(particles, weights, seed = 42) {
  __rng = mulberry32(seed);
  if (!particles || !weights || !particles.length || particles.length !== weights.length) return null;
  const resampled = multinomialResample(particles, weights);
  return { test: 'Multinomial Resample', resampled: resampled.slice(0, 10).map(v => +v.toFixed(4)), n: particles.length, apa: `Resampled ${particles.length} particles` };
}

// ── Particle MCMC ─────────────────────────────────────────────────
export function particleMCMC(prior, likelihood, { nParticles = 100, nIter = 50, seed = 42 } = {}) {
  if (!prior || !likelihood || nParticles < 10) return null;
  const rand = mulberry32(seed);
  // Independence Metropolis–Hastings: propose θ′ from the prior and accept with
  // probability min(1, exp(ℓ(θ′)−ℓ(θ))) — the prior densities cancel, so the
  // stationary distribution is the posterior ∝ prior·likelihood. (The old code
  // was plain importance sampling: it drew particles once and never iterated.)
  let x = prior(); let lx = likelihood(x);
  let best = x, lbest = lx, nAcc = 0;
  const total = Math.max(nIter * nParticles, 500), burn = Math.floor(total * 0.2);
  const kept = [];
  for (let it = 0; it < total; it++) {
    const xp = prior(); const lp = likelihood(xp);
    if (Math.log(rand() + 1e-300) < lp - lx) { x = xp; lx = lp; nAcc++; if (lp > lbest) { best = xp; lbest = lp; } }
    if (it >= burn) kept.push(Array.isArray(x) ? [...x] : x);
  }
  const vec = Array.isArray(kept[0]);
  const d = vec ? kept[0].length : 1;
  const posteriorMean = vec ? Array.from({ length: d }, (_, j) => +avg(kept.map(s => s[j])).toFixed(4)) : +avg(kept).toFixed(4);
  const acceptRate = nAcc / total;
  const ess = +(kept.length * acceptRate).toFixed(2); // rough effective sample size
  return { test: 'Particle MCMC', ess, acceptRate: +acceptRate.toFixed(4), posteriorMean, nParticles, nIter, best: best?.map ? best.map(v => +v.toFixed(4)) : best, apa: `pMCMC: ESS=${ess.toFixed(1)}, accept=${(acceptRate * 100).toFixed(0)}%` };
}

// ── Annealed Importance Sampling ──────────────────────────────────
export function annealedImportance(target, proposal, { nSamples = 50, nTemps = 5, logBase = null, stepSize = 1, seed = 42, nMH = 5 } = {}) {
  if (!target || !proposal || nSamples < 5) return null;
  const rand = mulberry32(seed);
  const lb = typeof logBase === 'function' ? logBase : () => 0; // flat base if none given
  const temps = Array.from({ length: nTemps }, (_, i) => i / (nTemps - 1));
  // Intermediate (unnormalized) log-density π_β ∝ f_0^{1-β}·f_n^{β}.
  const logPi = (x, b) => (1 - b) * lb(x) + b * target(x);
  const logW = [];
  for (let s = 0; s < nSamples; s++) {
    let x = proposal();          // x ~ π_0 = base
    let w = 0;
    for (let t = 1; t < nTemps; t++) {
      const b0 = temps[t - 1], b1 = temps[t];
      // AIS weight increment log[π_{β_t}(x)/π_{β_{t-1}}(x)] = (β_t−β_{t-1})(log f_n − log f_0).
      w += (b1 - b0) * (target(x) - lb(x));
      // Random-walk Metropolis step(s) leaving π_{β_t} invariant — the state MOVES.
      for (let m = 0; m < nMH; m++) {
        const xp = x + (rand() * 2 - 1) * stepSize;
        if (Math.log(rand() + 1e-300) < logPi(xp, b1) - logPi(x, b1)) x = xp;
      }
    }
    logW.push(w);
  }
  // logZ = log mean exp(logW) (log-sum-exp); estimates log(Z_n/Z_0).
  const mx = Math.max(...logW);
  const logZ = mx + Math.log(logW.reduce((s, v) => s + Math.exp(v - mx), 0) / nSamples);
  return { test: 'Annealed Importance', logZ: +logZ.toFixed(4), nSamples, nTemps, apa: `AIS: logZ=${logZ.toFixed(2)}` };
}
