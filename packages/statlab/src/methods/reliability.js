import { avg, sampleVar } from '../math/core.js';
import { normalCDF, lngamma } from '../math/distributions.js';

// ── Weibull Analysis ──────────────────────────────────────────────
/** @param {number[]} data */
export function weibullAnalysis(data, { confidence = 0.95 } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const logT = sorted.map(v => Math.log(Math.max(v, 1e-10)));
  const F_i = sorted.map((_, i) => (i + 0.5) / n);
  const logLog = F_i.map(f => Math.log(-Math.log(1 - f)));
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (logT[i] - avg(logT)) * (logLog[i] - avg(logLog)); den += (logT[i] - avg(logT)) ** 2; }
  const beta = den > 0 ? Math.max(0.5, num / den) : 1;
  const eta = Math.exp(avg(logT) - avg(logLog) / beta);
  const mtbf = eta * Math.exp(lngamma(1 + 1 / beta));
  return { test: 'Weibull Analysis', beta: +beta.toFixed(4), eta: +eta.toFixed(4), mtbf: +mtbf.toFixed(4), n, apa: `Weibull: beta=${beta.toFixed(2)}, eta=${eta.toFixed(1)}, MTBF=${mtbf.toFixed(1)}` };
}

// ── Reliability Growth (Duane model) ──────────────────────────────
/** @param {number[]} cumFailures @param {number[]} cumTime */
export function reliabilityGrowth(cumFailures, cumTime, { confidence = 0.9 } = {}) {
  if (!cumFailures || !cumTime || cumFailures.length < 5) return null;
  const n = cumFailures.length;
  const logN = cumFailures.map(v => Math.log(Math.max(v, 1)));
  const logT = cumTime.map(v => Math.log(Math.max(v, 1)));
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (logN[i] - avg(logN)) * (logT[i] - avg(logT)); den += (logT[i] - avg(logT)) ** 2; }
  const alpha = den > 0 ? num / den : 0.3;
  const growthRate = 1 - alpha;
  const mtbfCurrent = cumTime[n-1] / Math.max(cumFailures[n-1], 1);
  const mtbfProjected = mtbfCurrent / (1 - alpha);
  return { test: 'Reliability Growth', alpha: +alpha.toFixed(4), growthRate: +growthRate.toFixed(4), mtbfCurrent: +mtbfCurrent.toFixed(2), mtbfProjected: +mtbfProjected.toFixed(2), n, apa: `Duane: alpha=${alpha.toFixed(3)}, growth=${growthRate.toFixed(2)}` };
}

// ── Accelerated Life Testing (Arrhenius) ──────────────────────────
/** @param {number[]} tempData @param {number[]} stressLevels */
export function acceleratedLife(tempData, stressLevels, { activationEnergy = 0.7 } = {}) {
  if (!tempData || !stressLevels || tempData.length < 3 || tempData.length !== stressLevels.length) return null;
  const k = 8.617e-5;
  const n = tempData.length;
  const invT = stressLevels.map(s => 1 / Math.max(s + 273.15, 1));
  const logL = tempData.map(v => Math.log(Math.max(v, 1)));
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (invT[i] - avg(invT)) * (logL[i] - avg(logL)); den += (invT[i] - avg(invT)) ** 2; }
  const Ea = den > 0 ? Math.abs(num / den) * k : activationEnergy;
  const A = Math.exp(avg(logL) - Ea / k * avg(invT));
  const useLife = A * Math.exp(-Ea / (k * 298.15));
  return { test: 'Accelerated Life', activationEnergy: +Ea.toFixed(6), A: +A.toFixed(4), useLife: +useLife.toFixed(2), n, apa: `ALT: Ea=${Ea.toFixed(4)}eV, use life=${useLife.toFixed(1)}` };
}

// ── Warranty Prediction ───────────────────────────────────────────
/** @param {number} [monthsInWarranty] @param {number[]} failureData */
export function warrantyPrediction(failureData, monthsInWarranty = 12, { confidence = 0.9 } = {}) {
  if (!failureData || failureData.length < 5) return null;
  const n = failureData.length;
  const sorted = [...failureData].sort((a, b) => a - b);
  const kmEst = [];
  let atRisk = n;
  const uniqueTimes = [...new Set(sorted)];
  for (const t of uniqueTimes) {
    const failed = sorted.filter(v => v === t).length;
    const hazard = failed / Math.max(atRisk, 1);
    const survival = kmEst.length > 0 ? kmEst[kmEst.length - 1].survival * (1 - hazard) : 1 - hazard;
    kmEst.push({ time: t, hazard: +hazard.toFixed(4), survival: +survival.toFixed(4) });
    atRisk -= failed;
  }
  const stepsAtOrBefore = kmEst.filter(k => k.time <= monthsInWarranty);
  const survivalAtWarranty = stepsAtOrBefore.length ? stepsAtOrBefore[stepsAtOrBefore.length - 1].survival : 1;
  const warrantyClaim = 1 - survivalAtWarranty;
  return { test: 'Warranty Prediction', expectedClaimRate: +warrantyClaim.toFixed(4), warrantyMonths: monthsInWarranty, n, apa: `Warranty: ${(warrantyClaim * 100).toFixed(1)}% claim rate over ${monthsInWarranty}mo` };
}

// ── Weibull Bayes (Gamma prior) ───────────────────────────────────
/** @param {number[]} data */
export function weibullBayes(data, { shapePrior = [1, 1], scalePrior = [1, 0.01] } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const logSum = sorted.reduce((s, v) => s + Math.log(Math.max(v, 1e-10)), 0);
  const shapePost = shapePrior[0] + n;
  const scalePost = shapePrior[1] + logSum / n;
  const mtbf = shapePost / Math.max(scalePost, 0.01);
  return { test: 'Weibull Bayes', shapePost: +shapePost.toFixed(4), scalePost: +scalePost.toFixed(4), mtbf: +mtbf.toFixed(2), n, apa: `Weibull Bayes: MTBF=${mtbf.toFixed(1)}, n=${n}` };
}

// ── Repairable Systems (NHPP Power Law) ───────────────────────────
/** @param {number[]} failureTimes @param {number} endTime */
export function repairableSystems(failureTimes, endTime) {
  if (!failureTimes || failureTimes.length < 3 || !endTime) return null;
  const n = failureTimes.length;
  const logT = failureTimes.map(t => Math.log(Math.max(t, 1)));
  const beta = n / failureTimes.reduce((s, t) => s + Math.log(endTime / Math.max(t, 1)), 0);
  const lambda = n / Math.pow(endTime, beta);
  const mtbf = Math.pow(1 / Math.max(lambda, 1e-10), 1 / Math.max(beta, 0.01));
  return { test: 'Repairable Systems', beta: +beta.toFixed(4), lambda: +lambda.toFixed(6), mtbf: +mtbf.toFixed(2), n, endTime, apa: `NHPP: beta=${beta.toFixed(2)}, MTBF=${mtbf.toFixed(1)}` };
}

// ── Competing Risks (Reliability context) ─────────────────────────
/** @param {number[]} timeData @param {Array<string|number>} causeData */
export function competingRisksReliability(timeData, causeData) {
  if (!timeData || !causeData || timeData.length < 5 || timeData.length !== causeData.length) return null;
  const n = timeData.length;
  const causes = [...new Set(causeData)];
  const sorted = timeData.map((t, i) => ({ t, c: causeData[i] })).sort((a, b) => a.t - b.t);
  const cif = causes.map(cause => {
    let cumInc = 0, atRisk = n;
    const incidences = [];
    for (const row of sorted) {
      if (row.c === cause) {
        cumInc += 1 / Math.max(atRisk, 1);
      }
      incidences.push({ time: +row.t.toFixed(2), cumInc: +cumInc.toFixed(4) });
      atRisk--;
    }
    const final = incidences[incidences.length - 1].cumInc;
    return { cause, CIF: +final.toFixed(4) };
  });
  return { test: 'Competing Risks (Reliability)', cif, nCauses: causes.length, n, apa: `CR: ${causes.length} causes, n=${n}` };
}
