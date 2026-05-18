import { avg, sampleVar, sampleSD, fmtP } from '../math/core.js';
import { tPVal, tInv2 } from '../math/distributions.js';
import { matTrans, matMul, matInv } from '../math/matrix.js';

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
