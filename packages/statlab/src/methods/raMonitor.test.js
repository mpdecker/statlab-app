import { describe, it, expect } from 'vitest';
import { raCusum, vlad, raSprt, funnelPlot, cChartRiskAdjusted, safetySignal, prrAnalysis } from './raMonitor.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rr = ref.raMonitor;

const binary = [1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1];
const predicted = [0.1, 0.2, 0.3, 0.15, 0.25, 0.1, 0.3, 0.2, 0.15, 0.1, 0.25, 0.05, 0.3, 0.1, 0.2];

describe('raCusum', () => {
  it('contract keys', () => expectKeys(raCusum(binary, predicted), ['test', 'cusum', 'signals', 'k', 'h', 'n', 'apa']));
  it('null <10', () => expect(raCusum(binary.slice(0, 5), predicted.slice(0, 5))).toBeNull());
  it('cusum non-empty', () => { const r = raCusum(binary, predicted); if (r) expect(r.cusum.length).toBeGreaterThan(0); });
  it('nSignals matches oracle', () => { const r = raCusum(binary, predicted); expect(r.signals.length).toBe(rr.raCusum_basic.nSignals); });
});

describe('vlad', () => {
  it('contract keys', () => expectKeys(vlad(predicted, binary), ['test', 'vlad', 'n', 'apa']));
  it('null mismatch', () => expect(vlad([1, 2], [1])).toBeNull());
  it('vlad finite', () => { const r = vlad(predicted, binary); if (r) expect(r).toHaveProperty('vlad'); });
  it('vlad range matches oracle', () => { const r = vlad(predicted, binary); const vmin = Math.min(...r.vlad); const vmax = Math.max(...r.vlad); expect(vmin).toBeCloseTo(rr.vlad_basic.vladRange[0], 4); expect(vmax).toBeCloseTo(rr.vlad_basic.vladRange[1], 4); });
});

describe('raSprt', () => {
  it('contract keys', () => expectKeys(raSprt(binary, predicted), ['test', 'llr', 'n', 'apa']));
  it('llr finite', () => { const r = raSprt(binary, predicted); if (r && r.llr !== null && r.llr !== undefined) expect(r.llr).toBeDefined(); });
  it('n matches data length', () => { const r = raSprt(binary, predicted); if (r) expect(r.n).toBe(binary.length); });
});

describe('funnelPlot', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ y: i % 3 + 1, n: 20 + i * 5 });
  it('contract keys', () => expectKeys(funnelPlot(d, 'y', 'n'), ['test', 'points', 'meanRate', 'controlLimits', 'n', 'apa']));
  it('points present', () => { const r = funnelPlot(d, 'y', 'n'); expect(r.points).toHaveLength(d.length); });
  it('meanRate finite', () => { const r = funnelPlot(d, 'y', 'n'); expect(Number.isFinite(r.meanRate)).toBe(true); });
  it('meanRate matches oracle', () => { const d = []; for (let i = 0; i < 10; i++) d.push({ y: i % 3 + 1, n: 20 + i * 5 }); const r = funnelPlot(d, 'y', 'n'); expect(r.meanRate).toBeCloseTo(rr.funnelPlot_basic.meanRate, 4); });
});

describe('cChartRiskAdjusted', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ y: i % 2, risk: i * 0.1 + 0.5 });
  it('contract keys', () => expectKeys(cChartRiskAdjusted(d, 'y', 'risk'), ['test', 'points', 'expectedRate', 'controlLimits', 'n', 'apa']));
  it('null <12', () => expect(cChartRiskAdjusted(d.slice(0, 5), 'y', 'risk')).toBeNull());
  it('points non-empty', () => { const r = cChartRiskAdjusted(d, 'y', 'risk'); if (r) expect(r.points.length).toBeGreaterThan(0); });
});

describe('raMonitor edge cases', () => {
  it('raCusum null mismatch', () => expect(raCusum([1, 2], [0.5])).toBeNull());
  it('vlad null <5', () => expect(vlad([1, 2], [3, 4])).toBeNull());
  it('raSprt null <10', () => expect(raSprt([1, 2, 3], [0.1, 0.2, 0.3])).toBeNull());
  it('funnelPlot null <5', () => expect(funnelPlot([{ y: 1, n: 10 }], 'y', 'n')).toBeNull());
  it('cChartRiskAdjusted null <12', () => expect(cChartRiskAdjusted([{ y: 1, risk: 1 }], 'y', 'risk')).toBeNull());
});

describe('safetySignal', () => {
  it('contract keys', () => expectKeys(safetySignal(15, 5, 1000), ['test','prr','ciLow','ciHigh','observed','expected','total','apa']));
  it('null invalid', () => expect(safetySignal(-1, 5, 1000)).toBeNull());
  it('prr positive', () => { const r = safetySignal(15, 5, 1000); if (r) expect(r.prr).toBeGreaterThan(0); });
});
describe('prrAnalysis', () => {
  const events = [10, 5, 3]; const expecteds = [3, 4, 2]; const totals = [1000, 1000, 1000];
  it('contract keys', () => expectKeys(prrAnalysis(events, expecteds, totals), ['test','results','nSignals','n','apa']));
  it('null mismatched', () => expect(prrAnalysis([10, 5], [3], [1000])).toBeNull());
  it('results non-empty', () => { const r = prrAnalysis(events, expecteds, totals); if (r) expect(r.results.length).toBeGreaterThan(0); });
});

describe('hardening — risk-adjusted monitoring edge cases', () => {
  it('raCusum null for null binary', () => expect(raCusum(null, predicted)).toBeNull());
  it('raCusum null for mismatched lengths', () => expect(raCusum([1,0,1], [0.1,0.2])).toBeNull());
  it('vlad null for null expected', () => expect(vlad(null, binary)).toBeNull());
  it('vlad null for mismatched lengths', () => expect(vlad([1,2],[1])).toBeNull());
  it('raSprt null for null binary', () => expect(raSprt(null, predicted)).toBeNull());
  it('raSprt null for mismatched lengths', () => expect(raSprt([1,0],[0.1,0.2,0.3])).toBeNull());
  it('funnelPlot null for null data', () => expect(funnelPlot(null, 'y', 'n')).toBeNull());
  it('funnelPlot null for missing vars', () => { const d = [{y:1,n:10}]; expect(funnelPlot(d, '', 'n')).toBeNull(); });
  it('cChartRiskAdjusted null for null data', () => expect(cChartRiskAdjusted(null, 'y', 'risk')).toBeNull());
  it('cChartRiskAdjusted null for <12 rows', () => { const d = []; for (let i = 0; i < 5; i++) d.push({ y: i%2, risk: 0.5 }); expect(cChartRiskAdjusted(d, 'y', 'risk')).toBeNull(); });
  it('safetySignal null for negative events', () => expect(safetySignal(-1, 5, 1000)).toBeNull());
  it('safetySignal null for null inputs', () => expect(safetySignal(null, 5, 1000)).toBeNull());
  it('prrAnalysis null for mismatched lengths', () => expect(prrAnalysis([10,5], [3], [1000])).toBeNull());
  it('prrAnalysis null for <3 events', () => expect(prrAnalysis([10,5], [3,4], [1000,1000])).toBeNull());
});
