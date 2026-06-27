import { avg } from '../math/core.js';
import { normalCDF, normalINV } from '../math/distributions.js';

// Wald SPRT
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

// O'Brien-Fleming Boundaries
export function obrienFleming(stages, alpha = 0.05) {
  if (!stages || stages < 2) return null;
  const boundaries = [];
  for (let k = 1; k <= stages; k++) {
    const z = normalINV(1 - alpha / (2 * stages));
    const b = z * Math.sqrt(stages / k);
    boundaries.push({ stage: k, z: +z.toFixed(4), boundary: +b.toFixed(4) });
  }
  return { test: "O'Brien-Fleming", boundaries, stages, alpha, apa: `O-F: ${stages} stages, ${boundaries.map(b => b.boundary.toFixed(2)).join(', ')}` };
}

// Pocock Boundaries
export function pocockBoundaries(stages, alpha = 0.05) {
  if (!stages || stages < 2) return null;
  const cp = normalINV(1 - alpha / 2);
  const pock = 2.17;
  const boundaries = [];
  for (let k = 1; k <= stages; k++) {
    boundaries.push({ stage: k, boundary: +pock.toFixed(4) });
  }
  return { test: 'Pocock Boundaries', boundaries, stages, alpha, apa: `Pocock: ${stages} stages, boundary = ${pock.toFixed(2)}` };
}

// Group Sequential
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

// Lan-DeMets Alpha Spending
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

// Conditional Power
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