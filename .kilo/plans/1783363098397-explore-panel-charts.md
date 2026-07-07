# Plan: Explore Panel Charts — Data + Inference Dashboard

## Goal

Transform the Explore tab from a 22-chart raw-data explorer into a comprehensive dashboard that also renders inference-specific charts (Survival, Forest, Bootstrap, IRT, etc.) when seeded from the QuickView panel. Add missing data-exploration chart types (time-series line, QQ plot). Fix chart component duplication between `charts.jsx` and `charts-explore.jsx`.

## Current State

| Aspect | Count | Detail |
|--------|-------|--------|
| Explore chart types | 22 | Organized in 6 sections (Distribution, Relationship, Comparison, Interaction, Categorical, Multivariate) |
| `charts-explore.jsx` exports | 18 | ExHistogram, ExViolin, ExBox, ExRainCloud, ExECDF, ExScatterFit, ExCorrelogram, ExBubble, ExScatterMatrix, ExBarCI, ExDotCI, ExLollipop, ExStripPlot, ExInteractionPlot, ExSimpleSlopes, ExSpotlight, ExMosaic, ExStackedBar100, ExDivergingLikert, ExPCABiplot, ExLoadingHeatmap, ExDendrogram, ExSilhouette |
| QuickView chart modes | 36 | With dedicated charts in `charts.jsx` (SurvivalPlot, ForestPlot, BootstrapHist, IRTCurves, ITSPlot, RDPlot, SociogramPlot, etc.) |
| Bridge: `EXPLORE_PANEL_CHART_FOR_MODE` | 36 entries | 24+ map to generic fallbacks (`Scatter+fit`, `Histogram`, `Bar+CI`) |
| Seed mechanism | ✓ | Passes `chartType`, `includeVars`, `groupVar`, `xVar`, `yVar`, `catX`, `catY` from QuickView → Explore. Does NOT pass `inferenceResult` |
| Duplicated helpers | 4 | `groupStats`, `histBins`, `pearsonR`, `covMatrix` in charts-explore.jsx duplicate functions in `vizHelpers.js` and `math/core.js` |

## Implementation Plan

### Step 1: Pass inference result through Explore seed

**File**: `src/App.jsx` — `handleTabSwitch` callback (line 620–640)

Add `inferenceResult` to the seed object. The Explore panel receives this and can render inference-specific charts.

```js
setExploreSeed({
  chartType: mode,
  chartLabel: explorePanelChartFromMode(mode),
  chartLabelDisplay: exploreChartLabel(mode),
  xVar: resolved.xVar,
  yVar: resolved.yVar,
  groupVar: resolved.groupVar,
  catX: resolved.catX,
  catY: resolved.catY,
  includeVars: [...inc].filter((v, i, a) => v && a.indexOf(v) === i),
  inferenceResult,              // ← new
  activeTest,                   // ← new
});
```

**File**: `src/components/ExplorePanel.jsx` — consume `inferenceResult` from seed

- Add `inferenceResult` and `activeTest` to state from seed in `useEffect`
- Conditionally show an "Inference" chart section when seeded
- Pass `inferenceResult` to chart renderers that need it

### Step 2: Add inference chart types to Explore

**File**: `src/components/ExplorePanel.jsx` — `CHART_SECTIONS`

Add a 7th section when seeded from inference:

```js
{ label: 'Inference', charts: ['Survival', 'Forest', 'Bootstrap', 'IRT', 'Caterpillar', 'Time series', 'RDD'] }
```

This section only appears when `inferenceResult` is available.

**File**: `src/components/ExplorePanel.jsx` — `renderChart` switch

Add cases that render inference-specific charts by wrapping QuickView components:

| Explore chart id | Wraps | Condition |
|-----------------|-------|-----------|
| `'Survival'` | `SurvivalPlot` from charts.jsx | `inferenceResult?.km \|\| inferenceResult?.kms?.length` |
| `'Forest'` | `ForestPlot` from charts.jsx | `inferenceResult?.studies?.length` |
| `'Bootstrap'` | `BootstrapHist` from charts.jsx | `inferenceResult?.dist` |
| `'IRT'` | `IRTCurves` from charts.jsx | `inferenceResult?.icc?.length` |
| `'Caterpillar'` | `CaterpillarPlot` from charts.jsx | `inferenceResult?.groupMeans?.length` |
| `'Time series'` | `TimeSeriesChart` from charts.jsx | `seriesFromResult(inferenceResult, activeTest)` |
| `'RDD'` | `RDPlot` from charts.jsx | `inferenceResult?.points?.length` |
| `'Power curve'` | `PowerCurve` from charts.jsx | Always renders with defaults |

### Step 3: Add new data-exploration chart types

**File**: `src/components/charts-explore.jsx`

Three new exports for raw-data exploration:

#### 3a. `ExLineChart` — Time series line plot

```js
export function ExLineChart({ data, xVar, yVar, width = 400, height = 280 })
```

- Renders a recharts `LineChart` with index-based x-axis
- Accepts `xVar` (numeric) or falls back to row index
- Simple monochrome line, no grouping
- Add to "Relationship" section in CHART_SECTIONS as `'Line'`

#### 3b. `ExQQPlot` — Q-Q plot

```js
export function ExQQPlot({ data, xVar, width = 400, height = 280 })
```

- Sorts values, computes theoretical normal quantiles
- SVG scatter + reference line (hand-rolled, no recharts)
- Add to "Distribution" section as `'Q-Q'`

#### 3c. `ExParallelCoords` — Parallel coordinates

```js
export function ExParallelCoords({ data, vars, groupVar, width = 500, height = 320 })
```

- One vertical axis per variable, polyline per observation
- Color by groupVar
- Add to "Multivariate" section as `'Parallel'`

**File**: `src/components/ExplorePanel.jsx` — update CHART_SECTIONS

```js
{ label: 'Distribution', charts: ['Histogram', 'Box', 'Violin', 'Rain-cloud', 'ECDF', 'Q-Q'] },
{ label: 'Relationship', charts: ['Scatter+fit', 'Line', 'Correlogram', 'Bubble', 'Scatt. matrix'] },
{ label: 'Multivariate', charts: ['PCA biplot', 'Load. heatmap', 'Parallel', 'Dendrogram', 'Silhouette'] },
```

**File**: `src/utils/vizHelpers.js` — update chart set constants

- Add `'Q-Q'` to `EXPLORE_CHARTS_XY` (line ~149)
- Add `'Line'` to `EXPLORE_CHARTS_XY`
- Add `'Parallel'` (no special set needed — uses includeVars)

### Step 4: Refactor duplicated helpers

**File**: `src/components/charts-explore.jsx`

Remove the following local functions and import from shared locations:

| Remove from charts-explore | Replace with import |
|---|---|
| `histBins` (line 8) | Not directly duplicated. `charts.jsx` has `histBins` at line 261 but with object shape `{x, count}` vs `{label, count}`. Keep local variant — different output format needed for recharts BarChart |
| `pearsonR` (line 20) | Replace with `import { corr } from '../math/core.js'`. `pearsonR` is just a wrapper. |
| `groupStats` (line 30) | Replace with `barGroupsFromResult`-like logic or keep. Uses raw data, not inference result. Keep for now — different domain. |
| `covMatrix` (line 42) | Replace with `import { covMatrix } from '../math/core.js'` (if it exists) or extract to a shared place |

**Actually**: `covMatrix` and `pearsonR` are simple enough to be inlined or kept. The real refactoring win is not in helper removal but in:

1. **Share chart primitives**: `ExMosaic` already wraps `MosaicPlot`. Do the same for other wrappers.
2. **Consistent color/styling**: Explore charts use hardcoded `'#c4ff00'`, `'#555'`, etc. QuickView charts use `C.accent`, `C.dim`, `C.border` from `palette.js`. Unify Explore to use `C.*` tokens.
3. **Remove unused variables**: `ExViolin` import of `ViolinPlot` is fine. No major duplication beyond that.

**Decision**: Skip aggressive refactoring. The main duplication (ExViolin→ViolinPlot, ExMosaic→MosaicPlot) is already via re-use, not duplication. The standalone functions are small (<10 lines each) and their removal would cause more churn than value.

### Step 5: Update EXPLORE_PANEL_CHART_FOR_MODE

**File**: `src/utils/vizHelpers.js` — improve bridge mappings

Change 12 fallback entries to better Explore targets:

| QuickView mode | Old → | New | Rationale |
|---|---|---|---|
| `forest` | `Bar+CI` → | `Forest` | Direct forest plot when seeded |
| `boot` | `Histogram` → | `Bootstrap` | Bootstrap distribution |
| `irtplot` | `Histogram` → | `IRT` | IRT curves |
| `caterpillar` | `Bar+CI` → | `Caterpillar` | Caterpillar plot |
| `survival` | `Bar+CI` → | `Survival` | KM curves |
| `timeseries` | `Scatter+fit` → | `Time series` | Time series line |
| `rddplot` | `Scatter+fit` → | `RDD` | RDD plot |
| `its` | `Interact. plot` → | `Time series` | ITS segments as time series |
| `path` | `Scatter+fit` → | stays | No better alternative |
| `sociogram` | `Dendrogram` → | stays | Dendrogram is closest |
| `spectrum` | `Histogram` → | `Scatter+fit` | Spectrum is frequency domain |
| `lorenz` | `Scatter+fit` → | `Line` | Lorenz curve is a line |

### Step 6: Update chartMap.test.js explore panel test

**File**: `src/config/chartMap.test.js`

The test at line 59-63 validates every chart mode maps to an Explore panel chart id. The new inference chart ids (`Survival`, `Forest`, `Bootstrap`, `IRT`, `Caterpillar`, `Time series`, `RDD`, `Power curve`) must exist in the Explore panel's `renderChart` switch. The test checks `EXPLORE_PANEL_CHART_FOR_MODE[mode]` which is now set in Step 5.

## Files Changed

| File | Changes |
|------|---------|
| `src/App.jsx` | Add `inferenceResult` + `activeTest` to Explore seed |
| `src/components/ExplorePanel.jsx` | Consume seed inferenceResult; add Inference section to CHART_SECTIONS; add 8 inference chart cases to `renderChart`; add 3 new chart types to sections; add 3 new imports; import SurvivalPlot, ForestPlot, BootstrapHist, IRTCurves, CaterpillarPlot, TimeSeriesChart, RDPlot, PowerCurve from charts.jsx |
| `src/components/charts-explore.jsx` | Add `ExLineChart`, `ExQQPlot`, `ExParallelCoords` exports |
| `src/utils/vizHelpers.js` | Update `EXPLORE_PANEL_CHART_FOR_MODE` (12 entries); update `EXPLORE_CHARTS_XY` (add Q-Q, Line); add inference chart ids to `EXPLORE_PANEL_CHART_FOR_MODE` for validation |
| `src/config/chartMap.test.js` | Test may need no changes if new Explore chart ids are auto-detected via `EXPLORE_PANEL_CHART_FOR_MODE` |

## Risk: Chart mode validation

The chartMap.test.js validates every QuickView mode maps to a valid Explore chart id. After Step 5, some modes map to new ids like `'Forest'`, `'Survival'`, etc. These must exist as:
1. A CHART_SECTION entry (Step 2)
2. A case in `renderChart` switch (Step 2)

The test at chartMap.test.js:59 validates `EXPLORE_PANEL_CHART_FOR_MODE[mode]` is truthy, which it always will be. It does NOT validate the Explore chart id is actually renderable. No test change needed for this, but manual verification is required.

## Risk: Inference section only when seeded

The inference chart section should only appear in the Explore sidebar when `inferenceResult` is available (seeded from QuickView). Without it, inference chart types are not shown as selectable options. This prevents confusion when exploring raw data.

## Validation

1. `npx vitest run` — all 6,086+ tests pass
2. `npx vitest run src/config/chartMap.test.js` — chart mode → Explore panel id validation passes
3. `npx vitest run src/components/charts-explore.test.jsx` — existing Explore chart tests pass
4. Manual smoke: select `km` (survival), run inference, switch to Explore — verify Survival curve renders
5. Manual smoke: select `pearson`, run inference, switch to Explore — verify no Inference section appears

## Implementation Order

1. Step 3: New Explore chart types (ExLineChart, ExQQPlot, ExParallelCoords) — independent
2. Step 4: Minor helper refactoring — independent
3. Step 1: Pass inferenceResult through seed
4. Step 2: Add inference chart types to Explore (wrappers)
5. Step 5: Update EXPLORE_PANEL_CHART_FOR_MODE mappings
6. Run tests & validate
