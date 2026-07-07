# Batch 8 — Unwired Test Modules

## Status

42 test modules (~356 exports, ~1,390 unit tests) have implementations and unit tests but are completely absent from the UI pipeline: no `tree.js` entries, no `chartMap.js` entries, no `runners.js`, no `methodNotes.js`, no `InferencePanel.jsx` imports/computation branches, and no `InferenceConfig.jsx` configMap entries.

## Sub-Batch Breakdown

### 8a — Biomedical & Life Sciences (~61 exports)

| Module | Exports | Functions |
|--------|---------|-----------|
| `bioinformatics` | 5 | `enrichmentAnalysis`, `volcanoTest`, `foldChange`, `fdrCorrection`, `gseaEnrichment` |
| `genetics` | 8 | `hardyWeinberg`, `linkageDisequilibrium`, `heritabilityEstimate`, `polygenicScore`, `gwasPower`, `populationStructure`, `relativeRisk`, `oddsRatioGenetic` |
| `phylogenetics` | 8 | `upgmaTree`, `neighborJoining`, `jcDistance`, `kimuraDistance`, `parsimonyScore`, `bootstrapTree`, `consensusTree`, `treeDistance` |
| `pk` | 17 | `oneCompartmentIV`, `oneCompartmentOral`, `twoCompartmentIV`, `aucTrapezoidal`, `aucLogLinear`, `cmax`, `tmax`, `halfLife`, `clearance`, `volumeDistribution`, `bioavailability`, `steadyState`, `accumulationRatio`, `linearityIndex`, `nonCompartmental`, `pkpdEmax`, `pkpdSigmoid` |
| `trials` | 6 | `sampleSizeSuperiority`, `sampleSizeNonInferiority`, `sampleSizeEquivalence`, `randomizationSchedule`, `stratifiedRandomization`, `blockRandomization` |
| `ecology` | 9 | `shannonDiversity`, `simpsonDiversity`, `chao1Richness`, `speciesAccumulation`, `betaDiversity`, `rarefactionCurve`, `nmdsEcology`, `indicatorSpecies`, `distanceDecay` |
| `demo` | 8 | `lifeExpectancy`, `ageSpecificRate`, `directStandardization`, `indirectStandardization`, `smr`, `populationProjection`, `leslieMatrix`, `fertilityRate` |

### 8b — Advanced Modeling & ML (~66 exports)

| Module | Exports | Functions |
|--------|---------|-----------|
| `discrete` | 10 | `conditionalLogit`, `multinomialLogit`, `nestedLogit`, `mixedLogit`, `explodedLogit`, `rankOrderedLogit`, `bivariateProbit` (discrete version), `orderedProbit`, `zeroInflatedCount`, `hurdleModel` |
| `pgm` | 12 | `bayesianNetwork`, `markovBlanket`, `dSeparation`, `structureLearning`, `parameterLearning`, `inferenceExact`, `inferenceApproximate`, `causalInference`, `gaussianGraphicalModel`, `isingModel`, `conditionalRandomField`, `hiddenMarkovModel` |
| `optimization` | 11 | `gradientDescent`, `newtonRaphson`, `bfgs`, `nelderMead`, `simulatedAnnealing`, `geneticAlgorithm`, `particleSwarm`, `constrainedOptimization`, `multiObjectiveOptimization`, `linearProgramming`, `quadraticProgramming` |
| `stochastic` | 12 | `brownianMotion`, `geometricBrownianMotion`, `ornsteinUhlenbeck`, `poissonProcessSim`, `branchingProcess`, `birthDeathProcess`, `queueSimulation`, `renewalProcess`, `wienerProcess`, `levyProcess`, `coxIngersollRoss`, `hestonModel` |
| `smc` | 7 | `particleFilter`, `bootstrapFilter`, `auxiliaryParticleFilter`, `raoBlackwellized`, `sequentialImportanceSampling`, `particleMCMC`, `annealedImportanceSampling` |
| `causalDiscovery` | 7 | `pcAlgorithm`, `fciAlgorithm`, `gesAlgorithm`, `lingam`, `additiveNoiseModel`, `kernelIndependenceTest`, `hsicTest` |
| `interpretability` | 7 | `limeExplainer`, `integratedGradients`, `permutationFeatureImportance`, `pdpInteract`, `alePlot`, `morrisMethod`, `sobolIndices` |

### 8c — Data Engineering & Evaluation (~68 exports)

| Module | Exports | Functions |
|--------|---------|-----------|
| `preprocessing` | 10 | `standardScaler`, `minMaxScaler`, `robustScaler`, `oneHotEncoder`, `labelEncoder`, `ordinalEncoder`, `targetEncoder`, `frequencyEncoder`, `polynomialFeatures`, `binarizer` |
| `fitting` | 16 | `normalFit`, `lognormalFit`, `gammaFit`, `exponentialFit`, `weibullFit`, `betaFit`, `uniformFit`, `cauchyFit`, `laplaceFit`, `logisticFit`, `paretoFit`, `rayleighFit`, `gumbelFit`, `fDistributionFit`, `tDistributionFit`, `chiSquareFit` |
| `metrics` | 8 | `rmseMetric`, `maeMetric`, `mapeMetric`, `r2Score`, `adjustedR2`, `explainedVariance`, `maxError`, `medianAbsoluteError` |
| `info` | 6 | `entropy`, `mutualInformation`, `klDivergence`, `jensenShannonDivergence`, `crossEntropy`, `conditionalEntropy` |
| `distance` | 7 | `euclideanDistance`, `manhattanDistance`, `mahalanobisDistance`, `minkowskiDistance`, `cosineDistance`, `hammingDistance`, `jaccardDistance` |
| `mds` | 5 | `classicalMDS`, `sammonMapping`, `nonmetricMDS`, `landmarkMDS`, `procrustes` |
| `ordination` | 9 | `pcoa`, `nmdsOrdination`, `cca`, `rda`, `dbRDA`, `correspondenceAnalysis`, `detrendedCA`, `multipleFactorAnalysis`, `coinertiaAnalysis` |
| `pls` | 7 | `plsRegression`, `plsDa`, `spls`, `nipalsPCA`, `plsVIP`, `plsLoadings`, `plsCrossValidate` |

### 8d — Specialized Domain Methods (~88 exports)

| Module | Exports | Functions |
|--------|---------|-----------|
| `circular` | 7 | `circularMean`, `circularVariance`, `rayleighTest`, `watsonTest`, `kuiperTest`, `circularCorrelation`, `vonMisesFit` |
| `compositional` | 5 | `clrTransform`, `ilrTransform`, `alrTransform`, `compositionalMean`, `aitchisonDistance` |
| `conjoint` | 5 | `conjointUtilities`, `partWorth`, `importanceScores`, `marketSimulator`, `conjointDesign` |
| `game` | 7 | `nashEquilibrium`, `dominantStrategy`, `mixedStrategyNash`, `shapleyValue`, `coreAllocation`, `bargainingSolution`, `auctionEquilibrium` |
| `inequality` | 8 | `giniCoefficient`, `theilIndex`, `atkinsonIndex`, `hooverIndex`, `palmaRatio`, `decileRatio`, `lorenzCurve`, `concentrationIndex` |
| `pointProcess` | 9 | `homogeneousPoisson`, `inhomogeneousPoisson`, `hawkesProcess`, `coxProcess`, `lgcpSimulation`, `kFunction`, `lFunction`, `pairCorrelation`, `envelopeTest` |
| `reliability` | 7 | `weibullReliability`, `exponentialReliability`, `mttf`, `mttr`, `availabilityEstimate`, `reliabilityGrowth`, `acceleratedLifeTest` |
| `spc` | 17 | `xbarChart`, `rChart`, `sChart`, `pChart`, `npChart`, `cChart`, `uChart`, `ewmaChart`, `cusumChart`, `processCapability`, `cpIndex`, `cpkIndex`, `ppIndex`, `ppkIndex`, `multivariateHotelling`, `mewmaChart`, `mcusumChart` |
| `tensor` | 8 | `cpDecomposition`, `tuckerDecomposition`, `tensorTrain`, `tensorRegression`, `parafac`, `nonnegativeTensorFactorization`, `tensorCompletion`, `tensorRobustPCA` |

### 8e — Social Science & Quality (~71 exports)

| Module | Exports | Functions |
|--------|---------|-----------|
| `privacy` | 7 | `laplaceMechanism`, `gaussianMechanism`, `exponentialMechanism`, `epsilonBudget`, `sensitivityCalc`, `reportNoisyMax`, `sparseVectorTechnique` |
| `pro` | 7 | `aucPR`, `logLoss`, `matthewsCorr`, `cohensKappaPro`, `brierScorePro`, `expectedCalibrationError`, `cumulativeGains` |
| `recommendation` | 3 | `collaborativeFiltering`, `matrixFactorization`, `contentBasedFiltering` |
| `raMonitor` | 7 | `cusumRA`, `ewmaRA`, `funnelPlot`, `vlfd`, `raSPRT`, `riskAdjustedCUSUM`, `raCaterpillar` |
| `sced` | 7 | `visualAnalysis`, `percentageNonOverlap`, `tauOverlap`, `napEffect`, `irdEffect`, `logResponseRatio`, `betweenCaseSMD` |
| `symbolic` | 7 | `intervalMean`, `intervalVariance`, `histogramPCA`, `symbolicRegression`, `symbolicMDS`, `symbolicClustering`, `symbolicDiscriminant` |
| `linkage` | 7 | `deterministicLinkage`, `probabilisticLinkage`, `fellegiSunter`, `blockingKeys`, `jaroWinkler`, `soundex`, `metaphone` |
| `abm` | 8 | `seirModel`, `schellingSegregation`, `voterModel`, `bassDiffusion`, `thresholdModel`, `flockingModel`, `predatorPrey`, `networkDiffusion` |
| `bandit` | 9 | `epsilonGreedy`, `ucb1`, `thompsonSampling`, `softmaxBandit`, `contextualBandit`, `linUCB`, `bayesianBandit`, `exp3`, `adversarialBandit` |

## Implementation Pattern (established from Batches 1–7)

For each module, the same sequence of changes:

1. **`tree.js`** — Add a category entry with `cat`, `color`, and `tests[]` (each test: `id`, `label`, `tag`)
2. **`chartMap.js`** — Add `CHART_FOR_TEST[id]` → chart mode string (most map to `'Bar+CI'` as fallback)
3. **`methodNotes.js`** — Add `APPROXIMATE_TESTS` entries for iterative/stochastic methods; add `IMPL_NOTES` entries
4. **`runners.js`** — Add runner functions using hardcoded fixtures (`XS`, `YS`, `ROWS`, `DOCS`, etc.) that call each export
5. **`InferencePanel.jsx`**:
   - Add imports (1 `import` line per module)
   - Add `useState` declarations for config parameters
   - Add `useMemo` data vectors derived from `data` + column selectors
   - Add computation branches in the `useMemo` result block
   - Add deps to the result `useMemo` dependency array
   - Add state var getter/setter pairs to `configState` object
   - Add state vars to `onContextChange` useEffect
6. **`InferenceConfig.jsx`** — Add destructured state vars + `configMap` entries with JSX controls
7. **`contracts.test.js`** — Update the `TREE_IDS.length` assertion (line 23) to match new count
8. **`chartMap.test.js`** — Update expected count

## Key Design Decisions

### Data Vector Strategy

Many unwired modules take raw arrays (not column-aware row objects). Strategy:
- **Existing vectors** (`allTgt`, `signalVec`, `xy.xs`/`xy.ys`, `data` with column selectors) cover ~60% of functions
- **New vectors needed**: count/frequency arrays (ecology), angle arrays (circular), matrix inputs (discrete, pgm), time arrays (pk), distance matrices (phylogenetics)
- Prefer `TextArea` inputs for array data (comma-separated or newline-delimited), parsed via `parseNumList`
- Reuse existing `data.map(r => r[col])` pattern for column-aware functions

### State Variable Strategy

Group related config vars by module to minimize state count:
- `bio*` prefix for bioinformatics (e.g. `bioGeneset`, `bioBackground`, `bioPathwaySize`)
- `circ*` prefix for circular
- `comp*` prefix for compositional
- `discrete*` prefix for discrete choice
- `eco*` prefix for ecology
- `fit*` prefix for distribution fitting
- etc.

Many functions need only a single numeric vector input — these share `signalVec`/`allTgt` patterns.

### Complexity Risk: dense modules

- **`spc.js`** (17 exports) and **`pk.js`** (17 exports) and **`fitting.js`** (16 exports) will each need substantial UI real estate
- **`pgm.js`** (12 exports) needs graph specification UI (edge lists, adjacency matrices)
- **`abm.js`** (8 exports) needs simulation parameter config
- **`discrete.js`** (10 exports) needs choice-data format specification

### Chart Map Strategy

Most unwired tests lack an obvious chart mode. Default mapping:
- Summary statistics → `'Bar+CI'`
- Distribution-related → `'Histogram'`
- Matrix/tabular output → `'Table'`
- Spatial/graph → `'Scatter'`
- Time series → `'Line'`
- No visual output → `'None'`

### Approximate Tests

Mark as approximate (stochastic/iterative/non-deterministic):
- `pgm` structure learning (greedy search)
- `optimization` methods (local optima)
- `stochastic` simulations (random)
- `smc` filters (Monte Carlo)
- `abm` simulations (agent-based)
- `bandit` algorithms (stochastic rewards)
- Any MCMC or EM-based methods
- Any bootstrap-based methods
- Any SGD/iterative optimization

## Execution Order

1. **8a — Biomedical & Life Sciences** (7 modules, ~61 exports)
2. **8b — Advanced Modeling & ML** (7 modules, ~66 exports)
3. **8c — Data Engineering & Evaluation** (8 modules, ~68 exports)
4. **8d — Specialized Domain Methods** (9 modules, ~88 exports)
5. **8e — Social Science & Quality** (9 modules, ~71 exports)

Within each sub-batch: `tree.js` → `chartMap.js` → `methodNotes.js` → `runners.js` → `InferenceConfig.jsx` → `InferencePanel.jsx` → update test counts → verify with `npx vitest run`.

Total projected: ~356 new tree entries, 356 new runners, ~356 new computation branches, ~700 new contract tests (`tree_ids * 2`), bringing total vitest tests from 5432 to ~6130+.

## Verification

- `npx vitest run` after each sub-batch
- `contracts.test.js` — verifies every tree ID has a runner, chart, and returns valid inference result
- `chartMap.test.js` — verifies every tree ID has a chart mapping
- `InferenceConfig.test.jsx` — verifies config UI renders (update mockState)
- `InferencePanel.test.jsx` — verifies panel renders
