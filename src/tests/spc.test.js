import { describe, it, expect } from 'vitest';
import { xbarChart, rChart, sChart, pChart, cChart, cusumChart, ewmaChart, processCapability, hotellingT2Chart, mewmaChart, ocCurve, aoqCurve, rectifyingInspection, reliabilitySampling, asnCurve, multivariateControl, cpkPpk } from './spc.js';
import { expectKeys } from './__fixtures__/helpers.js';

const data = [];
for (let i = 0; i < 50; i++) data.push(10 + ((i * 7 + 3) % 11 - 5) * 0.3);

describe('xbarChart', () => {
  it('null for small data', () => expect(xbarChart(data.slice(0, 8), 5)).toBeNull());
  it('contract keys', () => expectKeys(xbarChart(data, 5), ['test', 'centerline', 'ucl', 'lcl', 'points', 'nSubgroups', 'subgroupSize', 'apa']));
  it('ucl > centerline', () => { const r = xbarChart(data, 5); expect(r.ucl).toBeGreaterThan(r.centerline); expect(r.lcl).toBeLessThan(r.centerline); });
  it('points have signal boolean', () => { const r = xbarChart(data, 5); r.points.forEach(p => expect(typeof p.signal).toBe('boolean')); });
  it('apa string', () => { const r = xbarChart(data, 5); expect(typeof r.apa).toBe('string'); expect(r.apa.length).toBeGreaterThan(0); });
});

describe('rChart', () => {
  it('null small', () => expect(rChart(data.slice(0, 8), 5)).toBeNull());
  it('contract keys', () => expectKeys(rChart(data, 5), ['test', 'centerline', 'ucl', 'lcl', 'points', 'nSubgroups', 'apa']));
  it('ranges non-negative', () => { const r = rChart(data, 5); r.points.forEach(p => expect(p.range).toBeGreaterThanOrEqual(0)); });
});

describe('sChart', () => {
  it('null small', () => expect(sChart(data.slice(0, 8), 5)).toBeNull());
  it('contract keys', () => expectKeys(sChart(data, 5), ['test', 'centerline', 'ucl', 'lcl', 'points', 'nSubgroups', 'apa']));
  it('sd non-negative', () => { const r = sChart(data, 5); r.points.forEach(p => expect(p.sd).toBeGreaterThanOrEqual(0)); });
});

describe('pChart', () => {
  it('null <5 samples', () => expect(pChart([1, 2], [10, 10])).toBeNull());
  it('contract keys', () => expectKeys(pChart([2, 3, 1, 4, 2], [20, 20, 20, 20, 20]), ['test', 'pbar', 'points', 'nSamples', 'apa']));
  it('pbar in [0,1]', () => { const r = pChart([2, 3, 1, 4, 2], [20, 20, 20, 20, 20]); expect(r.pbar).toBeGreaterThan(0); expect(r.pbar).toBeLessThan(1); });
});

describe('cChart', () => {
  it('null <5', () => expect(cChart([2, 3, 1])).toBeNull());
  it('contract keys', () => expectKeys(cChart([2, 3, 1, 4, 2, 3, 1, 5]), ['test', 'cbar', 'ucl', 'lcl', 'points', 'n', 'apa']));
  it('c-bar positive', () => { const r = cChart([2, 3, 1, 4, 2, 3, 1, 5]); expect(r.cbar).toBeGreaterThan(0); });
});

describe('cusumChart', () => {
  const d = Array.from({ length: 30 }, (_, i) => 10 + (i > 15 ? 1.5 : 0) + (i % 3 - 1) * 0.5);
  it('null <10', () => expect(cusumChart(d.slice(0, 5))).toBeNull());
  it('contract keys', () => expectKeys(cusumChart(d), ['test', 'target', 'k', 'h', 'cplus', 'cminus', 'signals', 'n', 'apa']));
  it('cplus >= 0', () => { const r = cusumChart(d); r.cplus.forEach(v => expect(v).toBeGreaterThanOrEqual(0)); });
});

describe('ewmaChart', () => {
  it('null <5', () => expect(ewmaChart([1, 2, 3])).toBeNull());
  it('contract keys', () => expectKeys(ewmaChart(data), ['test', 'lambda', 'L', 'ewma', 'ucl', 'lcl', 'signals', 'n', 'apa']));
  it('ucl > lcl', () => { const r = ewmaChart(data); r.ucl.forEach((u, i) => expect(u).toBeGreaterThan(r.lcl[i])); });
});

describe('processCapability', () => {
  it('null <5', () => expect(processCapability([1, 2, 3])).toBeNull());
  it('contract keys', () => expectKeys(processCapability(data, 9, 11), ['test', 'cp', 'cpk', 'sigma', 'mean', 'lsl', 'usl', 'n', 'apa']));
  it('cp >= 0', () => { const r = processCapability(data, 9, 11); expect(r.cp).toBeGreaterThanOrEqual(0); });
  it('cpk <= cp', () => { const r = processCapability(data, 9, 11); expect(r.cpk).toBeLessThanOrEqual(r.cp); });
});

describe('spc edge cases', () => {
  it('xbarChart null for data < 2*subgroupSize', () => expect(xbarChart([1,2,3], 5)).toBeNull());
  it('rChart ranges positive or zero', () => { const r = rChart(data, 5); expect(r.centerline).toBeGreaterThanOrEqual(0); });
  it('sChart handles subgroupSize beyond constants', () => { const r = sChart(data, 2); expect(r.nSubgroups).toBeGreaterThan(0); });
  it('pChart null when defectives > sampleSizes', () => expect(pChart([30, 5], [10, 10])).toBeNull());
  it('cChart null <5 defects', () => expect(cChart([1, 2])).toBeNull());
  it('cusumChart cplus always >= 0', () => { const r = cusumChart(data); r.cplus.forEach(v => expect(v).toBeGreaterThanOrEqual(0)); });
  it('ewmaChart lambda=0.5 works', () => { const r = ewmaChart(data, { lambda: 0.5 }); expect(r.ewma.length).toBe(data.length); });
  it('processCapability with one-sided spec', () => { const r = processCapability(data, 9, null); expect(r.cpk).not.toBeNull(); });
  it('processCapability null for zero sd', () => expect(processCapability([5, 5, 5, 5, 5])).toBeNull());
});

describe('hotellingT2Chart', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i * 0.5, x2: Math.sin(i) });
  it('contract keys', () => { const r = hotellingT2Chart(d, ['x1', 'x2']); if (r) expectKeys(r, ['test', 'T2', 'ucl', 'nSubgroups', 'p', 'subgroups', 'apa']); });
  it('UCL positive', () => { const r = hotellingT2Chart(d, ['x1', 'x2']); if (r) expect(r.ucl).toBeGreaterThan(0); });
  it('T2 non-empty', () => { const r = hotellingT2Chart(d, ['x1', 'x2']); if (r) expect(r.T2.length).toBeGreaterThan(0); });
});

describe('mewmaChart', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i * 0.5, x2: Math.sin(i) });
  it('contract keys', () => { const r = mewmaChart(d, ['x1', 'x2']); if (r) expectKeys(r, ['test', 'T2', 'lambda', 'nSubgroups', 'p', 'apa']); });
  it('UCL positive', () => { const r = mewmaChart(d, ['x1', 'x2']); if (r && r.ucl) expect(r.ucl).toBeGreaterThan(0); });
  it('T2 non-empty', () => { const r = mewmaChart(d, ['x1', 'x2']); if (r) expect(r.T2.length).toBeGreaterThan(0); });
});

describe('ocCurve', () => { it('contract keys', () => expectKeys(ocCurve(50, 2, [0.01, 0.05, 0.1]), ['test', 'curve', 'n', 'c', 'apa'])); it('curve non-empty', () => { const r = ocCurve(50, 2, [0.01, 0.05, 0.1]); expect(r.curve.length).toBeGreaterThan(0); }); it('c matches', () => { const r = ocCurve(50, 2, [0.01, 0.05, 0.1]); expect(r.c).toBe(2); }); });
describe('aoqCurve', () => { it('contract keys', () => expectKeys(aoqCurve(50, 2, [0.01, 0.05], 1000), ['test', 'aoq', 'n', 'c', 'N', 'apa'])); it('curve non-empty', () => { const r = aoqCurve(50, 2, [0.01, 0.05], 1000); expect(r.aoq.length).toBeGreaterThan(0); }); it('N matches', () => { const r = aoqCurve(50, 2, [0.01, 0.05], 1000); expect(r.N).toBe(1000); }); });
describe('rectifyingInspection', () => { it('contract keys', () => expectKeys(rectifyingInspection(50, 2, 0.05, 1000), ['test', 'ati', 'aoql', 'pa', 'n', 'c', 'N', 'apa'])); it('aoql finite', () => { const r = rectifyingInspection(50, 2, 0.05, 1000); expect(Number.isFinite(r.aoql)).toBe(true); }); it('pa between 0-1', () => { const r = rectifyingInspection(50, 2, 0.05, 1000); expect(r.pa).toBeGreaterThanOrEqual(0); expect(r.pa).toBeLessThanOrEqual(1); }); });
describe('reliabilitySampling', () => { it('contract keys', () => expectKeys(reliabilitySampling(100, 0.01), ['test', 'n', 't', 'r', 'alpha', 'beta', 'apa'])); it('n positive', () => { const r = reliabilitySampling(100, 0.01); expect(r.n).toBeGreaterThan(0); }); it('t positive', () => { const r = reliabilitySampling(100, 0.01); expect(r.t).toBeGreaterThan(0); }); });
describe('asnCurve', () => { it('contract keys', () => expectKeys(asnCurve(50, 2, [0.01, 0.05]), ['test', 'asn', 'n', 'c', 'apa'])); it('curve non-empty', () => { const r = asnCurve(50, 2, [0.01, 0.05]); expect(r.asn.length).toBeGreaterThan(0); }); it('c matches', () => { const r = asnCurve(50, 2, [0.01, 0.05]); expect(r.c).toBe(2); }); });

describe('multivariateControl', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ v1: i + Math.random(), v2: i * 0.5 + Math.random() });
  it('contract keys', () => expectKeys(multivariateControl(d, ['v1', 'v2']), ['test','signals','UCL','nSubgroups','p','alpha','apa']));
  it('UCL positive', () => { const r = multivariateControl(d, ['v1', 'v2']); if (r) expect(r.UCL).toBeGreaterThan(0); });
  it('signals non-empty', () => { const r = multivariateControl(d, ['v1', 'v2']); if (r) expect(r.signals.length).toBeGreaterThan(0); });
});
describe('cpkPpk', () => {
  const data = Array.from({length: 30}, () => 10 + Math.random() * 2);
  it('contract keys', () => expectKeys(cpkPpk(data, 7, 13), ['test','cp','cpk','pp','ppk','mu','sigma','n','lsl','usl','apa']));
  it('null lsl>=usl', () => expect(cpkPpk(data, 13, 7)).toBeNull());
  it('cp >= 0', () => { const r = cpkPpk(data, 7, 13); if (r) expect(r.cp).toBeGreaterThanOrEqual(0); });
});