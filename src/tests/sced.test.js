import { describe, it, expect } from 'vitest';
import { tauU, pnd, pem, nap, randomizationTest } from './sced.js';
import { expectKeys } from './__fixtures__/helpers.js';

const base = [1, 2, 2, 3, 2, 3, 2, 1];
const interv = [4, 5, 4, 6, 5, 7, 6, 5];

describe('tauU', () => { it('contract keys', () => expectKeys(tauU(base, interv), ['test', 'tau', 'z', 'p', 'nB', 'nI', 'apa'])); it('null<5', () => expect(tauU([1,2],[3,4])).toBeNull())});
describe('pnd', () => { it('contract keys', () => expectKeys(pnd(base, interv), ['test', 'pnd', 'nB', 'nI', 'apa'])); it('null<5', () => expect(pnd([1,2],[3,4,5])).toBeNull())});
describe('pem', () => { it('contract keys', () => expectKeys(pem(base, interv), ['test', 'pem', 'nB', 'nI', 'apa']))});
describe('nap', () => { it('contract keys', () => expectKeys(nap(base, interv), ['test', 'nap', 'nB', 'nI', 'apa'])); it('NAP in [0,1]', () => { const r = nap(base, interv); expect(r.nap).toBeGreaterThanOrEqual(0); expect(r.nap).toBeLessThanOrEqual(1) })});
describe('randomizationTest', () => { it('contract keys', () => expectKeys(randomizationTest(base, interv, {nPerm:50}), ['test', 'observedDiff', 'p', 'nPerm', 'nB', 'nI', 'apa']))});
