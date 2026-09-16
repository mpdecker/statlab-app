# StatLab Visualization Rendering Correctness — Design

**Date:** 2026-09-15
**Status:** Approved (Phase 1 of 2 — see Non-goals)

## Problem

The user reported statlab.fyi's visualizations "don't work correctly." Live
inspection (DOM/SVG geometry, not just screenshots) confirms two distinct,
confirmed defects — not one bug:

1. **Fixed, tiny render size.** In `src/App.jsx`'s chart-mode dispatcher
   (`renderViz`, ~lines 64-193), ~15 chart modes (violin, box, histogram,
   heatmap, mosaic, bar-CI, time series, bootstrap, loading-heatmap, ...) are
   invoked with hardcoded pixel props such as `width={210} height={160}`,
   independent of the actual viz panel's size. Several chart primitives in
   `src/components/charts.jsx` additionally wrap themselves in fixed-height
   div's (85-160px). There is no container measurement anywhere in the viz
   region. Result: on any screen wider than ~900px, charts render into a
   small fixed box inside a mostly-empty panel.

2. **Composed-chart series-scale mismatch (data-correctness bug).** `ScreePlot`
   (`charts.jsx:125-144`) draws a `<Bar>` and a `<Line>` off the *same*
   `dataKey="v"` inside one `ComposedChart`. Verified via raw SVG path
   geometry on a live PCA run (eigenvalues `[2.958, 0.673, 0.305, 0.065]`):
   at the same x-position, the `Line` plots PC1 near the top of the chart
   (y≈2.6 of 40px), but the `Bar` for the identical value renders only
   ~2.8px tall off a ~42px baseline — an ~13x scale mismatch between two
   series reading the same field in the same chart. The bars are
   functionally invisible; only the line is legible. `HistogramDensity`
   (`charts.jsx:396-406`) uses the same Bar+Line-in-one-ComposedChart shape
   (`count` + `density`) and needs the same check — different keys there, so
   it may be a legitimate dual-scale case that needs a second Y-axis rather
   than a bug, but it must be verified rather than assumed.

## Goals

1. Charts fill the real available space in their panel (viz region, and any
   embedded chart in `InferenceResults`) instead of a hardcoded pixel box,
   across every chart mode reachable from the mode dispatcher.
2. Every chart that renders multiple series on one plot renders them on a
   provably shared, correct scale — fix the `ScreePlot` Bar/Line mismatch at
   its root cause, and audit every other multi-series chart
   (`HistogramDensity`, and any other `ComposedChart` combining >1 dataKey)
   for the same class of bug.
3. Regression coverage: extend `charts.test.jsx` with geometry-sanity
   assertions (e.g. "the tallest bar corresponds to the largest value") for
   every fixed chart, so this class of bug fails CI if it recurs.
4. No visible console errors during normal use of the audited chart modes.

## Non-goals (deferred to Phase 2)

- Navigator redesign (36-category list, stale "84 modules"/"Search 84
  tests..." count, icon legibility), toolbar relabeling, and any broader
  layout/decluttering work. That is a separate, already-agreed follow-up
  spec, sequenced after this one so the layout isn't redesigned around a
  broken canvas.
- No change to `statlab` computation/statistics, dataset handling, or
  non-chart UI.
- Not attempting a redesign of chart *visual style* (colors, chart-type
  choices) — this is a correctness fix, not a restyle.

## Approach

### Sizing fix

Match the pattern StatLab's own better-behaved charts already use
(`TDistViz`, `ForestPlot`, and the recharts-based charts already wrapped in
`ResponsiveContainer width="100%"`): every chart primitive fills its parent
via CSS (`width: 100%`, `height: 100%`), and raw-SVG (non-recharts) chart
primitives switch from `<svg width={width} height={height}>` (literal pixel
canvas) to `<svg width="100%" height="100%" viewBox="0 0 W H"
preserveAspectRatio="xMidYMid meet">`, keeping `W`/`H` purely as the internal
virtual coordinate system for the plotting math (unchanged). This needs no
`ResizeObserver` or container-measurement plumbing — the existing flex
containers in the dispatcher (`height: '100%'`) already do the right thing
once children stop hardcoding pixel dimensions.

Call sites in `App.jsx`'s dispatcher stop passing fixed `width={210}
height={160}` and instead let each component size itself via its parent
(components keep sensible internal aspect-ratio defaults for their `viewBox`
math, e.g. `BoxPlot`'s existing `width = 200, height = 80` become the virtual
coordinate system, not the literal render size).

Where a chart's layout math depends on a real pixel size (e.g.
`BoxPlotGrid`'s per-group column width), the virtual `W`/`H` used for that
math stays a fixed, reasonable constant (e.g. 600×300) so proportions stay
correct regardless of final rendered size.

### Composed-chart scale fix

Root-cause `ScreePlot`'s Bar/Line mismatch (recharts version/config issue —
diagnosed precisely during implementation, per systematic-debugging) and
verify the fix by re-inspecting rendered SVG geometry the same way this
defect was found (bar height must be proportional to its value, matching the
line's proportion, not ~13x off). Apply the same verification method to
`HistogramDensity` and any other multi-series `ComposedChart`.

### Testing

- Extend `charts.test.jsx` (uses `happy-dom` + Testing Library, already
  covers some of these components) with assertions on rendered SVG geometry:
  largest value → tallest/most-prominent mark, for each fixed chart.
  A same-scale assertion for `ScreePlot` (bar height and line y-position must
  agree on which value is larger) is the regression guard for defect #2.
- Manual verification pass in the live/preview app across a representative
  test from each of the ~15 affected chart modes (not all 221 tests — chart
  *components* are the unit, and there are ~30 of them shared across all
  tests).

## Testing/Verification Plan

1. `pnpm test` (existing suite) stays green throughout.
2. New geometry-sanity tests for each touched chart component.
3. Manual pass in the Browser preview: for each affected mode, run a
   representative test, confirm the chart visibly fills its panel and reads
   correctly, capture a before/after screenshot for the two defects
   documented above (Scree Plot bars, general chart sizing).
4. No new console errors/warnings introduced.
