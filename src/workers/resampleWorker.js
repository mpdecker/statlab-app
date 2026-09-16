/**
 * Off-main-thread bootstrap and Monte Carlo power jobs.
 */
import { bootstrapCI } from '@statlab/core/math/distributions';
import { avg, median, sampleSD } from '@statlab/core/math/core';
import { bootstrapMediation } from '@statlab/core/methods/regression';
import { powerANOVA, powerChi, powerLogistic, powerMixed, powerMediation } from '@statlab/core/math/power';

const STAT_FN = { mean: avg, median, sd: sampleSD };

/* v8 ignore start */
self.onmessage = ({ data }) => {
  const { jobId, type, payload } = data;
  try {
    let result = null;
    switch (type) {
      case 'bootstrapCI': {
        const fn = STAT_FN[payload.stat] || avg;
        result = bootstrapCI(payload.vals, fn, payload.B, payload.alpha, payload.seed);
        break;
      }
      case 'bootstrapMediation':
        result = bootstrapMediation(
          payload.X, payload.M, payload.Y, payload.B, payload.alpha, payload.seed,
        );
        break;
      case 'powerANOVA':
        result = powerANOVA(
          payload.cohenF, payload.k, payload.nPerGroup, payload.alpha, payload.seed,
        );
        break;
      case 'powerMediation':
        result = powerMediation(
          payload.aHat, payload.bHat, payload.seA, payload.seB, payload.B, payload.alpha, payload.seed,
        );
        break;
      case 'powerChi':
        result = powerChi(payload.cohenW, payload.df, payload.n, payload.alpha);
        break;
      case 'powerLogistic':
        result = powerLogistic(payload.or, payload.pControl, payload.nPerGroup, payload.alpha);
        break;
      case 'powerMixed':
        result = powerMixed(
          payload.ICC, payload.mClustersEach, payload.subjectsPerCluster, payload.CohenD, payload.alpha,
        );
        break;
      default:
        throw new Error(`Unknown resample job: ${type}`);
    }
    self.postMessage({ jobId, ok: true, result });
  } catch (e) {
    self.postMessage({ jobId, ok: false, error: String(e) });
  }
};
/* v8 ignore stop */
