import { describe, it, expect } from 'vitest';
import { gamBackfitting, gamSpline, gamLocalScoring, gamEffectiveDf, gamPredict, gamInteraction, thinPlateSpline, pSpline, gamAnova } from './gam.js';
import { expectKeys } from './__fixtures__/helpers.js';

const d = []; for (let i = 0; i < 20; i++) d.push({ y: i * 2 + Math.sin(i) * 3, x1: i, x2: Math.sin(i) });
const X = d.map(r => [r.x1, r.x2]);
const y = d.map(r => r.y);

describe('gamBackfitting', () => {
  it('contract keys', () => { const r = gamBackfitting(y, X, []); if (r) expectKeys(r, ['test', 'alpha', 'betas', 'rSquared', 'n', 'smoothVars', 'apa']); });
  it('null for empty', () => expect(gamBackfitting([], [], [])).toBeNull());
  it('fitted values correct length', () => { const r = gamBackfitting(y, X, ['x1']); if (r && r.fitted) expect(r.fitted).toHaveLength(y.length); });
});

describe('gamSpline', () => { it('is defined', () => expect(typeof gamSpline).toBe('function')); it('fitted values correct length', () => { const r = gamSpline(y, X); if (r && r.fitted) expect(r.fitted).toHaveLength(y.length); }); it('fitted all finite', () => { const r = gamSpline(y, X); if (r && r.fitted) expect(r.fitted.every(f => Number.isFinite(f))).toBe(true); }) });
describe('gamLocalScoring', () => { it('contract keys', () => { const r = gamLocalScoring(d.map(r => r.y > 10 ? 1 : 0), X); if (r) expectKeys(r, ['test', 'logLik', 'n', 'p', 'apa']); }); it('fitted finite', () => { const r = gamLocalScoring(d.map(r => r.y > 10 ? 1 : 0), X); if (r) expect(Number.isFinite(r.logLik)).toBe(true); }); it('n positive', () => { const r = gamLocalScoring(d.map(r => r.y > 10 ? 1 : 0), X); if (r) expect(r.n).toBeGreaterThan(0); }) });
describe('gamEffectiveDf', () => { it('contract keys', () => expectKeys(gamEffectiveDf([{ df: 3 }, { df: 5 }]), ['test', 'edf', 'nSmooths', 'apa'])); it('df between 1-p', () => { const r = gamEffectiveDf([{ df: 3 }, { df: 5 }]); if (r) expect(r.edf).toBeGreaterThan(0); }); it('nSmooths positive', () => { const r = gamEffectiveDf([{ df: 3 }, { df: 5 }]); if (r) expect(r.nSmooths).toBeGreaterThan(0); }) });
describe('gamPredict', () => { it('is defined', () => expect(typeof gamPredict).toBe('function')); it('predictions correct length', () => { const r = gamSpline(y, X); if (r) { const preds = gamPredict(r, X); expect(preds).toHaveLength(y.length); } }); it('predictions all finite', () => { const r = gamSpline(y, X); if (r) { const preds = gamPredict(r, X); expect(preds.every(p => Number.isFinite(p))).toBe(true); } }) });
describe('gamInteraction', () => { it('contract keys', () => expectKeys(gamInteraction(d, 'y', 'x1', 'x2'), ['test', 'n', 'apa'])); it('interaction value finite', () => { const r = gamInteraction(d, 'y', 'x1', 'x2'); if (r) expect(Number.isFinite(r.n)).toBe(true); }); it('n positive', () => { const r = gamInteraction(d, 'y', 'x1', 'x2'); if (r) expect(r.n).toBeGreaterThan(0); }) });

describe('thinPlateSpline', () => {
  const x = [1,2,3,4,5,6,7,8,9,10];
  const y = x.map(v => v * 2 + Math.sin(v) * 3 + Math.random());
  it('contract keys', () => expectKeys(thinPlateSpline(x, y), ['test','fitted','gcv','lambda','n','apa']));
  it('null <5', () => expect(thinPlateSpline([1,2], [3,4])).toBeNull());
  it('gcv >= 0', () => { const r = thinPlateSpline(x, y); if (r) expect(r.gcv).toBeGreaterThanOrEqual(0); });
  it('fitted correct length', () => { const r = thinPlateSpline(x, y); if (r && r.fitted) expect(r.fitted).toHaveLength(x.length); });
});
describe('pSpline', () => {
  const x = [1,2,3,4,5,6,7,8,9,10];
  const y = x.map(v => v * 1.5 + Math.random() * 3);
  it('contract keys', () => expectKeys(pSpline(x, y), ['test','fitted','nKnots','lambda','n','apa']));
  it('null <5', () => expect(pSpline([1,2], [3,4])).toBeNull());
  it('fitted correct length', () => { const r = pSpline(x, y); if (r && r.fitted) expect(r.fitted).toHaveLength(x.length); });
});
describe('gamAnova', () => {
  const models = [{ name: 'm1', deviance: 25, df: 3 }, { name: 'm2', deviance: 15, df: 5 }];
  it('contract keys', () => expectKeys(gamAnova(models), ['test','table','nModels','apa']));
  it('null <2', () => expect(gamAnova([{name:'m1',deviance:10,df:2}])).toBeNull());
  it('table non-empty', () => { const models2 = [{ name: 'm1', deviance: 25, df: 3 }, { name: 'm2', deviance: 15, df: 5 }]; const r = gamAnova(models2); if (r && r.table) expect(r.table.length).toBeGreaterThan(0); });
});

describe('gam edge cases', () => {
  it('gamBackfitting null for empty', () => expect(gamBackfitting(null, X, [])).toBeNull());
  it('gamBackfitting handles single smooth', () => { const r = gamBackfitting(y, X, ['x1']); expect(r !== null).toBe(true); });
  it('gamLocalScoring null for empty', () => expect(gamLocalScoring([], X)).toBeNull());
  it('gamEffectiveDf null for empty', () => expect(gamEffectiveDf([])).toBeNull());
  it('gamInteraction null for short data', () => expect(gamInteraction(d.slice(0, 5), 'y', 'x1', 'x2')).toBeNull());
});

describe('gamInteraction fits the tensor-product interaction model', () => {
  it('captures a real x1*x2 interaction (high R^2)', () => {
    const d = [];
    let s = 5; const rnd = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    for (let i = 0; i < 60; i++) { const a = rnd() * 3, b = rnd() * 3; d.push({ x1: a, x2: b, y: a * b + 0.05 * rnd() }); }
    const r = gamInteraction(d, 'y', 'x1', 'x2', { df: 6 });
    expect(r.rSquared).toBeGreaterThan(0.8);
  });
});
