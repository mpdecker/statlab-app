#!/usr/bin/env node
// Generates a JSDoc spec (for _add-jsdoc.mjs) for modules not yet annotated.
// Types come from (a) a conservative param-name dictionary and (b) body
// sniffing to split vector vs matrix for ambiguous names. Anything unresolved
// is left OUT of the JSDoc (tsc keeps it implicit-any) and listed in a review
// report — a wrong type is worse than a missing one.
//
// Usage: node scripts/_gen-jsdoc-spec.mjs <module...> > spec.json  (report on stderr)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(import.meta.dirname, '..', 'packages', 'statlab', 'src', 'methods');

// Unambiguous by convention across the codebase (verified by survey):
const NAME_TYPES = {
  data: 'Array<Record<string, any>>', rows: 'Array<Record<string, any>>',
  obs: 'Array<Record<string, any>>', panelData: 'Array<Record<string, any>>',
  yVar: 'string', xVar: 'string', groupVar: 'string', clusterVar: 'string',
  idVar: 'string', timeVar: 'string', outcomeVar: 'string', treatVar: 'string',
  eventVar: 'string', subjectVar: 'string', valueField: 'string', strataVar: 'string',
  weightVar: 'string', doseVar: 'string', respVar: 'string',
  vars: 'string[]', xVars: 'string[]', yVars: 'string[]', covNames: 'string[]',
  covariates: 'string[]', items: 'string[]', factors: 'string[]', zVars: 'string[]',
  instruments: 'string[]', responses2: 'string[]',
  alpha: 'number', seed: 'number', maxIter: 'number', tolerance: 'number', tol: 'number',
  n: 'number', k: 'number', p: 'number', q: 'number', d: 'number', B: 'number',
  df: 'number', power: 'number', epsilon: 'number', sigma: 'number', threshold: 'number',
  bandwidth: 'number', cutoff: 'number', lag: 'number', maxLag: 'number', nBoot: 'number',
  epochs: 'number', lr: 'number', nComponents: 'number', nClusters: 'number',
  nFactors: 'number', nPoints: 'number', steps: 'number', horizon: 'number',
  dt: 'number', mu: 'number', theta: 'number', lambda: 'number', gamma: 'number',
  weights: 'number[]', scores: 'number[]', pValues: 'number[]', labels: 'number[]',
  residuals: 'number[]', times: 'number[]', values: 'number[]', vals: 'number[]',
  xs: 'number[]', ys: 'number[]', series: 'number[]', signal: 'number[]',
  sample: 'number[]', kernel: 'number[]', degrees: 'number[]', rewards: 'number[]',
  actual: 'number[]', predicted: 'number[]', baseline: 'number[]', arms: 'number',
  A: 'number[][]', matrix: 'number[][]', documents: 'string[]',
  fn: 'Function', statFn: 'Function', testFn: 'Function', objective: 'Function',
  // second-pass names, verified against bodies (2026-07):
  strike: 'number', spot: 'number', rate: 'number', r: 'number',
  p0: 'number', p1: 'number', p2: 'number', nVars: 'number', df1: 'number', df2: 'number',
  angles: 'number[]', counts: 'number[]', dose: 'number[]', response: 'number[]',
  concentration: 'number[]', yTrue: 'number[]', yPred: 'number[]', events: 'number[]',
  init: 'number[]',
  // NOT groups: number[][] in ANOVA-style fns but a per-obs labels vector in
  // moderatedTStatistic/decomposition — ambiguous, leave unresolved.
  grad: '(theta: number[]) => number[]', statistic: '(sample: any[]) => number',
  text: 'string',
  // third-pass names, verified globally-unambiguous (2026-07):
  tp: 'number', fp: 'number', tn: 'number', fn: 'number', sens: 'number', spec: 'number',
  prevalence: 'number', or: 'number', forecast: 'number[]', naive: 'number[]',
  probs: 'number[]', thresholds: 'number[]', methodA: 'number[]', methodB: 'number[]',
  proportions: 'number[]', errors1: 'number[]', errors2: 'number[]', modelFn: 'Function',
  breakpoints: 'number[]', breakPoint: 'number', states: 'Array<string|number>',
  raters: 'string[]', probVar: 'string', scoreVar: 'string',
  rater1: 'Array<string|number>', rater2: 'Array<string|number>',
  forecast1: 'number[]', forecast2: 'number[]',
  type: 'string', method: 'string', linkage: 'string', family: 'string',
  undirected: 'boolean', annualize: 'boolean', robust: 'boolean',
};
// Ambiguous names resolved per-function by body sniffing:
const SNIFF = new Set(['X', 'x', 'y', 'Y', 'returns', 'Xraw', 'M', 'Z', 'D', 'W', 'G', 'b', 'a', 'c', 'model', 'time', 'points', 'init', 'beta']);

function sniffType(name, body) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`${esc}\\[0\\]\\s*(\\.length|\\[)`).test(body)) return 'number[][]';
  if (new RegExp(`${esc}\\.map\\(\\s*\\(?r\\b`).test(body) && /r\[/.test(body)) return null; // row-ish, unclear
  if (new RegExp(`${esc}\\.length`).test(body) || new RegExp(`${esc}\\.map\\(`).test(body) ||
      new RegExp(`${esc}\\.filter\\(`).test(body) || new RegExp(`${esc}\\.reduce\\(`).test(body)) return 'number[]';
  if (new RegExp(`(\\+|-|\\*|/|<|>)\\s*${esc}\\b`).test(body) || new RegExp(`\\b${esc}\\s*(\\+|-|\\*|/|<|>)`).test(body)) return 'number';
  return null;
}

const spec = {}, report = [];
for (const mod of process.argv.slice(2)) {
  const file = join(SRC, `${mod}.js`);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^export (?:async )?function ([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
    if (!m) continue;
    const [, fname, paramsRaw] = m;
    // body = next ~40 lines (enough for guards and first uses)
    const body = lines.slice(i + 1, i + 41).join('\n');
    const tags = [];
    let unresolved = [];
    // split params at top level (options destructuring counts as one param)
    const params = paramsRaw.split(/,(?![^{]*\})/).map((s) => s.trim()).filter(Boolean);
    for (const pRaw of params) {
      if (pRaw.startsWith('{')) { tags.push('@param {object} [options]'); continue; }
      const [name, def] = pRaw.split('=').map((s) => s.trim());
      let t = NAME_TYPES[name];
      if (!t && SNIFF.has(name)) t = sniffType(name, body);
      if (!t && def != null) { // fall back to default-value type
        if (/^[\d.]+$/.test(def)) t = 'number';
        else if (def === 'true' || def === 'false') t = 'boolean';
        else if (/^['"]/.test(def)) t = 'string';
        else if (def === 'null') t = null;
        else if (/^\[\]$/.test(def)) t = 'string[]';
      }
      if (t) tags.push(def != null ? `@param {${t}} [${name}]` : `@param {${t}} ${name}`);
      else unresolved.push(name);
    }
    if (tags.length) out[fname] = tags.join(' ');
    if (unresolved.length) report.push(`${mod}.${fname}(${paramsRaw.trim()})  UNRESOLVED: ${unresolved.join(', ')}`);
  }
  if (Object.keys(out).length) spec[file] = out;
}
console.log(JSON.stringify(spec, null, 1));
if (report.length) console.error(report.join('\n'));
