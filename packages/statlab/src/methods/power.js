import { normalCDF, normalINV, ncFCDF } from '../math/distributions.js';
import { avg } from '../math/core.js';
import { fCritUpper, powerANOVA as _powerANOVA, powerChi as _powerChi, powerLogistic as _powerLogistic,
  powerMixed as _powerMixed, powerMediation as _powerMediation, computePowerCorr,
  requiredN as _requiredN, requiredNCorr as _requiredNCorr,
  requiredNTTest as _requiredNTTest, requiredNOneProp as _requiredNOneProp,
  requiredNTwoProp as _requiredNTwoProp, requiredNWilcoxon as _requiredNWilcoxon,
  requiredNLogRank as _requiredNLogRank, requiredNOLS as _requiredNOLS,
  powerTTest as _powerTTest, powerOneProportion as _powerOneProportion,
  powerTwoProportion as _powerTwoProportion, powerWilcoxon as _powerWilcoxon,
  powerLogRank as _powerLogRank, powerRMANOVA as _powerRMANOVA,
  powerOLS as _powerOLS, powerSpearman as _powerSpearman,
} from '../math/power.js';

// ── Cox PH Power (Hsieh & Lavori 2000) ───────────────────────────────────────
/** @param {number} [rSquaredOther] @param {number} [k] @param {number} [alpha] @param {number} nEvents @param {number} hr */
export function powerCoxPH(nEvents, hr, rSquaredOther = 0, k = 1, alpha = 0.05) {
  if (nEvents < 5 || hr <= 0 || !(rSquaredOther >= 0 && rSquaredOther < 1) || !(k >= 0)) return null;
  const nEff = nEvents * (1 - rSquaredOther);
  const lambda = nEff * Math.log(hr) ** 2 / 4;
  const zc = normalINV(1 - alpha / 2);
  const power = normalCDF(Math.sqrt(lambda) - zc);
  return {
    test: 'Cox PH Power',
    power: +power.toFixed(4),
    nEvents, hr, rSquaredOther, k, alpha,
    apa: `Power = ${power.toFixed(3)} (Cox PH, events = ${nEvents}, HR = ${hr}, R²_other = ${rSquaredOther}, k = ${k})`,
  };
}

// ── Meta-Analysis Power (Hedges & Pigott 2001) ────────────────────────────────
/** @param {number} k @param {number} d @param {number} [tau2] @param {number} [nPerStudy] @param {number} [alpha] */
export function powerMetaAnalysis(k, d, tau2 = 0, nPerStudy = 50, alpha = 0.05) {
  if (k < 3 || !Number.isFinite(d) || !(tau2 >= 0) || nPerStudy < 4) return null;
  const v = 4 / nPerStudy + d * d / (2 * nPerStudy);
  const wPer = 1 / (v + tau2);
  const varD = 1 / (k * wPer);
  const lambda = Math.abs(d) / Math.sqrt(varD);
  const zc = normalINV(1 - alpha / 2);
  const power = normalCDF(lambda - zc);
  return {
    test: 'Meta-Analysis Power',
    power: +power.toFixed(4),
    k, d, tau2: +tau2.toFixed(5), nPerStudy, alpha,
    apa: `Power = ${power.toFixed(3)} (meta-analysis, k = ${k}, d = ${d}, τ² = ${tau2.toFixed(4)})`,
  };
}

// ── TOST Equivalence Power ────────────────────────────────────────────────────
/** @param {number} [alpha] @param {number} meanDiff @param {number} se @param {number} dL @param {number} dU */
export function powerEquivalence(meanDiff, se, dL, dU, alpha = 0.05) {
  if (!(se > 0) || dL >= dU || !Number.isFinite(meanDiff)) return null;
  if (meanDiff < dL || meanDiff > dU) {
    return {
      test: 'Equivalence Power (TOST)',
      power: 0,
      meanDiff, se, dL, dU, alpha,
      apa: `Power = 0.000 (mean diff ${meanDiff.toFixed(3)} outside bounds [${dL}, ${dU}])`,
    };
  }
  const ncpLow = (meanDiff - dL) / se;
  const ncpHigh = (dU - meanDiff) / se;
  const zc = normalINV(1 - alpha);
  const power = normalCDF(Math.abs(ncpLow) - zc) * normalCDF(Math.abs(ncpHigh) - zc);
  return {
    test: 'Equivalence Power (TOST)',
    power: +power.toFixed(4),
    meanDiff: +meanDiff.toFixed(4), se: +se.toFixed(4), dL, dU, alpha,
    apa: `Power = ${power.toFixed(3)} (TOST, bounds [${dL}, ${dU}], α = ${alpha})`,
  };
}

// ── Interaction ANOVA Power ───────────────────────────────────────────────────
// Power via the exact noncentral F CDF (Poisson-mixture series, verified
// against scipy.stats.ncf) rather than a normal approximation to the
// noncentral F's mean/variance, which can overstate power by several
// percentage points at moderate-to-large noncentrality.
/** @param {number} [alpha] @param {number} kA @param {number} kB @param {number} nPerCell @param {number} fInt */
export function powerInteractionANOVA(kA, kB, nPerCell, fInt, alpha = 0.05) {
  if (kA < 2 || kB < 2 || nPerCell < 2 || !(fInt > 0)) return null;
  const df1 = (kA - 1) * (kB - 1);
  const df2 = kA * kB * (nPerCell - 1);
  if (df2 < 1) return null;
  const ncp = nPerCell * kA * kB * fInt * fInt;
  const fCrit = fCritUpper(alpha, df1, df2);
  const power = 1 - ncFCDF(fCrit, df1, df2, ncp);
  return {
    test: 'Interaction ANOVA Power',
    power: +power.toFixed(4),
    kA, kB, nPerCell, fInt, alpha,
    apa: `Power = ${power.toFixed(3)} (A×B interaction, ${kA}×${kB}, n/cell = ${nPerCell}, f = ${fInt})`,
  };
}

// ── Power Wrappers ──────────────────────────────────────────────────────────
/** @param {number} k @param {number} [alpha] @param {number} [seed] @param {number} cohenF @param {number} nPerGroup */
export function powerANOVA(cohenF, k, nPerGroup, alpha = 0.05, seed = 42) {
  const p = _powerANOVA(cohenF, k, nPerGroup, alpha, seed);
  if (p == null) return null;
  return { test: 'ANOVA Power', power: +p.toFixed(4), cohenF, f2: +(cohenF * cohenF).toFixed(4), k, nPerGroup, alpha, apa: `Power = ${p.toFixed(3)} (one-way ANOVA, k = ${k}, n/group = ${nPerGroup}, f = ${cohenF})` };
}

// ── Chi-Square Power ──────────────────────────────────────────────

/** @param {number} df @param {number} [alpha] @param {number} cohenW @param {number} N */
export function powerChiSq(cohenW, df, N, alpha = 0.05) {
  const p = _powerChi(cohenW, df, N, alpha);
  if (p == null) return null;
  return { test: 'Chi-Square Power', power: +p.toFixed(4), cohenW, df, N, alpha, apa: `Power = ${p.toFixed(3)} (χ² test, df = ${df}, N = ${N}, w = ${cohenW})` };
}

// ── Logistic Power ────────────────────────────────────────────────

/** @param {number} [alpha] @param {number} or @param {number} pControl @param {number} nPerGroup */
export function powerLogisticReg(or, pControl, nPerGroup, alpha = 0.05) {
  const p = _powerLogistic(or, pControl, nPerGroup, alpha);
  if (p == null) return null;
  return { test: 'Logistic Power', power: +p.toFixed(4), or, pControl, nPerGroup, alpha, apa: `Power = ${p.toFixed(3)} (logistic, OR = ${or}, p₀ = ${pControl}, n/group = ${nPerGroup})` };
}

// ── Multilevel Power ──────────────────────────────────────────────

/** @param {number} d @param {number} [alpha] @param {number} ICC @param {number} mClustersEach @param {number} subjectsPerCluster */
export function powerMultilevel(ICC, mClustersEach, subjectsPerCluster, d, alpha = 0.05) {
  const p = _powerMixed(ICC, mClustersEach, subjectsPerCluster, d, alpha);
  if (p == null) return null;
  const deff = 1 + (subjectsPerCluster - 1) * ICC;
  const nEff = Math.floor(mClustersEach * subjectsPerCluster / deff);
  return { test: 'Multilevel Power', power: +p.toFixed(4), ICC, mClustersEach, subjectsPerCluster, d, nEff, alpha, apa: `Power = ${p.toFixed(3)} (multilevel, ICC = ${ICC}, ${mClustersEach} clusters × ${subjectsPerCluster}, d = ${d})` };
}

// ── Correlation Power ─────────────────────────────────────────────

/** @param {number} n @param {number} [alpha] @param {number} r */
export function powerCorrelation(n, r, alpha = 0.05) {
  if (n < 5 || !Number.isFinite(r) || Math.abs(r) >= 1) return null;
  const p = computePowerCorr(n, r, alpha);
  return { test: 'Correlation Power', power: +p.toFixed(4), n, r, alpha, apa: `Power = ${p.toFixed(3)} (correlation, n = ${n}, r = ${r})` };
}

// ── Mediation Power ───────────────────────────────────────────────

/** @param {number} aHat @param {number} bHat @param {number} seA @param {number} seB */
export function powerMediationTest(aHat, bHat, seA, seB, { B = 2000, alpha = 0.05, seed = 42 } = {}) {
  const r = _powerMediation(aHat, bHat, seA, seB, B, alpha, seed);
  if (!r) return null;
  return { test: 'Mediation Power', powerMC: +r.powerMC.toFixed(4), powerAsymp: +r.powerAsymp.toFixed(4), aHat, bHat, seA, seB, B, alpha, apa: `Mediation power: MC = ${r.powerMC.toFixed(3)}, asymp = ${r.powerAsymp.toFixed(3)}` };
}

// ── Required-N Wrappers ─────────────────────────────────────────────────────
/** @param {number} d @param {number} [power] @param {number} [alpha] @param {string} [type] */
export function requiredNT(d, power = 0.8, alpha = 0.05, type = 'two-sample') {
  const n = type === 'two-sample' || type === 'paired' ? _requiredNTTest(d, type, power, alpha) : _requiredN(d, power, alpha);
  if (n == null || n >= 10000) return null;
  return { test: 'Required N (t-test)', n, d, power, alpha, type, apa: `Required n = ${n} per group (t-test, d = ${d}, power = ${power}, α = ${alpha})` };
}

// ── Required N (Correlation) ──────────────────────────────────────

/** @param {number} [power] @param {number} [alpha] @param {number} r */
export function requiredNCorrelation(r, power = 0.8, alpha = 0.05) {
  const n = _requiredNCorr(r, power, alpha);
  if (n == null || n >= 10000) return null;
  return { test: 'Required N (Correlation)', n, r, power, alpha, apa: `Required n = ${n} (correlation, r = ${r}, power = ${power})` };
}

// ── Required N (One Proportion) ───────────────────────────────────

/** @param {number} [power] @param {number} [alpha] @param {number} p0 @param {number} p1 */
export function requiredNOneProp(p0, p1, power = 0.8, alpha = 0.05) {
  const n = _requiredNOneProp(p0, p1, power, alpha);
  if (n == null || n >= 20000) return null;
  return { test: 'Required N (One Proportion)', n, p0, p1, power, alpha, apa: `Required n = ${n} (one prop, p₀ = ${p0} vs p₁ = ${p1}, power = ${power})` };
}

// ── Required N (Two Proportions) ──────────────────────────────────

/** @param {number} [power] @param {number} [alpha] @param {number} p1 @param {number} p2 */
export function requiredNTwoProp(p1, p2, power = 0.8, alpha = 0.05) {
  const n = _requiredNTwoProp(p1, p2, power, alpha);
  if (n == null || n >= 20000) return null;
  return { test: 'Required N (Two Proportions)', n, p1, p2, power, alpha, apa: `Required n = ${n} per group (two props, p₁ = ${p1} vs p₂ = ${p2}, power = ${power})` };
}

// ── Required N (Wilcoxon) ─────────────────────────────────────────

/** @param {number} d @param {number} [power] @param {number} [alpha] */
export function requiredNWilcoxon(d, power = 0.8, alpha = 0.05) {
  const n = _requiredNWilcoxon(d, power, alpha);
  if (n == null || n >= 5000) return null;
  return { test: 'Required N (Wilcoxon)', n, d, power, alpha, apa: `Required n = ${n} per group (MWU, d = ${d}, power = ${power})` };
}

// ── Required N (Log-Rank) ─────────────────────────────────────────

/** @param {number} [power] @param {number} [alpha] @param {number} hr */
export function requiredNLogRank(hr, power = 0.8, alpha = 0.05) {
  const n = _requiredNLogRank(hr, power, alpha);
  if (n == null || n >= 20000) return null;
  return { test: 'Required N (Log-Rank)', nEvents: n, hr, power, alpha, apa: `Required events = ${n} (log-rank, HR = ${hr}, power = ${power})` };
}

// ── Required N (OLS) ──────────────────────────────────────────────

/** @param {number} [k] @param {number} [power] @param {number} [alpha] @param {number} rSquared */
export function requiredNOLS(rSquared, k = 1, power = 0.8, alpha = 0.05) {
  const n = _requiredNOLS(rSquared, k, power, alpha);
  if (n == null || n >= 5000) return null;
  return { test: 'Required N (OLS)', n, rSquared, k, power, alpha, apa: `Required n = ${n} (OLS, R² = ${rSquared}, k = ${k}, power = ${power})` };
}

// ── Required N (ANOVA) ────────────────────────────────────────────

/** @param {number} k @param {number} [power] @param {number} [alpha] @param {number} cohenF */
export function requiredNANOVA(cohenF, k, power = 0.8, alpha = 0.05) {
  if (!(cohenF > 0) || k < 2) return null;
  let lo = 2, hi = 5000;
  for (let i = 0; i < 60; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const pw = _powerANOVA(cohenF, k, mid, alpha, 42);
    if (pw != null && pw >= power) hi = mid; else lo = mid;
  }
  return { test: 'Required N (ANOVA)', nPerGroup: hi, cohenF, k, power, alpha, apa: `Required n = ${hi} per group (ANOVA, k = ${k}, f = ${cohenF}, power = ${power})` };
}

// ── Already-APA Re-exports ──────────────────────────────────────────────────
/** @param {number} n1 @param {number} [n2] @param {number} [d] @param {"two-sample" | "paired" | "one-sample"} [type] @param {number} [alpha] */
export function powerTTestWrapper(n1, n2 = n1, d = 0.5, type = 'two-sample', alpha = 0.05) {
  const r = _powerTTest(n1, n2, d, type, alpha);
  if (!r) return null;
  return { test: 'T-Test Power', ...r };
}

// ── One-Proportion Power ──────────────────────────────────────────

/** @param {number} n @param {number} [alpha] @param {number} p0 @param {number} p1 */
export function powerProportionOne(n, p0, p1, alpha = 0.05) {
  const r = _powerOneProportion(n, p0, p1, alpha);
  if (!r) return null;
  return { test: 'One-Proportion Power', ...r };
}

// ── Two-Proportion Power ──────────────────────────────────────────

/** @param {number} [alpha] @param {number} p1 @param {number} p2 @param {number} n1 @param {number} n2 */
export function powerProportionTwo(n1, n2, p1, p2, alpha = 0.05) {
  const r = _powerTwoProportion(n1, n2, p1, p2, alpha);
  if (!r) return null;
  return { test: 'Two-Proportion Power', ...r };
}

// ── Wilcoxon Power ────────────────────────────────────────────────

/** @param {number} n1 @param {number} [n2] @param {number} [d] @param {number} [alpha] */
export function powerWilcoxonTest(n1, n2 = n1, d = 0.5, alpha = 0.05) {
  const r = _powerWilcoxon(n1, n2, d, alpha);
  if (!r) return null;
  return { test: 'Wilcoxon Power', ...r };
}

// ── Log-Rank Power ────────────────────────────────────────────────

/** @param {number} [alpha] @param {number} nEvents @param {number} hr */
export function powerLogRankTest(nEvents, hr, alpha = 0.05) {
  const r = _powerLogRank(nEvents, hr, alpha);
  if (!r) return null;
  return { test: 'Log-Rank Power', ...r };
}

// ── RM ANOVA Power ────────────────────────────────────────────────

/** @param {number} k @param {number} n @param {number} [epsilon] @param {number} [f] @param {number} [alpha] */
export function powerRMANOVA(k, n, epsilon = 1, f = 0.25, alpha = 0.05) {
  const r = _powerRMANOVA(k, n, epsilon, f, alpha);
  if (!r) return null;
  return { test: 'RM ANOVA Power', ...r };
}

// ── OLS Power ─────────────────────────────────────────────────────

/** @param {number} n @param {number} k @param {number} [alpha] @param {number} rSquared */
export function powerOLS_apa(rSquared, n, k, alpha = 0.05) {
  const r = _powerOLS(rSquared, n, k, alpha);
  if (!r) return null;
  return { test: 'OLS Power', ...r };
}

// ── Spearman Power ────────────────────────────────────────────────

/** @param {number} n @param {number} [alpha] @param {number} rho */
export function powerSpearmanTest(n, rho, alpha = 0.05) {
  const r = _powerSpearman(n, rho, alpha);
  if (!r) return null;
  return { test: 'Spearman Power', ...r };
}
