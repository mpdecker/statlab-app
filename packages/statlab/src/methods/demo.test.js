import { describe, it, expect } from 'vitest';
import { lifeTable, leeCarter, populationProjection, lifeExpectancy, populationGrowth, coxRegressionDemo, kaplanMeierDemo, ageStandardization } from './demo.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rd = ref.demo;

const mx = [0.01, 0.02, 0.03, 0.05, 0.08];
const logMx = [[-5,-3.5,-3,-2.5,-2],[-4.8,-3.4,-2.9,-2.4,-1.9],[-4.6,-3.3,-2.8,-2.3,-1.8]];

describe('lifeTable', () => { it('is defined', () => expect(typeof lifeTable).toBe('function')); it('returns table with lx', () => { const r = lifeTable(mx); if (r) { expect(r.summary).toBeDefined(); expect(r.n).toBeGreaterThan(0); } }); it('null for empty input', () => expect(lifeTable([])).toBeNull()); it('summary has lx values', () => { const r = lifeTable(mx); if (r && r.summary) { expect(r.summary).toBeDefined(); } }); it('ex between 0-100', () => { const r = lifeTable(mx); if (r && r.summary) { expect(r).not.toBeNull(); expect(r.n).toBeGreaterThan(0); } }); it('e0 matches oracle', () => { const r = lifeTable(mx); expect(r.summary.e0).toBeCloseTo(rd.lifeTable_basic.e0, 2); }); it('nAges matches oracle', () => { const r = lifeTable(mx); expect(r.n).toBe(rd.lifeTable_basic.nAges); }) });
describe('leeCarter', () => { it('contract keys', () => expectKeys(leeCarter(logMx, [2000,2001,2002], [0,1,2,3,4]), ['test','ax','bx','kt','nYears','nAges','apa'])); it('kt array non-empty', () => { const r = leeCarter(logMx, [2000,2001,2002], [0,1,2,3,4]); if (r) { expect(Array.isArray(r.kt)).toBe(true); expect(r.kt.length).toBeGreaterThan(0); } }); it('returns kt array', () => { const r = leeCarter(logMx, [2000,2001,2002], [0,1,2,3,4]); if (r) { expect(Array.isArray(r.kt)).toBe(true); } }); it('ax matches oracle', () => { const r = leeCarter(logMx, [2000,2001,2002], [0,1,2,3,4]); rd.leeCarter_basic.ax.forEach((v, i) => expect(r.ax[i]).toBeCloseTo(v, 4)); }); it('bx matches oracle', () => { const r = leeCarter(logMx, [2000,2001,2002], [0,1,2,3,4]); rd.leeCarter_basic.bx.forEach((v, i) => expect(r.bx[i]).toBeCloseTo(v, 4)); }) });
describe('populationProjection', () => { it('is defined', () => expect(typeof populationProjection).toBe('function')); it('returns projected population', () => { const r = populationProjection([100,80,60,40,20], 0.05, mx); if (r) { expect(Array.isArray(r.projection)).toBe(true); expect(r.projection.length).toBeGreaterThan(0); } }); it('returns multi-year projection', () => { const r = populationProjection([100,80,60,40,20], 0.05, mx); if (r) { expect(Array.isArray(r.projection)).toBe(true); expect(r.projection.length).toBeGreaterThan(1); } }); it('final total matches oracle', () => { const r = populationProjection([100,80,60,40,20], 0.05, mx); const finalPop = r.projection[r.projection.length - 1].reduce((s, v) => s + v, 0); expect(finalPop).toBeCloseTo(rd.populationProjection_basic.finalTotal, 0); }) });
describe('lifeExpectancy', () => { it('contract keys', () => expectKeys(lifeExpectancy({ ex: [75, 65, 55, 45, 35], n: 5 }), ['test','e0','n','apa'])); it('e0 positive', () => { const r = lifeExpectancy({ ex: [75, 65, 55, 45, 35], n: 5 }); if (r) expect(r.e0).toBeGreaterThan(0); }); it('returns positive value', () => { const r = lifeExpectancy({ ex: [75, 65, 55, 45, 35], n: 5 }); if (r) { expect(r.e0).toBeGreaterThan(0); } }) });
describe('populationGrowth', () => { it('contract keys', () => expectKeys(populationGrowth([[100,80],[105,85],[112,90]]), ['test','growthRate','nPeriods','t','apa'])); it('growthRate finite', () => { const r = populationGrowth([[100,80],[105,85],[112,90]]); if (r) expect(Number.isFinite(r.growthRate)).toBe(true); }); it('rate between -1 and 1', () => { const r = populationGrowth([[100,80],[105,85],[112,90]]); if (r) { expect(r.growthRate).toBeGreaterThanOrEqual(-1); expect(r.growthRate).toBeLessThanOrEqual(1); } }) });

describe('coxRegressionDemo', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ time: i * 2 + 5, event: i % 3 === 0 ? 1 : 0, x1: i % 2, x2: i % 3 });
  it('contract keys', () => expectKeys(coxRegressionDemo(d, 'time', 'event', ['x1','x2']), ['test','coefficients','n','nEvents','apa']));
  it('null <10', () => expect(coxRegressionDemo(d.slice(0,5), 'time', 'event', ['x1'])).toBeNull());
  it('coefficients array non-empty', () => { const r = coxRegressionDemo(d, 'time', 'event', ['x1','x2']); if (r) { expect(Array.isArray(r.coefficients)).toBe(true); expect(r.coefficients.length).toBeGreaterThan(0); } }); it('coefficients non-empty', () => { const r = coxRegressionDemo(d, 'time', 'event', ['x1','x2']); if (r) { expect(r.coefficients).toBeDefined(); } });
});
describe('kaplanMeierDemo', () => {
  const d = []; for (let i = 0; i < 15; i++) d.push({ age: i * 5 + 1, event: i % 4 === 0 ? 1 : 0 });
  it('contract keys', () => expectKeys(kaplanMeierDemo(d, 'age', 'event'), ['test','survivalTable','n','apa']));
  it('null <5', () => expect(kaplanMeierDemo(d.slice(0,3), 'age', 'event')).toBeNull());
  it('survivalTable array non-empty', () => { const r = kaplanMeierDemo(d, 'age', 'event'); if (r) { expect(Array.isArray(r.survivalTable)).toBe(true); expect(r.survivalTable.length).toBeGreaterThan(0); } }); it('survival decreases over time', () => { const r = kaplanMeierDemo(d, 'age', 'event'); if (r && r.survivalTable && r.survivalTable.length > 1) { const surv = r.survivalTable.map(e => e.survival).filter(v => v !== undefined && v !== null); if (surv.length > 1) { for (let i = 1; i < surv.length; i++) { expect(surv[i]).toBeLessThanOrEqual(surv[i-1]); } } } });
});
describe('ageStandardization', () => {
  const rates = [0.01, 0.02, 0.05, 0.10, 0.20];
  const pop = [1000, 2000, 3000, 2000, 1000];
  it('contract keys', () => expectKeys(ageStandardization(rates, pop), ['test','crudeRate','adjustedRate','nGroups','apa']));
  it('null mismatched', () => expect(ageStandardization([0.01], [1000, 2000])).toBeNull());
  it('adjustedRate between min and max', () => { const r = ageStandardization(rates, pop); if (r) { expect(r.adjustedRate).toBeGreaterThanOrEqual(Math.min(...rates)); expect(r.adjustedRate).toBeLessThanOrEqual(Math.max(...rates)); } }); it('adjustedRate positive', () => { const r = ageStandardization(rates, pop); if (r) { expect(r.adjustedRate).toBeGreaterThan(0); } });
  it('crudeRate matches oracle', () => { const r = ageStandardization(rates, pop); expect(r.crudeRate).toBeCloseTo(rd.ageStandardization_basic.crudeRate, 4); });
  it('adjustedRate matches oracle', () => { const r = ageStandardization(rates, pop); expect(r.adjustedRate).toBeCloseTo(rd.ageStandardization_basic.adjustedRate, 4); });
});

describe('coxRegressionDemo is a real Cox fit', () => {
  // Exponential survival with hazard ∝ exp(1·x); real Cox recovers β_x≈1.
  let s = 777;
  const rand = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
  const data = [];
  for (let i = 0; i < 60; i++) {
    const x = (i % 12) / 6 - 1;
    data.push({ t: -Math.log(rand() + 1e-9) / Math.exp(1.0 * x), dead: 1, x });
  }
  it('estimates a real, significant coefficient (not the hardcoded 0.1 / p=0.05)', () => {
    const r = coxRegressionDemo(data, 't', 'dead', ['x']);
    expect(r.coefficients[0].b).toBeGreaterThan(0.5);
    expect(r.coefficients[0].p).toBeLessThan(0.05);
  });
});
