import { avg, sampleVar, sampleSD, fmtP } from '../math/core.js';
import { tPVal, tInv2, chiPVal, normalCDF, lngamma, fPVal } from '../math/distributions.js';
import { matTrans, matMul, matInv } from '../math/matrix.js';
import { mleFit } from '../math/inference.js';

/**
 * Cluster-robust (sandwich) covariance for a linear model:
 *   cov = (XᵀX)⁻¹ [ Σ_g (X_gᵀ u_g)(X_gᵀ u_g)ᵀ ] (XᵀX)⁻¹
 * X is an n×p row matrix, resid the length-n residual vector, clusters an
 * array of arrays of row indices. Returns the p-length SE vector or null.
 */
function clusterRobustSE(X, resid, clusters, bread) {
  const p = X[0].length;
  const meat = Array.from({ length: p }, () => Array(p).fill(0));
  for (const idx of clusters) {
    const sg = Array(p).fill(0);
    for (const i of idx) for (let j = 0; j < p; j++) sg[j] += X[i][j] * resid[i];
    for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) meat[a][b] += sg[a] * sg[b];
  }
  const bm = bread.map(row => meat[0].map((_, b) => row.reduce((s, v, k) => s + v * meat[k][b], 0)));
  const cov = bm.map(row => bread[0].map((_, b) => row.reduce((s, v, k) => s + v * bread[b][k], 0)));
  return cov.map((r, i) => Math.sqrt(Math.max(0, r[i])));
}

function groupBy(data, key) {
  const map = new Map();
  data.forEach(r => {
    const g = String(r[key]);
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(r);
  });
  return map;
}

/** Random-intercept HLM: y = γ00 + γ01*x + u_j + e_ij */

// ── HLM Random Intercept ──────────────────────────────────────────
/** Random-intercept multilevel model. @param {Array<Record<string, any>>} data @param {string} yVar @param {string} clusterVar @param {string[]} [xVars=[]] */
export function hlmRandomIntercept(data, yVar, clusterVar, xVars = []) {
  const rows = data.filter(r => clusterVar != null && Number.isFinite(+r[yVar]));
  const groups = groupBy(rows, clusterVar);
  const J = groups.size;
  if (J < 3 || rows.length < J + 10) return null;

  const hasX = xVars.length > 0 && xVars.every(v => rows.every(r => Number.isFinite(+r[v])));
  const y = rows.map(r => +r[yVar]);
  const grandMean = avg(y);

  const gj = [...groups.entries()].map(([name, memb]) => {
    const ys = memb.map(r => +r[yVar]);
    const m = avg(ys);
    const n = ys.length;
    let xbar = 0;
    if (hasX) xbar = avg(xVars.map(v => avg(memb.map(r => +r[v]))));
    return { name, n, mean: m, xbar };
  });

  const nTotal = rows.length;
  const ssTotal = y.reduce((s, v) => s + (v - grandMean) ** 2, 0);
  const ssBetween = gj.reduce((s, g) => s + g.n * (g.mean - grandMean) ** 2, 0);
  const ssWithin = ssTotal - ssBetween;
  const dfB = J - 1;
  const dfW = nTotal - J;
  if (dfW < 1) return null;
  const msB = ssBetween / dfB;
  const msW = ssWithin / dfW;
  const icc = (msB - msW) / (msB + (avg(gj.map(g => g.n)) - 1) * msW);
  const tau00 = Math.max(0, (msB - msW) / nTotal);
  const sigma2 = msW;

  let gamma01 = 0;
  let seGamma = null;
  if (hasX) {
    const xs = gj.map(g => g.xbar);
    const ys = gj.map(g => g.mean);
    const mx = avg(xs);
    const my = avg(ys);
    const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
    gamma01 = sxx ? sxy / sxx : 0;
    const resid = ys.map((yv, i) => yv - my - gamma01 * (xs[i] - mx));
    seGamma = Math.sqrt(sampleVar(resid) / (sxx || 1));
  }

  const deff = 1 + (avg(gj.map(g => g.n)) - 1) * Math.max(0, icc);

  return {
    test: 'HLM Random Intercept',
    icc: +Math.max(0, icc).toFixed(4),
    tau00: +tau00.toFixed(5),
    sigma2: +sigma2.toFixed(5),
    gamma00: +(grandMean).toFixed(4),
    gamma01: hasX ? +gamma01.toFixed(4) : null,
    seGamma01: seGamma != null ? +seGamma.toFixed(4) : null,
    designEffect: +deff.toFixed(4),
    nClusters: J,
    n: nTotal,
    clusterVar,
    yVar,
    xVars: hasX ? xVars : [],
    groupMeans: gj.slice(0, 12).map(g => ({ name: g.name, mean: +g.mean.toFixed(4), n: g.n })),
    apa: `HLM RI: ICC = ${Math.max(0, icc).toFixed(3)}, τ₀₀ = ${tau00.toFixed(3)}, σ² = ${sigma2.toFixed(3)}, J = ${J}, N = ${nTotal}`,
  };
}

/** Random slope extension (cluster-specific slopes on one predictor) */

// ── HLM Random Slope ──────────────────────────────────────────────
/** Random-slope multilevel model. @param {Array<Record<string, any>>} data @param {string} yVar @param {string} clusterVar @param {string} xVar */
export function hlmRandomSlope(data, yVar, clusterVar, xVar) {
  const base = hlmRandomIntercept(data, yVar, clusterVar, [xVar]);
  if (!base) return null;
  const rows = data.filter(r => clusterVar != null && Number.isFinite(+r[yVar]) && Number.isFinite(+r[xVar]));
  const groups = groupBy(rows, clusterVar);
  const slopes = [...groups.entries()].map(([name, memb]) => {
    const xs = memb.map(r => +r[xVar]);
    const ys = memb.map(r => +r[yVar]);
    const mx = avg(xs);
    const my = avg(ys);
    const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
    return { name, slope: sxx ? sxy / sxx : 0, n: memb.length };
  });
  const slopeVar = sampleVar(slopes.map(s => s.slope));
  return {
    ...base,
    test: 'HLM Random Slope',
    meanSlope: +avg(slopes.map(s => s.slope)).toFixed(4),
    slopeVariance: +slopeVar.toFixed(5),
    slopes: slopes.slice(0, 15).map(s => ({ name: s.name, slope: +s.slope.toFixed(4), n: s.n })),
    apa: `${base.apa}; random slope var = ${slopeVar.toFixed(4)} on ${xVar}`,
  };
}

/** Multilevel ICC from nested one-way layout */

// ── Multilevel ICC ────────────────────────────────────────────────
/** Intraclass correlation from a null multilevel model. @param {Array<Record<string, any>>} data @param {string} yVar @param {string} clusterVar */
export function iccMultilevel(data, yVar, clusterVar) {
  const res = hlmRandomIntercept(data, yVar, clusterVar, []);
  if (!res) return null;
  return {
    test: 'Multilevel ICC',
    icc: res.icc,
    designEffect: res.designEffect,
    tau00: res.tau00,
    sigma2: res.sigma2,
    nClusters: res.nClusters,
    n: res.n,
    apa: `ICC = ${res.icc.toFixed(3)}, design effect = ${res.designEffect.toFixed(2)}, J = ${res.nClusters}, N = ${res.n}`,
  };
}

// ── GLMM Logistic (PQL) ──────────────────────────────────────────────────────
/** Logistic GLMM (random intercept). @param {Array<Record<string, any>>} data @param {string} yVar @param {string} clusterVar @param {string[]} [xVars=[]] @param {{maxIter?: number, tolerance?: number}} [options] */
export function glmmLogistic(data, yVar, clusterVar, xVars = [], { maxIter = 30, tolerance = 1e-5 } = {}) {
  const rows = data.filter(r => clusterVar != null && Number.isFinite(+r[yVar]) &&
    xVars.every(v => Number.isFinite(+r[v])));
  if (rows.length < 15) return null;
  const groups = groupBy(rows, clusterVar);
  const J = groups.size;
  if (J < 3) return null;

  const y = rows.map(r => +r[yVar]);
  if (y.some(v => v !== 0 && v !== 1)) return null;
  const hasX = xVars.length > 0;
  const n = rows.length, k = hasX ? xVars.length + 1 : 1;

  let beta = Array(k).fill(0);
  let u = Array(J).fill(0);
  let tau2 = 0.1;
  const groupIdx = [];
  const groupNames = [...groups.keys()];
  rows.forEach(r => { groupIdx.push(groupNames.indexOf(String(r[clusterVar]))); });

  function designRow(i) {
    const row = [1];
    if (hasX) for (const v of xVars) row.push(+rows[i][v]);
    return row;
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const eta = Array(n);
    const mu = Array(n);
    const w = Array(n);
    const z = Array(n);
    for (let i = 0; i < n; i++) {
      let etaVal = u[groupIdx[i]];
      const xi = designRow(i);
      for (let j = 0; j < k; j++) etaVal += beta[j] * xi[j];
      eta[i] = etaVal;
      mu[i] = 1 / (1 + Math.exp(-etaVal));
      w[i] = Math.max(1e-6, mu[i] * (1 - mu[i]));
      z[i] = etaVal + (y[i] - mu[i]) / w[i];
    }

    const colMeans = Array(k).fill(0);
    const colSDs = Array(k).fill(0);
    for (let j = 0; j < k; j++) {
      const vals = Array.from({ length: n }, (_, i) => designRow(i)[j]);
      colMeans[j] = avg(vals);
      colSDs[j] = Math.sqrt(sampleVar(vals)) || 1;
    }

    const Xw = Array.from({ length: n }, (_, i) => {
      const xi = designRow(i);
      return xi.map((x, j) => x * Math.sqrt(w[i]));
    });
    const zw = z.map((v, i) => v * Math.sqrt(w[i]));

    let solved = false;
    for (let inner = 0; inner < 5; inner++) {
      const vInv = Array.from({ length: n }, (_, i) => {
        const xi = designRow(i);
        let pred = 0;
        for (let j = 0; j < k; j++) pred += beta[j] * xi[j];
        pred += u[groupIdx[i]];
        const resid = zw[i];
        let sum = 0;
        for (let j = 0; j < k; j++) sum += xi[j] * Math.sqrt(w[i]);
        return { pred, resid, xi };
      });

      const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, ij) => {
        let s = (i === ij ? 1e-6 : 0);
        for (let r = 0; r < n; r++) s += Xw[r][i] * Xw[r][ij];
        return s;
      }));
      const b = Array.from({ length: k }, (_, i) => {
        let s = 0;
        for (let r = 0; r < n; r++) s += Xw[r][i] * (zw[r] - u[groupIdx[r]] * Math.sqrt(w[r]));
        return s;
      });
      const Ainv = matInv(A);
      if (!Ainv) break;
      for (let j = 0; j < k; j++) {
        beta[j] = Ainv[j].reduce((s, v, i) => s + v * b[i], 0);
      }

      for (let g = 0; g < J; g++) {
        const memb = [];
        for (let i = 0; i < n; i++) if (groupIdx[i] === g) memb.push(i);
        let num = 0, den = 0;
        for (const i of memb) {
          let pred = 0;
          const xi = designRow(i);
          for (let ij = 0; ij < k; ij++) pred += beta[ij] * xi[ij];
          num += w[i] * (z[i] - pred);
          den += w[i] + 1e-6;
        }
        u[g] = num / (den + 1 / Math.max(tau2, 0.01));
      }
      solved = true;
    }
    if (!solved) return null;
  }

  const hlmLike = hlmRandomIntercept(rows, yVar, clusterVar, xVars);
  return {
    test: 'GLMM Logistic',
    coefficients: beta.map((b, i) => ({
      name: i === 0 ? '(Intercept)' : xVars[i - 1],
      logOR: +b.toFixed(4),
      OR: +Math.exp(b).toFixed(4),
    })),
    tau2: +tau2.toFixed(5),
    iccLatent: +(tau2 / (tau2 + Math.PI * Math.PI / 3)).toFixed(4),
    nClusters: J, n,
    apa: `GLMM Logistic: OR(x) = ${beta.map((b, i) => `e${i === 0 ? 'b0' : 'b' + i}=${Math.exp(b).toFixed(3)}`).join(', ')}, τ² = ${tau2.toFixed(3)} (J = ${J})`,
  };
}

// ── GLMM Poisson (PQL) ───────────────────────────────────────────────────────
/** Poisson GLMM (random intercept). @param {Array<Record<string, any>>} data @param {string} yVar @param {string} clusterVar @param {string[]} [xVars=[]] @param {{maxIter?: number, tolerance?: number}} [options] */
export function glmmPoisson(data, yVar, clusterVar, xVars = [], { maxIter = 30, tolerance = 1e-5 } = {}) {
  const rows = data.filter(r => clusterVar != null && Number.isFinite(+r[yVar]) &&
    xVars.every(v => Number.isFinite(+r[v])));
  if (rows.length < 15) return null;
  const groups = groupBy(rows, clusterVar);
  const J = groups.size;
  if (J < 3) return null;

  const y = rows.map(r => +r[yVar]);
  if (y.some(v => v < 0 || !Number.isInteger(v))) return null;
  const hasX = xVars.length > 0;
  const n = rows.length, k = hasX ? xVars.length + 1 : 1;

  let beta = Array(k).fill(0);
  let u = Array(J).fill(0);
  let tau2 = 0.1;
  const groupIdx = [];
  const groupNames = [...groups.keys()];
  rows.forEach(r => { groupIdx.push(groupNames.indexOf(String(r[clusterVar]))); });

  function designRow(i) {
    const row = [1];
    if (hasX) for (const v of xVars) row.push(+rows[i][v]);
    return row;
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const mu = Array(n);
    const w = Array(n);
    const z = Array(n);
    for (let i = 0; i < n; i++) {
      const xi = designRow(i);
      let etaVal = u[groupIdx[i]];
      for (let j = 0; j < k; j++) etaVal += beta[j] * xi[j];
      mu[i] = Math.exp(etaVal);
      w[i] = Math.max(1e-6, mu[i]);
      z[i] = etaVal + (y[i] - mu[i]) / w[i];
    }

    const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, ij) => {
      let s = (i === ij ? 1e-6 : 0);
      for (let r = 0; r < n; r++) s += w[r] * designRow(r)[i] * designRow(r)[ij];
      return s;
    }));
    const b = Array.from({ length: k }, (_, i) => {
      let s = 0;
      for (let r = 0; r < n; r++) s += w[r] * designRow(r)[i] * (z[r] - u[groupIdx[r]]);
      return s;
    });
    const Ainv = matInv(A);
    if (!Ainv) break;
    for (let j = 0; j < k; j++) {
      beta[j] = Ainv[j].reduce((s, v, i) => s + v * b[i], 0);
    }
    for (let g = 0; g < J; g++) {
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        if (groupIdx[i] !== g) continue;
        let pred = 0;
        const xi = designRow(i);
        for (let ij = 0; ij < k; ij++) pred += beta[ij] * xi[ij];
        num += w[i] * (z[i] - pred);
        den += w[i] + 1e-6;
      }
      u[g] = num / (den + 1 / Math.max(tau2, 0.01));
    }
    tau2 = Math.max(0.001, sampleVar(u));
  }

  let pearsonChi = 0;
  for (let i = 0; i < n; i++) {
    let pred = 0;
    const xi = designRow(i);
    for (let j = 0; j < k; j++) pred += beta[j] * xi[j];
    const muVal = Math.exp(pred + u[groupIdx[i]]);
    pearsonChi += (y[i] - muVal) ** 2 / Math.max(muVal, 1e-6);
  }
  const phi = pearsonChi / (n - k - 1);

  return {
    test: 'GLMM Poisson',
    coefficients: beta.map((b, i) => ({
      name: i === 0 ? '(Intercept)' : xVars[i - 1],
      logIRR: +b.toFixed(4),
      IRR: +Math.exp(b).toFixed(4),
    })),
    tau2: +tau2.toFixed(5),
    phi: +phi.toFixed(4),
    nClusters: J, n,
    apa: `GLMM Poisson: IRR(x) = ${beta.map((b, i) => `e${i === 0 ? 'b0' : 'b' + i}=${Math.exp(b).toFixed(3)}`).join(', ')}, τ² = ${tau2.toFixed(3)}, φ = ${phi.toFixed(2)} (J = ${J})`,
  };
}

// ── Compare mixed models ──────────────────────────────────────────────────────
/** Likelihood-ratio comparison of two mixed models. @param {object} model1 @param {object} model2 */
export function compareMixedModels(model1, model2) {
  if (!model1 || !model2) return null;
  const ll1 = model1.logLik ?? model1.n * Math.log(model1.sigma2 || model1.tau2 || 1);
  const ll2 = model2.logLik ?? model2.n * Math.log(model2.sigma2 || model2.tau2 || 1);
  const k1 = model1.k ?? 2;
  const k2 = model2.k ?? 1;
  const n1 = model1.n;
  const n2 = model2.n;
  if (!n1 || !n2) return null;

  const lrt = -2 * (Math.min(ll1, ll2) - Math.max(ll1, ll2));
  const df = Math.abs(k2 - k1);
  const p = df > 0 ? chiPVal(lrt, df) : 1;
  const AIC1 = -2 * ll1 + 2 * k1;
  const AIC2 = -2 * ll2 + 2 * k2;
  const BIC1 = -2 * ll1 + k1 * Math.log(n1);
  const BIC2 = -2 * ll2 + k2 * Math.log(n2);

  return {
    test: 'Mixed Model Comparison',
    lrtStat: +lrt.toFixed(4),
    lrtDf: df,
    lrtP: p,
    AIC1: +AIC1.toFixed(2),
    AIC2: +AIC2.toFixed(2),
    BIC1: +BIC1.toFixed(2),
    BIC2: +BIC2.toFixed(2),
    deltaAIC: +(AIC2 - AIC1).toFixed(2),
    deltaBIC: +(BIC2 - BIC1).toFixed(2),
    verdict: p < 0.05 ? 'M2 significantly improves fit' : 'M2 does not significantly improve fit',
    apa: `LRT χ²(${df}) = ${lrt.toFixed(2)}, ${fmtP(p)}, ΔAIC = ${(AIC2 - AIC1).toFixed(1)}`,
  };
}

// ── Cross-level interaction ───────────────────────────────────────────────────
/** Cross-level interaction model. @param {Array<Record<string, any>>} data @param {string} yVar @param {string} clusterVar @param {string} xL1 level-1 predictor. @param {string} xL2 level-2 predictor. */
export function crossLevelInteraction(data, yVar, clusterVar, xL1, xL2) {
  const rows = data.filter(r => clusterVar != null && Number.isFinite(+r[yVar]) &&
    Number.isFinite(+r[xL1]) && Number.isFinite(+r[xL2]));
  const groups = groupBy(rows, clusterVar);
  const J = groups.size;
  if (J < 3 || rows.length < J + 5) return null;

  for (const [name, memb] of groups) {
    const l1mean = avg(memb.map(r => +r[xL1]));
    memb.forEach(r => { r[`_${xL1}_c`] = +r[xL1] - l1mean; });
  }
  const l2Vals = [...groups.entries()].map(([name, memb]) => avg(memb.map(r => +r[xL2])));

  const gj = [...groups.entries()].map(([name, memb], gIdx) => ({
    name,
    n: memb.length,
    meanY: avg(memb.map(r => +r[yVar])),
    meanL1c: avg(memb.map(r => r[`_${xL1}_c`])),
    l2val: l2Vals[gIdx],
    interaction: avg(memb.map(r => r[`_${xL1}_c`] * l2Vals[gIdx])),
  }));

  const ys = gj.map(g => g.meanY);
  const xs1 = gj.map(g => g.meanL1c);
  const xs2 = gj.map(g => g.l2val);
  const xsInt = gj.map(g => g.l2val);

  const mx1 = avg(xs1), my = avg(ys);
  let num = 0, den = 0;
  for (let i = 0; i < J; i++) { num += (xs1[i] - mx1) * (ys[i] - my); den += (xs1[i] - mx1) ** 2; }
  const b1 = den ? num / den : 0;
  const mx2 = avg(xs2);
  num = 0; den = 0;
  for (let i = 0; i < J; i++) { num += (xs2[i] - mx2) * (ys[i] - my); den += (xs2[i] - mx2) ** 2; }
  const b2 = den ? num / den : 0;

  const xs2sd = Math.sqrt(sampleVar(xs2));
  const loL2 = avg(xs2) - xs2sd;
  const hiL2 = avg(xs2) + xs2sd;

  let numInt = 0, denInt = 0;
  const mxInt = avg(xsInt);
  for (let i = 0; i < J; i++) { numInt += (xsInt[i] - mxInt) * (ys[i] - my); denInt += (xsInt[i] - mxInt) ** 2; }
  const bInt = denInt ? numInt / denInt : 0;
  const resid = ys.map((yv, i) => yv - (my + bInt * (xsInt[i] - mxInt)));
  const seInt = Math.sqrt(sampleVar(resid) / (denInt || 1));
  const tInt = bInt / (seInt || 1e-10);
  const pInt = tPVal(Math.abs(tInt), Math.max(1, J - 2));

  const simpleLo = b1 + bInt * loL2;
  const simpleHi = b1 + bInt * hiL2;

  return {
    test: 'Cross-Level Interaction',
    interactionB: +bInt.toFixed(4),
    interactionSE: +seInt.toFixed(4),
    interactionT: +tInt.toFixed(4),
    interactionP: pInt,
    simpleSlopes: {
      low: +simpleLo.toFixed(4),
      high: +simpleHi.toFixed(4),
    },
    apa: `Cross-level: β_int = ${bInt.toFixed(3)}, t(${J - 2}) = ${tInt.toFixed(2)}, ${fmtP(pInt)}, simple slopes at ±1SD: ${simpleLo.toFixed(3)} / ${simpleHi.toFixed(3)}`,
  };
}

// ── Three-Level HLM ────────────────────────────────────────────────────────
/** Three-level hierarchical model. @param {Array<Record<string, any>>} data @param {string} yVar @param {string} l1Var @param {string} l2Var @param {string} l3Var */
export function hlmThreeLevel(data, yVar, l1Var, l2Var, l3Var) {
  if (!data || data.length < 10 || !yVar || !l1Var || !l2Var || !l3Var) return null;
  const rows = data.filter(r => Number.isFinite(+r[yVar]) && r[l2Var] != null && r[l3Var] != null);
  if (rows.length < 10) return null;
  const n = rows.length;

  const gm = avg(rows.map(r => +r[yVar]));
  const l3Groups = [...new Set(rows.map(r => r[l3Var]))];
  if (l3Groups.length < 2) return null;

  const l3Means = l3Groups.map(g => {
    const memb = rows.filter(r => r[l3Var] === g);
    const m = avg(memb.map(r => +r[yVar]));
    return { name: g, n: memb.length, mean: m };
  });

  let ssL3 = 0, ssL2 = 0, ssL1 = 0;
  let dfL3 = l3Groups.length - 1;

  const l2Data = [];
  for (const g3 of l3Groups) {
    const l2GroupIds = [...new Set(rows.filter(r => r[l3Var] === g3).map(r => r[l2Var]))];
    for (const g2 of l2GroupIds) {
      const memb = rows.filter(r => r[l3Var] === g3 && r[l2Var] === g2);
      const m2 = avg(memb.map(r => +r[yVar]));
      l2Data.push({ l3: g3, l2: g2, n: memb.length, mean: m2, memb });
      const g3Mean = l3Means.find(m => m.name === g3)?.mean || 0;
      ssL2 += memb.length * (m2 - g3Mean) ** 2;
      memb.forEach(r => { ssL1 += (+r[yVar] - m2) ** 2; });
    }
  }
  const nL2 = l2Data.length;
  dfL3 = Math.max(1, l3Groups.length - 1);
  const dfL2 = Math.max(1, nL2 - l3Groups.length);
  const dfL1 = Math.max(1, n - nL2);

  const vL1 = ssL1 / dfL1;
  const vL2 = (ssL2 / dfL2 - vL1) / Math.max(1, n / nL2);
  const vL3 = (ssL3 / dfL3 - vL1 - vL2 * (n / nL2)) / Math.max(1, n / l3Groups.length);

  // Alternative: ANOVA decomposition
  const grandMean = gm;
  for (const g3 of l3Groups) {
    const memb3 = rows.filter(r => r[l3Var] === g3);
    const m3 = avg(memb3.map(r => +r[yVar]));
    ssL3 += memb3.length * (m3 - grandMean) ** 2;
  }
  const msL3 = ssL3 / dfL3;
  let ssL2New = 0;
  for (const ld of l2Data) {
    const g3Mean = avg(rows.filter(r => r[l3Var] === ld.l3).map(r => +r[yVar]));
    ssL2New += ld.n * (ld.mean - g3Mean) ** 2;
  }
  const msL2 = ssL2New / Math.max(1, dfL2);
  const msL1 = ssL1 / Math.max(1, dfL1);

  const sigmaL2 = Math.max(0, (msL2 - msL1) / (n / nL2 || 1));
  const sigmaL3 = Math.max(0, (msL3 - msL2) / (n / l3Groups.length || 1));
  const sigmaL1 = msL1;
  const totalVar = sigmaL1 + sigmaL2 + sigmaL3;
  const iccL2 = totalVar > 0 ? sigmaL2 / totalVar : 0;
  const iccL3 = totalVar > 0 ? sigmaL3 / totalVar : 0;

  return {
    test: 'Three-Level HLM',
    variances: { l1: +sigmaL1.toFixed(4), l2: +sigmaL2.toFixed(4), l3: +sigmaL3.toFixed(4) },
    icc: { l2: +iccL2.toFixed(4), l3: +iccL3.toFixed(4) },
    n: { obs: n, l2: nL2, l3: l3Groups.length },
    apa: `3-Level HLM: σ²_l1=${sigmaL1.toFixed(3)}, σ²_l2=${sigmaL2.toFixed(3)}, σ²_l3=${sigmaL3.toFixed(3)}, ICC_l3=${iccL3.toFixed(3)}`,
  };
}

// ── GEE Exchangeable ───────────────────────────────────────────────────────
/** GEE with exchangeable working correlation. @param {Array<Record<string, any>>} data @param {string} yVar @param {string} clusterVar @param {string[]} xVars @param {{maxIter?: number, tolerance?: number}} [options] */
export function geeExchangeable(data, yVar, clusterVar, xVars, { maxIter = 50, tolerance = 1e-6 } = {}) {
  if (!data || data.length < 10 || !yVar || !clusterVar || !xVars || !xVars.length) return null;
  const rows = data.filter(r => r[clusterVar] != null && Number.isFinite(+r[yVar]) && xVars.every(c => Number.isFinite(r[c])));
  if (rows.length < 10) return null;
  const groups = groupBy(rows, clusterVar);
  const J = groups.size;
  if (J < 3) return null;
  const n = rows.length;
  const k = xVars.length + 1;

  const X = rows.map(r => [1, ...xVars.map(c => +r[c])]);
  const y = rows.map(r => +r[yVar]);
  const Xt = X[0].map((_, j) => X.map(row => row[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, i) => s + X[i][j] * r1[i], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, i) => s + v * y[i], 0));
  let inv = matInv(XtX);
  if (!inv) return null;
  let beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  let alpha = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    // Compute residuals and working correlation
    const resid = y.map((yi, i) => yi - X[i].reduce((s, x, j) => s + x * beta[j], 0));
    let sumR = 0, sumP = 0, countP = 0;
    for (const [_, memb] of groups) {
      const idx = memb.map(m => rows.indexOf(m));
      for (let a = 0; a < idx.length; a++) {
        for (let b = a + 1; b < idx.length; b++) {
          sumR += resid[idx[a]] * resid[idx[b]];
          countP++;
        }
      }
    }
    alpha = countP > 0 ? sumR / (countP * (resid.reduce((s, e) => s + e * e, 0) / n)) : 0;
    alpha = Math.max(-0.9, Math.min(0.9, alpha));

    // Weighted GLS
    const XtWX = Array.from({ length: k }, () => Array(k).fill(0));
    const XtWy = Array(k).fill(0);
    for (const [_, memb] of groups) {
      const idx = memb.map(m => rows.indexOf(m));
      const ni = idx.length;
      if (ni < 2) {
        for (const j of idx) {
          for (let a = 0; a < k; a++) { XtWy[a] += X[j][a] * y[j]; for (let b = 0; b < k; b++) XtWX[a][b] += X[j][a] * X[j][b]; }
        }
        continue;
      }
      const Rinv = Array.from({ length: ni }, (_, a) => Array.from({ length: ni }, (_, b) => {
        if (a === b) return (1 + alpha * (ni - 2)) / ((1 - alpha) * (1 + alpha * (ni - 1)));
        return -alpha / ((1 - alpha) * (1 + alpha * (ni - 1)));
      }));
      for (let a = 0; a < ni; a++) {
        for (let b = 0; b < ni; b++) {
          for (let p = 0; p < k; p++) {
            XtWy[p] += X[idx[a]][p] * Rinv[a][b] * y[idx[b]];
            for (let q = 0; q < k; q++) XtWX[p][q] += X[idx[a]][p] * Rinv[a][b] * X[idx[b]][q];
          }
        }
      }
    }
    const invW = matInv(XtWX);
    if (!invW) break;
    const newBeta = invW.map(row => row.reduce((s, v, j) => s + v * XtWy[j], 0));
    let delta = 0;
    for (let j = 0; j < k; j++) delta += (newBeta[j] - beta[j]) ** 2;
    beta = newBeta;
    if (delta < tolerance) break;
  }

  // Sandwich SE
  const XtWX2 = Array.from({ length: k }, () => Array(k).fill(0));
  for (const [_, memb] of groups) {
    const idx = memb.map(m => rows.indexOf(m));
    const resG = idx.map(j => y[j] - X[j].reduce((s, x, a) => s + x * beta[a], 0));
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
      let s = 0;
      for (let p = 0; p < idx.length; p++) for (let q = 0; q < idx.length; q++) s += X[idx[p]][a] * resG[p] * resG[q] * X[idx[q]][b];
      XtWX2[a][b] += s;
    }
  }
  const XtWX3 = Array.from({ length: k }, () => Array(k).fill(0));
  for (const [_, memb] of groups) {
    const idx = memb.map(m => rows.indexOf(m));
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
      for (let j of idx) XtWX3[a][b] += X[j][a] * X[j][b];
    }
  }
  const inv3 = matInv(XtWX3);
  if (!inv3) return null;
  const varBeta = Array.from({ length: k }, () => Array(k).fill(0));
  for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) varBeta[a][b] += inv3[a][i] * XtWX2[i][j] * inv3[j][b];
  }

  const names = ['Intercept', ...xVars];
  const coeffs = names.map((name, j) => {
    const b = beta[j], se = Math.sqrt(Math.max(0, varBeta[j][j]));
    const z = se > 0 ? b / se : 0;
    return { name, b: +b.toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: 2 * (1 - Math.exp(-0.5 * z * z)) };
  });

  return {
    test: 'GEE (Exchangeable)', coefficients: coeffs, alpha: +alpha.toFixed(4), n, nClusters: J,
    apa: `GEE: ${coeffs.map(c => `${c.name} = ${c.b.toFixed(3)}`).join(', ')}, α = ${alpha.toFixed(3)}, n = ${n}, ${J} clusters`,
  };
}

// ── Growth Curve Model ─────────────────────────────────────────────────────
/** Linear growth-curve model. @param {Array<Record<string, any>>} data @param {string} timeVar @param {string} subjectVar @param {string} outcomeVar */
export function growthCurve(data, timeVar, subjectVar, outcomeVar) {
  if (!data || data.length < 10 || !timeVar || !subjectVar || !outcomeVar) return null;
  const rows = data.filter(r => Number.isFinite(+r[timeVar]) && r[subjectVar] != null && Number.isFinite(+r[outcomeVar]));
  const subs = [...new Set(rows.map(r => r[subjectVar]))];
  if (subs.length < 5) return null;

  const pis = subs.map(sub => {
    const d = rows.filter(r => r[subjectVar] === sub);
    if (d.length < 3) return null;
    const t = d.map(r => +r[timeVar]);
    const y = d.map(r => +r[outcomeVar]);
    const nT = t.length;
    let st = 0, sy = 0, stt = 0, sty = 0;
    for (let i = 0; i < nT; i++) { st += t[i]; sy += y[i]; stt += t[i] * t[i]; sty += t[i] * y[i]; }
    const denom = nT * stt - st * st;
    const slope = denom ? (nT * sty - st * sy) / denom : 0;
    const intercept = denom ? (stt * sy - st * sty) / denom : 0;
    return { intercept, slope, n: nT };
  }).filter(p => p !== null);

  if (pis.length < 5) return null;
  const gamma00 = avg(pis.map(p => p.intercept));
  const gamma10 = avg(pis.map(p => p.slope));
  const tau00 = pis.reduce((s, p) => s + (p.intercept - gamma00) ** 2, 0) / (pis.length - 1);
  const tau11 = pis.reduce((s, p) => s + (p.slope - gamma10) ** 2, 0) / (pis.length - 1);
  const tau01 = pis.reduce((s, p) => s + (p.intercept - gamma00) * (p.slope - gamma10), 0) / (pis.length - 1);

  return {
    test: 'Growth Curve Model',
    fixed: { intercept: +gamma00.toFixed(4), slope: +gamma10.toFixed(4) },
    random: { tau00: +tau00.toFixed(4), tau11: +tau11.toFixed(4), tau01: +tau01.toFixed(4) },
    n: subs.length,
    apa: `Growth curve: γ₀₀ = ${gamma00.toFixed(3)}, γ₁₀ = ${gamma10.toFixed(3)}, τ²₀₀ = ${tau00.toFixed(3)}, τ²₁₁ = ${tau11.toFixed(3)}`,
  };
}

// ── Random Coefficients ────────────────────────────────────────────────────
/** Random-coefficients model. @param {Array<Record<string, any>>} data @param {string} yVar @param {string} clusterVar @param {string[]} xVars @param {string[]} randomVars */
export function randomCoefficients(data, yVar, clusterVar, xVars, randomVars) {
  if (!data || data.length < 10 || !yVar || !clusterVar || !xVars || !xVars.length || !randomVars || !randomVars.length) return null;
  const rows = data.filter(r => r[clusterVar] != null && Number.isFinite(+r[yVar]) && xVars.every(c => Number.isFinite(r[c])));
  const groups = groupBy(rows, clusterVar);
  const J = groups.size;
  if (J < 3) return null;

  const groupBetas = [];
  for (const [_, memb] of groups) {
    if (memb.length < 2) continue;
    const Xg = memb.map(r => [1, ...xVars.map(c => +r[c])]);
    const yg = memb.map(r => +r[yVar]);
    const Xgt = Xg[0].map((_, j) => Xg.map(r => r[j]));
    const XgtXg = Xgt.map(r1 => Xg[0].map((_, j) => r1.reduce((s, _, k) => s + Xg[k][j] * r1[k], 0)));
    const Xgty = Xgt.map(r1 => r1.reduce((s, v, k) => s + v * yg[k], 0));
    const inv = matInv(XgtXg);
    if (!inv) continue;
    const beta = inv.map(row => row.reduce((s, v, j) => s + v * Xgty[j], 0));
    groupBetas.push({ beta, n: memb.length, memb });
  }
  if (groupBetas.length < 3) return null;
  const kJ = groupBetas.length;
  const nParams = xVars.length + 1;

  const fixed = [];
  for (let j = 0; j < nParams; j++) {
    const bAvg = avg(groupBetas.map(g => g.beta[j]));
    const se = Math.sqrt(groupBetas.reduce((s, g) => s + (g.beta[j] - bAvg) ** 2, 0) / (kJ - 1) / kJ);
    const name = j === 0 ? 'Intercept' : xVars[j - 1];
    const tVal = se > 0 ? bAvg / se : 0;
    fixed.push({ name, b: +bAvg.toFixed(5), se: +se.toFixed(5), t: +tVal.toFixed(4), p: tPVal(tVal, kJ - 1) });
  }

  const tau = Array.from({ length: nParams }, () => Array(nParams).fill(0));
  for (let a = 0; a < nParams; a++) {
    for (let b = 0; b < nParams; b++) {
      const ma = avg(groupBetas.map(g => g.beta[a]));
      const mb = avg(groupBetas.map(g => g.beta[b]));
      tau[a][b] = groupBetas.reduce((s, g) => s + (g.beta[a] - ma) * (g.beta[b] - mb), 0) / (kJ - 1);
    }
  }

  return {
    test: 'Random Coefficients',
    fixed,
    randomVariance: tau.map(r => r.map(v => +v.toFixed(6))),
    n: rows.length,
    nClusters: kJ,
    apa: `Random coefficients: ${fixed.map(c => `${c.name} = ${c.b.toFixed(3)}`).join(', ')}, ${kJ} clusters`,
  };
}

// ── Panel FE (Within Estimator) ───────────────────────────────────
/** Fixed-effects (within) panel regression. @param {Array<Record<string, any>>} data @param {string} yVar @param {string} idVar @param {string} timeVar @param {string[]} xVars */
export function fixedEffectsPanel(data, yVar, idVar, timeVar, xVars) {
  if (!data || data.length < 20 || !idVar || !timeVar || !xVars || !xVars.length) return null;
  const rows = data.filter(r => Number.isFinite(+r[yVar]) && r[idVar] != null && Number.isFinite(+r[timeVar]) && xVars.every(c => Number.isFinite(r[c])));
  const ids = [...new Set(rows.map(r => r[idVar]))];
  if (ids.length < 3) return null;
  const n = rows.length, p = xVars.length;
  // Within-transformation: demean by id
  const idMeans = {};
  ids.forEach(id => {
    const memb = rows.filter(r => r[idVar] === id);
    idMeans[id] = {
      y: avg(memb.map(r => +r[yVar])),
      x: xVars.map(v => avg(memb.map(r => +r[v]))),
    };
  });
  const yTilde = rows.map(r => +r[yVar] - idMeans[r[idVar]].y);
  const XTilde = rows.map(r => xVars.map((v, j) => +r[v] - idMeans[r[idVar]].x[j]));
  // OLS on within-transformed data
  const Xt = XTilde[0].map((_, j) => XTilde.map(row => row[j]));
  const XtX = Xt.map(r1 => XTilde[0].map((_, j) => r1.reduce((s, _, k) => s + XTilde[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * yTilde[k], 0));
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const resid = yTilde.map((yi, i) => yi - XTilde[i].reduce((s, x, j) => s + x * beta[j], 0));
  const sse = resid.reduce((s, e) => s + e * e, 0);
  const se = xVars.map((_, j) => Math.sqrt(Math.max(0, inv[j][j] * sse / (n - p - ids.length))));
  const coeffs = xVars.map((name, j) => {
    const t = se[j] > 0 ? beta[j] / se[j] : 0;
    return { name, b: +beta[j].toFixed(5), se: +se[j].toFixed(5), t: +t.toFixed(4), p: tPVal(t, n - p - ids.length) };
  });
  return {
    test: 'Panel FE', coefficients: coeffs, n, nUnits: ids.length, nPeriods: [...new Set(rows.map(r => r[timeVar]))].length,
    apa: `FE panel: ${coeffs.map(c => `${c.name} = ${c.b.toFixed(3)}`).join(', ')}, ${ids.length} units`,
  };
}

// ── Panel RE (GLS) ────────────────────────────────────────────────
/** Random-effects (GLS) panel regression. @param {Array<Record<string, any>>} data @param {string} yVar @param {string} idVar @param {string} timeVar @param {string[]} xVars */
export function randomEffectsPanel(data, yVar, idVar, timeVar, xVars) {
  if (!data || data.length < 20 || !idVar || !timeVar || !xVars || !xVars.length) return null;
  const rows = data.filter(r => Number.isFinite(+r[yVar]) && r[idVar] != null && Number.isFinite(+r[timeVar]) && xVars.every(c => Number.isFinite(r[c])));
  if (rows.length < 20) return null;
  const ids = [...new Set(rows.map(r => r[idVar]))];
  if (ids.length < 3) return null;
  const n = rows.length, p = xVars.length;
  // Pooled OLS first
  const X = rows.map(r => xVars.map(v => +r[v]));
  const y = rows.map(r => +r[yVar]);
  const Xt = X[0].map((_, j) => X.map(row => row[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  const inv0 = matInv(XtX);
  if (!inv0) return null;
  const beta0 = inv0.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const resid = y.map((yi, i) => yi - X[i].reduce((s, x, j) => s + x * beta0[j], 0));
  // Estimate variance components from pooled residuals
  let sigmaE2 = 0, sigmaU2 = 0, count = 0;
  ids.forEach(id => {
    const idx = rows.reduce((arr, r, i) => { if (r[idVar] === id) arr.push(i); return arr; }, []);
    const withinVar = idx.reduce((s, i) => s + resid[i] * resid[i], 0) / (idx.length - 1 || 1);
    sigmaE2 += withinVar * idx.length;
    count += idx.length;
  });
  sigmaE2 = Math.max(sigmaE2 / count, 0.001);
  const theta = 1 - Math.sqrt(sigmaE2 / (sigmaE2 + sigmaU2 + 1));
  // GLS transform
  const yGLS = [], XGLS = [];
  ids.forEach(id => {
    const idx = rows.reduce((arr, r, i) => { if (r[idVar] === id) arr.push(i); return arr; }, []);
    const yMean = avg(idx.map(i => y[i]));
    idx.forEach(i => { yGLS.push(y[i] - theta * yMean); XGLS.push(xVars.map((v, j) => X[i][j] - theta * avg(idx.map(k => X[k][j])))); });
  });
  const XtG = XGLS[0].map((_, j) => XGLS.map(row => row[j]));
  const XtXG = XtG.map(r1 => XGLS[0].map((_, j) => r1.reduce((s, _, k) => s + XGLS[k][j] * r1[k], 0)));
  const XtYG = XtG.map(r1 => r1.reduce((s, v, k) => s + v * yGLS[k], 0));
  const invG = matInv(XtXG);
  if (!invG) return null;
  const betaG = invG.map(row => row.reduce((s, v, j) => s + v * XtYG[j], 0));
  // FGLS covariance: s²·(XᵀΩ⁻¹X)⁻¹, with s² the variance of the GLS-transformed
  // residuals (the transform makes the working errors homoskedastic).
  const pG = betaG.length;
  let rss = 0;
  for (let i = 0; i < yGLS.length; i++) {
    const fit = XGLS[i].reduce((s, v, j) => s + v * betaG[j], 0);
    rss += (yGLS[i] - fit) ** 2;
  }
  const s2 = rss / Math.max(1, yGLS.length - pG);
  const coeffs = xVars.map((name, j) => {
    const se = Math.sqrt(Math.max(0, s2 * invG[j][j]));
    const z = se > 0 ? betaG[j] / se : 0;
    return { name, b: +betaG[j].toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });
  return {
    test: 'Panel RE', coefficients: coeffs, n, nUnits: ids.length,
    apa: `RE panel: ${coeffs.map(c => `${c.name} = ${c.b.toFixed(3)}`).join(', ')}, ${ids.length} units`,
  };
}

// ── Hausman Test ──────────────────────────────────────────────────
/** Hausman test comparing FE and RE panel estimates. @param {object} feResult @param {object} reResult */
export function hausmanTest(feResult, reResult) {
  if (!feResult || !reResult || !feResult.coefficients || !reResult.coefficients) return null;
  const feBeta = feResult.coefficients.map(c => c.b);
  const reBeta = reResult.coefficients.map(c => c.b);
  if (feBeta.length !== reBeta.length) return null;
  const diff = feBeta.map((b, j) => b - reBeta[j]);
  const k = diff.length;
  let chi2 = 0;
  for (let j = 0; j < k; j++) chi2 += diff[j] * diff[j] / Math.max(1e-6, (feResult.coefficients[j]?.se || 0.1) ** 2 - (reResult.coefficients[j]?.se || 0.1) ** 2);
  chi2 = Math.max(0, chi2);
  const p = chiPVal(chi2, k);
  return {
    test: 'Hausman Test', chi2: +chi2.toFixed(4), df: k, p,
    apa: `Hausman: χ²(${k}) = ${chi2.toFixed(2)}, ${p < 0.05 ? 'FE preferred' : 'RE consistent'}`,
  };
}

// ── Arellano-Bond ─────────────────────────────────────────────────
/** Arellano–Bond dynamic panel GMM (simplified). @param {Array<Record<string, any>>} data @param {string} yVar @param {string} idVar @param {string} timeVar @param {string[]} xVars @param {{maxLag?: number}} [options] */
export function arellanoBond(data, yVar, idVar, timeVar, xVars, { maxLag = 1 } = {}) {
  if (!data || data.length < 30 || !idVar || !timeVar || !xVars || !xVars.length) return null;
  const rows = data.filter(r => Number.isFinite(+r[yVar]) && r[idVar] != null && Number.isFinite(+r[timeVar]) && xVars.every(c => Number.isFinite(r[c])));
  const ids = [...new Set(rows.map(r => r[idVar]))];
  if (ids.length < 5) return null;
  const n = rows.length;
  // Difference GMM: Δy_it = α Δy_{i,t-1} + β Δx_it
  // Simplified: compute differences, OLS
  const diffs = [];
  const clusters = [];
  ids.forEach(id => {
    const unit = rows.filter(r => r[idVar] === id).sort((a, b) => +a[timeVar] - +b[timeVar]);
    const idx = [];
    for (let t = 1; t < unit.length; t++) {
      const dy = +unit[t][yVar] - +unit[t - 1][yVar];
      const dx = xVars.map(v => +unit[t][v] - +unit[t - 1][v]);
      idx.push(diffs.length);
      diffs.push({ dy, dx });
    }
    if (idx.length) clusters.push(idx);
  });
  if (diffs.length < 10) return null;
  const X = diffs.map(d => d.dx);
  const y = diffs.map(d => d.dy);
  const Xt = X[0].map((_, j) => X.map(row => row[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  // First-differenced errors are serially correlated within unit ⇒ cluster-robust SEs.
  const resid = y.map((yi, i) => yi - X[i].reduce((s, v, j) => s + v * beta[j], 0));
  const se = clusterRobustSE(X, resid, clusters, inv);
  const coeffs = xVars.map((name, j) => {
    const z = se[j] > 0 ? beta[j] / se[j] : 0;
    return { name, b: +beta[j].toFixed(5), se: +se[j].toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });
  return {
    test: 'Arellano-Bond', coefficients: coeffs, n: diffs.length, nUnits: ids.length,
    apa: `A-B: ${coeffs.map(c => `${c.name} = ${c.b.toFixed(3)}`).join(', ')}, ${ids.length} units`,
  };
}

// ── Random-Effects Negative Binomial ──────────────────────────────
/** Negative binomial GLMM. @param {Array<Record<string, any>>} data @param {string} yVar @param {string} clusterVar @param {string[]} xVars */
export function glmmNegBinom(data, yVar, clusterVar, xVars) {
  if (!data || data.length < 15 || !yVar || !clusterVar || !xVars || !xVars.length) return null;
  const rows = data.filter(r => r[clusterVar] != null && Number.isFinite(+r[yVar]) && xVars.every(c => Number.isFinite(r[c])));
  const groups = groupBy(rows, clusterVar);
  if (groups.size < 3) return null;
  const n = rows.length;
  const X = rows.map(r => [1, ...xVars.map(c => +r[c])]);
  const y = rows.map(r => +r[yVar]);
  const p = xVars.length + 1;
  if (y.some(v => v < 0)) return null;
  // Negative-binomial (NB2) GLM with log link: μ=exp(Xβ), dispersion θ.
  // Params: [β_0..β_{p-1}, logθ]. (Population-averaged; cluster dependence is
  // accommodated through cluster-robust standard errors below.)
  const negLogLik = par => {
    const beta = par.slice(0, p), theta = Math.exp(par[p]);
    let nll = 0;
    for (let i = 0; i < n; i++) {
      const eta = Math.min(30, X[i].reduce((s, v, j) => s + v * beta[j], 0));
      const mu = Math.exp(eta);
      const ll = lngamma(y[i] + theta) - lngamma(theta) - lngamma(y[i] + 1)
        + theta * (Math.log(theta) - Math.log(theta + mu))
        + y[i] * (Math.log(mu) - Math.log(theta + mu));
      nll -= ll;
    }
    return nll;
  };
  const b0 = Array(p).fill(0); b0[0] = Math.log(Math.max(avg(y), 0.5));
  const fit = mleFit([...b0, Math.log(1)], negLogLik, { maxIter: 80 });
  const beta = fit.theta.slice(0, p), theta = Math.exp(fit.theta[p]);
  // Cluster-robust SEs via the NB score, clustered by group.
  const clusters = [...groups.values()].map(memb => memb.map(m => rows.indexOf(m)));
  const score = i => {
    const eta = Math.min(30, X[i].reduce((s, v, j) => s + v * beta[j], 0));
    const mu = Math.exp(eta);
    const w = (y[i] - mu) / (1 + mu / theta); // dℓ/dη for NB2
    return X[i].map(xv => w * xv);
  };
  let infoOk = fit.cov != null;
  let seVec;
  if (infoOk) {
    const bread = fit.cov.slice(0, p).map(r => r.slice(0, p));
    const meat = Array.from({ length: p }, () => Array(p).fill(0));
    for (const idx of clusters) {
      const sg = Array(p).fill(0);
      for (const i of idx) { const sc = score(i); for (let j = 0; j < p; j++) sg[j] += sc[j]; }
      for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) meat[a][b] += sg[a] * sg[b];
    }
    const bm = bread.map(row => meat[0].map((_, b) => row.reduce((s, v, k) => s + v * meat[k][b], 0)));
    const cov = bm.map(row => bread[0].map((_, b) => row.reduce((s, v, k) => s + v * bread[b][k], 0)));
    seVec = cov.map((r, i) => Math.sqrt(Math.max(0, r[i])));
  } else {
    seVec = fit.se.slice(0, p);
  }
  const coeffs = xVars.map((name, j) => {
    const b = beta[1 + j], se = seVec[1 + j], z = se > 0 ? b / se : 0;
    return { name, b: +b.toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });
  return { test: 'GLMM NegBin', coefficients: coeffs, theta: +theta.toFixed(4), n, nClusters: groups.size, apa: `GLMM NB: θ = ${theta.toFixed(2)}, ${groups.size} clusters` };
}

// ── GEE AR(1) ─────────────────────────────────────────────────────
/** GEE with AR(1) working correlation. @param {Array<Record<string, any>>} data @param {string} yVar @param {string} clusterVar @param {string[]} xVars */
export function geeAR1(data, yVar, clusterVar, xVars) {
  if (!data || data.length < 15 || !yVar || !clusterVar || !xVars || !xVars.length) return null;
  const rows = data.filter(r => r[clusterVar] != null && Number.isFinite(+r[yVar]) && xVars.every(c => Number.isFinite(r[c])));
  const groups = groupBy(rows, clusterVar);
  if (groups.size < 3) return null;
  const n = rows.length;
  const X = rows.map(r => [1, ...xVars.map(c => +r[c])]);
  const y = rows.map(r => +r[yVar]);
  const Xt = X[0].map((_, j) => X.map(r => r[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  let alpha = 0;
  let count = 0;
  for (const [_, memb] of groups) {
    const idx = memb.map(m => rows.indexOf(m)).sort((a, b) => a - b);
    for (let a = 0; a < idx.length - 1; a++) {
      const r1 = y[idx[a]] - X[idx[a]].reduce((s, v, j) => s + v * beta[j], 0);
      const r2 = y[idx[a + 1]] - X[idx[a + 1]].reduce((s, v, j) => s + v * beta[j], 0);
      alpha += r1 * r2;
      count++;
    }
  }
  alpha = count > 0 ? alpha / count : 0;
  alpha = Math.max(-0.9, Math.min(0.9, alpha));
  // GEE robust (sandwich) SEs clustered by group.
  const resid = y.map((yi, i) => yi - X[i].reduce((s, v, j) => s + v * beta[j], 0));
  const clusters = [...groups.values()].map(memb => memb.map(m => rows.indexOf(m)));
  const se = clusterRobustSE(X, resid, clusters, inv);
  const coeffs = xVars.map((name, j) => {
    const b = beta[1 + j], s = se[1 + j], z = s > 0 ? b / s : 0;
    return { name, b: +b.toFixed(5), se: +s.toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });
  return { test: 'GEE AR(1)', coefficients: coeffs, alpha: +alpha.toFixed(4), n, nClusters: groups.size, apa: `GEE AR(1): ${alpha.toFixed(3)}, ${groups.size} clusters` };
}

// ── REML Estimation ───────────────────────────────────────────────
/** REML variance-component estimation. @param {number[][]} X design rows. @param {number[]} y @param {Array<string|number>} clusterVar cluster ids. */
export function remlEstimate(X, y, clusterVar) {
  if (!X || !y || X.length < 5 || y.length < 5 || X.length !== y.length) return null;
  const n = X.length, p = X[0]?.length || 1;
  const Xt = X[0].map((_, j) => X.map(r => r[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  let beta;
  const inv = matInv(XtX);
  if (inv) { beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0)); }
  else { beta = X[0].map(() => 0); }
  const resid = y.map((yi, i) => yi - X[i].reduce((s, x, j) => s + x * beta[j], 0));
  const rss = resid.reduce((s, r) => s + r * r, 0);
  let sigma2R, sigma2u = 0, icc = 0;
  if (clusterVar && clusterVar.length === n) {
    // Random-intercept variance components from the residual ANOVA decomposition
    // (Henderson / moments; equals REML for balanced clusters).
    const clusters = [...new Set(clusterVar)];
    const k = clusters.length;
    const rbar = avg(resid);
    const byC = {}; clusters.forEach(c => { byC[c] = []; });
    clusterVar.forEach((c, i) => byC[c].push(resid[i]));
    let ssB = 0, ssW = 0, sumNc2 = 0;
    for (const c of clusters) {
      const arr = byC[c], nc = arr.length, mc = avg(arr);
      ssB += nc * (mc - rbar) ** 2; sumNc2 += nc * nc;
      for (const r of arr) ssW += (r - mc) ** 2;
    }
    const msW = ssW / Math.max(1, n - k), msB = ssB / Math.max(1, k - 1);
    const m0 = (n - sumNc2 / n) / Math.max(1, k - 1); // average cluster size (unbalanced-corrected)
    sigma2R = msW;
    sigma2u = Math.max(0, (msB - msW) / Math.max(m0, 1e-9));
    icc = sigma2u / Math.max(sigma2u + sigma2R, 1e-12);
  } else {
    sigma2R = rss / Math.max(n - p, 1); // REML residual variance for a fixed-effects model
  }
  const logLik = -0.5 * n * (Math.log(2 * Math.PI) + Math.log(Math.max(sigma2R, 1e-10))) - 0.5 * rss / Math.max(sigma2R, 1e-10);
  const aic = -2 * logLik + 2 * (p + 1);
  return { test: 'REML Estimation', sigma2: +sigma2R.toFixed(6), sigma2u: +sigma2u.toFixed(6), icc: +icc.toFixed(4), logLik: +logLik.toFixed(4), aic: +aic.toFixed(4), n, p, apa: `REML: σ²_e=${sigma2R.toFixed(4)}, σ²_u=${sigma2u.toFixed(4)}, ICC=${icc.toFixed(3)}` };
}

// ── Repeated Measures ANOVA (within-subjects, single factor) ──────
// One within-subjects factor with k levels measured on n subjects. Partitions
// SS_total = SS_subjects + SS_condition + SS_error and tests the condition
// effect F = MS_condition / MS_error on (k−1, (n−1)(k−1)) df. Reports the
// Greenhouse–Geisser sphericity correction (ε) and the corrected p-value.
/** Repeated-measures MANOVA. @param {Array<Record<string, any>>} data @param {string[]} responses @param {string|null} [within=null] @param {string|null} [between=null] */
export function repeatedMeasuresMANOVA(data, responses, within = null, between = null) {
  if (!data || data.length < 10 || !responses || responses.length < 2) return null;
  const n = data.length;
  const Y = data.map(r => responses.map(v => +r[v]));
  const k = responses.length;
  const colMean = Y[0].map((_, j) => avg(Y.map(r => r[j])));   // per-condition means
  const rowMean = Y.map(r => avg(r));                           // per-subject means
  const grand = avg(colMean);
  let totalSS = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) totalSS += (Y[i][j] - grand) ** 2;
  let ssSubjects = 0; for (let i = 0; i < n; i++) ssSubjects += k * (rowMean[i] - grand) ** 2;
  let ssCondition = 0; for (let j = 0; j < k; j++) ssCondition += n * (colMean[j] - grand) ** 2;
  const ssError = Math.max(totalSS - ssSubjects - ssCondition, 1e-12);
  const dfCond = k - 1, dfErr = (n - 1) * (k - 1);
  const msCond = ssCondition / dfCond, msErr = ssError / dfErr;
  const F = msCond / msErr;
  const p = fPVal(F, dfCond, dfErr);
  // Greenhouse–Geisser epsilon from the k×k covariance matrix of the conditions.
  const S = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => {
    let s = 0; for (let i = 0; i < n; i++) s += (Y[i][a] - colMean[a]) * (Y[i][b] - colMean[b]);
    return s / (n - 1);
  }));
  const sBar = S.flat().reduce((s, v) => s + v, 0) / (k * k);
  const dBar = avg(S.map((r, i) => r[i]));
  const rowMeans = S.map(r => avg(r));
  const sumSq = S.flat().reduce((s, v) => s + v * v, 0);
  const sumRowSq = rowMeans.reduce((s, v) => s + v * v, 0);
  const ggDenom = (k - 1) * (sumSq - 2 * k * sumRowSq + k * k * sBar * sBar);
  let epsilon = ggDenom > 1e-12 ? (k * k * (dBar - sBar) ** 2) / ggDenom : 1;
  epsilon = Math.min(1, Math.max(1 / (k - 1), epsilon));
  const pGG = fPVal(F, dfCond * epsilon, dfErr * epsilon);
  return {
    test: 'Repeated Measures ANOVA', totalSS: +totalSS.toFixed(4),
    betweenSS: +ssCondition.toFixed(4), withinSS: +(ssSubjects + ssError).toFixed(4),
    ssSubjects: +ssSubjects.toFixed(4), ssCondition: +ssCondition.toFixed(4), ssError: +ssError.toFixed(4),
    dfCondition: dfCond, dfError: dfErr, F: +F.toFixed(4), p: +p.toFixed(4),
    ggEpsilon: +epsilon.toFixed(4), pGG: +pGG.toFixed(4), k, n,
    apa: `RM ANOVA: F(${dfCond}, ${dfErr}) = ${F.toFixed(2)}, ${fmtP(p)}; GG ε = ${epsilon.toFixed(2)}, ${fmtP(pGG)}`,
  };
}

// ── Transition Model ──────────────────────────────────────────────
/** Markov transition (lagged-response) model. @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {{idVar?: string, lag?: number}} [options] */
export function transitionModel(data, yVar, xVars, { idVar, lag = 1 } = {}) {
  if (!data || data.length < 15 || !yVar || !xVars || !idVar) return null;
  const ids = [...new Set(data.map(r => r[idVar]))];
  if (ids.length < 3) return null;
  const yAll = data.map(r => +r[yVar]);
  // Multiple regression y_it = α + φ·y_{i,t−1} + Σ β_k x_k over rows with a
  // valid within-subject lag (the old code summed yLag and all x into ONE
  // predictor sharing a single coefficient, with a fake se=1/√n).
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][idVar] !== data[i - 1][idVar]) continue;
    rows.push({ y: yAll[i], z: [1, yAll[i - 1], ...xVars.map(v => +data[i][v])] });
  }
  const m = rows.length, kz = 2 + xVars.length;
  if (m < kz + 1) return null;
  const Z = rows.map(r => r.z), yv = rows.map(r => r.y);
  const ZtZ = Array.from({ length: kz }, (_, a) => Array.from({ length: kz }, (_, b) => Z.reduce((s, r) => s + r[a] * r[b], 0)));
  const ZtY = Array.from({ length: kz }, (_, a) => Z.reduce((s, r, i) => s + r[a] * yv[i], 0));
  const inv = matInv(ZtZ);
  const beta = inv ? inv.map(row => row.reduce((s, v, j) => s + v * ZtY[j], 0)) : Array(kz).fill(0);
  let rss = 0; for (let i = 0; i < m; i++) { const f = Z[i].reduce((s, v, j) => s + v * beta[j], 0); rss += (yv[i] - f) ** 2; }
  const sigma2 = rss / Math.max(1, m - kz);
  const se = j => (inv ? Math.sqrt(Math.max(0, sigma2 * inv[j][j])) : 0);
  const coeffs = xVars.map((name, j) => ({ name, b: +beta[2 + j].toFixed(5), se: +se(2 + j).toFixed(5) }));
  return {
    test: 'Transition Model', coefficients: coeffs, intercept: +beta[0].toFixed(5),
    lagCoefficient: +beta[1].toFixed(5), lagSe: +se(1).toFixed(5), nSubjects: ids.length, n: m,
    apa: `Transition: ${ids.length} subjects, φ = ${beta[1].toFixed(3)}`,
  };
}
