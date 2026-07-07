# Batch 4 — Advanced Econometrics & Experimental Design Plan

## Overview
Wire 39 tests across 3 modules into the UI, following the established 4-way pattern.

## New Categories (2) + Color Assignments

| Category | Color var | Tree tests |
|----------|-----------|------------|
| ADVANCED ECONOMETRICS | C.rose (`#ec4899`) | 15 |
| EXPERIMENTAL DESIGN | C.violet (`#a855f7`) | 24 |

## Module Breakdown

### econometric.js (15 tests)
tobitModel, heckmanSelection, bivariateProbit, psmCaliper, localLinearIV, panelFixedEffects, panelRandomEffects, hausmanTest, arellanoBond, sur, threeSLS, gmm, cointegration, vecm, structuralVAR

### experimental.js (17 tests)
randomizedBlockANOVA, latinSquareANOVA, splitPlotANOVA, crossoverANOVA, factorialANOVA, nestedANOVA, repeatedMeasuresGLM, equivalenceANOVA, centralCompositeDesign, optimalDesign, plackettBurman, taguchiLArray, doePower, definitiveScreening, latinHypercube, gpEmulator, expectedImprovement

### abTesting.js (7 tests)
sampleRatioMismatch, sequentialTest, unequalAllocationT, minimumDetectableEffect, requiredSampleSize, bayesianABTest, multiArmBandit

## Tree IDs & Labels

### ADVANCED ECONOMETRICS (15)
| id | label | func |
|----|-------|------|
| tobit | Tobit Model | tobitModel |
| heckman | Heckman Selection | heckmanSelection |
| biprobit | Bivariate Probit | bivariateProbit |
| psm_caliper | PSM with Caliper | psmCaliper |
| local_iv | Local IV Estimation | localLinearIV |
| panel_fe | Panel Fixed Effects | panelFixedEffects |
| panel_re | Panel Random Effects | panelRandomEffects |
| panel_hausman | Panel Hausman Test | hausmanTest |
| arellano_bond | Arellano-Bond GMM | arellanoBond |
| sur | Seemingly Unrelated Reg | sur |
| three_sls | 3SLS Estimation | threeSLS |
| gmm_iv | GMM Instrumental Var | gmm |
| coint | Cointegration Test | cointegration |
| vecm | VECM | vecm |
| svar | Structural VAR | structuralVAR |

### EXPERIMENTAL DESIGN (24)
| id | label | func |
|----|-------|------|
| rand_block | Randomized Block ANOVA | randomizedBlockANOVA |
| latin_sq | Latin Square ANOVA | latinSquareANOVA |
| split_plot | Split-Plot ANOVA | splitPlotANOVA |
| crossover | Crossover ANOVA | crossoverANOVA |
| factorial | Factorial ANOVA | factorialANOVA |
| nested_anova | Nested ANOVA | nestedANOVA |
| rm_glm | RM GLM | repeatedMeasuresGLM |
| equiv_anova | Equivalence ANOVA | equivalenceANOVA |
| ccd | Central Composite Design | centralCompositeDesign |
| opt_design | Optimal Design | optimalDesign |
| plackett | Plackett-Burman | plackettBurman |
| taguchi | Taguchi L-Array | taguchiLArray |
| doe_power | DOE Power Analysis | doePower |
| def_screen | Definitive Screening | definitiveScreening |
| latin_hc | Latin Hypercube | latinHypercube |
| gp_emulate | GP Emulator | gpEmulator |
| exp_improve | Expected Improvement | expectedImprovement |
| samp_ratio | Sample Ratio Mismatch | sampleRatioMismatch |
| seq_test | Sequential AB Test | sequentialTest |
| unequal_t | Unequal Alloc T-Test | unequalAllocationT |
| mde | Min Detectable Effect | minimumDetectableEffect |
| sample_n | Sample Size (AB) | requiredSampleSize |
| bayes_ab | Bayesian AB Test | bayesianABTest |
| multi_arm | Multi-Arm Bandit | multiArmBandit |

## Function Signature Notes

### econometric.js
All take `(data, yVar, xVars, options)` pattern:
- `tobitModel(data, yVar, xVars, { lowerBound, upperBound, maxIter })`
- `heckmanSelection(data, yVar, xVars, selectVar, zVars)` — extra column args
- `bivariateProbit(data, y1Var, y2Var, xVars)` — two Y vars
- `psmCaliper(data, treatVar, outcomeVar, covariates, { caliper, ratio })` — treat/outcome cols
- `localLinearIV(data, xVar, yVar, zVar, { bandwidth })`
- `panelFixedEffects(data, yVar, xVars, { idVar, timeVar })`
- `panelRandomEffects(data, yVar, xVars, { idVar, timeVar })`
- `hausmanTest(betaFE, seFE, betaRE, seRE)` — scalar vectors (text inputs)
- `arellanoBond(data, yVar, xVars = [], { idVar, timeVar, maxLags })`
- `sur(data, yVars, xVars, { maxIter })` — yVars is array
- `threeSLS(data, yVars, xVars, zVars, { maxIter })`
- `gmm(data, yVar, xVars, zVars)` — zVars instruments
- `cointegration(data, yVar, xVars)`
- `vecm(data, yVars, { lags, rank })`
- `structuralVAR(data, yVars, { lags, identification })`

### experimental.js
Mostly tabular data + column specifiers:
- `randomizedBlockANOVA(data, { treatment, block, response })`
- `latinSquareANOVA(matrix)` — takes 2D array directly
- `splitPlotANOVA(data, { between, within, subject, response })`
- `crossoverANOVA(data, { subject, period, treatment, response, sequence })`
- `factorialANOVA(data, { factors, response })` — factors is array
- `nestedANOVA(data, { primary, nested, response })`
- `repeatedMeasuresGLM(data, { within, subject, response })`
- `equivalenceANOVA(groups, dL, dU, alpha)` — takes group arrays
- `centralCompositeDesign(factors, { alpha, centerPoints })`
- `optimalDesign(factors, nRuns, { model, seed })`
- `plackettBurman(factors)` — factors is number
- `taguchiLArray(factors, levels)` — factors/levels are numbers
- `doePower(nFactors, nRuns, effectSize, alpha)` — scalar inputs
- `definitiveScreening(factors)` — factors is number
- `latinHypercube(n, d, { seed, range })` — n,d are numbers
- `gpEmulator(X, y, { lengthScale, noiseVar })` — X is matrix, y is vector
- `expectedImprovement(gpMean, gpStd, bestObserved)` — scalar vectors

### abTesting.js
Mostly scalar/array inputs:
- `sampleRatioMismatch(control, treatment, expectedRatio)` — control/treatment are numeric arrays
- `sequentialTest(control, treatment, { alpha, spending })`
- `unequalAllocationT(control, treatment, ratio)`
- `minimumDetectableEffect(n, alpha, beta, baseline)` — scalar
- `requiredSampleSize(baseline, mde, alpha, beta)` — scalar
- `bayesianABTest(dataA, dataB, { seed, nSim })` — dataA/B are arrays
- `multiArmBandit(arms, { seed, iterations })` — arms is array of arrays

## Config State Variables

### Econometric
- `econYVar`, `econXVars`, `econY1Var`, `econY2Var`, `econYVars` (CheckList for multi-Y)
- `econZVars`, `econSelectVar`, `econTreatVar`, `econOutcomeVar`, `econIdVar`, `econTimeVar`
- `econLowerBound`, `econUpperBound`, `econMaxIter`, `econBw`, `econCaliper`, `econRatio`
- `econMaxLags`, `econLags`, `econRank`, `econIdentification`
- `econHausBetaFe`, `econHausSeFe`, `econHausBetaRe`, `econHausSeRe`

### Experimental
- `expBlockVar`, `expTreatVar`, `expRespVar`, `expSubjectVar`, `expBetweenVar`, `expWithinVar`
- `expPeriodVar`, `expSequenceVar`, `expPrimaryVar`, `expNestedVar`
- `expNFactors`, `expNRuns`, `expEffectSize`, `expAlpha`, `expCenterPts`
- `expNLevels`, `expModel`, `expSeed`, `expRange`, `expD`, `expN`
- `expEquivDL`, `expEquivDU`, `expLengthScale`, `expNoiseVar`
- `expBestObserved`

### AB Testing
Combine with experimental — reuse `expSeed`, etc. Plus AB-specific:
- `abExpectedRatio`, `abAlpha`, `abBeta`, `abBaseline`, `abMde`, `abNIter`
- `abNArms`, `abSpending`

## Implementation Notes

- **hausmanTest name collision**: Already have `spatialHausman` imported. Rename import to `panelHausman` to avoid collision.
- **gmm name collision**: Tree ID `gmm_mix` already exists (Gaussian Mixture Model). Use tree ID `gmm_iv` for econometric GMM.
- **psmCaliper vs psm**: Tree ID `psm` already exists (Propensity Score Match). Use `psm_caliper`.
- **Config state reuse**: Econometric panel models reuse `spatIdVar`/`spatTimeVar` from spatial batch. But better to add dedicated `econIdVar`/`econTimeVar` to avoid confusion.
- **Comma-separated text inputs**: hausmanTest needs 4 text inputs for beta/SE vectors.
- **Multi-column selectors**: sur, threeSLS, vecm, svar take array of Y variables — use CheckList.
- **Latin square takes matrix**: `latinSquareANOVA(matrix)` — need to build from data.

## Execution Order
1. tree.js + chartMap.js
2. InferencePanel.jsx (imports, state, computation branches, deps, configState)
3. InferenceConfig.jsx
4. methodNotes.js
5. runners.js
6. Update test counts
7. InferenceConfig.test.jsx
8. Run tests

## Verification
- `npx vitest run` → 0 failures
- contracts.test.js: 187 → 226
- chartMap.test.js: 187 → 226
