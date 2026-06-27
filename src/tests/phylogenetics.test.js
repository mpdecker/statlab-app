import { describe, it, expect } from 'vitest';
import { independentContrasts, pagelsLambda, blombergK, phylogeneticSignal, picCorrelation } from './phylogenetics.js';
import { expectKeys } from './__fixtures__/helpers.js';

const trait = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const trait2 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const tree = [1, 2, 3, 4, 5];

describe('independentContrasts', () => { it('contract keys', () => expectKeys(independentContrasts(tree, trait), ['test', 'contrasts', 'mean', 't', 'n', 'apa'])); it('null<5', () => expect(independentContrasts([1,2], [1,2])).toBeNull())});
describe('pagelsLambda', () => { it('contract keys', () => expectKeys(pagelsLambda(trait, tree), ['test', 'lambda', 'n', 'apa'])); it('null<5', () => expect(pagelsLambda([1,2], tree)).toBeNull())});
describe('blombergK', () => { it('contract keys', () => expectKeys(blombergK(trait, tree), ['test', 'K', 'n', 'apa'])); it('null<5', () => expect(blombergK([1,2], tree)).toBeNull())});
describe('phylogeneticSignal', () => { it('contract keys', () => expectKeys(phylogeneticSignal(trait, tree), ['test', 'statistic', 'p', 'method', 'n', 'apa']))});
describe('picCorrelation', () => { it('contract keys', () => expectKeys(picCorrelation(trait, trait2, tree), ['test', 'r', 'n', 'apa'])); it('null mismatch', () => expect(picCorrelation([1,2],[3,4,5], tree)).toBeNull())});
