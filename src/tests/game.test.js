import { describe, it, expect } from 'vitest';
import { nashEquilibrium, shapleyValue, dominatedStrategies, paretoOptimal, auctionRevenue } from './game.js';
import { expectKeys } from './__fixtures__/helpers.js';

describe('nashEquilibrium', () => { it('contract keys', () => expectKeys(nashEquilibrium([[3,1],[0,2]]), ['test','mixed','pure','apa'])); it('p in [0,1]', () => { const r = nashEquilibrium([[3,1],[0,2]]); if (r.mixed) { expect(r.mixed.p).toBeGreaterThanOrEqual(0); expect(r.mixed.p).toBeLessThanOrEqual(1) } }) });
describe('shapleyValue', () => { it('contract keys', () => expectKeys(shapleyValue(['A','B','C'],{'A':1,'B':2,'C':3,'A|B':4,'A|C':5,'B|C':6,'A|B|C':10}), ['test','values','n','apa'])) });
describe('dominatedStrategies', () => { it('contract keys', () => expectKeys(dominatedStrategies([[3,1],[0,2],[1,3]]), ['test','dominated','nRows','nCols','apa'])) });
describe('paretoOptimal', () => { it('contract keys', () => expectKeys(paretoOptimal([[1,5],[2,4],[3,3],[4,1]]), ['test','paretoEfficient','n','nEfficient','apa'])) });
describe('auctionRevenue', () => { it('contract keys', () => expectKeys(auctionRevenue([10, 8, 6, 4]), ['test','revenue','type','nBids','maxBid','apa'])); it('null <2', () => expect(auctionRevenue([5])).toBeNull()) });
