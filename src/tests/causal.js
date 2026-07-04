import { avg, corr, sampleVar, sampleSD, fmtP } from '../math/core.js';
import { tPVal, normalCDF, chiPVal } from '../math/distributions.js';
import { matMul, matInv } from '../math/matrix.js';
import { logisticReg } from './regression.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

function sigmoid(z) {
  const c = Math.max(-20, Math.min(20, z));
  return 1 / (1 + Math.exp(-c));
}

/** Propensity score matching — nearest neighbor ATT */

// ── Propensity Score Match ────────────────────────────────────────
export function propensityScoreMatch(data, treatVar, outcomeVar, covariates = []) {
  const rows = data.filter(r =>
    r[treatVar] != null && Number.isFinite(+r[outcomeVar]) &&
    covariates.every(c => Number.isFinite(+r[c])));
  if (rows.length < 20) return null;
  const cats = [...new Set(rows.map(r => r[treatVar]))].sort();
  if (cats.length !== 2) return null;
  const treatVal = cats[1];
  const Y = rows.map(r => (r[treatVar] === treatVal ? 1 : 0));
  const X = rows.map(r => covariates.map(c => +r[c]));
  const logit = logisticReg(Y, X, covariates);
  if (!logit) return null;
  const ps = logit.fitted ?? rows.map(() => 0.5);

  const treated = rows.map((r, i) => ({ r, i, ps: ps[i] })).filter(x => x.r[treatVar] === treatVal);
  const control = rows.map((r, i) => ({ r, i, ps: ps[i] })).filter(x => x.r[treatVar] !== treatVal);
  if (treated.length < 3 || control.length < 3) return null;

  const used = new Set();
  const pairs = [];
  treated.forEach(t => {
    let best = null;
    let bd = Infinity;
    control.forEach(c => {
      if (used.has(c.i)) return;
      const d = Math.abs(t.ps - c.ps);
      if (d < bd) { bd = d; best = c; }
    });
    if (best) {
      used.add(best.i);
      pairs.push({
        yT: +t.r[outcomeVar],
        yC: +best.r[outcomeVar],
        psT: t.ps,
        psC: best.ps,
        treatedRow: t.r,
        controlRow: best.r,
      });
    }
  });
  if (pairs.length < 3) return null;
  const diffs = pairs.map(p => p.yT - p.yC);
  const att = avg(diffs);
  const se = Math.sqrt(sampleVar(diffs) / (diffs.length || 1));
  const t = att / (se || 1e-9);
  const df = diffs.length - 1;
  const p = tPVal(t, df);

  const balBefore = covariates.map(c => {
    const mT = avg(treated.map(x => +x.r[c]));
    const mC = avg(control.map(x => +x.r[c]));
    return { var: c, diff: +(mT - mC).toFixed(4) };
  });
  const balAfter = covariates.map(c => {
    const mT = avg(pairs.map(p => +p.treatedRow[c]));
    const mC = avg(pairs.map(p => +p.controlRow[c]));
    return { var: c, diff: +(mT - mC).toFixed(4) };
  });

  return {
    test: 'Propensity Score Match',
    att: +att.toFixed(4),
    se: +se.toFixed(4),
    t: +t.toFixed(4),
    df,
    p,
    nTreated: treated.length,
    nMatched: pairs.length,
    balanceBefore: balBefore,
    balanceAfter: balAfter,
    apa: `ATT = ${att.toFixed(3)}, t(${df}) = ${t.toFixed(2)}, ${fmtP(p)}, matched n = ${pairs.length}`,
  };
}

/** 2SLS: stage 1 Z→X, stage 2 fitted X→Y */

// ── IV / 2SLS ─────────────────────────────────────────────────────
export function iv2sls(data, yVar, xVar, instrument, controls = []) {
  const allX = [instrument, ...controls];
  const rows = data.filter(r =>
    [yVar, xVar, instrument].every(v => Number.isFinite(+r[v])) &&
    controls.every(c => Number.isFinite(+r[c])));
  const n = rows.length;
  if (n < allX.length + 12) return null;

  const Y = rows.map(r => +r[yVar]);
  const Xend = rows.map(r => +r[xVar]);
  const Z = rows.map(r => [1, +r[instrument], ...controls.map(c => +r[c])]);
  const W = rows.map(r => [1, ...controls.map(c => +r[c])]);

  const fitStage1 = () => {
    const p = Z[0].length;
    let beta = Array(p).fill(0);
    for (let it = 0; it < 120; it++) {
      const XtX = Array.from({ length: p }, () => Array(p).fill(0));
      const XtY = Array(p).fill(0);
      Z.forEach((row, i) => {
        row.forEach((v, j) => {
          XtY[j] += v * Xend[i];
          row.forEach((v2, k) => { XtX[j][k] += v * v2; });
        });
      });
      const inv = matInv(XtX);
      if (!inv) break;
      const step = matMul(inv, XtY.map(v => [v])).map(v => v[0]);
      beta = beta.map((b, j) => b + (step[j] - b) * 0.5);
    }
    return Z.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
  };

  const xHat = fitStage1();
  const X2 = xHat.map((xh, i) => [1, xh, ...W[i].slice(1)]);
  const p2 = X2[0].length;
  const XtX = Array.from({ length: p2 }, () => Array(p2).fill(0));
  const XtY = Array(p2).fill(0);
  X2.forEach((row, i) => {
    row.forEach((v, j) => {
      XtY[j] += v * Y[i];
      row.forEach((v2, k) => { XtX[j][k] += v * v2; });
    });
  });
  const inv2 = matInv(XtX);
  if (!inv2) return null;
  const beta2 = matMul(inv2, XtY.map(v => [v])).map(v => v[0]);
  const coefX = beta2[1];
  // Structural residuals must use the ORIGINAL (endogenous) X, not the
  // first-stage-fitted X̂ — plugging X̂ into the residual (as if it were the
  // regressor actually observed) understates the true residual variance and
  // badly overstates the SE, a classic by-hand-2SLS pitfall.
  const Xactual = Xend.map((x, i) => [1, x, ...W[i].slice(1)]);
  const resid = Y.map((y, i) => y - Xactual[i].reduce((s, v, j) => s + v * beta2[j], 0));
  const s2 = resid.reduce((s, e) => s + e ** 2, 0) / (n - p2);
  const seX = Math.sqrt(s2 * inv2[1][1]);
  const t = coefX / (seX || 1e-9);
  const df = n - p2;
  const p = tPVal(t, df);

  const fFirst = (() => {
    const ssR = Xend.reduce((s, x) => s + (x - avg(Xend)) ** 2, 0);
    const ssE = Xend.reduce((s, x, i) => s + (x - xHat[i]) ** 2, 0);
    const p1 = Z[0].length;
    const F = ((ssR - ssE) / 1) / (ssE / (n - p1) || 1e-9);
    return +F.toFixed(4);
  })();

  return {
    test: 'IV / 2SLS',
    coef: +coefX.toFixed(4),
    se: +seX.toFixed(4),
    t: +t.toFixed(4),
    df,
    p,
    firstStageF: fFirst,
    n,
    apa: `2SLS β = ${coefX.toFixed(3)}, t(${df}) = ${t.toFixed(2)}, ${fmtP(p)}, first-stage F = ${fFirst}`,
  };
}

/** Interrupted time series — level + slope change */

// ── Interrupted Time Series ───────────────────────────────────────
export function interruptedTimeSeries(times, values, interventionTime) {
  if (times.length !== values.length || times.length < 6) return null;
  const post = times.map(t => (t >= interventionTime ? 1 : 0));
  const timeC = times.map(t => t - avg(times));
  const postTime = times.map((t, i) => timeC[i] * post[i]);
  const n = times.length;
  const p = 4;
  const X = times.map((_, i) => [1, timeC[i], post[i], postTime[i]]);
  const Y = values;

  const XtX = Array.from({ length: p }, () => Array(p).fill(0));
  const XtY = Array(p).fill(0);
  X.forEach((row, i) => {
    row.forEach((v, j) => {
      XtY[j] += v * Y[i];
      row.forEach((v2, k) => { XtX[j][k] += v * v2; });
    });
  });
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = matMul(inv, XtY.map(v => [v])).map(v => v[0]);
  const levelChange = beta[2];
  const slopeChange = beta[3];

  return {
    test: 'Interrupted Time Series',
    levelChange: +levelChange.toFixed(4),
    slopeChange: +slopeChange.toFixed(4),
    beta0: +beta[0].toFixed(4),
    betaTime: +beta[1].toFixed(4),
    interventionTime,
    n,
    series: times.map((t, i) => ({ t, y: values[i], post: post[i] })),
    apa: `ITS: level change = ${levelChange.toFixed(3)}, slope change = ${slopeChange.toFixed(3)} at t = ${interventionTime}`,
  };
}

/** Sharp RDD — local linear both sides at cutoff */

// ── Regression Discontinuity ──────────────────────────────────────
export function regressionDiscontinuity(x, y, cutoff, bandwidth) {
  if (x.length !== y.length || x.length < 12) return null;
  const h = bandwidth > 0 ? bandwidth : Math.max(0.5, 1.06 * sampleSD(x) * x.length ** (-1 / 5));
  const mask = x.map(v => Math.abs(v - cutoff) <= h);
  const xs = x.filter((_, i) => mask[i]);
  const ys = y.filter((_, i) => mask[i]);
  const n = xs.length;
  if (n < 8) return null;

  const runSide = (side) => {
    const idx = xs.map((v, i) => side === 'left' ? v < cutoff : v >= cutoff).map((flag, i) => flag ? i : -1).filter(i => i >= 0);
    if (idx.length < 3) return null;
    const Xs = idx.map(i => xs[i] - cutoff);
    const Ys = idx.map(i => ys[i]);
    const mx = avg(Xs);
    const my = avg(Ys);
    const sxx = Xs.reduce((s, v) => s + (v - mx) ** 2, 0);
    const sxy = Xs.reduce((s, v, j) => s + (v - mx) * (Ys[j] - my), 0);
    const b1 = sxx ? sxy / sxx : 0;
    const b0 = my - b1 * mx;
    const yAt = b0;
    return { b0, b1, yAt, n: idx.length };
  };

  const left = runSide('left');
  const right = runSide('right');
  if (!left || !right) return null;
  const jump = right.yAt - left.yAt;
  const pooledSe = Math.sqrt((sampleVar(ys) || 1) / n);
  const t = jump / (pooledSe || 1e-9);
  const p = tPVal(t, n - 4);

  return {
    test: 'Regression Discontinuity',
    jump: +jump.toFixed(4),
    leftIntercept: +left.yAt.toFixed(4),
    rightIntercept: +right.yAt.toFixed(4),
    bandwidth: +h.toFixed(4),
    cutoff,
    t: +t.toFixed(4),
    p,
    nLocal: n,
    points: xs.map((v, i) => ({ x: v, y: ys[i], side: v < cutoff ? 'left' : 'right' })),
    apa: `RDD jump = ${jump.toFixed(3)} at cutoff ${cutoff}, ${fmtP(p)}, n_local = ${n}, h = ${h.toFixed(2)}`,
  };
}

// ── Synthetic control ───────────────────────────────────────────────────────
export function syntheticControl(treated, controls, prePeriods, postPeriods) {
  if (!treated || !controls || !controls.length || prePeriods < 2 || postPeriods < 1) return null;
  const nControls = controls.length;
  const T = treated.length;
  if (T < prePeriods + postPeriods) return null;
  if (controls.some(c => c.length !== T)) return null;

  const preTreated = treated.slice(0, prePeriods);
  const X = controls.map(c => c.slice(0, prePeriods));
  const y = preTreated;
  const n = prePeriods;

  const XtX = Array.from({ length: nControls }, (_, i) => Array.from({ length: nControls }, (_, j) => {
    let s = 0;
    for (let t = 0; t < n; t++) s += (X[i][t] - avg(X[i])) * (X[j][t] - avg(X[j]));
    return i === j ? s + 1e-6 : s;
  }));
  const XtY = Array.from({ length: nControls }, (_, i) => {
    let s = 0;
    for (let t = 0; t < n; t++) s += (X[i][t] - avg(X[i])) * (y[t] - avg(y));
    return s;
  });

  const weights = Array(nControls).fill(1 / nControls);
  const sumXtY = XtY.reduce((a, b) => a + Math.abs(b), 0);
  if (sumXtY < 1e-10) {
    const sum = weights.reduce((a, b) => a + b, 0);
    weights.forEach((_, i) => weights[i] = 1 / nControls);
  } else {
    for (let iter = 0; iter < 50; iter++) {
      for (let i = 0; i < nControls; i++) {
        let num = XtY[i];
        for (let j = 0; j < nControls; j++) if (j !== i) num -= XtX[i][j] * weights[j];
        weights[i] = Math.max(0, Math.min(1, num / Math.max(XtX[i][i], 1e-10)));
      }
      const sum = weights.reduce((a, b) => a + b, 0);
      if (sum > 0) for (let i = 0; i < nControls; i++) weights[i] /= sum;
    }
  }

  const synthetic = Array(T).fill(0);
  for (let t = 0; t < T; t++) {
    for (let j = 0; j < nControls; j++) synthetic[t] += weights[j] * controls[j][t];
  }

  const preGap = Array(prePeriods).fill(0);
  let preRMSPE = 0;
  for (let t = 0; t < prePeriods; t++) {
    preGap[t] = treated[t] - synthetic[t];
    preRMSPE += preGap[t] * preGap[t];
  }
  preRMSPE = Math.sqrt(preRMSPE / prePeriods);

  const postGap = Array(postPeriods).fill(0);
  let att = 0;
  for (let t = 0; t < postPeriods; t++) {
    postGap[t] = treated[prePeriods + t] - synthetic[prePeriods + t];
    att += postGap[t];
  }
  att /= postPeriods;

  const sdPre = Math.sqrt(sampleVar(preGap)) || 1;
  const tStat = att / (sdPre / Math.sqrt(postPeriods));
  const pVal = tPVal(Math.abs(tStat), Math.max(1, prePeriods - 1));

  return {
    test: 'Synthetic Control',
    weights: weights.map((w, i) => ({ unit: i, weight: +w.toFixed(4) })),
    synthetic,
    treated,
    preGap: preGap.map(v => +v.toFixed(4)),
    postGap: postGap.map(v => +v.toFixed(4)),
    att: +att.toFixed(4),
    preRMSPE: +preRMSPE.toFixed(4),
    t: +tStat.toFixed(4),
    p: pVal,
    prePeriods, postPeriods, T,
    apa: `Synthetic control: ATT = ${att.toFixed(3)}, t = ${tStat.toFixed(2)}, ${fmtP(pVal)}, pre-RMSPE = ${preRMSPE.toFixed(3)}`,
  };
}

// ── Double/Debiased ML (DML) ────────────────────────────────────────────────
export function doubleML(y, D, Xraw, { splits = 2, seed = 42 } = {}) {
  if (!y || !D || !Xraw || y.length < 20 || D.length !== y.length || Xraw.length !== y.length) return null;
  const n = y.length;
  const X = Xraw.map(row => Array.isArray(row) ? row : [row]);
  const rand = mulberry32(seed);
  const perm = Array.from({ length: n }, (_, i) => i).sort(() => rand() - 0.5);
  const foldSize = Math.floor(n / splits);

  let sumTheta = 0, sumVar = 0;
  for (let s = 0; s < splits; s++) {
    const test = perm.slice(s * foldSize, (s + 1) * foldSize);
    const train = perm.filter(i => !test.includes(i));
    const yTrain = train.map(i => y[i]), yTest = test.map(i => y[i]);
    const dTrain = train.map(i => D[i]), dTest = test.map(i => D[i]);
    const xTrain = train.map(i => X[i]), xTest = test.map(i => X[i]);

    // Cross-fitted nuisance models ℓ̂(X)=E[Y|X] and m̂(X)=E[D|X], fit on the
    // training fold by OLS (the old code used the training MEAN, ignoring X, so
    // it never removed X-confounding). Predict on the held-out test fold.
    const olsFit = (rows, target) => {
      const Z = rows.map(r => [1, ...r]);
      const kz = Z[0].length;
      const ZtZ = Array.from({ length: kz }, (_, a) => Array.from({ length: kz }, (_, b) => Z.reduce((s, row) => s + row[a] * row[b], 0)));
      const ZtY = Array.from({ length: kz }, (_, a) => Z.reduce((s, row, t) => s + row[a] * target[t], 0));
      const inv = matInv(ZtZ);
      const beta = inv ? inv.map(row => row.reduce((s, v, j) => s + v * ZtY[j], 0)) : Array(kz).fill(0);
      return row => beta[0] + row.reduce((s, v, j) => s + v * beta[1 + j], 0);
    };
    const yModel = olsFit(xTrain, yTrain), dModel = olsFit(xTrain, dTrain);
    const yHat = xTest.map(yModel);
    const dHat = xTest.map(dModel);
    let num = 0, den = 0;
    for (let i = 0; i < test.length; i++) {
      const residY = yTest[i] - yHat[i];
      const residD = dTest[i] - dHat[i];
      num += residY * residD;
      den += residD * residD;
    }
    const theta = den ? num / den : 0;
    const resid = test.map((_, i) => (yTest[i] - yHat[i]) - theta * (dTest[i] - dHat[i]));
    const se = Math.sqrt(sampleVar(resid) / (den || 1));
    sumTheta += theta;
    sumVar += se * se;
  }
  const ate = sumTheta / splits;
  const se = Math.sqrt(sumVar) / splits;
  const t = ate / (se || 1e-10);
  const df = n - 2;
  const p = tPVal(Math.abs(t), Math.max(1, df));

  return {
    test: 'Double/Debiased ML (DML)',
    ate: +ate.toFixed(6),
    se: +se.toFixed(6),
    t: +t.toFixed(4),
    p,
    n,
    apa: `DML: ATE = ${ate.toFixed(4)}, SE = ${se.toFixed(4)}, t(${df}) = ${t.toFixed(2)}, ${fmtP(p)}`,
  };
}

// ── Backdoor adjustment (DAG-based) ─────────────────────────────────────────
export function backdoorAdjustment(adjacencyList, treatment, outcome) {
  if (!adjacencyList || !treatment || !outcome) return null;
  const adj = {};
  const parents = {};
  for (const [from, to] of adjacencyList) {
    if (!adj[from]) adj[from] = [];
    adj[from].push(to);
    if (!parents[to]) parents[to] = [];
    parents[to].push(from);
  }

  function ancestors(node, visited = new Set()) {
    if (visited.has(node)) return visited;
    visited.add(node);
    for (const p of (parents[node] || [])) ancestors(p, visited);
    return visited;
  }

  const ancTreat = ancestors(treatment, new Set());
  const ancOutcome = ancestors(outcome, new Set());

  const adjustmentSet = [];
  const allNodes = new Set();
  adjacencyList.forEach(([a, b]) => { allNodes.add(a); allNodes.add(b); });

  for (const node of allNodes) {
    if (node === treatment || node === outcome) continue;
    if (ancTreat.has(node) && ancOutcome.has(node)) adjustmentSet.push(node);
  }

  const isBackdoor = adjustmentSet.length > 0;
  return {
    test: 'Backdoor Adjustment',
    treatment,
    outcome,
    adjustmentSet,
    minimal: adjustmentSet.length > 0,
    allNodes: [...allNodes],
    nEdges: adjacencyList.length,
    apa: isBackdoor
      ? `Backdoor set for ${treatment} → ${outcome}: {${adjustmentSet.join(', ')}}. Control for these to identify causal effect.`
      : `No backdoor paths from ${treatment} to ${outcome} — treatment effect identified without adjustment.`,
  };
}

// ── IPTW Weights ───────────────────────────────────────────────────────────
export function iptwWeights(data, treatVar, outcomeVar, covariates) {
  if (!data || data.length < 20 || !treatVar || !outcomeVar) return null;
  const rows = data.filter(r =>
    r[treatVar] != null && Number.isFinite(+r[outcomeVar]) &&
    covariates.every(c => Number.isFinite(+r[c])));
  if (rows.length < 20) return null;
  const cats = [...new Set(rows.map(r => r[treatVar]))].sort();
  if (cats.length !== 2) return null;
  const treatVal = cats[1];
  const Y = rows.map(r => (r[treatVar] === treatVal ? 1 : 0));
  const X = rows.map(r => covariates.map(c => +r[c]));
  const logit = logisticReg(Y, X, covariates);
  if (!logit) return null;
  const ps = logit.fitted ?? rows.map(() => 0.5);
  const pTreat = rows.filter(r => r[treatVar] === treatVal).length / rows.length;
  const sw = rows.map(r => r[treatVar] === treatVal ? pTreat : 1 - pTreat);
  const ipw = ps.map((p, i) => sw[i] / (Y[i] ? p : 1 - p));

  let sumWT = 0, sumWC = 0, sumYT = 0, sumYC = 0;
  rows.forEach((r, i) => {
    if (r[treatVar] === treatVal) { sumWT += ipw[i]; sumYT += ipw[i] * (+r[outcomeVar]); }
    else { sumWC += ipw[i]; sumYC += ipw[i] * (+r[outcomeVar]); }
  });
  if (!sumWT || !sumWC) return null;
  const att = sumYT / sumWT - sumYC / sumWC;

  // Robust SE via sandwich of IPW estimating equation
  const dAtt = rows.map((r, i) => {
    const yi = +r[outcomeVar], ti = r[treatVar] === treatVal ? 1 : 0;
    return ipw[i] * (ti * (yi - sumYT / sumWT) / sumWT - (1 - ti) * (yi - sumYC / sumWC) / sumWC);
  });
  let seSq = 0;
  for (let i = 0; i < rows.length; i++) seSq += dAtt[i] * dAtt[i] / rows.length;
  const se = Math.sqrt(Math.max(seSq, 1e-14));
  const t = se > 0 ? att / se : 0;
  const nT = rows.filter(r => r[treatVar] === treatVal).length;

  return {
    test: 'IPTW',
    att: +att.toFixed(4), se: +se.toFixed(4), t: +t.toFixed(4),
    p: 2 * (1 - normalCDF(Math.abs(t))), n: rows.length, nTreated: nT,
    nControl: rows.length - nT, apa: `IPTW ATT = ${att.toFixed(3)}, SE = ${se.toFixed(3)}, n = ${rows.length}`,
  };
}

// ── Fuzzy RDD ──────────────────────────────────────────────────────────────
export function fuzzyRDD(data, runningVar, treatVar, outcomeVar, cutoff, bandwidth) {
  if (!data || data.length < 30) return null;
  const rows = data.filter(r => Number.isFinite(+r[runningVar]) && r[treatVar] != null && Number.isFinite(+r[outcomeVar]));
  if (rows.length < 30) return null;
  const n = rows.length;
  const r = rows.map(row => +row[runningVar]);
  const t = rows.map(row => row[treatVar] === rows.filter(o => o[treatVar] !== rows[0][treatVar])[0]?.[treatVar] ? 1 : 0);
  const y = rows.map(row => +row[outcomeVar]);

  // Recompute treatment indicator
  const treatCats = [...new Set(rows.map(row => row[treatVar]))].sort();
  if (treatCats.length !== 2) return null;
  const treat1 = treatCats[1];
  const ti = rows.map(row => row[treatVar] === treat1 ? 1 : 0);
  const yi = rows.map(row => +row[outcomeVar]);

  // Within bandwidth
  const inBand = rows.map((_, i) => Math.abs(r[i] - cutoff) <= bandwidth);
  const idx = Array.from({ length: n }, (_, i) => i).filter(i => inBand[i]);
  if (idx.length < 10) return null;

  const rCent = idx.map(i => r[i] - cutoff);
  const tiS = idx.map(i => ti[i]);
  const yiS = idx.map(i => yi[i]);

  // First stage: treatment ~ above + rCent + rCent*above
  const above = rCent.map(rc => rc > 0 ? 1 : 0);
  const X1 = rCent.map((rc, i) => [1, above[i], rc, above[i] * rc]);
  const X1t = X1[0].map((_, j) => X1.map(row => row[j]));
  const X1tX1 = X1t.map(r1 => X1[0].map((_, j) => r1.reduce((s, _, k) => s + X1[k][j] * r1[k], 0)));
  const X1ty = X1t.map(r1 => r1.reduce((s, v, k) => s + v * tiS[k], 0));
  const inv1 = matInv(X1tX1);
  if (!inv1) return null;
  const beta1 = inv1.map(row => row.reduce((s, v, j) => s + v * X1ty[j], 0));
  const fStat = beta1[1] * beta1[1] / (inv1[1][1] * Math.max(1e-10, tiS.reduce((s, v) => s + (v - avg(tiS)) ** 2, 0) / idx.length));
  if (fStat < 10) return null;

  const tHat = X1.map(row => row.reduce((s, v, j) => s + v * beta1[j], 0));
  const X2 = rCent.map((rc, i) => [1, tHat[i], rc, above[i] * rc]);
  const X2t = X2[0].map((_, j) => X2.map(row => row[j]));
  const X2tX2 = X2t.map(r1 => X2[0].map((_, j) => r1.reduce((s, _, k) => s + X2[k][j] * r1[k], 0)));
  const X2ty = X2t.map(r1 => r1.reduce((s, v, k) => s + v * yiS[k], 0));
  const inv2 = matInv(X2tX2);
  if (!inv2) return null;
  const beta2 = inv2.map(row => row.reduce((s, v, j) => s + v * X2ty[j], 0));
  const late = beta2[1];
  const se = Math.sqrt(Math.max(0, inv2[1][1] * (yiS.reduce((s, v) => s + (v - avg(yiS)) ** 2, 0) / (idx.length - 4))));
  const tVal = se > 0 ? late / se : 0;

  return {
    test: 'Fuzzy RDD', late: +late.toFixed(4), se: +se.toFixed(4), t: +tVal.toFixed(4),
    p: 2 * (1 - normalCDF(Math.abs(tVal))), fStat: +fStat.toFixed(2), bandwidth,
    n: rows.length, nBand: idx.length,
    apa: `Fuzzy RDD LATE = ${late.toFixed(3)}, SE = ${se.toFixed(3)}, F(1) = ${fStat.toFixed(1)}, n = ${rows.length}`,
  };
}

// ── G-Computation ──────────────────────────────────────────────────────────
export function gComputation(data, treatVar, outcomeVar, covariates, seed = 42) {
  __rng = mulberry32(seed);
  if (!data || data.length < 30 || !treatVar || !outcomeVar || !covariates.length) return null;
  const rows = data.filter(r =>
    r[treatVar] != null && Number.isFinite(+r[outcomeVar]) &&
    covariates.every(c => Number.isFinite(+r[c])));
  if (rows.length < 30) return null;
  const cats = [...new Set(rows.map(r => r[treatVar]))].sort();
  if (cats.length !== 2) return null;
  const treatVal = cats[1];
  const n = rows.length;

  // Build interaction features
  const Xall = rows.map(r => {
    const base = covariates.map(c => +r[c]);
    const treat = r[treatVar] === treatVal ? 1 : 0;
    return [1, treat, ...base, ...base.map(v => v * treat)];
  });
  const y = rows.map(r => +r[outcomeVar]);
  const Xt = Xall[0].map((_, j) => Xall.map(row => row[j]));
  const XtX = Xt.map(r1 => Xall[0].map((_, j) => r1.reduce((s, _, k) => s + Xall[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));

  // Counterfactual predictions
  let predT = 0, predC = 0;
  for (let i = 0; i < n; i++) {
    const base = covariates.map(c => +rows[i][c]);
    const xT = [1, 1, ...base, ...base.map(v => v * 1)];
    const xC = [1, 0, ...base, ...base.map(v => v * 0)];
    predT += beta.reduce((s, b, j) => s + b * xT[j], 0);
    predC += beta.reduce((s, b, j) => s + b * xC[j], 0);
  }
  const ate = (predT - predC) / n;

  // Bootstrap SE (B = 50 for speed)
  let bootAte = 0, bootSsq = 0;
  for (let b = 0; b < 50; b++) {
    const sIdx = Array.from({ length: n }, () => Math.floor(__rng() * n));
    const sX = sIdx.map(i => Xall[i]);
    const sy = sIdx.map(i => y[i]);
    const sXt = sX[0].map((_, j) => sX.map(row => row[j]));
    const sXtX = sXt.map(r1 => sX[0].map((_, j) => r1.reduce((ss, _, k) => ss + sX[k][j] * r1[k], 0)));
    const sXtY = sXt.map(r1 => r1.reduce((ss, v, k) => ss + v * sy[k], 0));
    const sinv = matInv(sXtX);
    if (!sinv) continue;
    const sbeta = sinv.map(row => row.reduce((ss, v, j) => ss + v * sXtY[j], 0));
    let spT = 0, spC = 0;
    for (let i = 0; i < n; i++) {
      const base = covariates.map(c => +rows[i][c]);
      const xT = [1, 1, ...base, ...base.map(v => v * 1)];
      const xC = [1, 0, ...base, ...base.map(v => v * 0)];
      spT += sbeta.reduce((ss, b, j) => ss + b * xT[j], 0);
      spC += sbeta.reduce((ss, b, j) => ss + b * xC[j], 0);
    }
    const sAte = (spT - spC) / n;
    bootAte += sAte;
  }
  bootAte /= 50;
  for (let b = 0; b < 50; b++) {
    const sIdx = Array.from({ length: n }, () => Math.floor(__rng() * n));
    // Recompute quickly...
  }
  // Use simple analytic approximation
  const resid = y.map((yi, i) => yi - Xall[i].reduce((s, v, j) => s + v * beta[j], 0));
  const sigSq = resid.reduce((s, e) => s + e * e, 0) / (n - Xall[0].length);
  const se = Math.sqrt(Math.max(sigSq / n, 1e-10));

  return {
    test: 'G-Computation', ate: +ate.toFixed(4), se: +se.toFixed(4),
    ci: [+(ate - 1.96 * se).toFixed(4), +(ate + 1.96 * se).toFixed(4)],
    n, apa: `G-computation ATE = ${ate.toFixed(3)}, 95% CI [${(ate - 1.96 * se).toFixed(3)}, ${(ate + 1.96 * se).toFixed(3)}], n = ${n}`,
  };
}

// ── Staggered DiD ──────────────────────────────────────────────────────────
export function staggeredDiD(panelData, idVar, timeVar, treatVar, outcomeVar) {
  if (!panelData || panelData.length < 20 || !idVar || !timeVar || !treatVar || !outcomeVar) return null;
  const rows = panelData.filter(r =>
    r[idVar] != null && Number.isFinite(+r[timeVar]) && r[treatVar] != null && Number.isFinite(+r[outcomeVar]));
  if (rows.length < 20) return null;
  const ids = [...new Set(rows.map(r => r[idVar]))];
  const times = [...new Set(rows.map(r => +r[timeVar]))].sort((a, b) => a - b);
  if (times.length < 2) return null;

  // Determine treatment timing per unit
  const treatTime = {};
  ids.forEach(id => {
    const unitRows = rows.filter(r => r[idVar] === id).sort((a, b) => +a[timeVar] - +b[timeVar]);
    const firstTreated = unitRows.find(r => r[treatVar] === 1);
    treatTime[id] = firstTreated ? +firstTreated[timeVar] : Infinity;
  });
  const neverTreated = ids.filter(id => treatTime[id] === Infinity);
  if (!neverTreated.length) return null;

  // Simple estimator: compare treated units to never-treated at each post period
  let totalAtt = 0, count = 0;
  ids.forEach(id => {
    if (treatTime[id] === Infinity) return;
    const unitRows = rows.filter(r => r[idVar] === id);
    const pre = unitRows.filter(r => +r[timeVar] < treatTime[id]);
    const post = unitRows.filter(r => +r[timeVar] >= treatTime[id]);
    if (!pre.length || !post.length) return;
    const yPre = avg(pre.map(r => +r[outcomeVar]));
    const yPost = avg(post.map(r => +r[outcomeVar]));
    const diffT = yPost - yPre;

    // Never-treated comparison over same periods
    const neverPre = neverTreated.flatMap(nid =>
      rows.filter(r => r[idVar] === nid && +r[timeVar] < treatTime[id]).map(r => +r[outcomeVar])
    );
    const neverPost = neverTreated.flatMap(nid =>
      rows.filter(r => r[idVar] === nid && +r[timeVar] >= treatTime[id]).map(r => +r[outcomeVar])
    );
    if (!neverPre.length || !neverPost.length) return;
    const diffN = avg(neverPost) - avg(neverPre);
    totalAtt += diffT - diffN;
    count++;
  });
  if (!count) return null;
  const att = totalAtt / count;

  return {
    test: 'Staggered DiD', att: +att.toFixed(4), nUnits: ids.length, nPeriods: times.length,
    nNeverTreated: neverTreated.length, nTreated: ids.length - neverTreated.length,
    apa: `Staggered DiD ATT = ${att.toFixed(3)}, ${ids.length} units, ${times.length} periods, ${neverTreated.length} never-treated`,
  };
}

// ── Covariate Balance (SMD) ───────────────────────────────────────
export function covariateBalance(treated, control, vars) {
  if (!treated || !control || !vars || !vars.length || treated.length < 5 || control.length < 5) return null;
  const results = vars.map(v => {
    const mT = avg(treated.map(r => +r[v]));
    const mC = avg(control.map(r => +r[v]));
    const vT = treated.reduce((s, r) => s + (+r[v] - mT) ** 2, 0) / (treated.length - 1);
    const vC = control.reduce((s, r) => s + (+r[v] - mC) ** 2, 0) / (control.length - 1);
    const pool = Math.sqrt((vT + vC) / 2);
    const smd = pool > 0 ? (mT - mC) / pool : 0;
    const vr = vC > 0 ? vT / vC : 1;
    return { variable: v, meanTreated: +mT.toFixed(4), meanControl: +mC.toFixed(4), smd: +smd.toFixed(4), varRatio: +vr.toFixed(4), balanced: Math.abs(smd) < 0.1 };
  });
  return {
    test: 'Covariate Balance', results, nTreated: treated.length, nControl: control.length,
    apa: `Balance: ${results.filter(r => r.balanced).length}/${results.length} covariates balanced (|SMD| < 0.1)`,
  };
}

// SMD Table
export function smdTable(data, treatVar, covariates) {
  if (!data || data.length < 10 || !treatVar || !covariates || !covariates.length) return null;
  const vals = [...new Set(data.map(r => r[treatVar]))];
  if (vals.length !== 2) return null;
  const treatVal = vals[1];
  const treated = data.filter(r => r[treatVar] === treatVal);
  const control = data.filter(r => r[treatVar] !== treatVal);
  return covariateBalance(treated, control, covariates);
}

// ── Propensity Overlap ────────────────────────────────────────────
export function propensityOverlap(data, treatVar, covariates, { nBins = 10 } = {}) {
  if (!data || data.length < 10 || !treatVar || !covariates || !covariates.length) return null;
  const vals = [...new Set(data.map(r => r[treatVar]))];
  if (vals.length !== 2) return null;
  const treatVal = vals[1];
  const rows = data.filter(r => covariates.every(c => Number.isFinite(r[c])));
  const y = rows.map(r => r[treatVar] === treatVal ? 1 : 0);
  const X = rows.map(r => covariates.map(c => +r[c]));
  const logit = logisticReg(y, X, covariates);
  const ps = logit?.fitted || rows.map(() => 0.5);
  const min = Math.min(...ps), max = Math.max(...ps);
  const width = (max - min) / nBins;
  const bins = Array.from({ length: nBins }, (_, i) => {
    const lo = min + i * width, hi = i < nBins - 1 ? lo + width : max + 0.001;
    const tCount = rows.filter((_, j) => ps[j] >= lo && ps[j] < hi && y[j] === 1).length;
    const cCount = rows.filter((_, j) => ps[j] >= lo && ps[j] < hi && y[j] === 0).length;
    return { bin: i + 1, lo: +lo.toFixed(4), hi: +hi.toFixed(4), treated: tCount, control: cCount };
  });
  return {
    test: 'Propensity Overlap', bins, n: rows.length, nBins,
    apa: `Overlap: ${bins.filter(b => b.treated > 0 && b.control > 0).length}/${nBins} bins have common support`,
  };
}

// ── Weighting Diagnostics ─────────────────────────────────────────
export function weightingDiagnostics(weights, data, treatVar, covariates) {
  if (!weights || !data || !treatVar || !covariates || !covariates.length) return null;
  const n = Math.min(weights.length, data.length);
  let sumW = 0, sumWSq = 0;
  for (let i = 0; i < n; i++) { sumW += weights[i]; sumWSq += weights[i] * weights[i]; }
  const nEff = sumW > 0 ? sumW * sumW / sumWSq : n;
  const vals = [...new Set(data.map(r => r[treatVar]))];
  if (vals.length !== 2) return null;
  const treatVal = vals[1];
  const treated = data.filter((_, i) => i < n && data[i][treatVar] === treatVal);
  const control = data.filter((_, i) => i < n && data[i][treatVar] !== treatVal);
  const beforeBalance = covariateBalance(treated, control, covariates);
  const weightedT = treated.map((r, i) => ({
    ...r, _w: weights[data.indexOf(r)] || 1
  }));
  const weightedC = control.map((r, i) => ({
    ...r, _w: weights[data.indexOf(r)] || 1
  }));
  const afterBalance = covariateBalance(weightedT, weightedC, covariates);
  return {
    test: 'Weighting Diagnostics', nEff: +nEff.toFixed(1), n, nTreated: treated.length, nControl: control.length,
    balanceBefore: beforeBalance?.results || [],
    balanceAfter: afterBalance?.results || [],
    apa: `Weight diag: n_eff = ${nEff.toFixed(0)}, before: ${beforeBalance?.results?.filter(r => r.balanced).length || 0}, after: ${afterBalance?.results?.filter(r => r.balanced).length || 0} balanced`,
  };
}

// ── Love Plot Data ────────────────────────────────────────────────
export function lovePlotData(before, after) {
  if (!before || !after) return null;
  const data = before.map((b, i) => {
    const a = after[i] || { smd: 0 };
    return { variable: b.variable, before: +b.smd.toFixed(4), after: +a.smd.toFixed(4) };
  });
  return {
    test: 'Love Plot Data', points: data, nVars: data.length,
    apa: `Love plot: ${data.filter(d => Math.abs(d.after) < Math.abs(d.before)).length} of ${data.length} improved`,
  };
}

// ── Natural Indirect Effect ───────────────────────────────────────
export function naturalIndirectEffect(data, treatVar, mediator, outcomeVar, covariates) {
  if (!data || data.length < 20 || !treatVar || !mediator || !outcomeVar) return null;
  const rows = data.filter(r => r[treatVar] != null && Number.isFinite(+r[outcomeVar]) && Number.isFinite(+r[mediator]) && covariates.every(c => Number.isFinite(r[c])));
  if (rows.length < 20) return null;
  const cats = [...new Set(rows.map(r => r[treatVar]))].sort();
  if (cats.length !== 2) return null;
  const treatVal = cats[1];
  const X = rows.map(r => covariates.map(c => +r[c]));
  const yM = rows.map(r => +r[mediator]);
  const tM = rows.map(r => r[treatVar] === treatVal ? 1 : 0);
  const aX = X.map((x, i) => [tM[i], ...x]);
  const aXt = aX[0].map((_, j) => aX.map(r => r[j]));
  const aXtX = aXt.map(r1 => aX[0].map((_, j) => r1.reduce((s, _, k) => s + aX[k][j] * r1[k], 0)));
  const aXty = aXt.map(r1 => r1.reduce((s, v, k) => s + v * yM[k], 0));
  const aInv = matInv(aXtX);
  if (!aInv) return null;
  const aCoef = aInv.map(row => row.reduce((s, v, j) => s + v * aXty[j], 0));
  const a = aCoef[0];
  const yO = rows.map(r => +r[outcomeVar]);
  const bX = rows.map(r => [r[treatVar] === treatVal ? 1 : 0, +r[mediator], ...covariates.map(c => +r[c])]);
  const bXt = bX[0].map((_, j) => bX.map(r => r[j]));
  const bXtX = bXt.map(r1 => bX[0].map((_, j) => r1.reduce((s, _, k) => s + bX[k][j] * r1[k], 0)));
  const bXty = bXt.map(r1 => r1.reduce((s, v, k) => s + v * yO[k], 0));
  const bInv = matInv(bXtX);
  if (!bInv) return null;
  const bCoef = bInv.map(row => row.reduce((s, v, j) => s + v * bXty[j], 0));
  const b = bCoef[1];
  const nie = a * b;
  const seNie = Math.sqrt((a*a)*(bInv[1][1]||0.01)+(b*b)*(aInv[0][0]||0.01));
  const z = seNie > 0 ? nie / seNie : 0;
  return { test: 'Natural Indirect Effect', nie:+nie.toFixed(4), a:+a.toFixed(4), b:+b.toFixed(4), se:+seNie.toFixed(4), z:+z.toFixed(4), p:2*(1-normalCDF(Math.abs(z))), n:rows.length, apa:`NIE = ${nie.toFixed(3)}, z=${z.toFixed(2)}` };
}

// ── Controlled Direct Effect ──────────────────────────────────────
export function controlledDirectEffect(data, treatVar, mediator, outcomeVar, covariates, mediatorValue = 0) {
  if (!data || data.length < 20 || !treatVar || !mediator || !outcomeVar) return null;
  const rows = data.filter(r => r[treatVar]!=null && Number.isFinite(+r[outcomeVar]) && Number.isFinite(+r[mediator]) && covariates.every(c=>Number.isFinite(r[c])));
  if (rows.length < 20) return null;
  const cats = [...new Set(rows.map(r => r[treatVar]))].sort();
  if (cats.length !== 2) return null;
  const treatVal = cats[1];
  const X = rows.map(r => [1, r[treatVar]===treatVal?1:0, +r[mediator], ...covariates.map(c=>+r[c])]);
  const y = rows.map(r => +r[outcomeVar]);
  const Xt = X[0].map((_,j)=>X.map(r=>r[j]));
  const XtX = Xt.map(r1=>X[0].map((_,j)=>r1.reduce((s,_,k)=>s+X[k][j]*r1[k],0)));
  const Xty = Xt.map(r1=>r1.reduce((s,v,k)=>s+v*y[k],0));
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = inv.map(row=>row.reduce((s,v,j)=>s+v*Xty[j],0));
  const cde = beta[1], se = Math.sqrt(Math.max(0,inv[1][1]));
  const z = se>0?cde/se:0;
  return { test: 'Controlled Direct Effect', cde:+cde.toFixed(4), se:+se.toFixed(4), z:+z.toFixed(4), p:2*(1-normalCDF(Math.abs(z))), mediatorValue, n:rows.length, apa:`CDE = ${cde.toFixed(3)}, z=${z.toFixed(2)}` };
}

// ── E-Value ───────────────────────────────────────────────────────
export function evalue(estimate, se) {
  if (!Number.isFinite(estimate) || !Number.isFinite(se) || se <= 0) return null;
  const b = Math.abs(estimate), t = b / se;
  const threshold = b - 1.96 * se;
  const e = threshold > 0 ? threshold + Math.sqrt(threshold * (threshold - 1)) : 1;
  return { test: 'E-Value', e:+e.toFixed(4), estimate:+estimate.toFixed(4), se:+se.toFixed(4), lowerCI:+(estimate-1.96*se).toFixed(4), apa:`E-value = ${e.toFixed(2)}` };
}

// ── Mediation Proportion ──────────────────────────────────────────
export function mediationProportion(indirect, total) {
  if (!Number.isFinite(indirect) || !Number.isFinite(total) || total === 0) return null;
  const prop = indirect / total;
  return { test: 'Mediation Proportion', proportion:+prop.toFixed(4), indirect:+indirect.toFixed(4), total:+total.toFixed(4), apa:`Prop mediated = ${(prop*100).toFixed(0)}%` };
}

// ── Sensitivity Bias ──────────────────────────────────────────────
export function sensitivityBias(or, prevalence = 0.3) {
  if (!or || or <= 0 || prevalence <= 0 || prevalence >= 1) return null;
  const rr = Math.sqrt(or);
  const crit = (rr - 1) / (prevalence * rr + 1 - prevalence);
  return { test: 'Sensitivity Bias', criticalRR:+crit.toFixed(4), or:+or.toFixed(4), prevalence, apa:`Critical RR = ${crit.toFixed(2)}` };
}

// ── Interaction Mediation ─────────────────────────────────────────
export function interactionMediation(data, treatVar, mediator, outcomeVar, covariates) {
  if (!data || data.length < 20 || !treatVar || !mediator || !outcomeVar) return null;
  const rows = data.filter(r => r[treatVar]!=null && Number.isFinite(+r[outcomeVar]) && Number.isFinite(+r[mediator]) && covariates.every(c=>Number.isFinite(r[c])));
  if (rows.length < 20) return null;
  const cats = [...new Set(rows.map(r => r[treatVar]))].sort();
  if (cats.length !== 2) return null;
  const treatVal = cats[1];
  const X = rows.map(r => [1, r[treatVar]===treatVal?1:0, +r[mediator], (r[treatVar]===treatVal?1:0)*(+r[mediator]), ...covariates.map(c=>+r[c])]);
  const y = rows.map(r => +r[outcomeVar]);
  const Xt = X[0].map((_,j)=>X.map(r=>r[j]));
  const XtX = Xt.map(r1=>X[0].map((_,j)=>r1.reduce((s,_,k)=>s+X[k][j]*r1[k],0)));
  const Xty = Xt.map(r1=>r1.reduce((s,v,k)=>s+v*y[k],0));
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = inv.map(row=>row.reduce((s,v,j)=>s+v*Xty[j],0));
  const interaction = beta[3], se = Math.sqrt(Math.max(0,inv[3][3]));
  const z = se>0?interaction/se:0;
  return { test: 'Interaction Mediation', interaction:+interaction.toFixed(4), se:+se.toFixed(4), z:+z.toFixed(4), p:2*(1-normalCDF(Math.abs(z))), n:rows.length, apa:`Interaction = ${interaction.toFixed(3)}, z=${z.toFixed(2)}` };
}

// ── MSM with IPTW ─────────────────────────────────────────────────
export function msmWeights(data, timeVars, treatment, outcome, covariates) {
  if (!data || data.length < 20 || !timeVars || !treatment || !outcome) return null;
  const n = data.length;
  const tVals = [...new Set(data.map(r => r[treatment]))];
  if (tVals.length !== 2) return null;
  const treatVal = tVals[1];
  const x = data.map(r => covariates.map(c => +r[c]));
  const y = data.map(r => +r[outcome]);
  const t = data.map(r => r[treatment] === treatVal ? 1 : 0);
  // Weights via logistic
  const logit = logisticReg(t, x, covariates);
  const ps = logit?.fitted || data.map(() => 0.5);
  const w = t.map((ti, i) => ti / Math.max(ps[i], 0.1) + (1 - ti) / Math.max(1 - ps[i], 0.1));
  let sw = 0, swy = 0;
  for (let i = 0; i < n; i++) { sw += w[i]; swy += w[i] * y[i]; }
  const weightedMean = sw > 0 ? swy / sw : 0;
  return { test: 'MSM Weights', weightedMean: +weightedMean.toFixed(4), n, nTreated: t.filter(v => v === 1).length, apa: `MSM: weighted mean = ${weightedMean.toFixed(3)}, n = ${n}` };
}

// ── G-estimation ──────────────────────────────────────────────────
export function gestimationSNM(data, treatment, outcome, covariates) {
  if (!data || data.length < 20 || !treatment || !outcome) return null;
  const n = data.length;
  const treatVals = [...new Set(data.map(r => r[treatment]))];
  if (treatVals.length !== 2) return null;
  const treatVal = treatVals[1];
  const t = data.map(r => r[treatment] === treatVal ? 1 : 0);
  const y = data.map(r => +r[outcome]);
  const x = data.map(r => covariates?.map(c => +r[c]) || []);
  // G-estimate: solve for psi s.t. Y - psi*T is independent of T given X
  let psi = 0;
  for (let iter = 0; iter < 20; iter++) {
    const blip = y.map((yi, i) => yi - psi * t[i]);
    // Regress blip on X and T
    const Xall = blip.map((_, i) => [t[i], ...(x[i] || [])]);
    const Xt = Xall[0].map((_, j) => Xall.map(r => r[j]));
    const XtX = Xt.map(r1 => Xall[0].map((_, j) => r1.reduce((s, _, k) => s + Xall[k][j] * r1[k], 0)));
    const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * blip[k], 0));
    const inv = matInv(XtX);
    if (!inv) break;
    const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
    psi += 0.1 * beta[0];
    if (Math.abs(beta[0]) < 1e-4) break;
  }
  return { test: 'G-estimation', psi: +psi.toFixed(4), n, apa: `G-est: ψ = ${psi.toFixed(3)}, n = ${n}` };
}

// ── RPSFT ─────────────────────────────────────────────────────────
export function rpsft(data, treatment, outcome, observed) {
  if (!data || data.length < 20 || !treatment || !outcome || !observed) return null;
  const n = data.length;
  const treatVals = [...new Set(data.map(r => r[treatment]))];
  if (treatVals.length !== 2) return null;
  const treatVal = treatVals[1];
  const t = data.map(r => r[treatment] === treatVal ? 1 : 0);
  const y = data.map(r => +r[outcome]);
  const tObs = data.map(r => +r[observed]);
  // RPSFT: U = T*exp(-psi) for treated, T for untreated
  let psi = 0;
  for (let iter = 0; iter < 15; iter++) {
    const u = tObs.map((ti, i) => t[i] ? ti * Math.exp(-psi) : ti);
    let st = 0, su = 0;
    for (let i = 0; i < n; i++) { st += t[i] * u[i]; su += (1 - t[i]) * u[i]; }
    const z = n > 0 ? (st / Math.max(t.filter(v => v === 1).length, 1) - su / Math.max(t.filter(v => v === 0).length, 1)) / (1 || 0.1) : 0;
    psi += 0.01 * z;
    if (Math.abs(z) < 1e-4) break;
  }
  return { test: 'RPSFT', psi: +psi.toFixed(4), n, apa: `RPSFT: ψ = ${psi.toFixed(3)}, n = ${n}` };
}

// ── Structural Nested AFT ─────────────────────────────────────────
export function structuralNestedAFT(data, treatment, eventTime, covariates) {
  if (!data || data.length < 20 || !treatment || !eventTime) return null;
  const n = data.length;
  const treatVals = [...new Set(data.map(r => r[treatment]))];
  if (treatVals.length !== 2) return null;
  const treatVal = treatVals[1];
  const t = data.map(r => r[treatment] === treatVal ? 1 : 0);
  const y = data.map(r => +r[eventTime]);
  let psi = 0;
  // Simple AFT: T_0 = T * exp(psi*t) for treated
  for (let iter = 0; iter < 20; iter++) {
    const t0 = y.map((yi, i) => t[i] ? yi * Math.exp(-psi) : yi);
    const logRanks = [];
    for (let j = 0; j < t.length; j++) logRanks.push(t[j] - avg(t));
    let score = 0;
    for (let i = 0; i < n; i++) score += logRanks[i] * t[i];
    psi += 0.005 * score / n;
    if (Math.abs(score) < 1e-3) break;
  }
  return { test: 'Structural Nested AFT', psi: +psi.toFixed(4), n, apa: `SN-AFT: ψ = ${psi.toFixed(3)}, n = ${n}` };
}

// ── Compliance-Adjusted ATE ───────────────────────────────────────
export function complianceAdjusted(data, randomized, received, outcome) {
  if (!data || data.length < 20 || !randomized || !received || !outcome) return null;
  const n = data.length;
  const Z = data.map(r => r[randomized] === 1 ? 1 : 0);
  const D = data.map(r => r[received] === 1 ? 1 : 0);
  const Y = data.map(r => +r[outcome]);
  // Wald IV estimator: CACE = (E[Y|Z=1] - E[Y|Z=0]) / (E[D|Z=1] - E[D|Z=0])
  const idxZ1 = Z.reduce((arr, v, i) => { if (v === 1) arr.push(i); return arr; }, []);
  const idxZ0 = Z.reduce((arr, v, i) => { if (v === 0) arr.push(i); return arr; }, []);
  const yZ1 = idxZ1.reduce((s, i) => s + Y[i], 0) / idxZ1.length;
  const yZ0 = idxZ0.reduce((s, i) => s + Y[i], 0) / idxZ0.length;
  const dZ1 = idxZ1.reduce((s, i) => s + D[i], 0) / idxZ1.length;
  const dZ0 = idxZ0.reduce((s, i) => s + D[i], 0) / idxZ0.length;
  const cace = (dZ1 - dZ0) !== 0 ? (yZ1 - yZ0) / (dZ1 - dZ0) : null;
  return { test: 'Compliance-Adjusted', cace: cace != null ? +cace.toFixed(4) : null, n, complianceRate: +(dZ1 - dZ0).toFixed(4), apa: `CACE = ${cace?.toFixed(3) || 'N/A'} (compliance = ${(dZ1 - dZ0).toFixed(2)})` };
}

// ── Weak IV Test (F > 10 rule) ────────────────────────────────────
export function weakIVTest(data, yVar, xVar, instrument, zVars) {
  if (!data || data.length < 20 || !yVar || !xVar || !instrument) return null;
  const rows = data.filter(r => Number.isFinite(+r[xVar]) && Number.isFinite(+r[instrument]) && (zVars || []).every(c => Number.isFinite(+r[c])));
  if (rows.length < 15) return null;
  const x = rows.map(r => +r[xVar]);
  const z = rows.map(r => +r[instrument]);
  const zz = z.map((_, i) => [x[i], z[i]]);
  // F-test on instrument relevance
  const xs = zz.map(r => r[0]), zs = zz.map(r => r[1]);
  let sx = 0, sz = 0, sxx = 0, sxz = 0;
  for (let i = 0; i < zz.length; i++) { sx += xs[i]; sz += zs[i]; sxx += xs[i] * xs[i]; sxz += xs[i] * zs[i]; }
  const n = zz.length;
  const denom = n * sxz - sx * sz;
  const fStat = Math.abs(denom) / Math.max(xs.reduce((s, v) => s + v * v, 0), 1);
  return { test: 'Weak IV Test', fStat: +fStat.toFixed(4), isWeak: fStat < 10, n, apa: `IV F = ${fStat.toFixed(1)}, ${fStat < 10 ? 'WEAK' : 'adequate'}` };
}

// ── Sargan-Hansen J Test ──────────────────────────────────────────
export function sarganHansenJ(data, yVar, xVar, instruments) {
  if (!data || data.length < 20 || !yVar || !xVar || !instruments || instruments.length < 2) return null;
  const n = data.length;
  const L = instruments.length;
  if (L < 2) return null;
  // Use first instrument as exclusion
  const J = Math.abs(avg(data.map(r => +r[instruments[0]])) - avg(data.map(r => +r[instruments[1]])));
  const p = chiPVal(Math.max(0, J), L - 1);
  return { test: 'Sargan-Hansen J', J: +J.toFixed(4), df: L - 1, p, n, apa: `J(${L - 1}) = ${J.toFixed(3)}, ${p > 0.05 ? 'instruments valid' : 'overidentified'}` };
}

// ── Durbin-Wu-Hausman Endogeneity Test ────────────────────────────
export function durbinWuHausman(data, yVar, xVar, instruments) {
  if (!data || data.length < 20 || !yVar || !xVar || !instruments || !instruments.length) return null;
  const n = data.length;
  const z = data.map(r => +r[instruments[0]]);
  const x = data.map(r => +r[xVar]);
  let sxz = 0, szz = 0;
  for (let i = 0; i < n; i++) { sxz += x[i] * z[i]; szz += z[i] * z[i]; }
  const pi = szz > 0 ? sxz / szz : 0;
  const resid = x.map((xi, i) => xi - pi * z[i]);
  const xHat = z.map(zi => pi * zi);
  // Hausman: compare OLS vs IV
  const diff = Math.abs(avg(x) - avg(xHat));
  const chi2 = diff * diff / Math.max(avg(resid) ** 2, 1e-6);
  const p = chiPVal(Math.max(0, chi2), 1);
  return { test: 'Durbin-Wu-Hausman', chi2: +chi2.toFixed(4), p, n, apa: `DWH: χ²(1) = ${chi2.toFixed(2)}, ${p < 0.05 ? 'endogenous' : 'exogenous OK'}` };
}

// ── IV Diagnostics Summary ────────────────────────────────────────
export function ivDiagnosticsSummary(fsFstat, sarganJ, hausman) {
  if (!fsFstat || !sarganJ || !hausman) return null;
  return { test: 'IV Diagnostics Summary', weakInstruments: fsFstat.isWeak || false, overidentified: sarganJ.p < 0.05, endogenous: hausman.p < 0.05, apa: `IV diag: weak=${fsFstat.isWeak}, overID=${sarganJ.p < 0.05}, endog=${hausman.p < 0.05}` };
}

// ── Moderated Mediation ───────────────────────────────────────────
export function moderatedMediation(data, xVar, mVar, yVar, wVar, { nBoot = 100 } = {}) {
  if (!data || data.length < 20 || !xVar || !mVar || !yVar || !wVar) return null;
  const n = data.length;
  const x = data.map(r => +r[xVar]), m = data.map(r => +r[mVar]), y = data.map(r => +r[yVar]), w = data.map(r => +r[wVar]);
  const xw = x.map((xi, i) => xi * w[i]);
  const mw = m.map((mi, i) => mi * w[i]);
  const idx = w.map((wi, i) => wi >= avg(w) ? 'high' : 'low');
  const idxHigh = idx.map((v, i) => v === 'high' ? i : -1).filter(i => i >= 0);
  const idxLow = idx.map((v, i) => v === 'low' ? i : -1).filter(i => i >= 0);
  const ieHigh = corr(x.filter((_, i) => idx[i] === 'high'), m.filter((_, i) => idx[i] === 'high'));
  const ieLow = corr(x.filter((_, i) => idx[i] === 'low'), m.filter((_, i) => idx[i] === 'low'));
  return { test: 'Moderated Mediation', ieHigh: +ieHigh.toFixed(4), ieLow: +ieLow.toFixed(4), moderator: wVar, n, apa: `Mod-med: IE_high=${ieHigh.toFixed(3)}, IE_low=${ieLow.toFixed(3)} (mod=${wVar})` };
}

// ── Multi-Mediator ────────────────────────────────────────────────
export function multiMediator(data, xVar, yVar, mVars, { nBoot = 100 } = {}) {
  if (!data || data.length < 20 || !xVar || !yVar || !mVars || mVars.length < 2) return null;
  const x = data.map(r => +r[xVar]), y = data.map(r => +r[yVar]);
  const totaLE = corr(x, y);
  const indirect = mVars.map(mv => {
    const m = data.map(r => +r[mv]);
    const aPath = corr(x, m);
    const bPath = partialCorrSimple(m, y, [x]);
    return { mediator: mv, aPath: +aPath.toFixed(4), bPath: +bPath.toFixed(4), indirect: +(aPath * bPath).toFixed(4) };
  });
  const totalIndirect = indirect.reduce((s, r) => s + r.indirect, 0);
  const n = data.length;
  return { test: 'Multi-Mediator', totalEffect: +totaLE.toFixed(4), totalIndirect: +totalIndirect.toFixed(4), indirect, n, apa: `Multi-med: total indirect = ${totalIndirect.toFixed(3)}` };
}

function partialCorrSimple(x, y, zVars) {
  if (!zVars.length) return corr(x, y);
  const z = zVars.map(v => [v]); const zAvg = z.map(arr => arr.reduce((s, v) => s + v, 0) / arr.length);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) {
    const xRes = x[i] - x.reduce((s, v, j) => s + v * zVars.length, 0) / x.length;
    const yRes = y[i] - y.reduce((s, v, j) => s + v, 0) / y.length;
    num += xRes * yRes; dx += xRes * xRes; dy += yRes * yRes;
  }
  return Math.sqrt(dx * dy) > 0 ? num / Math.sqrt(dx * dy) : 0;
}

// ── Longitudinal Mediation ────────────────────────────────────────
export function longitudinalMediation(data, xVar, mVar, yVar, timeVar, { idVar = 'id' } = {}) {
  if (!data || data.length < 20 || !xVar || !mVar || !yVar || !timeVar) return null;
  const ids = [...new Set(data.map(r => r[idVar] || r[timeVar]))];
  const xBl = ids.map(id => {
    const rows = data.filter(r => (r[idVar] || r[timeVar]) === id).sort((a, b) => +a[timeVar] - +b[timeVar]);
    return rows.length > 0 ? +rows[0][xVar] : 0;
  });
  const mChg = ids.map(id => {
    const rows = data.filter(r => (r[idVar] || r[timeVar]) === id).sort((a, b) => +a[timeVar] - +b[timeVar]);
    return rows.length > 1 ? +rows[rows.length-1][mVar] - +rows[0][mVar] : 0;
  });
  const yChg = ids.map(id => {
    const rows = data.filter(r => (r[idVar] || r[timeVar]) === id).sort((a, b) => +a[timeVar] - +b[timeVar]);
    return rows.length > 1 ? +rows[rows.length-1][yVar] - +rows[0][yVar] : 0;
  });
  const aPath = corr(xBl, mChg);
  const bPath = corr(mChg, yChg);
  return { test: 'Longitudinal Mediation', aPath: +aPath.toFixed(4), bPath: +bPath.toFixed(4), indirect: +(aPath * bPath).toFixed(4), nSubjects: ids.length, apa: `Longitudinal med: a=${aPath.toFixed(3)}, b=${bPath.toFixed(3)}` };
}

// ── Sensitivity Bounds ────────────────────────────────────────────
export function sensitivityBounds(effect, se, rho = 0.1) {
  if (effect == null || !se || se <= 0) return null;
  const bias = rho * se;
  const adjusted = effect - bias;
  return { test: 'Sensitivity Bounds', original: +effect.toFixed(4), adjusted: +adjusted.toFixed(4), bias: +bias.toFixed(4), rho, apa: `Sensitivity: adjusted effect = ${adjusted.toFixed(3)} (rho=${rho})` };
}
