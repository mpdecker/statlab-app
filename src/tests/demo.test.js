import { describe, it, expect } from 'vitest';
import { lifeTable, leeCarter, populationProjection, lifeExpectancy, populationGrowth } from './demo.js';
import { expectKeys } from './__fixtures__/helpers.js';

const mx = [0.01, 0.02, 0.03, 0.05, 0.08];
const logMx = [[-5,-3.5,-3,-2.5,-2],[-4.8,-3.4,-2.9,-2.4,-1.9],[-4.6,-3.3,-2.8,-2.3,-1.8]];

describe('lifeTable', () => { it('contract keys', () => { const r = lifeTable(mx); if (r) expectKeys(r, ['test','summary','n','apa']); }); it('null <5', () => expect(lifeTable([1,2,3])).toBeNull()) });
describe('leeCarter', () => { it('contract keys', () => expectKeys(leeCarter(logMx, [2000,2001,2002], [0,1,2,3,4]), ['test','ax','bx','kt','nYears','nAges','apa'])) });
describe('populationProjection', () => { it('contract keys', () => expectKeys(populationProjection([100,80,60,40,20],0.1,[0.1,0.1,0.1,0.2,0.5]), ['test','projection','nYears','nCohorts','apa'])) });
describe('lifeExpectancy', () => { it('contract keys', () => expectKeys(lifeExpectancy({ ex: [75, 65, 55, 45, 35], n: 5 }), ['test','e0','n','apa'])) });
describe('populationGrowth', () => { it('contract keys', () => expectKeys(populationGrowth([[100,80],[105,85],[112,90]]), ['test','growthRate','nPeriods','t','apa'])) });
