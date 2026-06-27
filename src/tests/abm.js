import { avg, sampleSD, corr } from '../math/core.js';
import { normalCDF } from '../math/distributions.js';

// ── Multi-Moran's I for ABM ────────────────────────────────────────────────
export function moranIMulti(agents, valueField, { nPerm = 99 } = {}) {
  if (!agents || agents.length < 10 || !valueField) return null;
  const n = agents.length;
  const vals = agents.map(a => +a[valueField]);
  const mean = avg(vals);
  const num = vals.reduce((s, vi, i) => {
    let s2 = 0;
    for (let j = 0; j < n; j++) {
      const dx = agents[i].x - agents[j].x, dy = agents[i].y - agents[j].y;
      const w = Math.exp(-(dx * dx + dy * dy));
      s2 += w * (vi - mean) * (vals[j] - mean);
    }
    return s + s2;
  }, 0);
  const denom = vals.reduce((s, v) => s + (v - mean) ** 2, 0) * n;
  const I = denom > 0 ? num / denom : 0;
  return { test: "Moran's I (Agents)", I: +I.toFixed(4), n, apa: `Moran I = ${I.toFixed(3)}, n = ${n}` };
}

// ── Simulation Convergence ─────────────────────────────────────────────────
export function simulationConvergence(runs, { window = 10, tolerance = 0.01 } = {}) {
  if (!runs || runs.length < window) return null;
  const n = runs.length;
  const means = [];
  for (let i = window; i <= n; i++) {
    means.push(avg(runs.slice(i - window, i)));
  }
  const diffs = means.slice(1).map((m, i) => Math.abs(m - means[i]));
  const converged = diffs.length > 0 && diffs[diffs.length - 1] < tolerance;
  const step = converged ? diffs.findIndex(d => d < tolerance) + window : null;
  return { test: 'Simulation Convergence', converged, convergedAt: step, window, tolerance, nRuns: n, apa: `Converged: ${converged ? `at step ${step}` : 'no'}` };
}

// ── Sobol Sensitivity Indices ──────────────────────────────────────────────
export function sobolSensitivity(inputs, output, { nBootstrap = 100 } = {}) {
  if (!inputs || !inputs.length || !output || inputs[0].length !== output.length) return null;
  const p = inputs.length, n = output.length;
  const indices = inputs.map((x, i) => {
    const r = corr([...x], [...output]);
    return { factor: i + 1, r: +r.toFixed(4), sensitivity: +(r * r).toFixed(4) };
  });
  return { test: 'Sobol Sensitivity', indices, nFactors: p, n, apa: `Sobol: ${p} factors, n = ${n}` };
}

// ── Agent Summary Statistics ───────────────────────────────────────────────
export function agentSummaryStats(agents, vars) {
  if (!agents || !agents.length || !vars) return null;
  const n = agents.length;
  const summaries = vars.map(v => {
    const vals = agents.map(a => +a[v]).filter(Number.isFinite);
    const m = avg(vals);
    const sd = vals.length > 1 ? sampleSD(vals) : 0;
    return { variable: v, n: vals.length, mean: +m.toFixed(4), sd: +sd.toFixed(4), min: +Math.min(...vals).toFixed(4), max: +Math.max(...vals).toFixed(4) };
  });
  return { test: 'Agent Summary Stats', summaries, n, apa: `Agent stats: ${summaries.length} vars, ${n} agents` };
}

// ── Scenario Comparison ────────────────────────────────────────────────────
export function scenarioComparison(scenarios) {
  if (!scenarios || scenarios.length < 2) return null;
  const names = [];
  const values = [];
  scenarios.forEach((s, i) => {
    names.push(s.name || `S${i + 1}`);
    const vals = s.values.filter(Number.isFinite);
    values.push({ name: names[i], n: vals.length, mean: +avg(vals).toFixed(4), sd: +sampleSD(vals).toFixed(4) });
  });
  const pairs = [];
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      const diff = values[i].mean - values[j].mean;
      const se = Math.sqrt(values[i].sd ** 2 / values[i].n + values[j].sd ** 2 / values[j].n + 1e-10);
      const z = se > 0 ? diff / se : 0;
      const p = 2 * (1 - normalCDF(Math.abs(z)));
      pairs.push({ s1: names[i], s2: names[j], diff: +diff.toFixed(4), z: +z.toFixed(4), p });
    }
  }
  return { test: 'Scenario Comparison', values, pairs, nScenarios: scenarios.length, apa: `Scenarios: ${values.map(v => `${v.name}=${v.mean.toFixed(2)}`).join(', ')}` };
}
