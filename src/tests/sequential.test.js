import { describe, it, expect } from 'vitest';
import { waldSPRT, obrienFleming, pocockBoundaries, groupSequential, lanDemets, conditionalPower } from './sequential.js';
import { expectKeys } from './__fixtures__/helpers.js';

const data = [0.1, 0.3, -0.2, 0.5, 0.2, 0.4, 0.6, -0.1, 0.3, 0.7, 0.2, 0.5, 0.1, 0.8, 0.4, 0.3, 0.6, 0.9, 0.2, 0.5];

describe('waldSPRT', () => {
  it('contract keys', () => expectKeys(waldSPRT(data, 0, 0.5), ['test', 'llr', 'stoppedAt', 'decision', 'h0', 'h1', 'alpha', 'beta', 'n', 'apa']));
  it('decision is string or null', () => { const r = waldSPRT(data, 0, 1); expect(r.decision === null || typeof r.decision === 'string').toBe(true); });
});

describe('obrienFleming', () => {
  it('contract keys', () => expectKeys(obrienFleming(3), ['test', 'boundaries', 'stages', 'alpha', 'apa']));
  it('boundaries decrease', () => { const r = obrienFleming(3); expect(r.boundaries[0].boundary).toBeGreaterThan(r.boundaries[2].boundary); });
});

describe('pocockBoundaries', () => {
  it('contract keys', () => expectKeys(pocockBoundaries(3), ['test', 'boundaries', 'stages', 'alpha', 'apa']));
});

describe('groupSequential', () => {
  it('contract keys', () => { const r = groupSequential(data, 3); if (r) expectKeys(r, ['test', 'results', 'method', 'stoppedAt', 'decision', 'n', 'stages', 'apa']); });
});

describe('lanDemets', () => {
  it('contract keys', () => { const r = lanDemets(data, 3); if (r) expectKeys(r, ['test', 'results', 'alpha', 'nStages', 'n', 'apa']); });
});

describe('conditionalPower', () => {
  it('contract keys', () => expectKeys(conditionalPower(data, 10, 20, 0.5), ['test', 'cp', 'nObserved', 'nPlanned', 'effectSize', 'apa']));
  it('cp in [0,1]', () => { const r = conditionalPower(data, 10, 20, 0.5); expect(r.cp).toBeGreaterThanOrEqual(0); expect(r.cp).toBeLessThanOrEqual(1); });
});

describe('sequential edge cases', () => {
  it('waldSPRT null <3', () => expect(waldSPRT(data.slice(0, 2), 0, 0.5)).toBeNull());
  it('obrienFleming null <2 stages', () => expect(obrienFleming(1)).toBeNull());
  it('pocockBoundaries null <2 stages', () => expect(pocockBoundaries(1)).toBeNull());
  it('groupSequential null <5', () => expect(groupSequential(data.slice(0, 3), 3)).toBeNull());
  it('lanDemets null <5', () => expect(lanDemets(data.slice(0, 3), 3)).toBeNull());
  it('conditionalPower null for invalid', () => expect(conditionalPower(data, 30, 20, 0.5)).toBeNull());
});
