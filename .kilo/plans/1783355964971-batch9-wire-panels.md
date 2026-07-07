# Plan: Wire Batch 9 Modules into InferencePanel & InferenceConfig

## Goal

Add the 11 batch 9 modules (100 test IDs) to the compute panel (`InferencePanel.jsx`) and config panel (`InferenceConfig.jsx`). These modules already have tree.js entries, chartMap.js mappings, methodNotes.js entries, and runners.js functions. Only the UI wiring remains.

## Modules & Test IDs

| Module | # Tests | Test IDs |
|--------|---------|----------|
| ABM | 8 | abm_morani, abm_conv, abm_sobol, abm_summary, abm_scenario, abm_threshold, abm_diffusion, abm_segregation |
| Bandit | 9 | bandit_eps, bandit_ucb, bandit_thompson, bandit_context, bandit_pg, bandit_softmax, bandit_ql, bandit_sarsa, bandit_dqn |
| Linkage | 7 | link_jaro, link_lev, link_fel, link_block, link_thresh, link_prob, link_dedup |
| Privacy | 7 | priv_laplace, priv_synthetic, priv_kanon, priv_diff, priv_mask, priv_ldiv, priv_tclose |
| PRO | 7 | pro_rci, pro_mid, pro_responder, pro_eq5d, pro_srm, pro_ctgov, pro_consort |
| raMonitor | 7 | ram_cusum, ram_vlad, ram_sprt, ram_funnel, ram_cchart, ram_safety, ram_prr |
| Recommendation | 3 | rec_cf, rec_mf, rec_topn |
| SCED | 7 | sced_tauu, sced_pnd, sced_pem, sced_nap, sced_rand, sced_bctau, sced_bcsmd |
| Sensitivity | 8 | sens_morris, sens_fast, sens_modelcomp, sens_forecast, sens_sobol1, sens_sobolt, sens_delta, sens_andrews |
| Bootstrap | 11 | boot_ci, boot_se, boot_test, boot_jack, boot_tci, boot_influence, boot_mediation, boot_modmed, boot_splitconf, boot_confpval, boot_jackplus |
| Power | 26 | pow_cox, pow_meta, pow_equiv, pow_intanova, pow_anova, pow_chi, pow_logit, pow_mixed, pow_corr, pow_med, reqn_t, reqn_corr, reqn_oneprop, reqn_twoprop, reqn_wilcoxon, reqn_logrank, reqn_ols, reqn_anova, pow_ttest, pow_oneprop, pow_twoprop, pow_wilcoxon, pow_logrank, pow_rmanova, pow_olsapa, pow_spearman |

## Files Changed

### 1. `src/components/InferencePanel.jsx`

#### 1a. Add imports (after line 151)

```js
import { moranIMulti, simulationConvergence, sobolSensitivity, agentSummaryStats, scenarioComparison, thresholdModel, networkDiffusion, segregationIndex } from '../tests/abm.js';
import { epsilonGreedy, ucb, thompsonSampling, contextualBandit, policyGradient, softmaxBandit, qLearning, sarsa, deepQNetwork } from '../tests/bandit.js';
import { jaroWinkler, levenshteinDistance, fellegiSunter, recordBlocking, matchThreshold, probabilisticRecordLinkage, deduplication } from '../tests/linkage.js';
import { laplaceMechanism, bootstrapSynthetic, kAnonymityCheck, differentialPrivacy, dataMasking, lDiversity, tCloseness } from '../tests/privacy.js';
import { reliableChangeIndex, minimalImportantDifference, responderAnalysis, eq5dIndex, standardizedResponseMean, clinicalTrialsGov, consortChecklist } from '../tests/pro.js';
import { raCusum, vlad, raSprt, funnelPlot, cChartRiskAdjusted, safetySignal, prrAnalysis } from '../tests/raMonitor.js';
import { collaborativeFilter, matrixFactorize, topNRecommend } from '../tests/recommendation.js';
import { tauU, pnd, pem, nap, randomizationTest, baselineCorrectedTau, betweenCaseSMD } from '../tests/sced.js';
import { morrisMethod, fastSensitivity, modelComparison, forecastCombination, sobolFirstOrder, sobolTotalIndex, deltaMethod, andrewsPlot } from '../tests/sensitivity.js';
import { bootstrapCI, bootstrapSE, bootstrapTest, jackknife, bootstrapT_CI, empiricalInfluence, bootstrapMediation, moderatedMediation, splitConformal, conformalPvalues, jackknifePlus } from '../tests/bootstrap.js';
import { powerCoxPH, powerMetaAnalysis, powerEquivalence, powerInteractionANOVA, powerANOVA, powerChiSq, powerLogisticReg, powerMultilevel, powerCorrelation, powerMediationTest, requiredNT, requiredNCorrelation, requiredNOneProp, requiredNTwoProp, requiredNWilcoxon, requiredNLogRank, requiredNOLS, requiredNANOVA, powerTTestWrapper, powerProportionOne, powerProportionTwo, powerWilcoxonTest, powerLogRankTest, powerRMANOVA, powerOLS_apa, powerSpearmanTest } from '../tests/power.js';
```

#### 1b. Add state variables (after line 905)

Most batch 9 tests work with defaults. Key parameters that benefit from user config:

```
// ── batch 9: ABM ──────────────────────────────────────────────────────────
const [abmValueField, setAbmValueField] = useState(numeric[0] || '');
const [abmTolerance, setAbmTolerance] = useState('0.01');
const [abmWindow, setAbmWindow] = useState('10');
const [abmNRuns, setAbmNRuns] = useState('50');
const [abmNAgents, setAbmNAgents] = useState('100');
const [abmSeed, setAbmSeed] = useState('42');
const [abmNSeeds, setAbmNSeeds] = useState('5');

// ── batch 9: Bandit ─────────────────────────────────────────────────────
const [banditEpsilon, setBanditEpsilon] = useState('0.1');
const [banditNIter, setBanditNIter] = useState('500');
const [banditNArms, setBanditNArms] = useState('5');
const [banditSeed, setBanditSeed] = useState('42');
const [banditTemp, setBanditTemp] = useState('1.0');
const [banditLr, setBanditLr] = useState('0.01');
const [banditNStates, setBanditNStates] = useState('10');
const [banditNActions, setBanditNActions] = useState('4');
const [banditNEpisodes, setBanditNEpisodes] = useState('50');

// ── batch 9: Privacy ─────────────────────────────────────────────────────
const [privEpsilon, setPrivEpsilon] = useState('1.0');
const [privDelta, setPrivDelta] = useState('0.00001');
const [privPct, setPrivPct] = useState('20');

// ── batch 9: Sensitivity ──────────────────────────────────────────────────
const [sensSeed, setSensSeed] = useState('42');
const [sensNSamples, setSensNSamples] = useState('100');
const [sensNTrajectories, setSensNTrajectories] = useState('10');
const [sensGridLevels, setSensGridLevels] = useState('4');
```

No new state vars needed for Linkage, PRO, raMonitor, Recommendation, or SCED — they work with dataset columns directly.

Bootstrap and power already have their infrastructure (bsResult, bsRunning, powerResult, etc. at lines 907-913).

#### 1c. Compute branches (after line 3121, before closing `}` of result useMemo)

For each of the 100 test IDs, add an `if (a === '...')` block following the pattern:
- Extract data from dataset columns
- Call the imported function
- Wrap result with `test` field if not already present
- Return null if insufficient data

**Pattern**: Replicate the data transformation logic from `runners.js`, adapting from `data`/`numeric`/`categorical` vectors instead of pre-defined runner constants.

Example patterns:
```js
// Simple: call function with data from columns
if (a === 'link_jaro') { const r = jaroWinkler(String(data[0]?.[xVar] || ''), String(data[1]?.[yVar] || '')); return { ...r, test: 'Jaro-Winkler' }; }

// Self-contained: simulate data, call function
if (a === 'bandit_eps') { const eps = parseFinite(banditEpsilon, 0.1); const nArms = parseInt(banditNArms, 5) || 5; const nIter = parseInt(banditNIter, 500) || 500; const arms = Array.from({length: nArms}, (_, i) => i + 1); const rewards = Array.from({length: nIter}, () => ({ arm: 1 + Math.floor(Math.random() * nArms), reward: Math.random() })); const r = epsilonGreedy(arms, rewards, nIter, { epsilon: eps }); return r ? { ...r, test: 'Epsilon-Greedy' } : null; }
```

**Async power tests**: pow_anova, pow_chi, pow_logit, pow_mixed, pow_med already return null (handled by `POWER_TESTS` set at line 153). They use the `onRunPower` callback. The remaining power tests are synchronous.

**Bootstrap tests**: boot_ci, boot_se, boot_test, etc. call the bootstrap functions directly. These are synchronous (not using the async worker for `boot_` prefix tests — only `bootstrap` and `med_bootstrap` use async workers).

#### 1d. Dependencies array

Add new state variables to the useMemo dependencies array (lines 3125-3277), after the batch 8d entries.

#### 1e. configState bundle & useEffect

Add new state var getters/setters to the configState object (after line 3559) and the context useEffect dependencies (after line 3298).

### 2. `src/components/InferenceConfig.jsx`

#### 2a. Destructure new state vars

Add destructured state vars from the `useInference` call in the component render function (around line 243).

#### 2b. Add configMap entries

Add JSX config entries for each batch 9 test that has user-adjustable parameters. Entry format:

```jsx
abm_morani: <><Inp label="Value Field" value={abmValueField} onChange={setAbmValueField} width={80} /><Inp label="Seed" value={abmSeed} onChange={setAbmSeed} width={40} /></>,
```

For tests without parameters, use an empty fragment: `bandit_ucb: <></>,` or rely on the default `configMap[active]` fallback.

## Design Decisions

1. **Data extraction**: Follow existing pattern — extract numeric vectors from dataset columns using `finiteNums()` or `data.filter(rowFinite(...))`. Use synthetic/generated data for self-contained tests (bandit, ABM, sensitivity) where user data doesn't directly apply.

2. **Default values**: Match the defaults in `runners.js`. Bandit exploration rate defaults to 0.1, privacy epsilon to 1.0, etc.

3. **Test name wrapping**: All results must have a `test` field. If the function doesn't return one, spread and add: `{ ...r, test: 'My Test' }`.

4. **Null returns**: When dataset columns are insufficient, return null instead of throwing. The UI displays "Select a test" for null results.

5. **Bootstrap/power async**: The existing `bootstrap` entry uses async workers via `onRunBs`/`onRunMedBs`/`onRunPower`. The `boot_*` prefix tests (boot_ci, boot_se, etc.) are separate from the `bootstrap` tree entry and should call the functions synchronously with reasonable defaults (B=500, seed=42).

6. **Power tests**: pow_anova, pow_chi, pow_logit, pow_mixed, pow_med use the async `onRunPower` worker. They return null in the synchronous compute block and are already in `POWER_TESTS`. All other power tests (pow_cox, pow_meta, reqn_*, pow_ttest, etc.) are synchronous wrappers that accept simple numeric parameters.

## Implementation Order

1. Add imports to `InferencePanel.jsx`
2. Add state variables below line 905
3. Add compute branches after line 3121 (for all 100 test IDs)
4. Add dependencies to the array
5. Add configState entries
6. Add configState useEffect entries
7. Add destructured vars to `InferenceConfig.jsx`
8. Add configMap entries to `InferenceConfig.jsx`
9. Run `npx vitest run` and fix any contract test failures
10. Verify `contracts.test.js` TREE count remains 670 and all tests pass

## Validation

- `npx vitest run` — all 6,086+ tests must pass
- `src/tests/contracts.test.js` — every TREE ID must execute and return an inference-shaped result
- Manual smoke test: select each batch 9 test in the UI, verify results render
