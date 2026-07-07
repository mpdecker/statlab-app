# Plan: Batch 9 Chart Visualization

## Goal

Add meaningful chart rendering for all 100 batch 9 test results in the Quick View panel. Currently 17 tests use `timeseries` mode (unhandled, falls through to scatter), and many `barci` assignments don't match the result shapes.

## Key Discovery

`timeseries` mode exists in `chartMap.js` and `EXPLORE_PANEL_CHART_FOR_MODE` but is **not handled** in `renderQuickChart()` (App.jsx:53). It falls through to the `default` case (scatter). This affects 17 tests: abm_diffusion, bandit_eps/ucb/thompson/softmax/ql/sarsa, ram_cusum/vlad/sprt/cchart, sced_tauu/pnd/pem/nap/rand/bctau.

## Implementation Plan

### Step 1: Create `TimeSeriesChart` component (charts.jsx)

New export: `TimeSeriesChart({ series, width, height })`

Props:
- `series`: `number[]` (auto-labeled as data points) or `{name: string, data: number[]}[]` (multi-line)
- `width`, `height`: defaults 210, 120

Renders a `LineChart` (recharts) with CartesianGrid, XAxis (index), YAxis, Tooltip. Orange line per series, 2px stroke.

### Step 2: Create `seriesFromResult(result, activeTest)` adapter (vizHelpers.js)

New export: `seriesFromResult(result, activeTest)` → `{name?: string, data: number[]}[]`

Mappings by activeTest prefix:
- Bandit tests → extract `result.history` array; each entry has `{iteration, reward, ...}` → extract `reward` column. Return `[{data: history.map(h => h.reward)}]`
- `ram_cusum` → `[{data: result.cusum}]`
- `ram_vlad` → `[{data: result.vlad}]`
- `ram_sprt` → `[{data: result.llr}]`
- `abm_diffusion` → if `result.history` is number[][], return each sub-array as a named series
- Generic fallback → scan `result` for first number[]-typed field; if found, return `[{data: thatField}]`
- Return `null` if no plottable series found

### Step 3: Extend `barGroupsFromResult` for sensitivity/ABM effects (vizHelpers.js)

Add result shape handling before the existing gMeans/adjMeans checks:

```
if (result?.effects?.length)       → map to [{name: e.param, mean: e.muStar, se: 0}, ...]
if (result?.Si?.length)            → map to [{name: `X${i+1}`, mean: Si[i], se: 0}, ...]
if (result?.totalIndices?.length)  → map to [{name: `X${i+1}`, mean: totalIndices[i], se: 0}, ...]
if (result?.indices?.length)       → map to [{name: e.factor, mean: e.main, se: 0}, ...]
if (result?.results?.length)       → map to [{name: r.name, mean: r.prr, se: 0}, ...]
if (result?.summaries?.length)     → map to [{name: s.var, mean: s.mean, se: s.sd / sqrt(s.n)}, ...]
```

### Step 4: Add `timeseries` case to `renderQuickChart` (App.jsx)

After `case 'boot':` (line 105-108), insert:

```jsx
case 'timeseries': {
  const series = seriesFromResult(inferenceResult, activeTest);
  if (series?.length) return <TimeSeriesChart series={series} width={210} height={140} />;
  return <HistogramDensity values={numVals(yVar || xVar)} width={210} height={160} />;
}
```

### Step 5: Add `boot` case to `renderQuickChart` for bootstrap results (App.jsx)

The `boot` case already exists (line 105-108) and handles `result.dist` with `BootstrapHist`. Ensure bootstrap tests (`boot_*`) are mapped to `boot` in chartMap.

### Step 6: Update `chartMap.js` entries

Reassign chart modes based on actual result shapes:

**bandit (history)** — already correct:
- bandit_eps → timeseries ✓
- bandit_ucb → timeseries ✓
- bandit_thompson → timeseries ✓
- bandit_softmax → timeseries ✓
- bandit_ql → timeseries ✓
- bandit_sarsa → timeseries ✓
- bandit_context → barci → **timeseries** (it returns history too)
- bandit_pg → barci → **timeseries**
- bandit_dqn → barci → **barci** (no history field in result)

**raMonitor (series data)** — already correct:
- ram_cusum → timeseries ✓
- ram_vlad → timeseries ✓
- ram_sprt → timeseries ✓
- ram_cchart → timeseries ✓

**raMonitor (other)** — adjust:
- ram_funnel → scatter → **scatter** (funnel has points but no x/y for generic scatter; keep scatter for now)
- ram_safety → scatter → **barci** (single stat, no series)
- ram_prr → barci ✓ (now handled by barGroupsFromResult)

**sced (no series in result)** — change from timeseries:
- sced_tauu → **histogram** (raw data plot)
- sced_pnd → **histogram**
- sced_pem → **histogram**
- sced_nap → **histogram**
- sced_rand → **histogram**
- sced_bctau → **histogram**
- sced_bcsmd → barci ✓

**abm:**
- abm_diffusion → timeseries ✓
- abm_morani → barci ✓ (now handled by barGroupsFromResult if we add index parsing)
- abm_sobol → barci ✓ (indices)
- abm_summary → barci ✓ (summaries)
- All other abm → barci ✓ (fallback to raw data groups)

**sensitivity:**
- sens_morris → barci ✓ (effects now handled)
- sens_fast → barci ✓ (Si now handled)
- sens_sobol1 → barci ✓ (Si)
- sens_sobolt → barci ✓ (totalIndices)
- sens_modelcomp → barci → **histogram** (single stat)
- sens_forecast → scatterfit → **timeseries** (forecast lines)
- sens_delta → barci → **histogram**
- sens_andrews → scatter → **scatter** (curves)

**bootstrap:**
- boot_ci → histogram → **boot** (show distribution)
- boot_se → histogram → **boot**
- boot_test → histogram → **boot**
- boot_jack → barci → **barci** (now handled if we add influence/estimate parsing)
- boot_tci → histogram → **boot**
- boot_influence → barci → **barci** (if influence is array)
- boot_mediation → barci ✓
- boot_modmed → barci ✓
- boot_splitconf → histogram → **histogram** (radius is single number)
- boot_confpval → histogram → **histogram** (p is single number)
- boot_jackplus → histogram → **histogram** (interval bounds)

**power (all single-number stats):**
- All pow_*/reqn_* → barci → **histogram** (power/n/effect are single numbers, not bars)

### Step 7: Add chart UI entries

- Add `'timeseries'` to `CHART_MODE_LABELS` as `'Time Series'` (vizHelpers.js:47)
- Add `timeseries` icon to `CHART_ICONS` in App.jsx: `{ id: 'timeseries', label: '\u223F', title: 'Time Series' }`

### Step 8: Modify compute branches to include chart data (InferencePanel.jsx)

For SCED tests: modify compute branches to return `{...r, baseline: bl, intervention: it}` so the chart can access raw data. The `seriesFromResult` adapter can then extract these for timeseries rendering.

Update SCED compute branches (sced_tauu through sced_bcsmd):
- After `const r = fn(bl, it, ...)`, change return to `r ? {...r, baseline: bl, intervention: it} : null`

Update `seriesFromResult` to handle SCED:
- `sced_*` → extract `result.baseline` and `result.intervention` as two named series

Restore SCED chartMap entries to `timeseries`.

### Step 9: Add `boot` to CHART_MODE_LABELS and EXPLORE_PANEL_CHART_FOR_MODE

- `CHART_MODE_LABELS.boot = 'Bootstrap'` (already present at line 36)
- `EXPLORE_PANEL_CHART_FOR_MODE.boot = 'Histogram'` (already present at line 71)
- Add `boot` icon to CHART_ICONS: `{ id: 'boot', label: 'B', title: 'Bootstrap' }`

## Files Changed

| File | Changes |
|------|---------|
| `src/components/charts.jsx` | Add `TimeSeriesChart` component |
| `src/utils/vizHelpers.js` | Add `seriesFromResult`, extend `barGroupsFromResult`, add `timeseries` to `CHART_MODE_LABELS` |
| `src/App.jsx` | Add `timeseries` and `boot` cases to `renderQuickChart`, add `timeseries` icon to `CHART_ICONS`, import `TimeSeriesChart` |
| `src/config/chartMap.js` | ~30 entry changes per step 6 |
| `src/components/InferencePanel.jsx` | 7 SCED compute branches: add `baseline`/`intervention` to result |

## Validation

1. `npx vitest run` — all 6,086 tests pass
2. `npx vitest run src/utils/vizHelpers.test.js` — barGroupsFromResult tests still pass, new tests for seriesFromResult
3. Manual smoke: select bandit_eps in UI, verify timeseries chart renders; select sens_morris, verify bar chart shows effects

## Risk: Memory / Performance

Adding baseline/intervention arrays to SCED results doubles the result object size for those tests. The arrays are small (10-20 numbers), so this is negligible.
