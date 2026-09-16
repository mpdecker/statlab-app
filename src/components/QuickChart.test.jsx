// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import QuickChart from './QuickChart.jsx';
import { CHART_MODE_LABELS } from '../utils/vizHelpers.js';

const VIOLIN_DATA = [
  { g: 'a', y: 1 }, { g: 'a', y: 2 }, { g: 'a', y: 3 },
  { g: 'b', y: 4 }, { g: 'b', y: 5 }, { g: 'b', y: 6 },
];
const SCATTER_DATA = [
  { x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 7 },
];
const CAT_DATA = [
  { g: 'a', y: 'yes' }, { g: 'a', y: 'no' }, { g: 'b', y: 'yes' }, { g: 'b', y: 'yes' },
];
const SPAG_DATA = [
  { g: 'a', x: 1, y: 2 }, { g: 'a', x: 2, y: 3 },
  { g: 'b', x: 1, y: 1 }, { g: 'b', x: 2, y: 2 },
];

// One fixture per mode in CHART_MODE_LABELS — every branch of the
// QuickChart switch gets rendered at least once with data that reaches
// its real chart component (not just the emptyHint fallback), so a
// missing import or other reference error is guaranteed to surface.
const FIXTURES = {
  violin: { data: VIOLIN_DATA, colorVar: 'g', yVar: 'y' },
  scatter: { data: SCATTER_DATA, xVar: 'x', yVar: 'y' },
  scatterfit: { data: SCATTER_DATA, xVar: 'x', yVar: 'y' },
  path: { activeTest: 'mediation', inferenceResult: { a_path: .1, a_p: .01, b_path: .2, b_p: .02, cp_direct: .05, cp_p: .3, ab: .02, p_sobel: .01, z_sobel: 2, c_total: .3 } },
  forest: { inferenceResult: { studies: [{ label: 'S1', d: .3, se: .1, p: .01 }] } },
  qq: { data: SCATTER_DATA, yVar: 'y' },
  scree: { inferenceResult: { eigenvalues: [2.9, 0.6, 0.3, 0.1] } },
  residual: { inferenceResult: { fitted: [1, 2, 3], residuals: [.1, -.2, .05] } },
  boot: { inferenceResult: { dist: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], lo: 2, hi: 8 } },
  timeseries: { inferenceResult: { series: [1, 2, 3, 4, 5] }, activeTest: 't_welch' },
  histogram: { data: SCATTER_DATA, yVar: 'y' },
  barci: { inferenceResult: { gMeans: [{ name: 'A', mean: 5, sd: 1, n: 5 }, { name: 'B', mean: 8, sd: 1.2, n: 5 }] } },
  box: { data: VIOLIN_DATA, colorVar: 'g', yVar: 'y' },
  slopes: { inferenceResult: { simpleSlopes: [{ z: 'Z-1SD', slope: .2 }, { z: 'Z̄', slope: .5 }, { z: 'Z+1SD', slope: .8 }] } },
  loading: { inferenceResult: { loadings: [[.8, .2], [.3, .9]], vars: ['v1', 'v2'] }, ds: { numeric: ['v1', 'v2'] } },
  heatmap: { data: SCATTER_DATA, ds: { numeric: ['x', 'y'] } },
  mosaic: { data: CAT_DATA, colorVar: 'g', yVar: 'y' },
  power: { data: SCATTER_DATA },
  irtplot: { inferenceResult: { icc: [{ theta: -2, curves: [.2, .5, .8] }, { theta: 0, curves: [.5, .5, .5] }], k: 3 } },
  lca: { inferenceResult: { profiles: [{ class: 1, proportion: .6, items: [{ var: 'v1' }] }, { class: 2, proportion: .4, items: [{ var: 'v1' }] }] } },
  spaghetti: { data: SPAG_DATA, colorVar: 'g', xVar: 'x', yVar: 'y' },
  caterpillar: { inferenceResult: { groupMeans: [{ name: 'A', mean: 1 }, { name: 'B', mean: 2 }] } },
  its: { inferenceResult: { series: [{ t: 1, y: 2 }, { t: 2, y: 3 }] } },
  rddplot: { inferenceResult: { points: [{ x: 1, y: 2 }, { x: 5, y: 8 }], cutoff: 3 } },
  sociogram: { inferenceResult: { nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 1, y: 1 }], edges: [{ from: 'a', to: 'b' }] } },
};

describe('QuickChart', () => {
  for (const mode of Object.keys(CHART_MODE_LABELS)) {
    test(`mode "${mode}" (${CHART_MODE_LABELS[mode]}) renders without throwing`, () => {
      const props = { mode, data: [], ...FIXTURES[mode] };
      expect(() => render(<QuickChart {...props} />)).not.toThrow();
    });
  }
});
