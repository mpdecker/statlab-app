import { describe, it, expect } from 'vitest';
import { gamBackfitting, gamSpline, gamLocalScoring, gamEffectiveDf, gamPredict, gamInteraction } from './gam.js';
import { expectKeys } from './__fixtures__/helpers.js';

const d = []; for (let i = 0; i < 20; i++) d.push({ y: i * 2 + Math.sin(i) * 3, x1: i, x2: Math.sin(i) });
const X = d.map(r => [r.x1, r.x2]);
const y = d.map(r => r.y);

describe('gamBackfitting', () => {
  it('contract keys', () => { const r = gamBackfitting(y, X, []); if (r) expectKeys(r, ['test', 'alpha', 'betas', 'rSquared', 'n', 'smoothVars', 'apa']); });
  it('null for empty', () => expect(gamBackfitting([], [], [])).toBeNull());
});

describe('gamSpline', () => { it('is defined', () => expect(typeof gamSpline).toBe('function')); });
describe('gamLocalScoring', () => { it('contract keys', () => { const r = gamLocalScoring(d.map(r => r.y > 10 ? 1 : 0), X); if (r) expectKeys(r, ['test', 'logLik', 'n', 'p', 'apa']); }); });
describe('gamEffectiveDf', () => { it('contract keys', () => expectKeys(gamEffectiveDf([{ df: 3 }, { df: 5 }]), ['test', 'edf', 'nSmooths', 'apa'])); });
describe('gamPredict', () => { it('is defined', () => expect(typeof gamPredict).toBe('function')); });
describe('gamInteraction', () => { it('contract keys', () => expectKeys(gamInteraction(d, 'y', 'x1', 'x2'), ['test', 'n', 'apa'])); });

describe('gam edge cases', () => {
  it('gamBackfitting null for empty', () => expect(gamBackfitting(null, X, [])).toBeNull());
  it('gamBackfitting handles single smooth', () => { const r = gamBackfitting(y, X, ['x1']); expect(r !== null).toBe(true); });
  it('gamLocalScoring null for empty', () => expect(gamLocalScoring([], X)).toBeNull());
  it('gamEffectiveDf null for empty', () => expect(gamEffectiveDf([])).toBeNull());
  it('gamInteraction null for short data', () => expect(gamInteraction(d.slice(0, 5), 'y', 'x1', 'x2')).toBeNull());
});
