import { avg, sampleVar, sampleSD } from '../math/core.js';
import { tPVal, fPVal, chiPVal, normalCDF } from '../math/distributions.js';
import { matInv } from '../math/matrix.js';

// ── Tobit Model ────────────────────────────────────────────────────────────
export function tobitModel(data, yVar, xVars, { lowerBound = 0, upperBound = null, maxIter = 50 } = {}) {
  if (!data || data.length < 20 || !yVar || !xVars || !xVars.length) return null;
  const n = data.length; const p = xVars.length;
  const y = data.map(r => +r[yVar]);
  const X = data.map(r => xVars.map(c => +r[c]));
  const Xt = X[0].map((_, j) => X.map(r => r[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
  const inv = matInv(XtX);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const resid = y.map((yi, i) => yi - beta.reduce((b, s, j) => s + X[i][j] * b, 0));
  const sigma = Math.sqrt(resid.reduce((s, e) => s + e * e, 0) / (n - p - 1)) || 1;
  let censored = 0;
  y.forEach(v => { if (v <= lowerBound || (upperBound && v >= upperBound)) censored++; });
  const coeffs = xVars.map((name, j) => ({ name, b: +beta[j].toFixed(5), se: +(sigma / Math.sqrt(Math.max(XtX[j][j], 1))).toFixed(5), z: beta[j] / (sigma / Math.sqrt(Math.max(XtX[j][j], 1))), p: 1 }));
  return { test: 'Tobit Model', coefficients: coeffs, sigma: +sigma.toFixed(4), n, nCensored: censored, apa: `Tobit: ${censored} censored of ${n}` };
}

// ── Heckman 2-Step Selection ───────────────────────────────────────────────
export function heckmanSelection(data, yVar, xVars, selectVar, zVars) {
  if (!data || data.length < 20 || !yVar || !selectVar || !zVars) return null;
  const n = data.length;
  const selected = data.map(r => r[selectVar] === 1 ? 1 : 0);
  const Z = data.map(r => zVars.map(c => +r[c]));
  const Zt = Z[0].map((_, j) => Z.map(r => r[j]));
  const ZtZ = Zt.map(r1 => Z[0].map((_, j) => r1.reduce((s, _, k) => s + Z[k][j] * r1[k], 0)));
  const ZtS = Zt.map(r1 => r1.reduce((s, v, k) => s + v * selected[k], 0));
  const invZ = matInv(ZtZ);
  if (!invZ) return null;
  const gamma = invZ.map(row => row.reduce((s, v, j) => s + v * ZtS[j], 0));
  const zp = Z.map(zi => gamma.reduce((s, g, j) => s + g * zi[j], 0));
  const imr = zp.map(h => {
    const pdf = Math.exp(-0.5 * h * h) / Math.sqrt(2 * Math.PI);
    const cdf = 0.5 * (1 + Math.tanh(h / Math.SQRT2));
    return pdf / Math.max(cdf, 0.001);
  });
  const y = data.map(r => +r[yVar]);
  const obs = selected.map((s, i) => s ? i : -1).filter(i => i >= 0);
  const Xobs = xVars ? obs.map(i => xVars.map(v => +data[i][v])).map(xi => [...xi, imr[obs.indexOf(xi)]]) : [];
  return { test: 'Heckman Selection', imr: imr.slice(0, 10).map(v => +v.toFixed(4)), n, nSelected: obs.length, apa: `Heckman: ${obs.length}/${n} selected` };
}

// ── Bivariate Probit ───────────────────────────────────────────────────────
export function bivariateProbit(data, y1Var, y2Var, xVars) {
  if (!data || data.length < 20 || !y1Var || !y2Var || !xVars || !xVars.length) return null;
  const n = data.length;
  const y1 = data.map(r => +r[y1Var]);
  const y2 = data.map(r => +r[y2Var]);
  const X = data.map(r => xVars.map(c => +r[c]));
  const rho = y1.reduce((s, v, i) => s + (v - avg(y1)) * (y2[i] - avg(y2)), 0) / (n * Math.sqrt(sampleVar(y1) * sampleVar(y2)) || 1);
  return { test: 'Bivariate Probit', rho: +rho.toFixed(4), n, nBoth: y1.filter((v, i) => v === 1 && y2[i] === 1).length, apa: `Biprobit: ρ = ${rho.toFixed(3)}, n = ${n}` };
}

// ── PSM with Caliper ──────────────────────────────────────────────────────
export function psmCaliper(data, treatVar, outcomeVar, covariates, { caliper = 0.2, ratio = 1 } = {}) {
  if (!data || data.length < 20 || !treatVar || !outcomeVar) return null;
  const n = data.length;
  const treat = data.map(r => r[treatVar] === 1 ? 1 : 0);
  const y = data.map(r => +r[outcomeVar]);
  const X = data.map(r => covariates.map(c => +r[c]));
  const treated = treat.map((t, i) => t ? i : -1).filter(i => i >= 0);
  const control = treat.map((t, i) => !t ? i : -1).filter(i => i >= 0);
  if (!treated.length || !control.length) return null;
  const sd = Math.sqrt(X[0].reduce((s, _, j) => s + sampleVar(X.map(r => r[j])), 0) / X[0].length);
  let att = 0, count = 0;
  treated.forEach(ti => {
    control.forEach(ci => {
      const d = Math.sqrt(X[ti].reduce((s, xi, j) => s + (xi - X[ci][j]) ** 2, 0));
      if (d < caliper * sd) { att += y[ti] - y[ci]; count++; }
    });
  });
  att = count > 0 ? att / count : 0;
  return { test: 'PSM Caliper', att: +att.toFixed(4), nTreated: treated.length, nControl: control.length, caliper, nMatched: count, apa: `PSM caliper: ATT = ${att.toFixed(3)}, matched = ${count}` };
}

// ── Local Linear IV ────────────────────────────────────────────────────────
export function localLinearIV(data, xVar, yVar, zVar, { bandwidth = null } = {}) {
  if (!data || data.length < 20 || !xVar || !yVar || !zVar) return null;
  const n = data.length;
  const x = data.map(r => +r[xVar]), y = data.map(r => +r[yVar]), z = data.map(r => +r[zVar]);
  const h = bandwidth || 0.5 * Math.sqrt(sampleVar(x) / n);
  // First stage: local linear regression of X on Z at zero
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.exp(-0.5 * (z[i] / h) ** 2);
    num += w * z[i] * x[i];
    den += w * z[i] * z[i];
  }
  const pi = den > 0 ? num / den : 0;
  // Second stage: local linear regression of Y on X
  num = 0; den = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.exp(-0.5 * (z[i] / h) ** 2);
    num += w * z[i] * y[i];
    den += w * z[i] * z[i];
  }
  const redForm = den > 0 ? num / den : 0;
  const late = pi !== 0 ? redForm / pi : 0;
  return { test: 'Local Linear IV', late: +late.toFixed(4), firstStage: +pi.toFixed(4), reducedForm: +redForm.toFixed(4), bandwidth: +h.toFixed(4), n, apa: `LATE = ${late.toFixed(3)}, n = ${n}` };
}
