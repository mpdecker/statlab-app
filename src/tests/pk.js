import { avg } from '../math/core.js';
import { normalINV } from '../math/distributions.js';

// ── AUC Trapezoidal ────────────────────────────────────────────────────────
export function aucTrapezoidal(time, concentration) {
  if (!time || !concentration || time.length < 3 || time.length !== concentration.length) return null;
  const n = time.length;
  for (let i = 1; i < n; i++) if (time[i] <= time[i - 1]) return null;
  let auc = 0;
  const segments = [];
  for (let i = 1; i < n; i++) {
    const dt = time[i] - time[i - 1];
    const seg = dt * (concentration[i] + concentration[i - 1]) / 2;
    auc += seg;
    segments.push({ from: time[i - 1], to: time[i], auc: +seg.toFixed(4) });
  }
  return {
    test: 'AUC (Trapezoidal)',
    auc: +auc.toFixed(4),
    segments,
    n,
    apa: `AUC = ${auc.toFixed(2)}, n = ${n} obs`,
  };
}

// ── AUC Linear-Log ─────────────────────────────────────────────────────────
export function aucLinearLog(time, concentration) {
  if (!time || !concentration || time.length < 3 || time.length !== concentration.length) return null;
  const n = time.length;
  for (let i = 1; i < n; i++) if (time[i] <= time[i - 1]) return null;
  let auc = 0;
  for (let i = 1; i < n; i++) {
    const dt = time[i] - time[i - 1];
    const c1 = concentration[i - 1], c2 = concentration[i];
    if (c2 >= c1) {
      auc += dt * (c1 + c2) / 2; // rising: linear
    } else {
      if (c1 <= 0 || c2 <= 0 && i < n - 1) { auc += dt * (c1 + c2) / 2; }
      else if (c2 > 0) auc += dt * (c1 - c2) / Math.log(Math.max(c1 / c2, 1.001));
      else auc += dt * (c1 + Math.max(c2, 0)) / 2;
    }
  }
  return {
    test: 'AUC (Linear-Log)',
    auc: +auc.toFixed(4),
    n,
    apa: `AUC (lin-log) = ${auc.toFixed(2)}, n = ${n}`,
  };
}

// ── PK Parameters ──────────────────────────────────────────────────────────
export function pkParameters(time, concentration, { dose = null } = {}) {
  if (!time || !concentration || time.length < 4 || time.length !== concentration.length) return null;
  const n = time.length;
  for (let i = 1; i < n; i++) if (time[i] <= time[i - 1]) return null;
  let cmax = concentration[0], tmax = time[0];
  for (let i = 1; i < n; i++) { if (concentration[i] > cmax) { cmax = concentration[i]; tmax = time[i]; } }
  const auc = aucTrapezoidal(time, concentration)?.auc || 0;

  // Terminal half-life from last 3+ points
  const nTerm = Math.min(n, 3 + Math.floor(n / 3));
  const termTime = time.slice(-nTerm);
  const termConc = concentration.slice(-nTerm);
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  const logC = termConc.map(v => Math.log(Math.max(v, 1e-10)));
  for (let i = 0; i < nTerm; i++) { sx += termTime[i]; sy += logC[i]; sxx += termTime[i] ** 2; sxy += termTime[i] * logC[i]; }
  const denom = nTerm * sxx - sx * sx;
  const slope = denom ? (nTerm * sxy - sx * sy) / denom : 0;
  const k = -slope;
  const halfLife = k > 0 ? Math.log(2) / k : null;
  let clearance = null, vd = null;
  if (dose != null && auc > 0) {
    clearance = dose / auc;
    if (k > 0) vd = dose / (k * auc);
  }

  return {
    test: 'PK Parameters',
    cmax: +cmax.toFixed(4), tmax: +tmax.toFixed(4), auc: +auc.toFixed(4),
    halfLife: halfLife != null ? +halfLife.toFixed(4) : null,
    clearance: clearance != null ? +clearance.toFixed(4) : null,
    vd: vd != null ? +vd.toFixed(4) : null,
    n,
    apa: `Cmax = ${cmax.toFixed(2)}, Tmax = ${tmax.toFixed(2)}, AUC = ${auc.toFixed(2)}, t½ = ${halfLife?.toFixed(2) || 'N/A'}`,
  };
}

// ── Terminal Half-Life ─────────────────────────────────────────────────────
export function terminalHalfLife(time, concentration, { nPoints = 3 } = {}) {
  if (!time || !concentration || time.length < 4 || time.length !== concentration.length) return null;
  const n = time.length;
  const np = Math.min(nPoints, n - 1, Math.floor(n / 2));
  if (np < 2) return null;
  const termTime = time.slice(-np);
  const termConc = concentration.slice(-np);
  const logC = termConc.map(v => Math.log(Math.max(v, 1e-10)));
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < np; i++) { sx += termTime[i]; sy += logC[i]; sxx += termTime[i] ** 2; sxy += termTime[i] * logC[i]; }
  const denom = np * sxx - sx * sx;
  if (!denom) return null;
  const slope = (np * sxy - sx * sy) / denom;
  const k = Math.max(0, -slope);
  const halfLife = k > 0 ? Math.log(2) / k : null;
  const intc = (sxx * sy - sx * sxy) / denom;
  const fitted = termTime.map(t => Math.exp(intc + slope * t));
  let ssRes = 0, ssTot = 0;
  const my = avg(termConc);
  for (let i = 0; i < np; i++) { ssRes += (termConc[i] - fitted[i]) ** 2; ssTot += (termConc[i] - my) ** 2; }
  const rSq = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    test: 'Terminal Half-Life',
    halfLife: halfLife != null ? +halfLife.toFixed(4) : null,
    k: +k.toFixed(6),
    rSquared: +rSq.toFixed(4),
    nPoints: np,
    n,
    apa: `t½ = ${halfLife?.toFixed(2) || 'N/A'}, k = ${k.toFixed(4)}, R² = ${rSq.toFixed(3)}`,
  };
}

// ── Clearance ──────────────────────────────────────────────────────────────
export function clearance(dose, auc) {
  if (!(dose > 0) || !(auc > 0)) return null;
  const cl = dose / auc;
  return {
    test: 'Clearance',
    clearance: +cl.toFixed(4),
    dose,
    auc,
    apa: `CL = ${cl.toFixed(2)} (dose = ${dose}, AUC = ${auc.toFixed(2)})`,
  };
}

// ── One-Compartment IV ─────────────────────────────────────────────────────
export function oneCompartmentIV(time, concentration, { dose = null } = {}) {
  if (!time || !concentration || time.length < 4 || time.length !== concentration.length) return null;
  const n = time.length;
  const logC = concentration.map(v => Math.log(Math.max(v, 1e-10)));
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += time[i]; sy += logC[i]; sxx += time[i] ** 2; sxy += time[i] * logC[i]; }
  const denom = n * sxx - sx * sx;
  if (!denom) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intc = (sxx * sy - sx * sxy) / denom;
  const k = Math.max(0, -slope);
  const c0 = Math.exp(intc);
  const halfLife = k > 0 ? Math.log(2) / k : null;
  const fitted = time.map(t => c0 * Math.exp(-k * t));
  let ssRes = 0, ssTot = 0;
  const my = avg(concentration);
  for (let i = 0; i < n; i++) { ssRes += (concentration[i] - fitted[i]) ** 2; ssTot += (concentration[i] - my) ** 2; }
  const rSq = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    test: 'One-Compartment IV',
    c0: +c0.toFixed(4),
    k: +k.toFixed(6),
    halfLife: halfLife != null ? +halfLife.toFixed(4) : null,
    rSquared: +rSq.toFixed(4),
    n,
    apa: `1-CMT: C0 = ${c0.toFixed(2)}, k = ${k.toFixed(4)}, t½ = ${halfLife?.toFixed(2) || 'N/A'}, R² = ${rSq.toFixed(3)}`,
  };
}

// ── Bioequivalence ─────────────────────────────────────────────────────────
export function bioequivalence(testAUC, refAUC, { alpha = 0.05 } = {}) {
  if (!testAUC || !refAUC || testAUC.length < 3 || refAUC.length < 3) return null;
  const nT = testAUC.length, nR = refAUC.length;
  const logTest = testAUC.map(v => Math.log(v));
  const logRef = refAUC.map(v => Math.log(v));
  const mT = avg(logTest), mR = avg(logRef);
  const diff = mT - mR;
  const varT = logTest.reduce((s, v) => s + (v - mT) ** 2, 0) / (nT - 1);
  const varR = logRef.reduce((s, v) => s + (v - mR) ** 2, 0) / (nR - 1);
  const se = Math.sqrt(varT / nT + varR / nR);
  if (!se) return null;
  const ratio = Math.exp(diff);
  // 90% CI: z = 1.645 for one-sided 5% → two-sided 90%
  const z = normalINV(1 - 0.05);
  const ci = [Math.exp(diff - z * se), Math.exp(diff + z * se)];
  const bioequivalent = ci[0] >= 0.80 && ci[1] <= 1.25;

  return {
    test: 'Bioequivalence',
    ratio: +ratio.toFixed(4),
    ci: [+ci[0].toFixed(4), +ci[1].toFixed(4)],
    bioequivalent,
    nTest: nT,
    nRef: nR,
    alpha,
    apa: `Bioequivalence: T/R = ${ratio.toFixed(3)}, 90% CI [${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]${bioequivalent ? ' — BIOEQUIVALENT' : ''}`,
  };
}

// Emax Model
export function emaxModel(dose, response) {
  if (!dose || !response || dose.length < 5 || dose.length !== response.length) return null;
  const n = dose.length;
  const E0 = Math.min(...response);
  const Emax = Math.max(...response) - E0;
  let EC50 = dose.reduce((s, v) => s + v, 0) / n;
  for (let iter = 0; iter < 30; iter++) {
    const pred = dose.map(d => E0 + Emax * d / (EC50 + d));
    const grad = dose.reduce((s, d, i) => s + (response[i] - pred[i]) * Emax * d / ((EC50 + d) ** 2), 0);
    EC50 = Math.max(0.01, EC50 + 0.1 * grad / n);
    if (Math.abs(grad) < 1e-4) break;
  }
  const fitted = dose.map(d => + (E0 + Emax * d / (EC50 + d)).toFixed(4));
  let sse = 0, sst = 0;
  const my = response.reduce((s, v) => s + v, 0) / n;
  for (let i = 0; i < n; i++) { sse += (response[i] - fitted[i]) ** 2; sst += (response[i] - my) ** 2; }
  const rsq = sst > 0 ? 1 - sse / sst : 0;
  return { test: 'Emax Model', parameters: { E0: +E0.toFixed(4), Emax: +Emax.toFixed(4), EC50: +EC50.toFixed(4) }, fitted, rSquared: +rsq.toFixed(4), n, apa: `Emax: EC50 = ${EC50.toFixed(2)}, R² = ${rsq.toFixed(3)}` };
}

// Sigmoid Emax
export function sigmoidEmax(dose, response) {
  if (!dose || !response || dose.length < 6 || dose.length !== response.length) return null;
  const n = dose.length;
  const E0 = Math.min(...response);
  const Emax = Math.max(...response) - E0;
  let EC50 = dose.reduce((s, v) => s + v, 0) / n;
  let hill = 1.5;
  for (let iter = 0; iter < 40; iter++) {
    const fitted = dose.map(d => E0 + Emax / (1 + Math.pow(EC50 / d, hill)));
    let g50 = 0, gHill = 0;
    for (let i = 0; i < n; i++) {
      const err = response[i] - fitted[i];
      const denom = 1 + Math.pow(EC50 / dose[i], hill);
      g50 += err * Emax * hill / EC50 * Math.pow(EC50 / dose[i], hill) / (denom ** 2);
      gHill += err * Emax * Math.log(Math.max(EC50 / dose[i], 0.001)) * Math.pow(EC50 / dose[i], hill) / (denom ** 2);
    }
    EC50 = Math.max(0.01, EC50 + 0.05 * g50 / n);
    hill = Math.max(0.1, Math.min(5, hill + 0.01 * gHill / n));
    if (Math.abs(g50) + Math.abs(gHill) < 1e-4) break;
  }
  const fitted = dose.map(d => +(E0 + Emax / (1 + Math.pow(EC50 / d, hill))).toFixed(4));
  let sse = 0, sst = 0;
  const my = response.reduce((s, v) => s + v, 0) / n;
  for (let i = 0; i < n; i++) { sse += (response[i] - fitted[i]) ** 2; sst += (response[i] - my) ** 2; }
  const rsq = sst > 0 ? 1 - sse / sst : 0;
  return { test: 'Sigmoid Emax', parameters: { E0, Emax, EC50: +EC50.toFixed(4), hill: +hill.toFixed(4) }, rSquared: +rsq.toFixed(4), n, apa: `Sigmoid Emax: EC50 = ${EC50.toFixed(2)}, hill = ${hill.toFixed(2)}` };
}

// Indirect Response
export function indirectResponse(time, concentration, response) {
  if (!time || !concentration || !response || time.length < 5) return null;
  const n = Math.min(time.length, concentration.length, response.length);
  return { test: 'Indirect Response', n, apa: `Indirect response model: n = ${n}` };
}

// PKPD Link
export function pkpdLink(conc, effect) {
  if (!conc || !effect || conc.length < 5 || conc.length !== effect.length) return null;
  const n = conc.length;
  const emax = emaxModel(conc, effect);
  return { test: 'PKPD Link', emax: emax?.parameters, n, apa: `PKPD link: n = ${n}` };
}

// Superposition
export function superposition(doses, times, ke, Vd, { tau = 24 } = {}) {
  if (!doses || !times || !doses.length || doses.length !== times.length) return null;
  const n = doses.length;
  let C = 0;
  for (let i = 0; i < n; i++) {
    const tElapsed = tau - times[i];
    if (tElapsed > 0) C += doses[i] / Vd * Math.exp(-ke * tElapsed);
  }
  return { test: 'Superposition', concentration: +C.toFixed(4), ke, Vd, tau, nDoses: n, apa: `Superposition: Ctrough = ${C.toFixed(3)}` };
}

// AUC Ratio
export function aucRatio(testAUC, refAUC) {
  if (!testAUC || !refAUC || testAUC.length < 3 || refAUC.length < 3) return null;
  const nT = testAUC.length, nR = refAUC.length;
  const logTest = testAUC.map(v => Math.log(v));
  const logRef = refAUC.map(v => Math.log(v));
  const mT = logTest.reduce((s, v) => s + v, 0) / nT;
  const mR = logRef.reduce((s, v) => s + v, 0) / nR;
  const diff = mT - mR;
  const vT = logTest.reduce((s, v) => s + (v - mT) ** 2, 0) / (nT - 1);
  const vR = logRef.reduce((s, v) => s + (v - mR) ** 2, 0) / (nR - 1);
  const se = Math.sqrt(vT / nT + vR / nR);
  const ratio = Math.exp(diff);
  const ci = [Math.exp(diff - 1.96 * se), Math.exp(diff + 1.96 * se)];
  return { test: 'AUC Ratio', ratio: +ratio.toFixed(4), ci: [+ci[0].toFixed(4), +ci[1].toFixed(4)], nT, nR, apa: `AUC ratio = ${ratio.toFixed(3)}, 95% CI [${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]` };
}

// Turnover Model (Indirect Response)
export function turnoverModel(time, conc, response, { kin = 1, kout = 0.3 } = {}) {
  if (!time || !conc || !response || time.length < 5) return null;
  const n = Math.min(time.length, conc.length, response.length);
  const Rss = kin / kout;
  const turnover = response.map((r, i) => {
    const inhibition = 1 - conc[i] / 100;
    return +(Rss * inhibition + (r - Rss * inhibition) * Math.exp(-kout * time[i])).toFixed(4);
  });
  return { test: 'Turnover Model', turnover: turnover.slice(0, 10), kin, kout, Rss: +Rss.toFixed(4), n, apa: `Turnover: Rss = ${Rss.toFixed(2)}, n = ${n}` };
}

// Transit Compartment
export function transitCompartment(dose, time, { nCompartments = 3, k = 0.5 } = {}) {
  if (!dose || !time || !time.length || nCompartments < 1) return null;
  const n = time.length;
  const compartments = Array.from({ length: nCompartments }, () => Array(n).fill(0));
  compartments[0][0] = dose;
  for (let t = 1; t < n; t++) {
    for (let c = 0; c < nCompartments; c++) {
      const input = c === 0 ? 0 : k * compartments[c - 1][t - 1];
      compartments[c][t] = compartments[c][t - 1] + input - k * compartments[c][t - 1];
    }
  }
  const output = compartments[nCompartments - 1].map(v => +v.toFixed(4));
  return { test: 'Transit Compartment', output: output.slice(0, 10), nCompartments, k, n, apa: `Transit: ${nCompartments} comp, k = ${k}` };
}
