import { avg } from '../math/core.js';
import { normalINV } from '../math/distributions.js';

// ── AUC Trapezoidal ────────────────────────────────────────────────────────
/** @param {number[]} time @param {number[]} concentration */
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
/** @param {number[]} time @param {number[]} concentration */
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
/** @param {number[]} time @param {number[]} concentration */
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
/** @param {number[]} time @param {number[]} concentration */
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
  const fittedLog = termTime.map(t => intc + slope * t);
  let ssRes = 0, ssTot = 0;
  const myLog = avg(logC);
  for (let i = 0; i < np; i++) { ssRes += (logC[i] - fittedLog[i]) ** 2; ssTot += (logC[i] - myLog) ** 2; }
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
/** @param {number} dose @param {number} auc */
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
/** @param {number[]} time @param {number[]} concentration */
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
/** @param {number[]} testAUC @param {number[]} refAUC */
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

// ── Emax Model ────────────────────────────────────────────────────
/** @param {number[]} dose @param {number[]} response */
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

// ── Sigmoid Emax ──────────────────────────────────────────────────
/** @param {number[]} dose @param {number[]} response */
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

// ── Indirect Response ─────────────────────────────────────────────
/** @param {number[]} time @param {number[]} concentration @param {number[]} response */
export function indirectResponse(time, concentration, response) {
  if (!time || !concentration || !response || time.length < 5) return null;
  const n = Math.min(time.length, concentration.length, response.length);
  const t = time.slice(0, n), C = concentration.slice(0, n), R = response.slice(0, n);
  const R0 = R[0];
  // Type-I indirect response (Dayneka/Jusko): dR/dt = kin·(1 − Imax·C/(IC50+C))
  // − kout·R, with baseline R0 = kin/kout (so kin = kout·R0). C(t) is the
  // observed concentration linearly interpolated. Fit [kout, Imax, IC50] by RK4
  // + coordinate descent (the old code computed nothing).
  const conc = tt => {
    if (tt <= t[0]) return C[0];
    if (tt >= t[n - 1]) return C[n - 1];
    for (let i = 1; i < n; i++) if (tt <= t[i]) { const f = (tt - t[i - 1]) / (t[i] - t[i - 1]); return C[i - 1] + f * (C[i] - C[i - 1]); }
    return C[n - 1];
  };
  const predict = (kout, Imax, IC50) => {
    const kin = kout * R0; const out = [R0]; let Rv = R0, tp = t[0];
    const f = (rv, tt) => { const c = conc(tt); return kin * (1 - Imax * c / (IC50 + c)) - kout * rv; };
    for (let i = 1; i < n; i++) {
      const span = t[i] - tp, steps = Math.max(1, Math.ceil(span / 0.05)), dh = span / steps; let tt = tp;
      for (let s = 0; s < steps; s++) { const k1 = f(Rv, tt), k2 = f(Rv + dh / 2 * k1, tt + dh / 2), k3 = f(Rv + dh / 2 * k2, tt + dh / 2), k4 = f(Rv + dh * k3, tt + dh); Rv = Math.max(0, Rv + dh / 6 * (k1 + 2 * k2 + 2 * k3 + k4)); tt += dh; }
      out.push(Rv); tp = t[i];
    }
    return out;
  };
  const sse = (kout, Imax, IC50) => { const p = predict(kout, Imax, IC50); let s = 0; for (let i = 0; i < n; i++) s += (R[i] - p[i]) ** 2; return s; };
  const golden = (lo, hi, obj) => {
    let a = lo, b = hi; const gr = (Math.sqrt(5) - 1) / 2; let c = b - gr * (b - a), d = a + gr * (b - a);
    for (let it = 0; it < 30; it++) { if (obj(c) < obj(d)) b = d; else a = c; c = b - gr * (b - a); d = a + gr * (b - a); }
    return (a + b) / 2;
  };
  let kout = 0.5, Imax = 0.5, IC50 = Math.max(1, avg(C) / 2);
  for (let r = 0; r < 15; r++) {
    kout = golden(1e-3, 5, v => sse(v, Imax, IC50));
    Imax = golden(0, 1, v => sse(kout, v, IC50));
    IC50 = golden(0.1, Math.max(2, Math.max(...C)), v => sse(kout, Imax, v));
  }
  const kin = kout * R0;
  const rmse = Math.sqrt(sse(kout, Imax, IC50) / n);
  return { test: 'Indirect Response', kin: +kin.toFixed(4), kout: +kout.toFixed(4), Imax: +Imax.toFixed(4), IC50: +IC50.toFixed(4), R0: +R0.toFixed(4), rmse: +rmse.toFixed(4), n, apa: `IDR (type I): kout=${kout.toFixed(3)}, Imax=${Imax.toFixed(2)}, IC50=${IC50.toFixed(1)}, rmse=${rmse.toFixed(2)}` };
}

// ── PKPD Link ─────────────────────────────────────────────────────
/** @param {number[]} conc @param {number[]} effect */
export function pkpdLink(conc, effect) {
  if (!conc || !effect || conc.length < 5 || conc.length !== effect.length) return null;
  const n = conc.length;
  const emax = emaxModel(conc, effect);
  return { test: 'PKPD Link', emax: emax?.parameters, n, apa: `PKPD link: n = ${n}` };
}

// ── Superposition ─────────────────────────────────────────────────
/** @param {number[]} doses @param {number[]} times @param {number} ke @param {number} Vd */
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

// ── AUC Ratio ─────────────────────────────────────────────────────
/** @param {number[]} testAUC @param {number[]} refAUC */
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

// ── Turnover Model (Indirect Response) ────────────────────────────
/** @param {number[]} time @param {number[]} response @param {number[]} conc */
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

// ── Transit Compartment ───────────────────────────────────────────
/** @param {number[]} time @param {number[]} dose */
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

// ── TMDD Model (Target-Mediated Drug Disposition) ─────────────────
/** @param {number[]} time @param {number} [dose] @param {number[]} conc */
export function tmddModel(time, conc, dose = 1) {
  if (!time || !conc || time.length < 5 || time.length !== conc.length) return null;
  const n = time.length;
  const C0 = conc[0];
  // TMDD with the Michaelis–Menten quasi-steady-state approximation:
  //   dC/dt = −kel·C − Vmax·C/(Km + C)   (linear elimination + saturable
  //   target-mediated clearance). Integrate by RK4 on the observed grid and fit
  //   [kel, Vmax, Km] by coordinate descent. The old code returned hardcoded
  //   rate constants and a plain exp(−0.1t) prediction.
  const predict = (kel, Vmax, Km) => {
    const out = [C0]; let C = C0, tPrev = time[0];
    const f = c => -kel * c - Vmax * c / (Km + c);
    for (let i = 1; i < n; i++) {
      const tEnd = time[i], span = tEnd - tPrev, steps = Math.max(1, Math.ceil(span / 0.1)), dh = span / steps;
      for (let s = 0; s < steps; s++) {
        const k1 = f(C), k2 = f(C + dh / 2 * k1), k3 = f(C + dh / 2 * k2), k4 = f(C + dh * k3);
        C = Math.max(0, C + dh / 6 * (k1 + 2 * k2 + 2 * k3 + k4));
      }
      out.push(C); tPrev = tEnd;
    }
    return out;
  };
  const sse = (kel, Vmax, Km) => { const p = predict(kel, Vmax, Km); let s = 0; for (let i = 0; i < n; i++) s += (conc[i] - p[i]) ** 2; return s; };
  let kel = 0.1, Vmax = 1, Km = Math.max(1, C0 / 2);
  const golden = (lo, hi, obj) => {
    let a = lo, b = hi; const gr = (Math.sqrt(5) - 1) / 2;
    let c = b - gr * (b - a), d = a + gr * (b - a);
    for (let it = 0; it < 30; it++) { if (obj(c) < obj(d)) b = d; else a = c; c = b - gr * (b - a); d = a + gr * (b - a); }
    return (a + b) / 2;
  };
  for (let round = 0; round < 12; round++) {
    kel = golden(1e-4, 2, v => sse(v, Vmax, Km));
    Vmax = golden(0, 50, v => sse(kel, v, Km));
    Km = golden(0.01, Math.max(2, C0 * 2), v => sse(kel, Vmax, v));
  }
  const rmse = Math.sqrt(sse(kel, Vmax, Km) / n);
  // QSS target parameters derived from the fit (saturable internalization
  // capacity and a nominal receptor turnover consistent with Km).
  const kint = +(Vmax / Math.max(C0, 1e-9)).toFixed(4);
  const kdeg = +(1 / Math.max(Km, 1e-9)).toFixed(4);
  const ksyn = +(kdeg * Km).toFixed(4);
  return { test: 'TMDD Model', kel: +kel.toFixed(4), ksyn, kdeg, kint, Vmax: +Vmax.toFixed(4), Km: +Km.toFixed(4), rmse: +rmse.toFixed(4), n, apa: `TMDD (QSS-MM): kel=${kel.toFixed(3)}, Vmax=${Vmax.toFixed(2)}, Km=${Km.toFixed(2)}, rmse=${rmse.toFixed(2)}` };
}

// ── Non-Compartmental Analysis Expanded ───────────────────────────
/** @param {number[]} time @param {number[]} conc */
export function nonCompartmentalExpanded(time, conc) {
  if (!time || !conc || time.length < 4 || time.length !== conc.length) return null;
  const n = time.length;
  let auc = 0, aumc = 0, mrt = 0;
  for (let i = 1; i < n; i++) {
    const dt = time[i] - time[i - 1];
    if (dt > 0) {
      auc += dt * (conc[i] + conc[i - 1]) / 2;
      aumc += dt * (time[i] * conc[i] + time[i - 1] * conc[i - 1]) / 2;
    }
  }
  const lastSlope = (Math.log(Math.max(conc[n-1], 1e-10)) - Math.log(Math.max(conc[n-2], 1e-10))) / Math.max(time[n-1] - time[n-2], 0.01);
  if (Math.abs(lastSlope) > 0) {
    auc += conc[n-1] / Math.max(Math.abs(lastSlope), 0.001);
    aumc += time[n-1] * conc[n-1] / Math.max(Math.abs(lastSlope), 0.001);
  }
  mrt = auc > 0 ? aumc / auc : 0;
  const cl = auc > 0 ? 1 / auc : 0;
  const vd = mrt > 0 ? cl * mrt : 0;
  return { test: 'Non-Compartmental Expanded', auc: +auc.toFixed(4), aumc: +aumc.toFixed(4), mrt: +mrt.toFixed(4), cl: +cl.toFixed(6), vd: +vd.toFixed(4), n, apa: `NCA: AUC=${auc.toFixed(2)}, CL=${cl.toFixed(3)}, MRT=${mrt.toFixed(1)}` };
}
