# StatLab — Statistical Methods UI Expansion Plan

## Goal
Wire all currently-unwired method modules (~68 modules, ~650+ functions) from `src/tests/` into the webapp UI: `src/config/tree.js`, `src/config/chartMap.js`, `src/components/InferencePanel.jsx`, and `src/config/methodNotes.js`.

## Architecture
Each method follows a 4-way wiring pattern:
1. **`tree.js`** — add `{ id, label, tag }` entry under a category
2. **`chartMap.js`** — assign default chart type (`violin`, `scatterfit`, `histogram`, etc.)
3. **`InferencePanel.jsx`** — import function, add config state, add `if (a===...)` branch in result `useMemo`
4. **`methodNotes.js`** — optional: description/usage/assumptions/cite

Charts are auto-generated via `InferenceResults.jsx` + `charts.jsx` using the `CHART_FOR_TEST` map and `ds` metadata. New chart types rarely needed — reuse existing chart builders.

---

## Batch 1: HIGH-IMPACT CLASSICAL (Survival, Time Series, Finance)

### 1A — SURVIVAL ANALYSIS (25 fns)
**Module:** `src/tests/survival.js`

| Tree ID | Label | Tag | Chart | Key param config |
|---------|-------|-----|-------|-----------------|
| `km` | Kaplan-Meier | survival curve · log-rank · median survival | `survival` | timeVar, eventVar, strataVar |
| `coxph` | Cox Proportional Hazards | β · HR · 95% CI · PH test | `survival` | timeVar, eventVar, preds |
| `par_surv` | Parametric Survival | Weibull · Exp · log-logistic · AIC | `survival` | timeVar, eventVar, preds, dist |
| `finegray` | Fine-Gray Competing Risks | subdistribution HR · cause | `survival` | timeVar, eventVar, causeEvent, preds |
| `frailtycox` | Frailty Cox | shared frailty · gamma · lognormal | `survival` | timeVar, eventVar, clusterVar, preds |
| `tvc` | Time-Varying Cox | counting process · extended Cox | `survival` | idVar, startVar, stopVar, eventVar, preds |
| `nelson_aalen` | Nelson-Aalen | cumulative hazard · nonparametric | `histogram` | timeVar, eventVar |
| `rmst` | RMST | restricted mean · between-group comparison | `barci` | timeVar, eventVar, truncTime |
| `cure` | Cure Model | mixture cure · cured fraction | `survival` | timeVar, eventVar, preds |
| `multistate` | Multi-State Model | competing risks · transitions | `survival` | idVar, fromVar, toVar, states |
| `rsf` | Random Survival Forest | ensemble · variable importance · C-index | `histogram` | timeVar, eventVar, preds, nTrees |
| `joint` | Joint Model | longitudinal + survival | `survival` | timeVar, eventVar, preds, idVar |

**Chart needed:** `survival` — Kaplan-Meier step function with CI band. Already exists in `charts.jsx`? Check `plotKM`.

**Config state to add:** `survTimeVar`, `survEventVar`, `survStrataVar`, `survClusterVar`, `survCauseEvent`, `survIdVar`, `survStartVar`, `survStopVar`, `survTruncTime`, `survDist` (dropdown), `rsfNTrees`.

---

### 1B — TIME SERIES (53 fns)
**Module:** `src/tests/timeseries.js`

| Tree ID | Label | Tag | Chart | Key param config |
|---------|-------|-----|-------|-----------------|
| `adf` | ADF Stationarity Test | unit root · differencing order | `timeseries` | — |
| `acf` | Autocorrelation (ACF) | lags · significance bands | `correlogram` | — |
| `pacf` | Partial ACF | AR order selection | `correlogram` | — |
| `arima` | ARIMA | (p,d,q) · AIC/BIC · residuals | `timeseries` | p, d, q |
| `autoarima` | Auto ARIMA | automatic selection · AICc | `timeseries` | maxP, maxD, maxQ |
| `holt_winters` | Holt-Winters | trend + seasonality · αβγ | `timeseries` | period, alpha, beta, gamma |
| `seasonal` | Seasonal Decomposition | trend · seasonal · residual | `decomposition` | period |
| `var` | VAR(p) | multivariate · impulse response · FEVD | `impulse` | p, horizon |
| `granger` | Granger Causality | F-test · max lag · pairwise | `barci` | causeCol, effectCol, maxLag |
| `chow` | Chow Breakpoint Test | structural break · known date | `scatter` | breakPoint |
| `garch` | GARCH(1,1) | volatility clustering · conditional σ | `timeseries` | p, q |
| `egarch` | EGARCH | leverage effects · asymmetric vol | `timeseries` | p, q |
| `kalman` | Kalman Filter | state-space · smoothed estimates | `timeseries` | systemNoise, obsNoise |
| `johansen` | Johansen Cointegration | trace · max-eigen · VECM rank | `histogram` | p, detType |
| `structbreak` | Structural Breaks | Bai-Perron · multiple breaks | `timeseries` | maxBreaks |
| `forecast_recon` | Forecast Reconciliation | bottom-up · top-down · minT | `histogram` | hierarchy |
| `markov_switch` | Markov-Switching AR | 2 regimes · smoothed probs | `timeseries` | nRegimes, p |
| `changepoint` | Change Point Detection | PELT · binary seg · penalty | `timeseries` | minSegLen |
| `forecast_eval` | Forecast Evaluation | RMSE · MAE · MAPE · MASE · Theil's U | `histogram` | — |

**Chart needed:** `timeseries` (line with forecast CI band), `correlogram` (bar chart with significance lines), `decomposition` (4-panel facet), `impulse` (IRF with CI). Existing `charts.jsx` likely has some timeseries plotting.

**Config state to add:** `tsValueVar`, `tsP`/`tsD`/`tsQ`, `tsPeriod`, `tsHorizon`, `tsBreakPoint`, `tsCauseVar`/`tsEffectVar`, `tsMaxLag`, `tsNRegimes`, `tsDetType`.

---

### 1C — FINANCE (20 fns)
**Module:** `src/tests/finance.js`

| Tree ID | Label | Tag | Chart | Param |
|---------|-------|-----|-------|-------|
| `capm` | CAPM Beta | market β · α · R² | `scatterfit` | rfRate |
| `sharpe` | Sharpe Ratio | risk-adjusted · annualized | `histogram` | rfRate |
| `sortino` | Sortino Ratio | downside risk only | `histogram` | rfRate, mar |
| `var_hist` | Historical VaR | quantile · α-level | `histogram` | alpha |
| `var_param` | Parametric VaR | normal · horizon | `histogram` | alpha, horizon |
| `max_drawdown` | Max Drawdown | peak-to-trough | `histogram` | — |
| `ff3` | Fama-French 3-Factor | β_mkt · SMB · HML | `scatterfit` | — |
| `carhart4` | Carhart 4-Factor | + momentum | `scatterfit` | — |
| `bs` | Black-Scholes | option pricing · call/put | `histogram` | spot, strike, time, rate, sigma, type |
| `greeks` | Option Greeks | Δ Γ Θ Vega Rho | `histogram` | spot, strike, time, rate, sigma |
| `implied_vol` | Implied Volatility | Newton-Raphson · market price | `histogram` | mktPrice, spot, strike, time, rate |
| `binom_tree` | Binomial Tree | American/European · n steps | `histogram` | spot, strike, time, rate, sigma, steps |
| `mc_option` | Monte Carlo Pricing | simulated paths · nSim | `histogram` | spot, strike, time, rate, sigma, nSim |

**Config:** `rfRate`, `spot`, `strike`, `optionTime`, `optionRate`, `optionSigma`, `optionType`, `mktPrice`, `optionSteps`, `nSim`.

---

## Batch 2: SPECIALIZED BIOSTAT (Clinical, Dose-Response, Extreme, Mixture, GAM, FDA)

### 2A — CLINICAL DIAGNOSTICS (31 fns)
**Module:** `src/tests/clinical.js`

| Tree ID | Label | Tag | Chart |
|---------|-------|-----|-------|
| `bland_altman` | Bland-Altman | agreement · bias · LoA | `blandaltman` |
| `diagnostic` | Diagnostic Accuracy | sens · spec · PPV · NPV · AUC | `roc` |
| `lr` | Likelihood Ratios | LR+ · LR− · post-test prob | `histogram` |
| `nri` | Net Reclassification | categorical NRI · risk categories | `histogram` |
| `weighted_kappa` | Weighted κ | linear/quadratic · ordinal agreement | `mosaic` |
| `fleiss_kappa` | Fleiss' κ | multiple raters | `barci` |
| `kripp_alpha` | Krippendorff's α | any scale · missing data | `barci` |
| `cliffs_delta` | Cliff's δ | ordinal · distribution-free ES | `barci` |
| `rank_biserial` | Rank-Biserial r | Mann-Whitney effect | `barci` |
| `hosmer_lemeshow` | Hosmer-Lemeshow | calibration · predicted vs observed | `calibration` |
| `net_benefit` | Net Benefit | decision curve analysis | `decisioncurve` |
| `brier` | Brier Score | probability calibration | `histogram` |
| `haybittle` | Haybittle-Peto | sequential boundaries | `histogram` |
| `fisher_comb` | Fisher's Method | p-value combination | `histogram` |
| `paf` | Population Attrib. Fraction | prevalence · OR | `histogram` |

**Chart needed:** `blandaltman` (scatter with bias line + LoA), `roc` (TPR vs FPR), `calibration` (predicted vs observed bins), `decisioncurve` (net benefit vs threshold). Check existing `charts.jsx` for ROC plotting.

### 2B — DOSE-RESPONSE (6 fns)
**Module:** `src/tests/doseResponse.js`

| `fourpl` | 4PL Curve Fit | IC50 · Hill slope · top/bottom | `dosecurve` |
| `ec50` | EC50 / IC50 | CI · potency comparison | `dosecurve` |
| `volcano` | Volcano Plot | log2FC vs −log10(p) | `volcano` |
| `log2fc` | Log2 Fold Change | treatment/control ratio | `histogram` |
| `modt` | Moderated t-statistic | eBayes · small n shrinkage | `histogram` |

### 2C — EXTREME VALUE (7 fns)
**Module:** `src/tests/extreme.js`

| `gev` | GEV MLE | block maxima · return levels | `returnlevel` |
| `gpd` | GPD MLE | peaks-over-threshold · tail index | `returnlevel` |
| `return_level` | Return Levels | T-year event · CI | `returnlevel` |
| `hill` | Hill Estimator | tail index · Pareto | `histogram` |
| `pot` | Peaks Over Threshold | GPD fit · threshold diagnostics | `threshold` |
| `threshold_sel` | Threshold Selection | mean residual life · stability | `threshold` |

### 2D — MIXTURE MODELS (7 fns)
**Module:** `src/tests/mixture.js`

| `gmm` | Gaussian Mixture | EM · k components · BIC | `cluster` |
| `lpa` | Latent Profile Analysis | class-varying σ² · EM | `cluster` |
| `mix_reg` | Mixture of Regressions | latent classes · EM | `scatterfit` |
| `switch_reg` | Switching Regression | threshold · regime change | `scatterfit` |
| `moe` | Mixture of Experts | softmax gate · weighted LS | `scatterfit` |
| `npmixture` | Nonparametric Mixture | KDE EM · Benaglia | `histogram` |

### 2E — GAM (9 fns)
**Module:** `src/tests/gam.js`

| `gam_backfitting` | GAM Backfitting | smooth terms · effective df | `scatterfit` |
| `gam_spline` | GAM Spline | penalized · df·λ | `scatterfit` |
| `gam_interact` | GAM Interaction | tensor product smooth | `scatterfit` |
| `p_spline` | P-Spline | equally-spaced knots · penalty | `scatterfit` |
| `gam_anova` | GAM ANOVA | model comparison · F-test | `barci` |

### 2F — FUNCTIONAL DATA ANALYSIS (7 fns)
**Module:** `src/tests/fda.js`

| `fpca` | Functional PCA | eigenfunctions · scores · % var | `scree` |
| `fda_mean` | Functional Mean | pointwise mean + CI band | `scatterfit` |
| `sofr` | Scalar-on-Function Reg. | β(t) coefficient function | `scatterfit` |
| `fda_cluster` | Functional Clustering | k-means on scores | `scatterfit` |
| `f_reg` | Functional Regression | function-on-scalar | `scatterfit` |

---

## Batch 3: SPATIAL & SPATIOTEMPORAL (17 fns)

### 3A — SPATIAL STATISTICS (8 fns)
**Module:** `src/tests/spatial.js`

| `moransi` | Moran's I | spatial autocorrelation · p-value | `heatmap` |
| `gearyc` | Geary's C | local spatial association | `heatmap` |
| `variogram` | Semivariogram | spatial dependence · sill · range | `variogram` |
| `kriging` | Ordinary Kriging | BLUE · spatial prediction | `heatmap` |
| `idw` | IDW Interpolation | inverse-distance weighted | `heatmap` |
| `ripleysk` | Ripley's K | CSR envelope · clustering | `envelope` |
| `spatial_error` | Spatial Error Model | SAR error · MLE | `scatterfit` |
| `spatial_lag` | Spatial Lag Model | SAR lag · ρ · spillover | `scatterfit` |

### 3B — SPATIAL ECONOMETRICS (4 fns)
**Module:** `src/tests/spatialEconometric.js`

| `sdm` | Spatial Durbin | y=ρWy+Xβ+WXθ | `scatterfit` |
| `spatial_panel` | Spatial Panel FE | FE-SAR · within-demean · MLE | `scatterfit` |
| `spatial_hausman` | Spatial Hausman | FE vs RE comparison | `barci` |
| `direct_indirect` | Direct/Indirect Effects | spillover decomposition | `barci` |

### 3C — SPATIOTEMPORAL (5 fns)
**Module:** `src/tests/spatialTemporal.js`

| `star` | STAR Model | space-time autoregressive | `scatterfit` |
| `gstar` | GSTAR Model | generalized STAR | `scatterfit` |
| `st_interact` | Space-Time Interaction | Knorr-Held · BYM | `heatmap` |
| `st_moran` | ST Moran | spatiotemporal autocorrelation | `histogram` |
| `st_forecast` | ST Forecast | iterated prediction | `timeseries` |

---

## Batch 4: ECONOMETRICS (15 fns)

**Module:** `src/tests/econometric.js`

| `tobit` | Tobit Regression | censored normal · MLE | `scatterfit` |
| `heckman` | Heckman Selection | selection model · IMR | `scatterfit` |
| `biprobit` | Bivariate Probit | ρ · joint decision · MLE | `scatterfit` |
| `panel_fe` | Panel Fixed Effects | within estimator · LSDV | `scatterfit` |
| `panel_re` | Panel Random Effects | Swamy-Arora FGLS | `scatterfit` |
| `hausman` | Hausman Test | FE vs RE · χ² | `barci` |
| `arellano_bond` | Arellano-Bond GMM | difference GMM · AR(2) · Sargan | `scatterfit` |
| `sur` | Seemingly Unrelated Reg. | multiple equations · Σ | `scatterfit` |
| `three_sls` | 3SLS | system IV · Σ | `scatterfit` |
| `gmm` | GMM | Hansen J · efficient 2-step | `scatterfit` |
| `coint_eg` | Engle-Granger Cointegration | ADF on residuals · MacKinnon | `scatterfit` |

**Config needed:** `panelIdVar`, `panelTimeVar`, `selectVar`, `zVars`, `lags`.

---

## Batch 5: STOCHASTIC, PGM, SEM, CAUSAL DISCOVERY

### 5A — STOCHASTIC MODELS (12 fns)
**Module:** `src/tests/stochastic.js`

| `markov_chain` | Markov Chain | transition matrix · stationary dist | `heatmap` |
| `poisson_proc` | Poisson Process | arrival rate · interval test | `histogram` |
| `brownian` | Brownian Motion | random walk · variance ratio | `timeseries` |
| `ou` | Ornstein-Uhlenbeck | mean reversion · θ estimation | `timeseries` |
| `jump_diff` | Jump Diffusion | Poisson jumps · MLE | `timeseries` |
| `regime_switch` | Regime Switching | HMM · Baum-Welch · smoothed | `timeseries` |
| `heston` | Heston Model | stochastic vol · κ,θ,ξ,ρ | `timeseries` |
| `sabr` | SABR Model | stochastic αβρ | `histogram` |
| `vasicek` | Vasicek | mean-reverting rates | `timeseries` |

### 5B — PROBABILISTIC GRAPHICAL MODELS (12 fns)
**Module:** `src/tests/pgm.js`

| `hill_climb` | Hill Climbing | BIC/BDeu · DAG learning | `heatmap` |
| `markov_blanket` | Markov Blanket | feature selection | `network` |
| `belief_prop` | Belief Propagation | sum-product · evidence | `histogram` |
| `d_sep` | D-Separation | conditional independence | `histogram` |
| `variable_elim` | Variable Elimination | factor product-sum | `histogram` |
| `junction_tree` | Junction Tree | triangulation · message passing | `histogram` |
| `cpdag` | CPDAG | essential graph · equivalence | `network` |

### 5C — SEM (ADDITIONAL, already partially wired)
**Modules:** `src/tests/sem.js`

Already wired: core SEM. **Unwired key functions:**
| `sem_multigroup` | Multi-Group SEM | measurement invariance · ΔCFI | `barci` |
| `measurement_inv` | Measurement Invariance | configural/metric/scalar | `barci` |
| `ordinal_sem` | Ordinal SEM | WLSMV · polychoric | `barci` |
| `bifactor` | Bifactor Model | general + specific factors | `loading` |
| `lgm` | Latent Growth Model | intercept/slope factors | `scatterfit` |

### 5D — CAUSAL DISCOVERY (7 fns)
**Module:** `src/tests/causalDiscovery.js`

| `pc_algorithm` | PC Algorithm | constraint-based · skeleton | `network` |
| `lingam` | LiNGAM | ICA · non-Gaussian · acyclic | `network` |
| `fci` | FCI Algorithm | latent variables · PAG | `network` |
| `collider` | Collider Detection | v-structures · orientation | `histogram` |
| `partial_corr_test` | Partial Corr. Test | conditional independence · Fisher z | `histogram` |

---

## Batch 6: DEEP LEARNING & DIMENSIONALITY REDUCTION

### 6A — DEEP LEARNING (5 fns)
**Module:** `src/tests/deepLearning.js`

| `autoenc` | Autoencoder | reconstruction · latent space | `scatter` |
| `vae` | Variational AE | ELBO · latent bottleneck | `scatter` |
| `gan` | GAN | generator · discriminator loss | `histogram` |
| `attention` | Attention | Q,K,V · scaled dot-product | `heatmap` |
| `transformer` | Transformer Block | self-attention · FFN · layer norm | `histogram` |

### 6B — DIMENSIONALITY REDUCTION (4 fns)
**Module:** `src/tests/dimReduction.js`

| `tsne` | t-SNE | perplexity · KL divergence | `scatter` |
| `isomap` | Isomap | geodesic · shortest path | `scatter` |
| `lle` | LLE | neighborhood reconstruction | `scatter` |
| `umap` | UMAP | topological · fuzzy simplicial | `scatter` |

---

## Batch 7: MODEL INTERPRETABILITY, SIGNAL, PHYLOGENETICS

### 7A — MODEL INTERPRETABILITY (7 fns)
**Module:** `src/tests/interpretability.js`

| `shap` | SHAP Values | Shapley sampling · feature importance | `barci` |
| `lime` | LIME | local surrogate · weighted LS | `barci` |
| `pdp` | Partial Dependence | marginal effect · grid | `scatterfit` |
| `perm_imp` | Permutation Importance | drop-column · nRepeats | `barci` |
| `ale` | Accumulated Local Effects | correlated features · bins | `scatterfit` |
| `feature_interact` | Feature Interaction | H-statistic · pairwise | `barci` |
| `global_surrogate` | Global Surrogate | decision tree proxy | `barci` |

### 7B — SIGNAL PROCESSING (20 fns)
**Module:** `src/tests/signal.js`

| `fft` | FFT | complex spectrum · magnitude | `spectrum` |
| `psd` | Power Spectrum | Welch · periodogram | `spectrum` |
| `autocorr` | Autocorrelation | lag plot | `correlogram` |
| `crosscorr` | Cross-Correlation | time delay detection | `correlogram` |
| `wavelet` | Continuous Wavelet | Morlet · scalogram | `spectrogram` |
| `spectrogram` | Spectrogram | STFT · time-frequency | `spectrogram` |
| `coherence` | Coherence | magnitude-squared · phase | `spectrum` |
| `cepstrum` | Cepstrum | quefrency · formants | `histogram` |
| `mel` | Mel Spectrogram | auditory filterbank | `spectrogram` |
| `hilbert` | Hilbert Transform | analytic signal · envelope | `timeseries` |

### 7C — PHYLOGENETICS (8 fns)
**Module:** `src/tests/phylogenetics.js`

| `pic` | Phylogenetic Independent Contrasts | Felsenstein · trait correlation | `scatterfit` |
| `pagels_lambda` | Pagel's λ | phylogenetic signal · ML | `histogram` |
| `blomberg_k` | Blomberg's K | trait conservatism · variance ratio | `histogram` |
| `phylo_signal` | Phylogenetic Signal | λ/K · permutation test | `histogram` |
| `pgls` | PGLS | phylogenetic GLS · λ | `scatterfit` |
| `diversification` | Diversification Rate | Yule · speciation | `histogram` |
| `ou_model` | OU Trait Model | Ornstein-Uhlenbeck · α,σ² | `histogram` |

---

## Batch 8: REMAINING MODULES (all ~20 smaller ones)

### 8A — COMPOSITIONAL (5 fns)
**Module:** `src/tests/compositional.js`
| `clr` | CLR Transform | geometric mean · centered | `histogram` |
| `ilr` | ILR Transform | orthonormal basis · sequential | `histogram` |
| `comp_reg` | Compositional Regression | ILR + OLS · SE | `scatterfit` |

### 8B — ABM & AGENT-BASED (8 fns)
**Module:** `src/tests/abm.js`
| `moran_i_abm` | Agent Moran I | spatial autocorrelation | `histogram` |
| `network_diff` | Network Diffusion | threshold · cascade | `histogram` |
| `segregation` | Segregation Index | dissimilarity · isolation | `barci` |

### 8C — BANDIT & AB TESTING (combined)
**Modules:** `src/tests/bandit.js` + `src/tests/abTesting.js`
| `thompson` | Thompson Sampling | Beta posterior · regret | `histogram` |
| `linucb` | LinUCB | contextual bandit · ridge | `histogram` |
| `dqn` | Deep Q-Network | RL · replay buffer | `histogram` |
| `multiarm` | Multi-Arm Bandit | Beta · Bayesian | `histogram` |
| `ab_sample` | A/B Sample Size | proportion · MDE | `histogram` |

### 8D — COPULA, CONJOINT, CIRCULAR
**Modules:** `copula.js`, `conjoint.js`, `circular.js`

| `t_copula` | t-Copula | dependence · tail · MLE | `scatterfit` |
| `conjoint_analysis` | Conjoint Analysis | part-worth · choice sim | `barci` |
| `circ_stats` | Circular Statistics | mean angle · von Mises | `circular` |
| `circ_lin_reg` | Circular-Linear Regression | directional outcome | `scatterfit` |

### 8E — ECOLOGY, GENETICS, BIOINFORMATICS
**Modules:** `ecology.js`, `genetics.js`, `bioinformatics.js`

| `adonis` | PERMANOVA | R² · permutation · Bray-Curtis | `barci` |
| `rarefaction` | Rarefaction | species richness · extrapolation | `scatterfit` |
| `polygenic` | Polygenic Prediction | ridge · LD · PGS | `histogram` |
| `gwas` | GWAS | SNP · β · SE · p | `manhattan` |

### 8F — DISTANCE, MDS, ORDINATION
| `dist_matrix` | Distance Matrix | Euclidean · Manhattan · Bray | `heatmap` |
| `partial_dist_corr` | Partial Distance Correlation | U-centered · residuals | `scatterfit` |
| `mds_classical` | Classical MDS | eigenvalue · strain | `scatter` |
| `mds_nonmetric` | Non-Metric MDS | isotonic regression · stress | `scatter` |
| `mds_sammon` | Sammon Mapping | nonlinear · gradient descent | `scatter` |
| `procrustes` | Procrustes | rotation · scaling · m² | `scatter` |

### 8G — NLP, TEXT, TENSOR
| `word2vec` | Word2Vec Skip-Gram | negative sampling · embeddings | `scatter` |
| `glove` | GloVe | weighted LSQ · co-occurrence | `scatter` |
| `dependency_parse` | Dependency Parse | tree · head indices | `histogram` |
| `svd_embed` | SVD Embeddings | truncated SVD · PPMI | `scatter` |
| `tensor_cp` | CP Decomposition | PARAFAC · ALS | `scree` |
| `tensor_complete` | Tensor Completion | low-rank · missing entries | `histogram` |

### 8H — OPTIMIZATION, RELIABILITY, ROBUST
| `nelder_mead` | Nelder-Mead | simplex · derivative-free | `histogram` |
| `bfgs` | BFGS | quasi-Newton · gradient | `histogram` |
| `pso` | Particle Swarm | global · velocity update | `scatter` |
| `reliability_mtbf` | MTBF / Reliability | exponential · Weibull · F(t) | `histogram` |
| `robust_reg` | Robust Regression | Huber · Tukey · IRLS | `scatterfit` |

### 8I — REMAINING SMALLER MODULES
| Module | Key fn | Tree ID | Chart |
|--------|--------|---------|-------|
| `discrete.js` | Multinomial Logit | `mlogit` | `barci` |
| `experimental.js` | DOE / Split-Plot | `doe` | `barci` |
| `fitting.js` | Curve Fitting (nls) | `nls` | `scatterfit` |
| `info.js` | Entropy / Mutual Info | `entropy` | `barci` |
| `inequality.js` | Gini / Lorenz | `gini` | `lorenz` |
| `linkage.js` | Record Linkage | `record_link` | `barci` |
| `missing.js` | Imputation (MICE) | `mice` | `histogram` |
| `neural.js` | Neural Primitives | `nn_layer` | `histogram` |
| `optimization.js` | Gradient Descent / SA/GA | `gd` | `timeseries` |
| `outlier.js` | LOF / Isolation Forest | `lof` | `scatter` |
| `pls.js` | PLS/Sparse PLS/RDA | `pls` | `scree` |
| `pointProcess.js` | Hawkes / Self-Exciting | `hawkes` | `timeseries` |
| `preprocessing.js` | Scale / Encode / Impute | `preprocess` | `histogram` |
| `privacy.js` | Differential Privacy | `dp` | `histogram` |
| `raMonitor.js` | RA CUSUM / VLAD / SPRT | `ra_monitor` | `timeseries` |
| `recommendation.js` | Collaborative Filter / MF | `cf` | `heatmap` |
| `sced.js` | Tau-U / PND / PEM / NAP | `sced` | `scatter` |
| `sensitivity.js` | Sobol / Delta | `sobol` | `barci` |
| `sequential.js` | Pocock / OBF | `pocock` | `timeseries` |
| `smc.js` | Particle Filter / PMCMC | `smc` | `timeseries` |
| `spc.js` | X-bar / CUSUM / EWMA | `spc` | `timeseries` |
| `survey.js` | Survey Weights / Post-Strat | `survey` | `barci` |
| `symbolic.js` | Symbolic PCA / Regression | `sym_pca` | `scatterfit` |
| `text.js` | TF-IDF / Topic (LDA) | `lda` | `barci` |
| `trials.js` | Sample Size · Randomization | `trial_design` | `histogram` |

---

## Implementation Notes

### File-by-file changes
1. **`src/config/tree.js`** — Add new categories and test entries for each batch
2. **`src/config/chartMap.js`** — Add `id → chartType` mapping for every new test ID
3. **`src/config/methodNotes.js`** — Add `{ description, usage, assumptions, cite }` for key methods (prioritize survival, timeseries, finance, clinical first)
4. **`src/components/InferencePanel.jsx`** — 
   - Add imports for each module
   - Add `useState` config controls for each test's parameters (e.g., `survTimeVar`, `tsP`)
   - Add `if (a==='...')` branches in the `useMemo` result computation
   - Wire group/var selectors to use appropriate `ds.numeric`/`ds.categorical` columns
5. **`src/components/InferenceConfig.jsx`** — Add input components for each new config parameter
6. **`src/components/charts.jsx`** — Add new chart types as needed: `survival` (KM step), `correlogram`, `timeseries`, `decomposition`, `impulse`, `blandaltman`, `roc`, `calibration`, `decisioncurve`, `dosecurve`, `volcano`, `returnlevel`, `threshold`, `envelope`, `variogram`, `spectrum`, `spectrogram`, `lorenz`, `manhattan`, `circular`

### Config UI pattern
Each test gets a set of parameter inputs (dropdowns for column selection, number inputs for numeric params). The existing pattern in `InferenceConfig.jsx` is a large conditional render per active test ID. New tests follow the same pattern.

### Racing conditions / state complexity
The `useMemo` dependency array in `InferencePanel.jsx:516-529` already has ~60 dependencies. Adding hundreds more will impact performance. Consider:
- **Option A (immediate):** Add deps inline and accept the cost (simplest, works for now)
- **Option B (follow-up):** Extract per-category test runner into sub-hooks (e.g., `useSurvivalInference`, `useTimeseriesInference`) to isolate dependency arrays

### Priority ordering
Batches are ordered by user demand likelihood:
1. Survival + Time Series + Finance — most broadly useful
2. Clinical + Dose-Response + Extreme + Mixture + GAM + FDA — specialized biostat
3. Spatial + Spatial Econometric + Spatiotemporal — geospatial
4. Econometrics — panel/GMM/tobit
5. Stochastic + PGM + SEM-extras + Causal Discovery
6. Deep Learning + Dim Reduction
7. Interpretability + Signal + Phylogenetics
8. Everything else (20+ smaller modules)

Each batch is independently shippable.

### Validation
- After each batch, run `npm test` (4,762+) to ensure no regressions
- Verify each new test renders in the UI by selecting it in the navigator
- Verify each test produces a result object with expected shape
- Verify chart auto-generation picks the correct default chart

### Risks
- **Chart gap:** Some new modules need chart types not yet in `charts.jsx`. The rendering will fall back to `InferenceResults` text-only display. Add chart types incrementally.
- **Data shape mismatch:** Many advanced methods (survival, timeseries, panel, spatial) require data in specific long/wide formats. The UI needs to communicate this to users and handle format detection.
- **Heavy computation:** Methods like t-SNE, GMM, VAE, GAN can be slow on large datasets. Consider wrapping in Web Workers (like existing `resampleAsync.js`).

---

## Quick Reference: All Planned Tree IDs (~200+ new entries)

### Category Layout
```js
// NEW CATEGORIES to add to TREE
{ cat: "SURVIVAL ANALYSIS",      color: "#...", tests: [ km, coxph, par_surv, finegray, frailtycox, tvc, nelson_aalen, rmst, cure, multistate, rsf, joint ] }
{ cat: "TIME SERIES",             color: "#...", tests: [ adf, acf, pacf, arima, autoarima, holt_winters, seasonal, var, granger, chow, garch, egarch, kalman, johansen, structbreak, forecast_recon, markov_switch, changepoint, forecast_eval ] }
{ cat: "FINANCE",                 color: "#...", tests: [ capm, sharpe, sortino, var_hist, var_param, max_drawdown, ff3, carhart4, bs, greeks, implied_vol, binom_tree, mc_option ] }
{ cat: "CLINICAL DIAGNOSTICS",    color: "#...", tests: [ bland_altman, diagnostic, lr, nri, weighted_kappa, fleiss_kappa, kripp_alpha, cliffs_delta, rank_biserial, hosmer_lemeshow, net_benefit, brier, haybittle, fisher_comb, paf ] }
{ cat: "DOSE-RESPONSE",           color: "#...", tests: [ fourpl, ec50_ic50, volcano, log2fc, modt ] }
{ cat: "EXTREME VALUE",           color: "#...", tests: [ gev, gpd, return_level, hill, pot, threshold_sel ] }
{ cat: "MIXTURE MODELS",          color: "#...", tests: [ gmm_mix, lpa, mix_reg, switch_reg, moe, npmixture ] }
{ cat: "GAMs",                    color: "#...", tests: [ gam_backfitting, gam_spline, gam_interact, p_spline, gam_anova ] }
{ cat: "FUNCTIONAL DATA",         color: "#...", tests: [ fpca, fda_mean, sofr, fda_cluster, f_reg ] }
{ cat: "SPATIAL STATISTICS",      color: "#...", tests: [ moransi, gearyc, variogram, kriging, idw, ripleysk, spatial_error, spatial_lag ] }
{ cat: "SPATIAL ECONOMETRICS",    color: "#...", tests: [ sdm, spatial_panel, spatial_hausman, direct_indirect ] }
{ cat: "SPATIOTEMPORAL",          color: "#...", tests: [ star, gstar, st_interact, st_moran, st_forecast ] }
{ cat: "ECONOMETRICS",            color: "#...", tests: [ tobit, heckman, biprobit, panel_fe, panel_re, hausman, arellano_bond, sur, three_sls, gmm, coint_eg ] }
{ cat: "STOCHASTIC MODELS",       color: "#...", tests: [ markov_chain, poisson_proc, brownian, ou, jump_diff, regime_switch_stoch, heston, sabr, vasicek ] }
{ cat: "GRAPHICAL MODELS",        color: "#...", tests: [ hill_climb, markov_blanket, belief_prop, d_sep, variable_elim, junction_tree, cpdag_pgm ] }
{ cat: "SEM EXTENSIONS",          color: "#...", tests: [ sem_multigroup, measurement_inv, ordinal_sem, bifactor, lgm ] }
{ cat: "CAUSAL DISCOVERY",        color: "#...", tests: [ pc_algorithm, lingam, fci, collider, partial_corr_test ] }
{ cat: "DEEP LEARNING",           color: "#...", tests: [ autoenc, vae, gan_dl, attention_dl, transformer ] }
{ cat: "DIM. REDUCTION",          color: "#...", tests: [ tsne, isomap, lle, umap ] }
{ cat: "INTERPRETABILITY",        color: "#...", tests: [ shap, lime, pdp, perm_imp, ale, feature_interact, global_surrogate ] }
{ cat: "SIGNAL PROCESSING",       color: "#...", tests: [ fft, psd, autocorr, crosscorr, wavelet_cwt, spectrogram, coherence_sig, cepstrum, mel, hilbert ] }
{ cat: "PHYLOGENETICS",           color: "#...", tests: [ pic, pagels_lambda, blomberg_k, phylo_signal, pgls, diversification, ou_model ] }
{ cat: "COMPOSITIONAL",           color: "#...", tests: [ clr, ilr, comp_reg ] }
{ cat: "ABM & AGENTS",            color: "#...", tests: [ moran_i_abm, network_diff, segregation ] }
{ cat: "BANDITS & AB",            color: "#...", tests: [ thompson, linucb, dqn, multiarm, ab_sample ] }
{ cat: "COPULA & CIRCULAR",       color: "#...", tests: [ t_copula, conjoint_analysis, circ_stats, circ_lin_reg ] }
{ cat: "ECOLOGY & GENETICS",      color: "#...", tests: [ adonis, rarefaction, polygenic, gwas ] }
{ cat: "DISTANCE & MDS",          color: "#...", tests: [ dist_matrix, partial_dist_corr, mds_classical, mds_nonmetric, mds_sammon, procrustes ] }
{ cat: "NLP & TEXT",              color: "#...", tests: [ word2vec, glove, dependency_parse, svd_embed ] }
{ cat: "TENSOR",                  color: "#...", tests: [ tensor_cp, tensor_complete ] }
{ cat: "OPTIMIZATION",            color: "#...", tests: [ nelder_mead, bfgs, pso ] }
{ cat: "RELIABILITY & ROBUST",    color: "#...", tests: [ reliability_mtbf, robust_reg ] }
{ cat: "MORE TOOLS",              color: "#...", tests: [ mlogit, doe, nls, entropy, gini, record_link, mice, nn_layer, gd, lof, pls_tool, hawkes, preprocess, dp, ra_monitor, cf, sced, sobol, pocock, smc_tool, spc_tool, survey_tool, sym_pca, lda, trial_design ] }
```

---

## Execution Order
1. Start with **Batch 1** (Survival, Time Series, Finance) — highest user value
2. Proceed sequentially through Batches 2–8
3. After each batch: run `npm test`, manually smoke-test 2–3 methods from the batch
4. Deploy batches independently to staging for user feedback before proceeding
