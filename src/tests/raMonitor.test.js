import { describe, it, expect } from 'vitest';
import { raCusum, vlad, raSprt, funnelPlot, cChartRiskAdjusted } from './raMonitor.js';
import { expectKeys } from './__fixtures__/helpers.js';

const binary = [1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1];
const predicted = [0.1, 0.2, 0.3, 0.15, 0.25, 0.1, 0.3, 0.2, 0.15, 0.1, 0.25, 0.05, 0.3, 0.1, 0.2];

describe('raCusum', () => {
  it('contract keys', () => expectKeys(raCusum(binary, predicted), ['test', 'cusum', 'signals', 'k', 'h', 'n', 'apa']));
  it('null <10', () => expect(raCusum(binary.slice(0, 5), predicted.slice(0, 5))).toBeNull());
});

describe('vlad', () => {
  it('contract keys', () => expectKeys(vlad(predicted, binary), ['test', 'vlad', 'n', 'apa']));
  it('null mismatch', () => expect(vlad([1, 2], [1])).toBeNull());
});

describe('raSprt', () => {
  it('contract keys', () => expectKeys(raSprt(binary, predicted), ['test', 'llr', 'n', 'apa']));
});

describe('funnelPlot', () => {
  const d = []; for (let i = 0; i < 10; i++) d.push({ y: i % 3 + 1, n: 20 + i * 5 });
  it('contract keys', () => expectKeys(funnelPlot(d, 'y', 'n'), ['test', 'points', 'meanRate', 'controlLimits', 'n', 'apa']));
  it('points present', () => { const r = funnelPlot(d, 'y', 'n'); expect(r.points).toHaveLength(d.length); });
});

describe('cChartRiskAdjusted', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ y: i % 2, risk: i * 0.1 + 0.5 });
  it('contract keys', () => expectKeys(cChartRiskAdjusted(d, 'y', 'risk'), ['test', 'points', 'expectedRate', 'controlLimits', 'n', 'apa']));
  it('null <12', () => expect(cChartRiskAdjusted(d.slice(0, 5), 'y', 'risk')).toBeNull());
});

describe('raMonitor edge cases', () => {
  it('raCusum null mismatch', () => expect(raCusum([1, 2], [0.5])).toBeNull());
  it('vlad null <5', () => expect(vlad([1, 2], [3, 4])).toBeNull());
  it('raSprt null <10', () => expect(raSprt([1, 2, 3], [0.1, 0.2, 0.3])).toBeNull());
  it('funnelPlot null <5', () => expect(funnelPlot([{ y: 1, n: 10 }], 'y', 'n')).toBeNull());
  it('cChartRiskAdjusted null <12', () => expect(cChartRiskAdjusted([{ y: 1, risk: 1 }], 'y', 'risk')).toBeNull());
});
