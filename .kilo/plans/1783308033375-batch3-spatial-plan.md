# Batch 3 — Spatial & Spatiotemporal Implementation Plan

## Overview
Wire 17 tests across 3 modules into the UI, following the established 4-way pattern.
Compute spatial weight matrix W internally from user-selected coordinate columns.

## New Categories (3) + Color Assignments

| Category | Color var | Tree tests |
|----------|-----------|------------|
| SPATIAL STATISTICS | C.sky (`#0ea5e9`) | 8 |
| SPATIAL ECONOMETRICS | C.emerald (`#10b981`) | 4 |
| SPATIOTEMPORAL | C.yellow (`#eab308`) | 5 |

## Pre-requisite: Export `_spatialWeights` from `src/tests/spatial.js`

Add `export` prefix to `function _spatialWeights` on line 8, renaming to `buildSpatialWeights`:
```js
export function buildSpatialWeights(points, valueField, { type = 'inverseDistance', threshold = null, k = 5 } = {}) {
```
Update the two callers within the same file to use the new name.

## File-by-File Changes

### 1. `src/tests/spatial.js`
Export `buildSpatialWeights` (rename `_spatialWeights`). The function expects `points` (array of `{x, y, [field]}`) and returns `{ W, val, n }`.

### 2. `src/config/tree.js`
Add 3 new category blocks after FUNCTIONAL DATA, before DIAGNOSTICS & TOOLS.

**SPATIAL STATISTICS (8):** moransi, gearyc, variogram, kriging, idw, ripleysk, spatial_error, spatial_lag

**SPATIAL ECONOMETRICS (4):** sdm, spatial_panel, spatial_hausman, direct_indirect

**SPATIOTEMPORAL (5):** star, gstar, st_interact, st_moran, st_forecast

### 3. `src/config/chartMap.js`
Add 17 entries. New chart type strings: `variogram`, `envelope`. Reuse existing: `heatmap`, `scatterfit`, `barci`, `scatter`, `timeseries`, `histogram`.

### 4. `src/components/InferencePanel.jsx`

**Imports** — add:
```js
import { moransI, gearysC, semivariogram, ordinaryKriging, idw, ripleysK, spatialErrorModel, spatialLagModel, buildSpatialWeights } from '../tests/spatial.js';
import { spatialDurbin, spatialPanel, spatialHausman, directIndirectEffects } from '../tests/spatialEconometric.js';
import { starModel, gstarModel, spaceTimeInteraction, spatiotemporalMoran, spaceTimeForecast } from '../tests/spatialTemporal.js';
```

**Config state** — add per-category states:
- Spatial common: `spatCoordXVar`, `spatCoordYVar` (numeric column selectors for lon/lat), `spatValueVar` (value field), `spatWeightType` (dropdown: inverseDistance/binary/knn), `spatWeightThresh`, `spatWeightK`
- Variogram: `spatNLags`
- Kriging/IDW: `spatNNeighbors`, `spatPower`
- Ripley's K: `spatNSim`
- Spatial lag/error: `spatRegPreds` (CheckList), `spatRegYVar`
- SDM: `spatXVars` (CheckList), `spatYVar`
- Panel: `spatIdVar`, `spatTimeVar`
- Hausman: `spatHausBetaFe`, `spatHausSeFe`, etc. (scalar text inputs)
- Direct/indirect: takes SDM result (no new inputs)
- STAR/GSTAR: `spatStarP`, `spatStarQ`
- ST interaction/moran: reuse `spatTimeVar`
- ST forecast: `spatForecastSteps`

**Derived data vectors** — add useMemo blocks:
- `spatPoints` — array of `{ x: +r[coordXVar], y: +r[coordYVar], [spatValueVar]: +r[spatValueVar] }` objects, filtered to finite coords
- `spatW` — weight matrix computed via `buildSpatialWeights(spatPoints, spatValueVar, { type, threshold, k })`

**Computation branches** — add `if (a===...)` blocks before the SURVIVAL ANALYSIS section:

Spatial (points-based):
```
if (a==='moransi') return moransI(spatPoints, spatValueVar, { weightType: spatWeightType, threshold: ... });
if (a==='gearyc') return gearysC(spatPoints, spatValueVar, { weightType: spatWeightType, threshold: ... });
if (a==='variogram') return semivariogram(spatPoints, spatValueVar, { nLags: +spatNLags });
if (a==='idw') { const predPts = spatPoints.slice(0, 5); return idw(spatPoints, spatValueVar, predPts, { power: +spatPower }); }
if (a==='kriging') { const predPts = spatPoints.slice(0, 5); return ordinaryKriging(spatPoints, spatValueVar, predPts); }
if (a==='ripleysk') return ripleysK(spatPoints, { nSim: +spatNSim });
if (a==='spatial_error') return spatialErrorModel(data, spatValueVar, spatPoints, { weightType: spatWeightType });
if (a==='spatial_lag') return spatialLagModel(data, spatValueVar, spatPoints, { weightType: spatWeightType });
```

Econometric (W-based):
```
if (a==='sdm') return spatialDurbin(data, spatRegYVar, spatXVars, spatW);
if (a==='spatial_panel') return spatialPanel(data, spatRegYVar, spatXVars, spatW, { idVar: spatIdVar, timeVar: spatTimeVar });
if (a==='spatial_hausman') return spatialHausman(parseNumList(spatHausBetaFe), parseNumList(spatHausSeFe), ...);
if (a==='direct_indirect') { const sdmRes = ...; return sdDMRes ? directIndirectEffects(sdmRes) : null; }
```

Spatiotemporal:
```
if (a==='star') return starModel(data, spatRegYVar, spatXVars, spatW, { p: +spatStarP });
if (a==='gstar') return gstarModel(data, spatRegYVar, spatXVars, spatW, { p: +spatStarP, q: +spatStarQ });
if (a==='st_interact') return spaceTimeInteraction(data, spatRegYVar, spatXVars, spatTimeVar);
if (a==='st_moran') return spatiotemporalMoran(data, spatRegYVar, spatTimeVar, spatW);
if (a==='st_forecast') { const st = starModel(data, spatRegYVar, spatXVars, spatW); return st ? spaceTimeForecast(st, +spatForecastSteps) : null; }
```

**Dependency array** — add all new state + derived vector deps.

**Config state bundle** — add all new state vars + setters.

### 5. `src/components/InferenceConfig.jsx`
Add `configMap` entries for all 17 tests. Key patterns:

Spatial (points-based):
- `moransi`, `gearyc`: coordX Sel + coordY Sel + value Sel + weight type dropdown
- `variogram`: coordX + coordY + value + nLags Inp
- `kriging`, `idw`: coordX + coordY + value + nNeighbors Inp (+ power for IDW)
- `ripleysk`: coordX + coordY (no value field needed) + nSim Inp
- `spatial_error`, `spatial_lag`: coordX + coordY + value + weight type + outcome Y + predictors CheckList

Econometric:
- `sdm`: outcome Sel + predictors CheckList (W computed from coord cols)
- `spatial_panel`: outcome + predictors + W config + idVar + timeVar
- `spatial_hausman`: 2× text inputs for beta vectors + 2× for SE vectors
- `direct_indirect`: reuses SDM computation (no new inputs)

Spatiotemporal:
- `star`, `gstar`: outcome + predictors + W config + p/q
- `st_interact`: outcome + predictors + timeVar
- `st_moran`: outcome + timeVar (W from coord cols)
- `st_forecast`: outcome + predictors + W config + nSteps

### 6. `src/config/methodNotes.js`
Add 17 entries with `{ description, usage, assumptions, cite }`.

### 7. `src/tests/fixtures/runners.js`
Add test data and 17 runners. Key test data:
- `SPAT_POINTS`: array of {x, y} coordinates from mkTabular x/z columns + value from y column
- `SPAT_W`: pre-computed weight matrix from spatialPoints for econometric runners
- `SPAT_PRED_PTS`: small subset for kriging/IDW prediction
- `PANEL_DATA`: tabular data with idVar + timeVar

### 8. `src/tests/contracts.test.js`
Update count: 170 → 187.

### 9. `src/config/chartMap.test.js`
Update count: 170 → 187.

### 10. `src/components/InferenceConfig.test.jsx`
Add new spatial state variable stubs to `mockState`.

## Execution Order
1. Export `buildSpatialWeights` from `spatial.js` + update internal callers
2. `tree.js` + `chartMap.js` entries
3. `InferencePanel.jsx` (imports, state, derived vectors, computation branches, deps, configState)
4. `InferenceConfig.jsx` (config UI)
5. `methodNotes.js` (educational notes)
6. `runners.js` (contract test runners)
7. Update test counts
8. `InferenceConfig.test.jsx` mockState update
9. Run `npx vitest run` — verify all tests pass

## Risks
- **W matrix size**: W is n×n. For large datasets (n > 500), this is expensive. Accept the cost for now — real use cases have modest n.
- **predictPoints for kriging/IDW**: Needs a set of target points. Use first 5 rows of spatPoints as prediction grid. Adequate for demo.
- **Hausman test**: Takes raw coefficient/SE vectors as inputs (not column data). Use text inputs.
- **Chart types**: `variogram`, `envelope` are new — fall back to text display. The `heatmap` chart type already exists in the codebase.
- **Name collision**: `gmm_mix` already aliased in tree to avoid collision. No new naming conflicts expected.

## Verification
- `npx vitest run src/tests/contracts.test.js` → 187 tests pass
- `npx vitest run src/config/chartMap.test.js` → 187 mappings verified
- Full `npx vitest run` → 0 failures
