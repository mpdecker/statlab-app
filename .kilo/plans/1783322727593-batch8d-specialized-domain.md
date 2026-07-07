# Batch 8d — Specialized Domain Methods (73 exports, 9 modules)

## Status

After 8c: TREE count 497, chartMap count 537, contracts tests 997+2=999.

## Ground-Truth Export Inventory

### circular.js (7) — all take `{ degrees = false }` option
| # | Export | Signature |
|---|--------|-----------|
| 1 | `circularMean` | `(angles, { degrees = false } = {})` |
| 2 | `circularVariance` | `(angles, { degrees = false } = {})` |
| 3 | `rayleighTest` | `(angles, { degrees = false } = {})` |
| 4 | `watsonU2` | `(angles, { degrees = false, dist = 'uniform' } = {})` |
| 5 | `vonMisesMLE` | `(angles, { degrees = false } = {})` |
| 6 | `circularCorrelation` | `(alpha, beta, { degrees = false } = {})` |
| 7 | `circularLinearRegression` | `(theta, x, { degrees = false } = {})` |

### compositional.js (5)
| # | Export | Signature |
|---|--------|-----------|
| 1 | `clrTransform` | `(data, vars)` — tabular data with column names for parts |
| 2 | `ilrTransform` | `(data, vars)` |
| 3 | `alrTransform` | `(data, vars, denominatorIndex = 0)` |
| 4 | `compPCA` | `(data, vars)` |
| 5 | `compRegression` | `(data, yVar, compVars, xVars = [])` |

### conjoint.js (5)
| # | Export | Signature |
|---|--------|-----------|
| 1 | `partWorthUtilities` | `(ratings, profiles, attrs)` — ratings array, profiles array of objects, attrs array |
| 2 | `attributeImportance` | `(pwResult)` — takes result of partWorthUtilities |
| 3 | `choiceSimulation` | `(profiles, attrs, { seed, nRespondents, partWorths, scale } = {})` |
| 4 | `orthogonalDesign` | `(attrs, levels)` |
| 5 | `marketSimulator` | `(pwResult, scenarioProfiles)` |

### game.js (7)
| # | Export | Signature |
|---|--------|-----------|
| 1 | `nashEquilibrium` | `(matrix)` — 2×2 matrix |
| 2 | `shapleyValue` | `(players, coalitionValues)` — players array, coalition values object keyed by sorted-join |
| 3 | `dominatedStrategies` | `(matrix)` |
| 4 | `paretoOptimal` | `(outcomes)` — array of [a,b] pairs |
| 5 | `auctionRevenue` | `(bids, type = 'first')` |
| 6 | `evolutionarilyStableStrategy` | `(payoffMatrix)` — square n×n |
| 7 | `replicatorDynamics` | `(payoffMatrix, { steps = 50 } = {})` |

### inequality.js (8)
| # | Export | Signature |
|---|--------|-----------|
| 1 | `giniCoefficient` | `(data)` — numeric array (n >= 5) |
| 2 | `lorenzCurve` | `(data)` |
| 3 | `theilIndex` | `(data, { groupVals = null, groupSizes = null } = {})` |
| 4 | `atkinsonIndex` | `(data, { epsilon = 1 } = {})` |
| 5 | `concentrationIndex` | `(health, rank)` |
| 6 | `hooverIndex` | `(data)` — n >= 3 |
| 7 | `palmaRatio` | `(data)` — n >= 10 |
| 8 | `decomposition` | `(data, groups)` — Theil within/between |

### pointProcess.js (9)
| # | Export | Signature |
|---|--------|-----------|
| 1 | `hawkesIntensity` | `(events, { mu = 0.1, alpha = 0.2, beta = 0.5 } = {})` |
| 2 | `hawkesFit` | `(events, { kernel = 'exp' } = {})` |
| 3 | `coxProcess` | `(surface, { seed = 42, n = 100 } = {})` — 2D intensity surface |
| 4 | `interArrivalTest` | `(events)` |
| 5 | `burstinessIndex` | `(events)` |
| 6 | `thomasProcess` | `(nParents, nOffspring, areaWidth, areaHeight, { seed = 42, clusterRadius = 0.1 } = {})` |
| 7 | `maternCluster` | `(nClusters, radius, avgPointsPerCluster, areaWidth, areaHeight, seed = 42)` |
| 8 | `pairCorrelation` | `(points, { nBins = 20, maxRadius = null } = {})` — points = [{x,y},...] |
| 9 | `lFunction` | `(points, { nRadii = 15, maxRadius = null } = {})` |

### reliability.js (7)
| # | Export | Signature |
|---|--------|-----------|
| 1 | `weibullAnalysis` | `(data, { confidence = 0.95 } = {})` |
| 2 | `reliabilityGrowth` | `(cumFailures, cumTime, { confidence = 0.9 } = {})` |
| 3 | `acceleratedLife` | `(tempData, stressLevels, { activationEnergy = 0.7 } = {})` |
| 4 | `warrantyPrediction` | `(failureData, monthsInWarranty = 12, { confidence = 0.9 } = {})` |
| 5 | `weibullBayes` | `(data, { shapePrior = [1, 1], scalePrior = [1, 0.01] } = {})` |
| 6 | `repairableSystems` | `(failureTimes, endTime)` |
| 7 | `competingRisksReliability` | `(timeData, causeData)` |

### spc.js (17)
| # | Export | Signature |
|---|--------|-----------|
| 1 | `xbarChart` | `(data, subgroupSize = 5)` |
| 2 | `rChart` | `(data, subgroupSize = 5)` |
| 3 | `sChart` | `(data, subgroupSize = 5)` |
| 4 | `pChart` | `(defectives, sampleSizes)` — two arrays of same length |
| 5 | `cChart` | `(defects)` — array of counts |
| 6 | `cusumChart` | `(data, { target = null, k = 0.5, h = 5 } = {})` |
| 7 | `ewmaChart` | `(data, { lambda = 0.2, L = 3 } = {})` |
| 8 | `processCapability` | `(data, lsl = null, usl = null)` |
| 9 | `hotellingT2Chart` | `(data, vars, { subgroupSize = 5 } = {})` — tabular + column names |
| 10 | `mewmaChart` | `(data, vars, { lambda = 0.2, subgroupSize = 5 } = {})` |
| 11 | `ocCurve` | `(n, c, p)` — n, acceptance number, p is array or scalar |
| 12 | `aoqCurve` | `(n, c, p, N)` — p is array, N is lot size |
| 13 | `rectifyingInspection` | `(n, c, p, N)` — p is scalar |
| 14 | `reliabilitySampling` | `(t, r, { alpha = 0.05, beta = 0.1 } = {})` |
| 15 | `asnCurve` | `(n, c, p)` — p is array |
| 16 | `multivariateControl` | `(data, vars, { subgroupSize = 5, alpha = 0.0027 } = {})` |
| 17 | `cpkPpk` | `(data, lsl, usl)` |

### tensor.js (8)
| # | Export | Signature |
|---|--------|-----------|
| 1 | `parafac` | `(X, nFactors = 2, { maxIter = 50, seed = 42, tol = 1e-8 } = {})` — 3D tensor |
| 2 | `tuckerDecomp` | `(X, ranks = [2, 2, 2], { seed = 42, maxIter = 30 } = {})` |
| 3 | `unfold` | `(X, mode = 1)` |
| 4 | `multiwayPCA` | `(X, nComp = 2, seed = 42)` |
| 5 | `tensorRegression` | `(X, y, ranks = [2])` — X is array of 3D tensors, y is vector |
| 6 | `cpDecomposition` | `(tensor, rank = 2, { seed = 42, maxIter = 50 } = {})` |
| 7 | `tuckerRegression` | `(X, y, { seed = 42, rank = [2, 2], maxIter = 50 } = {})` — X is array of 2D matrices |
| 8 | `tensorCompletion` | `(tensor, mask, { rank = 2, maxIter = 20 } = {})` |

**Total: 73 exports** (vs projected ~88 — lower because modules like `conjoint.js` and `tensor.js` have fewer functions than projected).

---

## Tree Categories

### CIRCULAR STATISTICS (color: `#e879f9`)
| ID | Label | Tag |
|----|-------|-----|
| `circ_mean` | Circular Mean | `(angles)` — mean angle · resultant R · radians |
| `circ_var` | Circular Variance | `(angles)` — 1 − R · spread · concentration |
| `circ_rayleigh` | Rayleigh Test | `(angles)` — uniformity · z-statistic · p-value |
| `circ_watson` | Watson U² | `(angles, dist)` — goodness-of-fit · von Mises |
| `circ_vonmises` | von Mises MLE | `(angles)` — μ · κ · standard errors |
| `circ_corr` | Circular Correlation | `(alpha, beta)` — angular correlation · z-test |
| `circ_linreg` | Circular-Linear Reg | `(theta, X)` — linear predictor · R² |

### COMPOSITIONAL (color: `#f97316`)
| ID | Label | Tag |
|----|-------|-----|
| `comp_clr` | CLR Transform | `(data, parts)` — centered log-ratio · geometric mean |
| `comp_ilr` | ILR Transform | `(data, parts)` — isometric · orthonormal basis |
| `comp_alr` | ALR Transform | `(data, parts, denom)` — additive log-ratio · reference part |
| `comp_pca` | Compositional PCA | `(data, parts)` — CLR-based · eigenvalues · loadings |
| `comp_reg` | Compositional Regression | `(data, y, parts, xVars)` — ILR predictor · OLS |

### CONJOINT (color: `#a3e635`)
| ID | Label | Tag |
|----|-------|-----|
| `conj_pw` | Part-Worth Utilities | `(ratings, profiles, attrs)` — effects coding · β |
| `conj_imp` | Attribute Importance | `(pwResult)` — range-based · % importance |
| `conj_sim` | Choice Simulation | `(profiles, attrs, partWorths)` — logit shares · BTL |
| `conj_orth` | Orthogonal Design | `(attrs, levels)` — 2-level fractional factorial |
| `conj_market` | Market Simulator | `(pwResult, scenarios)` — preference shares |

### GAME THEORY (color: `#c084fc`)
| ID | Label | Tag |
|----|-------|-----|
| `game_nash` | Nash Equilibrium | `(2×2 matrix)` — mixed strategy · probabilities |
| `game_shapley` | Shapley Value | `(players, values)` — marginal contribution · fair allocation |
| `game_dominated` | Dominated Strategies | `(matrix)` — strict dominance · elimination |
| `game_pareto` | Pareto Optimal | `(outcomes)` — efficiency frontier · multi-objective |
| `game_auction` | Auction Revenue | `(bids, type)` — first-price · second-price |
| `game_ess` | Evolutionarily Stable | `(payoff matrix)` — symmetric · invasion barrier |
| `game_replicator` | Replicator Dynamics | `(payoff matrix, steps)` — replicator equation · equilibrium |

### INEQUALITY (color: `#f472b6`)
| ID | Label | Tag |
|----|-------|-----|
| `ineq_gini` | Gini Coefficient | `(data)` — Lorenz-based · 0–1 · income |
| `ineq_lorenz` | Lorenz Curve | `(data)` — cumulative share · percentile |
| `ineq_theil` | Theil Index | `(data, groups)` — GE(1) · within/between · entropy |
| `ineq_atkinson` | Atkinson Index | `(data, epsilon)` — inequality aversion · ε |
| `ineq_concentration` | Concentration Index | `(health, rank)` — health inequality · socioeconomic |
| `ineq_hoover` | Hoover Index | `(data)` — Robin Hood · mean absolute deviation |
| `ineq_palma` | Palma Ratio | `(data)` — top 10% ÷ bottom 40% |
| `ineq_decomp` | Inequality Decomposition | `(data, groups)` — Theil within · between · groups |

### POINT PROCESSES (color: `#34d399`)
| ID | Label | Tag |
|----|-------|-----|
| `pproc_hawkes` | Hawkes Intensity | `(events, mu, alpha, beta)` — self-exciting · conditional λ |
| `pproc_hawkesfit` | Hawkes Fit | `(events)` — MLE · kernel · parameters |
| `pproc_cox` | Cox Process | `(surface, seed, n)` — doubly stochastic · intensity threshold |
| `pproc_interarrival` | Inter-Arrival Test | `(events)` — CV · clustered/regular/Poisson |
| `pproc_burstiness` | Burstiness Index | `(events)` — B statistic · temporal patterns |
| `pproc_thomas` | Thomas Process | `(nParents, nOffspring, area)` — cluster · parent+offspring |
| `pproc_matern` | Matern Cluster | `(nClusters, radius, avgPts)` — uniform disk · cluster |
| `pproc_pcf` | Pair Correlation | `(points, nBins)` — radial · g(r) · non-parametric |
| `pproc_lfunc` | L-Function | `(points, nRadii)` — variance-stabilized K · clustering |

### RELIABILITY (color: `#fbbf24`)
| ID | Label | Tag |
|----|-------|-----|
| `reli_weibull` | Weibull Analysis | `(data)` — β · η · MTBF · rank regression |
| `reli_growth` | Reliability Growth | `(cumFail, cumTime)` — Duane · α · growth rate |
| `reli_alt` | Accelerated Life | `(temps, stress)` — Arrhenius · Ea · use life |
| `reli_warranty` | Warranty Prediction | `(failures, months)` — KM survival · claim rate |
| `reli_bayes` | Weibull Bayes | `(data)` — Gamma priors · posterior MTBF |
| `reli_repairable` | Repairable Systems | `(failTimes, endTime)` — NHPP power law · β λ |
| `reli_competing` | Competing Risks | `(times, causes)` — CIF · Nelson-Aalen |

### SPC (color: `#06b6d4`)
| ID | Label | Tag |
|----|-------|-----|
| `spc_xbar` | X-bar Chart | `(data, subgroupSize)` — means · A2 · UCL/LCL |
| `spc_r` | R Chart | `(data, subgroupSize)` — ranges · D3/D4 |
| `spc_s` | S Chart | `(data, subgroupSize)` — standard deviations · B3/B4 |
| `spc_p` | p Chart | `(defectives, sizes)` — proportion nonconforming |
| `spc_c` | c Chart | `(defects)` — count of nonconformities |
| `spc_cusum` | CUSUM Chart | `(data, k, h)` — cumulative sum · target |
| `spc_ewma` | EWMA Chart | `(data, lambda, L)` — exponentially weighted |
| `spc_capability` | Process Capability | `(data, LSL, USL)` — Cp · Cpk · σ |
| `spc_t2` | Hotelling T² Chart | `(data, vars)` — multivariate · S⁻¹ · UCL |
| `spc_mewma` | MEWMA Chart | `(data, vars, lambda)` — multivariate EWMA |
| `spc_oc` | OC Curve | `(n, c, p)` — operating characteristic · acceptance |
| `spc_aoq` | AOQ Curve | `(n, c, p, N)` — average outgoing quality |
| `spc_rectifying` | Rectifying Inspection | `(n, c, p, N)` — ATI · AOQL |
| `spc_relsamp` | Reliability Sampling | `(t, r, alpha, beta)` — test plan · units |
| `spc_asn` | ASN Curve | `(n, c, p)` — average sample number |
| `spc_multivariate` | Multivariate Control | `(data, vars)` — T² · alpha · signals |
| `spc_cpk` | Cpk/Ppk | `(data, LSL, USL)` — capability indices · PPM |

### TENSOR (color: `#22d3ee`)
| ID | Label | Tag |
|----|-------|-----|
| `tens_parafac` | PARAFAC | `(tensor, rank)` — ALS · factor matrices · reconstruction |
| `tens_tucker` | Tucker Decomp | `(tensor, ranks)` — SVD per mode · core tensor |
| `tens_unfold` | Tensor Unfolding | `(tensor, mode)` — mode-n matricization |
| `tens_mpca` | Multiway PCA | `(tensor, nComp)` — unfolded PCA · scores · loadings |
| `tens_reg` | Tensor Regression | `(X, y)` — CP reg · flattened · R² |
| `tens_cp` | CP Decomposition | `(tensor, rank)` — CANDECOMP/PARAFAC · ALS |
| `tens_tuckerreg` | Tucker Regression | `(X, y, rank)` — low-rank matrix reg · MSE |
| `tens_complete` | Tensor Completion | `(tensor, mask, rank)` — CP-WOPT · missing imputation |

---

## Chart Modes

| Module | Default | Exceptions |
|--------|---------|-----------|
| circular (7) | `'barci'` | — |
| compositional (5) | `'barci'` | `comp_pca` → `'scree'` |
| conjoint (5) | `'barci'` | `conj_orth` → `'heatmap'` |
| game (7) | `'barci'` | `game_replicator` → `'timeseries'` |
| inequality (8) | `'barci'` | `ineq_lorenz` → `'scatterfit'` |
| pointProcess (9) | `'barci'` | `pproc_hawkes`, `pproc_hawkesfit` → `'timeseries'`; `pproc_cox`, `pproc_thomas`, `pproc_matern` → `'scatter'`; `pproc_pcf`, `pproc_lfunc` → `'scatterfit'` |
| reliability (7) | `'barci'` | `reli_weibull`, `reli_growth` → `'scatterfit'` |
| SPC (17) | `'timeseries'` | `spc_p`, `spc_c` → `'barci'`; `spc_capability` → `'barci'`; `spc_t2` → `'heatmap'`; `spc_oc` → `'scatterfit'`; `spc_aoq` → `'scatterfit'`; `spc_rectifying` → `'barci'`; `spc_relsamp` → `'barci'`; `spc_asn` → `'scatterfit'`; `spc_multivariate` → `'heatmap'`; `spc_cpk` → `'barci'` |
| tensor (8) | `'barci'` | `tens_unfold` → `'heatmap'`; `tens_parafac`, `tens_cp` → `'barci'` |

## Approximate Tests

Mark as approximate for stochastic/iterative/non-deterministic methods:

| Test ID | Reason |
|---------|--------|
| `circ_corr` | p-value via normal approximation |
| `circ_watson` | p-value via critical value comparison |
| `conj_sim` | Simulation-based market shares |
| `game_nash` | Numerical root finding |
| `game_replicator` | Iterative replicator dynamics |
| `pproc_hawkesfit` | Approximate MLE |
| `pproc_cox` | Stochastic intensity thresholding |
| `pproc_thomas` | Random cluster generation |
| `pproc_matern` | Random cluster generation |
| `tens_parafac` | Iterative ALS (local minima) |
| `tens_tucker` | Power iteration for SVD |
| `tens_mpca` | Power iteration |
| `tens_cp` | Iterative ALS with random restarts |
| `tens_tuckerreg` | SVD truncation |
| `tens_complete` | Random restarts + ALS |

**Total approximate: 15 tests.**

The remaining 58 tests get educational METHOD_NOTES entries.

---

## Runner Fixture Patterns

Some modules need constructed fixtures beyond existing `XS`, `YS`, `SCALE` etc.:

### Circular — angle data
```js
const ANGLES = ROWS.map(r => (r.x * Math.PI) % (2 * Math.PI));
```

### Compositional — tabular data with parts
```js
// Use ROWS with x, y, z, m as composition parts
// compVars = ['x', 'y', 'z']
```

### Conjoint — profiles + ratings
```js
// Build from ROWS
const PROFS = ROWS.slice(0, 10).map(r => ({ price: r.x > 0.5 ? 'high' : 'low', quality: r.y > 10 ? 'premium' : 'basic' }));
const RATINGS = ROWS.slice(0, 10).map(r => Math.round(r.m * 2 + 1));
const ATTRS = ['price', 'quality'];
```

### Game — payoff matrices
```js
const PAYOFF_2X2 = [[3, 0], [5, 1]];
const PAYOFF_3X3 = [[4, 1, 2], [3, 5, 1], [2, 3, 4]];
const COALITION = { 'A': 10, 'B': 20, 'A|B': 50, 'A|C': 40, 'B|C': 60, 'A|B|C': 100 };
```

### PointProcess — event times, surfaces, points
```js
const EVENTS = XS.slice(0, 30).sort((a,b) => a - b).map(v => v * 10);
const SURFACE = [[0.3, 0.5, 0.2], [0.4, 0.6, 0.3], [0.2, 0.4, 0.5]];
const PTS = ROWS.slice(0, 50).map(r => ({ x: r.x * 5, y: r.y - 8 }));
```

### Reliability — failure times
```js
const FAIL_TIMES = XS.slice(0, 30).map(v => Math.abs(v) * 500 + 100).sort((a,b) => a - b);
const CUM_FAIL = Array.from({length: 10}, (_, i) => i * 2 + 1);
const CUM_TIME = Array.from({length: 10}, (_, i) => (i + 1) * 100);
```

### SPC — process data, defect counts
```js
const PROC_DATA = XS.slice(0, 50).map(v => v * 10 + 5);
const DEFECTIVES = [3, 5, 2, 7, 4, 6, 3, 5];
const SAMPLE_SIZES = [50, 50, 50, 50, 50, 50, 50, 50];
const DEFECTS = ZS.slice(0, 20);
const OC_P = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2];
```

### Tensor — 3D tensor
```js
const TENSOR3D = Array.from({length: 4}, (_, i) =>
  Array.from({length: 3}, (_, j) =>
    Array.from({length: 3}, (_, k) => +(i + j * 2 + k * 3).toFixed(4))));
const TENSOR_MASK = Array.from({length: 4}, () =>
  Array.from({length: 3}, () =>
    Array.from({length: 3}, () => Math.random() > 0.3)));
```

### Fixture declarations to add in runners.js (before RUNNERS):
```js
const ANGLES = ROWS.map(r => ((r.x * Math.PI * 2) % (2 * Math.PI)));
const ANGLES2 = ROWS.map(r => ((r.y * Math.PI * 1.5) % (2 * Math.PI)));
const COMP_VARS = ['x', 'y', 'z'];
const PROFS = ROWS.slice(0, 10).map(r => ({ price: r.x > 0.5 ? 'high' : 'low', quality: r.y > 10 ? 'premium' : 'basic' }));
const RATINGS = ROWS.slice(0, 10).map(r => Math.round(r.m * 2 + 1));
const ATTRS = ['price', 'quality'];
const COALITION = { 'A': 10, 'B': 20, 'A|B': 50, 'A|C': 40, 'B|C': 60, 'A|B|C': 100 };
const PAYOFF_2X2 = [[3, 0], [5, 1]];
const PAYOFF_3X3 = [[4, 1, 2], [3, 5, 1], [2, 3, 4]];
const OUTCOMES = [[2, 5], [4, 4], [3, 2]];
const BIDS = [15, 22, 18, 25, 20];
const EVENTS = XS.slice(0, 30).sort((a, b) => a - b).map(v => Math.abs(v) * 10);
const SURFACE = [[0.3, 0.5, 0.2], [0.4, 0.6, 0.3], [0.2, 0.4, 0.5]];
const PTS = ROWS.slice(0, 50).map(r => ({ x: r.x * 5, y: r.y - 8 }));
const FAIL_TIMES = XS.slice(0, 30).map(v => Math.abs(v) * 500 + 100).sort((a, b) => a - b);
const CUM_FAIL = [1, 3, 6, 10, 15];
const CUM_TIME = [100, 200, 300, 400, 500];
const TEMP_DATA = [1000, 2000, 3000, 4000, 5000];
const STRESS_LEVELS = [85, 105, 125, 145, 165];
const WARRANTY_DATA = XS.slice(0, 15).map(v => Math.abs(v) * 24);
const TIME_DATA = XS.slice(0, 20).map(v => Math.abs(v) * 100);
const CAUSE_DATA = XS.slice(0, 20).map(v => Math.round(Math.abs(v)) % 3 + 1);
const PROC_DATA = ROWS.slice(0, 50).map(r => r.x * 10 + 5);
const DEFECTIVES = [3, 5, 2, 7, 4, 6, 3, 5, 4, 2];
const SAMP_SIZES = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
const OC_P = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2];
const TENSOR3D = Array.from({length: 4}, (_, i) => Array.from({length: 3}, (_, j) => Array.from({length: 3}, (_, k) => +(i + j * 2 + k * 3 + 1).toFixed(4))));
const TENSOR_MASK = Array.from({length: 4}, (_, i) => Array.from({length: 3}, (_, j) => Array.from({length: 3}, (_, k) => (i + j + k) % 3 !== 0)));
```

---

## Name Conflict Mitigations

No name conflicts with existing imports. All 9 module exports have unique names.

---

## State Vars (InferencePanel.jsx)

Minimal set — many functions take simple numeric arrays and need no config beyond data selection:

```
// circular (minimal — most just need angle arrays)
circDegrees (toggle degrees vs radians)

// compositional (needs column selectors)
compParts (column selector — x,y,z or x,y,z,m)
compYVar (y variable for regression)
compXVars (additional x variables)

// conjoint
conjSeed (seed for choice simulation)

// game (no UI config needed — hardcoded matrices)

// inequality (no UI config needed — data vectors)

// pointProcess
pprocSeed (seed for stochastic processes)
pprocMu, pprocAlpha, pprocBeta (Hawkes params)
pprocN (n for Cox process)

// reliability
reliConfidence (confidence level)
reliWarrantyMonths (warranty duration)

// SPC (the big one)
spcSubgroupSize (subgroup size 2-25)
spcTarget, spcK, spcH (CUSUM)
spcLambda, spcL (EWMA)
spcLSL, spcUSL (spec limits)
spcN, spcC, spcP, spcNlot (sampling plans)
spcVars (variable selector for multivariate)
spcAlpha (multivariate alpha)
spcT, spcR (reliability sampling)

// tensor
tensRank (rank/nFactors)
tensSeed (seed)
tensMaxIter (max iterations)
tensMode (unfold mode)
```

**Stick to the pattern**: reuse existing vectors (`allTgt`, `scaleMatrix`, `data`) where functions just need a numeric array. Only add state vars when a function has unique config parameters.

---

## Implementation Order

1. **`tree.js`** — add 9 categories (73 test IDs) before closing `];` (after line 780)
2. **`chartMap.js`** — add 73 chart entries
3. **`methodNotes.js`** — add 73 METHOD_NOTES + 15 APPROXIMATE_TESTS + 15 IMPL_NOTES
4. **`runners.js`** — add 9 imports + 73 runners + fixture declarations
5. **`InferencePanel.jsx`** — 9 imports, state vars, useMemo, 73 computation branches, deps, configState
6. **`InferenceConfig.jsx`** — destructured vars, configMap JSX entries
7. **`contracts.test.js`** — update TREE_IDS.length to 570 (497 + 73)
8. **`chartMap.test.js`** — update expected count
9. **`npx vitest run`** — verify all new tests pass

## Validation

After implementation:
```
npx vitest run src/tests/contracts.test.js src/config/chartMap.test.js src/config/methodNotes.test.js
npx vitest run src/components/InferencePanel.test.jsx
```

Expected: 997 + 146 = 1143 contracts tests (73 new × 2 = 146), 0 failures.

---

## Risks & Notes

1. **SPC.js has 17 exports** — the largest single-module block. Several functions take tabular data + column names (`data, vars`). Fixtures need constructed arrays for defect counts, sample sizes, etc.

2. **Tensor.js needs 3D data** — must construct `TENSOR3D` (4×3×3) and `TENSOR_MASK` fixtures. `tensorRegression` takes an array of 3D tensors as X, which is unusual.

3. **Conjoint.js chain dependency** — `attributeImportance` and `marketSimulator` take the output of `partWorthUtilities`. Runners must call `partWorthUtilities` first and pass result.

4. **PointProcess.js has stochastic functions** — `coxProcess`, `thomasProcess`, `maternCluster` use RNG. Mark as approximate.

5. **Game theory — `shapleyValue`** takes coalition values keyed by sorted-join of player names (e.g., `'A|B'`).

6. **No new useMemo data vectors needed** beyond existing `scaleMatrix`, `allTgt`, `data`. Most functions take simple numeric arrays already available.

## Incremental Counts

| After | TREE | chartMap | Contracts tests |
|-------|------|----------|----------------|
| Current (8c) | 497 | 537 | 997 |
| 8d | 570 | 610 | 1143 |
