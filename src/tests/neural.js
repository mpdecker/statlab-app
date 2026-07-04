import { avg } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Softmax ───────────────────────────────────────────────────────
export function softmax(logits) {
  if (!logits || !logits.length) return null;
  const mx = Math.max(...logits);
  const exps = logits.map(v => Math.exp(v - mx));
  const sum = exps.reduce((s, v) => s + v, 0);
  return { test: 'Softmax', probabilities: exps.map(v => +(v / sum).toFixed(4)), n: logits.length, apa: `Softmax: ${logits.length} classes` };
}

// ── Activation functions ──────────────────────────────────────────
export function activate(x, type = 'relu') {
  if (Array.isArray(x)) {
    const y = x.map(v => type === 'relu' ? Math.max(0, v) : type === 'sigmoid' ? 1 / (1 + Math.exp(-v)) : Math.tanh(v));
    return { test: 'Activation', output: y.slice(0, 10).map(v => +v.toFixed(4)), type, n: x.length, apa: `${type}: ${x.length} inputs` };
  }
  const y = type === 'relu' ? Math.max(0, x) : type === 'sigmoid' ? 1 / (1 + Math.exp(-x)) : Math.tanh(x);
  return { test: 'Activation', output: +y.toFixed(4), type, apa: `${type}(${x.toFixed(2)}) = ${y.toFixed(4)}` };
}

// ── Softmax Cross Entropy Loss ────────────────────────────────────
export function softmaxCrossEntropy(logits, targets) {
  if (!logits || !targets || logits.length !== targets.length) return null;
  const mx = Math.max(...logits);
  const exps = logits.map(v => Math.exp(v - mx));
  const sum = exps.reduce((s, v) => s + v, 0);
  const probs = exps.map(v => v / sum);
  let loss = 0;
  for (let i = 0; i < logits.length; i++) loss -= targets[i] * Math.log(Math.max(probs[i], 1e-10));
  return { test: 'Softmax Cross Entropy', loss: +loss.toFixed(4), n: logits.length, apa: `Cross-entropy loss = ${loss.toFixed(4)}` };
}

// ── Gradient Descent (Mini-batch SGD for linear model) ────────────
export function gradientDescent(X, y, { lr = 0.01, epochs = 100, batchSize = null } = {}) {
  if (!X || !y || X.length < 5 || X.length !== y.length) return null;
  const n = X.length, p = X[0]?.length || 0;
  const bs = batchSize || n;
  let w = Array(p).fill(0);
  let b = 0;
  const losses = [];
  for (let e = 0; e < epochs; e++) {
    for (let i = 0; i < n; i += bs) {
      const end = Math.min(i + bs, n);
      let gw = Array(p).fill(0), gb = 0;
      for (let j = i; j < end; j++) {
        const pred = w.reduce((s, wk, k) => s + wk * X[j][k], b);
        const err = pred - y[j];
        for (let k = 0; k < p; k++) gw[k] += err * X[j][k] / (end - i);
        gb += err / (end - i);
      }
      w = w.map((wk, k) => wk - lr * gw[k]);
      b -= lr * gb;
    }
    const fit = X.map(xi => w.reduce((s, wk, k) => s + wk * xi[k], b));
    losses.push(+avg(fit.map((f, i) => (f - y[i]) ** 2)).toFixed(4));
  }
  return { test: 'Gradient Descent', weights: w.map(v => +v.toFixed(4)), bias: +b.toFixed(4), finalLoss: losses[losses.length - 1], epochs, n, apa: `SGD: loss = ${losses[losses.length - 1].toFixed(4)}` };
}

// ── Adam Update (single step) ─────────────────────────────────────
export function adamUpdate(params, grads, mom, vel, { lr = 0.001, beta1 = 0.9, beta2 = 0.999, t = 1 } = {}) {
  if (!params || !grads || params.length !== grads.length) return null;
  const n = params.length;
  mom = mom || Array(n).fill(0);
  vel = vel || Array(n).fill(0);
  const updated = params.map((p, i) => {
    mom[i] = beta1 * mom[i] + (1 - beta1) * grads[i];
    vel[i] = beta2 * vel[i] + (1 - beta2) * grads[i] * grads[i];
    const mHat = mom[i] / (1 - Math.pow(beta1, t));
    const vHat = vel[i] / (1 - Math.pow(beta2, t));
    return +(p - lr * mHat / (Math.sqrt(vHat) + 1e-8)).toFixed(6);
  });
  return { test: 'Adam Update', params: updated.slice(0, 10), lr, t, n, apa: `Adam step t=${t}, lr=${lr}` };
}

// ── Xavier Initialization ─────────────────────────────────────────
export function xavierInit(nIn, nOut, seed = 42) {
  __rng = mulberry32(seed);
  if (!nIn || !nOut || nIn < 1 || nOut < 1) return null;
  const limit = Math.sqrt(6 / (nIn + nOut));
  const W = Array.from({ length: nOut }, () =>
    Array.from({ length: nIn }, () => +((__rng() * 2 - 1) * limit).toFixed(4))
  );
  return { test: 'Xavier Init', weights: W.slice(0, 5).map(r => r.slice(0, 5)), nIn, nOut, limit: +limit.toFixed(6), apa: `Xavier: ${nIn}→${nOut}, limit = ${limit.toFixed(5)}` };
}

// ── Backpropagation (simple 2-layer MLP) ──────────────────────────
export function backpropagation(X, y, nHidden = 4, { seed = 42, lr = 0.01, epochs = 100 } = {}) {
  __rng = mulberry32(seed);
  if (!X || !y || X.length < 5 || y.length < 5 || X.length !== y.length) return null;
  const n = X.length, p = X[0].length;
  const W1 = Array.from({length: p}, () => Array.from({length: nHidden}, () => (__rng() - 0.5) * 0.1));
  const b1 = Array(nHidden).fill(0);
  const W2 = Array.from({length: nHidden}, () => Array(1).fill(0).map(() => (__rng() - 0.5) * 0.1));
  const b2 = [0];
  let loss = 0;
  for (let e = 0; e < epochs; e++) {
    loss = 0;
    for (let i = 0; i < n; i++) {
      const h = W1[0].map((_, j) => {
        let s = b1[j];
        for (let k = 0; k < p; k++) s += X[i][k] * W1[k][j];
        return Math.tanh(s);
      });
      const pred = b2[0] + h.reduce((s, v, j) => s + v * W2[j][0], 0);
      const err = y[i] - pred;
      loss += err * err;
      const dOut = err;
      for (let j = 0; j < nHidden; j++) {
        W2[j][0] += lr * dOut * h[j];
        const dH = dOut * W2[j][0] * (1 - h[j] * h[j]);
        for (let k = 0; k < p; k++) W1[k][j] += lr * dH * X[i][k];
        b1[j] += lr * dH;
      }
      b2[0] += lr * dOut;
    }
  }
  return { test: 'Backpropagation', loss: +loss.toFixed(4), nHidden, epochs, n, p, apa: `MLP: ${nHidden} hidden, loss=${loss.toFixed(2)}` };
}

// ── 1D Convolution ────────────────────────────────────────────────
export function convolution1D(signal, kernel) {
  if (!signal || !kernel || signal.length < kernel.length) return null;
  const n = signal.length, k = kernel.length;
  const output = Array(n - k + 1).fill(0);
  for (let i = 0; i <= n - k; i++) {
    let s = 0;
    for (let j = 0; j < k; j++) s += signal[i + j] * kernel[j];
    output[i] = +s.toFixed(4);
  }
  return { test: '1D Convolution', output, kernelSize: k, outputSize: output.length, n, apa: `Conv1D: kernel=${k}, output=${output.length}` };
}

// ── 2D Convolution ────────────────────────────────────────────────
export function conv2D(input, kernel, { stride = 1, padding = 0 } = {}) {
  if (!input || !kernel || !input.length || !input[0] || kernel.length > input.length) return null;
  const h = input.length, w = input[0].length, kh = kernel.length, kw = kernel[0].length;
  const oh = Math.floor((h + 2 * padding - kh) / stride) + 1;
  const ow = Math.floor((w + 2 * padding - kw) / stride) + 1;
  if (oh < 1 || ow < 1) return null;
  const output = Array.from({length: oh}, () => Array(ow).fill(0));
  for (let i = 0; i < oh; i++) {
    for (let j = 0; j < ow; j++) {
      let s = 0;
      for (let ki = 0; ki < kh; ki++) {
        for (let kj = 0; kj < kw; kj++) {
          // Offset by `padding`: the output-size formula above already accounts for
          // zero-padding, but without subtracting `padding` here the indices just read
          // straight into `input` unshifted — for padding>0 that reads the wrong cells
          // (or falls out of bounds early) instead of implementing actual zero-padding.
          s += (input[i * stride + ki - padding]?.[j * stride + kj - padding] || 0) * kernel[ki][kj];
        }
      }
      output[i][j] = +s.toFixed(4);
    }
  }
  return { test: '2D Convolution', output: output.slice(0, 10), outputShape: [oh, ow], kernelShape: [kh, kw], apa: `Conv2D: ${oh}x${ow} output` };
}

// ── Max Pooling ───────────────────────────────────────────────────
export function maxPooling(input, { poolSize = 2, stride = null } = {}) {
  if (!input || !input.length || !input[0]) return null;
  const h = input.length, w = input[0].length;
  const s = stride || poolSize;
  const ph = Math.floor(h / s), pw = Math.floor(w / s);
  if (ph < 1 || pw < 1) return null;
  const output = Array.from({length: ph}, () => Array(pw).fill(0));
  for (let i = 0; i < ph; i++) {
    for (let j = 0; j < pw; j++) {
      let mx = -Infinity;
      for (let pi = 0; pi < poolSize; pi++) for (let pj = 0; pj < poolSize; pj++) {
        mx = Math.max(mx, input[i * s + pi]?.[j * s + pj] || -Infinity);
      }
      output[i][j] = +mx.toFixed(4);
    }
  }
  return { test: 'Max Pooling', output: output.slice(0, 10), outputShape: [ph, pw], poolSize, apa: `MaxPool: ${poolSize}x${poolSize}, ${ph}x${pw}` };
}

// ── Batch Normalization ───────────────────────────────────────────
export function batchNorm(X, { eps = 1e-5 } = {}) {
  if (!X || X.length < 2 || !X[0]) return null;
  const n = X.length, d = X[0].length;
  const mean = X[0].map((_, j) => avg(X.map(r => r[j])));
  const vr = X[0].map((_, j) => {
    const m = mean[j];
    return X.reduce((s, r) => s + (r[j] - m) ** 2, 0) / n;
  });
  const norm = X.map(row => row.map((val, j) => +((val - mean[j]) / Math.sqrt(vr[j] + eps)).toFixed(4)));
  return { test: 'Batch Normalization', normalized: norm.slice(0, 5), n, d, apa: `BatchNorm: ${n} samples, ${d} dim` };
}

// ── Dropout ───────────────────────────────────────────────────────
export function dropout(X, rate = 0.5, { seed = 42 } = {}) {
  if (!X || !X.length || !X[0] || rate < 0 || rate >= 1) return null;
  const n = X.length, d = X[0].length;
  const rng = (s) => { let x = s; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; };
  const rand = rng(seed);
  const scale = 1 / (1 - rate);
  const output = X.map(row => row.map(v => rand() < (1 - rate) ? +(v * scale).toFixed(4) : 0));
  const activeRatio = output.flat().filter(v => v !== 0).length / (n * d);
  return { test: 'Dropout', output: output.slice(0, 5), rate, scale: +scale.toFixed(4), activeRatio: +activeRatio.toFixed(4), n, d, apa: `Dropout: rate=${rate}, scale=${scale.toFixed(2)}` };
}
