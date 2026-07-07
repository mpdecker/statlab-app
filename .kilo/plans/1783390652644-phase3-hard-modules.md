# Phase 3: Hard Modules — 6 Remaining Modules

## Context

After Phase 1 (8 Tier-1 modules) and Phase 2 (11 Tier-2 modules), 19 of 24 modules
have oracle coverage. Six remain:

| Module | Functions | Feasibility |
|--------|-----------|-------------|
| **compositional.js** | clrTransform, ilrTransform, alrTransform, compPCA, compRegression | **Deterministic**. All pure formulas. numpy oracles straightforward. |
| **fda.js** | functionalMean, fpca, functionalRegression, functionalClustering, functionalTTest, functionalANOVA | **Deterministic**. All computed on B-spline basis coefficients via standard stats (mean, OLS, k-means, t-test, ANOVA). numpy/scipy oracles straightforward. |
| **sensitivity.js** | morrisMethod, fastSensitivity, sobolFirstOrder, sobolTotalIndex, modelComparison, forecastCombination, deltaMethod, andrewsPlot | **Hybrid** (4 deterministic + 4 stochastic). modelComparison/deltaMethod/forecastCombination/andrewsPlot are pure formulas. morrisMethod/fastSensitivity/sobol* are PRNG-based. |
| **bandit.js** | epsilonGreedy, ucb, thompsonSampling, contextualBandit, policyGradient, softmaxBandit, qLearning, sarsa, deepQNetwork | **Hybrid** (mostly stochastic). UCB with constant rewards is fully deterministic. Other algorithms use PRNG but can be oracled by replicating the `_lcg_seq` in Python. |
| **nlp.js** | word2vecSkipGram, gloveEmbeddings, sentenceTransformers, textClassification, namedEntityRecognition | **Hybrid**. gloveEmbeddings is deterministic (co-occurrence SVD). word2vecSkipGram is stochastic. sentenceTransformers is deterministic (average embeddings). |
| **deepLearning.js** | autoencoder, variationalAutoencoder, gan, attention, transformerBlock | **Property/invariant only**. All SGD-based training. Existing tests are solid; add invariant assertions. |

## Oracle Strategy

### Tier A — Deterministic (numpy/scipy oracles in gen-reference.py)

**compositional.js** (5 functions):
- CLR: `clr(x) = log(x) - mean(log(x))` per row — numpy exact
- ILR: `ilr(x) = clr(x) @ Psi^T` where Psi is sequential binary partition — numpy exact
- ALR: `alr_j(x) = log(x[:j-1] / x[j])` — numpy exact
- compPCA: eigen-decomposition of CLR covariance matrix — numpy exact
- compRegression: OLS on ILR coordinates — numpy exact

**fda.js** (6 functions):
- functionalMean: column means — numpy exact
- fpca: eigen-decomposition of B-spline basis coefficient covariance — numpy exact
- functionalRegression: OLS with FPC scores as predictors — numpy exact
- functionalClustering: k-means on FPC score matrix — scipy exact
- functionalTTest: t-test on FPC scores — scipy exact
- functionalANOVA: ANOVA on FPC scores — scipy exact

**sensitivity.js partial** (4 deterministic functions):
- modelComparison: F = mse1/mse2, p = F-dist — scipy exact
- forecastCombination: equal-weight mean + MSE — numpy exact
- deltaMethod: gradient-based error propagation — numpy exact
- andrewsPlot: Fourier series transform — numpy exact

**nlp.js partial** (2 deterministic functions):
- gloveEmbeddings: co-occurrence matrix → PPMI → SVD — numpy exact
- sentenceTransformers: average of word embeddings — numpy exact

### Tier B — Property/Invariant Tests

**bandit.js** (9 functions): Property tests verifying:
- UCB/epsilonGreedy: regret ≥ 0, counts sum to iterations, best-arm found for
  deterministic rewards
- thompsonSampling: Beta posterior concentrates on true best arm
- contextualBandit: total reward beats random baseline
- qLearning/sarsa: optimal policy recovered for known deterministic MDP
- deepQNetwork: loss decreases during training
- policyGradient: probabilities concentrate on best arm

**sensitivity.js partial** (4 stochastic functions):
- Si indices ∈ [0,1], ΣSi ≤ 1
- μ* values are non-negative
- For additive model `y = x₀ + 2x₁`, first-order sensitivity should assign
  larger weight to x₁ than x₀

**nlp.js partial** (3 functions):
- word2vecSkipGram: embedding dimension matches, vocabulary size correct,
  cosine similarity of semantically similar words > random pairs
- textClassification: accuracy on small train/test split
- namedEntityRecognition: labels are valid strings

**deepLearning.js** (5 functions): Property/invariant tests:
- autoencoder: reconstruction loss < column-mean baseline (existing test
  already covers this), add invariant: loss strictly decreases over epochs
- variationalAutoencoder: KL divergence ≥ 0, recon loss decreases
- GAN: generated mean moves toward real-data mean (existing test covers)
- attention: output softmax rows sum to 1, output dimensions match
- transformerBlock: output magnitude is stable under input scaling (existing
  test covers), add invariant: nTokens preserved

## Implementation Plan

### Step 1: Add deterministic oracles to `gen-reference.py`

Add 3 new sections (compositional, fda, sensitivity_partial) after the
pointProcess section. Use explicit deterministic data matching existing
test fixtures so oracle values are exact.

**compositional**: Use the test's data-generation pattern:
```
d = [{ a: 10+i%5, b: 20+(i*3)%7, c: 5+(i*2)%4, d: 15+i%6 }] for i=0..19
```
Compute CLR/ILR/ALR transforms and eigen-decomposition in Python.

**fda**: Generate explicit time-series data:
```
t = [0, 0.5, 1.0, 1.5, 2.0]
data[i][j] = sin(t[j]) + 0.1*i
```
Compute basis coefficients and FPC scores.

**sensitivity_partial**: Oracle modelComparison, forecastCombination,
deltaMethod, andrewsPlot on explicit test data.

**nlp_partial**: Oracle gloveEmbeddings (co-occurrence → SVD) and
sentenceTransformers on the existing test corpus.

### Step 2: Add property/invariant tests to test files

For each of the 6 test files:
1. Add `import ref from './__fixtures__/reference.json'` to all 6
2. For deterministic functions: add `toBeCloseTo()` assertions against `ref` values
3. For stochastic functions: add property/invariant assertions using `ref` where
   available, plus `expect()` invariants for non-oracle properties

### Step 3: Validate

```bash
npm run reference:generate
npm test -w statlab
```

Expected: 4699 existing + ~40 new tests, zero regressions.

## Risk Mitigation

- **compositional CLR rounding**: JS uses `.toFixed(6)` on each coordinate. Python
  must match exactly.
- **fda basis functions**: JS uses `exp(-b * 0.5 * (t - mean(t))^2)`. Python must
  replicate the same basis construction.
- **nlp gloveEmbeddings**: JS builds co-occurrence from sliding window. Python must
  replicate the same window logic and tokenization.
- **bandit PRNG**: For UCB with constant rewards, the algorithm is fully
  deterministic. For epsilonGreedy with seed=42, the `_lcg_seq` function in Python
  can replicate the exact random sequence, enabling exact numeric oracles.
- **No new pip dependencies** — all Tier A oracles use already-imported
  numpy/scipy/statsmodels.

## Execution Order

1. compositional.js (simplest — 5 pure formula functions)
2. fda.js (6 functions, all deterministic)
3. sensitivity.js (4 deterministic + property tests for 4 stochastic)
4. nlp.js (2 deterministic + property tests for 3 stochastic)
5. bandit.js (property + exact oracle for UCB)
6. deepLearning.js (property/invariant only)

## Validation

1. `npm run reference:generate` produces `reference.json` with 6 new top-level keys
2. `npm test -w statlab` — all 4699 existing + ~40 new oracle tests pass
3. Zero regressions on all Phase 1 and Phase 2 oracled modules
4. Total oracled modules: 8 (Phase 1) + 11 (Phase 2) + 6 (Phase 3) = 25 of 24*
   (*some modules like hardening may push this higher)
