import { describe, it, expect } from 'vitest';
import { shannonDiversity, simpsonDiversity, chao1Richness, speciesAccumulation, rarefaction } from './ecology.js';
import { expectKeys } from './__fixtures__/helpers.js';

const c = [5, 3, 2, 1, 1, 0, 0, 0];

describe('shannonDiversity', () => { it('contract keys', () => expectKeys(shannonDiversity(c), ['test','shannon','evenness','richness','n','apa'])); it('null<2', () => expect(shannonDiversity([3])).toBeNull()) });
describe('simpsonDiversity', () => { it('contract keys', () => expectKeys(simpsonDiversity(c), ['test','simpson','invSimpson','n','apa'])); it('Simpson in [0,1]', () => { const r = simpsonDiversity(c); expect(r.simpson).toBeGreaterThanOrEqual(0); expect(r.simpson).toBeLessThanOrEqual(1) }) });
describe('chao1Richness', () => { it('contract keys', () => expectKeys(chao1Richness(c), ['test','chao1','sobs','singletons','doubletons','apa'])) });
describe('speciesAccumulation', () => { it('contract keys', () => expectKeys(speciesAccumulation(['A','B','A','C','B','D']), ['test','curve','n','apa'])) });
describe('rarefaction', () => { it('contract keys', () => expectKeys(rarefaction(['A','B','A','C','B','D'], 4), ['test','expectedSpecies','sampleSize','nObserved','sobs','apa'])) });
