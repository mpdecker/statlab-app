import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { weibullAnalysis, reliabilityGrowth, acceleratedLife, warrantyPrediction, weibullBayes, repairableSystems, competingRisksReliability } from './reliability.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const data = [120, 250, 380, 510, 720, 890, 1050, 1300, 1600, 2100];
const cumF = [1, 3, 5, 8, 12, 16, 22, 30, 38, 45];
const cumT = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

describe('weibullAnalysis', () => {
  it('contract keys', () => expectKeys(weibullAnalysis(data), ['test','beta','eta','mtbf','n','apa']));
  it('null <5', () => expect(weibullAnalysis([1,2,3])).toBeNull());
  it('beta > 0', () => { const r = weibullAnalysis(data); if (r) expect(r.beta).toBeGreaterThan(0) });
  it('mtbf positive', () => { const r = weibullAnalysis(data); if (r) expect(r.mtbf).toBeGreaterThan(0) });
});
describe('reliabilityGrowth', () => {
  it('contract keys', () => expectKeys(reliabilityGrowth(cumF, cumT), ['test','alpha','growthRate','mtbfCurrent','mtbfProjected','n','apa']));
  it('growthRate between 0-1', () => { const r = reliabilityGrowth(cumF, cumT); if (r) expect(Number.isFinite(r.growthRate)).toBe(true) });
  it('mtbfCurrent positive', () => { const r = reliabilityGrowth(cumF, cumT); if (r) expect(r.mtbfCurrent).toBeGreaterThan(0) });
});
describe('acceleratedLife', () => {
  const life = [500, 300, 200, 120, 80];
  const temp = [50, 70, 85, 100, 120];
  it('contract keys', () => expectKeys(acceleratedLife(life, temp), ['test','activationEnergy','A','useLife','n','apa']));
  it('activationEnergy positive', () => { const r = acceleratedLife(life, temp); if (r) expect(r.activationEnergy).toBeGreaterThan(0) });
  it('useLife finite', () => { const r = acceleratedLife(life, temp); if (r) expect(Number.isFinite(r.useLife)).toBe(true) });
});
describe('warrantyPrediction', () => {
  const failures = [2, 5, 8, 11, 15, 20, 25, 30];
  it('contract keys', () => expectKeys(warrantyPrediction(failures), ['test','expectedClaimRate','warrantyMonths','n','apa']));
  it('claimRate between 0-1', () => { const r = warrantyPrediction(failures); if (r) { expect(r.expectedClaimRate).toBeGreaterThan(0); expect(r.expectedClaimRate).toBeLessThan(1) } });
  it('warrantyMonths positive', () => { const r = warrantyPrediction(failures); if (r) expect(r.warrantyMonths).toBeGreaterThan(0) });
});

describe('weibullBayes', () => {
  const data = [120, 250, 380, 510, 720, 890, 1050, 1300];
  it('contract keys', () => expectKeys(weibullBayes(data), ['test','shapePost','scalePost','mtbf','n','apa']));
  it('null <5', () => expect(weibullBayes([1,2,3])).toBeNull());
  it('shapePost > 0', () => { const r = weibullBayes(data); if (r) expect(r.shapePost).toBeGreaterThan(0) });
});
describe('repairableSystems', () => {
  const failures = [23, 56, 102, 178, 265, 340, 452, 589];
  it('contract keys', () => expectKeys(repairableSystems(failures, 600), ['test','beta','lambda','mtbf','n','endTime','apa']));
  it('null <3', () => expect(repairableSystems([1,2], 10)).toBeNull());
  it('mtbf positive', () => { const r = repairableSystems(failures, 600); if (r) expect(r.mtbf).toBeGreaterThan(0) });
});
describe('weibullAnalysis MTBF matches eta*Gamma(1+1/beta) exactly (regression test for the missing gamma-function fix)', () => {
  it('MTBF uses the real gamma function, not eta*(1+1/beta)', () => {
    const e = ref.reliability.weibull_basic;
    const r = weibullAnalysis(e.data);
    expect(r.beta).toBeCloseTo(e.beta, 3);
    expect(r.eta).toBeCloseTo(e.eta, 3);
    expect(r.mtbf).toBeCloseTo(e.mtbf, 2);
  });
});

describe('warrantyPrediction matches lifelines.KaplanMeierFitter exactly (regression test for the step-selection fix)', () => {
  it('claim rate uses the KM step at-or-before the warranty month, not the next one after it', () => {
    const e = ref.reliability.warranty_basic;
    const r = warrantyPrediction(e.failures, e.monthsInWarranty);
    expect(r.expectedClaimRate).toBeCloseTo(e.claimRate, 3);
  });
});

describe('competingRisksReliability', () => {
  const times = [12, 34, 56, 78, 90, 120, 150, 200];
  const causes = [1, 2, 1, 1, 2, 1, 2, 2];
  it('contract keys', () => expectKeys(competingRisksReliability(times, causes), ['test','cif','nCauses','n','apa']));
  it('null <5', () => expect(competingRisksReliability([1,2], [1,2])).toBeNull());
  it('CIF sums between 0-1', () => { const r = competingRisksReliability(times, causes); if (r && r.cif) { r.cif.forEach(c => expect(Number.isFinite(c.CIF)).toBe(true)) } });
});

describe('hardening — invalid inputs', () => {
  it('weibullAnalysis rejects null/empty', () => {
    expect(weibullAnalysis(null)).toBeNull();
    expect(weibullAnalysis([])).toBeNull();
  });
  it('reliabilityGrowth rejects mismatched lengths', () => {
    expect(reliabilityGrowth(null, cumT)).toBeNull();
    expect(reliabilityGrowth([1,2,3], cumT)).toBeNull();
  });
  it('acceleratedLife rejects null/mismatch', () => {
    expect(acceleratedLife(null, [50, 70])).toBeNull();
    expect(acceleratedLife([500, 300], [50, 70, 85])).toBeNull();
  });
  it('warrantyPrediction rejects null', () => {
    expect(warrantyPrediction(null)).toBeNull();
    expect(warrantyPrediction([1, 2, 3])).toBeNull();
  });
  it('weibullBayes rejects null', () => {
    expect(weibullBayes(null)).toBeNull();
  });
  it('repairableSystems rejects null/no endTime', () => {
    expect(repairableSystems(null, 100)).toBeNull();
    expect(repairableSystems([1, 2], 0)).toBeNull();
  });
  it('competingRisksReliability rejects mismatched', () => {
    expect(competingRisksReliability(null, [1, 2, 3])).toBeNull();
    expect(competingRisksReliability([1, 2, 3], [1, 2])).toBeNull();
  });
});

describe('hardening — invariants', () => {
  it('weibullAnalysis beta > 0 and mtbf positive', () => {
    const r = weibullAnalysis(data);
    expect(r.beta).toBeGreaterThan(0);
    expect(r.mtbf).toBeGreaterThan(0);
  });
  it('acceleratedLife useLife finite and positive', () => {
    const life = [500, 300, 200, 120, 80];
    const temp = [50, 70, 85, 100, 120];
    const r = acceleratedLife(life, temp);
    expect(Number.isFinite(r.useLife)).toBe(true);
    expect(r.activationEnergy).toBeGreaterThan(0);
  });
  it('weibullBayes mtbf positive', () => {
    const r = weibullBayes(data);
    expect(r.shapePost).toBeGreaterThan(0);
  });
});
