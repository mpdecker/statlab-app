# StatLab Visualization Rendering Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the confirmed critical bug where selecting any of ~20 common
statistical tests (all 8 ANOVA variants, EFA, Cronbach's α, etc.) or
clicking 3 of the 9 AUTO-mode chart-type buttons throws an uncaught
`ReferenceError` that blanks the entire StatLab app, then fix the secondary
issue where the remaining chart modes render into a small hardcoded pixel
box instead of filling their panel.

**Architecture:** `src/components/QuickChart.jsx` (the lazily-loaded AUTO-
mode chart dispatcher, extracted from `App.jsx` in a prior perf refactor)
is missing 4 imports for helper functions that already exist in
`src/utils/vizHelpers.js` (three of them) and as dead, unexported code in
`src/Workbench.jsx` (the fourth, `computeCorrMatrix`, moved into
`vizHelpers.js` alongside its siblings). A new `ErrorBoundary` component
wraps the chart panel so a future rendering exception degrades gracefully
instead of unmounting the app. For sizing, `ExplorePanel.jsx`'s existing,
already-correct `useCanvasSize` `ResizeObserver` hook is extracted to
`vizHelpers.js` and reused by `Workbench.jsx` to measure the real chart
panel and feed exact pixel dimensions into `QuickChart.jsx`, replacing its
hardcoded `width={210} height={160}`-style literals.

**Tech Stack:** React 18, Vite, Vitest + `@testing-library/react` +
`happy-dom` (existing test stack — no new dependencies).

## Global Constraints

- No changes to `statlab` package computation/statistics, dataset handling,
  or non-chart UI (spec Non-goals).
- No visual restyle — geometry/sizing/correctness only (spec Non-goals).
- Every existing test must keep passing (`pnpm test`) after every task.
- Follow the codebase's existing test convention: `// @vitest-environment
  happy-dom` header, `@testing-library/react`'s `render`, `describe`/`test`/
  `expect` from `vitest`.
- Do not touch `InferenceResults.jsx`'s existing parameterless chart calls
  (e.g. `<ScreePlot eigenvalues={r.eigenvalues} />`) — new props added to
  chart primitives must default to today's exact literal so those call
  sites are byte-for-byte unaffected.
- Windows dev environment: this plan's shell commands are given for
  `bash` (Git Bash); use the PowerShell equivalent if your shell differs.
- Work happens in the git worktree at `D:\Development\statlab-viz-fix`
  (branch `fix/viz-rendering-correctness`, already created, already tracks
  `origin/main`). All file paths below are relative to that worktree root.

---

### Task 1: Fix the crash — missing imports in QuickChart.jsx

**Files:**
- Modify: `src/utils/vizHelpers.js` (add `computeCorrMatrix`, exported)
- Modify: `src/Workbench.jsx:46-55` (delete the dead local
  `computeCorrMatrix`, which is defined but never called there)
- Modify: `src/components/QuickChart.jsx:1-9` (add the 4 missing imports)
- Create: `src/components/QuickChart.test.jsx`

**Interfaces:**
- Produces: `computeCorrMatrix(data, vars)` exported from
  `src/utils/vizHelpers.js`, same signature/behavior as the dead copy it
  replaces (`vars.map(v1 => vars.map(v2 => ...))` using `corr` from
  `statlab/math/core`, already imported in `vizHelpers.js`).
- Consumes: `seriesFromResult`, `barGroupsFromResult`, `loadingFromResult`
  (already exported from `vizHelpers.js`, signatures unchanged).

- [ ] **Step 1: Write the failing regression test covering every chart mode**

Create `src/components/QuickChart.test.jsx`:

```jsx
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
  slopes: { inferenceResult: { simpleSlopes: [{ z: 'Z-1SD', slope: .2 }, { z: 'Z\u0304', slope: .5 }, { z: 'Z+1SD', slope: .8 }] } },
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
```

- [ ] **Step 2: Run the test to verify the 4 known-broken modes fail**

Run: `pnpm vitest run src/components/QuickChart.test.jsx`
Expected: FAIL — 4 tests fail with `ReferenceError: computeCorrMatrix is
not defined` (`heatmap`), `ReferenceError: barGroupsFromResult is not
defined` (`barci`), `ReferenceError: loadingFromResult is not defined`
(`loading`), `ReferenceError: seriesFromResult is not defined`
(`timeseries`). The other 21 modes pass (`CHART_MODE_LABELS` has 25 keys
total).

- [ ] **Step 3: Move `computeCorrMatrix` into `vizHelpers.js` and delete the dead copy**

In `src/utils/vizHelpers.js`, add near the other `*FromResult` helpers
(after `loadingFromResult`, before `formatInferenceSummary`):

```js
export function computeCorrMatrix(data, vars) {
  return vars.map(v1 => vars.map(v2 => {
    if (v1 === v2) return 1;
    const xs = data.map(r => +r[v1]).filter(Number.isFinite);
    const ys = data.map(r => +r[v2]).filter(Number.isFinite);
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return 0;
    return corr(xs.slice(0, n), ys.slice(0, n));
  }));
}
```

In `src/Workbench.jsx`, delete the now-dead local copy (lines 46-55):

```js
function computeCorrMatrix(data, vars) {
  return vars.map(v1 => vars.map(v2 => {
    if (v1 === v2) return 1;
    const xs = data.map(r => +r[v1]).filter(Number.isFinite);
    const ys = data.map(r => +r[v2]).filter(Number.isFinite);
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return 0;
    return corr(xs.slice(0, n), ys.slice(0, n));
  }));
}
```

(Leave the blank line where it was; nothing else in `Workbench.jsx`
references `computeCorrMatrix`, confirmed by
`grep -n computeCorrMatrix src/Workbench.jsx` returning only its own
definition before this deletion.)

- [ ] **Step 4: Add the 4 missing imports to QuickChart.jsx**

In `src/components/QuickChart.jsx`, change the import block (lines 1-7)
from:

```js
import {
  QuickScatter, QuickScatterFit, ViolinPlot, BarCI, HistogramDensity, HeatmapCorr, MosaicPlot,
  PowerCurve, PathDiagram, ForestPlot, QQPlot, ScreePlot, ResidualPlot, BootstrapHist,
  QuickSlopes, BoxPlotGrid, IRTCurves, LCAProfiles, SpaghettiPlot, CaterpillarPlot,
  ITSPlot, RDPlot, SociogramPlot, TimeSeriesChart,
} from './charts.jsx';
import { C } from '../palette.js';
```

to:

```js
import {
  QuickScatter, QuickScatterFit, ViolinPlot, BarCI, HistogramDensity, HeatmapCorr, MosaicPlot,
  PowerCurve, PathDiagram, ForestPlot, QQPlot, ScreePlot, ResidualPlot, BootstrapHist,
  QuickSlopes, BoxPlotGrid, IRTCurves, LCAProfiles, SpaghettiPlot, CaterpillarPlot,
  ITSPlot, RDPlot, SociogramPlot, TimeSeriesChart,
} from './charts.jsx';
import { C } from '../palette.js';
import {
  seriesFromResult, barGroupsFromResult, loadingFromResult, computeCorrMatrix,
} from '../utils/vizHelpers.js';
```

- [ ] **Step 5: Run the full test to verify all 25 modes now pass**

Run: `pnpm vitest run src/components/QuickChart.test.jsx`
Expected: PASS — all 25 tests pass.

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `pnpm test`
Expected: PASS — every existing test still passes (in particular
`src/App.test.jsx` and `src/components/ExplorePanel.test.jsx`, since
`Workbench.jsx` and `vizHelpers.js` changed).

- [ ] **Step 7: Commit**

```bash
git add src/utils/vizHelpers.js src/Workbench.jsx src/components/QuickChart.jsx src/components/QuickChart.test.jsx
git commit -m "$(cat <<'EOF'
fix: import the 4 helpers QuickChart.jsx crashes without

QuickChart.jsx (extracted from App.jsx by the workbench code-split
perf refactor) called seriesFromResult/barGroupsFromResult/
loadingFromResult/computeCorrMatrix without importing them. With no
error boundary anywhere, the resulting uncaught ReferenceError
unmounted the entire app. barci is the default AUTO chart for all 8
ANOVA variants plus ~15 other tests, so simply selecting e.g.
One-Way ANOVA blanked the app with zero further interaction
(reproduced live on statlab.fyi).

computeCorrMatrix moves from dead, unexported code in Workbench.jsx
(defined, never called there since the refactor moved its only call
site) into vizHelpers.js alongside its three siblings.

Adds QuickChart.test.jsx, rendering every one of the 25 chart modes
with representative fixtures — this specific gap (QuickChart.jsx had
no test file) is why the bug shipped undetected.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add an error boundary around the chart panel

**Files:**
- Create: `src/components/ErrorBoundary.jsx`
- Create: `src/components/ErrorBoundary.test.jsx`
- Modify: `src/Workbench.jsx` (wrap the `<Suspense><QuickChart/></Suspense>`)

**Interfaces:**
- Produces: `ErrorBoundary` (named export from
  `src/components/ErrorBoundary.jsx`, matching this codebase's convention
  of named exports for components — e.g. `InferenceResults.jsx`,
  `ResizablePanel.jsx`), a React class component accepting `children` and
  rendering them normally until a descendant throws during render, after
  which it renders a fallback `<div>` instead.
- Consumes: nothing beyond React itself.

- [ ] **Step 1: Write the failing test**

Create `src/components/ErrorBoundary.test.jsx`:

```jsx
// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary.jsx';

function Bomb() {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  test('renders children normally when nothing throws', () => {
    const { getByText } = render(<ErrorBoundary><div>ok</div></ErrorBoundary>);
    expect(getByText('ok')).toBeTruthy();
  });

  test('catches a render error and shows a fallback instead of propagating', () => {
    // React logs the caught error to console.error by default; keep the
    // test output clean without hiding a genuine assertion failure.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getByText } = render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(getByText(/chart failed to render/i)).toBeTruthy();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ErrorBoundary.test.jsx`
Expected: FAIL — `ErrorBoundary.jsx` does not exist yet (import error).

- [ ] **Step 3: Write the ErrorBoundary component**

Create `src/components/ErrorBoundary.jsx`:

```jsx
import { Component } from 'react';
import { C } from '../palette.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Chart render error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontSize: 10, color: C.dim, ...mono, textAlign: 'center', lineHeight: 1.6 }}>
          Chart failed to render.
          <div style={{ marginTop: 4, color: C.neg, fontSize: 9 }}>{String(this.state.error?.message || this.state.error)}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/ErrorBoundary.test.jsx`
Expected: PASS

- [ ] **Step 5: Wire ErrorBoundary into Workbench.jsx**

In `src/Workbench.jsx`, add the import near the other component imports
(after the `InferenceResults` import):

```js
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
```

Then, in `src/Workbench.jsx` around line 243 (inside the `Suspense`), wrap
`QuickChart`:

```jsx
            <Suspense fallback={<div role="status">Loading chart…</div>}>
              <ErrorBoundary>
                <QuickChart mode={effectiveMode} data={data} xVar={vizX} yVar={vizY} colorVar={vizGroup} ds={ds} colorMap={colorMap} groups={groups} inferenceResult={inferenceResult} activeTest={activeTest} />
              </ErrorBoundary>
            </Suspense>
```

- [ ] **Step 6: Run the full suite**

Run: `pnpm test`
Expected: PASS — everything green, including the updated
`ErrorBoundary.test.jsx` (using the named import now).

- [ ] **Step 7: Commit**

```bash
git add src/components/ErrorBoundary.jsx src/components/ErrorBoundary.test.jsx src/Workbench.jsx
git commit -m "$(cat <<'EOF'
feat: add an error boundary around the AUTO-mode chart panel

There was no error boundary anywhere in the app, which is why the
Task 1 bug (and any future chart-rendering exception) unmounted the
entire page instead of failing inside its own panel. Wraps
QuickChart in Workbench.jsx with a small ErrorBoundary that renders
an inline "chart failed to render" message on catch.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Share `useCanvasSize` between ExplorePanel and Workbench

**Files:**
- Modify: `src/utils/vizHelpers.js` (add `useCanvasSize`, exported)
- Modify: `src/components/ExplorePanel.jsx` (remove local copy, import shared one)

**Interfaces:**
- Produces: `useCanvasSize(ref, opts)` exported from `vizHelpers.js`:
  - `ref`: a React ref object attached to the DOM element to measure.
  - `opts` (optional): `{ minW = 320, minH = 240, padW = 24, padH = 80,
    initialW = minW, initialH = minH }`. `initialW`/`initialH` exist
    separately from `minW`/`minH` because `ExplorePanel.jsx`'s current
    pre-measurement placeholder (`560×360`) is *larger* than its resize
    floor (`320×240`) — collapsing them into one concept would change its
    behavior on first paint.
  - Returns `{ w, h }` (numbers), updated via `ResizeObserver` whenever the
    ref'd element resizes. Calling it as `useCanvasSize(canvasRef,
    { initialW: 560, initialH: 360 })` (leaving `minW`/`minH`/`padW`/`padH`
    at their defaults) reproduces `ExplorePanel.jsx`'s exact current
    behavior — this is a behavior-preserving move, not a rewrite.
- Consumes: `useState`, `useEffect` from `react` (new import needed in
  `vizHelpers.js`).

- [ ] **Step 1: Move the hook into vizHelpers.js with a passing test**

`vizHelpers.js` has no React-rendering tests today (it's pure logic); add
one for this hook via a tiny host component, matching the project's
existing pattern of testing hooks through a rendering component (see
`ResizableBand.test.jsx` for the closest existing precedent of testing
resize-driven state in this codebase).

Add to the top of `src/utils/vizHelpers.js`:

```js
import { useState, useEffect } from 'react';
```

Add near the top of the file, after the existing constant exports and
before `seriesFromResult` (or any consistent location — exact position
doesn't matter, this is a pure addition):

```js
export function useCanvasSize(ref, { minW = 320, minH = 240, padW = 24, padH = 80, initialW = minW, initialH = minH } = {}) {
  const [size, setSize] = useState({ w: initialW, h: initialH });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({
        w: Math.max(minW, Math.floor(width - padW)),
        h: Math.max(minH, Math.floor(height - padH)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [minW, minH, padW, padH]);
  return size;
}
```

- [ ] **Step 2: Write a test for the hook**

Create a new `describe` block in `src/utils/vizHelpers.test.jsx` (a new
file, since the existing `vizHelpers.test.js` is a plain `.js` file with no
JSX — check first with `ls src/utils/vizHelpers.test.*` whether a `.jsx`
sibling would collide; it won't, `vizHelpers.test.js` and
`vizHelpers.test.jsx` are distinct files and both run under Vitest):

```jsx
// @vitest-environment happy-dom
import React, { useRef } from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { useCanvasSize } from './vizHelpers.js';

function Probe({ onSize }) {
  const ref = useRef(null);
  const size = useCanvasSize(ref);
  onSize(size);
  return <div ref={ref} />;
}

describe('useCanvasSize', () => {
  test('returns the default floor size before any observed resize', () => {
    let seen;
    render(<Probe onSize={s => { seen = s; }} />);
    // happy-dom does not implement ResizeObserver callbacks synchronously
    // (or at all, depending on version), so the only behavior this
    // environment can assert is the pre-resize default — the real resize
    // path is covered by ExplorePanel.test.jsx and manual verification.
    expect(seen).toEqual({ w: 320, h: 240 });
  });

  test('honors custom floor overrides', () => {
    let seen;
    function ProbeCustom() {
      const ref = useRef(null);
      seen = useCanvasSize(ref, { minW: 160, minH: 120 });
      return <div ref={ref} />;
    }
    render(<ProbeCustom />);
    expect(seen).toEqual({ w: 160, h: 120 });
  });

  test('honors a separate initial size from the resize floor', () => {
    let seen;
    function ProbeInitial() {
      const ref = useRef(null);
      seen = useCanvasSize(ref, { minW: 320, minH: 240, initialW: 560, initialH: 360 });
      return <div ref={ref} />;
    }
    render(<ProbeInitial />);
    expect(seen).toEqual({ w: 560, h: 360 });
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm vitest run src/utils/vizHelpers.test.jsx`
Expected: PASS

- [ ] **Step 4: Update ExplorePanel.jsx to use the shared hook**

In `src/components/ExplorePanel.jsx`, delete the local `useCanvasSize`
function (lines 30-46):

```js
function useCanvasSize(ref) {
  const [size, setSize] = useState({ w: 560, h: 360 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({
        w: Math.max(320, Math.floor(width - 24)),
        h: Math.max(240, Math.floor(height - 80)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return size;
}
```

Add the import in `src/components/ExplorePanel.jsx` (near its other
`vizHelpers.js` import, which already exists at the top of the file):

```js
import {
  getChartInsight, exportSvgFromCanvas, exportCanvasAsPng,
  EXPLORE_CHARTS_XY, EXPLORE_CHARTS_SIZE, EXPLORE_CHARTS_CAT_PAIR,
  resolveExplorePanelChart, exploreChartLabel, seriesFromResult,
  useCanvasSize,
} from '../utils/vizHelpers.js';
```

And change its call site (around line 114) from `useCanvasSize(canvasRef)`
to:

```js
const canvasSize = useCanvasSize(canvasRef, { initialW: 560, initialH: 360 });
```

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS — in particular `src/components/ExplorePanel.test.jsx`
must still pass unchanged, confirming the extraction didn't alter
`ExplorePanel`'s behavior.

- [ ] **Step 6: Commit**

```bash
git add src/utils/vizHelpers.js src/utils/vizHelpers.test.jsx src/components/ExplorePanel.jsx
git commit -m "$(cat <<'EOF'
refactor: share ExplorePanel's useCanvasSize hook via vizHelpers.js

Moves the ResizeObserver-based canvas-measuring hook out of
ExplorePanel.jsx (where it was local/unexported) into vizHelpers.js
so Workbench.jsx can reuse it for AUTO-mode chart sizing (Task 4)
instead of introducing a second, different sizing mechanism.
Behavior-preserving: ExplorePanel's own defaults (320x240 floor,
560x360 initial, 24/80 padding) are unchanged, now passed explicitly.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Measure the AUTO chart panel and pass real size into QuickChart

**Files:**
- Modify: `src/Workbench.jsx`

**Interfaces:**
- Produces: `<QuickChart canvasSize={{ w, h }} .../>` — `canvasSize` is a
  new prop consumed by Task 6.
- Consumes: `useCanvasSize` from `vizHelpers.js` (Task 3), `useRef` from
  `react` (already imported in `Workbench.jsx:1`).

- [ ] **Step 1: Add the ref and hook call**

In `src/Workbench.jsx`, add `useCanvasSize` to the existing `vizHelpers.js`
import (the one already containing `resolveQuickViewVars`,
`barGroupsFromResult`, etc. — lines 5-9):

```js
import {
  resolveQuickViewVars, barGroupsFromResult, loadingFromResult,
  formatInferenceSummary, CHART_MODE_LABELS, exploreChartLabel, explorePanelChartFromMode,
  seriesFromResult, useCanvasSize,
} from './utils/vizHelpers.js';
```

Inside the `Workbench` component function (find it with
`grep -n "^export default function Workbench" src/Workbench.jsx` — add the
ref and hook call alongside the component's other `useRef`/hook
declarations near the top of the function body):

```js
  const chartPanelRef = useRef(null);
  const canvasSize = useCanvasSize(chartPanelRef, { minW: 160, minH: 120, padW: 16, padH: 16, initialW: 210, initialH: 160 });
```

- [ ] **Step 2: Attach the ref to the stable chart-panel container**

In the JSX around line 240, attach `ref={chartPanelRef}` to the div that
already wraps the chart (the one with `background: C.chartBg`) — this div
exists whether or not `QuickChart` has finished lazy-loading, so the
`ResizeObserver` starts measuring immediately:

```jsx
        <div ref={chartPanelRef} style={{ height: '100%', background: C.chartBg, borderRadius: 3, padding: '10px 2px 2px', position: 'relative', overflow: 'hidden' }}>
```

- [ ] **Step 3: Pass canvasSize into QuickChart**

Update the `<QuickChart>` call (already inside `<ErrorBoundary>` from Task
2) to add the new prop:

```jsx
                <QuickChart mode={effectiveMode} data={data} xVar={vizX} yVar={vizY} colorVar={vizGroup} ds={ds} colorMap={colorMap} groups={groups} inferenceResult={inferenceResult} activeTest={activeTest} canvasSize={canvasSize} />
```

- [ ] **Step 4: Run the full suite**

Run: `pnpm test`
Expected: PASS. (`canvasSize` is an unused prop from `QuickChart.jsx`'s
point of view until Task 6 — no behavior change yet, so `App.test.jsx` and
`QuickChart.test.jsx` from Task 1 both stay green as-is.)

- [ ] **Step 5: Commit**

```bash
git add src/Workbench.jsx
git commit -m "$(cat <<'EOF'
feat: measure the AUTO chart panel and thread real size into QuickChart

Reuses the useCanvasSize hook shared in Task 3 to measure the actual
chart-panel container (via ResizeObserver, floor 160x120, 16px
padding — smaller than ExplorePanel's own 320x240/24-80 since this
panel is typically more compact) and passes the result as a new
canvasSize prop. QuickChart.jsx doesn't use it yet (Task 6) — this
task only wires the measurement through.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Add a `height` prop to the 10 fixed-wrapper-height chart primitives

**Files:**
- Modify: `src/components/charts.jsx` (10 functions: `QQPlot`,
  `ResidualPlot`, `PowerCurve`, `ScreePlot`, `IRTCurves`, `LCAProfiles`,
  `SpaghettiPlot`, `ITSPlot`, `RDPlot`, `BootstrapHist`)
- Modify: `src/components/charts.test.jsx`

**Interfaces:**
- Produces: each of the 10 functions gains a `height` parameter (numeric
  px), defaulting to its current hardcoded literal, used in its wrapper
  `<div style={{ height }}>` instead of the literal. No other prop or
  behavior changes. Existing callers (`InferenceResults.jsx`, which never
  passes `height`) are unaffected.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/charts.test.jsx` (extends the existing `describe`
block; import the additional components at the top — change the existing
import line from:

```js
import { ViolinPlot, BoxPlot, BarCI, HeatmapCorr, QuickSlopes, IRTCurves } from './charts.jsx';
```

to:

```js
import {
  ViolinPlot, BoxPlot, BarCI, HeatmapCorr, QuickSlopes, IRTCurves,
  QQPlot, ResidualPlot, PowerCurve, ScreePlot, LCAProfiles, SpaghettiPlot,
  ITSPlot, RDPlot, BootstrapHist,
} from './charts.jsx';
```

then add these tests inside the `describe('charts', ...)` block:

```jsx
  test('QQPlot honors a custom height prop', () => {
    const vals = [1, 2, 3, 4, 5, 6];
    const { container } = render(<QQPlot vals={vals} label="x" height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('ResidualPlot honors a custom height prop', () => {
    const { container } = render(<ResidualPlot fitted={[1, 2, 3]} residuals={[.1, -.1, .05]} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('PowerCurve honors a custom height prop', () => {
    const { container } = render(<PowerCurve d={0.5} currentN={20} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('ScreePlot honors a custom height prop', () => {
    const { container } = render(<ScreePlot eigenvalues={[2, 1, 0.5]} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('IRTCurves honors a custom height prop', () => {
    const icc = [{ theta: -1, curves: [.2, .5] }, { theta: 1, curves: [.6, .7] }];
    const { container } = render(<IRTCurves icc={icc} itemCount={2} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('LCAProfiles honors a custom height prop', () => {
    const profiles = [{ class: 1, proportion: .5 }, { class: 2, proportion: .5 }];
    const { container } = render(<LCAProfiles profiles={profiles} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('SpaghettiPlot honors a custom height prop', () => {
    const data = [{ g: 'a', x: 1, y: 2 }, { g: 'a', x: 2, y: 3 }];
    const { container } = render(<SpaghettiPlot data={data} xVar="x" yVar="y" groupVar="g" height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('ITSPlot honors a custom height prop', () => {
    const { container } = render(<ITSPlot series={[{ t: 1, y: 2 }, { t: 2, y: 3 }]} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('RDPlot honors a custom height prop', () => {
    const { container } = render(<RDPlot points={[{ x: 1, y: 2 }, { x: 5, y: 8 }]} cutoff={3} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('BootstrapHist honors a custom height prop', () => {
    const { container } = render(<BootstrapHist dist={[1, 2, 3, 4, 5, 6, 7, 8]} lo={2} hi={7} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/charts.test.jsx`
Expected: FAIL — 10 new tests fail (the `height` prop is currently
ignored; wrapper stays at its hardcoded literal, e.g. `110px` for
`QQPlot`, not `300px`).

- [ ] **Step 3: Add the `height` parameter to each of the 10 functions**

In `src/components/charts.jsx`, apply these 10 signature + wrapper edits
(each is a one-line function-signature change plus using the parameter
instead of the literal in the immediately-following `<div style={{
height: N }}>`):

`QQPlot` (was `export function QQPlot({ vals, label }) {` /
`<div style={{ height: 110 }}>`):
```js
export function QQPlot({ vals, label, height = 110 }) {
```
```jsx
    <div style={{ height }}>
```

`ResidualPlot` (was `export function ResidualPlot({ fitted, residuals }) {`
/ `<div style={{ height: 100 }}>`):
```js
export function ResidualPlot({ fitted, residuals, height = 100 }) {
```
```jsx
    <div style={{ height }}>
```

`PowerCurve` (was `export function PowerCurve({ d, alpha = .05, currentN }) {`
/ `<div style={{ height: 110 }}>`):
```js
export function PowerCurve({ d, alpha = .05, currentN, height = 110 }) {
```
```jsx
    <div style={{ height }}>
```

`ScreePlot` (was `export function ScreePlot({ eigenvalues }) {` /
`<div style={{ height: 95 }}>`):
```js
export function ScreePlot({ eigenvalues, height = 95 }) {
```
```jsx
    <div style={{ height }}>
```

`IRTCurves` (was `export function IRTCurves({ icc, itemCount = 3 }) {` /
`<div style={{ height: 100 }}>`):
```js
export function IRTCurves({ icc, itemCount = 3, height = 100 }) {
```
```jsx
    <div style={{ height }}>
```

`LCAProfiles` (was `export function LCAProfiles({ profiles }) {` /
`<div style={{ height: 95 }}>`):
```js
export function LCAProfiles({ profiles, height = 95 }) {
```
```jsx
    <div style={{ height }}>
```

`SpaghettiPlot` (was
`export function SpaghettiPlot({ data, xVar, yVar, groupVar }) {` /
`<div style={{ height: 110 }}>`):
```js
export function SpaghettiPlot({ data, xVar, yVar, groupVar, height = 110 }) {
```
```jsx
    <div style={{ height }}>
```

`ITSPlot` (was `export function ITSPlot({ series }) {` /
`<div style={{ height: 95 }}>`):
```js
export function ITSPlot({ series, height = 95 }) {
```
```jsx
    <div style={{ height }}>
```

`RDPlot` (was `export function RDPlot({ points, cutoff }) {` /
`<div style={{ height: 100 }}>`):
```js
export function RDPlot({ points, cutoff, height = 100 }) {
```
```jsx
    <div style={{ height }}>
```

`BootstrapHist` (was
`export function BootstrapHist({ dist, lo, hi, color = PAL[0] }) {` /
`<div style={{ height: 70 }}>`):
```js
export function BootstrapHist({ dist, lo, hi, color = PAL[0], height = 70 }) {
```
```jsx
    <div style={{ height }}>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/charts.test.jsx`
Expected: PASS — all tests pass, including the 5 pre-existing ones (they
don't pass `height`, so each component falls back to its original
literal, unchanged).

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS — in particular `src/components/InferenceResults.test.jsx`,
since these 10 components are used there without a `height` prop and must
render identically to before.

- [ ] **Step 6: Commit**

```bash
git add src/components/charts.jsx src/components/charts.test.jsx
git commit -m "$(cat <<'EOF'
feat: let 10 chart primitives accept an explicit height prop

QQPlot, ResidualPlot, PowerCurve, ScreePlot, IRTCurves, LCAProfiles,
SpaghettiPlot, ITSPlot, RDPlot, and BootstrapHist each hardcoded
their own wrapper div's pixel height with no way for a caller to
override it. Each gains a height parameter defaulting to its current
literal, so every existing caller (InferenceResults.jsx's many
parameterless embedded usages) is unaffected; Task 6 is the first
caller to pass a non-default value.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Make QuickChart.jsx use the real measured size

**Files:**
- Modify: `src/components/QuickChart.jsx`
- Modify: `src/components/QuickChart.test.jsx`

**Interfaces:**
- Consumes: `canvasSize` prop (`{ w, h }`, from Task 4's `Workbench.jsx`
  wiring; defaults to `{ w: 210, h: 160 }` inside `QuickChart` itself so
  the component still works if ever rendered without the prop, e.g. in a
  future test or a different caller).

- [ ] **Step 1: Extend QuickChart.test.jsx to assert sizing is honored**

Add to `src/components/QuickChart.test.jsx` (after the existing
mode-loop `describe` block):

```jsx
describe('QuickChart sizing', () => {
  test('box mode passes the measured canvasSize into BoxPlotGrid, not the old 210x160 literal', () => {
    const data = [
      { g: 'a', y: 1 }, { g: 'a', y: 2 }, { g: 'b', y: 3 }, { g: 'b', y: 4 },
    ];
    const { container } = render(
      <QuickChart mode="box" data={data} colorVar="g" yVar="y" canvasSize={{ w: 900, h: 500 }} />
    );
    // BoxPlotGrid divides its width prop across groups into individual
    // BoxPlot <svg> elements; with 2 groups and w=900 each should be far
    // wider than the old fixed-210-total layout could ever produce.
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
    for (const svg of svgs) {
      expect(Number(svg.getAttribute('width'))).toBeGreaterThan(210);
    }
  });

  test('scree mode passes canvasSize.h into ScreePlot\u2019s height prop', () => {
    const { container } = render(
      <QuickChart mode="scree" inferenceResult={{ eigenvalues: [2, 1, 0.5] }} data={[]} canvasSize={{ w: 900, h: 500 }} />
    );
    expect(container.firstChild.style.height).toBe('500px');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/QuickChart.test.jsx`
Expected: FAIL — both new tests fail (still using the hardcoded
`width={210} height={160}` / `95`).

- [ ] **Step 3: Add a default and update every call site in QuickChart.jsx**

In `src/components/QuickChart.jsx`, change the function signature (line
10) from:

```js
export default function QuickChart({ mode, data, xVar, yVar, colorVar, ds, colorMap, groups, inferenceResult, activeTest }) {
```

to:

```js
export default function QuickChart({ mode, data, xVar, yVar, colorVar, ds, colorMap, groups, inferenceResult, activeTest, canvasSize = { w: 210, h: 160 } }) {
```

Then replace every hardcoded sizing literal in the switch, mode by mode:

`violin` (was `width={90} height={130}` for each per-group column, dividing
the old fixed 210 across up to 4 groups):
```jsx
    case 'violin': {
      const gVar = colorVar && colorVar !== '(none)' ? colorVar : null;
      const gList = gVar ? [...new Set(data.map(r => r[gVar]))].slice(0, 4) : ['all'];
      const violinW = Math.max(60, Math.floor(canvasSize.w / gList.length) - 8);
      return (
        <div style={{ display: 'flex', gap: 4, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          {gList.map(g => (
            <div key={g} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: C.dim }}>{g}</div>
              <ViolinPlot
                data={(gVar ? data.filter(r => r[gVar] === g) : data).map(r => +r[yVar]).filter(Number.isFinite)}
                width={violinW} height={canvasSize.h}
              />
            </div>
          ))}
        </div>
      );
    }
```

`boot` fallback and `timeseries` fallback (both currently
`<HistogramDensity values={numVals(yVar || xVar)} width={210} height={160} />`):
```jsx
    case 'boot':
      return inferenceResult?.dist
        ? <BootstrapHist dist={inferenceResult.dist} lo={inferenceResult.lo} hi={inferenceResult.hi} height={canvasSize.h} />
        : <HistogramDensity values={numVals(yVar || xVar)} width={canvasSize.w} height={canvasSize.h} />;
    case 'timeseries': {
      const tsSeries = seriesFromResult(inferenceResult, activeTest);
      if (tsSeries?.length) return <TimeSeriesChart series={tsSeries} width={canvasSize.w} height={canvasSize.h} />;
      return <HistogramDensity values={numVals(yVar || xVar)} width={canvasSize.w} height={canvasSize.h} />;
    }
```

`histogram`:
```jsx
    case 'histogram':
      return <HistogramDensity values={numVals(yVar || xVar)} width={canvasSize.w} height={canvasSize.h} />;
```

`barci`:
```jsx
    case 'barci':
      return <BarCI groups={barGroupsFromResult(inferenceResult, activeTest, data, gVar, yVar)} width={canvasSize.w} height={canvasSize.h} />;
```

`box`:
```jsx
    case 'box':
      return gVar
        ? <BoxPlotGrid data={data} groupVar={gVar} yVar={yVar} width={canvasSize.w} height={canvasSize.h} />
        : emptyHint('Select a Color / group variable for box plots.');
```

`slopes` (previously passed no size props at all):
```jsx
    case 'slopes':
      return inferenceResult?.simpleSlopes?.length
        ? <QuickSlopes slopes={inferenceResult.simpleSlopes} width={canvasSize.w} height={canvasSize.h} />
        : emptyHint('Run Moderation in Inference to see simple slopes at \u00B11 SD.');
```

`loading`:
```jsx
    case 'loading': {
      const load = loadingFromResult(inferenceResult, activeTest, ds?.numeric);
      if (load) {
        return (
          <HeatmapCorr
            matrix={load.matrix} labels={load.colLabels} rowLabels={load.rowLabels}
            width={canvasSize.w} height={canvasSize.h}
          />
        );
      }
      return emptyHint('Run PCA, EFA, or Cronbach \u03B1 in Inference.');
    }
```

`heatmap`:
```jsx
    case 'heatmap': {
      const vars = (ds?.numeric || []).slice(0, 6);
      return <HeatmapCorr matrix={computeCorrMatrix(data, vars)} labels={vars} width={canvasSize.w} height={canvasSize.h} />;
    }
```

`mosaic`:
```jsx
    case 'mosaic':
      return <MosaicPlot data={data} xVar={gVar || xVar} yVar={yVar} width={canvasSize.w} height={canvasSize.h} />;
```

`qq` (previously passed no size props at all):
```jsx
    case 'qq':
      return <QQPlot vals={numVals(yVar || xVar)} label={yVar || xVar} height={canvasSize.h} />;
```

`scree`:
```jsx
    case 'scree':
      return inferenceResult?.eigenvalues?.length
        ? <ScreePlot eigenvalues={inferenceResult.eigenvalues} height={canvasSize.h} />
        : emptyHint('Run PCA with scale variables selected.');
```

`residual`:
```jsx
    case 'residual':
      return inferenceResult?.fitted && inferenceResult?.residuals
        ? <ResidualPlot fitted={inferenceResult.fitted} residuals={inferenceResult.residuals} height={canvasSize.h} />
        : emptyHint('Run Simple OLS to view residuals vs fitted.');
```

`power`:
```jsx
    case 'power':
      return <PowerCurve d={0.5} currentN={Math.floor(data.length / 2)} height={canvasSize.h} />;
```

`irtplot`:
```jsx
    case 'irtplot':
      return inferenceResult?.icc?.length
        ? <IRTCurves icc={inferenceResult.icc} itemCount={inferenceResult.k} height={canvasSize.h} />
        : emptyHint('Run IRT 1PL or 2PL with scale items selected.');
```

`lca`:
```jsx
    case 'lca':
      return inferenceResult?.profiles?.length
        ? <LCAProfiles profiles={inferenceResult.profiles} height={canvasSize.h} />
        : emptyHint('Run Latent Class Analysis with two categorical indicators.');
```

`spaghetti`:
```jsx
    case 'spaghetti':
      return gVar && yVar
        ? <SpaghettiPlot data={data} xVar={xVar || ds?.numeric?.[0]} yVar={yVar} groupVar={gVar} height={canvasSize.h} />
        : emptyHint('Select cluster ID and outcome for spaghetti plot.');
```

`its`:
```jsx
    case 'its':
      return inferenceResult?.series?.length
        ? <ITSPlot series={inferenceResult.series} height={canvasSize.h} />
        : emptyHint('Run Interrupted Time Series with time and outcome vectors.');
```

`rddplot`:
```jsx
    case 'rddplot':
      return inferenceResult?.points?.length
        ? <RDPlot points={inferenceResult.points} cutoff={inferenceResult.cutoff} height={canvasSize.h} />
        : emptyHint('Run Regression Discontinuity with X and Y variables.');
```

Leave `scatter`, `scatterfit`, `path`, `forest`, `caterpillar`, `sociogram`,
and the `default` case unchanged — they either already fill their parent
(`QuickScatter`/`QuickScatterFit`, via `ResponsiveContainer 100%/100%`) or
are correctly content-driven/self-scaling via `viewBox` (`PathDiagram`,
`ForestPlot`, `CaterpillarPlot`, `SociogramPlot`), per the design spec.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/QuickChart.test.jsx`
Expected: PASS — all tests pass, including the two new sizing tests and
all 25 mode-render tests from Task 1 (their fixtures don't pass
`canvasSize`, so they exercise the `{ w: 210, h: 160 }` default — still a
valid, non-throwing render).

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/QuickChart.jsx src/components/QuickChart.test.jsx
git commit -m "$(cat <<'EOF'
fix: size AUTO-mode charts to their real panel instead of 210x160

Replaces every hardcoded width={210} height={160}-style literal in
QuickChart.jsx's mode dispatcher with the canvasSize prop measured
in Task 4 (falls back to the old 210x160 default if ever rendered
without it). violin mode now divides the real measured width across
its per-group columns instead of a fixed 90px each. slopes and qq
modes previously passed no size props at all (relying on each
component's own small hardcoded default) and now do too.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Manual verification and spec sign-off

**Files:**
- None (verification only — no code changes expected; if verification
  finds a problem, fix it in the relevant file from Tasks 1-6 and re-run
  this task's checks before continuing).

- [ ] **Step 1: Run the full automated suite one more time**

Run: `pnpm test`
Expected: PASS, zero failures.

- [ ] **Step 2: Build the app**

Run: `pnpm build`
Expected: succeeds with no errors (confirms the new imports and JSX are
syntactically and referentially valid in a production build, not just
under Vitest).

- [ ] **Step 3: Preview the production build and manually verify the crash is fixed**

Run (background, e.g. via the Browser pane's `preview_start` against
`{ name: "preview" }` if `.claude/launch.json` has a `pnpm preview` entry,
otherwise run `pnpm preview` and open the printed local URL in the Browser
pane):

```bash
pnpm preview
```

In the Browser pane:
1. Launch the app, search for "One-Way ANOVA", select it. Confirm the
   chart panel renders a Bar+CI chart (not a blank page) and
   `read_console_messages` shows no errors.
2. Click each of the 9 toolbar buttons (Violin, Box plot, Scatter,
   Histogram, Bar + CI, Correlogram heatmap, Mosaic plot, Time series,
   Bootstrap) in turn for the current test. Confirm each renders without a
   console error and visibly fills more of the panel than the old fixed
   ~210×160 box (compare against the "before" screenshots taken during
   investigation).
3. Search for "EFA" (Exploratory Factor Analysis, default mode `loading`)
   and run it with a few numeric variables selected. Confirm the loadings
   heatmap renders without a console error.
4. Resize the browser viewport (e.g. via `resize_window`) and confirm the
   chart resizes to fill the new panel size rather than staying fixed.

- [ ] **Step 4: Update the spec's verification checklist**

In `docs/superpowers/specs/2026-09-15-viz-rendering-correctness-design.md`,
under "Testing/Verification Plan", check off each of the 6 items now that
they've been performed, or note any deviation found and fixed.

- [ ] **Step 5: Commit the spec update**

```bash
git add docs/superpowers/specs/2026-09-15-viz-rendering-correctness-design.md
git commit -m "$(cat <<'EOF'
docs: mark viz rendering correctness verification complete

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

**This plan is done when:** all 7 tasks are checked off, `pnpm test` and
`pnpm build` both pass, and the manual pass in Step 3 confirms the app no
longer blanks on any of the previously-crashing modes/tests.
