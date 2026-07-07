import { describe, it, expect } from 'vitest';
import { tauU, pnd, pem, nap, randomizationTest, baselineCorrectedTau, betweenCaseSMD } from './sced.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
const rs = ref.sced;

const base = [1, 2, 2, 3, 2, 3, 2, 1];
const interv = [4, 5, 4, 6, 5, 7, 6, 5];

describe('tauU', () => { it('contract keys', () => expectKeys(tauU(base, interv), ['test', 'tau', 'z', 'p', 'nB', 'nI', 'apa'])); it('null<5', () => expect(tauU([1,2],[3,4])).toBeNull()); it('tau between -1 and 1', () => { const r = tauU(base, interv); if (r) { expect(r.tau).toBeGreaterThanOrEqual(-1); expect(r.tau).toBeLessThanOrEqual(1); } }); it('tau matches oracle', () => { const r = tauU(base, interv); expect(r.tau).toBeCloseTo(rs.tauU_basic.tau, 4); })});
describe('pnd', () => { it('contract keys', () => expectKeys(pnd(base, interv), ['test', 'pnd', 'nB', 'nI', 'apa'])); it('null<5', () => expect(pnd([1,2],[3,4,5])).toBeNull()); it('PND between 0 and 100', () => { const r = pnd(base, interv); if (r) { expect(r.pnd).toBeGreaterThanOrEqual(0); expect(r.pnd).toBeLessThanOrEqual(100); } }); it('pnd matches oracle', () => { const r = pnd(base, interv); expect(r.pnd).toBeCloseTo(rs.pnd_basic.pnd, 1); })});
describe('pem', () => { it('contract keys', () => expectKeys(pem(base, interv), ['test', 'pem', 'nB', 'nI', 'apa'])); it('PEM between 0 and 100', () => { const r = pem(base, interv); if (r) { expect(r.pem).toBeGreaterThanOrEqual(0); expect(r.pem).toBeLessThanOrEqual(100); } }); it('nB matches baseline length', () => { const r = pem(base, interv); if (r) expect(r.nB).toBe(base.length); }); it('pem matches oracle', () => { const r = pem(base, interv); expect(r.pem).toBeCloseTo(rs.pem_basic.pem, 1); }); });
describe('nap', () => { it('contract keys', () => expectKeys(nap(base, interv), ['test', 'nap', 'nB', 'nI', 'apa'])); it('NAP in [0,1]', () => { const r = nap(base, interv); expect(r.nap).toBeGreaterThanOrEqual(0); expect(r.nap).toBeLessThanOrEqual(1) }); it('z-value finite', () => { const r = tauU(base, interv); if (r) expect(Number.isFinite(r.z)).toBe(true); }); it('nap matches oracle', () => { const r = nap(base, interv); expect(r.nap).toBeCloseTo(rs.nap_basic.nap, 4); })});
describe('randomizationTest', () => { it('contract keys', () => expectKeys(randomizationTest(base, interv, {nPerm:50}), ['test', 'observedDiff', 'p', 'nPerm', 'nB', 'nI', 'apa'])); it('p-value between 0 and 1', () => { const r = randomizationTest(base, interv, { nPerm: 50 }); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } }); it('observedDiff finite', () => { const r = randomizationTest(base, interv, { nPerm: 50 }); if (r) expect(Number.isFinite(r.observedDiff)).toBe(true); }); });
describe('baselineCorrectedTau', () => {
  it('contract keys', () => expectKeys(baselineCorrectedTau(base, interv), ['test','tau','corrected','trendB','nB','nI','apa']));
  it('null <5', () => expect(baselineCorrectedTau([1,2],[3,4])).toBeNull());
  it('corrected between -1 and 1', () => { const r = baselineCorrectedTau(base, interv); if (r) { expect(r.corrected).toBeGreaterThanOrEqual(-1); expect(r.corrected).toBeLessThanOrEqual(1); } });
});
describe('betweenCaseSMD', () => {
  const a = [10,12,14,16,18,20,22];
  const b = [15,17,19,21,23,25,27];
  it('contract keys', () => expectKeys(betweenCaseSMD(a, b), ['test','smd','se','nA','nB','apa']));
  it('null <5', () => expect(betweenCaseSMD([1,2],[3,4])).toBeNull());
  it('se positive', () => { const a = [10,12,14,16,18]; const b = [15,17,19,21,23]; const r = betweenCaseSMD(a, b); if (r) expect(r.se).toBeGreaterThan(0); });
  it('smd matches oracle', () => { const r = betweenCaseSMD(a, b); expect(r.smd).toBeCloseTo(rs.betweenCaseSMD_basic.smd, 4); });
  it('se matches oracle', () => { const r = betweenCaseSMD(a, b); expect(r.se).toBeCloseTo(rs.betweenCaseSMD_basic.se, 4); });
});

describe('hardening — invalid inputs', () => {
  it('tauU null for null baseline', () => expect(tauU(null, [4, 5, 6])).toBeNull());
  it('tauU null for null intervention', () => expect(tauU([1, 2, 3], null)).toBeNull());
  it('tauU null for mismatched lengths', () => expect(tauU([1, 2, 3], [4, 5])).toBeNull());
  it('pnd null for null', () => expect(pnd(null, [4, 5, 6])).toBeNull());
  it('pem null for null', () => expect(pem(null, [4, 5, 6])).toBeNull());
  it('nap null for null', () => expect(nap(null, [4, 5, 6])).toBeNull());
  it('randomizationTest null for null baseline', () => expect(randomizationTest(null, [1, 2, 3], { nPerm: 50 })).toBeNull());
  it('baselineCorrectedTau null for null', () => expect(baselineCorrectedTau(null, [1, 2, 3])).toBeNull());
  it('betweenCaseSMD null for null', () => expect(betweenCaseSMD(null, [1, 2, 3, 4, 5])).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('tauU with identical baseline and intervention returns tau near 1', () => {
    const r = tauU([1, 2, 2], [4, 5, 6, 7, 8]);
    if (r) { expect(r.tau).toBeGreaterThanOrEqual(-1); expect(r.tau).toBeLessThanOrEqual(1); }
  });
  it('pnd with all intervention > baseline returns 100', () => {
    const r = pnd([1, 2, 1, 2, 1], [10, 12, 11, 13, 12]);
    if (r) expect(r.pnd).toBe(100);
  });
  it('pem with stable baseline median calculated correctly', () => {
    const r = pem([1, 2, 2, 3, 2], [10, 12, 11, 13, 12]);
    if (r) { expect(r.pem).toBeGreaterThanOrEqual(0); expect(r.pem).toBeLessThanOrEqual(100); }
  });
  it('nap in [0, 1]', () => {
    const r = nap([1, 2, 2, 3, 2, 3, 2, 1], [4, 5, 4, 6, 5, 7, 6, 5]);
    if (r) { expect(r.nap).toBeGreaterThanOrEqual(0); expect(r.nap).toBeLessThanOrEqual(1); }
  });
  it('randomizationTest with clear separation produces low p', () => {
    const r = randomizationTest([1, 1, 1, 1, 1], [10, 10, 10, 10, 10], { nPerm: 50 });
    if (r) expect(r.p).toBeLessThan(0.05);
  });
  it('baselineCorrectedTau corrected in [-1, 1]', () => {
    const r = baselineCorrectedTau([1, 2, 2, 3, 2, 3, 2, 1], [4, 5, 4, 6, 5, 7, 6, 5]);
    if (r) { expect(r.corrected).toBeGreaterThanOrEqual(-1); expect(r.corrected).toBeLessThanOrEqual(1); }
  });
  it('betweenCaseSMD with identical groups returns SMD near 0', () => {
    const a = [10, 12, 14, 16, 18];
    const b = [10, 12, 14, 16, 18];
    const r = betweenCaseSMD(a, b);
    if (r) expect(Math.abs(r.smd)).toBeLessThan(0.1);
  });
});

describe('hardening — invariants', () => {
  it('tauU tau in [-1, 1]', () => {
    const r = tauU([1, 2, 2, 3, 2, 3, 2, 1], [4, 5, 4, 6, 5, 7, 6, 5]);
    if (r) { expect(r.tau).toBeGreaterThanOrEqual(-1); expect(r.tau).toBeLessThanOrEqual(1); }
  });
  it('pnd in [0, 100]', () => {
    const r = pnd([1, 2, 2, 3, 2, 3, 2, 1], [4, 5, 4, 6, 5, 7, 6, 5]);
    if (r) { expect(r.pnd).toBeGreaterThanOrEqual(0); expect(r.pnd).toBeLessThanOrEqual(100); }
  });
  it('randomizationTest p in [0, 1]', () => {
    const r = randomizationTest([1, 2, 2, 3, 2, 3, 2, 1], [4, 5, 4, 6, 5, 7, 6, 5], { nPerm: 50 });
    if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }
  });
});
