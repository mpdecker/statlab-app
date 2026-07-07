# Batch 2 — Specialized Biostat Implementation Plan

## Overview
Wire 42 tests across 6 modules into the UI, following the established 4-way pattern from Batch 1.

## New Categories (6) + Color Assignments

| Category | Color var | Tree tests |
|----------|-----------|------------|
| CLINICAL DIAGNOSTICS | C.rose (`#ec4899`) | 15 |
| DOSE-RESPONSE | C.violet (`#a855f7`) | 5 |
| EXTREME VALUE | C.red (`#f43f5e`) | 6 |
| MIXTURE MODELS | C.indigo (`#6366f1`) | 6 |
| GAMs | C.lime (`#84cc16`) | 5 |
| FUNCTIONAL DATA | C.teal (`#14b8a6`) | 5 |

## File-by-File Changes

### 1. `src/config/tree.js`
Add 6 new category blocks after FINANCE, before DIAGNOSTICS & TOOLS. Each follows:
```js
{ cat: "CATEGORY NAME", color: C.xxx, tests: [ ... ] }
```

**CLINICAL DIAGNOSTICS (15):** bland_altman, diagnostic, lr, nri, weighted_kappa, fleiss_kappa, kripp_alpha, cliffs_delta, rank_biserial, hosmer_lemeshow, net_benefit, brier, haybittle, fisher_comb, paf

**DOSE-RESPONSE (5):** fourpl, ec50, volcano, log2fc, modt

**EXTREME VALUE (6):** gev, gpd, return_level, hill, pot, threshold_sel

**MIXTURE MODELS (6):** gmm_mix, lpa, mix_reg, switch_reg, moe, npmixture

**GAMs (5):** gam_backfitting, gam_spline, gam_interact, p_spline, gam_anova

**FUNCTIONAL DATA (5):** fpca, fda_mean, sofr, fda_cluster, f_reg

### 2. `src/config/chartMap.js`
Add 42 entries mapping tree ID → chart type string per the plan table.

### 3. `src/components/InferencePanel.jsx`

**Imports** — add one import block per module:
- `clinical.js`: blandAltman, diagnosticAccuracy, likelihoodRatios, netReclassification, weightedKappa, fleissKappa, krippendorffAlpha, cliffsDelta, rankBiserial, hosmerLemeshow, netBenefit, brierScore, haybittlePeto, fisherCombination, populationAttributableFraction
- `doseResponse.js`: fourPL, ec50, volcanoPlot, log2FoldChange, moderatedTStatistic
- `extreme.js`: gevMLE, gpdMLE, returnLevel, hillEstimator, peaksOverThreshold, thresholdSelection
- `mixture.js`: gaussianMixtureModel, latentProfileAnalysis, mixtureOfRegressions, switchingRegression, mixtureOfExperts, nonparametricMixture
- `gam.js`: gamBackfitting, gamSpline, gamInteraction, pSpline, gamAnova
- `fda.js`: fpca, functionalMean, scalarOnFunction, functionalClustering, functionalRegression

**Config state** — add per-category states:
- Clinical: `clinValA`, `clinValB` (column selectors for Bland-Altman), `clinTp`/`clinFp`/`clinTn`/`clinFn` (2×2 table inputs), `clinPrev`/`clinOr` (PAF), `clinSens`/`clinSpec` (Youden/utility), `clinRiskThresholds`, `clinNGroups`, `clinStages` (Haybittle), `clinPvals` (Fisher comb)
- Dose-response: `drDoseVar`/`drRespVar` (columns), `drFcThresh`/`drPThresh` (volcano), `drTrtVar`/`drCtrlVar` (log2FC), `drGroupVar` (modT)
- Extreme: `extValueVar` (column), `extBlockSize`, `extReturnPeriod`, `extThreshold`
- Mixture: `mixVars` (CheckList), `mixNComponents`, `mixThresh` (switching regression)
- GAM: `gamYVar`/`gamPredictors`/`gamSmoothVars`, `gamDf`, `gamFamily`, `gamInteractVar1`/`gamInteractVar2`
- FDA: `fdaVars`/`fdaTimeVar`/`fdaIdVar`, `fdaNBasis`, `fdaNClusters`

**Derived data vectors** — add useMemo blocks:
- `clinMethodA`, `clinMethodB` — two numeric columns for Bland-Altman
- `clinRater1`, `clinRater2` — two categorical columns for kappa
- `drDose`, `drResponse` — dose-response column vectors
- `drTrtVals`, `drCtrlVals` — treatment/control arrays for log2FC
- `drGroups` — group-split arrays for modT
- `extValues` — single numeric column for extreme value
- `mixMatrix` — scale matrix from mixVars
- `gamData` — X matrix + Y vector
- `fdaMatrix`, `fdaTimes` — functional data arrays

**Computation branches** — add `if (a===...)` blocks in useMemo before the catch. Key patterns:

Clinical (mostly scalar/table inputs):
```
if (a==='bland_altman') return blandAltman(clinMethodA, clinMethodB);
if (a==='diagnostic') return diagnosticAccuracy(+clinTp, +clinFp, +clinTn, +clinFn);
if (a==='lr') return likelihoodRatios(+clinTp, +clinFp, +clinTn, +clinFn);
// ... similar for others
```

Extreme (column → vector):
```
if (a==='gev') return gevMLE(extValues);
if (a==='gpd') return gpdMLE(extValues);
if (a==='return_level') { const g = gevMLE(extValues); return g ? returnLevel(g, +extReturnPeriod) : null; }
```

Mixture (column vectors):
```
if (a==='gmm_mix') return gaussianMixtureModel(mixMatrix, +mixNComponents);
if (a==='lpa') return latentProfileAnalysis(data, mixVars, +mixNComponents);
```

GAM (regression-style):
```
if (a==='gam_backfitting') return gamBackfitting(gamY, gamX, gamSmoothIdx);
if (a==='gam_spline') return gamSpline(gamY, gamX);
```

FDA:
```
if (a==='fpca') return fpca(fdaMatrix, fdaTimes, { nBasis: +fdaNBasis });
```

**Dependency array** — add all new state + derived vector deps.

**Config state bundle** — add all new state vars + setters.

### 4. `src/components/InferenceConfig.jsx`
Add `configMap` entries for all 42 tests. Patterns:

Clinical:
- `bland_altman`: 2× Sel for method A/B columns
- `diagnostic`: 4× Inp for TP/FP/TN/FN
- `lr`: same 2×2 table inputs
- `weighted_kappa`: 2× Sel for rater columns + weight dropdown
- `fleiss_kappa`: CheckList for raters
- `hosmer_lemeshow`: outcome column + predicted column + nGroups Inp
- `net_benefit`/`brier`: outcome column + predicted column

Dose-response:
- `fourpl`: dose column + response column
- `ec50`: dose/response columns (runs fourPL internally)
- `volcano`: log2FC column + p-value input + thresholds
- `log2fc`: treatment column + control column
- `modt`: values column + group column

Extreme:
- `gev`/`gpd`/`hill`/`pot`/`threshold_sel`: single value column
- `return_level`: value column + return period Inp

Mixture:
- `gmm_mix`/`lpa`/`mix_reg`/`moe`/`npmixture`: CheckList for variables + nComponents Inp
- `switch_reg`: CheckList for variables + threshold Inp

GAM:
- `gam_backfitting`/`gam_spline`: Y column + predictors CheckList + smooth vars config
- `gam_interact`: Y column + 2 interaction var columns + df Inp
- `p_spline`: X column + Y column + df/lambda config
- `gam_anova`: model output display (no input needed beyond prior run)

FDA:
- `fpca`: CheckList for variables + time column + nBasis Inp
- `fda_mean`: CheckList for variables
- `sofr`: Y column + variables CheckList + time column
- `fda_cluster`/`f_reg`: variables + time + id columns

### 5. `src/config/methodNotes.js`
Add 42 entries with `{ description, usage, assumptions, cite }` for each test. Use concise citations (short form ok — these are educational blurbs, not publications).

### 6. `src/tests/fixtures/runners.js`
Add test data and 42 runners. Key test data:
- Clinical 2×2: `tp=30,fp=10,tn=50,fn=10`
- Bland-Altman: two vectors of 20 measurements each
- Dose-response: dose=[0,1,2,3,4,5], response=[0,0.1,0.3,0.5,0.7,0.9]
- Extreme: vector from mkTabular x-values
- Mixture: mkScaleMatrix values
- GAM: ROWS data with x,y spline
- FDA: simple matrix from ROWS

### 7. `src/tests/contracts.test.js`
Update count: 128 → 170 (128 + 42).

### 8. `src/config/chartMap.test.js`
Update count: 128 → 170.

## Execution Order
1. tree.js + chartMap.js entries (makes tests visible)
2. InferencePanel.jsx (imports, state, computation branches, deps, configState)
3. InferenceConfig.jsx (config UI)
4. methodNotes.js (educational notes)
5. runners.js (contract test runners)
6. Update test counts in contracts.test.js + chartMap.test.js
7. Run `npm test` to verify

## Risks
- **No name collisions expected** — all 6 modules export unique function names. `gmm` is aliased as tree ID `gmm_mix` to avoid future collision with econometric GMM.
- **Data format mismatches** — some clinical functions expect 2×2 scalar inputs (tp,fp,tn,fn) rather than column data; config UI must use Inp (number inputs), not Sel (column selectors).
- **Heavy computation** — mixture EM (GMM, LPA) and GAM backfitting can be slow on large datasets. No worker needed at this stage — they're fast enough on typical CSV sizes.
- **Chart types** — `blandaltman`, `roc`, `calibration`, `decisioncurve`, `dosecurve`, `volcano`, `returnlevel`, `threshold` are in chartMap but may fall back to text display. Chart rendering can be added later.

## Verification
- After implementation: `npx vitest run` → all tests pass
- Contract tests: `npx vitest run src/tests/contracts.test.js` → 170 tests pass
- Chart map: `npx vitest run src/config/chartMap.test.js` → 170 mappings verified
