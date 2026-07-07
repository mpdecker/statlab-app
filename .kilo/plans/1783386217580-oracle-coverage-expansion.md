# Oracle Test Coverage Expansion Plan

## Current State

- **61 modules** have oracle entries in `reference.json` (~1,871 lines of Python generation script)
- **24 modules** have zero oracle coverage (verified on both `feat/batch9-wiring` and `origin/main` by grep)
- Total test suite: 4,909 tests pass across 91 test files (84 methods + 6 math + hardening)
- Oracle generation pipeline: `node scripts/dump-fixtures.mjs && python scripts/gen-reference.py` → writes `packages/statlab/src/methods/__fixtures__/reference.json`
- Oracle source: scipy, statsmodels, lifelines, numpy (no R dependency)
- Test convention: each test file imports `ref from './__fixtures__/reference.json'` and checks `ref.moduleName.functionName[n].expected` against computed result

---

## Uncovered Modules (24)

### Tier 1 — High-Impact, Direct Python Equivalents (8)

| # | Module | Functions to Oracle | Oracle Source | Est. Test Count |
|---|--------|-------------------|---------------|-----------------|
| 1 | **bootstrap.js** | `bootstrapCI`, `bootstrapSE`, `bootstrapT_CI`, `jackknife`, `splitConformal`, `jackknifePlus`, `conformalPvalues` | `scipy.stats.bootstrap`, manual percentile/BCa ref impl | 10 |
| 2 | **multilevel.js** | `hlmRandomIntercept`, `hlmRandomSlope`, `iccMultilevel`, `transitionModel`, `remlEstimate`, `repeatedMeasuresMANOVA` | `statsmodels MixedLM`, `statsmodels.GEE` | 8 |
| 3 | **optimization.js** | `bfgs`, `nelderMead`, `conjugateGradient`, `slsqp`, `trustRegion` | `scipy.optimize.minimize` with matching method | 8 |
| 4 | **signal.js** | `fft`, `powerSpectrum`, `autocorrelation`, `welchPSD`, `spectrogram`, `cwt` (Morlet), `coherence`, `cepstrum`, `stft` | `scipy.signal` (periodogram, welch, spectrogram, coherence, cwt) | 12 |
| 5 | **mixture.js** | `gaussianMixtureModel`, `latentProfileAnalysis`, `mixtureOfExperts`, `mixtureOfRegressions`, `switchingRegression` | `sklearn.mixture.GaussianMixture`, manual EM ref | 8 |
| 6 | **discrete.js** | `logit`, `probit`, `multinomialLogit`, `cloglog`, `nestedLogit` | `statsmodels.Logit/Probit/MNLogit` | 6 |
| 7 | **experimental.js** | `randomizedBlock`, `latinSquare`, `factorialDesign`, `taguchiDesign`, `responseSurface` | `statsmodels` ANOVA tables, numpy design matrices | 8 |
| 8 | **spatialTemporal.js** | `starModel`, `gstarModel`, `spaceTimeInteraction`, `spatiotemporalMoran`, `spaceTimeForecast` | numpy OLS + Moran's I ref impl | 6 |

### Tier 2 — Medium Difficulty, Available Python Equivalents (8)

| # | Module | Functions to Oracle | Oracle Source | Notes |
|---|--------|-------------------|---------------|-------|
| 9 | **bandit.js** | `epsilonGreedy`, `ucb`, `thompsonSampling`, `linUCB`, `softmaxBandit`, `qLearning`, `sarsa` | numpy ref impl of update equations | Stochastic — test convergence to known-optimal on deterministic MDPs rather than exact output |
| 10 | **deepLearning.js** | `autoencoder`, `variationalAutoencoder`, `gan`, `transformerBlock` | manual gradient verification | Test loss decreases, output dimensions correct; exact values depend on init |
| 11 | **fda.js** | `fpca`, `fpcaExpanded`, `functionalRegression`, `functionalClustering` | numpy FPCA via eigen of smoothed covariance | scikit-fda exists but avoid new deps |
| 12 | **nlp.js** | `word2vecSkipGram`, `gloveEmbeddings`, `dependencyParse` | gensim if available, or skip | Hardest tier-2 — may need to accept shape/output tests |
| 13 | **sensitivity.js** | `morrisMethod`, `fastSensitivity`, `sobolFirstOrder`, `sobolTotalIndex`, `andrewsPlot` | `SALib` (installable via pip) or manual variance decomposition | SALib is the standard Python sensitivity library |
| 14 | **spc.js** | control chart constants (A2/D3/D4/B3/B4), `cpk`, `ppk`, `xbarChart`, `rChart` | numpy formulas (Montgomery textbook constants) | Deterministic formulas from standard tables |
| 15 | **symbolic.js** | `intervalMean`, `intervalVariance`, `intervalCorrelation`, `intervalPCA`, `symbolicRegression` | numpy interval statistics | Deterministic formulas |
| 16 | **text.js** | `tfidf`, `bm25`, `cosineSimilarity`, `jaccardSimilarity`, `svdEmbeddings` | `sklearn.feature_extraction.text.TfidfVectorizer`, `sklearn.decomposition.TruncatedSVD` | Straightforward |

### Tier 3 — Domain-Specific or Hard to Oracle (8)

| # | Module | Functions to Oracle | Oracle Source | Notes |
|---|--------|-------------------|---------------|-------|
| 17 | **demo.js** | `demographicRates`, `lifeTable`, `populationProjection`, `cohortComponent` | numpy demographic formulas | Formula-based verification |
| 18 | **pointProcess.js** | `poissonProcess`, `hawkesIntensity`, `coxProcess`, `palmDistribution` | `scipy.stats.poisson`, numpy | Existing code checked REAL in audit |
| 19 | **privacy.js** | `laplaceMechanism`, `kAnonymityCheck`, `lDiversity`, `differentialPrivacy`, `dataMasking` | numpy | Verify ε-budget and k/l properties via mathematical invariants |
| 20 | **pro.js** | `reliableChangeIndex`, `minimalImportantDifference`, `responderAnalysis`, `eq5dIndex`, `standardizedResponseMean` | numpy formulas | Textbook formulas — verify formula correctness |
| 21 | **raMonitor.js** | `raCusum`, `vlad`, `raSprt`, `funnelPlot`, `cChartRiskAdjusted` | numpy | Verify CUSUM/VLAD/SPRT decision rules |
| 22 | **recommendation.js** | `collaborativeFilter`, `matrixFactorize`, `topNRecommend` | `sklearn.decomposition.NMF` or numpy SVD | Matrix factorization output |
| 23 | **sced.js** | `tauU`, `pnd`, `pem`, `nap`, `randomizationTest`, `baselineCorrectedTau`, `betweenCaseSMD` | numpy formulas | Published SCED formulas — deterministic |
| 24 | **trials.js** | `sampleSizeTwoArms`, `sampleSizeSuperiority`, `sampleSizeNonInferiority`, `sampleSizeEquivalence`, `interimAnalysis` | numpy + `scipy.stats.norm/t` | Formula-based verification |

---

## Implementation Strategy

### Phase 1: High-Impact Core (modules 1–8) — ~66 oracle tests
Generate reference values via Python, extend `gen-reference.py`, add `ref.moduleName.fn` blocks, write test assertions. These are the most-used modules and have the clearest Python equivalents.

### Phase 2: Medium Modules (modules 9–16) — ~48 oracle tests
Standard Python libraries available for most. NLP module (12) may need a pragmatic approach — verify embeddings satisfy known properties rather than exact values.

### Phase 3: Domain-Specific Tail (modules 17–24) — ~40 oracle tests
Mostly formula-based verification. Many of these have already been verified REAL by line-reading (BASELINE.md §294–310). For genuinely hard-to-oracle functions (bandit convergence, deep learning gradients), supplement with property-based tests: monotonicity, bounds, known special-case limits.

### Total: ~154 new oracle tests across 24 modules

---

## Pipeline Changes

### `scripts/gen-reference.py`
- Add 24 new module sections following the existing pattern:
  ```python
  ref['bootstrap'] = {
      'bootstrapCI': [
          {'data': [...] , 'ci': 0.95, 'expected': {'lo': x, 'hi': y}},
          ...
      ],
      ...
  }
  ```
- Install any new pip dependencies: `SALib` for sensitivity.js
- Use shared fixtures from `_fixtures_dump.json` for data that must match JS test inputs exactly
- For deterministic modules, compute reference values inline with numpy/scipy
- For stochastic modules, generate expected ranges or property constraints rather than exact values

### Test file changes
- Add `import ref from './__fixtures__/reference.json'` to each uncovered test file
- Pattern: `const oracle = ref.moduleName.functionName[0]; expect(computed).toBeCloseTo(oracle.expected, precision)`
- For TiPLG-2 (bandit, deepLearning): use convergence/behavior assertions rather than exact numeric matches

---

## Validation

1. `npm run reference:generate` produces valid `reference.json` without errors
2. `npm test -w statlab` passes all existing 4,909 + new ~154 tests
3. No regression on existing oracle tests (ensure Python gen isn't broken)
4. `npm run build -w statlab` succeeds (types generated for any new fixtures code)

---

## Risks

- **`SALib` availability**: sensitivity.js oracles need `pip install SALib`. If unavailable, fall back to manual variance decomposition formulas.
- **Stochastic equivalence**: bandit/deepLearning exact outputs won't match. Verify that outputs satisfy known mathematical properties (convergence direction, loss monotonic decrease, gradient sign).
- **Fixture data drift**: if `fixtures/core.js` changes, `_fixtures_dump.json` changes, and reference values must be regenerated. The pipeline already handles this (`node scripts/dump-fixtures.mjs` runs first).
- **gen-reference.py file size**: already 1,871 lines; will grow to ~3,500+. Consider splitting into `gen_reference/` submodules if it becomes unwieldy.

---

## Order of Execution

1. `bootstrap.js` (highest reuse — used by many other modules)
2. `multilevel.js`
3. `optimization.js`
4. `signal.js`
5. `mixture.js`
6. `discrete.js`
7. `experimental.js`
8. `spatialTemporal.js`
9. Tier 2 in priority order (bandit, deepLearning, fda, nlp, sensitivity, spc, symbolic, text)
10. Tier 3 in priority order (demo, pointProcess, privacy, pro, raMonitor, recommendation, sced, trials)
