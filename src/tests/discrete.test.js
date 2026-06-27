import { describe, it, expect } from 'vitest';
import { conditionalLogit, iiaTest, mixedLogit, wtpSpace, nestedLogit } from './discrete.js';
import { expectKeys } from './__fixtures__/helpers.js';

const d = []; for (let i = 0; i < 20; i++) d.push({ y: i % 3, x1: i, x2: i % 2, price: 10 + i, grp: Math.floor(i/3), alt: i % 3, nest: i % 2 ? 'A' : 'B' });

describe('conditionalLogit', () => { it('contract keys', () => expectKeys(conditionalLogit(d, 'y', ['x1', 'x2'], 'grp'), ['test', 'coefficients', 'n', 'nGroups', 'apa'])); it('null<15', () => expect(conditionalLogit(d.slice(0,5), 'y', ['x1'], 'grp')).toBeNull())});
describe('iiaTest', () => { it('contract keys', () => expectKeys(iiaTest(d, 'y', ['x1'], 'grp', 'alt'), ['test', 'chi2', 'p', 'n', 'apa']))});
describe('mixedLogit', () => { it('contract keys', () => expectKeys(mixedLogit(d, 'y', ['x1', 'x2'], 'grp'), ['test', 'means', 'n', 'nDraws', 'apa']))});
describe('wtpSpace', () => { it('contract keys', () => expectKeys(wtpSpace(d, 'y', ['x1', 'price'], 'price', 'grp'), ['test', 'wtpEstimates', 'n', 'apa']))});
describe('nestedLogit', () => { it('contract keys', () => expectKeys(nestedLogit(d, 'y', ['x1'], 'grp', 'nest'), ['test', 'nests', 'n', 'apa']))});
