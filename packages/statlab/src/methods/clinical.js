import { avg, sampleSD, corr } from '../math/core.js';
import { normalCDF, normalINV, chiPVal } from '../math/distributions.js';
import { tInv2 } from '../math/distributions.js';

// Wilson score CI for a proportion
function _wilsonCI(x, n, alpha = 0.05) {
  if (!n) return [0, 0];
  const p = x / n;
  const z = 1.96; // for 95% CI
  const denom = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / denom;
  return [+Math.max(0, center - margin).toFixed(4), +Math.min(1, center + margin).toFixed(4)];
}

// ── Bland-Altman ────────────────────────────────────────────────────────────
export function blandAltman(methodA, methodB) {
  if (!methodA || !methodB || methodA.length !== methodB.length || methodA.length < 3) return null;
  const n = methodA.length;
  const diffs = methodA.map((a, i) => a - methodB[i]);
  const bias = avg(diffs);
  const sdDiff = sampleSD(diffs);
  if (!sdDiff) {
    return {
      test: 'Bland-Altman Analysis',
      bias: +bias.toFixed(4),
      sdDiff: 0,
      loa: { lower: +bias.toFixed(4), upper: +bias.toFixed(4) },
      ciBias: [NaN, NaN],
      ciLoaLower: [NaN, NaN],
      ciLoaUpper: [NaN, NaN],
      r: 0,
      pPropBias: 1,
      n,
      apa: `Bland-Altman: bias = ${bias.toFixed(2)}, perfect agreement (SD = 0), n = ${n}`,
    };
  }

  const tCrit = tInv2(0.05, n - 1);
  const seBias = sdDiff / Math.sqrt(n);
  const ciBias = [bias - tCrit * seBias, bias + tCrit * seBias];

  const loaLower = bias - 1.96 * sdDiff;
  const loaUpper = bias + 1.96 * sdDiff;
  const seLoa = sdDiff * Math.sqrt(3 / n);
  const ciLoaLower = [loaLower - tCrit * seLoa, loaLower + tCrit * seLoa];
  const ciLoaUpper = [loaUpper - tCrit * seLoa, loaUpper + tCrit * seLoa];

  const means = methodA.map((a, i) => (a + methodB[i]) / 2);
  const r = corr(means, diffs);
  const tProp = r * Math.sqrt((n - 2) / (1 - r * r + 1e-10));
  const pPropBias = 2 * (1 - normalCDF(Math.abs(tProp)));

  return {
    test: 'Bland-Altman Analysis',
    bias: +bias.toFixed(4),
    sdDiff: +sdDiff.toFixed(4),
    loa: { lower: +loaLower.toFixed(4), upper: +loaUpper.toFixed(4) },
    ciBias: [+ciBias[0].toFixed(4), +ciBias[1].toFixed(4)],
    ciLoaLower: [+ciLoaLower[0].toFixed(4), +ciLoaLower[1].toFixed(4)],
    ciLoaUpper: [+ciLoaUpper[0].toFixed(4), +ciLoaUpper[1].toFixed(4)],
    r: +r.toFixed(4),
    pPropBias,
    n,
    apa: `Bland-Altman: bias = ${bias.toFixed(2)}, LOA [${loaLower.toFixed(2)}, ${loaUpper.toFixed(2)}], n = ${n}`,
  };
}

// ── Diagnostic Accuracy ─────────────────────────────────────────────────────
/** @param {Function} fn */
export function diagnosticAccuracy(tp, fp, tn, fn) {
  if (![tp, fp, tn, fn].every(v => Number.isFinite(v) && v >= 0)) return null;
  const N = tp + fp + tn + fn;
  if (!N) return null;
  if (tp + fn === 0 || tn + fp === 0) return null;

  const sens = tp / (tp + fn);
  const spec = tn / (tn + fp);
  const ppv = tp + fp > 0 ? tp / (tp + fp) : 0;
  const npv = tn + fn > 0 ? tn / (tn + fn) : 0;
  const acc = (tp + tn) / N;
  const youden = sens + spec - 1;
  const f1 = 2 * tp + fp + fn > 0 ? 2 * tp / (2 * tp + fp + fn) : 0;
  const prev = (tp + fn) / N;

  return {
    test: 'Diagnostic Accuracy',
    sensitivity: { value: +sens.toFixed(4), ciLo: _wilsonCI(tp, tp + fn)[0], ciHi: _wilsonCI(tp, tp + fn)[1] },
    specificity: { value: +spec.toFixed(4), ciLo: _wilsonCI(tn, tn + fp)[0], ciHi: _wilsonCI(tn, tn + fp)[1] },
    ppv: { value: +ppv.toFixed(4), ciLo: _wilsonCI(tp, tp + fp)[0], ciHi: _wilsonCI(tp, tp + fp)[1] },
    npv: { value: +npv.toFixed(4), ciLo: _wilsonCI(tn, tn + fn)[0], ciHi: _wilsonCI(tn, tn + fn)[1] },
    accuracy: { value: +acc.toFixed(4), ciLo: _wilsonCI(tp + tn, N)[0], ciHi: _wilsonCI(tp + tn, N)[1] },
    youden: +youden.toFixed(4),
    f1: +f1.toFixed(4),
    prevalence: +prev.toFixed(4),
    n: N,
    apa: `Sens = ${sens.toFixed(3)} [${_wilsonCI(tp, tp + fn)[0].toFixed(3)}, ${_wilsonCI(tp, tp + fn)[1].toFixed(3)}], Spec = ${spec.toFixed(3)}, PPV = ${ppv.toFixed(3)}, NPV = ${npv.toFixed(3)}, N = ${N}`,
  };
}

// ── Likelihood Ratios ───────────────────────────────────────────────────────
/** @param {Function} fn */
export function likelihoodRatios(tp, fp, tn, fn) {
  if (![tp, fp, tn, fn].every(v => Number.isFinite(v) && v >= 0)) return null;
  if (tp === 0 || fp === 0 || fn === 0 || tn === 0) return null;

  const sens = tp / (tp + fn);
  const spec = tn / (tn + fp);
  const lrPlus = sens / (1 - spec);
  const lrMinus = (1 - sens) / spec;

  const seLogLrPlus = Math.sqrt(Math.max(0, 1 / tp - 1 / (tp + fn) + 1 / fp - 1 / (fp + tn)));
  const seLogLrMinus = Math.sqrt(Math.max(0, 1 / fn - 1 / (tp + fn) + 1 / tn - 1 / (tn + fp)));

  const ciLrPlus = [Math.exp(Math.log(lrPlus) - 1.96 * seLogLrPlus), Math.exp(Math.log(lrPlus) + 1.96 * seLogLrPlus)];
  const ciLrMinus = [Math.exp(Math.log(lrMinus) - 1.96 * seLogLrMinus), Math.exp(Math.log(lrMinus) + 1.96 * seLogLrMinus)];

  return {
    test: 'Likelihood Ratios',
    lrPlus: { value: +lrPlus.toFixed(4), ciLo: +ciLrPlus[0].toFixed(4), ciHi: +ciLrPlus[1].toFixed(4) },
    lrMinus: { value: +lrMinus.toFixed(4), ciLo: +ciLrMinus[0].toFixed(4), ciHi: +ciLrMinus[1].toFixed(4) },
    n: tp + fp + tn + fn,
    apa: `LR+ = ${lrPlus.toFixed(2)} [${ciLrPlus[0].toFixed(2)}, ${ciLrPlus[1].toFixed(2)}], LR- = ${lrMinus.toFixed(2)} [${ciLrMinus[0].toFixed(2)}, ${ciLrMinus[1].toFixed(2)}]`,
  };
}

// ── Net Reclassification Improvement ────────────────────────────────────────
export function netReclassification(pOld, pNew, yTrue, riskThresholds = null) {
  if (!pOld || !pNew || !yTrue || pOld.length !== yTrue.length || pNew.length !== yTrue.length) return null;
  if (!yTrue.every(v => v === 0 || v === 1)) return null;
  if (!riskThresholds || riskThresholds.length < 1) return null;
  const sorted = [...riskThresholds].sort((a, b) => a - b);

  const n = pOld.length;
  const nEvents = yTrue.filter(v => v === 1).length;
  const nNonEvents = n - nEvents;

  // Assign categories
  function category(p) {
    for (let i = 0; i < sorted.length; i++) if (p < sorted[i]) return i;
    return sorted.length;
  }
  const k = sorted.length + 1;
  const reclass = Array.from({ length: k }, () => Array(k).fill(0));

  for (let i = 0; i < n; i++) {
    const oldCat = category(pOld[i]);
    const newCat = category(pNew[i]);
    reclass[oldCat][newCat]++;
  }

  // NRI for events
  let upEvents = 0, downEvents = 0;
  for (let i = 0; i < n; i++) {
    if (yTrue[i] !== 1) continue;
    const oldCat = category(pOld[i]), newCat = category(pNew[i]);
    if (newCat > oldCat) upEvents++;
    else if (newCat < oldCat) downEvents++;
  }
  const nriE = nEvents > 0 ? (upEvents - downEvents) / nEvents : 0;
  const seNriE = nEvents > 0 ? Math.sqrt((upEvents + downEvents) / (nEvents * nEvents)) : 0;

  // NRI for non-events
  let upNon = 0, downNon = 0;
  for (let i = 0; i < n; i++) {
    if (yTrue[i] !== 0) continue;
    const oldCat = category(pOld[i]), newCat = category(pNew[i]);
    if (newCat > oldCat) upNon++;
    else if (newCat < oldCat) downNon++;
  }
  const nriNE = nNonEvents > 0 ? (downNon - upNon) / nNonEvents : 0;
  const seNriNE = nNonEvents > 0 ? Math.sqrt((upNon + downNon) / (nNonEvents * nNonEvents)) : 0;

  const nri = nriE + nriNE;

  return {
    test: 'Net Reclassification Improvement',
    nriEvents: +nriE.toFixed(4),
    nriNonEvents: +nriNE.toFixed(4),
    nri: +nri.toFixed(4),
    n, nEvents, nNonEvents,
    reclassTable: reclass,
    thresholds: sorted,
    apa: `NRI = ${nri.toFixed(3)} (events: ${nriE.toFixed(3)}, non-events: ${nriNE.toFixed(3)}), n = ${n}`,
  };
}

// ── Agreement Table ─────────────────────────────────────────────────────────
export function agreementTable(rater1, rater2, { labels = null } = {}) {
  if (!rater1 || !rater2 || rater1.length !== rater2.length || rater1.length < 2) return null;
  const cats = labels || [...new Set([...rater1, ...rater2])].sort();
  const k = cats.length;
  if (k < 2) return null;
  const catIdx = Object.fromEntries(cats.map((c, i) => [c, i]));
  const table = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < rater1.length; i++) {
    const r = catIdx[rater1[i]] != null ? catIdx[rater1[i]] : -1;
    const c = catIdx[rater2[i]] != null ? catIdx[rater2[i]] : -1;
    if (r >= 0 && c >= 0) table[r][c]++;
  }
  return {
    test: 'Agreement Table',
    table, labels: cats, k, n: rater1.length,
    apa: `Agreement: ${k}×${k} table, n = ${rater1.length}`,
  };
}

// ── Weighted Kappa ──────────────────────────────────────────────────────────
export function weightedKappa(rater1, rater2, { weights = 'linear', labels = null } = {}) {
  if (!rater1 || !rater2 || rater1.length !== rater2.length || rater1.length < 5) return null;
  const cats = labels || [...new Set([...rater1, ...rater2])].sort();
  const k = cats.length;
  if (k < 2) return null;
  const n = rater1.length;
  const catIdx = Object.fromEntries(cats.map((c, i) => [c, i]));
  const O = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < n; i++) {
    const r = catIdx[rater1[i]], c = catIdx[rater2[i]];
    if (r != null && c != null) O[r][c]++;
  }
  const rowSums = O.map(row => row.reduce((s, v) => s + v, 0));
  const colSums = O[0].map((_, j) => O.reduce((s, r) => s + r[j], 0));
  // Standard Cohen's weighted-kappa DISAGREEMENT weight: 0 on the diagonal
  // (no penalty for exact agreement), increasing with |i-j| (more penalty the
  // farther apart the two raters' categories are) — NOT a similarity weight.
  const w = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => {
    if (weights === 'quadratic') return (i - j) ** 2 / ((k - 1) ** 2);
    return Math.abs(i - j) / (k - 1);
  }));
  let sumWO = 0, sumWE = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const Eij = rowSums[i] * colSums[j] / n;
      sumWO += w[i][j] * O[i][j];
      sumWE += w[i][j] * Eij;
    }
  }
  const kappa = sumWE > 0 ? 1 - sumWO / sumWE : 0;
  let seSq = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const pij = O[i][j] / n;
      const piDot = rowSums[i] / n, pDotj = colSums[j] / n;
      const wij = w[i][j];
      let wBarI = 0, wBarJ = 0;
      for (let m = 0; m < k; m++) { wBarI += pij > 0 ? w[i][m] * colSums[m] / n : 0; wBarJ += pij > 0 ? w[m][j] * rowSums[m] / n : 0; }
      wBarI = 0; wBarJ = 0;
      for (let m = 0; m < k; m++) { wBarI += w[i][m] * colSums[m] / n; wBarJ += w[m][j] * rowSums[m] / n; }
      const term = pij * (wij - (rowSums[i] / n) * wBarI - (colSums[j] / n) * wBarJ) ** 2;
      seSq += term;
    }
  }
  seSq /= n;
  const se = Math.sqrt(Math.max(seSq, 1e-14));
  const ci = [Math.max(-1, kappa - 1.96 * se), Math.min(1, kappa + 1.96 * se)];

  return {
    test: 'Weighted Kappa',
    kappa: +kappa.toFixed(4),
    se: +se.toFixed(4),
    ci: [+ci[0].toFixed(4), +ci[1].toFixed(4)],
    weights, k, n,
    apa: `κ_w = ${kappa.toFixed(3)} (${weights}), 95% CI [${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}], k = ${k}, n = ${n}`,
  };
}

// ── AC1 / Gwet's Agreement ──────────────────────────────────────────────────
export function ac1Agreement(rater1, rater2, { labels = null } = {}) {
  if (!rater1 || !rater2 || rater1.length !== rater2.length || rater1.length < 5) return null;
  const cats = labels || [...new Set([...rater1, ...rater2])].sort();
  const k = cats.length;
  if (k < 2) return null;
  const n = rater1.length;
  const catIdx = Object.fromEntries(cats.map((c, i) => [c, i]));
  const O = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < n; i++) {
    const r = catIdx[rater1[i]], c = catIdx[rater2[i]];
    if (r != null && c != null) O[r][c]++;
  }
  const rowSums = O.map(row => row.reduce((s, v) => s + v, 0));
  const colSums = O[0].map((_, j) => O.reduce((s, r) => s + r[j], 0));
  let pObs = 0;
  for (let i = 0; i < k; i++) pObs += O[i][i];
  pObs /= n;
  const pi = cats.map((_, i) => (rowSums[i] + colSums[i]) / (2 * n));
  let pChance = 0;
  for (const p of pi) pChance += p * (1 - p);
  pChance /= (k - 1);
  const ac1 = (1 - pChance) > 0 ? (pObs - pChance) / (1 - pChance) : 0;
  const se = Math.sqrt(pObs * (1 - pObs) / n) / Math.max(1 - pChance, 0.01);
  const ci = [Math.max(-1, ac1 - 1.96 * se), Math.min(1, ac1 + 1.96 * se)];

  return {
    test: "AC1 / Gwet's Agreement",
    ac1: +ac1.toFixed(4),
    se: +se.toFixed(4),
    ci: [+ci[0].toFixed(4), +ci[1].toFixed(4)],
    pObserved: +pObs.toFixed(4),
    pChance: +pChance.toFixed(4),
    k, n,
    apa: `AC1 = ${ac1.toFixed(3)}, 95% CI [${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}], k = ${k}, n = ${n}`,
  };
}

// ── Bland-Altman Ratio ──────────────────────────────────────────────────────
export function blandAltmanRatio(methodA, methodB) {
  if (!methodA || !methodB || methodA.length !== methodB.length || methodA.length < 8) return null;
  if (methodA.some(v => !(v > 0)) || methodB.some(v => !(v > 0))) return null;
  const n = methodA.length;
  const ratios = methodA.map((a, i) => a / methodB[i]);
  const logs = ratios.map(r => Math.log(r));
  const bias = avg(logs);
  const sd = sampleSD(logs);
  if (!sd) return null;
  const tCrit = tInv2(0.05, n - 1);
  const seBias = sd / Math.sqrt(n);
  const loaLower = Math.exp(bias - 1.96 * sd);
  const loaUpper = Math.exp(bias + 1.96 * sd);
  const ciLo = Math.exp(bias - tCrit * seBias);
  const ciHi = Math.exp(bias + tCrit * seBias);

  return {
    test: 'Bland-Altman Ratio',
    bias: +bias.toFixed(4),
    ratio: +Math.exp(bias).toFixed(4),
    loa: { lower: +loaLower.toFixed(4), upper: +loaUpper.toFixed(4) },
    ci: [+ciLo.toFixed(4), +ciHi.toFixed(4)],
    n,
    apa: `BA ratio: geometric mean ratio = ${Math.exp(bias).toFixed(2)}, LOA [${loaLower.toFixed(2)}, ${loaUpper.toFixed(2)}], n = ${n}`,
  };
}

// ── Diagnostic Odds Ratio ───────────────────────────────────────────────────
/** @param {Function} fn */
export function diagnosticOddsRatio(tp, fp, tn, fn) {
  if (![tp, fp, tn, fn].every(v => Number.isFinite(v) && v >= 0)) return null;
  if (tp === 0 || fp === 0 || tn === 0 || fn === 0) return null;
  const dor = tp * tn / (fp * fn);
  const seLog = Math.sqrt(1 / tp + 1 / fp + 1 / tn + 1 / fn);
  const ci = [Math.exp(Math.log(dor) - 1.96 * seLog), Math.exp(Math.log(dor) + 1.96 * seLog)];
  return {
    test: 'Diagnostic Odds Ratio',
    dor: +dor.toFixed(4),
    ci: [+ci[0].toFixed(4), +ci[1].toFixed(4)],
    n: tp + fp + tn + fn,
    apa: `DOR = ${dor.toFixed(1)}, 95% CI [${ci[0].toFixed(1)}, ${ci[1].toFixed(1)}]`,
  };
}

// Youden's J optimal threshold
export function youdenIndex(sens, spec) {
  if (!sens || !spec || sens.length < 2 || sens.length !== spec.length) return null;
  const jVals = sens.map((s, i) => s + spec[i] - 1);
  let bestJ = -Infinity, bestIdx = 0;
  jVals.forEach((j, i) => { if (j > bestJ) { bestJ = j; bestIdx = i; } });
  return {
    test: "Youden's J", youden: +bestJ.toFixed(4), index: bestIdx, sensAtBest: +sens[bestIdx].toFixed(4), specAtBest: +spec[bestIdx].toFixed(4),
    apa: `Youden J = ${bestJ.toFixed(3)} at threshold ${bestIdx}, sens = ${sens[bestIdx].toFixed(2)}, spec = ${spec[bestIdx].toFixed(2)}`,
  };
}

// ── DeLong Test ───────────────────────────────────────────────────
export function deLongTest(roc1, roc2) {
  if (!roc1 || !roc2 || !roc1.scores || !roc2.scores) return null;
  const n1 = roc1.n, n2 = roc2.n;
  if (n1 < 10 || n2 < 10) return null;
  const z = (roc1.auc - roc2.auc) / Math.sqrt(Math.max(roc1.se ** 2 + roc2.se ** 2, 1e-10));
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  return {
    test: 'DeLong Test', z: +z.toFixed(4), p, auc1: +roc1.auc.toFixed(4), auc2: +roc2.auc.toFixed(4),
    apa: `DeLong: z = ${z.toFixed(2)}, AUC₁ = ${roc1.auc.toFixed(3)}, AUC₂ = ${roc2.auc.toFixed(3)}, ${p < 0.05 ? 'significant' : 'n.s.'}`,
  };
}

// ── Partial AUC ───────────────────────────────────────────────────
/** @param {number[]} actual @param {number[]} scores */
export function partialAUC(actual, scores, fprRange = [0, 1]) {
  if (!actual || !scores || actual.length < 5 || actual.length !== scores.length) return null;
  const labels = actual.map(v => +v);
  if (labels.every(v => v === 0) || labels.every(v => v === 1)) return null;
  const pairs = labels.map((l, i) => ({ l, s: +scores[i] })).sort((a, b) => b.s - a.s);
  let tp = 0, fp = 0;
  const totalP = labels.filter(v => v === 1).length;
  const totalN = labels.filter(v => v === 0).length;
  let prevFpr = 0, prevTpr = 0;
  let pauc = 0;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].l === 1) tp++; else fp++;
    if (i < pairs.length - 1 && pairs[i].s === pairs[i + 1].s) continue;
    const tpr = tp / totalP;
    const fpr = fp / totalN;
    if (fpr >= fprRange[0] && fpr <= fprRange[1] && prevFpr >= fprRange[0]) {
      const lo = Math.max(fprRange[0], prevFpr), hi = Math.min(fprRange[1], fpr);
      if (hi > lo) pauc += (hi - lo) * (tpr + prevTpr) / 2;
    }
    prevFpr = fpr; prevTpr = tpr;
    if (fpr > fprRange[1]) break;
  }
  return {
    test: 'Partial AUC', pauc: +pauc.toFixed(4), fprRange, n: actual.length,
    apa: `pAUC(${[fprRange[0].toFixed(2), fprRange[1].toFixed(2)]}) = ${pauc.toFixed(3)}`,
  };
}

// ── Optimal Threshold via cost-ratio ──────────────────────────────
/** @param {number[]} actual @param {number[]} scores */
export function optimalThreshold(actual, scores, { costRatio = 1 } = {}) {
  if (!actual || !scores || actual.length < 5 || actual.length !== scores.length) return null;
  const labels = actual.map(v => +v);
  if (labels.every(v => v === 0) || labels.every(v => v === 1)) return null;
  const pairs = labels.map((l, i) => ({ l, s: +scores[i] })).sort((a, b) => b.s - a.s);
  let tp = 0, fp = 0;
  const totalP = labels.filter(v => v === 1).length;
  const totalN = labels.filter(v => v === 0).length;
  let bestCost = Infinity, bestThresh = pairs[0].s;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].l === 1) tp++; else fp++;
    const fn = totalP - tp, tn = totalN - fp;
    const cost = costRatio * fn + fp;
    if (cost < bestCost && (i === pairs.length - 1 || pairs[i].s !== pairs[i + 1]?.s)) {
      bestCost = cost;
      bestThresh = pairs[i].s;
    }
  }
  const sens = tp / totalP, spec = (totalN - fp) / totalN;
  return {
    test: 'Optimal Threshold', threshold: +bestThresh.toFixed(4), sens: +sens.toFixed(4), spec: +spec.toFixed(4), costRatio, n: actual.length,
    apa: `Optimal threshold = ${bestThresh.toFixed(3)}, sens = ${sens.toFixed(2)}, spec = ${spec.toFixed(2)}`,
  };
}

// Fleiss' Kappa
/** @param {string[]} items */
export function fleissKappa(data, raters, items) {
  if (!data || data.length < 5 || !raters || !raters.length || !items || !items.length) return null;
  const n = data.length, m = raters.length, k = items.length;
  // Build n × k matrix of counts per category per subject
  const counts = Array.from({ length: n }, () => Array(k).fill(0));
  data.forEach((row, i) => {
    raters.forEach(r => {
      const val = row[r];
      const idx = items.indexOf(val);
      if (idx >= 0) counts[i][idx]++;
    });
  });
  // Fleiss' kappa
  const p_i = counts.map(cs => {
    let s = 0;
    for (let j = 0; j < k; j++) s += cs[j] * (cs[j] - 1);
    return s / (m * (m - 1));
  });
  const P_bar = p_i.reduce((s, v) => s + v, 0) / n;
  const p_j = Array(k).fill(0);
  for (let j = 0; j < k; j++) {
    for (let i = 0; i < n; i++) p_j[j] += counts[i][j];
    p_j[j] /= n * m;
  }
  const P_e = p_j.reduce((s, v) => s + v * v, 0);
  const kappa = (1 - P_e) > 0 ? (P_bar - P_e) / (1 - P_e) : 0;
  return {
    test: "Fleiss' Kappa", kappa: +kappa.toFixed(4), n, nRaters: m, nItems: k,
    apa: `Fleiss' kappa = ${kappa.toFixed(3)}, ${m} raters, ${k} items, n = ${n}`,
  };
}

// Krippendorff's Alpha
/** @param {string[]} items */
export function krippendorffAlpha(data, raters, items, { level = 'nominal' } = {}) {
  if (!data || data.length < 5 || !raters || raters.length < 2 || !items || !items.length) return null;
  const n = data.length, m = raters.length;
  // Build agreement matrix
  const pairs = [];
  let nValues = 0;
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < m; a++) {
      if (items.indexOf(data[i][raters[a]]) >= 0) nValues++;
      for (let b = a + 1; b < m; b++) {
        const va = data[i][raters[a]], vb = data[i][raters[b]];
        pairs.push({ u: items.indexOf(va), v: items.indexOf(vb) });
      }
    }
  }
  const N = pairs.length;
  if (!N) return null;
  // Observed disagreement
  let D_o = 0;
  for (const p of pairs) {
    if (level === 'ordinal' && p.u >= 0 && p.v >= 0) D_o += (p.u - p.v) ** 2;
    else if (p.u !== p.v) D_o += 1;
  }
  D_o /= N;
  // Expected disagreement
  const freqs = Array(items.length).fill(0);
  for (const p of pairs) { if (p.u >= 0) freqs[p.u]++; if (p.v >= 0) freqs[p.v]++; }
  const fNorm = freqs.map(f => f / (2 * N));
  let D_e = 0;
  for (let a = 0; a < items.length; a++) {
    for (let b = 0; b < items.length; b++) {
      if (a === b) continue;
      const d = level === 'ordinal' ? (a - b) ** 2 : 1;
      D_e += d * fNorm[a] * fNorm[b];
    }
  }
  // Krippendorff's alpha's coincidence-matrix formula computes the expected
  // (chance) disagreement from category marginals with denominator
  // nValues·(nValues−1), not nValues² — apply that finite-population
  // correction (fNorm's implicit n² needs scaling by n/(n-1)).
  D_e *= nValues / Math.max(1, nValues - 1);
  const alpha = D_e > 0 ? 1 - D_o / D_e : 0;
  return {
    test: "Krippendorff's Alpha", alpha: +alpha.toFixed(4), level, n, nRaters: m, nItems: items.length,
    apa: `Krippendorff alpha = ${alpha.toFixed(3)} (${level}), ${m} raters, n = ${n}`,
  };
}

// Cliff's Delta
/** @param {number[]} b */
export function cliffsDelta(a, b) {
  if (!a || !b || a.length < 5 || b.length < 5) return null;
  const nA = a.length, nB = b.length;
  let dominate = 0, ties = 0;
  for (const va of a) for (const vb of b) {
    if (va > vb) dominate++;
    else if (va === vb) ties++;
  }
  const total = nA * nB;
  const delta = (dominate - (total - dominate - ties)) / total;
  const se = Math.sqrt((nA + nB + 1) / (3 * nA * nB));
  const z = se > 0 ? delta / se : 0;
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  const label = Math.abs(delta) >= 0.474 ? 'large' : Math.abs(delta) >= 0.33 ? 'medium' : Math.abs(delta) >= 0.147 ? 'small' : 'negligible';
  return {
    test: "Cliff's Delta", delta: +delta.toFixed(4), se: +se.toFixed(4), z: +z.toFixed(4), p, label, n1: nA, n2: nB,
    apa: `Cliff's delta = ${delta.toFixed(3)} [${label}], p = ${p.toFixed(3)}`,
  };
}

// ── Rank-Biserial ─────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} groupVar */
export function rankBiserial(data, groupVar, scoreVar) {
  if (!data || data.length < 6 || !groupVar || !scoreVar) return null;
  const groups = [...new Set(data.map(r => r[groupVar]))];
  if (groups.length !== 2) return null;
  const g0 = data.filter(r => r[groupVar] === groups[0]).map(r => +r[scoreVar]);
  const g1 = data.filter(r => r[groupVar] === groups[1]).map(r => +r[scoreVar]);
  if (g0.length < 3 || g1.length < 3) return null;
  const allVals = [...g0, ...g1];
  const ranks = {};
  [...allVals].sort((a, b) => a - b).forEach((v, i) => { ranks[v] = i + 1; });
  const r0 = avg(g0.map(v => ranks[v]));
  const r1 = avg(g1.map(v => ranks[v]));
  const N = allVals.length;
  const rbc = 2 * (r1 - r0) / N;
  const U = g0.length * g1.length + g1.length * (g1.length + 1) / 2 - g0.map(v => ranks[v]).reduce((s, v) => s + v, 0);
  const p = U / (g0.length * g1.length);
  return {
    test: 'Rank-Biserial', rbc: +rbc.toFixed(4), pSuperiority: +p.toFixed(4), n1: g0.length, n2: g1.length,
    apa: `Rank-biserial = ${rbc.toFixed(3)}, P(superiority) = ${p.toFixed(3)}`,
  };
}

// ── Stochastic Ordering ───────────────────────────────────────────
export function stochasticOrdering(groups) {
  if (!groups || groups.length < 2) return null;
  const valid = groups.filter(g => g.vals && g.vals.length >= 3);
  if (valid.length < 2) return null;
  const k = valid.length;
  const pairs = [];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      let count = 0, total = 0;
      for (const vi of valid[i].vals) for (const vj of valid[j].vals) {
        total++;
        if (vi > vj) count++;
        else if (vi === vj) count += 0.5;
      }
      const Aij = total > 0 ? count / total : 0.5;
      pairs.push({ g1: valid[i].name, g2: valid[j].name, A: +Aij.toFixed(4), direction: Aij > 0.56 ? '>' : Aij < 0.44 ? '<' : '≈' });
    }
  }
  return {
    test: 'Stochastic Ordering', pairs, k,
    apa: `Stochastic ordering: ${pairs.length} pairwise comparisons across ${k} groups`,
  };
}

// ── Population Attributable Fraction ──────────────────────────────
export function populationAttributableFraction(prevalence, or) {
  if (!Number.isFinite(prevalence) || !Number.isFinite(or) || prevalence <= 0 || prevalence >= 1 || or <= 0) return null;
  const paf = prevalence * (or - 1) / (prevalence * (or - 1) + 1);
  const se = Math.sqrt((or * or * prevalence * (1 - prevalence)) / (Math.pow(prevalence * (or - 1) + 1, 4)));
  const ci = [Math.max(0, paf - 1.96 * se), Math.min(1, paf + 1.96 * se)];
  return { test: 'Population Attributable Fraction', paf: +paf.toFixed(4), se: +se.toFixed(4), ci: [+ci[0].toFixed(4), +ci[1].toFixed(4)], prevalence: +prevalence.toFixed(4), or: +or.toFixed(4), apa: `PAF = ${(paf * 100).toFixed(1)}%` };
}

// ── Cornfield Bounds ──────────────────────────────────────────────
// ── Cornfield Bounds (Cornfield 1959; Schlesselman 1978) ───────────────────
// The classic bound on unmeasured confounding: given an unmeasured binary
// confounder present with probability `confounderPrevalence` among the
// exposed (and absent among the unexposed), this is the minimum relative
// risk that confounder would need with the OUTCOME to fully explain away the
// observed exposure-disease OR: RR_CD,min = OR / (p·(OR−1) + 1). The
// previous implementation accepted `confounderPrevalence` but never used it
// — it just returned the ordinary Wald 95% CI lower bound of the OR, which
// answers a different question (sampling uncertainty, not confounding).
/** @param {number} b @param {number} c @param {number} d */
export function cornfieldBounds(a, b, c, d, confounderPrevalence) {
  if (![a, b, c, d].every(v => v > 0) || !Number.isFinite(confounderPrevalence) || confounderPrevalence <= 0 || confounderPrevalence >= 1) return null;
  const or = a * d / (b * c);
  const n = a + b + c + d;
  const minRR = or / (confounderPrevalence * (or - 1) + 1);
  const seLogOR = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  const ciLow = +(or * Math.exp(-1.96 * seLogOR)).toFixed(4), ciHigh = +(or * Math.exp(1.96 * seLogOR)).toFixed(4);
  return { test: 'Cornfield Bounds', observedOR: +or.toFixed(4), lowerBound: +minRR.toFixed(4), minConfounderRR: +minRR.toFixed(4), ciLow, ciHigh, confounderPrevalence, n, apa: `Cornfield: OR=${or.toFixed(2)}, confounder must have RR≥${minRR.toFixed(2)} with the outcome (at prevalence ${confounderPrevalence}) to explain it away` };
}

// ── Hosmer-Lemeshow ───────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar */
export function hosmerLemeshow(data, yVar, probVar, { nGroups = 10 } = {}) {
  if (!data || data.length < 20 || !yVar || !probVar) return null;
  const n = data.length;
  const pairs = data.map(r => ({ p: +r[probVar], y: +r[yVar] })).sort((a, b) => a.p - b.p);
  const size = Math.floor(n / nGroups);
  let chi2 = 0;
  for (let g = 0; g < nGroups; g++) {
    const group = pairs.slice(g * size, Math.min((g + 1) * size, n));
    const obs = group.reduce((s, r) => s + r.y, 0);
    const exp = group.reduce((s, r) => s + r.p, 0);
    if (exp > 0 && group.length - exp > 0) chi2 += (obs - exp) ** 2 / exp + (group.length - obs - (group.length - exp)) ** 2 / (group.length - exp);
  }
  const p = chiPVal(Math.max(0, chi2), nGroups - 2);
  return { test: 'Hosmer-Lemeshow', chi2: +chi2.toFixed(4), df: nGroups - 2, p, nGroups, n, apa: `HL: χ²(${nGroups - 2}) = ${chi2.toFixed(2)}, ${p < 0.05 ? 'poor fit' : 'good fit'}` };
}

// ── Calibration Plot ──────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar */
export function calibrationPlot(data, yVar, probVar, { nBins = 10 } = {}) {
  if (!data || data.length < 20 || !yVar || !probVar) return null;
  const n = data.length;
  const pairs = data.map(r => ({ p: +r[probVar], y: +r[yVar] })).sort((a, b) => a.p - b.p);
  const size = Math.floor(n / nBins);
  const bins = [];
  for (let b = 0; b < nBins; b++) {
    const group = pairs.slice(b * size, Math.min((b + 1) * size, n));
    const obs = group.reduce((s, r) => s + r.y, 0) / group.length;
    const pred = group.reduce((s, r) => s + r.p, 0) / group.length;
    bins.push({ bin: b + 1, n: group.length, observed: +obs.toFixed(4), predicted: +pred.toFixed(4) });
  }
  return { test: 'Calibration Plot', bins, n, apa: `Calibration: ${nBins} bins, n = ${n}` };
}

// ── Net Benefit ───────────────────────────────────────────────────
export function netBenefit(probs, yTrue, thresholds) {
  if (!probs || !yTrue || probs.length < 5 || probs.length !== yTrue.length || !thresholds) return null;
  const n = probs.length;
  const nb = thresholds.map(t => {
    let tp = 0, fp = 0;
    for (let i = 0; i < n; i++) { if (probs[i] >= t) { if (yTrue[i] === 1) tp++; else fp++; } }
    const nbVal = tp / n - (t / (1 - t)) * (fp / n);
    return { threshold: +t.toFixed(4), netBenefit: +nbVal.toFixed(4) };
  });
  return { test: 'Net Benefit', netBenefits: nb, n, apa: `NB: ${thresholds.length} thresholds` };
}

// ── Decision Curve ────────────────────────────────────────────────
export function decisionCurve(probs, yTrue, thresholds) {
  if (!probs || !yTrue || probs.length < 5 || !thresholds) return null;
  const n = probs.length;
  const nEvents = yTrue.filter(v => v === 1).length;
  const treatAll = +nEvents / n;
  const coordinates = thresholds.map(t => {
    let tp = 0, fp = 0;
    for (let i = 0; i < n; i++) { if (probs[i] >= t) { if (yTrue[i] === 1) tp++; else fp++; } }
    const nb = tp / n - (t / (1 - t)) * (fp / n);
    return { threshold: +t.toFixed(4), netBenefit: +nb.toFixed(4), treatAll: +treatAll.toFixed(4), treatNone: 0 };
  });
  return { test: 'Decision Curve', coordinates, n, apa: `Decision curve: ${thresholds.length} thresholds` };
}

// ── Brier Score ───────────────────────────────────────────────────
export function brierScore(probs, yTrue) {
  if (!probs || !yTrue || probs.length < 5 || probs.length !== yTrue.length) return null;
  const n = probs.length;
  let bs = 0;
  for (let i = 0; i < n; i++) bs += (probs[i] - yTrue[i]) ** 2;
  bs /= n;
  return { test: 'Brier Score', brier: +bs.toFixed(4), n, apa: `Brier = ${bs.toFixed(4)}` };
}

// ── Haybittle-Peto Boundaries ─────────────────────────────────────
/** @param {number} [alpha] */
export function haybittlePeto(stages, alpha = 0.05) {
  if (!stages || stages < 1) return null;
  const z = 3.0;
  const boundaries = Array.from({ length: stages }, (_, i) => ({
    stage: i + 1, z: i < stages - 1 ? z : 1.96,
  }));
  return { test: 'Haybittle-Peto', boundaries, stages, alpha, apa: `HP: ${stages} looks, z = ${z} for interim` };
}

// ── Wang-Tsiatis Boundarie ────────────────────────────────────────
/** @param {number} [alpha] @param {number} [delta] */
export function wangTsiatis(stages, alpha = 0.05, delta = 0.5) {
  if (!stages || stages < 1) return null;
  const t = Array.from({ length: stages }, (_, i) => (i + 1) / stages);
  const boundaries = t.map(tk => ({
    t: +tk.toFixed(4), boundary: +(2 * Math.pow(tk, delta - 0.5)).toFixed(4),
  }));
  return { test: 'Wang-Tsiatis', boundaries, stages, alpha, delta, apa: `WT(δ=${delta}): ${stages} stages` };
}

// ── Inverse Normal Combination Test ───────────────────────────────
export function inverseNormal(t1, t2, z1, z2, info1, info2) {
  if (!Number.isFinite(z1) || !Number.isFinite(z2)) return null;
  const w1 = Math.sqrt(info1), w2 = Math.sqrt(info2);
  const z = (w1 * z1 + w2 * z2) / Math.sqrt(w1 * w1 + w2 * w2);
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  return { test: 'Inverse Normal', z: +z.toFixed(4), p, t1, t2, apa: `IN-test: z = ${z.toFixed(2)}, ${p < 0.05 ? 'significant' : 'n.s.'}` };
}

// ── Fisher's Combination Test ─────────────────────────────────────
/** @param {number[]} pValues */
export function fisherCombination(pValues) {
  if (!pValues || !pValues.length || pValues.length < 2) return null;
  const chi2 = -2 * pValues.reduce((s, p) => s + Math.log(Math.max(p, 0.0001)), 0);
  const df = 2 * pValues.length;
  const p = chiPVal(Math.max(0, chi2), df);
  return { test: 'Fisher Combination', chi2: +chi2.toFixed(4), df, p, nStages: pValues.length, apa: `Fisher: χ²(${df}) = ${chi2.toFixed(2)}, p = ${p.toFixed(4)}` };
}

// ── Adaptive Design (combined-information power) ────────────────────────────
// Replaces an ad hoc `1 - exp(-2·target²/(1/n1+1/n2))` expression — not a
// recognized power/significance distribution and independent of α — with the
// standard normal-approximation power formula Φ(δ - z_{α/2}), δ = target·
// √(n1n2/(n1+n2)), using a real z-critical for the requested α. Note this is
// the *fixed-design* two-stage-information analogue, not a true group-
// sequential conditional-power recalculation (which needs an interim test
// statistic and information fraction, not just n1/n2) — `method` is
// currently accepted but not yet used to select an actual boundary/spending
// function; see BASELINE.md for the follow-up scope.
/** @param {string} [method] @param {number} [alpha] */
export function adaptiveDesign(n1, n2, target, method = 'OCP', alpha = 0.05) {
  if (!n1 || !n2 || !Number.isFinite(target)) return null;
  const total = n1 + n2;
  const zCrit = normalINV(1 - alpha / 2);
  const delta = Math.abs(target) * Math.sqrt((n1 * n2) / (n1 + n2));
  const power = Math.max(0, Math.min(1, normalCDF(delta - zCrit)));
  return { test: 'Adaptive Design', n1, n2, total, power: +power.toFixed(4), method, alpha, apa: `Adaptive: n1=${n1}, n2=${n2}, power ≈ ${power.toFixed(2)} (α=${alpha})` };
}

// ── Clinical Utility Index ────────────────────────────────────────
/** @param {number} [benefitWeight] @param {number} [harmWeight] */
export function clinicalUtility(sens, spec, diseasePrevalence, benefitWeight = 1, harmWeight = 1) {
  if (!Number.isFinite(sens) || !Number.isFinite(spec) || !Number.isFinite(diseasePrevalence)) return null;
  const tpBenefit = sens * diseasePrevalence * benefitWeight;
  const fpHarm = (1 - spec) * (1 - diseasePrevalence) * harmWeight;
  const utility = tpBenefit - fpHarm;
  const netBenefit = utility / Math.max(diseasePrevalence, 0.01);
  return { test: 'Clinical Utility', sens: +sens.toFixed(4), spec: +spec.toFixed(4), prevalence: +diseasePrevalence.toFixed(4), utility: +utility.toFixed(4), netBenefit: +netBenefit.toFixed(4), apa: `Utility = ${utility.toFixed(3)}, net benefit = ${netBenefit.toFixed(2)}` };
}
