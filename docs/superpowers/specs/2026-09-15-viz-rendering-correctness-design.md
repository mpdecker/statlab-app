# StatLab Visualization Rendering Correctness — Design

**Date:** 2026-09-15
**Status:** Approved (Phase 1 of 2 — see Non-goals)

## Problem

The user reported statlab.fyi's visualizations "don't work correctly." Live
inspection (DOM/SVG geometry, not just screenshots) confirms one systemic,
confirmed defect:

**Fixed, tiny render size.** In `src/App.jsx`'s chart-mode dispatcher
(`renderViz`, ~lines 64-193), ~15 chart modes (violin, box, histogram,
heatmap, mosaic, bar-CI, time series, bootstrap, loading-heatmap, ...) are
invoked with hardcoded pixel props such as `width={210} height={160}`,
independent of the actual viz panel's size. Several chart primitives in
`src/components/charts.jsx` additionally wrap themselves in fixed-height
div's (85-160px). There is no container measurement anywhere in the viz
region. Result: on any screen wider than ~900px, charts render into a small
fixed box inside a mostly-empty panel — legible in principle, but tiny and
wasteful of the available canvas.

### Investigated and ruled out

A second defect was initially suspected: `ScreePlot`'s `<Bar>` appeared to
render at a ~13x smaller scale than its `<Line>` on the same `dataKey`, based
on an SVG geometry snapshot taken immediately after triggering a PCA run.
Re-tested with a deliberate 5s wait before measuring: the bar heights are
correct (39.44 / 8.97 / 4.07 / 0.87px for eigenvalues 2.958 / 0.673 / 0.305 /
0.065 — ratios match to 3 decimal places). The first reading caught
recharts' default ~1.5s bar-entry animation (height animates 0 → final) mid-
flight; the `Line` series doesn't animate its Y-position the same way, so the
two appeared mismatched only transiently. **Not a real bug** — no fix needed.
Noted here so it isn't rediscovered and "fixed" against a phantom.

## Goals

1. Charts fill the real available space in their panel (viz region, and any
   embedded chart in `InferenceResults`) instead of a hardcoded pixel box,
   across every chart mode reachable from the mode dispatcher.
2. Regression coverage: extend `charts.test.jsx` with a size-fills-container
   assertion (rendered SVG/wrapper reports 100%-style sizing, not a fixed
   small pixel constant) for every touched chart, so a hardcoded pixel size
   regression fails CI.
3. No visible console errors during normal use of the audited chart modes.
4. While auditing each chart component for sizing, do a final geometry sanity
   check (largest value → tallest/most-prominent mark) using a **settled**
   DOM read (wait for recharts' entry animation, ~1.5s+, before measuring) —
   cheap insurance against another real scale bug hiding among the ~30 chart
   components, now that the measurement method is known to require a settle
   delay.

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
- No fix for the (ruled-out) composed-chart scale issue — see above.

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

Recharts-based charts whose wrapper `<div>` uses a small fixed pixel `height`
(e.g. `QQPlot`'s `height: 110`, `ScreePlot`'s `height: 95`) switch that
wrapper to `height: '100%'` so `ResponsiveContainer` (already `width="100%"
height="90%"` inside) fills the real parent instead of a constant.

### Testing

- Extend `charts.test.jsx` with a sizing assertion per touched component:
  render inside a parent with an explicit test size (e.g. 800×600 via a
  wrapping `div` with inline style in the test), and assert the rendered
  `<svg>` reports `width="100%"`/`viewBox` (raw-SVG components) or that the
  `ResponsiveContainer`'s wrapper has no small fixed-pixel `height` inline
  style — not a literal `210`/`160`/etc.
- Manual verification pass in the live/preview app across a representative
  test from each of the ~15 affected chart modes (not all 221 tests — chart
  *components* are the unit, and there are ~30 of them shared across all
  tests).

## Testing/Verification Plan

1. `pnpm test` (existing suite) stays green throughout.
2. New sizing-sanity tests for each touched chart component.
3. Manual pass in the Browser preview: for each affected mode, run a
   representative test, confirm the chart visibly fills its panel, capture
   before/after screenshots.
4. No new console errors/warnings introduced.
