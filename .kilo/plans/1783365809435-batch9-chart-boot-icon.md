# Plan: Finish Batch 9 Chart Visualization (Remaining Items)

## Goal

Complete the two remaining items from the batch9 chart visualization plan: missing `boot` icon and broken `sens_forecast` timeseries rendering.

## Changes

### Change 1: Add `boot` icon to CHART_ICONS

**File**: `src/App.jsx` (line 35)

Insert after `timeseries` entry:

```js
{ id: 'boot', label: 'B', title: 'Bootstrap' },
```

Supporting context:
- `boot` already in `CHART_MODE_LABELS` (vizHelpers.js:36)
- `boot` already has `case 'boot'` handler in `renderQuickChart` (App.jsx:107-109)
- `boot_ci`, `boot_se`, `boot_test`, `boot_tci` already mapped to `boot` in chartMap.js

### Change 2: Fix `sens_forecast` timeseries rendering

`sens_forecast` maps to `timeseries` in chartMap but `forecastCombination()` returns `{mse, method, n, k, apa}` — no plottable arrays. `seriesFromResult` returns null, falling back to a raw-data histogram instead of a forecast-vs-actual line chart.

**Root cause**: `forecastCombination` computes `combined` and has `actual` arrays but discards them instead of returning them.

#### Change 2a: Modify `forecastCombination` return (sensitivity.js)

**File**: `src/tests/sensitivity.js:75`

Change the return statement from:
```js
return { test: 'Forecast Combination', mse: +(mse / n).toFixed(4), method, n, k, apa: `Combination: MSE = ${(mse / n).toFixed(4)}` };
```

To:
```js
return { test: 'Forecast Combination', mse: +(mse / n).toFixed(4), method, n, k, combined, actual, apa: `Combination: MSE = ${(mse / n).toFixed(4)}` };
```

**Safety**: `forecastCombination` is consumed by:
- `runners.js` fixture → calls `forecastCombination(SENS_FORECASTS, ZS.slice(0, 10))` → contract test validates `r.test` and `r.apa`, extra keys are harmless
- `sensitivity.test.js` → checks `r.mse` is finite, extra keys are harmless
- `InferencePanel.jsx` compute case → spreads `...r` and adds `test` label, extra keys pass through

#### Change 2b: Add `sens_forecast` handler to `seriesFromResult` (vizHelpers.js)

**File**: `src/utils/vizHelpers.js`

Insert before the `// generic: scan result` line (line 285):

```js
if (t === 'sens_forecast') {
  const s = [];
  if (result.actual?.length) s.push({ name: 'Actual', data: result.actual });
  if (result.combined?.length) s.push({ name: 'Combined', data: result.combined });
  if (s.length) return s;
}
```

This produces two named lines ("Actual" and "Combined") rendered by `TimeSeriesChart`, which already supports multi-series via `{name, data}[]` format (charts.jsx:666).

## Files Changed

| File | Change |
|------|--------|
| `src/App.jsx` | Add `boot` icon to CHART_ICONS (1 line) |
| `src/tests/sensitivity.js` | Add `combined`, `actual` to `forecastCombination` return (1 edit) |
| `src/utils/vizHelpers.js` | Add `sens_forecast` handler in `seriesFromResult` (5 lines) |

## Validation

1. Run `npx vitest run` — all 6,154+ tests pass, no regressions
2. Run `npx vitest run src/tests/sensitivity.test.js` — forecastCombination tests still pass
3. Manual smoke: select `boot_ci`, run compute, verify `B` icon appears in QuickView chart selector, BootstrapHist renders
4. Manual smoke: select `sens_forecast`, run compute, verify timeseries chart renders with Actual + Combined lines
