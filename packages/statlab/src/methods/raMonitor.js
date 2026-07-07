import { avg } from '../math/core.js';
import { normalCDF } from '../math/distributions.js';

// ── RA-CUSUM ──────────────────────────────────────────────────────
/** @param {number[]} predicted @param {number[]} binary observed outcomes (0/1). */
export function raCusum(binary, predicted, { k = 0.5, h = 5 } = {}) {
  if (!binary || !predicted || binary.length < 10 || binary.length !== predicted.length) return null;
  const n = binary.length;
  const cusum = [0];
  const signals = [];
  for (let i = 0; i < n; i++) {
    const score = binary[i] === 1 ? Math.log(1 / Math.max(predicted[i], 0.001)) : Math.log(1 / Math.max(1 - predicted[i], 0.001));
    cusum.push(Math.max(0, cusum[i] + score - k));
    if (cusum[cusum.length - 1] > h) signals.push({ index: i, value: +cusum[cusum.length - 1].toFixed(4) });
  }
  return { test: 'RA-CUSUM', cusum: cusum.slice(1).map(v => +v.toFixed(4)), signals, k, h, n, apa: `RA-CUSUM: ${signals.length} signal(s), n = ${n}` };
}

// ── VLAD ──────────────────────────────────────────────────────────
/** @param {number[]} expected @param {number[]} observed */
export function vlad(expected, observed, { smoothing = 5 } = {}) {
  if (!expected || !observed || expected.length !== observed.length || expected.length < 5) return null;
  const n = expected.length;
  const resid = expected.map((e, i) => observed[i] - e);
  const cumResid = [resid[0]];
  for (let i = 1; i < n; i++) cumResid.push(cumResid[i - 1] + resid[i]);
  const smoothed = [];
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - smoothing);
    const end = Math.min(n - 1, i + smoothing);
    smoothed.push(avg(cumResid.slice(start, end + 1)));
  }
  return { test: 'VLAD', vlad: smoothed.map(v => +v.toFixed(4)).slice(0, 20), n, apa: `VLAD: range [${Math.min(...smoothed).toFixed(0)}, ${Math.max(...smoothed).toFixed(0)}]` };
}

// ── RA-SPRT ───────────────────────────────────────────────────────
/** @param {number[]} predicted @param {number[]} binary */
export function raSprt(binary, predicted, { h0 = 0, h1 = 0.5 } = {}) {
  if (!binary || !predicted || binary.length < 10 || binary.length !== predicted.length) return null;
  const n = binary.length;
  const llr = [0];
  for (let i = 0; i < n; i++) {
    const p = predicted[i];
    const lrH1 = binary[i] ? p + h1 : 1 - p - h1;
    const lrH0 = binary[i] ? p : 1 - p;
    llr.push(llr[i] + Math.log(Math.max(Math.abs(lrH1) / Math.max(Math.abs(lrH0), 0.001), 0.001)));
  }
  return { test: 'RA-SPRT', llr: llr.slice(1).map(v => +v.toFixed(4)), n, apa: `RA-SPRT: final LLR = ${llr[n].toFixed(2)}` };
}

// ── Funnel Plot ───────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string} nVar */
export function funnelPlot(data, yVar, nVar, { controlLimits = 3 } = {}) {
  if (!data || data.length < 5 || !yVar || !nVar) return null;
  const n = data.length;
  const rates = data.map(r => +r[yVar] / Math.max(+r[nVar], 1));
  const ns = data.map(r => +r[nVar]);
  const meanRate = rates.reduce((s, v) => s + v, 0) / n;
  const points = data.map((_, i) => {
    const se = Math.sqrt(meanRate * (1 - meanRate) / Math.max(ns[i], 1));
    const ucl = meanRate + controlLimits * se;
    const lcl = Math.max(0, meanRate - controlLimits * se);
    return { i: i + 1, n: ns[i], rate: +rates[i].toFixed(4), ucl: +ucl.toFixed(4), lcl: +lcl.toFixed(4), signal: rates[i] > ucl || rates[i] < lcl };
  });
  return { test: 'Funnel Plot', points, meanRate: +meanRate.toFixed(4), controlLimits, n, apa: `Funnel: ${points.filter(p => p.signal).length} signals` };
}

// ── C-Chart Risk-Adjusted ─────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string} riskVar */
export function cChartRiskAdjusted(data, yVar, riskVar, { controlLimits = 3 } = {}) {
  if (!data || data.length < 12 || !yVar || !riskVar) return null;
  const n = data.length;
  const y = data.map(r => +r[yVar]);
  const risk = data.map(r => +r[riskVar]);
  const totalY = y.reduce((s, v) => s + v, 0);
  const totalRisk = risk.reduce((s, v) => s + v, 0);
  const expectedRate = totalRisk > 0 ? totalY / totalRisk : 0;
  const points = y.map((yi, i) => {
    const exp = expectedRate * risk[i];
    const ucl = exp + controlLimits * Math.sqrt(exp);
    const lcl = Math.max(0, exp - controlLimits * Math.sqrt(exp));
    return { i: i + 1, observed: yi, expected: +exp.toFixed(4), ucl: +ucl.toFixed(4), lcl: +lcl.toFixed(4), signal: yi > ucl || yi < lcl };
  });
  return { test: 'C-Chart Risk-Adjusted', points, expectedRate: +expectedRate.toFixed(4), controlLimits, n, apa: `RA C-chart: ${points.filter(p => p.signal).length} signals` };
}

// ── Safety Signal Detection (PRR) ─────────────────────────────────
/** @param {number} events @param {number} expected @param {number} total */
export function safetySignal(events, expected, total) {
  if (!events || !expected || events < 0 || expected <= 0 || !total || total <= 0) return null;
  const observed = events;
  const nonObserved = total - observed;
  const nonExpected = total - expected;
  const prr = (observed / Math.max(observed + nonObserved, 1)) / (expected / Math.max(expected + nonExpected, 1));
  const logPRR = Math.log(Math.max(prr, 0.01));
  const se = Math.sqrt(1 / Math.max(observed, 1) + 1 / Math.max(expected, 1));
  const ciLow = Math.exp(logPRR - 1.96 * se);
  const ciHigh = Math.exp(logPRR + 1.96 * se);
  return { test: 'Safety Signal', prr: +prr.toFixed(4), ciLow: +ciLow.toFixed(4), ciHigh: +ciHigh.toFixed(4), observed, expected, total, apa: `Safety: PRR=${prr.toFixed(2)} (${ciLow.toFixed(2)}-${ciHigh.toFixed(2)})` };
}

// ── PRR Analysis (Proportional Reporting Ratio batch) ─────────────
/** @param {number[]} events @param {number[]} expecteds @param {number[]} totals */
export function prrAnalysis(events, expecteds, totals) {
  if (!events || !expecteds || events.length < 3 || events.length !== expecteds.length) return null;
  const n = events.length;
  const results = events.map((e, i) => {
    const prr = safetySignal(e, expecteds[i], totals[i] || 1000);
    return prr ? { index: i + 1, prr: prr.prr, signal: prr.ciLow > 1 } : { index: i + 1, prr: 0, signal: false };
  });
  return { test: 'PRR Analysis', results, nSignals: results.filter(r => r.signal).length, n, apa: `PRR: ${results.filter(r => r.signal).length}/${n} signals` };
}
