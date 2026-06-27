import { describe, it, expect } from 'vitest';
import { hawkesIntensity, hawkesFit, coxProcess, interArrivalTest, burstinessIndex } from './pointProcess.js';
import { expectKeys } from './__fixtures__/helpers.js';

const events = [1, 2, 3, 5, 6, 7, 10, 11, 12, 15, 16, 18, 20, 22, 25];

describe('hawkesIntensity', () => { it('contract keys', () => expectKeys(hawkesIntensity(events), ['test','intensity','mu','alpha','beta','n','apa'])); it('null<5', () => expect(hawkesIntensity([1,2,3])).toBeNull()) });
describe('hawkesFit', () => { it('contract keys', () => expectKeys(hawkesFit(events), ['test','parameters','n','kernel','apa'])); it('null<10', () => expect(hawkesFit([1,2,3])).toBeNull()) });
describe('coxProcess', () => { it('contract keys', () => expectKeys(coxProcess([[0.5,0.3],[0.8,0.2]], {n:20}), ['test','points','nEvents','n','apa'])) });
describe('interArrivalTest', () => { it('contract keys', () => expectKeys(interArrivalTest(events), ['test','cv','clustering','n','apa'])); it('null<10', () => expect(interArrivalTest([1,2])).toBeNull()) });
describe('burstinessIndex', () => { it('contract keys', () => expectKeys(burstinessIndex(events), ['test','B','n','apa'])); it('B in [-1,1]', () => { const r = burstinessIndex(events); expect(r.B).toBeGreaterThanOrEqual(-1); expect(r.B).toBeLessThanOrEqual(1) }) });
