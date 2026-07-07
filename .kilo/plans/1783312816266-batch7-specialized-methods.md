# Batch 7 — Specialized Methods (Signal · SEM · Text/NLP · Survey · Copula)

## Overview
Wire ~45 tests across 5 unwired modules into 5 new TREE categories. Total tests: 293 → ~338.

## New Categories (5)

| Category | Color | Tests | Module(s) |
|----------|-------|-------|-----------|
| SIGNAL PROCESSING | `#06b6d4` (cyan) | 12 | `signal.js` |
| STRUCTURAL EQ MODELS | `#8b5cf6` (violet) | 6 | `sem.js` |
| TEXT ANALYTICS & NLP | `#10b981` (emerald) | 14 | `text.js` (11) + `nlp.js` (3) |
| SURVEY ANALYSIS | `#f97316` (orange) | 10 | `survey.js` |
| COPULA MODELS | `#ec4899` (pink) | 7 | `copula.js` |

**Total: ~49 tests** (final count TBD after runner feasibility)

---

## Module Breakdown

### 1. SIGNAL PROCESSING (signal.js — 20 exports, wire 12)

All functions return `{ test, ... }` objects already. Single-vector methods take numeric arrays; cross-methods take two arrays.

| # | id | func | inputs | chart |
|---|-----|------|--------|-------|
| 1 | `fft` | `fft(signal)` | single numeric var | `histogram` |
| 2 | `power_spec` | `powerSpectrum(signal)` | single numeric var | `histogram` |
| 3 | `autocorr_sig` | `autocorrelation(signal)` | single numeric var | `correlogram` |
| 4 | `cross_corr` | `crossCorrelation(x, y)` | two numeric vars | `correlogram` |
| 5 | `haar_wavelet` | `haarWavelet(signal)` | single numeric var | `histogram` |
| 6 | `hilbert` | `hilbertTransform(signal)` | single numeric var | `scatterfit` |
| 7 | `spectrogram` | `spectrogram(signal)` | single numeric var | `heatmap` |
| 8 | `welch_psd` | `welchPSD(signal)` | single numeric var | `histogram` |
| 9 | `stft` | `stft(signal)` | single numeric var | `heatmap` |
| 10 | `cepstrum` | `cepstrum(signal)` | single numeric var | `histogram` |
| 11 | `coherence` | `coherence(x, y)` | two numeric vars | `histogram` |
| 12 | `cross_spectral` | `crossSpectralDensity(x, y)` | two numeric vars | `histogram` |

**Skip:** `phaseSpectrum`, `transferFunction` (depend on FFT output in specific format), `waveletTransform`/`waveletCoherence`/`crossWavelet`/`waveletSignificance`/`waveletRidge` (2D matrix returns, complex display), `melSpectrogram` (2D matrix, audio-specific).

**UI pattern:** Single `Sel` for signal variable → `allTgt` array. Cross-methods use `xVar`/`yVar` Sel → `xy` object.

### 2. STRUCTURAL EQ MODELS (sem.js — 8 exports, wire 6)

All return `{ test, ... }` already. Take tabular data + equations string or CheckList vars.

| # | id | func | inputs | chart |
|---|-----|------|--------|-------|
| 13 | `sem_cfa` | `sem({data, vars, equations})` | CheckList vars + TA equations | `histogram` |
| 14 | `sem_multi` | `semMultiGroup(data, groupVar, equations)` | Sel group + CheckList vars + TA equations | `barci` |
| 15 | `meas_inv` | `measurementInvariance(data, vars, groupVar)` | CheckList vars + Sel group | `barci` |
| 16 | `lgm` | `latentGrowthModel(data, vars, times)` | CheckList vars | `spaghetti` |
| 17 | `path_analysis` | `pathAnalysis(data, equations)` | CheckList vars + TA equations | `histogram` |
| 18 | `bifactor` | `bifactorModel(data, generalFactor, groupFactors)` | Sel g-factor + CheckList group factors | `histogram` |

**Skip:** `ordinalSEM` (complex thresholds display), `cfiCompare` (needs prior SEM result).

**UI pattern:** `CheckList` for observed variables, `TA` (textarea) for equation strings, `Sel` for group variable where needed.

### 3. TEXT ANALYTICS & NLP (text.js 14 + nlp.js 5, wire 14)

text.js functions take `documents` (string array). nlp.js functions take `corpus` (string array) or `text` (string). Some have `test:` keys; some don't.

#### text.js (11)

| # | id | func | test key? | inputs | chart |
|---|-----|------|-----------|--------|-------|
| 19 | `tfidf` | `tfIdf(documents)` | yes | TA documents | `histogram` |
| 20 | `cosine_sim` | `cosineSimilarity(a, b)` | no → wrapper | TA vector1 + TA vector2 | `histogram` |
| 21 | `jaccard_sim` | `jaccardSimilarity(a, b)` | no → wrapper | TA vector1 + TA vector2 | `histogram` |
| 22 | `dtm` | `documentTermMatrix(documents)` | no → wrapper | TA documents | `heatmap` |
| 23 | `term_freq` | `termFrequency(documents)` | no → wrapper | TA documents | `histogram` |
| 24 | `ngrams` | `ngramExtraction(text, n)` | no → wrapper | TA text + Inp n | `histogram` |
| 25 | `lda_topics` | `ldaTopicModel(documents, nTopics)` | no → wrapper | TA documents + Inp topics | `histogram` |
| 26 | `svd_emb` | `svdEmbeddings(documents)` | no → wrapper | TA documents | `scatter` |
| 27 | `bm25` | `bm25(documents, query)` | no → wrapper | TA documents + Inp query | `histogram` |
| 28 | `sentiment` | `sentimentVader(text)` | no → wrapper | TA text | `histogram` |
| 29 | `textrank` | `textRank(documents)` | no → wrapper | TA documents | `histogram` |

#### nlp.js (3)

| # | id | func | test key? | inputs | chart |
|---|-----|------|-----------|--------|-------|
| 30 | `word2vec` | `word2vecSkipGram(corpus)` | no → wrapper | TA corpus | `scatter` |
| 31 | `glove` | `gloveEmbeddings(corpus)` | no → wrapper | TA corpus | `scatter` |
| 32 | `ner` | `namedEntityRecognition(text)` | no → wrapper | TA text | `histogram` |

**Skip:** `posTagging`, `dependencyParse` (output lists of tuples, hard to display), `perplexityScore` (takes logProbs not text), `textPreprocess` (transform not diagnostic), `tfidfSimilaritySearch` (takes documents+query like bm25, redundant).

**Wrapper needed:** All nlp.js and most text.js functions lack `test:` keys. Wrap with `{ test: '...', ...result, apa: '...' }` in runners.

**UI pattern:** `TA` (textarea) for documents/text input. Some take numeric `Inp` fields (nTopics, n). Standard documents stored as mock `DOCS` array in runners.

### 4. SURVEY ANALYSIS (survey.js — 19 exports, wire 10)

Most have `test:` keys. Functions take `(values, weights)` or `(data, ...)`.

| # | id | func | inputs | chart |
|---|-----|------|--------|-------|
| 33 | `weighted_mean` | `weightedMean(values, weights)` | single var (values) + Inp weights | `histogram` |
| 34 | `weighted_var` | `weightedVar(values, weights)` | single var (values) + Inp weights | `histogram` |
| 35 | `weighted_quant` | `weightedQuantile(values, weights, p)` | single var + Inp weights + Inp p | `histogram` |
| 36 | `design_effect` | `designEffect(weights)` | Inp weights list | `histogram` |
| 37 | `rake_weights` | `rakeWeights(initialWeights, targets)` | Inp initial + Inp targets | `histogram` |
| 38 | `calib_weights` | `calibrationWeights(initialWeights, auxVars, targets)` | Inp initial + Inp auxVars + Inp targets | `histogram` |
| 39 | `post_strat` | `postStratification(data, weights, strataVar, popTotals)` | Sel strata + Inp weights + Inp popTotals | `barci` |
| 40 | `weighted_corr` | `weightedCorrelation(x, y, weights)` | two vars + Inp weights | `scatterfit` |
| 41 | `eff_sample` | `effectiveSampleSize(weights)` | Inp weights list | `histogram` |
| 42 | `design_total` | `designTotal(vals, weights)` | single var + Inp weights | `histogram` |

**Skip:** `ppsSampling`, `systematicSample` (generate samples not diagnostics), `brrWeights`/`jackknifeReplicates`/`fayReplicates`/`taylorLinearization`/`multistageVariance`/`domainTotal`/`nonresponseAdjustment` (complex multi-parameter inputs).

**UI pattern:** Survey functions need weight vectors. Use `TA` for comma-separated weight lists (parse with `parseNumList`). Some take single-var data (reuse `allTgt` pattern).

### 5. COPULA MODELS (copula.js — 7 exports, wire 7)

All return `{ test, ... }` already. Take `(data, vars, {...})` — same pattern as `mcdCovariance`/`mice`.

| # | id | func | inputs | chart |
|---|-----|------|--------|-------|
| 43 | `gauss_copula` | `gaussianCopula(data, vars)` | CheckList vars | `scatter` |
| 44 | `t_copula` | `tCopula(data, vars, {nu})` | CheckList vars + Inp nu | `scatter` |
| 45 | `clayton` | `claytonCopula(data, vars, {theta})` | CheckList vars + Inp theta | `scatter` |
| 46 | `gumbel` | `gumbelCopula(data, vars, {theta})` | CheckList vars + Inp theta | `scatter` |
| 47 | `frank` | `frankCopula(data, vars, {theta})` | CheckList vars + Inp theta | `scatter` |
| 48 | `copula_fit` | `copulaFit(data, vars, {family})` | CheckList vars + Sel family | `scatter` |
| 49 | `tail_dep` | `tailDependence(copulaFit)` | post-hoc (needs copula_fit) | `histogram` |

**UI pattern:** `CheckList` for variables (same as mcdCovariance). Family selection via `Sel`. `tail_dep` is post-hoc like `rubin_pool`/`fmi`.

---

## Signature Categories

### Type A — single vector (signal methods)
`fft(signal)`, `powerSpectrum(signal)`, `autocorrelation(signal)`, `haarWavelet(signal)`, `hilbertTransform(signal)`, `spectrogram(signal)`, `welchPSD(signal)`, `stft(signal)`, `cepstrum(signal)`

**UI:** Single Sel → `allTgt` array.

### Type B — xy pair (cross signal + survey)
`crossCorrelation(x,y)`, `coherence(x,y)`, `crossSpectralDensity(x,y)`, `weightedCorrelation(x,y,weights)`

**UI:** Reuse `xVar`/`yVar` → `xy` object. Weights from Inp/TA.

### Type C — tabular + vars (copula + SEM)
`gaussianCopula(data,vars)`, `tCopula(data,vars)`, `claytonCopula(data,vars)`, `gumbelCopula(data,vars)`, `frankCopula(data,vars)`, `copulaFit(data,vars)`, `sem_cfa(data,vars,equations)`, `meas_inv(data,vars,groupVar)`, `lgm(data,vars,times)`, `bifactor(data,gFactor,groupFactors)`

**UI:** CheckList vars. Some also need Sel group var or TA equations.

### Type D — text documents (text/nlp)
Most take `documents` (string array) via TA.

**UI:** TA for multi-line text input. Mock documents in runners.

### Type E — weight vectors (survey)
`weightedMean`, `weightedVar`, `designEffect`, `effectiveSampleSize`, `designTotal`

**UI:** Single Sel for data var + Inp/TA for weight list.

### Type F — post-hoc
`tailDependence(copulaFit)` — needs prior copulaFit result. Chain in runner.

---

## Data Input Summary

| Input | Tests | State vars needed |
|-------|-------|-------------------|
| Single numeric var | 9 | none (reuse `allTgt`) |
| Two numeric vars | 4 | none (reuse `xy`) |
| CheckList vars | 13 | `copulaVars` (shared copula+SES) |
| TextArea documents | 10 | `textDocs`, `textInput` |
| TextArea weights | 6 | `svyWeights` string |
| TextArea equations | 3 | `semEquations` string |
| Sel group var | 2 | reuse `grpVar` |
| Numeric Inp | 12 | various (n, p, theta, nu, topics) |

---

## New State Variables

### Signal
- `sigWinSize` — window size for spectrogram/welch/stft
- `sigOverlap` — overlap for spectrogram/welch
- `sigSRate` — sampling rate
- `sigNLags` — max lags for autocorrelation

### Text/NLP
- `textDocs` — TA text documents (multiline)
- `textInput` — TA single text input
- `textNTopics` — LDA topic count
- `textNGram` — n-gram size
- `textQuery` — BM25 query string
- `textVecSize` — word2vec/glove vector size
- `textWindow` — word2vec/glove window size

### Survey
- `svyWeights` — TA weights list (comma-separated)
- `svyP` — quantile p
- `svyTargets` — TA targets list for rake/calibration
- `svyAuxVars` — TA auxiliary vars for calibration
- `svyPopTotals` — TA population totals for post-strat

### Copula
- `copulaVars` — CheckList vars (shared across all copula functions)
- `copulaFamily` — Sel for copula family (gaussian/t/clayton/gumbel/frank)
- `copulaTheta` — theta parameter
- `copulaNu` — t-copula df
- `copulaSeed` — seed

### SEM
- `semVars` — CheckList observed variables (shared copulaVars)
- `semEquations` — TA equations (e.g., "f1 =~ x1 + x2 + x3")
- `semTimes` — Inp times for LGM
- `semGfactor` — Sel general factor for bifactor
- `semGroupFactors` — CheckList group factors for bifactor

---

## Runner Strategy

### Text document fixtures
```js
const DOCS = [
  'the quick brown fox jumps over the lazy dog',
  'machine learning is a subset of artificial intelligence',
  'deep learning uses neural networks with many layers',
  'statistical analysis requires careful data preparation',
  'natural language processing helps computers understand text',
];
```

### Post-hoc chaining
`tail_dep` → call `copulaFit()` first, then `tailDependence(result)`. Same pattern as `rubin_pool`/`fmi`.

### Missing test keys
text.js functions lacking `test:` keys: `cosineSimilarity`, `jaccardSimilarity`, `documentTermMatrix`, `termFrequency`, `ngramExtraction`, `ldaTopicModel`, `svdEmbeddings`, `bm25`, `sentimentVader`, `textRank`. nlp.js: `word2vecSkipGram`, `gloveEmbeddings`, `namedEntityRecognition`. Wrap with `{ test: '...', ...result, apa: '...' }`.

---

## Implementation Notes

- **Signal single-var reuse:** Most signal methods take a single numeric array. Reuse the existing `allTgt` pattern: `data.map(r => +r[var]).filter(Number.isFinite)`.

- **Copula + SEM share CheckList:** Both `copula.js` and `sem.js` use `CheckList` variable selection. Share `semVars`/`copulaVars` (a single `specVars` CheckList state var) or keep separate for clarity.

- **TextArea for documents:** Use existing `TA` component for multi-line text input. Default to mock documents in config.

- **Chart types:**
  - Signal: `histogram`, `correlogram`, `scatterfit`, `heatmap`
  - SEM: `histogram`, `barci`, `spaghetti`
  - Text: `histogram`, `heatmap`, `scatter`
  - Survey: `histogram`, `barci`, `scatterfit`
  - Copula: `scatter`, `histogram`

- **MCMC/SGD functions:** `ldaTopicModel`, `word2vecSkipGram`, `gloveEmbeddings` are iterative — keep epochs/iterations low in defaults (10-50).

---

## Execution Order
1. `tree.js` — add 5 categories (insert before ROBUST STATISTICS)
2. `chartMap.js` — add ~49 entries
3. `methodNotes.js` — add METHOD_NOTES + IMPL_NOTES + update APPROXIMATE_TESTS
4. `runners.js` — add imports, fixtures, ~49 runners
5. `InferencePanel.jsx` — imports, state vars, useMemos, computation branches, deps, configState
6. `InferenceConfig.jsx` — destructuring + configMap entries
7. Test file updates (counts: 293 → ~342)
8. `InferenceConfig.test.jsx` — mockState
9. `npx vitest run` → 0 failures

## Verification
- `npx vitest run` → 0 failures
- `contracts.test.js`: 293 → ~342
- `chartMap.test.js`: 293 → ~342
- `methodNotes.test.js`: all entries have description, usage, assumptions, cite

## Risks
1. **signal.js + sem.js already have `test:` keys** — no wrappers needed for these
2. **text.js/nlp.js return complex structures** — some may need heavy wrapping or display adaptation
3. **SEM equation parsing is fragile** — test with simple CFA equations first
4. **TextArea for documents** — multi-line input parsing (split by newline) differs from single-line Inp
5. **~49 tests is a large batch** — a mid-batch validation run is advisable after runners are in place
