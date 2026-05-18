# StatLab — Social Science Expansion & Visualization Design
**Date:** 2026-05-18
**Approach:** Viz-first — datasets → visualization layer → statistical methods

---

## 1. Overview

Three-phase expansion of StatLab from its current 55-test core into a comprehensive social science analysis platform.

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| 1 | Real social science datasets | 5 new built-in datasets (3 → 8 total) |
| 2 | Visualization layer | Contextual QuickView + Explore tab + ~33 new chart components |
| 3 | Statistical methods | ~32 new tests (55 → ~87 total), 4 new tree categories |

---

## 2. Phase 1 — Real Datasets

All five datasets are fetched once from the [Rdatasets CDN](https://vincentarelbundock.github.io/Rdatasets/datasets.html) during development, trimmed if necessary, and bundled as inline `make*()` functions in `src/data/datasets.js` — preserving the existing offline-capable, deterministic pattern.

### 2.1 Dataset specs

| Key | Source | n | Numeric vars | Categorical vars | Primary use |
|-----|--------|---|-------------|-----------------|-------------|
| `cps` | AER/CPS1985 | 534 | wage, education, experience, age | gender, ethnicity, region, occupation, sector, union, married | wage gap, regression, group comparisons, discrimination |
| `salaries` | carData/Salaries | 397 | salary, yrs.since.phd, yrs.service | rank, discipline, sex | ANOVA, hierarchical regression, gender equity analysis |
| `schools` | nlme/MathAchieve | 2,606 | MathAch, SES, MEANSES | School (id), Minority, Sex | HLM, multilevel ICC, nested designs |
| `sleep` | lme4/sleepstudy | 180 | Reaction, Days | Subject | RM ANOVA, mixed models, growth curves (18 subjects × 10 days) |
| `affairs` | AER/Affairs | 601 | affairs, age, yearsmarried, religiousness, education, rating | gender, children | Poisson, ordinal regression, logistic, count outcomes |

### 2.2 Source URLs

```
https://vincentarelbundock.github.io/Rdatasets/csv/AER/CPS1985.csv
https://vincentarelbundock.github.io/Rdatasets/csv/carData/Salaries.csv
https://vincentarelbundock.github.io/Rdatasets/csv/nlme/MathAchieve.csv
https://vincentarelbundock.github.io/Rdatasets/csv/lme4/sleepstudy.csv
https://vincentarelbundock.github.io/Rdatasets/csv/AER/Affairs.csv
```

### 2.3 Implementation

- Add `makeCPS()`, `makeSalaries()`, `makeSchools()`, `makeSleep()`, `makeAffairs()` to `src/data/datasets.js`
- Each function returns a plain array of row objects (same shape as existing `makeIris()` etc.)
- Add entries to `BUILTIN` map with `label`, `desc`, `numeric`, `categorical`, `make`
- `schools` dataset: rename column `School` → `school_id` to avoid shadowing the dataset key
- `sleep` dataset: `Subject` treated as categorical (18 levels), `Days` and `Reaction` as numeric

---

## 3. Phase 2 — Visualization Layer

### 3.1 Contextual QuickView upgrade

The existing 230px QuickView sidebar gains a 6-icon chart-type switcher row between the label bar and the chart area.

#### Icon row

Six chart types always available: **scatter · histogram · box · violin · bar+CI · heatmap**

Rendered as small icon buttons (28×22px). The active icon is highlighted in `C.accent`. An `AUTO` badge appears when the current selection was set automatically by the active test (not by user override). Clicking any icon sets user override and removes the badge. Switching to a new test resets to auto.

#### Auto-chart selection map

| Test category | Auto chart | Override options |
|---------------|------------|-----------------|
| t-test family (Welch, one-sample, paired, Yuen, sign) | violin | box, bar+CI, strip+mean |
| ANOVA (one-way, Welch, two-way, ANCOVA, Kruskal, Friedman) | violin | box, bar+CI, strip+mean |
| Nonparametric (MWU, Wilcoxon) | violin | box |
| Correlation (Pearson, Spearman, Kendall, partial, point-biserial) | scatter+fit | scatter, bubble |
| Regression (OLS simple/multi/poly/hierarchical, logistic, ordinal, Poisson, NB) | scatter+fit | residual plot |
| Moderation | simple slopes | scatter+fit |
| Mediation | path diagram (existing) | scatter+fit |
| Categorical (χ², Fisher, McNemar, binomial, props) | mosaic | stacked bar, grouped bar |
| PCA / EFA / ω / parallel | loading bars | biplot, scree (existing) |
| Cronbach α / split-half / ICC / κ | heatmap | bar+CI |
| Meta-analysis | forest plot (existing) | — |
| Normality tests | histogram+density | QQ plot (existing) |
| Bootstrap CI | boot histogram (existing) | — |
| Clustering (k-means, hclust, LCA) | silhouette | dendrogram |
| HLM / multilevel | spaghetti plot | caterpillar plot |
| ITS / RDD | ITS line plot | scatter+fit |
| Network / sociogram | sociogram | — |

#### State management

```
// In QuickView component
const [chartMode, setChartMode] = useState(null);  // null = auto
const autoMode = CHART_FOR_TEST[activeTest] ?? 'scatter';
const effectiveMode = chartMode ?? autoMode;

// Reset to auto when active test changes
useEffect(() => setChartMode(null), [activeTest]);
```

`CHART_FOR_TEST` is a new lookup object in `src/config/chartMap.js` mapping every test id → default chart mode string.

#### New chart components in `charts.jsx`

Five new components added to the existing `charts.jsx`:

| Component | Description |
|-----------|-------------|
| `ViolinPlot` | SVG violin with embedded box + median line, per-group, color-mapped |
| `BoxPlot` | SVG box-and-whisker with outlier dots, per-group |
| `BarCI` | Recharts bar chart with ±1 SE / 95% CI error bars, per-group |
| `HistogramDensity` | Recharts bar histogram with KDE density overlay |
| `HeatmapCorr` | SVG correlation heatmap (n×n), color scale −1→+1 |
| `MosaicPlot` | SVG mosaic (proportional rectangles), 2 categorical vars |

The six existing QuickView charts (QuickScatter, PathDiagram, ForestPlot, BootstrapHist, ScreePlot, QQPlot) remain unchanged.

---

### 3.2 Explore tab

#### Entry point

A second tab button `◈ EXPLORE` is added in the sub-header stripe alongside `⊢ INFERENCE`. Switching tabs is controlled by a new `activeTab` state in `App.jsx` (`'inference' | 'explore'`). The InferencePanel and ExplorePanel are conditionally rendered; neither resets state on tab switch.

```jsx
// App.jsx body
<div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
  <SubHeader activeTab={activeTab} setActiveTab={setActiveTab} activeTest={activeTest} />
  {activeTab === 'inference'
    ? <InferencePanel ... />
    : <ExplorePanel data={data} ds={ds} seed={exploreSeed} />}
</div>
```

`exploreSeed` is an object `{ chartType, xVar, yVar, groupVar }` derived from the active inference test and passed down when the user clicks `◈ EXPLORE`. It is read once on ExplorePanel mount, then discarded in favour of local state.

#### ExplorePanel layout

```
┌─ ExplorePanel ──────────────────────────────────────────────┐
│ ┌─ Sidebar (176px) ──┐  ┌─ Canvas (flex 1) ───────────────┐ │
│ │ [seeded-from badge]│  │ [canvas header: title + controls]│ │
│ │                    │  │                                   │ │
│ │ DISTRIBUTION       │  │                                   │ │
│ │  [Histogram][Box]  │  │      active chart renders here    │ │
│ │  [Violin][RainCld] │  │                                   │ │
│ │  [ECDF]            │  │                                   │ │
│ │                    │  │      [insight callout, optional]  │ │
│ │ RELATIONSHIP       │  │                                   │ │
│ │  [Scatter+fit]     │  └───────────────────────────────────┘ │
│ │  [Correlogram]     │                                        │
│ │  [Bubble]          │                                        │
│ │  [Scatt. matrix]   │                                        │
│ │                    │                                        │
│ │ COMPARISON         │                                        │
│ │  [Bar+CI][Dot+CI]  │                                        │
│ │  [Lollipop][Strip] │                                        │
│ │                    │                                        │
│ │ INTERACTION        │                                        │
│ │  [Interact.plot]   │                                        │
│ │  [Simp.slopes]     │                                        │
│ │  [Spotlight]       │                                        │
│ │                    │                                        │
│ │ CATEGORICAL        │                                        │
│ │  [Mosaic][Stacked%]│                                        │
│ │  [Diverg.Likert]   │                                        │
│ │                    │                                        │
│ │ MULTIVARIATE       │                                        │
│ │  [PCA biplot]      │                                        │
│ │  [Load.heatmap]    │                                        │
│ │  [Dendrogram]      │                                        │
│ │  [Silhouette]      │                                        │
│ │                    │                                        │
│ │ VARIABLES          │                                        │
│ │  Include (multi)   │                                        │
│ │  Group / color     │                                        │
│ │  [↓ Export SVG]    │                                        │
│ └────────────────────┘                                        │
└──────────────────────────────────────────────────────────────┘
```

#### Variable controls

- **Include (multi-select):** drives which columns appear in correlograms / scatter matrices / loading heatmaps. Defaults to all numeric vars.
- **Group / color:** single categorical var for color encoding. Defaults from seed.
- **X / Y:** shown conditionally for single-series charts (scatter+fit, histogram, box, violin). Seeded from active test vars.
- **Size:** shown for bubble chart only.

#### Contextual bridge — correlogram cell click

Clicking a cell in the correlogram sets the active inference test to `pearson` (or `spearman` if non-normal), pre-populates X/Y vars, and switches the tab back to Inference. This is the primary "explore first, then test" workflow.

#### Export

`↓ Export SVG` serializes the canvas SVG (or generates one from Recharts via `toSVG`) and triggers a browser download of `statlab-[charttype]-[date].svg`.

#### New chart components for Explore tab

Split into a new file `src/components/charts-explore.jsx` to keep `charts.jsx` from growing too large. Charts shared with QuickView (ViolinPlot, BoxPlot, etc.) remain in `charts.jsx` and are imported by both.

| Group | Component | Notes |
|-------|-----------|-------|
| Distribution | `ExHistogram` | bins + KDE overlay, single variable |
| Distribution | `ExECDF` | empirical CDF, per-group |
| Distribution | `ExRainCloud` | violin + strip + box combined (SVG) |
| Relationship | `ExScatterFit` | scatter + OLS line + CI band, color by group |
| Relationship | `ExCorrelogram` | n×n heatmap, Pearson r, clickable cells |
| Relationship | `ExBubble` | X × Y × size (third numeric) |
| Relationship | `ExScatterMatrix` | n×n small multiples of scatter plots |
| Comparison | `ExBarCI` | grouped bars with SE/CI error bars |
| Comparison | `ExDotCI` | Cleveland dot plot with CI whiskers |
| Comparison | `ExLollipop` | lollipop chart, sorted by mean |
| Comparison | `ExStripPlot` | jittered points + group mean line |
| Interaction | `ExInteractionPlot` | Factor A × Factor B → Y line plot |
| Interaction | `ExSimpleSlopes` | X → Y at −1SD, mean, +1SD of moderator |
| Interaction | `ExSpotlight` | region-of-significance shading |
| Categorical | `ExMosaic` | proportional tile mosaic, 2 cat vars |
| Categorical | `ExStackedBar100` | 100% stacked bar, 2 cat vars |
| Categorical | `ExDivergingLikert` | diverging stacked bar for survey Likert items |
| Multivariate | `ExPCABiplot` | PC1 × PC2 scores + loading arrows (SVG) |
| Multivariate | `ExLoadingHeatmap` | factor × variable loading heatmap |
| Multivariate | `ExDendrogram` | hierarchical cluster dendrogram (SVG) |
| Multivariate | `ExSilhouette` | silhouette widths by cluster |

#### Test-specific contextual charts (embedded in InferenceResults, not in Explore tab)

These live in `charts.jsx` and are rendered inside the existing `InferenceResults.jsx` output panel:

| Chart | Used by |
|-------|---------|
| `SpaghettiPlot` | HLM random intercept/slope — individual trajectories |
| `CaterpillarPlot` | HLM — random effects ranked with CIs |
| `ITSPlot` | Interrupted time series — pre/post segments with trend lines |
| `RDPlot` | Regression discontinuity — binned scatter + local linear fits |
| `SociogramPlot` | Network analysis — SVG force-layout graph |
| `IRTCurves` | IRT 1PL/2PL — item characteristic curves |
| `LCAProfiles` | Latent class analysis — class profile bar chart |

---

## 4. Phase 3 — Statistical Methods

### 4.1 New source files

| File | Contents |
|------|----------|
| `src/tests/psychometrics.js` | McDonald's ω, parallel analysis, IRT 1PL/2PL, scale scoring |
| `src/tests/multilevel.js` | Random intercept HLM, random slope HLM, multilevel ICC |
| `src/tests/causal.js` | PSM, IV/2SLS, ITS, RDD |
| `src/tests/clustering.js` | k-means, hierarchical clustering, LCA |
| `src/tests/network.js` | Centrality measures, community detection, sociogram |
| `src/math/power.js` | Expanded power analysis (ANOVA, χ², logistic, mixed, mediation) |

Additions to existing files:
- `src/tests/regression.js` — ordinal logistic, Poisson, negative binomial
- `src/tests/multivariate.js` — MANOVA, canonical correlation, LDA

### 4.2 New and expanded `tree.js` categories

#### New category: PSYCHOMETRICS

```js
{
  cat: "PSYCHOMETRICS", color: "#f472b6",
  tests: [
    { id: "omega",      label: "McDonald's ω",       tag: "total + hierarchical · better than α" },
    { id: "parallel",   label: "Parallel Analysis",   tag: "permutation scree · factor retention" },
    { id: "irt_1pl",    label: "IRT Rasch (1PL)",     tag: "item difficulty · person ability · ICC" },
    { id: "irt_2pl",    label: "IRT 2PL",             tag: "difficulty + discrimination · ICC curves" },
    { id: "scale_score",label: "Scale Scoring",       tag: "sum/mean · reverse coding · subscales" },
  ],
}
```

#### New category: MULTILEVEL MODELS

```js
{
  cat: "MULTILEVEL MODELS", color: "#2dd4bf",
  tests: [
    { id: "hlm_ri",  label: "Random Intercept",    tag: "two-level HLM · variance components · ICC" },
    { id: "hlm_rs",  label: "Random Slope",        tag: "cross-level interaction · slope variance" },
    { id: "icc_ml",  label: "Multilevel ICC",       tag: "between-group variance · design effect · ρ" },
  ],
}
```

#### New category: CLUSTERING

```js
{
  cat: "CLUSTERING", color: "#fb923c",
  tests: [
    { id: "kmeans",  label: "k-Means",              tag: "k=2..8 · silhouette selection · within-SS" },
    { id: "hclust",  label: "Hierarchical Cluster", tag: "Ward's method · dendrogram · cut height" },
    { id: "lca",     label: "Latent Class Analysis",tag: "2–4 classes · BIC selection · class profiles" },
  ],
}
```

#### New category: NETWORK

```js
{
  cat: "NETWORK", color: "#a78bfa",
  tests: [
    { id: "centrality", label: "Centrality Measures", tag: "degree · betweenness · eigenvector · closeness" },
    { id: "community",  label: "Community Detection",  tag: "modularity · greedy · Louvain" },
    { id: "sociogram",  label: "Sociogram",            tag: "SVG force-layout · adjacency matrix input" },
  ],
}
```

#### Expanded: REGRESSION (additions)

```js
{ id: "ordinal",  label: "Ordinal Logistic",    tag: "proportional odds · OR · AIC/BIC · Likert outcomes" },
{ id: "poisson",  label: "Poisson Regression",  tag: "IRR · deviance · overdispersion test" },
{ id: "negbinom", label: "Negative Binomial",   tag: "overdispersion-corrected count model · AIC" },
```

#### Expanded: MULTIVARIATE (additions)

```js
{ id: "manova",   label: "MANOVA",               tag: "Wilks' Λ · Pillai · Hotelling T² · Roy" },
{ id: "cancorr",  label: "Canonical Correlation", tag: "Rc · χ² test · canonical loadings" },
{ id: "lda",      label: "Discriminant Analysis", tag: "LDA · group separation · classification accuracy" },
```

#### Expanded: META-ANALYSIS & CAUSAL (additions)

```js
{ id: "psm",    label: "Propensity Score Match", tag: "logistic PS · ATT · covariate balance table" },
{ id: "iv2sls", label: "IV / 2SLS",              tag: "instrumental variables · endogeneity · first-stage F" },
{ id: "its",    label: "Interrupted Time Series",tag: "segmented regression · pre/post level + trend" },
{ id: "rdd",    label: "Regression Discontinuity",tag: "local linear · bandwidth · McCrary density test" },
```

#### Expanded: DIAGNOSTICS & TOOLS — power analysis additions

```js
{ id: "pow_anova",  label: "ANOVA Power",          tag: "f → n · one-way + two-way designs" },
{ id: "pow_chi",    label: "Chi-Square Power",      tag: "w → n · GoF + independence" },
{ id: "pow_logit",  label: "Logistic Power",        tag: "OR → n · event rate · Wald approximation" },
{ id: "pow_mixed",  label: "Mixed Models Power",    tag: "ICC-adjusted n · design effect" },
{ id: "pow_med",    label: "Mediation Power",       tag: "Monte Carlo · ab path · B=1000" },
```

### 4.3 Test count summary

| Category | Current | Added | New total |
|----------|---------|-------|-----------|
| Compare Means | 6 | 0 | 6 |
| ANOVA | 8 | 0 | 8 |
| Nonparametric | 2 | 0 | 2 |
| Correlation | 5 | 0 | 5 |
| Regression | 8 | 3 (ordinal, Poisson, NB) | 11 |
| Categorical | 7 | 0 | 7 |
| Equivalence & Bayes | 3 | 0 | 3 |
| Multivariate | 6 | 3 (MANOVA, cancorr, LDA) | 9 |
| Meta-analysis & Causal | 2 | 4 (PSM, IV, ITS, RDD) | 6 |
| Diagnostics & Tools | 8 | 5 (power additions) | 13 |
| **PSYCHOMETRICS** (new) | 0 | 5 | 5 |
| **MULTILEVEL MODELS** (new) | 0 | 3 | 3 |
| **CLUSTERING** (new) | 0 | 3 | 3 |
| **NETWORK** (new) | 0 | 3 | 3 |
| **Total** | **55** | **29** | **84** |

---

## 5. Architecture summary

### File changes

| File | Change |
|------|--------|
| `src/data/datasets.js` | Add 5 `make*()` functions + BUILTIN entries |
| `src/config/tree.js` | Add 4 new categories, expand 4 existing |
| `src/config/chartMap.js` | New — `CHART_FOR_TEST` lookup (test id → chart mode) |
| `src/App.jsx` | Add `activeTab` state, `exploreSeed` derivation, tab rendering |
| `src/components/charts.jsx` | Add 6 QuickView charts + 7 contextual inference charts |
| `src/components/charts-explore.jsx` | New — 21 Explore tab chart components |
| `src/components/ExplorePanel.jsx` | New — full Explore tab panel |
| `src/components/InferencePanel.jsx` | Pass `activeTest` up to App for seed derivation; add new test imports |
| `src/components/InferenceConfig.jsx` | Add config blocks for 29 new tests |
| `src/components/InferenceResults.jsx` | Add result renderers for 29 new tests |
| `src/tests/psychometrics.js` | New |
| `src/tests/multilevel.js` | New |
| `src/tests/causal.js` | New |
| `src/tests/clustering.js` | New |
| `src/tests/network.js` | New |
| `src/tests/regression.js` | Add ordinal, Poisson, negative binomial |
| `src/tests/multivariate.js` | Add MANOVA, canonical correlation, LDA |
| `src/math/power.js` | New — expanded power analysis (split from distributions.js) |

### State flow — contextual seeding

```
InferencePanel (active test changes)
  → emits { testId, xVar, yVar, groupVar } up to App
  → App derives exploreSeed
  → User clicks ◈ EXPLORE tab
  → ExplorePanel reads seed on mount → sets local chartType + vars
  → Seed discarded; ExplorePanel owns its own state thereafter
```

### QuickView state

```
QuickView
  props: { data, xVar, yVar, colorVar, ds, activeTest }
  state: { chartMode: string | null }   ← null = auto

  autoMode = CHART_FOR_TEST[activeTest] ?? 'scatter'
  effectiveMode = chartMode ?? autoMode

  useEffect(() => setChartMode(null), [activeTest])  ← reset on test change
```

---

## 6. Definition of Done

### Phase 1
- All 5 datasets load correctly in the UI; pill buttons appear in header
- `detectCols()` correctly identifies numeric/categorical for each dataset
- Default `xVar`/`yVar`/`colorVar` set sensibly per dataset on switch

### Phase 2
- QuickView icon row visible; auto-selection changes when active test changes
- User override persists until test changes
- Explore tab reachable; sidebar chart picker works; variable selectors update chart
- Contextual seed populates Explore on first entry from any test
- Correlogram cell click bridges to Inference tab with correct vars
- Export SVG produces a valid downloadable file
- All 6 chart groups render without error on all 8 datasets

### Phase 3
- All 29 new tests wired: config UI → compute → result render
- Each new test has at least one contextual chart in InferenceResults
- APA-format output for each new test
- Test suite extended to cover new modules (target ≥15 cases per new file)
- `tree.js` test count in App header updated: "v7 · 84 tests · social science edition"
