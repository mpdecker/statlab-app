import { avg, sampleSD, sampleVar } from '../math/core.js';
import { normalCDF, ibeta } from '../math/distributions.js';
import { matInv } from '../math/matrix.js';

// Control chart constants A2, D3, D4, B3, B4 for n=2..25
const A2 = [0,0,1.880,1.023,0.729,0.577,0.483,0.419,0.373,0.337,0.308,0.285,0.266,0.249,0.235,0.223,0.212,0.203,0.194,0.187,0.180,0.173,0.167,0.162,0.157];
const D3 = [0,0,0,0,0,0,0,0.076,0.136,0.184,0.223,0.256,0.283,0.307,0.328,0.347,0.363,0.378,0.391,0.403,0.415,0.425,0.434,0.443,0.451];
const D4 = [0,0,3.267,2.574,2.282,2.114,2.004,1.924,1.864,1.816,1.777,1.744,1.717,1.693,1.672,1.653,1.637,1.622,1.608,1.597,1.585,1.575,1.566,1.557,1.548];
const B3 = [0,0,0,0,0,0,0.030,0.118,0.185,0.239,0.284,0.321,0.354,0.382,0.406,0.428,0.448,0.466,0.482,0.497,0.510,0.523,0.534,0.545,0.555];
const B4 = [0,0,3.267,2.568,2.266,2.089,1.970,1.882,1.815,1.761,1.716,1.679,1.646,1.618,1.594,1.572,1.552,1.534,1.518,1.503,1.490,1.477,1.466,1.455,1.445];

// ── X-bar Chart ─────────────────────────────────────────────────────────────
/** @param {number} [subgroupSize] @param {number[]} data */
export function xbarChart(data, subgroupSize = 5) {
  if (!data || data.length < 2 * subgroupSize) return null;
  const n = data.length;
  const nsg = Math.floor(n / subgroupSize);
  const a2 = subgroupSize <= 25 ? A2[subgroupSize] : 3 / Math.sqrt(subgroupSize);
  const means = [];
  const ranges = [];
  for (let i = 0; i < nsg; i++) {
    const sg = data.slice(i * subgroupSize, (i + 1) * subgroupSize);
    const m = avg(sg);
    const r = Math.max(...sg) - Math.min(...sg);
    means.push(+m.toFixed(4));
    ranges.push(r);
  }
  const cl = avg(means);
  const rBar = avg(ranges);
  const ucl = cl + a2 * rBar;
  const lcl = cl - a2 * rBar;
  const points = means.map((m, i) => ({ subgroup: i + 1, mean: m, signal: m > ucl || m < lcl }));
  return {
    test: 'X-bar Chart',
    centerline: +cl.toFixed(4), ucl: +ucl.toFixed(4), lcl: +lcl.toFixed(4),
    points, nSubgroups: nsg, subgroupSize,
    apa: `X-bar: CL = ${cl.toFixed(3)}, UCL = ${ucl.toFixed(3)}, LCL = ${lcl.toFixed(3)}, ${nsg} subgroups of ${subgroupSize}`,
  };
}

// ── R Chart ─────────────────────────────────────────────────────────────────
/** @param {number} [subgroupSize] @param {number[]} data */
export function rChart(data, subgroupSize = 5) {
  if (!data || data.length < 2 * subgroupSize) return null;
  const n = data.length;
  const nsg = Math.floor(n / subgroupSize);
  const d3 = subgroupSize <= 25 ? D3[subgroupSize] : 0;
  const d4 = subgroupSize <= 25 ? D4[subgroupSize] : 2;
  const ranges = [];
  for (let i = 0; i < nsg; i++) {
    const sg = data.slice(i * subgroupSize, (i + 1) * subgroupSize);
    ranges.push(Math.max(...sg) - Math.min(...sg));
  }
  const cl = avg(ranges);
  const ucl = d4 * cl;
  const lcl = d3 * cl;
  const points = ranges.map((r, i) => ({ subgroup: i + 1, range: +r.toFixed(4), signal: r > ucl || r < lcl }));
  return {
    test: 'R Chart',
    centerline: +cl.toFixed(4), ucl: +ucl.toFixed(4), lcl: +lcl.toFixed(4),
    points, nSubgroups: nsg,
    apa: `R chart: CL = ${cl.toFixed(3)}, UCL = ${ucl.toFixed(3)}, LCL = ${lcl.toFixed(3)}, ${nsg} subgroups`,
  };
}

// ── S Chart ─────────────────────────────────────────────────────────────────
/** @param {number} [subgroupSize] @param {number[]} data */
export function sChart(data, subgroupSize = 5) {
  if (!data || data.length < 2 * subgroupSize) return null;
  const n = data.length;
  const nsg = Math.floor(n / subgroupSize);
  const b3 = subgroupSize <= 25 ? B3[subgroupSize] : 1 - sampleSD(Array(subgroupSize).fill(0).map((_,i)=>i));
  const b4 = subgroupSize <= 25 ? B4[subgroupSize] : 1.5;
  const sds = [];
  for (let i = 0; i < nsg; i++) {
    const sg = data.slice(i * subgroupSize, (i + 1) * subgroupSize);
    sds.push(sampleSD(sg));
  }
  const cl = avg(sds);
  const ucl = b4 * cl;
  const lcl = b3 * cl;
  const points = sds.map((s, i) => ({ subgroup: i + 1, sd: +s.toFixed(4), signal: s > ucl || s < lcl }));
  return {
    test: 'S Chart',
    centerline: +cl.toFixed(4), ucl: +ucl.toFixed(4), lcl: +lcl.toFixed(4),
    points, nSubgroups: nsg,
    apa: `S chart: CL = ${cl.toFixed(3)}, UCL = ${ucl.toFixed(3)}, LCL = ${lcl.toFixed(3)}`,
  };
}

// ── p Chart ─────────────────────────────────────────────────────────────────
/** @param {number[]} defectives @param {number[]} sampleSizes */
export function pChart(defectives, sampleSizes) {
  if (!defectives || !sampleSizes || defectives.length !== sampleSizes.length || defectives.length < 5) return null;
  if (defectives.some((d, i) => d > sampleSizes[i])) return null;
  const k = defectives.length;
  const totalN = sampleSizes.reduce((s, v) => s + v, 0);
  const totalD = defectives.reduce((s, v) => s + v, 0);
  const pBar = totalD / Math.max(totalN, 1);
  const points = defectives.map((d, i) => {
    const p = d / Math.max(sampleSizes[i], 1);
    const se = Math.sqrt(pBar * (1 - pBar) / sampleSizes[i]);
    const ucl = Math.min(1, pBar + 3 * se);
    const lcl = Math.max(0, pBar - 3 * se);
    return { sample: i + 1, p: +p.toFixed(4), ucl: +ucl.toFixed(4), lcl: +lcl.toFixed(4), signal: p > ucl || p < lcl };
  });
  return {
    test: 'p Chart',
    pbar: +pBar.toFixed(4),
    points, nSamples: k,
    apa: `p chart: p̄ = ${pBar.toFixed(4)}, ${k} samples, total N = ${totalN}`,
  };
}

// ── c Chart ─────────────────────────────────────────────────────────────────
/** @param {number[]} defects */
export function cChart(defects) {
  if (!defects || defects.length < 5) return null;
  const n = defects.length;
  const cBar = avg(defects);
  const sqrtC = Math.sqrt(Math.max(cBar, 1));
  const ucl = cBar + 3 * sqrtC;
  const lcl = Math.max(0, cBar - 3 * sqrtC);
  const points = defects.map((c, i) => ({ unit: i + 1, c, signal: c > ucl || c < lcl }));
  return {
    test: 'c Chart',
    cbar: +cBar.toFixed(4), ucl: +ucl.toFixed(4), lcl: +lcl.toFixed(4),
    points, n,
    apa: `c chart: c̄ = ${cBar.toFixed(2)}, UCL = ${ucl.toFixed(2)}, LCL = ${lcl.toFixed(2)}`,
  };
}

// ── CUSUM Chart ─────────────────────────────────────────────────────────────
/** @param {number[]} data */
export function cusumChart(data, { target = null, k = 0.5, h = 5 } = {}) {
  if (!data || data.length < 10) return null;
  const n = data.length;
  const mu = target != null ? target : avg(data);
  const sigma = sampleSD(data) || 1;
  const z = data.map(v => (v - mu) / sigma);
  const cplus = Array(n).fill(0);
  const cminus = Array(n).fill(0);
  const signals = [];
  for (let i = 0; i < n; i++) {
    cplus[i] = Math.max(0, (i > 0 ? cplus[i - 1] : 0) + z[i] - k);
    cminus[i] = Math.max(0, (i > 0 ? cminus[i - 1] : 0) - z[i] - k);
    if (cplus[i] > h) signals.push({ index: i, direction: 'upper' });
    if (cminus[i] > h) signals.push({ index: i, direction: 'lower' });
  }
  return {
    test: 'CUSUM Chart',
    target: +mu.toFixed(4), k, h,
    cplus: cplus.map(v => +v.toFixed(4)),
    cminus: cminus.map(v => +v.toFixed(4)),
    signals, n,
    apa: `CUSUM: target = ${mu.toFixed(3)}, k = ${k}, h = ${h}, ${signals.length} signals`,
  };
}

// ── EWMA Chart ──────────────────────────────────────────────────────────────
/** @param {number[]} data */
export function ewmaChart(data, { lambda = 0.2, L = 3 } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const mu = avg(data);
  const sigma = sampleSD(data) || 1;
  const ewma = Array(n).fill(mu);
  const ucl = Array(n).fill(0);
  const lcl = Array(n).fill(0);
  const signals = [];
  const factor = sigma * Math.sqrt(lambda / (2 - lambda));
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? ewma[i - 1] : mu;
    ewma[i] = lambda * data[i] + (1 - lambda) * prev;
    const adj = Math.sqrt(1 - Math.pow(1 - lambda, 2 * (i + 1)));
    const limit = L * sigma * Math.sqrt(lambda / (2 - lambda)) * adj;
    ucl[i] = mu + limit;
    lcl[i] = mu - limit;
    if (ewma[i] > ucl[i] || ewma[i] < lcl[i]) signals.push({ index: i });
  }
  return {
    test: 'EWMA Chart',
    lambda, L,
    ewma: ewma.map(v => +v.toFixed(4)),
    ucl: ucl.map(v => +v.toFixed(4)),
    lcl: lcl.map(v => +v.toFixed(4)),
    signals, n,
    apa: `EWMA: λ = ${lambda}, L = ${L}, ${signals.length} signals`,
  };
}

// ── Process Capability ─────────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {number|null} [lsl] @param {number|null} [usl] */
export function processCapability(data, lsl = null, usl = null) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const mu = avg(data);
  const sigma = sampleSD(data);
  if (!sigma) return null;
  let cp = null, cpk = null, pp = null, ppk = null;
  if (lsl != null && usl != null) {
    cp = (usl - lsl) / (6 * sigma);
    cpk = Math.min((usl - mu) / (3 * sigma), (mu - lsl) / (3 * sigma));
  } else if (usl != null) {
    cpk = (usl - mu) / (3 * sigma);
  } else if (lsl != null) {
    cpk = (mu - lsl) / (3 * sigma);
  }
  return {
    test: 'Process Capability',
    cp: cp != null ? +cp.toFixed(4) : null,
    cpk: cpk != null ? +cpk.toFixed(4) : null,
    sigma: +sigma.toFixed(4), mean: +mu.toFixed(4),
    lsl, usl, n,
    apa: `Capability: ${cp != null ? `Cp = ${cp.toFixed(2)}` : ''} ${cpk != null ? `Cpk = ${cpk.toFixed(2)}` : ''}, σ = ${sigma.toFixed(3)}, n = ${n}`,
  };
}

// Hotelling T2 Chart
/** @param {Array<Record<string, any>>} data @param {string[]} vars */
export function hotellingT2Chart(data, vars, { subgroupSize = 5 } = {}) {
  if (!data || data.length < 20 || !vars || vars.length < 2) return null;
  const n = data.length, p = vars.length;
  const nsg = Math.floor(n / subgroupSize);
  if (nsg < 5) return null;
  const X = data.map(r => vars.map(v => +r[v]));
  const grandMean = vars.map((_, j) => avg(X.map(r => r[j])));
  const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += (X[k][i] - grandMean[i]) * (X[k][j] - grandMean[j]);
    return s / (n - 1);
  }));
  const invS = matInv(S);
  if (!invS) return null;
  const T2 = []; const subs = [];
  for (let s = 0; s < nsg; s++) {
    const sg = X.slice(s * subgroupSize, (s + 1) * subgroupSize);
    const sgMean = vars.map((_, j) => avg(sg.map(r => r[j])));
    const diff = sgMean.map((v, j) => v - grandMean[j]);
    let t2 = 0;
    for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) t2 += diff[a] * invS[a][b] * diff[b];
    T2.push(+t2.toFixed(4));
    subs.push({ subgroup: s + 1, T2: +t2.toFixed(4) });
  }
  const ucl = p * (nsg + 1) * (nsg - 1) / (nsg * nsg - nsg * p) * 3;
  return { test: "Hotelling T2 Chart", T2, ucl: +ucl.toFixed(4), nSubgroups: nsg, p, subgroups: subs, apa: `Hotelling T2: ${nsg} subgroups, p=${p}` };
}

// ── MEWMA Chart ───────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string[]} vars */
export function mewmaChart(data, vars, { lambda = 0.2, subgroupSize = 5 } = {}) {
  if (!data || data.length < 20 || !vars || vars.length < 2) return null;
  const n = data.length, p = vars.length;
  const nsg = Math.floor(n / subgroupSize);
  if (nsg < 5) return null;
  const X = data.map(r => vars.map(v => +r[v]));
  const grandMean = vars.map((_, j) => avg(X.map(r => r[j])));
  const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += (X[k][i] - grandMean[i]) * (X[k][j] - grandMean[j]);
    return s / (n - 1);
  }));
  const invS = matInv(S);
  if (!invS) return null;
  let z = Array(p).fill(0);
  const T2 = [];
  for (let s = 0; s < nsg; s++) {
    const sg = X.slice(s * subgroupSize, (s + 1) * subgroupSize);
    const sgMean = vars.map((_, j) => avg(sg.map(r => r[j])));
    const diff = sgMean.map((v, j) => v - grandMean[j]);
    z = z.map((v, j) => lambda * diff[j] + (1 - lambda) * v);
    let t2 = 0;
    for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) t2 += z[a] * invS[a][b] * z[b];
    T2.push(+t2.toFixed(4));
  }
  return { test: 'MEWMA Chart', T2, lambda, nSubgroups: nsg, p, apa: `MEWMA: lambda=${lambda}, ${nsg} subgroups, p=${p}` };
}

// ── OC Curve ──────────────────────────────────────────────────────
/** @param {number} n @param {number} p @param {number} c */
export function ocCurve(n, c, p) {
  if (!n || !Number.isFinite(c) || !p || !p.length) return null;
  if (!Array.isArray(p)) p = [p];
  const Pa = p.map(pi => {
    let prob = 0, cum = 0;
    for (let k = 0; k <= c; k++) {
      prob += binomialProb(n, k, pi);
    }
    return { p: +pi.toFixed(4), Pa: +prob.toFixed(4) };
  });
  return { test: 'OC Curve', curve: Pa, n, c, apa: `OC: n=${n}, c=${c}, ${Pa.length} points` };
}

function binomialProb(n, k, p) {
  if (k < 0 || k > n) return 0;
  let logP = 0;
  for (let i = 1; i <= k; i++) logP += Math.log(n - i + 1) - Math.log(i);
  logP += k * Math.log(p) + (n - k) * Math.log(1 - p);
  return Math.exp(logP);
}

// ── AOQ Curve ─────────────────────────────────────────────────────
/** @param {number} n @param {number} p @param {number} c @param {number} N */
export function aoqCurve(n, c, p, N) {
  if (!n || !Number.isFinite(c) || !N || !p || !p.length) return null;
  if (!Array.isArray(p)) p = [p];
  const aoq = p.map(pi => {
    const pa = ocCurve(n, c, [pi])?.curve?.[0]?.Pa || 0;
    return { p: +pi.toFixed(4), aoq: +(pa * pi * (N - n) / N).toFixed(6) };
  });
  return { test: 'AOQ Curve', aoq, n, c, N, apa: `AOQ: n=${n}, c=${c}, N=${N}` };
}

// ── Rectifying Inspection ─────────────────────────────────────────
/** @param {number} n @param {number} p @param {number} c @param {number} N */
export function rectifyingInspection(n, c, p, N) {
  if (!n || !Number.isFinite(c) || !N || !Number.isFinite(p)) return null;
  const pa = ocCurve(n, c, [p])?.curve?.[0]?.Pa || 0;
  const ati = n + (1 - pa) * (N - n);
  const aoq2 = pa * p * (N - n) / N;
  return { test: 'Rectifying Inspection', ati: +ati.toFixed(2), aoql: +aoq2.toFixed(6), pa: +pa.toFixed(4), n, c, N, apa: `ATI = ${ati.toFixed(0)}, AOQL = ${aoq2.toFixed(5)}` };
}

// ── Reliability Acceptance Sampling ───────────────────────────────
/** @param {number} r @param {number} t */
export function reliabilitySampling(t, r, { alpha = 0.05, beta = 0.1 } = {}) {
  if (!t || !r || t < 1 || r < 0) return null;
  const n2 = Math.ceil(Math.log(beta) / Math.log(1 - r) / t);
  const n = Math.ceil(Math.log(alpha) / Math.log(1 - r) / t);
  return { test: 'Reliability Sampling', n: Math.max(n, 5), t, r, alpha, beta, apa: `Reliability: test ${Math.max(n, 5)} units for ${t} hrs with r = ${r}` };
}

// ── ASN Curve ─────────────────────────────────────────────────────
/** @param {number} n @param {number} p @param {number} c */
export function asnCurve(n, c, p) {
  if (!n || !Number.isFinite(c) || !p || !p.length) return null;
  if (!Array.isArray(p)) p = [p];
  const asn = p.map(pi => ({ p: +pi.toFixed(4), asn: n }));
  return { test: 'ASN Curve', asn, n, c, apa: `ASN: n=${n}, c=${c}` };
}

// ── Multivariate Control Chart (Hotelling T2) ─────────────────────
/** @param {Array<Record<string, any>>} data @param {string[]} vars */
export function multivariateControl(data, vars, { subgroupSize = 5, alpha = 0.0027 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 2) return null;
  const n = data.length, p = vars.length;
  const subgroups = [];
  for (let i = 0; i < n; i += subgroupSize) {
    const sg = data.slice(i, Math.min(i + subgroupSize, n));
    if (sg.length < 2) break;
    subgroups.push(sg);
  }
  const grandMean = vars.map(v => avg(data.map(r => +r[v])));
  const T2 = subgroups.map(sg => {
    const sgMean = vars.map(v => avg(sg.map(r => +r[v])));
    const diff = sgMean.map((m, j) => m - grandMean[j]);
    let t2 = 0;
    for (let j = 0; j < p; j++) {
      const d = diff[j];
      const v = sampleVar(data.map(r => +r[vars[j]])) || 1;
      t2 += d * d / (v / sg.length);
    }
    return +t2.toFixed(4);
  });
  const m = subgroups.length;
  const UCL = p * (m - 1) * fCritUpper(alpha, p, m - p) / (m - p);
  const signals = T2.map((t, i) => ({ subgroup: i + 1, T2: t, signal: t > UCL }));
  return { test: 'Multivariate Control (T2)', signals, UCL: +UCL.toFixed(4), nSubgroups: m, p, alpha, apa: `T2: UCL=${UCL.toFixed(2)}, ${signals.filter(s => s.signal).length} signals` };
}

// ── Cpk/Ppk ───────────────────────────────────────────────────────
/** @param {number[]} data @param {number} lsl @param {number} usl */
export function cpkPpk(data, lsl, usl) {
  if (!data || data.length < 5 || lsl == null || usl == null || lsl >= usl) return null;
  const n = data.length;
  const mu = avg(data);
  const sigma = Math.sqrt(sampleVar(data));
  if (sigma < 1e-10) return null;
  const cp = (usl - lsl) / (6 * sigma);
  const cpk = Math.min((usl - mu) / (3 * sigma), (mu - lsl) / (3 * sigma));
  const pp = cp;
  const ppk = Math.min((usl - mu) / (3 * sigma), (mu - lsl) / (3 * sigma));
  const ppm = sigma > 0 ? (usl - lsl) / (6 * Math.sqrt(sampleVar(data) + (mu - avg(data)) * (mu - avg(data)))) : 0;
  return { test: 'Cpk/Ppk', cp: +cp.toFixed(4), cpk: +cpk.toFixed(4), pp: +pp.toFixed(4), ppk: +ppk.toFixed(4), mu: +mu.toFixed(4), sigma: +sigma.toFixed(4), n, lsl, usl, apa: `Cpk = ${cpk.toFixed(2)} (Cp = ${cp.toFixed(2)}, n=${n})` };
}

// Helper: F critical value approximation
function fCritUpper(p, df1, df2) {
  if (p <= 0 || p >= 1) return 2;
  const pf = p; df1 = Math.max(1, df1); df2 = Math.max(1, df2);
  let f = 2;
  for (let iter = 0; iter < 20; iter++) {
    const x = df1 * f / (df1 * f + df2);
    const ib = 1 - ibeta(df1 / 2, df2 / 2, x);
    if (Math.abs(ib - pf) < 0.001) break;
    f += (pf - ib) * 0.5;
    f = Math.max(0.1, f);
  }
  return f;
}
