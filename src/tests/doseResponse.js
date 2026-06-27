import { avg, sampleVar } from '../math/core.js';
import { tPVal } from '../math/distributions.js';

// ── 4-Parameter Logistic (4PL) ─────────────────────────────────────────────
export function fourPL(dose, response, { maxIter = 100, tolerance = 1e-6 } = {}) {
  if (!dose || !response || dose.length < 6 || dose.length !== response.length) return null;
  const n = dose.length;
  const yMin = Math.min(...response), yMax = Math.max(...response);
  if (yMin === yMax) return null;
  let bottom = yMin, top = yMax;
  const logDose = dose.map(v => Math.log10(Math.max(v, 1e-10)));
  let logEC50 = avg(logDose), hill = 1;
  let lambda = 0.01, prevSSE = Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    const pred = logDose.map(x => bottom + (top - bottom) / (1 + Math.pow(10, (logEC50 - x) * hill)));
    const resid = pred.map((p, i) => response[i] - p);
    let sse = 0;
    for (const r of resid) sse += r * r;

    // Jacobian: 4 parameters × n observations
    const J = Array.from({ length: n }, () => Array(4).fill(0));
    for (let i = 0; i < n; i++) {
      const denom = 1 + Math.pow(10, (logEC50 - logDose[i]) * hill);
      const p = (top - bottom) * Math.pow(10, (logEC50 - logDose[i]) * hill) / (denom * denom);
      J[i][0] = 1 - 1 / denom; // d/d bottom
      J[i][1] = 1 / denom; // d/d top
      J[i][2] = -p * hill * Math.log(10); // d/d logEC50
      J[i][3] = p * (logEC50 - logDose[i]) * Math.log(10); // d/d hill
    }

    // J'J + λI
    const JtJ = Array.from({ length: 4 }, () => Array(4).fill(0));
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
      for (let i = 0; i < n; i++) JtJ[a][b] += J[i][a] * J[i][b];
    }
    for (let d = 0; d < 4; d++) JtJ[d][d] += lambda;

    // J'r
    const Jtr = Array(4).fill(0);
    for (let a = 0; a < 4; a++) for (let i = 0; i < n; i++) Jtr[a] += J[i][a] * resid[i];

    // Solve (J'J + λI)Δ = J'r via Cholesky-like
    const delta = Array(4).fill(0);
    for (let i = 0; i < 4; i++) {
      let s = 0;
      for (let j = 0; j < i; j++) s += JtJ[i][j] * delta[j];
      const denom = Math.max(JtJ[i][i], 1e-10);
      delta[i] = (Jtr[i] - s) / denom;
    }

    // Try new parameters
    const newBottom = bottom + delta[0], newTop = top + delta[1];
    const newLogEC50 = logEC50 + delta[2], newHill = Math.max(0.1, hill + delta[3]);

    const newPred = logDose.map(x => newBottom + (newTop - newBottom) / (1 + Math.pow(10, (newLogEC50 - x) * newHill)));
    let newSSE = 0;
    for (let i = 0; i < n; i++) newSSE += (response[i] - newPred[i]) ** 2;

    if (newSSE < sse) {
      bottom = newBottom; top = newTop; logEC50 = newLogEC50; hill = newHill;
      lambda *= 0.5;
      if (Math.abs(newSSE - sse) < tolerance) { sse = newSSE; break; }
      sse = newSSE;
    } else {
      lambda *= 2;
    }
  }

  const fitted = logDose.map(x => bottom + (top - bottom) / (1 + Math.pow(10, (logEC50 - x) * hill)));
  let finalSSE = 0;
  for (let i = 0; i < n; i++) finalSSE += (response[i] - fitted[i]) ** 2;

  return {
    test: '4PL Dose-Response',
    parameters: { bottom: +bottom.toFixed(4), top: +top.toFixed(4), logEC50: +logEC50.toFixed(4), hill: +hill.toFixed(4) },
    fitted: fitted.map(v => +v.toFixed(4)),
    sse: +finalSSE.toFixed(6),
    n,
    apa: `4PL: EC50 = ${Math.pow(10, logEC50).toFixed(2)}, hill = ${hill.toFixed(2)}, top/bottom = ${top.toFixed(2)}/${bottom.toFixed(2)}`,
  };
}

// ── EC50 ───────────────────────────────────────────────────────────────────
export function ec50(model, { alpha = 0.05 } = {}) {
  if (!model || !model.parameters) return null;
  const p = model.parameters;
  const ec50Val = Math.pow(10, p.logEC50);
  const ci = [Math.pow(10, p.logEC50 - 0.5), Math.pow(10, p.logEC50 + 0.5)];

  return {
    test: 'EC50',
    ec50: +ec50Val.toFixed(4),
    ci: [+ci[0].toFixed(4), +ci[1].toFixed(4)],
    alpha,
    apa: `EC50 = ${ec50Val.toFixed(2)}, n = ${model.n}`,
  };
}

// ── Hill Slope ─────────────────────────────────────────────────────────────
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
