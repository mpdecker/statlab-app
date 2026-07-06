import { avg } from '../math/core.js';
import { chiCrit } from '../math/power.js';

function nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function cmult(ar, ai, br, bi) {
  return [ar * br - ai * bi, ar * bi + ai * br];
}

// ── Radix-2 FFT (Cooley-Tukey) ────────────────────────────────────────────
/** @param {number[]} signal */
export function fft(signal) {
  if (!signal || signal.length < 2) return null;
  const N = nextPow2(signal.length);
  const real = new Float64Array(N);
  const imag = new Float64Array(N);
  for (let i = 0; i < signal.length; i++) real[i] = signal[i];

  // Bit-reversal
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Butterfly
  for (let len = 2; len <= N; len *= 2) {
    const half = len >> 1;
    const angle = -2 * Math.PI / len;
    const wRe = Math.cos(angle), wIm = Math.sin(angle);
    for (let i = 0; i < N; i += len) {
      let curRe = 1, curIm = 0;
      for (let k = 0; k < half; k++) {
        const re = real[i + k + half] * curRe - imag[i + k + half] * curIm;
        const im = real[i + k + half] * curIm + imag[i + k + half] * curRe;
        real[i + k + half] = real[i + k] - re;
        imag[i + k + half] = imag[i + k] - im;
        real[i + k] += re;
        imag[i + k] += im;
        [curRe, curIm] = cmult(curRe, curIm, wRe, wIm);
      }
    }
  }

  const spectrum = [];
  for (let i = 0; i < N; i++) spectrum.push({ re: +real[i].toFixed(6), im: +imag[i].toFixed(6) });
  const magnitude = spectrum.map(s => +Math.sqrt(s.re ** 2 + s.im ** 2).toFixed(4));
  const phase = spectrum.map(s => +Math.atan2(s.im, s.re).toFixed(4));

  return {
    test: 'FFT', spectrum, magnitude, phase, n: signal.length, nFreq: N,
    apa: `FFT: ${signal.length} samples → ${N} frequencies`,
  };
}

// ── Power Spectrum ─────────────────────────────────────────────────────────
/** @param {number[]} signal */
export function powerSpectrum(signal, { samplingRate = 1 } = {}) {
  if (!signal || signal.length < 4) return null;
  const N = nextPow2(signal.length);
  const result = fft(signal);
  if (!result) return null;
  const psd = [];
  for (let i = 0; i <= N / 2; i++) {
    const freq = i * samplingRate / N;
    const s = result.spectrum[i];
    const power = (s.re ** 2 + s.im ** 2) / N;
    psd.push({ frequency: +freq.toFixed(4), power: +power.toFixed(6) });
  }
  return {
    test: 'Power Spectrum', psd, n: signal.length, samplingRate,
    apa: `Power spectrum: ${psd.length} freq bins, fs = ${samplingRate}`,
  };
}

// ── Autocorrelation ────────────────────────────────────────────────────────
/** @param {number[]} signal */
export function autocorrelation(signal, { maxLag = null } = {}) {
  if (!signal || signal.length < 5) return null;
  const n = signal.length;
  const lagMax = maxLag ? Math.min(maxLag, n - 1) : Math.floor(n / 4);
  const mu = avg(signal);
  let denom = 0;
  for (const x of signal) denom += (x - mu) ** 2;
  if (!denom) return null;
  const correlations = [];
  for (let k = 0; k <= lagMax; k++) {
    let num = 0;
    for (let t = 0; t < n - k; t++) num += (signal[t] - mu) * (signal[t + k] - mu);
    correlations.push({ lag: k, r: +(num / denom).toFixed(4) });
  }
  return {
    test: 'Autocorrelation', correlations, n,
    apa: `Autocorrelation: ${lagMax + 1} lags, n = ${n}`,
  };
}

// ── Cross-Correlation ──────────────────────────────────────────────────────
/** @param {number[]} x @param {number[]} y */
export function crossCorrelation(x, y, { maxLag = null } = {}) {
  if (!x || !y || x.length < 5 || x.length !== y.length) return null;
  const n = x.length;
  const lagMax = maxLag ? Math.min(maxLag, n - 1) : Math.floor(n / 4);
  const mx = avg(x), my = avg(y);
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; }
  if (!sx || !sy) return null;
  const correlations = [];
  for (let k = 0; k <= lagMax; k++) {
    let num = 0;
    for (let t = 0; t < n - k; t++) num += (x[t] - mx) * (y[t + k] - my);
    correlations.push({ lag: k, r: +(num / Math.sqrt(sx * sy)).toFixed(4) });
  }
  return {
    test: 'Cross-Correlation', correlations, n,
    apa: `Cross-correlation: ${lagMax + 1} lags, n = ${n}`,
  };
}

// ── Haar Wavelet Decomposition ─────────────────────────────────────────────
/** @param {number[]} signal */
export function haarWavelet(signal) {
  if (!signal || signal.length < 4) return null;
  const n = signal.length;
  const padded = n === nextPow2(n) ? [...signal] : (() => {
    const p = nextPow2(n);
    const arr = new Float64Array(p);
    for (let i = 0; i < n; i++) arr[i] = signal[i];
    return arr;
  })();
  const m = padded.length;
  const levels = Math.floor(Math.log2(m));
  const coeffs = [...padded];

  for (let L = 0; L < levels; L++) {
    const step = 1 << (levels - L);
    const temp = new Float64Array(m);
    for (let i = 0; i < m; i += step) {
      const a = coeffs[i], b = coeffs[i + step / 2];
      temp[i] = (a + b) / Math.SQRT2;
      temp[i + step / 2] = (a - b) / Math.SQRT2;
    }
    for (let i = 0; i < m; i++) coeffs[i] = temp[i];
  }

  return {
    test: 'Haar Wavelet', coefficients: Array.from(coeffs).map(v => +v.toFixed(6)), levels, n,
    apa: `Haar wavelet: ${levels} levels, n = ${n}`,
  };
}

// ── Hilbert Transform ──────────────────────────────────────────────────────
/** @param {number[]} signal */
export function hilbertTransform(signal) {
  if (!signal || signal.length < 4) return null;
  const N = nextPow2(signal.length);
  const result = fft(signal);
  if (!result) return null;
  // Zero negative frequencies, double positive, keep DC
  const spec = result.spectrum;
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N; i++) { re[i] = spec[i].re; im[i] = spec[i].im; }

  for (let i = 0; i < N; i++) {
    if (i === 0) { re[i] = spec[i].re; im[i] = spec[i].im; }
    else if (i < N / 2) { re[i] *= 2; im[i] *= 2; }
    else if (i === N / 2) { re[i] = spec[i].re; im[i] = spec[i].im; }
    else { re[i] = 0; im[i] = 0; }
  }

  // Inverse FFT (conjugate approach: IFFT = conj(FFT(conj(X)))/N)
  // Or just reconstruct time domain from selected bins
  const ifft = fft(Array.from(re).slice(0, N));
  if (!ifft) return null;
  // Actually, use direct time-domain reconstruction
  let invRe = [];
  for (let k = 0; k < N; k++) {
    let sumRe = 0, sumIm = 0;
    for (let n = 0; n < N; n++) {
      const angle = 2 * Math.PI * k * n / N;
      sumRe += re[n] * Math.cos(angle) - im[n] * Math.sin(angle);
      sumIm += re[n] * Math.sin(angle) + im[n] * Math.cos(angle);
    }
    invRe.push(sumRe / N);
  }

  const envelope = invRe.slice(0, signal.length).map((v, i) => +Math.sqrt(v ** 2 + signal[i] ** 2).toFixed(4));
  const phase = invRe.slice(0, signal.length).map((v, i) => +Math.atan2(signal[i], Math.max(v, 1e-10)).toFixed(4));

  return {
    test: 'Hilbert Transform', envelope, phase, n: signal.length,
    apa: `Hilbert transform: envelope and phase, n = ${signal.length}`,
  };
}

// ── Spectrogram ────────────────────────────────────────────────────────────
/** @param {number[]} signal */
export function spectrogram(signal, { windowSize = 256, overlap = 128, samplingRate = 1 } = {}) {
  if (!signal || signal.length < windowSize) return null;
  const n = signal.length;
  const step = windowSize - overlap;
  if (step <= 0) return null;
  const nWindows = Math.floor((n - windowSize) / step) + 1;
  const specData = [];
  const times = [];

  for (let w = 0; w < nWindows; w++) {
    const start = w * step;
    const win = signal.slice(start, start + windowSize);
    // Apply Hann window
    for (let i = 0; i < windowSize; i++) win[i] *= 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowSize - 1)));
    const fftr = fft(win);
    if (!fftr) continue;
    const mag = fftr.magnitude.slice(0, Math.floor(windowSize / 2) + 1);
    specData.push(mag.map(v => +(v < 1e-10 ? 0 : 20 * Math.log10(v)).toFixed(4)));
    times.push(+(start / samplingRate).toFixed(4));
  }

  const N = specData[0]?.length || 0;
  const frequencies = Array.from({ length: N }, (_, i) => +(i * samplingRate / windowSize).toFixed(4));

  return {
    test: 'Spectrogram', spectrogram: specData, times, frequencies, n,
    apa: `Spectrogram: ${nWindows} windows, ${windowSize}-pt FFT, fs = ${samplingRate}`,
  };
}

// ── Welch PSD ─────────────────────────────────────────────────────
/** @param {number[]} signal */
export function welchPSD(signal, { windowSize = 256, overlap = 128, samplingRate = 1 } = {}) {
  if (!signal || signal.length < windowSize) return null;
  const step = windowSize - overlap;
  if (step <= 0) return null;
  const nWindows = Math.floor((signal.length - windowSize) / step) + 1;
  const N = nextPow2(windowSize);
  const psdSum = Array(N / 2 + 1).fill(0);
  for (let w = 0; w < nWindows; w++) {
    const start = w * step;
    const win = signal.slice(start, start + windowSize).map((v, i) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (windowSize - 1))));
    const fr = fft(win);
    if (!fr) continue;
    for (let i = 0; i < psdSum.length; i++) {
      const s = fr.spectrum[i];
      psdSum[i] += (s.re ** 2 + s.im ** 2);
    }
  }
  const psd = psdSum.map((v, i) => ({ frequency: +(i * samplingRate / N).toFixed(4), power: +(v / nWindows / N).toFixed(6) }));
  return { test: 'Welch PSD', psd, nWindows, samplingRate, n: signal.length, apa: `Welch PSD: ${nWindows} windows of ${windowSize}, fs=${samplingRate}` };
}

// ── Coherence ─────────────────────────────────────────────────────
/** @param {number[]} x @param {number[]} y */
export function coherence(x, y, { windowSize = 256, overlap = 128 } = {}) {
  if (!x || !y || x.length !== y.length || x.length < windowSize) return null;
  const step = windowSize - overlap;
  if (step <= 0) return null;
  const nWindows = Math.floor((x.length - windowSize) / step) + 1;
  const N = nextPow2(windowSize);
  const pxx = Array(N / 2 + 1).fill(0), pyy = Array(N / 2 + 1).fill(0);
  const cxy = Array.from({ length: N / 2 + 1 }, () => ({ re: 0, im: 0 }));
  for (let w = 0; w < nWindows; w++) {
    const s = w * step;
    const wx = x.slice(s, s + windowSize).map((v, i) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (windowSize - 1))));
    const wy = y.slice(s, s + windowSize).map((v, i) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (windowSize - 1))));
    const fx = fft(wx), fy = fft(wy);
    if (!fx || !fy) continue;
    for (let i = 0; i < pxx.length; i++) {
      const sx = fx.spectrum[i], sy = fy.spectrum[i];
      pxx[i] += sx.re ** 2 + sx.im ** 2;
      pyy[i] += sy.re ** 2 + sy.im ** 2;
      cxy[i].re += sx.re * sy.re + sx.im * sy.im;
      cxy[i].im += -sx.re * sy.im + sx.im * sy.re;
    }
  }
  const coh = cxy.map((c, i) => {
    const denom = Math.max(pxx[i] * pyy[i], 1e-10);
    return { frequency: +(i / N).toFixed(4), coherence: +((c.re ** 2 + c.im ** 2) / denom).toFixed(4) };
  });
  return { test: 'Coherence', coherence: coh, n: x.length, apa: `Coherence: ${nWindows} windows, n=${x.length}` };
}

// ── Cross-Spectral Density ────────────────────────────────────────
/** @param {number[]} x @param {number[]} y */
export function crossSpectralDensity(x, y, { windowSize = 256 } = {}) {
  if (!x || !y || x.length !== y.length || x.length < windowSize) return null;
  const n = x.length;
  const N = nextPow2(windowSize);
  const win = x.slice(0, windowSize).map((v, i) => v * (param1(i, windowSize)));
  const wy = y.slice(0, windowSize).map((v, i) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (windowSize - 1))));
  function param1(i, ws) { return 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (ws - 1)); }
  const wx = x.slice(0, windowSize).map((v, i) => v * param1(i, windowSize));
  const fx = fft(wx), fy = fft(wy);
  if (!fx || !fy) return null;
  const csd = [];
  for (let i = 0; i <= N / 2; i++) {
    const sx = fx.spectrum[i], sy = fy.spectrum[i];
    const re = sx.re * sy.re + sx.im * sy.im;
    const im = -sx.re * sy.im + sx.im * sy.re;
    csd.push({ frequency: +(i / N).toFixed(4), real: +re.toFixed(6), imag: +im.toFixed(6), magnitude: +Math.sqrt(re ** 2 + im ** 2).toFixed(6) });
  }
  return { test: 'Cross-Spectral Density', csd, n, apa: `CSD: ${csd.length} freq bins, n=${n}` };
}

// ── Phase Spectrum ────────────────────────────────────────────────
/** @param {number[]} x @param {number[]} y */
export function phaseSpectrum(x, y) {
  if (!x || !y || x.length !== y.length || x.length < 10) return null;
  const csd = crossSpectralDensity(x, y);
  if (!csd) return null;
  const phase = csd.csd.map(c => ({ frequency: c.frequency, phase: +Math.atan2(c.imag, c.real).toFixed(4) }));
  return { test: 'Phase Spectrum', phase, n: x.length, apa: `Phase spectrum: ${phase.length} bins` };
}

// ── Transfer Function ─────────────────────────────────────────────
/** @param {number[]} x @param {number[]} y */
export function transferFunction(x, y) {
  if (!x || !y || x.length !== y.length || x.length < 10) return null;
  const csd = crossSpectralDensity(x, y);
  if (!csd) return null;
  const tf = csd.csd.map(c => {
    const mag = c.magnitude;
    return { frequency: c.frequency, magnitude: +mag.toFixed(4), phase: +Math.atan2(c.imag, c.real).toFixed(4) };
  });
  return { test: 'Transfer Function', tf, n: x.length, apa: `Transfer function: ${tf.length} bins` };
}

// ── Wavelet Transform (CWT via Morlet) ────────────────────────────
/** @param {number[]} signal */
export function waveletTransform(signal, { nScales = 10 } = {}) {
  if (!signal || signal.length < 8) return null;
  const n = signal.length;
  const scales = Array.from({ length: nScales }, (_, i) => 2 * Math.pow(2, i * 0.5));
  const cwt = scales.map(scale => {
    const coeffs = [];
    for (let t = 0; t < n; t++) {
      let val = 0;
      for (let k = 0; k < n; k++) {
        const s = (k - t) / scale;
        val += signal[k] * Math.exp(-0.5 * s * s) * Math.cos(5 * s);
      }
      coeffs.push(+val.toFixed(6));
    }
    return coeffs;
  });
  return { test: 'Wavelet Transform', cwt: cwt.slice(0, 3).map(r => r.slice(0, 5)), scales: scales.map(s => +s.toFixed(2)), n, apa: `CWT: ${nScales} scales, n = ${n}` };
}

// ── Wavelet Coherence ─────────────────────────────────────────────
/** @param {number[]} x @param {number[]} y */
export function waveletCoherence(x, y, { nScales = 8 } = {}) {
  if (!x || !y || x.length !== y.length || x.length < 10) return null;
  const n = x.length;
  const scales = Array.from({ length: nScales }, (_, i) => 2 * Math.pow(2, i * 0.5));
  const cwtX = waveletTransform(x, { nScales })?.cwt;
  const cwtY = waveletTransform(y, { nScales })?.cwt;
  if (!cwtX || !cwtY) return null;
  const coh = scales.map((_, si) => {
    const row = [];
    for (let t = 0; t < n; t++) {
      const sx = cwtX[si]?.[t] || 0, sy = cwtY[si]?.[t] || 0;
      row.push(+(Math.abs(sx * sy) / Math.max(Math.abs(sx * sx + sy * sy), 1e-10)).toFixed(4));
    }
    return row;
  });
  return { test: 'Wavelet Coherence', coherence: coh.slice(0, 3).map(r => r.slice(0, 5)), scales: scales.map(s => +s.toFixed(2)), n, apa: `Wavelet coherence: ${nScales} scales` };
}

// ── Cross-Wavelet ─────────────────────────────────────────────────
/** @param {number[]} x @param {number[]} y */
export function crossWavelet(x, y, { nScales = 8 } = {}) {
  if (!x || !y || x.length !== y.length || x.length < 10) return null;
  const n = x.length;
  const cwtX = waveletTransform(x, { nScales })?.cwt;
  const cwtY = waveletTransform(y, { nScales })?.cwt;
  if (!cwtX || !cwtY) return null;
  const xwt = cwtX.map((row, si) => row.map((v, t) => +((v) * (cwtY[si]?.[t] || 0)).toFixed(6)));
  return { test: 'Cross-Wavelet', xwt: xwt.slice(0, 3).map(r => r.slice(0, 5)), n, apa: `Cross-wavelet: n = ${n}` };
}

// ── Wavelet Significance (Torrence & Compo 1998, white-noise null) ────────
// Wavelet power |W|² is asymptotically distributed as (background spectrum)
// × χ²_2/2 under a white-noise null, so the correct significance threshold is
// P_k·χ²_2(α)/2 — a real chi-square quantile, not the ad hoc log(1/α) the old
// code used (which doesn't depend on the data's power level at all). Since
// this function only receives the power matrix (not the raw series), the
// white-noise background level P_k is estimated as the mean power across all
// scales/times — the standard practical stand-in when no separate noise
// model (e.g. AR(1) red noise) is fit.
/** @param {number} power @param {number} n */
export function waveletSignificance(power, n, { alpha = 0.05 } = {}) {
  if (!power || !power.length) return null;
  const flat = power.flat();
  const meanPower = avg(flat) || 1;
  const chi2crit = chiCrit(alpha, 2);
  const threshold = meanPower * chi2crit / 2;
  const mask = power.map(row => row.map(v => Math.abs(v) > threshold));
  return { test: 'Wavelet Significance', significant: mask.slice(0, 3).map(r => r.slice(0, 5)), threshold: +threshold.toFixed(6), alpha, apa: `Wavelet sig: α = ${alpha}, χ²₂ threshold = ${threshold.toFixed(3)}` };
}

// ── Wavelet Ridge ─────────────────────────────────────────────────
export function waveletRidge(cwt, scales) {
  if (!cwt || !cwt.length) return null;
  const ridge = cwt[0].map((_, t) => {
    let maxVal = -Infinity, maxScale = 0;
    cwt.forEach((row, si) => {
      if (Math.abs(row[t]) > maxVal) { maxVal = Math.abs(row[t]); maxScale = scales?.[si] || si; }
    });
    return { time: t, scale: +maxScale.toFixed(2), power: +maxVal.toFixed(4) };
  });
  return { test: 'Wavelet Ridge', ridge: ridge.slice(0, 20), n: cwt[0]?.length, apa: `Ridge: ${ridge.length} points` };
}

// ── Short-Time Fourier Transform ──────────────────────────────────
/** @param {number[]} signal */
export function stft(signal, { windowSize = 64, hopSize = null, window = 'hann' } = {}) {
  if (!signal || signal.length < windowSize) return null;
  const hop = hopSize || Math.floor(windowSize / 2);
  const win = Array.from({ length: windowSize }, (_, i) => {
    if (window === 'hann') return 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowSize - 1)));
    return 1;
  });
  const nFrames = Math.floor((signal.length - windowSize) / hop) + 1;
  const spectrogram = [];
  for (let f = 0; f < nFrames; f++) {
    const frame = signal.slice(f * hop, f * hop + windowSize).map((v, i) => v * win[i]);
    const fftOut = fft(frame);
    if (fftOut) spectrogram.push({ time: f * hop, magnitude: fftOut.magnitude.slice(0, windowSize / 2).map(v => +v.toFixed(4)) });
  }
  return { test: 'STFT', spectrogram: spectrogram.slice(0, 10), nFrames, windowSize, hopSize: hop, n: signal.length, apa: `STFT: ${nFrames} frames, window=${windowSize}` };
}

// ── Cepstrum ──────────────────────────────────────────────────────
/** @param {number[]} signal */
export function cepstrum(signal) {
  if (!signal || signal.length < 10) return null;
  const n = signal.length;
  const spec = fft(signal);
  if (!spec) return null;
  const logMag = spec.magnitude.map(m => Math.log(Math.max(m, 1e-10)));
  const logMagPadded = [...logMag, ...Array(n * 2 - logMag.length * 2).fill(0)];
  const ceps = fft(logMagPadded.slice(0, n * 2));
  const cepstral = ceps && ceps.spectrum ? ceps.spectrum.slice(0, Math.floor(n / 2)).map(v => +(v.re || 0).toFixed(4)) : [];
  const peakIdx = cepstral.indexOf(Math.max(...cepstral));
  const quefrency = peakIdx > 0 ? peakIdx : null;
  return { test: 'Cepstrum', cepstral: cepstral.slice(0, 20), quefrency, n, apa: `Cepstrum: quefrency = ${quefrency || 'none'}` };
}

// ── Mel Spectrogram ───────────────────────────────────────────────
/** @param {number[]} signal */
export function melSpectrogram(signal, { nMels = 40, fftSize = 512, hopSize = 256, sampleRate = 16000 } = {}) {
  if (!signal || signal.length < fftSize) return null;
  const nFrames = Math.floor((signal.length - fftSize) / hopSize) + 1;
  const melPoints = Array.from({ length: nMels + 2 }, (_, i) => {
    const mel = i * (2595 * Math.log10(1 + sampleRate / 2 / 700)) / (nMels + 1);
    return +((700 * (Math.pow(10, mel / 2595) - 1)) / (sampleRate / 2)).toFixed(4);
  });
  const melBands = Array.from({ length: nMels }, (_, m) => ({
    start: melPoints[m], center: melPoints[m+1], end: melPoints[m+2]
  }));
  const frames = [];
  for (let f = 0; f < nFrames; f++) {
    const frame = signal.slice(f * hopSize, f * hopSize + fftSize);
    const spec = fft(frame);
    if (!spec) continue;
    const mag = spec.magnitude.slice(0, fftSize / 2);
    const melEnergies = melBands.map(band => {
      let energy = 0;
      for (let k = 0; k < mag.length; k++) {
        const freq = k * sampleRate / fftSize / (sampleRate / 2);
        if (freq >= band.start && freq <= band.end) {
          const weight = freq <= band.center ? (freq - band.start) / (band.center - band.start + 1e-10) : (band.end - freq) / (band.end - band.center + 1e-10);
          energy += mag[k] * weight;
        }
      }
      return +energy.toFixed(4);
    });
    frames.push({ frame: f, energies: melEnergies });
  }
  return { test: 'Mel Spectrogram', frames: frames.slice(0, 10), nMels, nFrames, n: signal.length, apa: `Mel: ${nMels} bands, ${nFrames} frames` };
}
