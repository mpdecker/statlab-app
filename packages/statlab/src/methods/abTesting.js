import { avg, sampleVar } from '../math/core.js';
import { normalCDF, normalINV, chiPVal, tPVal } from '../math/distributions.js';
import { mulberry32, randBeta } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Sample Ratio Mismatch ─────────────────────────────────────────
export function sampleRatioMismatch(control, treatment, expectedRatio) {
  if (!control || !treatment || !control.length || !treatment.length) return null;
  const nC = control.length, nT = treatment.length;
  const nTotal = nC + nT;
  const expC = nTotal * expectedRatio, expT = nTotal * (1 - expectedRatio);
  const chi2 = (nC - expC) ** 2 / expC + (nT - expT) ** 2 / expT;
  const p = chiPVal(Math.max(0, chi2), 1);
  return { test: 'Sample Ratio Mismatch', chi2: +chi2.toFixed(4), p, observed: { control: nC, treatment: nT }, expected: { control: +expC.toFixed(1), treatment: +expT.toFixed(1) }, nTotal, apa: `SRM: χ² = ${chi2.toFixed(2)}, ${p < 0.01 ? 'significant mismatch' : 'no mismatch'}` };
}

// ── Sequential Testing ────────────────────────────────────────────
export function sequentialTest(control, treatment, { alpha = 0.05, spending = 'obrienFleming' } = {}) {
  if (!control || !treatment || control.length < 5 || treatment.length < 5) return null;
  const n = Math.min(control.length, treatment.length);
  const zScores = [];
  let cumDiff = 0;
  const pooled = sampleVar([...control, ...treatment]) || 1;
  for (let i = 0; i < n; i++) {
    cumDiff += treatment[i] - control[i];
    const se = Math.sqrt(2 * pooled / (i + 1));
    const z = se > 0 ? cumDiff / (n * se) : 0;
    zScores.push(+z.toFixed(4));
  }
  return { test: 'Sequential Test', zScores, n, alpha, apa: `Sequential: max z = ${Math.max(...zScores.map(Math.abs)).toFixed(2)}` };
}

// ── Unequal Allocation T-test ─────────────────────────────────────
export function unequalAllocationT(control, treatment, ratio) {
  if (!control || !treatment || control.length < 5 || treatment.length < 5) return null;
  const nC = control.length, nT = treatment.length;
  const mC = avg(control), mT = avg(treatment);
  const vC = sampleVar(control), vT = sampleVar(treatment);
  const se = Math.sqrt(vC / nC + vT / nT);
  if (!se) return null;
  const t = (mT - mC) / se;
  const dfNum = (vC / nC + vT / nT) ** 2;
  const dfDen = (vC / nC) ** 2 / (nC - 1) + (vT / nT) ** 2 / (nT - 1);
  const df = dfDen > 0 ? dfNum / dfDen : nC + nT - 2;
  const p = tPVal(Math.abs(t), df);
  return { test: 'Unequal Allocation T', t: +t.toFixed(4), df: +df.toFixed(1), p, ratio, nControl: nC, nTreatment: nT, apa: `Unequal t = ${t.toFixed(2)}, p = ${p.toFixed(4)}` };
}

// ── Minimum Detectable Effect ─────────────────────────────────────
/** @param {number} n @param {number} [alpha] @param {number} [beta] @param {number[]} [baseline] */
export function minimumDetectableEffect(n, alpha = 0.05, beta = 0.2, baseline = 0.5) {
  if (!n || n < 2 || baseline <= 0 || baseline >= 1) return null;
  const za = normalINV(1 - alpha / 2);
  const zb = normalINV(1 - beta);
  const se = Math.sqrt(2 * baseline * (1 - baseline) / n);
  const mde = se * (za + zb);
  return { test: 'Minimum Detectable Effect', mde: +mde.toFixed(4), n, alpha: +alpha.toFixed(2), beta: +beta.toFixed(2), baseline: +baseline.toFixed(4), apa: `MDE = ${mde.toFixed(3)} at n = ${n}` };
}

// ── Required Sample Size ──────────────────────────────────────────
/** @param {number[]} baseline @param {number} [alpha] @param {number} [beta] */
export function requiredSampleSize(baseline, mde, alpha = 0.05, beta = 0.2) {
  if (!baseline || baseline <= 0 || baseline >= 1 || !mde || mde <= 0) return null;
  const za = normalINV(1 - alpha / 2);
  const zb = normalINV(1 - beta);
  const n = 2 * (za + zb) ** 2 * baseline * (1 - baseline) / (mde * mde);
  return { test: 'Required Sample Size', n: Math.ceil(n), baseline: +baseline.toFixed(4), mde: +mde.toFixed(4), alpha: +alpha.toFixed(2), beta: +beta.toFixed(2), apa: `n = ${Math.ceil(n)} per group (MDE = ${mde}, baseline = ${baseline})` };
}

// ── Bayesian A/B Test ─────────────────────────────────────────────
export function bayesianABTest(dataA, dataB, { seed = 42, nSim = 1000 } = {}) {
  __rng = mulberry32(seed);
  if (!dataA || !dataB || dataA.length < 3 || dataB.length < 3) return null;
  const mA = avg(dataA), mB = avg(dataB);
  const sA = Math.sqrt(sampleVar(dataA) / dataA.length);
  const sB = Math.sqrt(sampleVar(dataB) / dataB.length);
  let bWins = 0;
  for (let i = 0; i < nSim; i++) {
    const a = mA + gaussBoxMuller() * sA;
    const bb = mB + gaussBoxMuller() * sB;
    if (bb > a) bWins++;
  }
  return { test: 'Bayesian AB Test', probB: +(bWins / nSim).toFixed(4), nA: dataA.length, nB: dataB.length, nSim, apa: `Bayesian AB: P(B>A)=${(bWins/nSim*100).toFixed(1)}%` };
}
function gaussBoxMuller() { let u = 0, v = 0; while(u === 0) u = __rng(); while(v === 0) v = __rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }

// ── Multi-Arm Bandit (Thompson) ───────────────────────────────────
/** @param {number} arms */
export function multiArmBandit(arms, { seed = 42, iterations = 200 } = {}) {
  __rng = mulberry32(seed);
  if (!arms || arms.length < 3 || iterations < 10) return null;
  const k = arms.length;
  const successes = Array(k).fill(1);
  const failures = Array(k).fill(1);
  let totalReward = 0;
  for (let t = 0; t < iterations; t++) {
    const samples = successes.map((s, i) => randBeta(__rng, s, failures[i])); // θ_i ~ Beta(α_i, β_i)
    const arm = samples.indexOf(Math.max(...samples));
    const r = __rng() < arms[arm] ? 1 : 0; // Bernoulli reward from the chosen arm's true probability
    totalReward += r;
    if (r > 0.5) successes[arm]++; else failures[arm]++;
  }
  const values = successes.map((s, i) => s / (s + failures[i] + 1e-6));
  return { test: 'Multi-Arm Bandit', values: values.map(v => +v.toFixed(4)), totalReward, iterations, k, apa: `MAB: ${k} arms, reward=${(totalReward/iterations*100).toFixed(0)}%` };
}
