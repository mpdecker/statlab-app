import { avg } from '../math/core.js';

// Softmax
export function softmax(logits) {
  if (!logits || !logits.length) return null;
  const mx = Math.max(...logits);
  const exps = logits.map(v => Math.exp(v - mx));
  const sum = exps.reduce((s, v) => s + v, 0);
  return { test: 'Softmax', probabilities: exps.map(v => +(v / sum).toFixed(4)), n: logits.length, apa: `Softmax: ${logits.length} classes` };
}

// Activation functions
export function activate(x, type = 'relu') {
  if (Array.isArray(x)) {
    const y = x.map(v => type === 'relu' ? Math.max(0, v) : type === 'sigmoid' ? 1 / (1 + Math.exp(-v)) : Math.tanh(v));
    return { test: 'Activation', output: y.slice(0, 10).map(v => +v.toFixed(4)), type, n: x.length, apa: `${type}: ${x.length} inputs` };
  }
  const y = type === 'relu' ? Math.max(0, x) : type === 'sigmoid' ? 1 / (1 + Math.exp(-x)) : Math.tanh(x);
  return { test: 'Activation', output: +y.toFixed(4), type, apa: `${type}(${x.toFixed(2)}) = ${y.toFixed(4)}` };
}

// Softmax Cross Entropy Loss
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

// Gradient Descent (Mini-batch SGD for linear model)
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

// Adam Update (single step)
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

// Xavier Initialization
export function xavierInit(nIn, nOut) {
  if (!nIn || !nOut || nIn < 1 || nOut < 1) return null;
  const limit = Math.sqrt(6 / (nIn + nOut));
  const W = Array.from({ length: nOut }, () =>
    Array.from({ length: nIn }, () => +((Math.random() * 2 - 1) * limit).toFixed(4))
  );
  return { test: 'Xavier Init', weights: W.slice(0, 5).map(r => r.slice(0, 5)), nIn, nOut, limit: +limit.toFixed(6), apa: `Xavier: ${nIn}→${nOut}, limit = ${limit.toFixed(5)}` };
}
