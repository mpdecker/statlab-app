# Plan: Reconcile Batch 9 Changes onto Monorepo (origin/main)

## Discovery

**`origin/main` already has the npm package extraction** (PR #18 + #20) from a **pre-batch9** snapshot of the codebase. The monorepo structure exists:

```
packages/statlab/src/math/       (6 modules + tests)
packages/statlab/src/methods/    (84 modules + tests)
packages/statlab/src/index.js    (auto-generated barrel)
app/src/                          (React app, imports from 'statlab/methods/*')
```

Our `feat/batch9-wiring` branch has all batch 9 features applied to the **pre-extraction** (flat `src/tests/`/`src/math/`) layout. We need to port those changes onto the monorepo.

## What Already Exists on origin/main

| Feature | Status on origin/main |
|---------|----------------------|
| Monorepo structure | Done (`packages/statlab/` + `app/`) |
| Auto-generated barrel + exports map | Done (`scripts/gen-barrel.mjs`) |
| JSDoc types on all modules | Done (PR #20 — 8+ commits) |
| MIT license + author field | Done (`packages/statlab/package.json`) |
| App imports via `statlab/methods/*` and `statlab/math/*` | Done |
| Tree.js (navigator entries) | Pre-batch9 only |
| chartMap.js entries | Pre-batch9 only |
| InferencePanel compute branches | Pre-batch9 only (ends around old ~line 1517) |
| CHART_ICONS in App.jsx | Missing `timeseries`, `boot` |
| `seriesFromResult` in vizHelpers.js | Missing |
| `TimeSeriesChart` / `SurvivalPlot` in charts.jsx | Missing |
| Inference chart rendering in ExplorePanel | Missing |
| New chart types in charts-explore.jsx | Missing |

## What Our Branch Has (Needs Porting)

### Library Changes (packages/statlab/)

| File (old path) | File (new path) | Change |
|-----------------|-----------------|--------|
| `src/tests/sensitivity.js` | `packages/statlab/src/methods/sensitivity.js` | `forecastCombination` return: add `combined`, `actual` |

### App Changes (app/)

| File (old path) | File (new path) | Change |
|-----------------|-----------------|--------|
| `src/App.jsx` | `app/src/App.jsx` | Add `timeseries` and `boot` to CHART_ICONS; add `seriesFromResult` import; add `timeseries` case to `renderQuickChart`; add `TimeSeriesChart`/`SurvivalPlot` imports |
| `src/utils/vizHelpers.js` | `app/src/utils/vizHelpers.js` | Add `sens_forecast` handler in `seriesFromResult`; add `seriesFromResult` export; update `EXPLORE_PANEL_CHART_FOR_MODE` mappings |
| `src/config/tree.js` | `app/src/config/tree.js` | Add ghost test entries (diagnostics, robust, bayesian, missing — 34 IDs); add batch 9 categories (ABM, bandit, linkage, privacy, PRO, raMonitor, recommendation, SCED, sensitivity, bootstrap, power — 101 IDs) |
| `src/config/chartMap.js` | `app/src/config/chartMap.js` | Add 101 batch 9 chart mode entries (adjusted per chart visualization plan) |
| `src/components/InferencePanel.jsx` | `app/src/components/InferencePanel.jsx` | Add batch 9 imports (~11 import blocks, ~90 named imports); add state variables; add 100 compute branches; add configState entries; add dependency arrays |
| `src/components/InferenceConfig.jsx` | `app/src/components/InferenceConfig.jsx` | Add batch 9 config JSX entries for parameterized tests |
| `src/components/ExplorePanel.jsx` | `app/src/components/ExplorePanel.jsx` | Add inference chart rendering (Survival, Forest, Bootstrap, IRT, Caterpillar, Time series, RDD, Power curve); consume `inferenceResult`/`activeTest` from seed |
| `src/components/charts.jsx` | `app/src/components/charts.jsx` | Add `TimeSeriesChart` + `SurvivalPlot` exports |
| `src/components/charts-explore.jsx` | `app/src/components/charts-explore.jsx` | Add `ExLineChart`, `ExQQPlot`, `ExParallelCoords` exports |
| `src/tests/contracts.test.js` | `app/test/contracts.test.js` (or `app/src/test/`) | Update TREE_IDS length from 704 (or wherever it is) to current count |

## Import Syntax Translation

**Before (our branch, pre-extraction):**
```js
import { tWelch, tOne } from '../tests/means.js';
import { avg, sampleSD } from '../math/core.js';
```

**After (main monorepo style):**
```js
import { tWelch, tOne } from 'statlab/methods/means';
import { avg, sampleSD } from 'statlab/math/core';
```

This affects InferencePanel.jsx (~60 import lines), App.jsx (a few), vizHelpers.js (1), and any new files that import from the engine.

## Implementation Steps

### Step 1: Create new branch from origin/main

```bash
git fetch origin
git checkout -b feat/batch9-rebase origin/main
```

This gives us the monorepo structure as a clean starting point.

### Step 2: Port library change (sensitivity.js)

Copy the `forecastCombination` return change from our branch:
- File: `packages/statlab/src/methods/sensitivity.js`
- Find the `return { test: 'Forecast Combination', mse: ... }` line
- Add `combined, actual,` to the returned object

### Step 3: Port app chart infrastructure

**3a. `app/src/components/charts.jsx`**
- Add `TimeSeriesChart` component (from our branch)
- Add `SurvivalPlot` component (from our branch)
- Export both

**3b. `app/src/components/charts-explore.jsx`**
- Add `ExLineChart`, `ExQQPlot`, `ExParallelCoords` components
- Add necessary recharts imports (LineChart, CartesianGrid, etc.)

**3c. `app/src/utils/vizHelpers.js`**
- Add `seriesFromResult` function (with all bandit/ram/sced/sens_forecast handlers)
- Add `'seriesFromResult'` to exports
- Update `EXPLORE_PANEL_CHART_FOR_MODE` mappings (forest→Forest, boot→Bootstrap, irtplot→IRT, caterpillar→Caterpillar, survival→Survival, timeseries→Time series, rddplot→RDD, lorenz→Line)

### Step 4: Port App.jsx changes

**4a. Imports:**
- Add `seriesFromResult` to import from `./utils/vizHelpers.js`
- Add `SurvivalPlot, TimeSeriesChart` to import from `./components/charts.jsx`

**4b. CHART_ICONS:**
- Add `{ id: 'timeseries', label: '\u223F', title: 'Time Series' }` entry
- Add `{ id: 'boot', label: 'B', title: 'Bootstrap' }` entry

**4c. renderQuickChart:**
- Add `case 'timeseries':` handler using `seriesFromResult + TimeSeriesChart`
- Add `case 'survival':` handler using `SurvivalPlot`

**4d. handleTabSwitch:**
- Add `inferenceResult` and `activeTest` to explore seed object

### Step 5: Port tree.js and chartMap.js

**5a. `app/src/config/tree.js`**
- Add ghost test categories (diagnostics, robust statistics, bayesian modeling, missing data — 34 IDs)
- Add batch 9 categories (ABM 8, bandit 9, linkage 7, privacy 7, PRO 7, raMonitor 7, recommendation 3, SCED 7, sensitivity 8, bootstrap 11, power 26 — 100 IDs)
- Total TREE categories should end up at ~35+ categories with ~704 IDs

**5b. `app/src/config/chartMap.js`**
- Add 101 batch 9 chart mode entries (using adjusted modes from the chart visualization plan)

### Step 6: Port InferencePanel.jsx (highest volume)

**6a. Add import blocks** for batch 9 modules (~11 blocks, ~90 named imports):
```js
import { moranIMulti, simulationConvergence, sobolSensitivity, agentSummaryStats, scenarioComparison, thresholdModel, networkDiffusion, segregationIndex } from 'statlab/methods/abm';
import { epsilonGreedy, ucb, thompsonSampling, contextualBandit, policyGradient, softmaxBandit, qLearning, sarsa, deepQNetwork } from 'statlab/methods/bandit';
// ... etc for linkage, privacy, pro, raMonitor, recommendation, sced, sensitivity, bootstrap, power
```

Note: imports like `normalityDP`, `shapiroWilk`, `requiredN`, `requiredNCorr` already come from `statlab/math/distributions` on main. `avg`, `sampleSD`, `median` already from `statlab/math/core`. Don't duplicate.

**6b. Add state variables** for parameterized batch 9 tests:
```js
// batch 9: ABM
const [abmValueField, setAbmValueField] = useState(numeric[0] || '');
const [abmTolerance, setAbmTolerance] = useState('0.01');
// ... etc (matching our branch's state vars)
```

**6c. Add compute branches** for all 100 batch 9 test IDs (after existing branches). Follow the existing style — `if (a === '...')` statements that extract data, call the function, and return `{ ...r, test: '...' }`.

**6d. Add dependencies** for new state vars to the useMemo dependency array.

**6e. Add configState entries** for new state vars to the configState bundle.

**6f. Add context useEffect entries** if batch 9 tests expose new context dimensions.

### Step 7: Port InferenceConfig.jsx

**7a. Destructure new state vars** from the `useInference` state bundle.

**7b. Add configMap JSX entries** for batch 9 tests with user-adjustable parameters. Empty fragment (`<></>`) for parameterless tests.

### Step 8: Port ExplorePanel.jsx

**8a. Imports:** Add `SurvivalPlot, ForestPlot, BootstrapHist, IRTCurves, CaterpillarPlot, TimeSeriesChart, RDPlot, PowerCurve` from `./charts.jsx`.

**8b. State:** Add `inferenceResult` and `activeTest` from seed in useEffect.

**8c. renderChart switch:** Add cases for Survival, Forest, Bootstrap, IRT, Caterpillar, Time series, RDD, Power curve.

**8d. CHART_SECTIONS:** Add conditional "Inference" section when `inferenceResult` is available.

### Step 9: Update contracts.test.js + runners.js

**9a. `app/src/config/contracts.test.js`** (on main: expects 84 TREE IDs)

- Update `TREE_IDS.length` assertion from 84 to ~704 (full batch 9 count)
- Add new `NULL_OK` entries if any batch 9 tests can legitimately return null
- Update TREE + CHART_FOR_TEST imports (co-located, no change needed)
- Update `RUNNERS` import path (already points to `../../../packages/statlab/src/methods/fixtures/runners.js`)
- Update `expectInferenceResult` import path (same)

**9b. `packages/statlab/src/methods/fixtures/runners.js`** (~1858 lines on our branch)

Add import blocks for all batch 9 modules (~11 blocks, same modules as InferencePanel):
```js
import { moranIMulti, simulationConvergence, sobolSensitivity, agentSummaryStats, scenarioComparison, thresholdModel, networkDiffusion, segregationIndex } from '../abm.js';
import { epsilonGreedy, ucb, thompsonSampling, contextualBandit, policyGradient, softmaxBandit, qLearning, sarsa, deepQNetwork } from '../bandit.js';
// ... etc for linkage, privacy, pro, raMonitor, recommendation, sced, sensitivity, bootstrap, power
```

Add fixture definitions for all 101 batch 9 test IDs using the `RUNNERS[id]` pattern. Add mock data generators needed by the new runners (e.g., arms/rewards arrays for bandits, agent arrays for ABM, forecast arrays for sensitivity).

**9c. Mock data generators**

Add mock data constructors to `packages/statlab/src/methods/fixtures/core.js` or `phase3.js` if needed for new batch 9 test IDs (e.g., adjacency matrices for network diffusion, rating matrices for recommendation).

### Step 10: Validate

```bash
pnpm install
pnpm -r test          # run tests in both packages
```

Expected: all library tests pass, all app tests pass, contracts cover all TREE IDs.

## Key Differences from Original Plan

| Original Plan (obsolete) | Reality |
|--------------------------|---------|
| Create monorepo from scratch | Monorepo already exists on `origin/main` |
| `git mv` all files | Files already moved |
| Write barrel export | `scripts/gen-barrel.mjs` already exists |
| Add JSDoc types | All done (PR #20 — 8+ commits) |
| Add MIT license + author | Already in `packages/statlab/package.json` |
| Fix import paths (~800 changes) | Main already uses `statlab/methods/*` syntax |
| Split contract tests | `contracts.test.js` location on main TBD — check `app/` structure |

## Files Changed (New Plan)

| File | Change Description |
|------|-------------------|
| `packages/statlab/src/methods/sensitivity.js` | Add `combined`, `actual` to `forecastCombination` return |
| `app/src/App.jsx` | Add `timeseries`/`boot` icons, `timeseries`/`survival` chart cases, `seriesFromResult` import, `inferenceResult`/`activeTest` in seed |
| `app/src/utils/vizHelpers.js` | Add `seriesFromResult` + `sens_forecast` handler, update `EXPLORE_PANEL_CHART_FOR_MODE` |
| `app/src/config/tree.js` | Add ghost test categories + batch 9 categories (~134 IDs total) |
| `app/src/config/chartMap.js` | Add 101 batch 9 chart mode entries |
| `app/src/components/InferencePanel.jsx` | Add ~90 imports, state vars, 100 compute branches, deps, configState |
| `app/src/components/InferenceConfig.jsx` | Add batch 9 config JSX entries |
| `app/src/components/ExplorePanel.jsx` | Add inference chart rendering, seed consumption |
| `app/src/components/charts.jsx` | Add `TimeSeriesChart`, `SurvivalPlot` |
| `app/src/components/charts-explore.jsx` | Add `ExLineChart`, `ExQQPlot`, `ExParallelCoords` |
| `app/test/contracts.test.js` | Update TREE count, update import paths |
| `app/test/fixtures/runners.js` | Add runners for new batch 9 test IDs, update imports to `statlab/methods/*` |

## Validation

1. `pnpm -r test` — all library + app tests pass
2. `app/test/contracts.test.js` — TREE ID count matches, all execute without throw
3. `npx vitest run src/config/chartMap.test.js` in app — chart mode validation passes
4. Manual: run `pnpm dev` in app — all batch 9 test IDs appear in navigator, config renders, compute works, charts render in QuickView and Explore
