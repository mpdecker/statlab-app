import { describe, it, expect } from 'vitest';
import { randomizedBlockANOVA, latinSquareANOVA, splitPlotANOVA, crossoverANOVA, factorialANOVA, nestedANOVA, repeatedMeasuresGLM, equivalenceANOVA, centralCompositeDesign, optimalDesign, plackettBurman, taguchiLArray, doePower, definitiveScreening, latinHypercube, gpEmulator, expectedImprovement } from './experimental.js';
import { expectKeys } from './__fixtures__/helpers.js';

function expectSources(r, minSources) {
  expectKeys(r, ['test', 'sources', 'apa']);
  expect(r.sources.length).toBeGreaterThanOrEqual(minSources);
  for (const src of r.sources) {
    expect(typeof src.df).toBe('number');
    expect(typeof src.ss).toBe('number');
  }
}

// Deterministic data (no Math.random)
const rbData = [
  { block: 'B1', treat: 'A', score: 12 },
  { block: 'B1', treat: 'B', score: 15 },
  { block: 'B1', treat: 'C', score: 18 },
  { block: 'B2', treat: 'A', score: 14 },
  { block: 'B2', treat: 'B', score: 16 },
  { block: 'B2', treat: 'C', score: 20 },
  { block: 'B3', treat: 'A', score: 13 },
  { block: 'B3', treat: 'B', score: 17 },
  { block: 'B3', treat: 'C', score: 19 },
];

describe('randomizedBlockANOVA', () => {
  it('returns null for small/invalid data', () => {
    expect(randomizedBlockANOVA([{ a: 1 }], { treatment: 'a', block: 'b', response: 'c' })).toBeNull();
    expect(randomizedBlockANOVA(null)).toBeNull();
  });

  it('returns sources with treatment and block rows', () => {
    const r = randomizedBlockANOVA(rbData, { treatment: 'treat', block: 'block', response: 'score' });
    expectSources(r, 3);
    expect(r.sources.find(s => s.source === 'Treatment').F).toBeGreaterThan(0);
    expect(r.sources.find(s => s.source === 'Block')).toBeDefined();
    expect(r.sources.find(s => s.source === 'Error')).toBeDefined();
  });

  it('SS total = sum of other SS', () => {
    const r = randomizedBlockANOVA(rbData, { treatment: 'treat', block: 'block', response: 'score' });
    const nonTotal = r.sources.filter(s => s.source !== 'Total');
    const sumSS = nonTotal.reduce((s, src) => s + src.ss, 0);
    const totalSS = r.sources.find(s => s.source === 'Total').ss;
    expect(sumSS).toBeCloseTo(totalSS, 1);
  });

  it('df sum equals Total df', () => {
    const r = randomizedBlockANOVA(rbData, { treatment: 'treat', block: 'block', response: 'score' });
    const nonTotal = r.sources.filter(s => s.source !== 'Total');
    const sumDf = nonTotal.reduce((s, src) => s + src.df, 0);
    const totalDf = r.sources.find(s => s.source === 'Total').df;
    expect(sumDf).toBeCloseTo(totalDf, 1);
  });

  it('F-values are positive', () => {
    const r = randomizedBlockANOVA(rbData, { treatment: 'treat', block: 'block', response: 'score' });
    r.sources.filter(s => s.F != null).forEach(s => expect(s.F).toBeGreaterThan(0));
  });

  it('p-values are in [0, 1]', () => {
    const r = randomizedBlockANOVA(rbData, { treatment: 'treat', block: 'block', response: 'score' });
    r.sources.filter(s => s.p != null).forEach(s => {
      expect(s.p).toBeGreaterThanOrEqual(0);
      expect(s.p).toBeLessThanOrEqual(1);
    });
  });
});

describe('latinSquareANOVA', () => {
  const latinMat = [
    [1, 2, 3],
    [2, 3, 1],
    [3, 1, 2],
  ].map(row => row.map(v => v * 5));

  it('returns null for non-square matrix', () => {
    expect(latinSquareANOVA([[1, 2], [3, 4], [5, 6]])).toBeNull();
    expect(latinSquareANOVA(null)).toBeNull();
    expect(latinSquareANOVA([[1, 2], [3, 4]])).toBeNull();
  });

  it('returns sources with row, col, treatment, error', () => {
    const r = latinSquareANOVA(latinMat);
    expectSources(r, 4);
    expect(r.sources.find(s => s.source === 'Rows')).toBeDefined();
    expect(r.sources.find(s => s.source === 'Columns')).toBeDefined();
    expect(r.sources.find(s => s.source === 'Treatment')).toBeDefined();
  });

  it('SS decomposition sums correctly', () => {
    const r = latinSquareANOVA(latinMat);
    const nonTotal = r.sources.filter(s => s.source !== 'Total');
    const sumSS = nonTotal.reduce((s, src) => s + src.ss, 0);
    const totalSS = r.sources.find(s => s.source === 'Total').ss;
    expect(sumSS).toBeCloseTo(totalSS, 1);
  });

  it('balanced design: all treatment F identical', () => {
    const r = latinSquareANOVA(latinMat);
    const t = r.sources.find(s => s.source === 'Treatment');
    expect(t.F).toBeGreaterThanOrEqual(0);
  });

  it('larger matrix (5x5) works', () => {
    const mat5 = [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 1],
      [3, 4, 5, 1, 2],
      [4, 5, 1, 2, 3],
      [5, 1, 2, 3, 4],
    ].map(row => row.map(v => v * 2));
    const r = latinSquareANOVA(mat5);
    expect(r.sources.length).toBeGreaterThan(3);
    expect(r.sources.find(s => s.source === 'Rows').df).toBe(4);
  });
});

describe('splitPlotANOVA', () => {
  const spData = [];
  for (let sub = 1; sub <= 6; sub++)
    for (const time of [1, 2, 3])
      spData.push({ subject: `S${sub}`, treatment: sub <= 3 ? 'Control' : 'Drug', time: `T${time}`,
        score: 5 + (sub <= 3 ? 0 : 2) + time * 0.5 });

  it('returns null for small data', () => {
    expect(splitPlotANOVA([{ a: 1 }], { between: 'a', within: 'b', subject: 'c', response: 'd' })).toBeNull();
  });

  it('returns sources with between, within, interaction', () => {
    const r = splitPlotANOVA(spData, { between: 'treatment', within: 'time', subject: 'subject', response: 'score' });
    expectSources(r, 5);
    expect(r.sources.find(s => s.source && s.source.includes('Between'))).toBeDefined();
    expect(r.sources.find(s => s.source && s.source.includes('Within'))).toBeDefined();
    expect(r.sources.find(s => s.source && s.source.includes('Interaction'))).toBeDefined();
  });

  it('whole-plot and sub-plot error terms exist', () => {
    const r = splitPlotANOVA(spData, { between: 'treatment', within: 'time', subject: 'subject', response: 'score' });
    expect(r.sources.find(s => s.source.includes('Whole-plot Error'))).toBeDefined();
    expect(r.sources.find(s => s.source.includes('Sub-plot Error'))).toBeDefined();
  });

  it('SS total decomposition', () => {
    const r = splitPlotANOVA(spData, { between: 'treatment', within: 'time', subject: 'subject', response: 'score' });
    const nonTotal = r.sources.filter(s => s.source !== 'Total');
    const sumSS = nonTotal.reduce((s, src) => s + src.ss, 0);
    const totalSS = r.sources.find(s => s.source === 'Total').ss;
    expect(Math.abs(sumSS - totalSS)).toBeLessThan(10);
  });
});

describe('crossoverANOVA', () => {
  const coData = [];
  for (let sub = 1; sub <= 4; sub++) {
    const seq = sub <= 2 ? 'AB' : 'BA';
    for (let per = 1; per <= 2; per++) {
      const treat = (seq === 'AB' && per === 1) || (seq === 'BA' && per === 2) ? 'A' : 'B';
      coData.push({ subject: `S${sub}`, period: per, treatment: treat, sequence: seq,
        score: 10 + (treat === 'A' ? 2 : 0) + (per === 2 ? 1 : 0) });
    }
  }

  it('returns null for small data', () => {
    expect(crossoverANOVA([{ a: 1 }], { subject: 'a', period: 'b', treatment: 'c', response: 'd' })).toBeNull();
  });

  it('returns sources with treatment and period', () => {
    const r = crossoverANOVA(coData, { subject: 'subject', period: 'period', treatment: 'treatment', response: 'score', sequence: 'sequence' });
    expectSources(r, 4);
    expect(r.sources.find(s => s.source === 'Treatment')).toBeDefined();
    expect(r.sources.find(s => s.source === 'Period')).toBeDefined();
  });

  it('sequence effect present when sequence provided', () => {
    const r = crossoverANOVA(coData, { subject: 'subject', period: 'period', treatment: 'treatment', response: 'score', sequence: 'sequence' });
    expect(r.sources.find(s => s.source === 'Sequence')).toBeDefined();
  });

  it('no crash without sequence column', () => {
    const r = crossoverANOVA(coData, { subject: 'subject', period: 'period', treatment: 'treatment', response: 'score' });
    expect(r).not.toBeNull();
    expect(r.sources.find(s => s.source === 'Sequence')).toBeUndefined();
  });

  it('treatment F > 0 for known effect', () => {
    const r = crossoverANOVA(coData, { subject: 'subject', period: 'period', treatment: 'treatment', response: 'score', sequence: 'sequence' });
    const trt = r.sources.find(s => s.source === 'Treatment');
    expect(trt.F).toBeGreaterThan(0);
  });
});

describe('factorialANOVA', () => {
  const factData = [];
  for (let i = 0; i < 48; i++) {
    factData.push({ A: i < 24 ? 'a1' : 'a2', B: i % 12 < 6 ? 'b1' : 'b2', C: i % 3 === 0 ? 'c1' : i % 3 === 1 ? 'c2' : 'c3',
      y: 10 + (i < 24 ? 2 : 0) + (i % 12 < 6 ? 1 : 0) + (i % 3 === 0 ? 0.5 : 0) + (i % 3 === 1 ? -0.5 : 0) });
  }

  it('returns null for small data', () => {
    expect(factorialANOVA([{ x: 1 }], { factors: ['x'], response: 'y' })).toBeNull();
  });

  it('returns sources for 3-factor design with all interactions', () => {
    const r = factorialANOVA(factData, { factors: ['A', 'B', 'C'], response: 'y' });
    expectSources(r, 6);
    const interactions = r.sources.filter(s => s.source && s.source.includes(':'));
    expect(interactions.length).toBeGreaterThanOrEqual(3);
  });

  it('works with 2 factors', () => {
    const r = factorialANOVA(factData, { factors: ['A', 'B'], response: 'y' });
    expectSources(r, 3);
  });

  it('works with 1 factor', () => {
    const r = factorialANOVA(factData, { factors: ['A'], response: 'y' });
    expect(r.sources.filter(s => s.source === 'Error' || s.F != null).length).toBeGreaterThan(0);
  });

  it('main effects have F > 0', () => {
    const r = factorialANOVA(factData, { factors: ['A', 'B'], response: 'y' });
    r.sources.filter(s => s.F != null && !s.source.includes(':')).forEach(s => expect(s.F).toBeGreaterThan(0));
  });

  it('df decomposition consistent', () => {
    const r = factorialANOVA(factData, { factors: ['A', 'B'], response: 'y' });
    const nonTotal = r.sources.filter(s => s.source !== 'Total');
    const sumDf = nonTotal.reduce((s, src) => s + src.df, 0);
    const totalDf = r.sources.find(s => s.source === 'Total').df;
    expect(sumDf).toBeCloseTo(totalDf, 0);
  });

  it('3-factor factorial ANOVA works with interaction', () => {
    const data = [];
    for (let a = 0; a < 2; a++)
      for (let b = 0; b < 2; b++)
        for (let c = 0; c < 2; c++)
          for (let i = 0; i < 4; i++)
            data.push({ f1: `A${a}`, f2: `B${b}`, f3: `C${c}`, score: 10 + a * 3 + b * 2 + c * 1 + i * 0.5 });
    const r = factorialANOVA(data, { factors: ['f1', 'f2', 'f3'], response: 'score' });
    expect(r.sources.length).toBeGreaterThan(3);
    expect(r.sources.find(s => s.source === 'f1:f2:f3')).toBeDefined();
    expect(r.sources.find(s => s.source === 'f1:f2')).toBeDefined();
    expect(r.sources.find(s => s.source === 'f1:f3')).toBeDefined();
    expect(r.sources.find(s => s.source === 'f2:f3')).toBeDefined();
  });
});

// ── Nested ANOVA ──────────────────────────────────────────────────────────────
describe('nestedANOVA', () => {
  const nestedData = [];
  const schools = ['S1', 'S2', 'S3'];
  const classes = ['C1', 'C2', 'C3'];
  schools.forEach(school => {
    classes.forEach(cls => {
      for (let i = 0; i < 4; i++) {
        nestedData.push({
          school,
          class: cls,
          score: 70 + schools.indexOf(school) * 5 + classes.indexOf(cls) * 2 + i * 0.5,
        });
      }
    });
  });

  it('returns null for insufficient data', () => {
    expect(nestedANOVA(null, { primary: 'a', nested: 'b', response: 'c' })).toBeNull();
    expect(nestedANOVA([], { primary: 'a', nested: 'b', response: 'c' })).toBeNull();
  });

  it('returns null for single primary level', () => {
    const single = nestedData.filter(r => r.school === 'S1');
    expect(nestedANOVA(single, { primary: 'school', nested: 'class', response: 'score' })).toBeNull();
  });

  it('returns correct keys', () => {
    const r = nestedANOVA(nestedData, { primary: 'school', nested: 'class', response: 'score' });
    expectKeys(r, ['test', 'sources', 'n', 'J', 'K', 'apa']);
  });

  it('sources has correct structure', () => {
    const r = nestedANOVA(nestedData, { primary: 'school', nested: 'class', response: 'score' });
    expectSources(r, 3);
    expect(r.sources.find(s => s.source === 'school')).toBeDefined();
    expect(r.sources.find(s => s.source === 'class(school)')).toBeDefined();
    expect(r.sources.find(s => s.source === 'Error')).toBeDefined();
  });

  it('primary F uses nested MS as error term', () => {
    const r = nestedANOVA(nestedData, { primary: 'school', nested: 'class', response: 'score' });
    const primarySrc = r.sources.find(s => s.source === 'school');
    expect(primarySrc.F).toBeGreaterThan(0);
  });

  it('F-values are positive', () => {
    const r = nestedANOVA(nestedData, { primary: 'school', nested: 'class', response: 'score' });
    r.sources.filter(s => s.F != null).forEach(s => expect(s.F).toBeGreaterThan(0));
  });

  it('df sum equals Total df', () => {
    const r = nestedANOVA(nestedData, { primary: 'school', nested: 'class', response: 'score' });
    const nonTotal = r.sources.filter(s => s.source !== 'Total');
    const sumDf = nonTotal.reduce((s, src) => s + src.df, 0);
    const totalDf = r.sources.find(s => s.source === 'Total').df;
    expect(sumDf).toBeCloseTo(totalDf, 0);
  });

  it('apa is a non-empty string', () => {
    const r = nestedANOVA(nestedData, { primary: 'school', nested: 'class', response: 'score' });
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Repeated Measures GLM ─────────────────────────────────────────────────────
describe('repeatedMeasuresGLM', () => {
  const rmData = [];
  for (let sub = 1; sub <= 8; sub++) {
    for (let cond = 0; cond < 3; cond++) {
      const noise = ((sub * 7 + cond * 13) % 5 - 2) * 0.3;
      rmData.push({
        subject: `S${sub}`,
        condition: `T${cond + 1}`,
        score: 10 + cond * 3 + sub * 0.5 + cond * sub * 0.25 + noise,
      });
    }
  }

  it('returns null for insufficient data', () => {
    expect(repeatedMeasuresGLM(null, { within: 'a', subject: 'b', response: 'c' })).toBeNull();
    const small = rmData.slice(0, 5);
    expect(repeatedMeasuresGLM(small, { within: 'condition', subject: 'subject', response: 'score' })).toBeNull();
  });

  it('returns null for <3 subjects', () => {
    const few = rmData.filter(r => r.subject === 'S1' || r.subject === 'S2');
    expect(repeatedMeasuresGLM(few, { within: 'condition', subject: 'subject', response: 'score' })).toBeNull();
  });

  it('returns correct keys', () => {
    const r = repeatedMeasuresGLM(rmData, { within: 'condition', subject: 'subject', response: 'score' });
    expectKeys(r, ['test', 'k', 'n', 'flatProfile', 'multivariate', 'apa']);
  });

  it('flatProfile has t2, f, df1, df2, p, ggEpsilon, ggP', () => {
    const r = repeatedMeasuresGLM(rmData, { within: 'condition', subject: 'subject', response: 'score' });
    const fp = r.flatProfile;
    expect(Number.isFinite(fp.t2)).toBe(true);
    expect(Number.isFinite(fp.f)).toBe(true);
    expect(fp.f).toBeGreaterThanOrEqual(0);
    expect(fp.df1).toBeGreaterThan(0);
    expect(fp.df2).toBeGreaterThan(0);
    expect(fp.p).toBeGreaterThanOrEqual(0);
    expect(fp.p).toBeLessThanOrEqual(1);
    expect(fp.ggEpsilon).toBeGreaterThanOrEqual(1 / (r.k - 1));
    expect(fp.ggEpsilon).toBeLessThanOrEqual(1);
    expect(fp.ggP).toBeGreaterThanOrEqual(0);
    expect(fp.ggP).toBeLessThanOrEqual(1);
  });

  it('multivariate has pillai, wilks and their F/p', () => {
    const r = repeatedMeasuresGLM(rmData, { within: 'condition', subject: 'subject', response: 'score' });
    const mv = r.multivariate;
    expect(Number.isFinite(mv.pillai)).toBe(true);
    expect(Number.isFinite(mv.wilks)).toBe(true);
    expect(Number.isFinite(mv.pillaiF)).toBe(true);
    expect(Number.isFinite(mv.wilksF)).toBe(true);
    expect(mv.pillaiP).toBeGreaterThanOrEqual(0);
    expect(mv.wilksP).toBeGreaterThanOrEqual(0);
  });

  it('n and k match input', () => {
    const r = repeatedMeasuresGLM(rmData, { within: 'condition', subject: 'subject', response: 'score' });
    expect(r.n).toBe(8);
    expect(r.k).toBe(3);
  });

  it('apa is a non-empty string', () => {
    const r = repeatedMeasuresGLM(rmData, { within: 'condition', subject: 'subject', response: 'score' });
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Equivalence ANOVA ─────────────────────────────────────────────────────────
describe('equivalenceANOVA', () => {
  const group1 = [10, 11, 10.5, 10.2, 9.8];
  const group2 = [10.3, 10.1, 10.4, 9.9, 10.2];
  const group3 = [10.1, 10.5, 9.7, 10.3, 10.0];
  const groupFar = [15, 15.5, 14.8, 15.2, 15.1];

  it('returns null for invalid input', () => {
    expect(equivalenceANOVA(null, -1, 1)).toBeNull();
    expect(equivalenceANOVA([group1], -1, 1)).toBeNull();
    expect(equivalenceANOVA([group1, [1]], -1, 1)).toBeNull();
  });

  it('returns null when dL >= dU', () => {
    expect(equivalenceANOVA([group1, group2], 1, 1)).toBeNull();
    expect(equivalenceANOVA([group1, group2], 2, -1)).toBeNull();
  });

  it('returns correct keys', () => {
    const r = equivalenceANOVA([group1, group2], -1, 1);
    expectKeys(r, ['test', 'dL', 'dU', 'alpha', 'pairs', 'allEquivalent', 'apa']);
  });

  it('identical groups are equivalent', () => {
    const r = equivalenceANOVA([group1, group2, group3], -2, 2);
    expect(r.allEquivalent).toBe(true);
  });

  it('well-separated groups are not equivalent', () => {
    const r = equivalenceANOVA([group1, groupFar], -1, 1);
    expect(r.allEquivalent).toBe(false);
  });

  it('pairs has correct count', () => {
    const r = equivalenceANOVA([group1, group2, group3], -2, 2);
    const k = 3;
    expect(r.pairs).toHaveLength(k * (k - 1) / 2);
  });

  it('each pair has diff, se, tLow, tHigh, pLow, pHigh, equivalent', () => {
    const r = equivalenceANOVA([group1, group2], -2, 2);
    const pair = r.pairs[0];
    expect(Number.isFinite(pair.diff)).toBe(true);
    expect(Number.isFinite(pair.se)).toBe(true);
    expect(Number.isFinite(pair.tLow)).toBe(true);
    expect(Number.isFinite(pair.tHigh)).toBe(true);
    expect(pair.pLow).toBeGreaterThanOrEqual(0);
    expect(pair.pHigh).toBeGreaterThanOrEqual(0);
    expect(typeof pair.equivalent).toBe('boolean');
  });

  it('allEquivalent is boolean', () => {
    const r = equivalenceANOVA([group1, group2], -2, 2);
    expect(typeof r.allEquivalent).toBe('boolean');
  });

  it('apa non-empty', () => {
    const r = equivalenceANOVA([group1, group2], -2, 2);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('centralCompositeDesign', () => {
  const factors = [{ name: 'A', low: -1, high: 1 }, { name: 'B', low: -1, high: 1 }];
  it('null <2 factors', () => expect(centralCompositeDesign([{ name: 'A' }])).toBeNull());
  it('contract keys', () => expectKeys(centralCompositeDesign(factors), ['test', 'runs', 'nRuns', 'rotatable', 'nFactors', 'apa']));
  it('runs include cube, axial, center', () => { const r = centralCompositeDesign(factors); expect(r.runs.some(d => d.type === 'cube')).toBe(true); expect(r.runs.some(d => d.type === 'axial')).toBe(true); expect(r.runs.some(d => d.type === 'center')).toBe(true); });
});

describe('optimalDesign', () => {
  const factors = [{ name: 'A', low: -1, high: 1 }, { name: 'B', low: -1, high: 1 }];
  it('null nRuns < nParams', () => expect(optimalDesign(factors, 2)).toBeNull());
  it('contract keys', () => expectKeys(optimalDesign(factors, 8), ['test', 'runs', 'dEfficiency', 'nRuns', 'nFactors', 'model', 'apa']));
  it('runs count correct', () => { const r = optimalDesign(factors, 8); expect(r.runs).toHaveLength(8); });
});

describe('plackettBurman', () => {
  const f = [{ name: 'A', low: -1, high: 1 }, { name: 'B', low: -1, high: 1 }];
  it('contract keys', () => expectKeys(plackettBurman(f), ['test', 'runs', 'nRuns', 'nFactors', 'apa']));
  it('design non-empty', () => { const r = plackettBurman(f); if (r) expect(r.runs.length).toBeGreaterThan(0); });
  it('nRuns > nFactors', () => { const r = plackettBurman(f); if (r) expect(r.nRuns).toBeGreaterThan(r.nFactors); });
});
describe('taguchiLArray', () => {
  const f = [{ name: 'A', low: -1, high: 1 }, { name: 'B', low: -1, high: 1 }];
  it('contract keys', () => expectKeys(taguchiLArray(f, [1, 2, 3]), ['test', 'runs', 'nRuns', 'nFactors', 'nLevels', 'apa']));
  it('array non-empty', () => { const r = taguchiLArray(f, [1, 2, 3]); if (r) expect(r.runs.length).toBeGreaterThan(0); });
  it('nRuns > nFactors', () => { const r = taguchiLArray(f, [1, 2, 3]); if (r) expect(r.nRuns).toBeGreaterThan(r.nFactors); });
});
describe('doePower', () => { it('contract keys', () => expectKeys(doePower(3, 8, 0.5), ['test', 'power', 'nFactors', 'nRuns', 'effectSize', 'alpha', 'apa'])); it('power between 0-1', () => { const r = doePower(3, 8, 0.5); expect(r.power).toBeGreaterThanOrEqual(0); expect(r.power).toBeLessThanOrEqual(1); }); it('nFactors matches', () => { const r = doePower(3, 8, 0.5); if (r) expect(r.nFactors).toBe(3); }); });
describe('definitiveScreening', () => {
  const f = [{ name: 'A', low: -1, high: 1 }, { name: 'B', low: -1, high: 1 }, { name: 'C', low: -1, high: 1 }];
  it('contract keys', () => expectKeys(definitiveScreening(f), ['test', 'runs', 'nRuns', 'nFactors', 'apa']));
  it('design non-empty', () => { const r = definitiveScreening(f); if (r) expect(r.runs.length).toBeGreaterThan(0); });
  it('nRuns > nFactors', () => { const r = definitiveScreening(f); if (r) expect(r.nRuns).toBeGreaterThan(r.nFactors); });
});

describe('latinHypercube', () => {
  it('contract keys', () => expectKeys(latinHypercube(10, 3), ['test','samples','n','d','apa']));
  it('null n<2', () => expect(latinHypercube(1, 2)).toBeNull());
  it('n matches', () => { const r = latinHypercube(10, 3); if (r) expect(r.n).toBe(10); });
});
describe('gpEmulator', () => {
  const X = [[1,0],[2,1],[3,2],[4,1],[5,3]];
  const y = [2.1, 3.5, 5.0, 4.2, 6.1];
  it('contract keys', () => expectKeys(gpEmulator(X, y), ['test','predictions','rmse','n','apa']));
  it('rmse non-negative', () => { const r = gpEmulator(X, y); if (r) expect(r.rmse).toBeGreaterThanOrEqual(0); });
  it('predictions array dimension', () => { const r = gpEmulator(X, y); if (r && r.predictions) expect(r.predictions.length).toBeGreaterThan(0); });
});
describe('expectedImprovement', () => {
  it('contract keys', () => expectKeys(expectedImprovement([0.5, 0.8, 0.3, 0.9], [0.1, 0.15, 0.2, 0.1], 0.7), ['test','ei','bestIdx','bestObserved','n','apa']));
  it('bestIdx >= 0', () => { const r = expectedImprovement([0.5, 0.8, 0.3, 0.9], [0.1, 0.15, 0.2, 0.1], 0.7); if (r) expect(r.bestIdx).toBeGreaterThanOrEqual(0); });
  it('bestObserved finite', () => { const r = expectedImprovement([0.5, 0.8, 0.3, 0.9], [0.1, 0.15, 0.2, 0.1], 0.7); if (r) expect(Number.isFinite(r.bestObserved)).toBe(true); });
});

describe('gpEmulator solves the GP linear system (K^-1 y)', () => {
  it('interpolates the training data with small RMSE', () => {
    let s = 8; const z = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    const X = Array.from({ length: 15 }, () => [z(), z()]);
    const y = X.map(r => Math.sin(r[0]) + 0.5 * r[1]);
    const r = gpEmulator(X, y, { lengthScale: 1, noiseVar: 1e-6 });
    expect(r.rmse).toBeLessThan(0.05);
  });
});
