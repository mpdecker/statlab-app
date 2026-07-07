# Batch 8 — Remaining Unwired Modules (8b–8e)

## Status

After completing sub-batch 8a (61 exports, 7 modules), **~293 exports** remain across **26 unwired modules**. Each has `.js` implementation + `.test.js` unit tests but zero UI wiring.

## Export Inventory (ground-truth from source code, not plan projections)

### 8b — Advanced Modeling & ML (~66 exports)

| Module | Count | Actual Exports (verified) |
|--------|-------|---------------------------|
| `discrete.js` | 10 | `conditionalLogit`, `iiaTest`, `mixedLogit`, `wtpSpace`, `nestedLogit`, `latentClassLogit`, `marginalEffects`, `elasticities`, `choiceProbability`, `valueOfTime` |
| `pgm.js` | 12 | `markovBlanket`, `beliefPropagation`, `factorGraph`, `bicScore`, `dseparation`, `variableElimination`, `treeWidth`, `junctionTree`, `hillClimbing`, `scoringBDeu`, `cpdag`, `dSeparationQuery` |
| `optimization.js` | 11 | `simulatedAnnealing`, `geneticAlgorithm`, `particleSwarm`, `differentialEvolution`, `gridSearch`, `bfgs`, `nelderMead`, `conjugateGradient`, `trustRegion`, `slsqp`, `gradientDescentOptim` |
| `stochastic.js` | 12 | `markovChain`, `markovSteadyState`, `poissonProcess`, `brownianMotion`, `randomWalkTest`, `ornsteinUhlenbeck`, `jumpDiffusion`, `regimeSwitching`, `hestonModel`, `roughVolatility`, `sabrModel`, `vasicekModel` |
| `smc.js` | 7 | `bootstrapFilter`, `auxiliaryPF`, `importanceSampling`, `effectiveSampleSizeSMC`, `multinomialResampleExport`, `particleMCMC`, `annealedImportance` |
| `causalDiscovery.js` | 7 | `partialCorrTest`, `skeletonPhase`, `colliderDetection`, `dagAdjacency`, `pcAlgorithm`, `lingam`, `fciAlgorithm` |
| `interpretability.js` | 7 | `shapValues`, `limeImportance`, `partialDependence`, `permutationImportance`, `alePlot`, `featureInteraction`, `globalSurrogate` |

### 8c — Data Engineering & Evaluation (~68 exports)

| Module | Count | Actual Exports (verified) |
|--------|-------|---------------------------|
| `preprocessing.js` | 10 | `standardize`, `iqrOutliers`, `madOutliers`, `oneHotEncode`, `equalWidthBinning`, `winsorize`, `frequencyEncode`, `smote`, `adasyn`, `randomUnderSample` |
| `fitting.js` | 16 | `fitNormal`, `fitExponential`, `fitGamma`, `fitPoisson`, `fitBinomial`, `fitLogNormal`, `fitWeibull`, `fitUniform`, `distributionGoF`, `fitBeta`, `andersonDarling`, `shapiroWilk`, `cramerVonMises`, `lilliefors`, `chiSquareGOF`, `qqCorrelation` |
| `metrics.js` | 8 | `psnr`, `ssim`, `iou`, `bleuScore`, `rougeL`, `perplexity`, `matthewsCorrelation`, `precisionRecallCurve` |
| `info.js` | 6 | `shannonEntropy`, `mutualInformation`, `klDivergence`, `jensenShannonDivergence`, `aicc`, `bicWeights` |
| `distance.js` | 7 | `distanceMatrix`, `distanceCovariance`, `distanceCorrelation`, `energyTest`, `partialDistanceCorr`, `mahalanobisDistance`, `gowerDistance` |
| `mds.js` | 5 | `classicalMDS`, `sammonMapping`, `nonMetricMDS`, `sammonMappingDM`, `landmarkMDS` |
| `ordination.js` | 9 | `permanova`, `anosim`, `mantelTest`, `simperAnalysis`, `procrustes`, `ccaPrep`, `envfit`, `varpart`, `mso` |
| `pls.js` | 7 | `pls1`, `pls2`, `vipScores`, `rda`, `dbRDA`, `sPLSRegression`, `sparsePLS` |

### 8d — Specialized Domain Methods (~88 exports, projected)

| Module | Count | Key patterns (not fully verified) |
|--------|-------|-----------------------------------|
| `circular.js` | ~7 | Circular stats (circular mean, variance, Rayleigh, Watson, Kuiper, von Mises) |
| `compositional.js` | ~5 | CLR/ILR/ALR transforms, Aitchison distance |
| `conjoint.js` | ~5 | Utilities, part-worth, market simulator |
| `game.js` | ~7 | Nash equilibrium, Shapley value, bargaining |
| `inequality.js` | ~8 | Gini, Theil, Atkinson, Lorenz curve |
| `pointProcess.js` | ~9 | Poisson processes, K-function, envelope |
| `reliability.js` | ~7 | Weibull reliability, MTTF, MTTR |
| `spc.js` | ~17 | Control charts (xbar, R, s, p, c, u, EWMA, CUSUM), capability indices |
| `tensor.js` | ~8 | CP/Tucker decomposition, tensor regression |

### 8e — Social Science & Quality (~71 exports, projected)

| Module | Count | Key patterns (not fully verified) |
|--------|-------|-----------------------------------|
| `privacy.js` | ~7 | Laplace/Gaussian/Exponential mechanisms |
| `pro.js` | ~7 | AUC-PR, log loss, MCC, Brier, calibration |
| `recommendation.js` | ~3 | Collaborative filtering, matrix factorization |
| `raMonitor.js` | ~7 | CUSUM/EWMA RA, funnel plot, VLFD |
| `sced.js` | ~7 | Visual analysis, PND, Tau-U, NAP |
| `symbolic.js` | ~7 | Interval stats, histogram PCA |
| `linkage.js` | ~7 | Deterministic/probabilistic linkage, Jaro-Winkler |
| `abm.js` | ~8 | SEIR, Schelling, voter, Bass, flocking |
| `bandit.js` | ~9 | ε-greedy, UCB, Thompson, EXP3 |

**IMPORTANT**: The 8d and 8e export lists above are projections from the plan. The implementing agent **MUST read the actual source files first** to get ground-truth export names, as the 8a and 8b discoveries revealed significant mismatches.

## Implementation Pattern (established by 8a)

For each sub-batch, the same sequence of file changes applies. Total expected file impact for all remaining modules:

| File | Changes needed |
|------|---------------|
| `tree.js` | ~293 new test IDs across ~19 categories |
| `chartMap.js` | ~293 chart mode entries |
| `methodNotes.js` | ~293 METHOD_NOTES, ~293 IMPL_NOTES, ~200 APPROXIMATE_TESTS |
| `runners.js` | ~293 runner functions + 26 import lines |
| `InferencePanel.jsx` | 26 import lines, ~60 useState, ~30 useMemo data vectors, ~293 computation branches, ~80 dependency array entries, ~200 configState getter/setter pairs |
| `InferenceConfig.jsx` | ~200 destructured vars, ~293 configMap JSX entries |
| `contracts.test.js` | Update TREE_IDS count: 363 → final |
| `chartMap.test.js` | Update CHART_FOR_TEST count: 403 → final |

## Execution Order

### Sub-batch 8b (7 modules, ~66 exports)
1. Read all 7 source files for ground-truth signatures
2. `tree.js` — add 7 categories (~66 test IDs)
3. `chartMap.js` — add ~66 chart entries (default `'Bar+CI'` / `'histogram'`)
4. `methodNotes.js` — add ~66 METHOD_NOTES + ~66 IMPL_NOTES + APPROXIMATE_TESTS
5. `runners.js` — add 7 imports + ~66 runners using fixtures (XS, YS, ROWS, DOCS, etc.)
6. `InferencePanel.jsx` — 7 imports, ~15 useState, ~10 useMemo, ~66 branches, deps, configState
7. `InferenceConfig.jsx` — ~40 destructured vars, ~66 configMap entries
8. Update test counts in `contracts.test.js` and `chartMap.test.js`
9. `npx vitest run` — verify all new tests pass

### Sub-batch 8c (8 modules, ~68 exports)
Same pattern, 8 more modules.

### Sub-batch 8d (9 modules, ~88 exports)  
Same pattern. Must read source files first.

### Sub-batch 8e (9 modules, ~71 exports)
Same pattern. Must read source files first.

## Key Risks & Design Decisions

### 1. Tree ID naming conventions
Use domain-prefixed snake_case consistent with 8a: `discrete_*`, `pgm_*`, `opt_*`, `stoch_*`, `smc_*`, `causal_*`, `interp_*`, `prep_*`, `fit_*`, `met_*`, `info_*`, `dist_*`, `mds_*`, `ord_*`, `pls_*`, `circ_*`, `comp_*`, `conj_*`, `game_*`, `ineq_*`, `pproc_*`, `rel_*`, `spc_*`, `tens_*`, `priv_*`, `pro_*`, `rec_*`, `ra_*`, `sced_*`, `sym_*`, `link_*`, `abm_*`, `bandit_*`.

### 2. Complexity risk: dense modules
- **`fitting.js`** (16 exports) and **`spc.js`** (17 exports) and **`discrete.js`** (10 exports) need substantial UI real estate
- **`pgm.js`** (12 exports) needs graph specification UI (edge lists, adjacency matrices)
- **`stochastic.js`** (12 exports) and **`smc.js`** (7 exports) need simulation parameter config
- **`optimization.js`** (11 exports) needs objective function and gradient spec inputs

### 3. State var strategy
Group related config vars by module prefix to minimize name collisions:
- `discrete*` for discrete choice (groupVar, nestVar, timeVar, costVar, nDraws, seed, maxIter)
- `pgm*` for graphical models (edgesStr, nVars, evidenceStr, maxIter, iss)
- `opt*` for optimization (fnType, initStr, boundsStr, generations, mutationRate, iterations)
- `stoch*` for stochastic (dt, q, nStates, maxIter, H, F, K, T, seed)
- `smc*` for SMC (nParticles, processNoise, obsNoise, seed, nSamples, nTemps)
- `causal*` for causal discovery (alpha, maxCond, threshold, seed)
- `interp*` for interpretability (nSamples, modelType, featureIndex, nGrid, nRepeats, nIntervals)
- `prep*` for preprocessing (column, method, multiplier, threshold, k, lower, upper)
- `fit*` for fitting (distType, nBins, test, B, successes, trials)
- `met*` for metrics (scores, labels, maxVal, L, k1, k2, n, nTokens, candidate, references)
- `info*` for information theory (discrete, bins, smoothing, logLik, nParams, n)
- `dist*` for distance (permutations, seed)
- `mds*` for MDS (vars, nDimensions, seed, maxIter, dissimilarities, nLandmarks, nDim)
- `ord*` for ordination (vars, groupVar, seed, permutations, envVar)
- `pls*` for PLS (nComp, predictorsVars, responseVars, lambda, keepX, permutations)

### 4. Runner fixture patterns
- **Column-aware**: Functions taking `data, vars, groupVar` use `ROWS` and `numeric`/`categorical` columns
- **Array input**: Functions taking raw arrays use `XS`, `YS`, `ZS`, `MS`
- **Matrix input**: Functions taking matrices use `SCALE`, `X_CM`, `X_RM`, or constructed matrices
- **Multivariate**: Functions needing 2+ variables use `ROWS` with column selectors
- **Distance matrices**: Construct pairwise Euclidean distances from `ROWS` slices
- **Sequences/time series**: Use `XS.slice(0, n)` for Markov chain, stochastic process data
- **Simulation inputs**: `initialParticles` for particle filters (like `XS.slice(0, 10)`), `y` for observations

### 5. Edge cases and pitfalls
- **`distanceMatrix`** in `distance.js` is also defined in `ordination.js` — use the import from `distance.js`
- **`simperAnalysis`** in `ordination.js` conflicts with `ecology.js` — they are different functions
- **`shapiroWilk`** in `fitting.js` conflicts with the one in `distributions.js` — the fitting version is local
- **`distributionGoF`** returns a bootstrap p-value (seed-controlled, approximate)
- **`regimeSwitching`** and **`hestonModel`** need adequate sample sizes (>20-30 observations)
- **`particleMCMC`** and **`annealedImportance`** require `target`/`prior`/`likelihood` functions — these are passed as JS functions in runners using closures over data

### 6. Chart map defaults
| Output type | Chart mode |
|-------------|-----------|
| Summary statistics / coefficients | `'Bar+CI'` (`'barci'`) |
| Distributions / histograms | `'Histogram'` (`'histogram'`) |
| Embeddings / ordination points | `'Scatter'` |
| Distance matrices / heatmaps | `'Heatmap'` (`'heatmap'`) |
| Time series / trajectories | `'Line'` (`'timeseries'`) |
| Graph / network output | `'Scatter'` |
| Table output | `'Table'` |
| No visual output (algorithm diagnostic) | `'None'` |

### 7. Approximate tests
Mark as approximate for stochastic/iterative/non-deterministic methods:
- All `optimization.js` (local optima, stochastic search)
- All `stochastic.js` (random processes, HMM EM)
- All `smc.js` (Monte Carlo)
- All `causalDiscovery.js` (greedy search, permutation tests)
- `interpretability.js`: `shapValues`, `limeImportance` (permutation sampling)
- `pgm.js`: `hillClimbing` (greedy search), `beliefPropagation` (iterative)
- `preprocessing.js`: `smote`, `adasyn` (random sampling)
- `fitting.js`: `distributionGoF` (bootstrap), `fitGamma` (iterative MLE), `fitWeibull` (Newton), `fitBeta` (Newton)
- `ordination.js`: `permanova`, `anosim`, `mantelTest`, `envfit` (permutation tests)
- `mds.js`: `sammonMapping`, `nonMetricMDS`, `landmarkMDS` (iterative)
- `info.js`: `mutualInformation` (binned approximation), `bicWeights` (model selection)

### 8. Validation
After each sub-batch:
- `npx vitest run src/tests/contracts.test.js src/config/chartMap.test.js src/config/methodNotes.test.js` — verify all TREE IDs have runners, charts, notes
- `npx vitest run src/components/InferenceConfig.test.jsx` — verify config UI renders (update mockState if needed)
- `npx vitest run src/components/InferencePanel.test.jsx` — verify panel renders (may need timeout adjustment)
- `npx vitest run` — full suite, verify zero regressions

### 9. Incremental test count progression
| After sub-batch | TREE count | ChartMap count | New tests |
|----------------|-----------|---------------|-----------|
| Start (after 8a) | 363 | 403 | — |
| 8b (~66) | 429 | 469 | +132 contracts tests |
| 8c (~68) | 497 | 537 | +136 |
| 8d (~88) | 585 | 625 | +176 |
| 8e (~71) | 656 | 696 | +142 |

Note: ChartMap count > TREE count because some chart entries map to removed/unused test IDs from earlier development. Only TREE count drives the `contracts.test.js` assertion; chartMap count is validated independently.
