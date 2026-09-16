# StatLab Visualization Rendering Correctness — Design

**Date:** 2026-09-15
**Status:** Approved (Phase 1 of 2 — see Non-goals)

## Problem

The user reported statlab.fyi's visualizations "don't work correctly." Live
reproduction (not just code reading) found two confirmed defects, one of
them critical:

### 1. Critical: four chart modes crash the entire app (whole page goes blank)

The "code-split the workbench" perf refactor (`3324b69`, `#42`) extracted the
chart-mode dispatcher out of `App.jsx` into its own lazily-loaded module,
`src/components/QuickChart.jsx`. Four of its mode branches call helper
functions that were never carried over into that file's imports:

| Mode      | Missing call                  | Actually defined in                              |
|-----------|--------------------------------|---------------------------------------------------|
| `heatmap` | `computeCorrMatrix(...)`       | `Workbench.jsx:46` (local, unexported, **unused there**) |
| `barci`   | `barGroupsFromResult(...)`     | `utils/vizHelpers.js` (exported, just not imported) |
| `loading` | `loadingFromResult(...)`       | `utils/vizHelpers.js` (exported, just not imported) |
| `timeseries` | `seriesFromResult(...)`     | `utils/vizHelpers.js` (exported, just not imported) |

Reproduced live on statlab.fyi for all three vizHelpers-based modes plus
`heatmap` (source-confirmed for `loading`, same pattern): clicking
"Correlogram heatmap," "Bar + CI," or "Time series," or simply **selecting
any test whose default AUTO chart is `barci`/`heatmap`/`loading`** (per
`config/chartMap.js`: all 8 ANOVA variants, `prop2`, `cronbach`,
`splithalf`, `icc`, `icc_ml`, `omega`, `community`, `homogeneity`, `cancorr`,
`efa` — 20+ tests) throws an **uncaught `ReferenceError`**. There is no error
boundary anywhere in the tree, so the uncaught error unmounts the entire
React app: the whole page goes blank black, recoverable only by a full
reload. Confirmed live: selecting "One-Way ANOVA" (its default AUTO chart is
`barci`) blanks the app with zero further interaction.

`QuickChart.jsx` has no test file of its own (`QuickChart.test.jsx` doesn't
exist), which is how this shipped undetected.

### 2. Confirmed but secondary: fixed, tiny render size on surviving modes

In `QuickChart.jsx`, 15 more chart modes (violin, box, histogram, mosaic,
scree, qq, residual, power, bootstrap, IRT, LCA, spaghetti, ITS, RDD,
slopes) are invoked with hardcoded pixel props/defaults (`width={210}
height={160}`-style) independent of the actual viz panel's size, or wrap
themselves in a fixed small-pixel-height `<div>`. On any screen wider than
~900px this renders into a small fixed box inside a mostly-empty panel.
`src/components/ExplorePanel.jsx` (the EXPLORE tab, a sibling UI to AUTO
mode) already solves this exact problem correctly with a `useCanvasSize()`
`ResizeObserver` hook that measures its real container and feeds exact
pixel dimensions to its own chart components — that hook is local/unexported
to `ExplorePanel.jsx` today; Phase 1 shares it with `QuickChart.jsx` instead
of inventing a second sizing mechanism.

### Investigated and ruled out

A third defect was initially suspected: `ScreePlot`'s `<Bar>` appeared to
render at a ~13x smaller scale than its `<Line>` on the same `dataKey`,
based on an SVG geometry snapshot taken immediately after triggering a PCA
run. Re-tested with a deliberate 5s wait before measuring: the bar heights
are correct (39.44 / 8.97 / 4.07 / 0.87px for eigenvalues 2.958 / 0.673 /
0.305 / 0.065 — ratios match to 3 decimal places). The first reading caught
recharts' default ~1.5s bar-entry animation (height animates 0 → final)
mid-flight; the `Line` series doesn't animate its Y-position the same way,
so the two appeared mismatched only transiently. **Not a real bug.** Noted
here so it isn't rediscovered and "fixed" against a phantom.

## Goals

1. Fix the 4 missing-import `ReferenceError`s so `heatmap`/`barci`/
   `loading`/`timeseries` render their chart instead of crashing the app.
2. Add a minimal error boundary around the chart panel so a future
   rendering exception degrades to an inline error message in that panel,
   not a blank page.
3. Charts fill the real available space in their panel, reusing the
   already-proven `useCanvasSize` pattern from `ExplorePanel.jsx`, instead
   of hardcoded ~210×160 pixels.
4. Regression coverage: a new `QuickChart.test.jsx` that renders every
   `mode` value with representative fixtures and asserts no thrown error —
   this is the direct regression guard for defect #1, the bug class that
   shipped silently because no such test existed. Extend `charts.test.jsx`
   for the sizing-prop additions.
5. No console errors during normal use of any chart mode.

## Non-goals (deferred to Phase 2)

- Navigator redesign (36-category list, stale "84 modules"/"Search 84
  tests..." count, icon legibility), toolbar relabeling, and any broader
  layout/decluttering work. Sequenced after this one so the layout isn't
  redesigned around a broken canvas.
- No change to `statlab` computation/statistics, dataset handling, or
  non-chart UI.
- Not a redesign of chart *visual style* — this is a correctness fix.
- No fix for the (ruled-out) composed-chart scale issue — see above.
- Setting up ESLint (`no-undef` would have caught defect #1 automatically)
  is valuable but out of scope for this fix — flagged separately, not
  bundled in here.

## Approach

### Fix 1: the crash

- Move `computeCorrMatrix` (currently dead code in `Workbench.jsx` — defined,
  never called there since the refactor moved its only call site into
  `QuickChart.jsx`) into `utils/vizHelpers.js`, exported, alongside its
  siblings `seriesFromResult`/`barGroupsFromResult`/`loadingFromResult`
  (`vizHelpers.js` already imports `corr` from `statlab/math/core`, which is
  all `computeCorrMatrix` needs). Delete the dead copy from `Workbench.jsx`.
- Add the four missing named imports to `QuickChart.jsx`'s existing
  `vizHelpers.js`/local import.
- Add a small `ErrorBoundary` class component (new file,
  `src/components/ErrorBoundary.jsx`) wrapping the `<Suspense><QuickChart
  .../></Suspense>` in `Workbench.jsx`, rendering an inline "chart failed to
  render" message with the error text on catch, instead of letting the
  exception unmount the app.

### Fix 2: sizing

- Extract `useCanvasSize` out of `ExplorePanel.jsx` into `utils/vizHelpers.js`
  (exported), update `ExplorePanel.jsx` to import it from there instead of
  defining its own copy (behavior-preserving move, not a rewrite).
- In `Workbench.jsx`, attach a ref + `useCanvasSize(ref)` to the existing
  stable chart-panel container div (the one that already wraps
  `<Suspense><QuickChart/></Suspense>` and already has a real, non-zero
  layout height via the surrounding flex chain), and pass the measured
  `{w, h}` into `<QuickChart canvasSize={{w, h}} .../>`.
- In `QuickChart.jsx`, replace every hardcoded `width={210}`/`height={160}`-
  style literal with `canvasSize.w`/`canvasSize.h` (with the same sane
  floors `ExplorePanel.jsx`'s `useCanvasSize` already applies:
  `Math.max(320, ...)`/`Math.max(240, ...)`, adjusted down to fit the
  typically-smaller AUTO-mode panel — see Task 6 for exact per-mode floors).
- Ten chart primitives in `charts.jsx` (`QQPlot`, `ResidualPlot`,
  `PowerCurve`, `ScreePlot`, `IRTCurves`, `LCAProfiles`, `SpaghettiPlot`,
  `ITSPlot`, `RDPlot`, `BootstrapHist`) hardcode their own wrapper `<div>`
  height with no prop to override it at all. Each gets a `height` parameter
  added (default = its current literal, so every other caller —
  `InferenceResults.jsx`'s many parameterless embedded usages — is
  byte-for-byte unaffected), and only `QuickChart.jsx` passes a non-default
  value.
- The remaining affected components (`ViolinPlot`, `BoxPlotGrid`,
  `HeatmapCorr`, `MosaicPlot`, `BarCI`, `HistogramDensity`, `TimeSeriesChart`,
  `QuickSlopes`) already accept `width`/`height` props — only their
  `QuickChart.jsx` call sites change, no component edits needed.
- Components already using an SVG `viewBox` (self-scaling) or genuinely
  content-driven sizing (`ForestPlot`, `PathDiagram`, `CaterpillarPlot`,
  `SociogramPlot`) are correctly designed already and are out of scope.
- `QuickScatter`/`QuickScatterFit` (the `scatter`/`scatterfit`/default
  modes) already fill their parent via `ResponsiveContainer width="100%"
  height="100%"` with no wrapping `<div>` of their own — already correct,
  no change (this is why scatter charts looked fine while violin/box did
  not, in the initial investigation).

## Testing/Verification Plan

1. `pnpm test` (existing suite) stays green throughout.
2. New `src/components/QuickChart.test.jsx`: render `QuickChart` directly
   for every `mode` string in the dispatcher with representative
   `inferenceResult`/`data` fixtures per mode; assert no thrown error for
   any of them (this specifically would have caught defect #1).
3. New `ErrorBoundary` test: force a child to throw, assert the fallback UI
   renders instead of the exception propagating.
4. Extend `charts.test.jsx`: one assertion per touched primitive that a
   custom `height` prop is honored (rendered wrapper's inline height
   reflects the prop, not the old hardcoded literal).
5. Manual pass in the Browser preview: click each of the 9 toolbar chart-
   type buttons, and select at least one test whose default AUTO mode is
   `barci`/`heatmap`/`loading`/`timeseries` (e.g. One-Way ANOVA, EFA,
   Bootstrap), confirming no console errors and that each chart visibly
   fills its panel. Capture before/after screenshots.
6. No new console errors/warnings introduced.
