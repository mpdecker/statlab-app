import { describe, it, expect } from 'vitest';
import { morrisMethod, fastSensitivity, modelComparison, forecastCombination, sobolFirstOrder } from './sensitivity.js';
import { expectKeys } from './__fixtures__/helpers.js';

const X = [[1,2],[2,3],[3,4],[4,5],[5,6]];
const model = x => x[0] + x[1] * 2;

describe('morrisMethod', () => { it('contract keys', () => { const r = morrisMethod(model, X); if (r) expectKeys(r, ['test','effects','n','p','levels','apa']); }) });
describe('fastSensitivity', () => { it('contract keys', () => { const r = fastSensitivity(model, X); if (r) expectKeys(r, ['test','Si','n','p','apa']); }) });
describe('modelComparison', () => { it('contract keys', () => expectKeys(modelComparison(2.5, 3.0, 30, 2, 3), ['test','f','df1','df2','p','n','apa'])) });
describe('forecastCombination', () => { it('contract keys', () => expectKeys(forecastCombination([[1,2,3],[1.5,2.5,3.5]],[1,2,3]), ['test','mse','method','n','k','apa'])) });
describe('sobolFirstOrder', () => { it('contract keys', () => { const r = sobolFirstOrder(model, X); if (r) expectKeys(r, ['test','Si','n','p','apa']); }) });
