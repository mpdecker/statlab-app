import { avg, sampleVar, sampleSD, fmtP } from '../math/core.js';
import { tPVal } from '../math/distributions.js';
import { matMul, matInv } from '../math/matrix.js';
import { logisticReg } from './regression.js';

function sigmoid(z) {
  const c = Math.max(-20, Math.min(20, z));
  return 1 / (1 + Math.exp(-c));
}

/** Propensity score matching — nearest neighbor ATT */
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
  const resid = Y.map((y, i) => y - X2[i].reduce((s, v, j) => s + v * beta2[j], 0));
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
