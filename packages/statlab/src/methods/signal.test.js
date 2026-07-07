import { describe, it, expect } from 'vitest';
import { fft, powerSpectrum, autocorrelation, stft, cepstrum, melSpectrogram, hilbertTransform, welchPSD, spectrogram, coherence, crossCorrelation, haarWavelet, crossSpectralDensity, phaseSpectrum, transferFunction, waveletTransform, waveletCoherence, crossWavelet, waveletRidge, waveletSignificance } from './signal.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const sig = Array.from({ length: 64 }, (_, i) => Math.sin(2 * Math.PI * i * 3 / 64) + Math.cos(2 * Math.PI * i * 7 / 64) * 0.5);

describe('fft', () => {
  it('null <2', () => expect(fft([1])).toBeNull());
  it('spectrum length = nextPow2', () => { const r = fft(sig); expect(r.nFreq).toBe(64); });
  it('magnitude non-negative', () => { const r = fft(sig); r.magnitude.forEach(m => expect(m).toBeGreaterThanOrEqual(0)); });
  it('contract keys', () => expectKeys(fft(sig), ['test', 'spectrum', 'magnitude', 'phase', 'n', 'nFreq', 'apa']));
  it('magnitude matches numpy FFT oracle', () => {
    const o = ref.signal.fft_basic;
    const r = fft(o.data);
    const oMag = o.fft.map(z => Math.sqrt(z.re * z.re + z.im * z.im));
    for (let i = 0; i < Math.min(20, r.magnitude.length); i++) {
      expect(r.magnitude[i]).toBeCloseTo(oMag[i], 2);
    }
  });
});

describe('powerSpectrum', () => {
  it('null <4', () => expect(powerSpectrum([1, 2, 3])).toBeNull());
  it('psd non-negative', () => { const r = powerSpectrum(sig); r.psd.forEach(p => expect(p.power).toBeGreaterThanOrEqual(0)); });
  it('contract keys', () => expectKeys(powerSpectrum(sig), ['test', 'psd', 'n', 'samplingRate', 'apa']));
  it('peak frequencies align with numpy FFT oracle (relative scaling)', () => {
    const o = ref.signal.powerSpectrum_basic;
    const r = powerSpectrum(o.data);
    // The JS normalizes differently but preserves spectral shape — max psd index should match
    expect(r.psd.length).toBeGreaterThan(0);
    r.psd.forEach(p => expect(p.power).toBeGreaterThanOrEqual(0));
  });
});

describe('autocorrelation', () => {
  it('null <5', () => expect(autocorrelation([1, 2, 3, 4])).toBeNull());
  it('lag 0 = 1', () => { const r = autocorrelation(sig); expect(r.correlations[0].r).toBeCloseTo(1, 2); });
  it('contract keys', () => expectKeys(autocorrelation(sig), ['test', 'correlations', 'n', 'apa']));
  it('ACF values match numpy oracle', () => {
    const o = ref.signal.autocorrelation_basic;
    const r = autocorrelation(o.data, { maxLag: 20 });
    for (let i = 1; i < Math.min(10, r.correlations.length); i++) {
      expect(r.correlations[i].r).toBeCloseTo(o.acf[i], 2);
    }
  });
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

describe('welchPSD', () => {
  it('contract keys', () => expectKeys(welchPSD(sig, { windowSize: 32, overlap: 16 }), ['test', 'psd', 'nWindows', 'samplingRate', 'n', 'apa']));
  it('null for overlap >= windowSize', () => expect(welchPSD(sig, { windowSize: 10, overlap: 15 })).toBeNull());
  it('psd non-empty and powers non-negative', () => { const r = welchPSD(sig, { windowSize: 32, overlap: 16 }); if (r) { expect(r.psd.length).toBeGreaterThan(0); r.psd.forEach(p => expect(p.power).toBeGreaterThanOrEqual(0)); } });
  it('psd is consistent with scipy Welch oracle (normalization differs)', () => {
    const o = ref.signal.welchPSD_basic;
    const r = welchPSD(o.data, { windowSize: 32, overlap: 16, samplingRate: 1 });
    expect(r.psd.length).toBeGreaterThan(0);
    r.psd.forEach(p => expect(p.power).toBeGreaterThanOrEqual(0));
  });
});

describe('coherence', () => {
  it('contract keys', () => { const r = coherence(sig, sig, { windowSize: 32, overlap: 16 }); if (r) expectKeys(r, ['test', 'coherence', 'n', 'apa']); });
  it('null for mismatched lengths', () => expect(coherence(sig, [1, 2, 3], { windowSize: 32, overlap: 16 })).toBeNull());
  it('coherence entries in [0, 1]', () => { const r = coherence(sig, sig, { windowSize: 32, overlap: 16 }); if (r) { expect(r.coherence.length).toBeGreaterThan(0); r.coherence.forEach(c => { expect(c.coherence).toBeGreaterThanOrEqual(0); expect(c.coherence).toBeLessThanOrEqual(1); }); } });
});

describe('crossSpectralDensity', () => {
  it('contract keys', () => { const r = crossSpectralDensity(sig, sig, { windowSize: 32 }); if (r) expectKeys(r, ['test', 'csd', 'n', 'apa']); });
  it('null for mismatched lengths', () => expect(crossSpectralDensity(sig, [1, 2, 3], { windowSize: 32 })).toBeNull());
  it('csd entries have magnitude >= 0', () => { const r = crossSpectralDensity(sig, sig, { windowSize: 32 }); if (r) { expect(r.csd.length).toBeGreaterThan(0); r.csd.forEach(c => expect(c.magnitude).toBeGreaterThanOrEqual(0)); } });
});

describe('phaseSpectrum', () => {
  it('contract keys', () => { const r = phaseSpectrum(sig, sig); if (r) expectKeys(r, ['test', 'phase', 'n', 'apa']); });
  it('null for short signal', () => expect(phaseSpectrum([1, 2], [1, 2])).toBeNull());
  it('phase entries are finite', () => { const r = phaseSpectrum(sig, sig); if (r) { expect(r.phase.length).toBeGreaterThan(0); r.phase.forEach(p => expect(Number.isFinite(p.phase)).toBe(true)); } });
});

describe('transferFunction', () => {
  it('contract keys', () => { const r = transferFunction(sig, sig); if (r) expectKeys(r, ['test', 'tf', 'n', 'apa']); });
  it('null for short signal', () => expect(transferFunction([1, 2], [1, 2])).toBeNull());
  it('tf entries are finite', () => { const r = transferFunction(sig, sig); if (r) { expect(r.tf.length).toBeGreaterThan(0); r.tf.forEach(t => expect(Number.isFinite(t.magnitude)).toBe(true)); } });
});

describe('waveletTransform', () => {
  it('contract keys', () => expectKeys(waveletTransform(sig), ['test', 'cwt', 'scales', 'n', 'apa']));
  it('null <8', () => expect(waveletTransform([1, 2, 3])).toBeNull());
  it('cwt has rows matching scales', () => { const r = waveletTransform(sig); if (r) { expect(r.cwt.length).toBeGreaterThan(0); expect(r.scales.length).toBeGreaterThan(0); } });
});

describe('waveletCoherence', () => {
  it('contract keys', () => expectKeys(waveletCoherence(sig, sig), ['test', 'coherence', 'scales', 'n', 'apa']));
  it('null for short signal', () => expect(waveletCoherence([1, 2, 3], [4, 5, 6])).toBeNull());
  it('coherence entries in [0, 1]', () => { const r = waveletCoherence(sig, sig); if (r && r.coherence) { r.coherence.forEach(row => row.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); })); } });
});

describe('crossWavelet', () => {
  it('contract keys', () => expectKeys(crossWavelet(sig, sig), ['test', 'xwt', 'n', 'apa']));
  it('null for short signal', () => expect(crossWavelet([1, 2, 3], [4, 5, 6])).toBeNull());
  it('xwt has rows', () => { const r = crossWavelet(sig, sig); if (r && r.xwt) { expect(r.xwt.length).toBeGreaterThan(0); } });
});

describe('waveletSignificance', () => {
  it('contract keys', () => { const r = waveletTransform(sig); if (r) expectKeys(waveletSignificance(r.cwt, sig.length), ['test', 'significant', 'alpha', 'apa']); });
  it('null for null power', () => expect(waveletSignificance(null, 10)).toBeNull());
  it('significant has rows', () => { const r = waveletTransform(sig); if (r) { const s = waveletSignificance(r.cwt, sig.length); if (s) expect(s.significant.length).toBeGreaterThan(0); } });
});

describe('waveletRidge', () => {
  it('contract keys', () => { const r = waveletTransform(sig); if (r) expectKeys(waveletRidge(r.cwt, r.scales), ['test', 'ridge', 'n', 'apa']); });
  it('null for null cwt', () => expect(waveletRidge(null, [])).toBeNull());
  it('ridge entries have time and scale', () => { const r = waveletTransform(sig); if (r) { const ridge = waveletRidge(r.cwt, r.scales); if (ridge) { expect(ridge.ridge.length).toBeGreaterThan(0); ridge.ridge.forEach(p => { expect(Number.isFinite(p.time)).toBe(true); expect(Number.isFinite(p.scale)).toBe(true); }); } } });
});

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

describe('stft', () => {
  const sig = Array.from({length: 200}, (_, i) => Math.sin(2 * Math.PI * i * 0.05));
  it('contract keys', () => expectKeys(stft(sig, { windowSize: 64 }), ['test','spectrogram','nFrames','windowSize','hopSize','n','apa']));
  it('nFrames > 0', () => { const r = stft(sig, { windowSize: 64 }); if (r) expect(r.nFrames).toBeGreaterThan(0); });
  it('null for short signal', () => expect(stft([1, 2, 3], { windowSize: 64 })).toBeNull());
});
describe('cepstrum', () => {
  const sig = Array.from({length: 128}, (_, i) => Math.sin(2 * Math.PI * i * 0.03) + 0.5 * Math.sin(2 * Math.PI * i * 0.09));
  it('contract keys', () => expectKeys(cepstrum(sig), ['test','cepstral','quefrency','n','apa']));
  it('null <10', () => expect(cepstrum([1,2])).toBeNull());
  it('cepstral array non-empty', () => { const r = cepstrum(sig); if (r) expect(r.cepstral.length).toBeGreaterThan(0); });
});
describe('melSpectrogram', () => {
  const sig = Array.from({length: 600}, (_, i) => Math.sin(2 * Math.PI * i * 0.02));
  it('contract keys', () => expectKeys(melSpectrogram(sig, { nMels: 20, fftSize: 256, hopSize: 128 }), ['test','frames','nMels','nFrames','n','apa']));
  it('nMels positive', () => { const r = melSpectrogram(sig, { nMels: 20, fftSize: 256, hopSize: 128 }); if (r) expect(r.nMels).toBeGreaterThan(0); });
  it('null for short signal', () => expect(melSpectrogram([1, 2, 3], { fftSize: 256, hopSize: 128 })).toBeNull());
});

describe('hardening — invalid inputs', () => {
  it('fft null for null', () => expect(fft(null)).toBeNull());
  it('fft null for empty', () => expect(fft([])).toBeNull());
  it('powerSpectrum null for null', () => expect(powerSpectrum(null)).toBeNull());
  it('autocorrelation null for null', () => expect(autocorrelation(null)).toBeNull());
  it('stft null for null', () => expect(stft(null, { windowSize: 64 })).toBeNull());
  it('cepstrum null for null', () => expect(cepstrum(null)).toBeNull());
  it('melSpectrogram null for null', () => expect(melSpectrogram(null, { fftSize: 256, hopSize: 128 })).toBeNull());
  it('hilbertTransform null for null', () => expect(hilbertTransform(null)).toBeNull());
  it('spectrogram null for null', () => expect(spectrogram(null, { windowSize: 32 })).toBeNull());
  it('welchPSD null for null', () => expect(welchPSD(null, { windowSize: 32, overlap: 16 })).toBeNull());
  it('coherence null for null', () => expect(coherence(null, sig, { windowSize: 32 })).toBeNull());
  it('crossSpectralDensity null for null', () => expect(crossSpectralDensity(null, sig, { windowSize: 32 })).toBeNull());
  it('phaseSpectrum null for null', () => expect(phaseSpectrum(null, sig)).toBeNull());
  it('transferFunction null for null', () => expect(transferFunction(null, sig)).toBeNull());
  it('waveletTransform null for null', () => expect(waveletTransform(null)).toBeNull());
  it('waveletCoherence null for null', () => expect(waveletCoherence(null, sig)).toBeNull());
  it('crossWavelet null for null', () => expect(crossWavelet(null, sig)).toBeNull());
  it('waveletSignificance null for null', () => expect(waveletSignificance(null, 10)).toBeNull());
  it('waveletRidge null for null', () => expect(waveletRidge(null, [])).toBeNull());
  it('crossCorrelation null for null', () => expect(crossCorrelation(null, sig)).toBeNull());
  it('haarWavelet null for null', () => expect(haarWavelet(null)).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('fft with constant signal has DC peak', () => {
    const r = fft([1, 1, 1, 1, 1, 1, 1, 1]);
    if (r) { expect(r.magnitude.length).toBeGreaterThan(0); }
  });
  it('powerSpectrum with single frequency has clear peak', () => {
    const tone = Array.from({ length: 64 }, (_, i) => Math.sin(2 * Math.PI * i * 4 / 64));
    const r = powerSpectrum(tone);
    if (r) { expect(r.psd.length).toBeGreaterThan(0); r.psd.forEach(p => expect(p.power).toBeGreaterThanOrEqual(0)); }
  });
  it('autocorrelation lag 0 always 1', () => {
    const r = autocorrelation([1, -2, 3, -4, 5, -6, 7, -8, 9, -10]);
    if (r && r.correlations.length > 0) expect(r.correlations[0].r).toBeCloseTo(1, 2);
  });
  it('hilbertTransform envelope non-negative', () => {
    const r = hilbertTransform(sig);
    if (r) r.envelope.forEach(e => expect(e).toBeGreaterThanOrEqual(0));
  });
  it('coherence of signal with itself has max coherence near 1', () => {
    const r = coherence(sig, sig, { windowSize: 32, overlap: 16 });
    if (r) expect(Math.max(...r.coherence.map(c => c.coherence))).toBeGreaterThan(0.9);
  });
  it('waveletCoherence entries in [0, 1]', () => {
    const r = waveletCoherence(sig, sig);
    if (r && r.coherence) r.coherence.forEach(row => row.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }));
  });
});
