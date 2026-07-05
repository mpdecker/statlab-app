import { describe, it, expect } from 'vitest';
import { tauU, pnd, pem, nap, randomizationTest, baselineCorrectedTau, betweenCaseSMD } from './sced.js';
import { expectKeys } from './__fixtures__/helpers.js';

const base = [1, 2, 2, 3, 2, 3, 2, 1];
const interv = [4, 5, 4, 6, 5, 7, 6, 5];

describe('tauU', () => { it('contract keys', () => expectKeys(tauU(base, interv), ['test', 'tau', 'z', 'p', 'nB', 'nI', 'apa'])); it('null<5', () => expect(tauU([1,2],[3,4])).toBeNull()); it('tau between -1 and 1', () => { const r = tauU(base, interv); if (r) { expect(r.tau).toBeGreaterThanOrEqual(-1); expect(r.tau).toBeLessThanOrEqual(1); } })});
describe('pnd', () => { it('contract keys', () => expectKeys(pnd(base, interv), ['test', 'pnd', 'nB', 'nI', 'apa'])); it('null<5', () => expect(pnd([1,2],[3,4,5])).toBeNull()); it('PND between 0 and 100', () => { const r = pnd(base, interv); if (r) { expect(r.pnd).toBeGreaterThanOrEqual(0); expect(r.pnd).toBeLessThanOrEqual(100); } })});
describe('pem', () => { it('contract keys', () => expectKeys(pem(base, interv), ['test', 'pem', 'nB', 'nI', 'apa'])); it('PEM between 0 and 100', () => { const r = pem(base, interv); if (r) { expect(r.pem).toBeGreaterThanOrEqual(0); expect(r.pem).toBeLessThanOrEqual(100); } }); it('nB matches baseline length', () => { const r = pem(base, interv); if (r) expect(r.nB).toBe(base.length); }); });
describe('nap', () => { it('contract keys', () => expectKeys(nap(base, interv), ['test', 'nap', 'nB', 'nI', 'apa'])); it('NAP in [0,1]', () => { const r = nap(base, interv); expect(r.nap).toBeGreaterThanOrEqual(0); expect(r.nap).toBeLessThanOrEqual(1) }); it('z-value finite', () => { const r = tauU(base, interv); if (r) expect(Number.isFinite(r.z)).toBe(true); })});
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
});
