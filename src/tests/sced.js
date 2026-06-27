import { avg } from '../math/core.js';
import { normalCDF } from '../math/distributions.js';

// Tau-U
export function tauU(baseline, intervention, { tau = 'A' } = {}) {
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

// PND
export function pnd(baseline, intervention) {
  if (!baseline || !intervention || baseline.length < 5) return null;
  const maxB = Math.max(...baseline);
  const nI = intervention.length;
  const above = intervention.filter(v => v > maxB).length;
  return { test: 'PND', pnd: +(100 * above / nI).toFixed(1), nB: baseline.length, nI, apa: `PND = ${(100 * above / nI).toFixed(0)}%` };
}

// PEM
export function pem(baseline, intervention) {
  if (!baseline || !intervention || baseline.length < 5) return null;
  const medB = baseline.slice().sort((a, b) => a - b)[Math.floor(baseline.length / 2)];
  const nI = intervention.length;
  const above = intervention.filter(v => v > medB).length;
  return { test: 'PEM', pem: +(100 * above / nI).toFixed(1), nB: baseline.length, nI, apa: `PEM = ${(100 * above / nI).toFixed(0)}%` };
}

// NAP
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

// Randomization Test for SCED
export function randomizationTest(baseline, intervention, { nPerm = 199 } = {}) {
  if (!baseline || !intervention || baseline.length < 5 || intervention.length < 5) return null;
  const all = [...baseline, ...intervention];
  const nB = baseline.length;
  let count = 0;
  const obsDiff = avg(intervention) - avg(baseline);
  for (let p = 0; p < nPerm; p++) {
    const perm = [...all].sort(() => Math.random() - 0.5);
    const permDiff = avg(perm.slice(0, nB)) - avg(perm.slice(nB));
    if (Math.abs(permDiff) >= Math.abs(obsDiff)) count++;
  }
  const p = count / nPerm;
  return { test: 'SCED Randomization Test', observedDiff: +obsDiff.toFixed(4), p, nPerm, nB, nI: intervention.length, apa: `Random p = ${p.toFixed(3)}` };
}
