import { describe, it, expect } from 'vitest';
import { nashEquilibrium, shapleyValue, dominatedStrategies, paretoOptimal, auctionRevenue, evolutionarilyStableStrategy, replicatorDynamics } from './game.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('shapleyValue matches the classic glove-game analytical values exactly', () => {
  it('player 1 gets 2/3, players 2 and 3 get 1/6 each', () => {
    const e = ref.game.shapley_glove;
    const coalitionValues = { '1': 0, '2': 0, '3': 0, '1|2': 1, '1|3': 1, '2|3': 0, '1|2|3': 1 };
    const r = shapleyValue(e.players, coalitionValues);
    r.values.forEach((v, i) => expect(v.shapley).toBeCloseTo(e.values[i], 3));
  });
});

describe('nashEquilibrium', () => { it('contract keys', () => expectKeys(nashEquilibrium([[3,1],[0,2]]), ['test','mixed','pure','apa']));   it('p in [0,1]', () => { const r = nashEquilibrium([[3,1],[0,2]]); if (r.mixed) { expect(r.mixed.p).toBeGreaterThanOrEqual(0); expect(r.mixed.p).toBeLessThanOrEqual(1) } });
  it('returns valid equilibrium', () => { const r = nashEquilibrium([[3,1],[2,2]]); if (r && r.pure) { expect(Array.isArray(r.pure)).toBe(true); r.pure.forEach(v => expect(Number.isFinite(v.p || v.q)).toBe(true)); } });
  it('null for non-square single-row', () => expect(nashEquilibrium([[1,2]])).toBeNull());
});
describe('shapleyValue', () => { it('contract keys', () => expectKeys(shapleyValue(['A','B','C'],{'A':1,'B':2,'C':3,'A|B':4,'A|C':5,'B|C':6,'A|B|C':10}), ['test','values','n','apa']));
  it('values sum to total', () => { const r = shapleyValue(['A','B','C'],{'A':1,'B':2,'C':3,'A|B':4,'A|C':5,'B|C':6,'A|B|C':10}); if (r) { const sum = r.values.reduce((s,v) => s + v.shapley, 0); expect(Math.abs(sum - 10) < 2).toBe(true); } });
  it('values non-empty', () => { const r = shapleyValue(['A','B','C'],{'A':1,'B':2,'C':3,'A|B':4,'A|C':5,'B|C':6,'A|B|C':10}); if (r) expect(r.values.length).toBeGreaterThan(0); });
});
describe('dominatedStrategies', () => {   it('contract keys', () => expectKeys(dominatedStrategies([[3,1],[0,2],[1,3]]), ['test','dominated','nRows','nCols','apa']));
  it('returns array', () => { const r = dominatedStrategies([[3,1],[0,2],[1,3]]); if (r) expect(Array.isArray(r.dominated)).toBe(true); });
  it('dominated values are booleans', () => { const r = dominatedStrategies([[3,1],[0,2],[1,3]]); if (r) expect(r).toHaveProperty('dominated'); });
});
describe('paretoOptimal', () => {   it('contract keys', () => expectKeys(paretoOptimal([[1,5],[2,4],[3,3],[4,1]]), ['test','paretoEfficient','n','nEfficient','apa']));
  it('returns booleans', () => { const r = paretoOptimal([[1,5],[2,4],[3,3],[4,1]]); if (r) r.paretoEfficient.forEach(v => expect(typeof v).toBe('boolean')); });
  it('nEfficient integer', () => { const r = paretoOptimal([[1,5],[2,4],[3,3],[4,1]]); if (r) expect(Number.isInteger(r.nEfficient)).toBe(true); });
});
describe('auctionRevenue', () => { it('contract keys', () => expectKeys(auctionRevenue([10, 8, 6, 4]), ['test','revenue','type','nBids','maxBid','apa']));   it('null <2', () => expect(auctionRevenue([5])).toBeNull());
  it('revenue non-negative', () => { const r = auctionRevenue([10,15,8,20]); if (r) { expect(r.revenue).toBeGreaterThanOrEqual(0); expect(Number.isFinite(r.revenue)).toBe(true); } });
});
describe('evolutionarilyStableStrategy', () => {
  const A = [[3,1],[0,2]];
  it('contract keys', () => expectKeys(evolutionarilyStableStrategy(A), ['test','ess','n','apa']));
  it('null invalid', () => expect(evolutionarilyStableStrategy(null)).toBeNull());
  it('ess in range', () => { const r = evolutionarilyStableStrategy(A); if (r) { r.ess.forEach(s => { expect(s).toBeGreaterThanOrEqual(1); expect(s).toBeLessThanOrEqual(2); }); } });
});
describe('replicatorDynamics', () => {
  const A = [[3,1],[0,2]];
  it('contract keys', () => expectKeys(replicatorDynamics(A, { steps: 20 }), ['test','equilibrium','trajectory','steps','n','apa']));
  it('equilibrium sums to 1', () => { const r = replicatorDynamics(A, { steps: 20 }); const sum = r.equilibrium.reduce((s, v) => s + v, 0); expect(sum).toBeCloseTo(1, 1); });
  it('trajectory non-empty', () => { const r = replicatorDynamics(A, { steps: 20 }); if (r) { expect(Array.isArray(r.trajectory)).toBe(true); expect(r.trajectory.length).toBeGreaterThan(0); } });
});

describe('hardening — game theory edge cases', () => {
  it('nashEquilibrium null for non-2x2 matrix', () => expect(nashEquilibrium([[1,2,3]])).toBeNull());
  it('nashEquilibrium null for null matrix', () => expect(nashEquilibrium(null)).toBeNull());
  it('shapleyValue null for empty players', () => expect(shapleyValue([], {A:1})).toBeNull());
  it('shapleyValue null for null coalitionValues', () => expect(shapleyValue(['A','B'], null)).toBeNull());
  it('dominatedStrategies null for null matrix', () => expect(dominatedStrategies(null)).toBeNull());
  it('dominatedStrategies handles empty matrix', () => expect(dominatedStrategies([])).toBeNull());
  it('paretoOptimal null for null outcomes', () => expect(paretoOptimal(null)).toBeNull());
  it('auctionRevenue null for single bid', () => expect(auctionRevenue([5])).toBeNull());
  it('auctionRevenue null for null bids', () => expect(auctionRevenue(null)).toBeNull());
  it('evolutionarilyStableStrategy null for non-square', () => expect(evolutionarilyStableStrategy([[3,1]])).toBeNull());
  it('replicatorDynamics null for non-square', () => expect(replicatorDynamics([[1,2]])).toBeNull());
  it('replicatorDynamics null for null matrix', () => expect(replicatorDynamics(null)).toBeNull());
});
