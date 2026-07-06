import { avg } from '../math/core.js';
import { normalCDF, normalINV, chiPVal } from '../math/distributions.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Randomized Blocks ─────────────────────────────────────────────
/** @param {Array<string|number>} strata @param {Array<string|number>} treatments */
export function randomizedBlocks(strata, treatments, { seed = 42, blockSize = 4 } = {}) {
  __rng = mulberry32(seed);
  if (!strata || !strata.length || !treatments || treatments.length < 2) return null;
  const n = strata.length;
  const assignment = Array(n).fill(null);
  for (let i = 0; i < n; i += blockSize) {
    const end = Math.min(i + blockSize, n);
    const block = Array.from({ length: end - i }, (_, j) => treatments[j % treatments.length]);
    // Shuffle within block
    for (let k = block.length - 1; k > 0; k--) { const r = Math.floor(__rng() * (k + 1)); [block[k], block[r]] = [block[r], block[k]]; }
    for (let j = i; j < end; j++) assignment[j] = block[j - i];
  }
  const counts = {};
  assignment.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  return { test: 'Randomized Blocks', assignment, counts, blockSize, n, nTreatments: treatments.length, apa: `Blocked: ${Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(', ')}` };
}

// Simon's Two-Stage
/** @param {number} [alpha] @param {number} [beta] @param {number} p0 @param {number} p1 */
export function simons2Stage(p0, p1, alpha = 0.05, beta = 0.2) {
  if (!Number.isFinite(p0) || !Number.isFinite(p1) || p0 >= p1) return null;
  const n1 = Math.max(5, Math.ceil(Math.log(0.5) / Math.log(1 - p1)));
  const n2 = n1 * 2;
  const r1 = Math.max(0, Math.floor(n1 * p0 - 1));
  const r = Math.max(0, Math.floor(n2 * p0 + 0.5));
  return { test: "Simon's Two-Stage", n1, n2, r1, r, p0: +p0.toFixed(4), p1: +p1.toFixed(4), alpha, beta, apa: `Simon: n1=${n1}, r1=${r1}, n2=${n2}, r=${r}` };
}

// ── Sample Size Re-estimation ─────────────────────────────────────
/** @param {number[]} data @param {number} [stage] @param {number} target */
export function sampleSizeReestimation(data, target, stage = 1) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const mu = avg(data);
  const sd = Math.sqrt(data.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 1));
  if (!sd) return null;
  const nNeeded = Math.ceil((2 * (normalINV(0.975) + normalINV(0.8)) * sd / Math.abs(target - mu)) ** 2);
  return { test: 'SSR', nObserved: n, nNeeded, ratio: +(nNeeded / Math.max(n, 1)).toFixed(2), stage, apa: `SSR: n_needed = ${nNeeded} (observed ${n})` };
}

// ── Stratified Permuted Blocks ────────────────────────────────────
/** @param {number} [seed] @param {Array<string|number>} strata */
export function stratifiedPermutedBlocks(strata, seed = 42) {
  __rng = mulberry32(seed);
  if (!strata || !strata.length) return null;
  const uniqueStrata = [...new Set(strata)];
  const assignment = strata.map(s => {
    const idx = uniqueStrata.indexOf(s);
    return idx % 2 === 0 ? 'A' : 'B';
  });
  // Shuffle within each stratum
  uniqueStrata.forEach(s => {
    const indices = strata.reduce((arr, st, i) => { if (st === s) arr.push(i); return arr; }, []);
    const trts = indices.map(i => assignment[i]);
    for (let k = trts.length - 1; k > 0; k--) { const r = Math.floor(__rng() * (k + 1)); [trts[k], trts[r]] = [trts[r], trts[k]]; }
    indices.forEach((i, j) => { assignment[i] = trts[j]; });
  });
  return { test: 'Stratified Permuted Blocks', assignment, nStrata: uniqueStrata.length, n: strata.length, apa: `Stratified blocks: ${uniqueStrata.length} strata, n = ${strata.length}` };
}

// ── Fisher Exact Design ───────────────────────────────────────────
/** @param {number} a @param {number} b @param {number} c @param {number} d */
export function fisherExactDesign(a, b, c, d) {
  if (![a, b, c, d].every(v => v >= 0)) return null;
  const n = a + b + c + d;
  if (!n) return null;
  const or = (a * d) / Math.max(b * c, 1);
  const rr = (a / Math.max(a + b, 1)) / (c / Math.max(c + d, 1));
  const rd = a / Math.max(a + b, 1) - c / Math.max(c + d, 1);
  return { test: 'Fisher Exact Design', or: +or.toFixed(4), rr: +rr.toFixed(4), rd: +rd.toFixed(4), n, apa: `2x2: OR=${or.toFixed(2)}, RR=${rr.toFixed(2)}` };
}

// ── Adaptive Design (Group Sequential with sample size re-estimation) ───
/** @param {number} [targetPower] @param {number} [alpha] @param {number} effectSize */
export function adaptiveDesign(effectSize, targetPower = 0.8, alpha = 0.05, { maxStages = 3, nMin = 20 } = {}) {
  if (!Number.isFinite(effectSize) || effectSize <= 0 || maxStages < 2) return null;
  const stages = Array.from({ length: maxStages }, (_, stage) => {
    const nStage = Math.max(nMin, Math.floor(nMin * (stage + 1) * 1.5));
    const z = effectSize * Math.sqrt(nStage) / 2;
    const power = normalCDF(z - 1.96);
    const futility = power < 0.2;
    return { stage: stage + 1, n: nStage, power: +power.toFixed(4), futility };
  });
  const finalN = stages.reduce((s, st) => s + st.n, 0);
  return { test: 'Adaptive Design', stages, finalN, maxStages, alpha, apa: `Adaptive: ${maxStages} stages, max N = ${finalN}` };
}
