import { avg, sampleVar } from '../math/core.js';
import { normalCDF, normalINV } from '../math/distributions.js';

// ── Wald SPRT ─────────────────────────────────────────────────────
/** @param {number[]} data @param {number} h0 @param {number} h1 */
export function waldSPRT(data, h0, h1, { alpha = 0.05, beta = 0.2 } = {}) {
  if (!data || data.length < 3) return null;
  const n = data.length;
  const A = (1 - beta) / alpha;
  const B = beta / (1 - alpha);
  const LLR = [0];
  let stoppedAt = -1, decision = null;
  const sigma2 = data.reduce((s, v) => s + (v - avg(data)) ** 2, 0) / (n - 1) || 1;
  for (let i = 0; i < n; i++) {
    const z = (data[i] - h0) / Math.sqrt(sigma2);
    const lr = Math.exp(-0.5 * ((data[i] - h1) / Math.sqrt(sigma2)) ** 2) / Math.exp(-0.5 * z ** 2);
    LLR.push(LLR[i] + Math.log(Math.max(lr, 0.001)));
    if (LLR[i + 1] >= Math.log(A)) { stoppedAt = i; decision = 'H1'; break; }
    if (LLR[i + 1] <= Math.log(B)) { stoppedAt = i; decision = 'H0'; break; }
  }
  return { test: 'Wald SPRT', llr: LLR.slice(1).map(v => +v.toFixed(4)), stoppedAt: (stoppedAt >= 0 ? stoppedAt : null), decision, h0, h1, alpha, beta, n, apa: `SPRT: ${decision || 'inconclusive'} at step ${stoppedAt != null ? stoppedAt + 1 : n}` };
}

// Calibrate a group-sequential boundary constant c so the overall two-sided
// crossing probability of the continuation region equals alpha exactly, via
// the Armitage-McPherson recursion on the sub-density of the raw cumulative
// statistic W_k (a standard random walk: W_k = sum of k independent N(0,1)
// increments, so Z_k = W_k/√k has the canonical covariance Cov(Z_j,Z_k)=√(j/k)).
// boundW(c, k) gives the W-scale boundary at stage k for calibration constant c.
function _calibrateGSBoundary(K, alpha, boundW) {
  const phi = z => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const L = 4 * Math.sqrt(K) + 6, h = 0.05;
  const grid = []; for (let w = -L; w <= L; w += h) grid.push(w);
  const m = grid.length;
  const crossProb = c => {
    let f = grid.map(w => phi(w)); // density of W_1
    let total = 0;
    for (let k = 1; k <= K; k++) {
      const bound = boundW(c, k);
      for (let gi = 0; gi < m; gi++) if (Math.abs(grid[gi]) >= bound) total += f[gi] * h;
      if (k === K) break;
      const fc = grid.map((w, gi) => (Math.abs(w) < bound ? f[gi] : 0)); // continuation region
      const fn = new Array(m).fill(0);
      for (let a = 0; a < m; a++) { if (fc[a] === 0) continue; const fa = fc[a] * h; for (let b = 0; b < m; b++) fn[b] += fa * phi(grid[b] - grid[a]); }
      f = fn;
    }
    return total;
  };
  // Bisection: crossProb is decreasing in c.
  let lo = 0.5, hi = 4.5;
  for (let it = 0; it < 40; it++) { const mid = (lo + hi) / 2; if (crossProb(mid) > alpha) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

// O'Brien-Fleming Boundaries
/** @param {number} [alpha] @param {number} stages */
export function obrienFleming(stages, alpha = 0.05) {
  if (!stages || stages < 2) return null;
  // O'Brien-Fleming's defining property is a CONSTANT boundary on the raw
  // cumulative statistic W_k (unlike Pocock's boundary, which is constant on
  // the standardized Z_k); on the Z_k=W_k/√k scale this becomes c·√(K/k).
  const c = _calibrateGSBoundary(stages, alpha, (cc, k) => cc * Math.sqrt(stages));
  const boundaries = [];
  for (let k = 1; k <= stages; k++) {
    const b = c * Math.sqrt(stages / k);
    boundaries.push({ stage: k, z: +c.toFixed(4), boundary: +b.toFixed(4) });
  }
  return { test: "O'Brien-Fleming", boundaries, stages, alpha, apa: `O-F: ${stages} stages, ${boundaries.map(b => b.boundary.toFixed(2)).join(', ')}` };
}

// ── Pocock Boundaries ─────────────────────────────────────────────
/** @param {number} [alpha] @param {number} stages */
export function pocockBoundaries(stages, alpha = 0.05) {
  if (!stages || stages < 2) return null;
  // Pocock's constant boundary c on the standardized statistic Z_k, equal at
  // every look; on the raw-sum W_k scale this becomes c·√k.
  const K = stages;
  const c = _calibrateGSBoundary(K, alpha, (cc, k) => cc * Math.sqrt(k));
  const boundaries = []; for (let k = 1; k <= K; k++) boundaries.push({ stage: k, boundary: +c.toFixed(4) });
  return { test: 'Pocock Boundaries', boundaries, stages, alpha, apa: `Pocock: ${K} stages, boundary = ${c.toFixed(3)}` };
}

// ── Group Sequential ──────────────────────────────────────────────
/** @param {number[]} data @param {number} stages */
export function groupSequential(data, stages, { method = 'of', alpha = 0.05 } = {}) {
  if (!data || data.length < 5 || !stages || stages < 2) return null;
  const n = data.length;
  const stageSize = Math.floor(n / stages);
  const boundaries = method === 'pocock' ? pocockBoundaries(stages, alpha)?.boundaries : obrienFleming(stages, alpha)?.boundaries;
  if (!boundaries) return null;
  const results = [];
  let stoppedAt = -1, decision = null;
  let cumSum = 0, cumCount = 0;
  for (let k = 0; k < stages; k++) {
    const seg = data.slice(k * stageSize, Math.min((k + 1) * stageSize, n));
    cumSum += seg.reduce((s, v) => s + v, 0);
    cumCount += seg.length;
    const mean = cumSum / cumCount;
    const se = Math.sqrt(data.reduce((s, v) => s + (v - avg(data)) ** 2, 0) / (n - 1) / cumCount);
    const z = se > 0 ? mean / se : 0;
    const sig = Math.abs(z) > (boundaries[k]?.boundary || 10);
    results.push({ stage: k + 1, n: cumCount, mean: +mean.toFixed(4), z: +z.toFixed(4), boundary: boundaries[k]?.boundary, sig });
    if (sig) { stoppedAt = k; decision = z > 0 ? 'positive' : 'negative'; break; }
  }
  return { test: 'Group Sequential', results, method, stoppedAt: stoppedAt >= 0 ? stoppedAt : null, decision, n, stages, apa: `Group seq (${method}): ${decision || 'continued'} at stage ${(stoppedAt != null ? stoppedAt + 1 : stages)}` };
}

// ── Lan-DeMets Alpha Spending ─────────────────────────────────────
/** @param {number[]} data @param {number} stages */
export function lanDemets(data, stages, { alpha = 0.05 } = {}) {
  if (!data || data.length < 5 || stages < 2) return null;
  const n = data.length;
  const stageSize = Math.floor(n / stages);
  const totalAlpha = alpha;
  const results = [];
  let cumSum = 0, cumCount = 0, spent = 0;
  for (let k = 0; k < stages; k++) {
    const seg = data.slice(k * stageSize, Math.min((k + 1) * stageSize, n));
    cumSum += seg.reduce((s, v) => s + v, 0);
    cumCount += seg.length;
    const infoFrac = cumCount / n;
    const alphaSpend = totalAlpha * infoFrac * (2 - infoFrac);
    const zCrit = normalINV(1 - alphaSpend / 2);
    spent += alphaSpend;
    const mean = cumSum / cumCount;
    const se = Math.sqrt(data.reduce((s, v) => s + (v - avg(data)) ** 2, 0) / (n - 1) / cumCount);
    const z = se > 0 ? mean / se : 0;
    const sig = Math.abs(z) > zCrit;
    results.push({ stage: k + 1, n: cumCount, z: +z.toFixed(4), zCrit: +zCrit.toFixed(4), alphaSpend: +alphaSpend.toFixed(4), sig });
    if (sig) break;
  }
  return { test: 'Lan-DeMets', results, alpha, nStages: stages, n, apa: `Lan-DeMets: ${results.length} looks, ${results.filter(r => r.sig).length} significant` };
}

// ── Conditional Power ─────────────────────────────────────────────
/** @param {number[]} data @param {number} [alpha] @param {number} nObserved @param {number} nPlanned @param {number} effectSize */
export function conditionalPower(data, nObserved, nPlanned, effectSize, alpha = 0.05) {
  if (!data || !data.length || nObserved < 5 || nPlanned < nObserved) return null;
  const n = data.length;
  const mu = avg(data.slice(0, nObserved));
  const sigma = Math.sqrt(data.reduce((s, v) => s + (v - avg(data)) ** 2, 0) / (n - 1)) || 1;
  const nonC = Math.sqrt(nObserved / nPlanned) * effectSize / sigma;
  const zAlpha = normalINV(1 - alpha / 2);
  const cp = normalCDF(Math.abs(nonC) - zAlpha);
  return { test: 'Conditional Power', cp: +cp.toFixed(4), nObserved, nPlanned, effectSize, apa: `Cond power = ${cp.toFixed(3)} (${nObserved}/${nPlanned} observed)` };
}

// ── Double Triangular Test ────────────────────────────────────────
/** @param {number[]} data */
export function doubleTriangular(data, { alpha = 0.05, beta = 0.2, delta = 0.5 } = {}) {
  if (!data || data.length < 10) return null;
  const n = data.length;
  const z = data.reduce((s, v) => s + v, 0) / Math.sqrt(Math.max(sampleVar(data) * n, 1));
  const infoTime = n / Math.max(n + 1, 1);
  const upperBound = 2 + 2 * infoTime;
  const lowerBound = -2 - infoTime;
  const crossedUpper = z > upperBound;
  const crossedLower = z < lowerBound;
  return { test: 'Double Triangular', z: +z.toFixed(4), upper: +upperBound.toFixed(4), lower: +lowerBound.toFixed(4), crossedUpper, crossedLower, n, apa: `Double triangular: z=${z.toFixed(2)}, n=${n}` };
}

// ── Haybittle-Peto Boundary ───────────────────────────────────────
export function haybittlePeto(data, { alpha = 0.05, nStages = 5 } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const zStages = Array.from({length: nStages}, (_, i) => {
    const stageData = data.slice(0, Math.floor(n * (i + 1) / nStages));
    const mean = avg(stageData);
    const z = mean / Math.sqrt(Math.max(sampleVar(stageData) / stageData.length, 0.001));
    return { stage: i + 1, n: stageData.length, z: +z.toFixed(4), boundary: 3.29 };
  });
  const stopped = zStages.some(s => Math.abs(s.z) > s.boundary);
  return { test: 'Haybittle-Peto', stages: zStages, stopped, n, nStages, apa: `H-P: ${stopped ? 'stopped' : 'continued'}, n=${n}` };
}