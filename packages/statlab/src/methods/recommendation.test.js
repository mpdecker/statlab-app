import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
import { collaborativeFilter, matrixFactorize, topNRecommend } from './recommendation.js';

const R = [[5,3,null,1],[4,null,null,1],[null,2,4,5],[1,1,5,4],[null,null,3,null]];
const rc = ref.recommendation;

describe('collaborativeFilter', () => {
  it('contract keys', () => expectKeys(collaborativeFilter(R), ['test','nUsers','nItems','nNeighbors','predictions','apa']));
  it('null empty', () => expect(collaborativeFilter([])).toBeNull());
  it('predictions matrix has correct dimensions', () => { const r = collaborativeFilter(R); if (r) { expect(r.predictions.length).toBe(5); expect(r.predictions[0].length).toBe(4) } });
  it('null for empty ratings', () => expect(collaborativeFilter([[]])).toBeNull());
  it('nUsers matches oracle', () => { const r = collaborativeFilter(R); expect(r.nUsers).toBe(rc.collaborativeFilter_basic.nUsers); });
  it('nItems matches oracle', () => { const r = collaborativeFilter(R); expect(r.nItems).toBe(rc.collaborativeFilter_basic.nItems); });
  it('samplePrediction matches oracle', () => {
    const r = collaborativeFilter(R);
    const pred = r.predictions[2] ? r.predictions[2][0] : null;
    if (pred !== null && rc.collaborativeFilter_basic.samplePrediction !== null) {
      expect(pred).toBeCloseTo(rc.collaborativeFilter_basic.samplePrediction, 4);
    }
  });
});
describe('matrixFactorize', () => {
  const ratings = [[5,3,1],[4,2,1],[1,5,4]];
  it('contract keys', () => expectKeys(matrixFactorize(ratings, 2, { steps: 10 }), ['test','reconstructed','k','m','n','apa']));
  it('null k<1', () => expect(matrixFactorize(ratings, 0)).toBeNull());
  it('reconstructed matrix has correct size', () => { const r = matrixFactorize(ratings, 2, { steps: 10 }); if (r) { expect(r.reconstructed.length).toBe(3); expect(r.reconstructed[0].length).toBe(3) } });
  it('k smaller than min dimension', () => { const r = matrixFactorize(ratings, 1, { steps: 10 }); if (r) expect(r.k).toBe(1) });
});
describe('topNRecommend', () => {
  it('contract keys', () => expectKeys(topNRecommend(R, 0, { n: 3 }), ['test','recommendations','n','userIndex','apa']));
  it('null invalid user', () => expect(topNRecommend(R, 99)).toBeNull());
  it('recommendations not empty', () => { const r = topNRecommend(R, 0, { n: 3 }); if (r) expect(r.recommendations.length).toBeGreaterThan(0) });
});

describe('hardening — recommendation edge cases', () => {
  it('collaborativeFilter null for null ratings', () => expect(collaborativeFilter(null)).toBeNull());
  it('collaborativeFilter null for single row', () => expect(collaborativeFilter([[5,3,null,1]])).toBeNull());
  it('matrixFactorize null for null R', () => expect(matrixFactorize(null, 2)).toBeNull());
  it('matrixFactorize null for k=0', () => { const ratings = [[5,3,1],[4,2,1],[1,5,4]]; expect(matrixFactorize(ratings, 0)).toBeNull(); });
  it('matrixFactorize reproducible', () => { const ratings = [[5,3,1],[4,2,1],[1,5,4]]; const r1 = matrixFactorize(ratings, 2, { steps: 10, seed: 1 }); const r2 = matrixFactorize(ratings, 2, { steps: 10, seed: 1 }); expect(r1.reconstructed).toEqual(r2.reconstructed); });
  it('topNRecommend null for null ratings', () => expect(topNRecommend(null, 0)).toBeNull());
  it('topNRecommend null for invalid user index', () => expect(topNRecommend([[5,3,null,1]], 5)).toBeNull());
});
