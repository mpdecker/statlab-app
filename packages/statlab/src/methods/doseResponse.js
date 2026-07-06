import { avg, sampleVar } from '../math/core.js';
import { tPVal, normalINV } from '../math/distributions.js';
import { matInv } from '../math/matrix.js';
import { mleFit } from '../math/inference.js';

// ── 4-Parameter Logistic (4PL) ─────────────────────────────────────────────
/** @param {number[]} dose @param {number[]} response */
export function fourPL(dose, response, { maxIter = 100, tolerance = 1e-6 } = {}) {
  if (!dose || !response || dose.length < 6 || dose.length !== response.length) return null;
  const n = dose.length;
  const yMin = Math.min(...response), yMax = Math.max(...response);
  if (yMin === yMax) return null;
  const logDose = dose.map(v => Math.log10(Math.max(v, 1e-10)));

  // Minimise SSE via the shared Newton + backtracking-line-search optimiser
  // (mleFit guarantees descent at every step, unlike a hand-rolled
  // Levenberg-Marquardt loop with no line search, which is prone to
  // overshooting into a poor local optimum on this non-convex objective).
  const sseOf = theta => {
    const [b, t, lec50, hRaw] = theta;
    const h = Math.max(0.1, hRaw);
    let s = 0;
    for (let i = 0; i < n; i++) {
      const pred = b + (t - b) / (1 + Math.pow(10, (lec50 - logDose[i]) * h));
      s += (response[i] - pred) ** 2;
    }
    return s;
  };
  const theta0 = [yMin, yMax, avg(logDose), 1];
  const fit = mleFit(theta0, sseOf, { maxIter, tol: tolerance });
  const [bottom, top, logEC50, hill] = [fit.theta[0], fit.theta[1], fit.theta[2], Math.max(0.1, fit.theta[3])];

  const fitted = logDose.map(x => bottom + (top - bottom) / (1 + Math.pow(10, (logEC50 - x) * hill)));
  let finalSSE = 0;
  for (let i = 0; i < n; i++) finalSSE += (response[i] - fitted[i]) ** 2;

  // Asymptotic SE of logEC50 from the Gauss-Newton covariance σ̂²·(JᵀJ)⁻¹.
  const Jf = logDose.map((x) => {
    const denom = 1 + Math.pow(10, (logEC50 - x) * hill);
    const pp = (top - bottom) * Math.pow(10, (logEC50 - x) * hill) / (denom * denom);
    return [1 - 1 / denom, 1 / denom, -pp * hill * Math.log(10), pp * (logEC50 - x) * Math.log(10)];
  });
  const JtJf = Array.from({ length: 4 }, (_, a) => Array.from({ length: 4 }, (_, b) => Jf.reduce((s, r) => s + r[a] * r[b], 0)));
  const cov = matInv(JtJf);
  const sigma2 = finalSSE / Math.max(1, n - 4);
  const seLogEC50 = cov ? Math.sqrt(Math.max(0, sigma2 * cov[2][2])) : null;

  return {
    test: '4PL Dose-Response',
    parameters: { bottom: +bottom.toFixed(4), top: +top.toFixed(4), logEC50: +logEC50.toFixed(4), hill: +hill.toFixed(4), seLogEC50: seLogEC50 == null ? null : +seLogEC50.toFixed(5) },
    fitted: fitted.map(v => +v.toFixed(4)),
    sse: +finalSSE.toFixed(6),
    n,
    apa: `4PL: EC50 = ${Math.pow(10, logEC50).toFixed(2)}, hill = ${hill.toFixed(2)}, top/bottom = ${top.toFixed(2)}/${bottom.toFixed(2)}`,
  };
}

// ── EC50 ───────────────────────────────────────────────────────────────────
/** @param {object} model */
export function ec50(model, { alpha = 0.05 } = {}) {
  if (!model || !model.parameters) return null;
  const p = model.parameters;
  const ec50Val = Math.pow(10, p.logEC50);
  // Delta-method CI on the log10 scale: logEC50 ± z·SE(logEC50), then 10^(·).
  const z = normalINV(1 - alpha / 2);
  const se = (p.seLogEC50 != null && Number.isFinite(p.seLogEC50)) ? p.seLogEC50 : 0.5;
  const ci = [Math.pow(10, p.logEC50 - z * se), Math.pow(10, p.logEC50 + z * se)];

  return {
    test: 'EC50',
    ec50: +ec50Val.toFixed(4),
    ci: [+ci[0].toFixed(4), +ci[1].toFixed(4)],
    alpha,
    apa: `EC50 = ${ec50Val.toFixed(2)}, n = ${model.n}`,
  };
}

// ── Hill Slope ─────────────────────────────────────────────────────────────
/** @param {object} model */
export function hillSlope(model) {
  if (!model || !model.parameters) return null;
  const h = model.parameters.hill;
  const interp = h > 1.5 ? 'positive cooperativity' : h < 0.8 ? 'negative cooperativity' : 'non-cooperative';

  return {
    test: 'Hill Slope',
    hill: +h.toFixed(4),
    interpretation: interp,
    apa: `Hill = ${h.toFixed(2)} [${interp}]`,
  };
}

// ── Volcano Plot ───────────────────────────────────────────────────────────
/** @param {number[]} pValues @param {number[]} log2FC */
export function volcanoPlot(log2FC, pValues, { fcThreshold = 1, pThreshold = 0.05 } = {}) {
  if (!log2FC || !pValues || log2FC.length < 3 || log2FC.length !== pValues.length) return null;
  const n = log2FC.length;
  const points = [];
  for (let i = 0; i < n; i++) {
    const p = Math.max(pValues[i], 1e-16);
    const nl10p = -Math.log10(p);
    const sig = p < pThreshold && Math.abs(log2FC[i]) > fcThreshold;
    const direction = sig ? (log2FC[i] > 0 ? 'up' : 'down') : 'ns';
    points.push({ index: i, log2FC: +log2FC[i].toFixed(4), negLog10P: +nl10p.toFixed(4), significant: sig, direction });
  }

  return {
    test: 'Volcano Plot',
    points,
    n,
    apa: `Volcano: ${points.filter(p => p.direction !== 'ns').length} significant, n = ${n}`,
  };
}

// ── Log2 Fold Change ───────────────────────────────────────────────────────
/** @param {number[]} treatment @param {number[]} control */
export function log2FoldChange(treatment, control) {
  if (!treatment || !control || treatment.length < 2 || control.length < 2) return null;
  const mT = avg(treatment), mC = avg(control);
  if (mC <= 0) return null;
  const fc = mT / mC;
  const log2fc = Math.log2(Math.max(fc, 1e-10));
  const nT = treatment.length, nC = control.length;

  return {
    test: 'Log2 Fold Change',
    log2FC: +log2fc.toFixed(4),
    treatmentMean: +mT.toFixed(4),
    controlMean: +mC.toFixed(4),
    nT, nC,
    apa: `log2FC = ${log2fc.toFixed(3)} (T = ${mT.toFixed(2)}, C = ${mC.toFixed(2)})`,
  };
}

// ── Moderated T-Statistic ──────────────────────────────────────────────────
/** @param {number[]} values @param {Array<string|number>} groups */
export function moderatedTStatistic(values, groups, { priorDf = 3 } = {}) {
  if (!values || !groups || values.length !== groups.length || values.length < 3) return null;
  const groupNames = [...new Set(groups)];
  if (groupNames.length < 2) return null;
  const n = values.length, k = groupNames.length;
  const grandMean = avg(values);

  const groupStats = groupNames.map(g => {
    const idx = [];
    groups.forEach((grp, i) => { if (grp === g) idx.push(i); });
    if (idx.length < 3) return null;
    const vals = idx.map(i => values[i]);
    const m = avg(vals);
    const v = vals.reduce((s, v) => s + (v - m) ** 2, 0) / (vals.length - 1);
    return { name: g, mean: m, var: v, n: vals.length };
  }).filter(Boolean);
  if (groupStats.length < 2) return null;

  const varPrior = groupStats.reduce((s, g) => s + g.var, 0) / groupStats.length;
  const nObs = groupStats.reduce((s, g) => s + g.n, 0);

  const statistics = groupStats.map(g => {
    const varPost = (priorDf * varPrior + (g.n - 1) * g.var) / (priorDf + g.n - 1);
    const se = Math.sqrt(Math.max(varPost / g.n, 1e-10));
    const t = se > 0 ? (g.mean - grandMean) / se : 0;
    const df = priorDf + g.n - 1;
    const p = tPVal(t, Math.max(1, df));
    return { group: g.name, t: +t.toFixed(4), df, p };
  });

  return {
    test: 'Moderated T-Statistic',
    statistics,
    n,
    apa: `Moderated t: ${statistics.map(s => `${s.group} t=${s.t.toFixed(2)}`).join(', ')}, n = ${n}`,
  };
}
