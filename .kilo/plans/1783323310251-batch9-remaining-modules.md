# Batch 9 — Remaining Modules (101 exports, 11 modules)

## Status

After 8d: TREE count 570, chartMap count 610, contracts tests 1143.
After 9: TREE count 671, chartMap count 711, contracts tests 1345.

## Ground-Truth Export Inventory

### abm.js (8) — Agent-Based Models
| # | Export | Signature |
|---|--------|-----------|
| 1 | `moranIMulti` | `(agents, valueField, { nPerm = 99 } = {})` |
| 2 | `simulationConvergence` | `(runs, { window = 10, tolerance = 0.01 } = {})` |
| 3 | `sobolSensitivity` | `(inputs, output, { nBootstrap = 100 } = {})` |
| 4 | `agentSummaryStats` | `(agents, vars)` |
| 5 | `scenarioComparison` | `(scenarios)` |
| 6 | `thresholdModel` | `(nAgents, thresholds, initialAdopters = 1)` |
| 7 | `networkDiffusion` | `(adjacency, seeds, { seed = 42, steps = 10, prob = 0.1 } = {})` |
| 8 | `segregationIndex` | `(data, groupVar, locationVar)` |

### bandit.js (9) — Multi-Armed Bandits
| # | Export | Signature |
|---|--------|-----------|
| 1 | `epsilonGreedy` | `(arms, rewards, nIterations = 100, { seed = 42, epsilon = 0.1 } = {})` |
| 2 | `ucb` | `(arms, rewards, nIterations = 100)` |
| 3 | `thompsonSampling` | `(arms, rewards, nIterations = 100, { seed = 42, prior = 'beta' } = {})` |
| 4 | `contextualBandit` | `(arms, nContext = 2, nIterations = 100, { seed = 42, alpha = 1 } = {})` |
| 5 | `policyGradient` | `(arms, rewards, nEpisodes = 100, { seed = 42, lr = 0.01 } = {})` |
| 6 | `softmaxBandit` | `(arms, rewards, nIterations = 100, { seed = 42, tau = 1, cooling = 0.99 } = {})` |
| 7 | `qLearning` | `(nStates, nActions, rewards, transitions, { seed, episodes, lr, gamma, epsilon } = {})` |
| 8 | `sarsa` | `(nStates, nActions, rewards, transitions, { seed, episodes, lr, gamma, epsilon } = {})` |
| 9 | `deepQNetwork` | `(nStates, nActions, { seed, episodes, lr, gamma, hiddenSize, rewards, transitions, epsilon } = {})` |

### linkage.js (7) — Record Linkage
| # | Export | Signature |
|---|--------|-----------|
| 1 | `jaroWinkler` | `(s1, s2, { prefixWeight = 0.1 } = {})` |
| 2 | `levenshteinDistance` | `(s1, s2)` |
| 3 | `fellegiSunter` | `(pairs, { uProb = 0.3, mProb = 0.9 } = {})` |
| 4 | `recordBlocking` | `(data, blockVar, { blockSize = 100 } = {})` |
| 5 | `matchThreshold` | `(scores, labels, { nThresholds = 20 } = {})` |
| 6 | `probabilisticRecordLinkage` | `(pairs, matchWeights)` |
| 7 | `deduplication` | `(records, keyFields)` |

### privacy.js (7) — Differential Privacy
| # | Export | Signature |
|---|--------|-----------|
| 1 | `laplaceMechanism` | `(data, epsilon = 1, { seed = 42, sensitivity = null } = {})` |
| 2 | `bootstrapSynthetic` | `(data, { nRow = null, seed = 42 } = {})` |
| 3 | `kAnonymityCheck` | `(data, quasiIdentifiers, { k = 2 } = {})` |
| 4 | `differentialPrivacy` | `(queries, epsilon, delta = 0)` |
| 5 | `dataMasking` | `(data, column, { seed = 42, method = 'swap', pct = 10 } = {})` |
| 6 | `lDiversity` | `(data, qidCols, sensitiveCol, l = 2)` |
| 7 | `tCloseness` | `(data, qidCols, sensitiveCol, t = 0.2)` |

### pro.js (7) — Patient-Reported Outcomes
| # | Export | Signature |
|---|--------|-----------|
| 1 | `reliableChangeIndex` | `(baseline, followUp, { reliability = 0.8, sdBaseline = null } = {})` |
| 2 | `minimalImportantDifference` | `(scores, anchors, { method = 'anchor' } = {})` |
| 3 | `responderAnalysis` | `(data, baselineVar, followUpVar, threshold, { groupVar = null } = {})` |
| 4 | `eq5dIndex` | `(domainScores, { country = 'UK' } = {})` |
| 5 | `standardizedResponseMean` | `(baseline, followUp)` |
| 6 | `clinicalTrialsGov` | `(data, phaseVar, statusVar)` |
| 7 | `consortChecklist` | `(items)` |

### raMonitor.js (7) — Risk-Adjusted Monitoring
| # | Export | Signature |
|---|--------|-----------|
| 1 | `raCusum` | `(binary, predicted, { k = 0.5, h = 5 } = {})` |
| 2 | `vlad` | `(expected, observed, { smoothing = 5 } = {})` |
| 3 | `raSprt` | `(binary, predicted, { h0 = 0, h1 = 0.5 } = {})` |
| 4 | `funnelPlot` | `(data, yVar, nVar, { controlLimits = 3 } = {})` |
| 5 | `cChartRiskAdjusted` | `(data, yVar, riskVar, { controlLimits = 3 } = {})` |
| 6 | `safetySignal` | `(events, expected, total)` |
| 7 | `prrAnalysis` | `(events, expecteds, totals)` |

### recommendation.js (3) — Recommendation Systems
| # | Export | Signature |
|---|--------|-----------|
| 1 | `collaborativeFilter` | `(ratings, { nNeighbors = 5 } = {})` |
| 2 | `matrixFactorize` | `(R, k = 3, { seed = 42, steps = 30, lr = 0.01, lambda = 0.1 } = {})` |
| 3 | `topNRecommend` | `(ratings, userIndex, { n = 5, excludeRated = true } = {})` |

### sced.js (7) — Single-Case Experimental Design
| # | Export | Signature |
|---|--------|-----------|
| 1 | `tauU` | `(baseline, intervention)` |
| 2 | `pnd` | `(baseline, intervention)` |
| 3 | `pem` | `(baseline, intervention)` |
| 4 | `nap` | `(baseline, intervention)` |
| 5 | `randomizationTest` | `(baseline, intervention, { seed = 42, nPerm = 199 } = {})` |
| 6 | `baselineCorrectedTau` | `(baseline, intervention)` |
| 7 | `betweenCaseSMD` | `(caseA, caseB)` |

### sensitivity.js (8) — Sensitivity Analysis
| # | Export | Signature |
|---|--------|-----------|
| 1 | `morrisMethod` | `(model, X, { seed = 42, levels = 4, grid = 2 } = {})` |
| 2 | `fastSensitivity` | `(model, X, { seed = 42, M = 4 } = {})` |
| 3 | `modelComparison` | `(mse1, mse2, n, k1, k2)` |
| 4 | `forecastCombination` | `(forecasts, actual, { method = 'equal' } = {})` |
| 5 | `sobolFirstOrder` | `(model, X, { seed = 42, nSamples = 50 } = {})` |
| 6 | `sobolTotalIndex` | `(model, X, { seed = 42, nSamples = 50 } = {})` |
| 7 | `deltaMethod` | `(means, ses, fn, h = 1e-6)` |
| 8 | `andrewsPlot` | `(X, labels = null, { nPts = 50 } = {})` |

### bootstrap.js (11) — Bootstrap & Resampling
| # | Export | Signature |
|---|--------|-----------|
| 1 | `bootstrapCI` | `(data, statistic, { method, B, alpha, seed } = {})` |
| 2 | `bootstrapSE` | `(data, statistic, { B, seed } = {})` |
| 3 | `bootstrapTest` | `(data, statistic, nullValue, { B, alternative, seed } = {})` |
| 4 | `jackknife` | `(data, statistic)` |
| 5 | `bootstrapT_CI` | `(data, statistic, { B, alpha, seed } = {})` |
| 6 | `empiricalInfluence` | `(data, statistic)` |
| 7 | `bootstrapMediation` | `(data, treatVar, mediator, outcomeVar, { B, seed } = {})` |
| 8 | `moderatedMediation` | `(data, treatVar, mediator, moderator, outcomeVar)` |
| 9 | `splitConformal` | `(yTrain, yCal, { alpha, xTrain, xCal } = {})` |
| 10 | `conformalPvalues` | `(scores, testScore)` |
| 11 | `jackknifePlus` | `(X, y, { alpha, xNew } = {})` |

### power.js (27) — Power Analysis
| # | Export | Signature |
|---|--------|-----------|
| 1 | `powerCoxPH` | `(nEvents, hr, rSquaredOther = 0, k = 1, alpha = 0.05)` |
| 2 | `powerMetaAnalysis` | `(k, d, tau2 = 0, nPerStudy = 50, alpha = 0.05)` |
| 3 | `powerEquivalence` | `(meanDiff, se, dL, dU, alpha = 0.05)` |
| 4 | `powerInteractionANOVA` | `(kA, kB, nPerCell, fInt, alpha = 0.05)` |
| 5 | `powerANOVA` | `(cohenF, k, nPerGroup, alpha = 0.05, seed = 42)` |
| 6 | `powerChiSq` | `(cohenW, df, N, alpha = 0.05)` |
| 7 | `powerLogisticReg` | `(or, pControl, nPerGroup, alpha = 0.05)` |
| 8 | `powerMultilevel` | `(ICC, mClustersEach, subjectsPerCluster, d, alpha = 0.05)` |
| 9 | `powerCorrelation` | `(n, r, alpha = 0.05)` |
| 10 | `powerMediationTest` | `(aHat, bHat, seA, seB, { B, alpha, seed } = {})` |
| 11 | `requiredNT` | `(d, power = 0.8, alpha = 0.05, type = 'two-sample')` |
| 12 | `requiredNCorrelation` | `(r, power = 0.8, alpha = 0.05)` |
| 13 | `requiredNOneProp` | `(p0, p1, power = 0.8, alpha = 0.05)` |
| 14 | `requiredNTwoProp` | `(p1, p2, power = 0.8, alpha = 0.05)` |
| 15 | `requiredNWilcoxon` | `(d, power = 0.8, alpha = 0.05)` |
| 16 | `requiredNLogRank` | `(hr, power = 0.8, alpha = 0.05)` |
| 17 | `requiredNOLS` | `(rSquared, k = 1, power = 0.8, alpha = 0.05)` |
| 18 | `requiredNANOVA` | `(cohenF, k, power = 0.8, alpha = 0.05)` |
| 19 | `powerTTestWrapper` | `(n1, n2 = n1, d, type = 'two-sample', alpha = 0.05)` |
| 20 | `powerProportionOne` | `(n, p0, p1, alpha = 0.05)` |
| 21 | `powerProportionTwo` | `(n1, n2, p1, p2, alpha = 0.05)` |
| 22 | `powerWilcoxonTest` | `(n1, n2 = n1, d, alpha = 0.05)` |
| 23 | `powerLogRankTest` | `(nEvents, hr, alpha = 0.05)` |
| 24 | `powerRMANOVA` | `(k, n, epsilon = 1, f, alpha = 0.05)` |
| 25 | `powerOLS_apa` | `(rSquared, n, k, alpha = 0.05)` |
| 26 | `powerSpearmanTest` | `(n, rho, alpha = 0.05)` |
| 27 | `powerProportionOne` (dup? — verify) | check power.js for duplicates |

**Total: 101 exports** (27 power + 11 bootstrap + 63 from 9 unwired modules).

---

## Tree Categories

### AGENT-BASED MODELS (color: `#a78bfa`)
| ID | Label | Tag |
|----|-------|-----|
| `abm_morani` | Spatial Moran's I | spatial autocorrelation · agents |
| `abm_conv` | Simulation Convergence | window · tolerance · stopping |
| `abm_sobol` | Sobol Sensitivity | first-order · total · bootstrap |
| `abm_summary` | Agent Summary Stats | per-variable · count/mean/sd |
| `abm_scenario` | Scenario Comparison | across-run · output metrics |
| `abm_threshold` | Threshold Model | tipping points · adoption cascade |
| `abm_diffusion` | Network Diffusion | SIR-like · seed · probability |
| `abm_segregation` | Segregation Index | group · location · dissimilarity |

### MULTI-ARMED BANDITS (color: `#34d399`)
| ID | Label | Tag |
|----|-------|-----|
| `bandit_eps` | Epsilon-Greedy | exploration ε · regret |
| `bandit_ucb` | UCB | upper confidence bound · optimism |
| `bandit_thompson` | Thompson Sampling | beta posterior · Bayesian |
| `bandit_context` | Contextual Bandit | covariates · linear rewards |
| `bandit_pg` | Policy Gradient | REINFORCE · softmax policy |
| `bandit_softmax` | Softmax Bandit | Boltzmann · temperature annealing |
| `bandit_ql` | Q-Learning | tabular · ε-greedy · TD |
| `bandit_sarsa` | SARSA | on-policy TD · ε-greedy |
| `bandit_dqn` | Deep Q-Network | neural approx · replay buffer |

### RECORD LINKAGE (color: `#f97316`)
| ID | Label | Tag |
|----|-------|-----|
| `link_jaro` | Jaro-Winkler | string distance · prefix weight |
| `link_lev` | Levenshtein Distance | edit distance · characters |
| `link_fel` | Fellegi-Sunter | probabilistic match · u/m probs |
| `link_block` | Record Blocking | partition · block variable |
| `link_thresh` | Match Threshold | score cut · ROC-based |
| `link_prob` | Probabilistic Linkage | weight-based · pairs |
| `link_dedup` | Deduplication | within-dataset · key fields |

### PRIVACY (color: `#f472b6`)
| ID | Label | Tag |
|----|-------|-----|
| `priv_laplace` | Laplace Mechanism | ε-DP · additive noise |
| `priv_synthetic` | Bootstrap Synthetic | resampled · privacy-preserving |
| `priv_kanon` | k-Anonymity | quasi-identifier · k ≥ 2 |
| `priv_diff` | Differential Privacy | (ε, δ)-DP · queries |
| `priv_mask` | Data Masking | swap · perturbation |
| `priv_ldiv` | ℓ-Diversity | sensitive · qid · entropy |
| `priv_tclose` | t-Closeness | EMD · sensitive · distribution |

### PATIENT-REPORTED OUTCOMES (color: `#fbbf24`)
| ID | Label | Tag |
|----|-------|-----|
| `pro_rci` | Reliable Change Index | Jacobson-Truax · SE_diff |
| `pro_mid` | Minimal Important Diff. | anchor-based · distribution |
| `pro_responder` | Responder Analysis | threshold · baseline→follow-up |
| `pro_eq5d` | EQ-5D Index | health utility · country weights |
| `pro_srm` | Std Response Mean | Cohen's d for change |
| `pro_ctgov` | ClinicalTrials.gov | phase · status · summary |
| `pro_consort` | CONSORT Checklist | reporting · enrollment |

### RISK-ADJUSTED MONITORING (color: `#06b6d4`)
| ID | Label | Tag |
|----|-------|-----|
| `ram_cusum` | RA CUSUM | risk-adjusted · binary outcome |
| `ram_vlad` | VLAD | variable life adjusted display |
| `ram_sprt` | RA SPRT | sequential probability ratio |
| `ram_funnel` | Funnel Plot | volume-outcome · control limits |
| `ram_cchart` | RA c-Chart | risk-adjusted · Poisson |
| `ram_safety` | Safety Signal | disproportionality · expected |
| `ram_prr` | PRR Analysis | proportional reporting ratio |

### RECOMMENDATION (color: `#22d3ee`)
| ID | Label | Tag |
|----|-------|-----|
| `rec_cf` | Collaborative Filter | user-user · neighborhood |
| `rec_mf` | Matrix Factorization | SVD-style · latent factors |
| `rec_topn` | Top-N Recommend | ranked · user-specific |

### SINGLE-CASE EXPT DESIGN (color: `#a3e635`)
| ID | Label | Tag |
|----|-------|-----|
| `sced_tauu` | Tau-U | trend-corrected · nonoverlap |
| `sced_pnd` | PND | percent non-overlapping data |
| `sced_pem` | PEM | percent exceeding median |
| `sced_nap` | NAP | non-overlap of all pairs |
| `sced_rand` | Randomization Test | permutation · intervention |
| `sced_bctau` | Baseline-Corrected Tau | trend-adjusted · Kendall |
| `sced_bcsmd` | Between-Case SMD | standardized mean difference |

### SENSITIVITY ANALYSIS (color: `#c084fc`)
| ID | Label | Tag |
|----|-------|-----|
| `sens_morris` | Morris Method | elementary effects · screening |
| `sens_fast` | FAST | Fourier amplitude · main effects |
| `sens_modelcomp` | Model Comparison | MSE · F-test · complexity |
| `sens_forecast` | Forecast Combination | equal · inverse-MSE · optimal |
| `sens_sobol1` | Sobol First-Order | variance decomposition · Sᵢ |
| `sens_sobolt` | Sobol Total Index | total effect · STᵢ |
| `sens_delta` | Delta Method | Taylor · SE propagation |
| `sens_andrews` | Andrews Plot | Fourier · multivariate · curves |

### BOOTSTRAP (color: `#e879f9`)
| ID | Label | Tag |
|----|-------|-----|
| `boot_ci` | Bootstrap CI | percentile · BCa · B=2000 |
| `boot_se` | Bootstrap SE | standard error · resampling |
| `boot_test` | Bootstrap Test | null · alternative · B resamples |
| `boot_jack` | Jackknife | leave-one-out · bias |
| `boot_tci` | Bootstrap-t CI | studentized · α=0.05 |
| `boot_influence` | Empirical Influence | jackknife · dfbeta-like |
| `boot_mediation` | Bootstrap Mediation | indirect effect · CI |
| `boot_modmed` | Moderated Mediation | index · interaction |
| `boot_splitconf` | Split Conformal | prediction interval · α |
| `boot_confpval` | Conformal P-values | nonconformity · test score |
| `boot_jackplus` | Jackknife+ | conformal · leave-one-out |

### POWER ANALYSIS (color: `#facc15`)
| ID | Label | Tag |
|----|-------|-----|
| `pow_cox` | Power Cox PH | nEvents · HR · R² |
| `pow_meta` | Power Meta-Analysis | k studies · d · τ² |
| `pow_equiv` | Power Equivalence | TOST · Δ · SE |
| `pow_intanova` | Power Interaction ANOVA | kA·kB · f · n/cell |
| `pow_anova` | Power ANOVA | cohenF · k groups · n/group |
| `pow_chi` | Power Chi-Square | cohenW · df · N |
| `pow_logit` | Power Logistic Reg | OR · pControl · n/group |
| `pow_mixed` | Power Multilevel | ICC · m · n · d |
| `pow_corr` | Power Correlation | n · r · α |
| `pow_med` | Power Mediation | a·b · SEa·SEb · bootstrap |
| `reqn_t` | Required N (t-test) | d · power · α · type |
| `reqn_corr` | Required N (Corr) | r · power · α |
| `reqn_oneprop` | Required N (1 Prop) | p0·p1 · power · α |
| `reqn_twoprop` | Required N (2 Prop) | p1·p2 · power · α |
| `reqn_wilcoxon` | Required N (Wilcoxon) | d · power · α |
| `reqn_logrank` | Required N (Log-Rank) | HR · power · α |
| `reqn_ols` | Required N (OLS) | R² · k predictors · power |
| `reqn_anova` | Required N (ANOVA) | cohenF · k · power |
| `pow_ttest` | Power t-Test | n1·n2 · d · type · α |
| `pow_oneprop` | Power 1 Proportion | n · p0·p1 · α |
| `pow_twoprop` | Power 2 Proportions | n1·n2 · p1·p2 · α |
| `pow_wilcoxon` | Power Wilcoxon | n1·n2 · d · α |
| `pow_logrank` | Power Log-Rank | nEvents · HR · α |
| `pow_rmanova` | Power RM ANOVA | k · n · ε · f · α |
| `pow_olsapa` | Power OLS (APA) | R² · n · k · α |
| `pow_spearman` | Power Spearman | n · ρ · α |

---

## Chart Modes

| Module | Default | Exceptions |
|--------|---------|-----------|
| abm (8) | `'barci'` | `abm_segregation` → `'heatmap'`; `abm_diffusion` → `'timeseries'` |
| bandit (9) | `'barci'` | `bandit_eps`, `bandit_ucb`, `bandit_thompson`, `bandit_softmax`, `bandit_ql`, `bandit_sarsa` → `'timeseries'` |
| linkage (7) | `'barci'` | `link_lev`, `link_jaro` → `'histogram'`; `link_fel` → `'scatter'` |
| privacy (7) | `'barci'` | `priv_diff` → `'histogram'` |
| pro (7) | `'barci'` | `pro_eq5d` → `'histogram'` |
| raMonitor (7) | `'timeseries'` | `ram_funnel`, `ram_safety` → `'scatter'` |
| recommendation (3) | `'barci'` | `rec_mf` → `'heatmap'` |
| sced (7) | `'timeseries'` | `sced_bcsmd` → `'barci'` |
| sensitivity (8) | `'barci'` | `sens_andrews` → `'scatter'`; `sens_morris`, `sens_sobol1`, `sens_sobolt` → `'barci'`; `sens_forecast` → `'scatterfit'` |
| bootstrap (11) | `'histogram'` | `boot_mediation`, `boot_modmed` → `'barci'`; `boot_jack`, `boot_influence` → `'barci'` |
| power (27) | `'barci'` | — |

## Approximate Tests

Mark as approximate for stochastic/iterative/non-deterministic methods:

| Test ID | Reason |
|---------|--------|
| `abm_conv` | Tolerance-based early stopping |
| `abm_sobol` | Bootstrap confidence intervals |
| `abm_diffusion` | Stochastic network propagation |
| `bandit_eps` | Random exploration |
| `bandit_thompson` | Stochastic sampling from posteriors |
| `bandit_pg` | Policy gradient with random episodes |
| `bandit_ql` | ε-greedy random exploration |
| `bandit_sarsa` | ε-greedy random exploration |
| `bandit_dqn` | Neural network with random init/exploration |
| `priv_laplace` | Random noise addition |
| `priv_synthetic` | Bootstrap resampling |
| `priv_mask` | Random swap/permutation |
| `sens_morris` | Random sampling of trajectories |
| `sens_fast` | Random search curve |
| `sens_sobol1` | Random sampling of sensitivity indices |
| `sens_sobolt` | Random sampling of total indices |
| `boot_ci` | Bootstrap resampling (stochastic) |
| `boot_se` | Bootstrap resampling (stochastic) |
| `boot_test` | Bootstrap resampling (stochastic) |
| `boot_jack` | Leave-one-out (deterministic but many iterations) |
| `boot_tci` | Bootstrap-t resampling |
| `boot_splitconf` | Split-conformal random split |
| `boot_jackplus` | Jackknife+ resampling |
| `pow_med` | Bootstrap mediation power |
| `pow_anova` | Seed-based simulation power |

**Total approximate: 25 tests.** Remaining 76 get METHOD_NOTES.

---

## Special Considerations

### 1. bootstrap.js — `statistic` callback parameter
Several bootstrap functions take `(data, statistic, ...)` where `statistic` is a function. For runners, provide a default statistic like `data => data.reduce((s, x) => s + x, 0) / data.length` (mean). For the UI, use a hardcoded mean statistic since we can't accept a callback from the config panel.

### 2. power.js — large module, many parameters
Power functions take different numeric parameters. For the config UI, share parameters where possible:
- `alpha` is already a global UI param (may reuse)
- `power` (target power) defaults to 0.8
- `n1`, `n2`, `d` for t-tests
- `cohenF`, `k`, `nPerGroup` for ANOVA
- etc.

Power functions are synchronous wrappers — they compute and return immediately, unlike the existing 5 async `runPower*` wrappers.

### 3. bandit.js — requires arms/rewards arrays
Bandit functions expect `arms` (identifiers) and `rewards` (reward matrix or function). For fixture data, construct simple 3-arm setups from ROWS data.

### 4. sced.js — baseline/intervention pattern
All SCED functions take `(baseline, intervention)` as two numeric arrays. Use `g1vals` and `g2vals` from the existing UI data vectors.

### 5. Name conflict: `pow_anova`, `pow_chi`, `pow_logit`, `pow_mixed`, `pow_med`
These 5 IDs are already used in `POWER_TESTS` set and have async UI runners via `runPower*`. When adding tree entries, these IDs will gain standard synchronous computation branches. The `displayResult` logic already handles this: `const displayResult = POWER_TESTS.has(active) ? powerResult : result;`. So both code paths coexist — the async runner overrides the sync result.

---

## Implementation Order

1. **`tree.js`** — add 11 categories (101 test IDs) after closing `];` (currently line ~890)
2. **`chartMap.js`** — add 101 chart entries
3. **`methodNotes.js`** — add 76 METHOD_NOTES + 25 IMPL_NOTES + 25 APPROXIMATE_TESTS
4. **`runners.js`** — add 11 imports + 101 runners + fixture declarations
5. **`InferencePanel.jsx`** — 11 imports, state vars, useMemo, 101 computation branches, deps, configState
6. **`InferenceConfig.jsx`** — destructured vars, configMap JSX entries
7. **`contracts.test.js`** — update TREE_IDS.length to 671
8. **`chartMap.test.js`** — update expected count to 711
9. **`npx vitest run`** — verify all new tests pass

## Expected Counts

| After | TREE | chartMap | Contracts tests |
|-------|------|----------|----------------|
| Current (8d) | 570 | 610 | 1143 |
| 9 | 671 | 711 | 1345 |

## Validation

```
npx vitest run src/tests/contracts.test.js src/config/chartMap.test.js src/config/methodNotes.test.js
```

Expected: 1143 + 202 = 1345 contracts tests, 0 failures.

---

## Risks

1. **power.js has 27 exports** — the largest single-module block. Parameters are all numeric scalars (no tabular data needed), making both runners and UI simpler than SPC (which had 17 exports with tabular data).

2. **bootstrap.js `statistic` parameter** — requires a function argument. Runners can hardcode a mean/median function. The UI will implicitly use a hardcoded statistic.

3. **bandit.js needs reward matrices** — construct from ROWS/XS data. Complex reward structures may need pre-built fixtures.

4. **Existing `pow_*` async tests** — the 5 async power tests (`pow_anova`, etc.) already have `POWER_TESTS` handling. Adding tree entries for these functions will add synchronous computation branches that are overridden by the async `powerResult`. This is safe (the display uses `displayResult` which checks `POWER_TESTS.has(active)` first).

5. **No new useMemo data vectors needed** — most functions take simple numeric arrays already available via `allTgt`, `g1vals`, `g2vals`, `scaleMatrix`, `data`.
