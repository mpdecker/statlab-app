import { describe, it, expect } from 'vitest';
import { randomizedBlocks, simons2Stage, sampleSizeReestimation, stratifiedPermutedBlocks, fisherExactDesign, adaptiveDesign } from './trials.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rt = ref.trials;

describe('randomizedBlocks', () => {
  it('contract keys', () => expectKeys(randomizedBlocks(Array(12).fill('A'), ['T', 'C']), ['test', 'assignment', 'counts', 'blockSize', 'n', 'nTreatments', 'apa']));
  it('assignment length correct', () => { const r = randomizedBlocks(Array(10).fill('A'), ['T', 'C']); expect(r.assignment).toHaveLength(10); });
  it('nTreatments matches', () => { const r = randomizedBlocks(Array(12).fill('A'), ['T', 'C']); expect(r.nTreatments).toBe(2); });
});

describe('simons2Stage', () => {
  it('null p0>=p1', () => expect(simons2Stage(0.5, 0.3)).toBeNull());
  it('contract keys', () => expectKeys(simons2Stage(0.2, 0.4), ['test', 'n1', 'n2', 'r1', 'r', 'p0', 'p1', 'alpha', 'beta', 'apa']));
  it('n1 positive', () => { const r = simons2Stage(0.2, 0.4); expect(r.n1).toBeGreaterThan(0); });
  it('parameters match oracle', () => { const r = simons2Stage(0.2, 0.4); expect(r.n1).toBe(rt.simons2Stage_basic.n1); expect(r.n2).toBe(rt.simons2Stage_basic.n2); expect(r.r1).toBe(rt.simons2Stage_basic.r1); expect(r.r).toBe(rt.simons2Stage_basic.r); });
});

describe('sampleSizeReestimation', () => {
  it('contract keys', () => expectKeys(sampleSizeReestimation([1, 2, 3, 4, 5], 0), ['test', 'nObserved', 'nNeeded', 'ratio', 'stage', 'apa']));
  it('nNeeded positive', () => { const r = sampleSizeReestimation([1, 2, 3, 4, 5], 0); if (r) expect(r.nNeeded).toBeGreaterThan(0); });
  it('ratio finite', () => { const r = sampleSizeReestimation([1, 2, 3, 4, 5], 0); if (r) expect(Number.isFinite(r.ratio)).toBe(true); });
  it('nNeeded matches oracle', () => { const r = sampleSizeReestimation([1,2,3,4,5], 0); expect(r.nNeeded).toBe(rt.sampleSizeReestimation_basic.nNeeded); });
  it('nObserved matches oracle', () => { const r = sampleSizeReestimation([1,2,3,4,5], 0); expect(r.nObserved).toBe(rt.sampleSizeReestimation_basic.nObserved); });
});

describe('stratifiedPermutedBlocks', () => {
  it('contract keys', () => expectKeys(stratifiedPermutedBlocks(['A', 'A', 'B', 'B', 'A']), ['test', 'assignment', 'nStrata', 'n', 'apa']));
  it('assignment non-empty', () => { const r = stratifiedPermutedBlocks(['A', 'A', 'B', 'B', 'A']); if (r) expect(r.assignment.length).toBeGreaterThan(0); });
  it('n matches input', () => { const r = stratifiedPermutedBlocks(['A', 'A', 'B', 'B', 'A']); if (r) expect(r.n).toBe(5); });
});

describe('fisherExactDesign', () => {
  it('contract keys', () => expectKeys(fisherExactDesign(5, 10, 3, 20), ['test', 'or', 'rr', 'rd', 'n', 'apa']));
  it('null negative', () => expect(fisherExactDesign(-1, 10, 3, 20)).toBeNull());
  it('or positive', () => { const r = fisherExactDesign(5, 10, 3, 20); expect(r.or).toBeGreaterThan(0); });
  it('or matches oracle', () => { const r = fisherExactDesign(5, 10, 3, 20); expect(r.or).toBeCloseTo(rt.fisherExactDesign_basic.or, 4); });
  it('rr matches oracle', () => { const r = fisherExactDesign(5, 10, 3, 20); expect(r.rr).toBeCloseTo(rt.fisherExactDesign_basic.rr, 4); });
  it('rd matches oracle', () => { const r = fisherExactDesign(5, 10, 3, 20); expect(r.rd).toBeCloseTo(rt.fisherExactDesign_basic.rd, 4); });
});

describe('trials edge cases', () => {
  it('randomizedBlocks null for empty', () => expect(randomizedBlocks([], ['T', 'C'])).toBeNull());
  it('simons2Stage returns n1 < n2', () => { const r = simons2Stage(0.2, 0.4); expect(r.n1).toBeLessThan(r.n2); });
  it('sampleSizeReestimation null <5', () => expect(sampleSizeReestimation([1, 2], 0)).toBeNull());
  it('stratifiedPermutedBlocks null for empty', () => expect(stratifiedPermutedBlocks([])).toBeNull());
  it('fisherExactDesign null for all zero', () => expect(fisherExactDesign(0, 0, 0, 0)).toBeNull());
});

describe('adaptiveDesign', () => {
  it('contract keys', () => expectKeys(adaptiveDesign(0.5, 0.8, 0.05, { maxStages: 3 }), ['test','stages','finalN','maxStages','alpha','apa']));
  it('null <= 0 effect', () => expect(adaptiveDesign(0, 0.8)).toBeNull());
  it('stages match maxStages', () => { const r = adaptiveDesign(0.6, 0.8, 0.05, { maxStages: 3 }); expect(r.stages.length).toBe(3); });
});

describe('hardening — invalid inputs', () => {
  it('randomizedBlocks null for null strata', () => expect(randomizedBlocks(null, ['T', 'C'])).toBeNull());
  it('randomizedBlocks null for null treatments', () => expect(randomizedBlocks(Array(12).fill('A'), null)).toBeNull());
  it('simons2Stage null for p0 > p1', () => expect(simons2Stage(0.5, 0.3)).toBeNull());
  it('simons2Stage null for null', () => expect(simons2Stage(null, 0.4)).toBeNull());
  it('sampleSizeReestimation null for null', () => expect(sampleSizeReestimation(null, 0)).toBeNull());
  it('stratifiedPermutedBlocks null for null', () => expect(stratifiedPermutedBlocks(null)).toBeNull());
  it('fisherExactDesign handles null gracefully', () => expect(fisherExactDesign(null, 10, 3, 20)).not.toBeNull());
  it('adaptiveDesign null for zero effect', () => expect(adaptiveDesign(0, 0.8)).toBeNull());
  it('adaptiveDesign null for null', () => expect(adaptiveDesign(null, 0.8)).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('randomizedBlocks assignment is balanced for equal treatments', () => {
    const r = randomizedBlocks(Array(20).fill('A'), ['T', 'C']);
    if (r) {
      const tCount = r.assignment.filter(a => a === 'T').length;
      const cCount = r.assignment.filter(a => a === 'C').length;
      expect(tCount).toBe(cCount);
    }
  });
  it('simons2Stage n1 < n2 for typical design', () => {
    const r = simons2Stage(0.2, 0.4);
    if (r) expect(r.n1).toBeLessThan(r.n2);
  });
  it('sampleSizeReestimation nNeeded positive', () => {
    const r = sampleSizeReestimation([1, 2, 3, 4, 5], 0);
    if (r) expect(r.nNeeded).toBeGreaterThan(0);
  });
  it('stratifiedPermutedBlocks n matches input', () => {
    const r = stratifiedPermutedBlocks(['A', 'A', 'B', 'B', 'A']);
    if (r) expect(r.n).toBe(5);
  });
  it('fisherExactDesign OR positive for valid counts', () => {
    const r = fisherExactDesign(5, 10, 3, 20);
    if (r) expect(r.or).toBeGreaterThan(0);
  });
  it('adaptiveDesign stages count matches maxStages', () => {
    const r = adaptiveDesign(0.6, 0.8, 0.05, { maxStages: 3 });
    if (r) expect(r.stages.length).toBe(3);
  });
});
