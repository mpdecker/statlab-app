import { describe, it, expect } from 'vitest';
import { tobitModel, heckmanSelection, bivariateProbit, psmCaliper, localLinearIV } from './econometric.js';
import { expectKeys } from './__fixtures__/helpers.js';

const d = []; for (let i = 0; i < 30; i++) d.push({ y: Math.max(0, i * 2), x1: i, x2: i % 2, sel: i > 10 ? 1 : 0, z1: i % 3, y1: i % 2, y2: (i + 1) % 2 });

describe('tobitModel', () => {
  it('contract keys', () => expectKeys(tobitModel(d, 'y', ['x1', 'x2']), ['test', 'coefficients', 'sigma', 'n', 'nCensored', 'apa']));
  it('null <20', () => expect(tobitModel(d.slice(0, 10), 'y', ['x1'])).toBeNull());
});

describe('heckmanSelection', () => { it('contract keys', () => expectKeys(heckmanSelection(d, 'y', ['x1'], 'sel', ['z1']), ['test', 'imr', 'n', 'nSelected', 'apa'])); });
describe('bivariateProbit', () => { it('contract keys', () => expectKeys(bivariateProbit(d, 'y1', 'y2', ['x1']), ['test', 'rho', 'n', 'nBoth', 'apa'])); });
describe('psmCaliper', () => { it('contract keys', () => { const r = psmCaliper(d, 'sel', 'y', ['x1', 'x2']); if (r) expectKeys(r, ['test', 'att', 'nTreated', 'nControl', 'caliper', 'nMatched', 'apa']); }); });
describe('localLinearIV', () => { it('contract keys', () => expectKeys(localLinearIV(d, 'x1', 'y', 'z1'), ['test', 'late', 'firstStage', 'reducedForm', 'bandwidth', 'n', 'apa'])); });
