import { bootstrapCI } from '../math/distributions.js';
import { bootstrapMediation } from '../tests/regression.js';
import {
  powerANOVA, powerChi, powerLogistic, powerMixed, powerMediation,
} from '../math/power.js';
import { avg, median, sampleSD } from '../math/core.js';

const STAT_FN = { mean: avg, median, sd: sampleSD };
const WORKER_MIN_B = 400;
let jobSeq = 0;

function runInWorker(type, payload) {
  return new Promise((resolve, reject) => {
    const jobId = ++jobSeq;
    const worker = new Worker(new URL('../workers/resampleWorker.js', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Resample job timed out'));
    }, 120_000);
    worker.onmessage = (e) => {
      if (e.data?.jobId !== jobId) return;
      clearTimeout(timer);
      worker.terminate();
      if (e.data.ok) resolve(e.data.result);
      else reject(new Error(e.data.error || 'Worker failed'));
    };
    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      reject(err);
    };
    worker.postMessage({ jobId, type, payload });
  });
}

async function maybeWorker(type, payload, syncFn, { alwaysWorker = false } = {}) {
  const useWorker = typeof Worker !== 'undefined'
    && (alwaysWorker || (payload.B ?? 0) >= WORKER_MIN_B);
  if (useWorker) {
    try {
      return await runInWorker(type, payload);
    } catch {
      /* fall through to sync */
    }
  }
  return syncFn();
}

export async function runBootstrapCI(vals, stat, B, alpha, seed) {
  const fn = STAT_FN[stat] || avg;
  return maybeWorker(
    'bootstrapCI',
    { vals, stat, B, alpha, seed },
    () => bootstrapCI(vals, fn, B, alpha, seed),
  );
}

export async function runBootstrapMediation(X, M, Y, B, alpha, seed) {
  return maybeWorker(
    'bootstrapMediation',
    { X, M, Y, B, alpha, seed },
    () => bootstrapMediation(X, M, Y, B, alpha, seed),
  );
}

export async function runPowerANOVA(cohenF, k, nPerGroup, alpha, seed) {
  return maybeWorker(
    'powerANOVA',
    { cohenF, k, nPerGroup, alpha, seed },
    () => powerANOVA(cohenF, k, nPerGroup, alpha, seed),
    { alwaysWorker: true },
  );
}

export async function runPowerChi(cohenW, df, n, alpha) {
  return maybeWorker(
    'powerChi',
    { cohenW, df, n, alpha },
    () => powerChi(cohenW, df, n, alpha),
    { alwaysWorker: true },
  );
}

export async function runPowerLogistic(or, pControl, nPerGroup, alpha) {
  return maybeWorker(
    'powerLogistic',
    { or, pControl, nPerGroup, alpha },
    () => powerLogistic(or, pControl, nPerGroup, alpha),
    { alwaysWorker: true },
  );
}

export async function runPowerMixed(ICC, mClustersEach, subjectsPerCluster, CohenD, alpha) {
  return maybeWorker(
    'powerMixed',
    { ICC, mClustersEach, subjectsPerCluster, CohenD, alpha },
    () => powerMixed(ICC, mClustersEach, subjectsPerCluster, CohenD, alpha),
    { alwaysWorker: true },
  );
}

export async function runPowerMediation(aHat, bHat, seA, seB, B, alpha, seed) {
  return maybeWorker(
    'powerMediation',
    { aHat, bHat, seA, seB, B, alpha, seed },
    () => powerMediation(aHat, bHat, seA, seB, B, alpha, seed),
    { alwaysWorker: true },
  );
}
