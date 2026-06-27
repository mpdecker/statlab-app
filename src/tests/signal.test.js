import { describe, it, expect } from 'vitest';
import { fft, powerSpectrum, autocorrelation, crossCorrelation, haarWavelet, hilbertTransform, spectrogram, welchPSD, coherence, crossSpectralDensity, phaseSpectrum, transferFunction, waveletTransform, waveletCoherence, crossWavelet, waveletSignificance, waveletRidge } from './signal.js';
import { expectKeys } from './__fixtures__/helpers.js';

const sig = Array.from({ length: 64 }, (_, i) => Math.sin(2 * Math.PI * i * 3 / 64) + Math.cos(2 * Math.PI * i * 7 / 64) * 0.5);

describe('fft', () => {
  it('null <2', () => expect(fft([1])).toBeNull());
  it('spectrum length = nextPow2', () => { const r = fft(sig); expect(r.nFreq).toBe(64); });
  it('magnitude non-negative', () => { const r = fft(sig); r.magnitude.forEach(m => expect(m).toBeGreaterThanOrEqual(0)); });
  it('contract keys', () => expectKeys(fft(sig), ['test', 'spectrum', 'magnitude', 'phase', 'n', 'nFreq', 'apa']));
});

describe('powerSpectrum', () => {
  it('null <4', () => expect(powerSpectrum([1, 2, 3])).toBeNull());
  it('psd non-negative', () => { const r = powerSpectrum(sig); r.psd.forEach(p => expect(p.power).toBeGreaterThanOrEqual(0)); });
  it('contract keys', () => expectKeys(powerSpectrum(sig), ['test', 'psd', 'n', 'samplingRate', 'apa']));
});

describe('autocorrelation', () => {
  it('null <5', () => expect(autocorrelation([1, 2, 3, 4])).toBeNull());
  it('lag 0 = 1', () => { const r = autocorrelation(sig); expect(r.correlations[0].r).toBeCloseTo(1, 2); });
  it('contract keys', () => expectKeys(autocorrelation(sig), ['test', 'correlations', 'n', 'apa']));
});

describe('crossCorrelation', () => {
  it('null mismatch', () => expect(crossCorrelation([1, 2], [1, 2, 3])).toBeNull());
  it('correlations in [-1,1]', () => { const r = crossCorrelation(sig, sig); r.correlations.forEach(c => { expect(c.r).toBeGreaterThanOrEqual(-1); expect(c.r).toBeLessThanOrEqual(1); }); });
  it('contract keys', () => expectKeys(crossCorrelation(sig, sig), ['test', 'correlations', 'n', 'apa']));
});

describe('haarWavelet', () => {
  it('null <4', () => expect(haarWavelet([1, 2])).toBeNull());
  it('contract keys', () => expectKeys(haarWavelet(sig), ['test', 'coefficients', 'levels', 'n', 'apa']));
  it('levels = log2(n)', () => { const r = haarWavelet(sig); expect(r.levels).toBe(6); });
});

describe('hilbertTransform', () => {
  it('null <4', () => expect(hilbertTransform([1, 2])).toBeNull());
  it('envelope >= 0', () => { const r = hilbertTransform(sig); r.envelope.forEach(e => expect(e).toBeGreaterThanOrEqual(0)); });
  it('contract keys', () => expectKeys(hilbertTransform(sig), ['test', 'envelope', 'phase', 'n', 'apa']));
});

describe('spectrogram', () => {
  it('null < windowSize', () => expect(spectrogram(sig.slice(0, 100), { windowSize: 256 })).toBeNull());
  it('matrix has rows', () => { const r = spectrogram(sig, { windowSize: 32, overlap: 16 }); expect(r.spectrogram.length).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(spectrogram(sig, { windowSize: 32, overlap: 16 }), ['test', 'spectrogram', 'times', 'frequencies', 'n', 'apa']));
});

describe('edge cases', () => {
  it('fft with odd length pads to pow2', () => { const r = fft([1, 2, 3, 4, 5]); expect(r.nFreq).toBe(8); });
  it('powerSpectrum samplingRate changes frequency axis', () => { const r = powerSpectrum(sig, { samplingRate: 1000 }); expect(r.samplingRate).toBe(1000); });
  it('autocorrelation maxLag limits lags', () => { const r = autocorrelation(sig, { maxLag: 3 }); expect(r.correlations.length).toBeLessThanOrEqual(5); });
  it('crossCorrelation null for length mismatch', () => expect(crossCorrelation([1, 2, 3], [1, 2])).toBeNull());
  it('haarWavelet levels for small input', () => { const r = haarWavelet([1, 2, 3, 4]); expect(r.levels).toBeGreaterThanOrEqual(1); });
  it('hilbertTransform envelope length matches', () => { const r = hilbertTransform(sig); expect(r.envelope.length).toBe(sig.length); });
  it('spectrogram null for overlap>=windowSize', () => expect(spectrogram(sig, { windowSize: 32, overlap: 32 })).toBeNull());
});

describe('welchPSD', () => { it('contract keys', () => expectKeys(welchPSD(sig, { windowSize: 32, overlap: 16 }), ['test', 'psd', 'nWindows', 'samplingRate', 'n', 'apa'])); });
describe('coherence', () => { it('contract keys', () => { const r = coherence(sig, sig, { windowSize: 32, overlap: 16 }); if (r) expectKeys(r, ['test', 'coherence', 'n', 'apa']); }); });
describe('crossSpectralDensity', () => { it('contract keys', () => { const r = crossSpectralDensity(sig, sig, { windowSize: 32 }); if (r) expectKeys(r, ['test', 'csd', 'n', 'apa']); }); });
describe('phaseSpectrum', () => { it('contract keys', () => { const r = phaseSpectrum(sig, sig); if (r) expectKeys(r, ['test', 'phase', 'n', 'apa']); }); });
describe('transferFunction', () => { it('contract keys', () => { const r = transferFunction(sig, sig); if (r) expectKeys(r, ['test', 'tf', 'n', 'apa']); }); });

describe('waveletTransform', () => { it('contract keys', () => expectKeys(waveletTransform(sig), ['test', 'cwt', 'scales', 'n', 'apa'])); });
describe('waveletCoherence', () => { it('contract keys', () => expectKeys(waveletCoherence(sig, sig), ['test', 'coherence', 'scales', 'n', 'apa'])); });
describe('crossWavelet', () => { it('contract keys', () => expectKeys(crossWavelet(sig, sig), ['test', 'xwt', 'n', 'apa'])); });
describe('waveletSignificance', () => { it('contract keys', () => { const r = waveletTransform(sig); if (r) expectKeys(waveletSignificance(r.cwt, sig.length), ['test', 'significant', 'alpha', 'apa']); }); });
describe('waveletRidge', () => { it('contract keys', () => { const r = waveletTransform(sig); if (r) expectKeys(waveletRidge(r.cwt, r.scales), ['test', 'ridge', 'n', 'apa']); }); });

describe('signal edge cases', () => {
  it('fft with odd length', () => { const r = fft([1, 2, 3, 4, 5]); expect(r.nFreq).toBe(8); });
  it('powerSpectrum null <4', () => expect(powerSpectrum([1, 2, 3])).toBeNull());
  it('autocorrelation first lag = 1', () => { const r = autocorrelation(sig); expect(r.correlations[0].r).toBeCloseTo(1, 2); });
  it('crossCorrelation null for mismatch', () => expect(crossCorrelation([1, 2], [3, 4, 5])).toBeNull());
  it('haarWavelet null <4', () => expect(haarWavelet([1, 2])).toBeNull());
  it('hilbertTransform null <4', () => expect(hilbertTransform([1, 2])).toBeNull());
  it('spectrogram null < windowSize', () => expect(spectrogram(sig.slice(0, 100), { windowSize: 256 })).toBeNull());
  it('welchPSD null for overlap issue', () => expect(welchPSD(sig, { windowSize: 10, overlap: 15 })).toBeNull());
  it('waveletTransform null <8', () => expect(waveletTransform([1, 2, 3])).toBeNull());
  it('waveletCoherence null <10', () => expect(waveletCoherence([1, 2, 3], [4, 5, 6])).toBeNull());
});
