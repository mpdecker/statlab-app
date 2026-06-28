import { avg, sampleVar } from '../math/core.js';
import { normalCDF } from '../math/distributions.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Tau-U ─────────────────────────────────────────────────────────
export function tauU(baseline, intervention) {
  if (!baseline || !intervention || baseline.length < 5 || intervention.length < 5) return null;
  const nB = baseline.length, nI = intervention.length;
  let S = 0, tied = 0;
  for (let i = 0; i < nB; i++) for (let j = 0; j < nI; j++) {
    if (intervention[j] > baseline[i]) S++;
    else if (intervention[j] < baseline[i]) S--;
    else tied++;
  }
  const total = nB * nI;
  const tau = S / total;
  const se = Math.sqrt(2 * (2 * nI + nB) / (3 * nI * nB));
  const z = se > 0 ? tau / se : 0;
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  return { test: 'Tau-U', tau: +tau.toFixed(4), z: +z.toFixed(4), p, nB, nI, apa: `Tau-U = ${tau.toFixed(3)}, z = ${z.toFixed(2)}` };
}

// ── PND ───────────────────────────────────────────────────────────
export function pnd(baseline, intervention) {
  if (!baseline || !intervention || baseline.length < 5) return null;
  const maxB = Math.max(...baseline);
  const nI = intervention.length;
  const above = intervention.filter(v => v > maxB).length;
  return { test: 'PND', pnd: +(100 * above / nI).toFixed(1), nB: baseline.length, nI, apa: `PND = ${(100 * above / nI).toFixed(0)}%` };
}

// ── PEM ───────────────────────────────────────────────────────────
export function pem(baseline, intervention) {
  if (!baseline || !intervention || baseline.length < 5) return null;
  const medB = baseline.slice().sort((a, b) => a - b)[Math.floor(baseline.length / 2)];
  const nI = intervention.length;
  const above = intervention.filter(v => v > medB).length;
  return { test: 'PEM', pem: +(100 * above / nI).toFixed(1), nB: baseline.length, nI, apa: `PEM = ${(100 * above / nI).toFixed(0)}%` };
}

// ── NAP ───────────────────────────────────────────────────────────
export function nap(baseline, intervention) {
  if (!baseline || !intervention || baseline.length < 5 || intervention.length < 5) return null;
  const nB = baseline.length, nI = intervention.length;
  let wins = 0;
  for (const ib of baseline) for (const ii of intervention) {
    if (ii > ib) wins++;
    else if (ii === ib) wins += 0.5;
  }
  const napVal = wins / (nB * nI);
  return { test: 'NAP', nap: +napVal.toFixed(4), nB, nI, apa: `NAP = ${napVal.toFixed(3)}` };
}

// ── Randomization Test for SCED ───────────────────────────────────
export function randomizationTest(baseline, intervention, { seed = 42, nPerm = 199 } = {}) {
  __rng = mulberry32(seed);
  if (!baseline || !intervention || baseline.length < 5 || intervention.length < 5) return null;
  const all = [...baseline, ...intervention];
  const nB = baseline.length;
  let count = 0;
  const obsDiff = avg(intervention) - avg(baseline);
  for (let p = 0; p < nPerm; p++) {
    const perm = [...all].sort(() => __rng() - 0.5);
    const permDiff = avg(perm.slice(0, nB)) - avg(perm.slice(nB));
    if (Math.abs(permDiff) >= Math.abs(obsDiff)) count++;
  }
  const p = count / nPerm;
  return { test: 'SCED Randomization Test', observedDiff: +obsDiff.toFixed(4), p, nPerm, nB, nI: intervention.length, apa: `Random p = ${p.toFixed(3)}` };
}

// ── Baseline-Corrected Tau ────────────────────────────────────────
export function baselineCorrectedTau(baseline, intervention) {
  if (!baseline || !intervention || baseline.length < 5 || intervention.length < 5) return null;
  const nB = baseline.length, nI = intervention.length;
  const tauRaw = tauU(baseline, intervention)?.tau || 0;
  const trendB = baseline.slice(1).reduce((s, v, i) => s + (v - baseline[i]), 0) / Math.max(baseline.length - 1, 1);
  const corrected = tauRaw - trendB * nI / (nB + nI);
  return { test: 'Baseline-Corrected Tau', tau: +tauRaw.toFixed(4), corrected: +corrected.toFixed(4), trendB: +trendB.toFixed(4), nB, nI, apa: `BC-Tau: ${corrected.toFixed(3)} (raw=${tauRaw.toFixed(3)})` };
}

// ── Between-Case SMD ──────────────────────────────────────────────
export function betweenCaseSMD(caseA, caseB) {
  if (!caseA || !caseB || caseA.length < 5 || caseB.length < 5) return null;
  const mA = avg(caseA), mB = avg(caseB);
  const sd = Math.sqrt((sampleVar(caseA) + sampleVar(caseB)) / 2);
  const smd = sd > 0 ? (mB - mA) / sd : 0;
  const se = Math.sqrt(1 / caseA.length + 1 / caseB.length + smd * smd / (2 * (caseA.length + caseB.length)));
  return { test: 'Between-Case SMD', smd: +smd.toFixed(4), se: +se.toFixed(4), nA: caseA.length, nB: caseB.length, apa: `BC-SMD = ${smd.toFixed(2)} (se=${se.toFixed(2)})` };
}
