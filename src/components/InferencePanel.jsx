import { useState, useMemo, useCallback, useEffect } from 'react';
import { C } from '../palette.js';
import { TREE } from '../config/tree.js';
import { CORE_CATEGORY_NAMES, TOTAL_TEST_COUNT } from '../config/testCategories.js';
import { METHOD_NOTES } from '../config/methodNotes.js';
import { InferenceConfig } from './InferenceConfig.jsx';
import { InferenceResults } from './InferenceResults.jsx';

// ── test runners ──────────────────────────────────────────────────────────────
import { tWelch, tOne, tPaired, yuentTest, zTestKnownSD, signTest } from 'statlab/methods/means';
import { oneWayANOVA, welchANOVA, twoWayANOVA, ancova, rmANOVA, friedman, kruskalWallis, cochranQ } from 'statlab/methods/anova';
import {
  pearsonTest, spearman, kendallTau, partialCorr, pointBiserial,
  simpleOLS, multipleOLS, polynomialOLS, hierarchicalOLS,
  logisticReg, ordinalLogisticRegression, poissonRegression, negativeBinomialRegression,
  mediation, moderation,
} from 'statlab/methods/regression';
import { mannWhitney, wilcoxonSR } from 'statlab/methods/nonparametric';
import {
  chiSquare, chiGoF, fisherExact, mcnemar, binomialTest, onePropZ, twoPropZ,
  tost, bayesFactorT, bayesFactorCorr,
  grubbsTest, leveneTest, bartlettTest,
  bonferroni, holm, bh, sensitivityLOO,
} from 'statlab/methods/categorical';
import { pca, efa, manova, canonicalCorr, linearDiscriminant, cronbachAlpha, splitHalf, icc, cohensKappa, metaAnalysis, differencesInDifferences, convertEffectSize } from 'statlab/methods/multivariate';
import { omegaMcDonald, parallelAnalysis, irtRasch1PL, irt2PL, scaleScore } from 'statlab/methods/psychometrics';
import { kmeans, hierarchicalCluster, latentClassAnalysis } from 'statlab/methods/clustering';
import { hlmRandomIntercept, hlmRandomSlope, iccMultilevel } from 'statlab/methods/multilevel';
import { propensityScoreMatch, iv2sls, interruptedTimeSeries, regressionDiscontinuity } from 'statlab/methods/causal';
import { centralityMeasures, communityDetection, sociogramLayout, networkFromEdgeList } from 'statlab/methods/network';
import { normalityDP, shapiroWilk, computePowerT, requiredN, requiredNCorr } from 'statlab/math/distributions';
import { avg, sampleSD, median } from 'statlab/math/core';
import { parseFinite, barHeightPct, finiteNums, rowFinite, parseNumList } from '../utils/parse.js';
import {
  runBootstrapCI, runBootstrapMediation,
  runPowerANOVA, runPowerChi, runPowerLogistic, runPowerMixed, runPowerMediation,
} from '../utils/resampleAsync.js';
import { moranIMulti, simulationConvergence, sobolSensitivity, agentSummaryStats, scenarioComparison, thresholdModel, networkDiffusion, segregationIndex } from 'statlab/methods/abm';
import { epsilonGreedy, ucb, thompsonSampling, contextualBandit, policyGradient, softmaxBandit, qLearning, sarsa, deepQNetwork } from 'statlab/methods/bandit';
import { jaroWinkler, levenshteinDistance, fellegiSunter, recordBlocking, matchThreshold, probabilisticRecordLinkage, deduplication } from 'statlab/methods/linkage';
import { laplaceMechanism, bootstrapSynthetic, kAnonymityCheck, differentialPrivacy, dataMasking, lDiversity, tCloseness } from 'statlab/methods/privacy';
import { reliableChangeIndex, minimalImportantDifference, responderAnalysis, eq5dIndex, standardizedResponseMean, clinicalTrialsGov, consortChecklist } from 'statlab/methods/pro';
import { raCusum, vlad, raSprt, funnelPlot, cChartRiskAdjusted, safetySignal, prrAnalysis } from 'statlab/methods/raMonitor';
import { collaborativeFilter, matrixFactorize, topNRecommend } from 'statlab/methods/recommendation';
import { tauU, pnd, pem, nap, randomizationTest, baselineCorrectedTau, betweenCaseSMD } from 'statlab/methods/sced';
import { morrisMethod, fastSensitivity, modelComparison, forecastCombination, sobolFirstOrder, sobolTotalIndex, deltaMethod, andrewsPlot } from 'statlab/methods/sensitivity';
import { bootstrapCI, bootstrapSE, bootstrapTest, jackknife, bootstrapT_CI, empiricalInfluence, bootstrapMediation as bsMediation, moderatedMediation, splitConformal, conformalPvalues, jackknifePlus } from 'statlab/methods/bootstrap';
import { powerCoxPH, powerMetaAnalysis, powerEquivalence, powerInteractionANOVA, powerANOVA, powerChiSq, powerLogisticReg, powerMultilevel, powerCorrelation, powerMediationTest, requiredNT, requiredNCorrelation, requiredNOneProp, requiredNTwoProp, requiredNWilcoxon, requiredNLogRank, requiredNOLS, requiredNANOVA, powerTTestWrapper, powerProportionOne, powerProportionTwo, powerWilcoxonTest, powerLogRankTest, powerRMANOVA, powerOLS_apa, powerSpearmanTest } from 'statlab/methods/power';
import { theilSenSlope, mmEstimator, madScale, hampelM, mcdCovariance, sEstimator, ltsRegression, qqConfidence } from 'statlab/methods/robust';
import {
  bicBayesFactor, betaBinomialPosterior, gammaPoissonPosterior, normalNormalPosterior,
  normalInverseGammaPosterior, bayesianLinearRegression, bayesianLogisticRegression,
  bayesianPoissonRegression, bayesianDIC, bmaRegression,
} from 'statlab/methods/bayesian';
import { littlesMCAR, mice, rubinPool, fmi as fractionMissingInfo, emImpute, missingnessPattern, completeCases } from 'statlab/methods/missing';
import { kmEstimate, logRankTest, coxPH } from 'statlab/methods/survival';
import { adfTest, acf, pacf } from 'statlab/methods/timeseries';
import { localOutlierFactor, isolationForest } from 'statlab/methods/outlier';
import { panelFixedEffects, panelRandomEffects, hausmanTest } from 'statlab/methods/econometric';
import { gamBackfitting, gamInteraction } from 'statlab/methods/gam';
import { gaussianMixtureModel, latentProfileAnalysis } from 'statlab/methods/mixture';
import { distanceCorrelation, distanceCovariance } from 'statlab/methods/distance';
import { mulberry32 } from 'statlab/math/rng';

function injectMissing(data, vars, pct, seed) {
  if (!data?.length || !vars?.length) return data;
  const rng = mulberry32(seed);
  return data.map(row => {
    const r = { ...row };
    for (const v of vars) if (rng() * 100 < pct) r[v] = null;
    return r;
  });
}

function gaussianLogLik(ssRes, n) {
  const ss = Math.max(ssRes, 1e-12);
  return -0.5 * n * Math.log(2 * Math.PI) - 0.5 * n * Math.log(ss / n) - 0.5 * n;
}

const POWER_TESTS = new Set(['pow_anova', 'pow_chi', 'pow_logit', 'pow_mixed', 'pow_med']);

function dichotomizeMatrix(matrix) {
  if (!matrix?.length || !matrix[0]?.length) return [];
  const k = matrix[0].length;
  const cuts = Array.from({ length: k }, (_, j) => {
    const col = matrix.map(r => +r[j]).filter(Number.isFinite);
    return avg(col);
  });
  return matrix.map(row => row.map((v, j) => (+v > cuts[j] ? 1 : 0)));
}

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

// ── Left navigator ────────────────────────────────────────────────────────────
export function Navigator({ active, setActive, width = '100%', borderRight = false }) {
  const [expandedNote, setExpandedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const activeCat = useMemo(() => {
    for (const cat of TREE) {
      if (cat.tests.some(t => t.id === active)) {
        return cat.cat;
      }
    }
    return null;
  }, [active]);

  const [expandedCats, setExpandedCats] = useState(() => {
    const initial = new Set(['__core__']);
    if (activeCat) initial.add(activeCat);
    return initial;
  });

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('statlab_favorites_v1')) || []; }
    catch { return []; }
  });
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('statlab_recent_v1')) || []; }
    catch { return []; }
  });
  const [favExpanded, setFavExpanded] = useState(true);
  const [recExpanded, setRecExpanded] = useState(true);

  useEffect(() => { try { localStorage.setItem('statlab_favorites_v1', JSON.stringify(favorites)); } catch {} }, [favorites]);
  useEffect(() => {
    if (active != null) {
      setRecent(prev => {
        const next = [active, ...prev.filter(id => id !== active)].slice(0, 10);
        try { localStorage.setItem('statlab_recent_v1', JSON.stringify(next)); } catch {}
        return next;
      });
    }
  }, [active]);

  const testLookup = useMemo(() => {
    const map = {};
    for (const cat of TREE) {
      for (const t of cat.tests) {
        map[t.id] = { ...t, category: cat.cat, color: cat.color };
      }
    }
    return map;
  }, []);

  const toggleFavorite = useCallback((e, testId) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
  }, []);

  useEffect(() => {
    if (activeCat) {
      setExpandedCats(prev => {
        if (prev.has(activeCat)) return prev;
        const next = new Set(prev);
        next.add(activeCat);
        return next;
      });
    }
  }, [activeCat]);

  const toggleCategory = useCallback((catName) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catName)) {
        next.delete(catName);
      } else {
        next.add(catName);
      }
      return next;
    });
  }, []);

  const expandAll = () => {
    setExpandedCats(new Set([...TREE.map(cat => cat.cat), '__core__', '__more__']));
  };

  const collapseAll = () => {
    setExpandedCats(new Set());
  };

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return TREE;
    const query = searchQuery.toLowerCase();
    return TREE.map(cat => {
      const catMatches = cat.cat.toLowerCase().includes(query);
      const matchedTests = cat.tests.filter(t => 
        t.label.toLowerCase().includes(query) || 
        t.tag.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query)
      );
      if (catMatches) {
        return { ...cat, tests: cat.tests };
      } else if (matchedTests.length > 0) {
        return { ...cat, tests: matchedTests };
      }
      return null;
    }).filter(Boolean);
  }, [searchQuery]);

  const isExpanded = (catName) => {
    if (searchQuery.trim()) return true;
    return expandedCats.has(catName);
  };

  const coreCats = filteredTree.filter(cat => CORE_CATEGORY_NAMES.has(cat.cat));
  const moreCats = filteredTree.filter(cat => !CORE_CATEGORY_NAMES.has(cat.cat));

  const renderCategory = (cat) => {
    const expanded = isExpanded(cat.cat);
    return (
      <div key={cat.cat} style={{ borderBottom: `1px solid ${C.border}` }}>
        {/* Category Header */}
        <div
          onClick={() => toggleCategory(cat.cat)}
          style={{
            position: 'sticky', top: 0, zIndex: 1,
            fontSize: 9, ...mono,
            color: cat.color,
            textTransform: 'uppercase',
            letterSpacing: '.12em',
            padding: '6px 10px',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            background: C.bg,
            userSelect: 'none',
          }}
        >
          <span>{cat.cat} <span style={{ fontSize: 8, color: C.dim }}>({cat.tests.length})</span></span>
          <span style={{ fontSize: 8, color: C.dim }}>
            {expanded ? '▼' : '▶'}
          </span>
        </div>

        {/* Tests list */}
        {expanded && (
          <div style={{ background: 'rgba(0,0,0,0.1)' }}>
            {cat.tests.map(t => {
              const isFav = favorites.includes(t.id);
              return (
              <div key={t.id} style={{ borderTop: `1px dashed ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <button
                    onClick={() => setActive(t.id)}
                    style={{
                      flex: 1, display: 'block', textAlign: 'left',
                      background: active === t.id ? 'rgba(255,255,255,.04)' : 'transparent',
                      color: active === t.id ? cat.color : C.text,
                      border: 'none',
                      borderLeft: active === t.id ? `3px solid ${cat.color}` : '3px solid transparent',
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
                      padding: '6px 8px', cursor: 'pointer', lineHeight: 1.15, transition: 'all .1s',
                    }}
                  >
                    <span style={{ color: active === t.id ? cat.color : C.text }}>{t.label}</span>
                    <div style={{ fontSize: 8, ...mono, color: C.dim, fontWeight: 400, marginTop: 2 }}>{t.tag}</div>
                  </button>
                  <button
                    onClick={(e) => toggleFavorite(e, t.id)}
                    title={isFav ? 'Remove favorite' : 'Add favorite'}
                    style={{
                      background: 'transparent', border: 'none', color: isFav ? C.accent : C.dim,
                      cursor: 'pointer', fontSize: 11, padding: '6px 4px 6px 0', ...mono,
                    }}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                  {METHOD_NOTES[t.id] && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedNote(expandedNote === t.id ? null : t.id); }}
                      title="Method info"
                      style={{
                        background: 'transparent', border: 'none', color: expandedNote === t.id ? C.accent : C.dim,
                        cursor: 'pointer', fontSize: 11, padding: '6px 8px 6px 0', ...mono,
                      }}
                    >
                      ?
                    </button>
                  )}
                </div>
                {expandedNote === t.id && METHOD_NOTES[t.id] && (
                  <div style={{
                    margin: '0 8px 6px 10px', padding: '6px 8px', background: C.panel, borderRadius: 3,
                    border: `1px solid ${C.border}`, fontSize: 9, color: C.text, lineHeight: 1.5,
                  }}>
                    {typeof METHOD_NOTES[t.id] === 'string'
                      ? METHOD_NOTES[t.id]
                      : (
                        <>
                          <div style={{ color: cat.color, fontWeight: 600, marginBottom: 3 }}>{METHOD_NOTES[t.id].description}</div>
                          {METHOD_NOTES[t.id].usage && <div style={{ color: C.dim, marginBottom: 4 }}><b style={{ color: C.text }}>Use:</b> {METHOD_NOTES[t.id].usage}</div>}
                          {METHOD_NOTES[t.id].assumptions && (
                            <div style={{ marginBottom: 4 }}>
                              <b style={{ color: C.text }}>Assumptions:</b>
                              <ul style={{ margin: '2px 0 0 12px', padding: 0 }}>
                                {METHOD_NOTES[t.id].assumptions.map((a, i) => <li key={i} style={{ color: C.dim, marginBottom: 1 }}>{a}</li>)}
                              </ul>
                            </div>
                          )}
                          {METHOD_NOTES[t.id].cite && <div style={{ color: C.dim, fontSize: 8, fontStyle: 'italic' }}>{METHOD_NOTES[t.id].cite}</div>}
                        </>
                      )}
                  </div>
                )}
              </div>
            );})}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ width, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: borderRight ? `1px solid ${C.border}` : 'none' }}>
      {/* Search Header */}
      <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder={`Search ${TOTAL_TEST_COUNT} tests...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              color: C.text,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              padding: '4px 20px 4px 6px',
              width: '100%',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 6,
                background: 'transparent',
                border: 'none',
                color: C.dim,
                cursor: 'pointer',
                fontSize: 10,
                padding: 0,
              }}
            >
              &times;
            </button>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: C.dim, ...mono }}>
            {searchQuery ? `${filteredTree.reduce((acc, cat) => acc + cat.tests.length, 0)} found` : `${TOTAL_TEST_COUNT} modules`}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={expandAll} style={{ background: 'transparent', border: 'none', color: C.accent, fontSize: 8, ...mono, cursor: 'pointer', padding: 0 }}>EXPAND ALL</button>
            <span style={{ fontSize: 8, color: C.border }}>|</span>
            <button onClick={collapseAll} style={{ background: 'transparent', border: 'none', color: C.dim, fontSize: 8, ...mono, cursor: 'pointer', padding: 0 }}>COLLAPSE</button>
          </div>
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Favorites section — hidden when search is active */}
        {!searchQuery.trim() && favorites.length > 0 && (
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <div
              onClick={() => setFavExpanded(prev => !prev)}
              style={{
                position: 'sticky', top: 0, zIndex: 1,
                fontSize: 9, ...mono, fontWeight: 700, color: C.accent,
                textTransform: 'uppercase', letterSpacing: '.12em',
                padding: '6px 10px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', cursor: 'pointer', background: C.bg,
                userSelect: 'none', borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span>{'\u2605 FAVORITES'} ({favorites.length})</span>
              <span style={{ fontSize: 8, color: C.dim }}>{favExpanded ? '\u25BC' : '\u25B6'}</span>
            </div>
            {favExpanded && (
              <div style={{ background: 'rgba(0,0,0,0.1)' }}>
                {favorites.map(favId => {
                  const info = testLookup[favId];
                  if (!info) return null;
                  const isFav = favorites.includes(favId);
                  return (
                    <div key={favId} style={{ borderTop: `1px dashed ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <button
                          onClick={() => setActive(favId)}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left',
                            background: active === favId ? 'rgba(255,255,255,.04)' : 'transparent',
                            color: active === favId ? info.color : C.text,
                            border: 'none',
                            borderLeft: active === favId ? `3px solid ${info.color}` : '3px solid transparent',
                            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
                            padding: '6px 8px', cursor: 'pointer', lineHeight: 1.15, transition: 'all .1s',
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: info.color, flexShrink: 0 }} />
                          {info.label}
                        </button>
                        <button
                          onClick={(e) => toggleFavorite(e, favId)}
                          title={isFav ? 'Remove favorite' : 'Add favorite'}
                          style={{
                            background: 'transparent', border: 'none', color: isFav ? C.accent : C.dim,
                            cursor: 'pointer', fontSize: 11, padding: '6px 8px', ...mono,
                          }}
                        >
                          {isFav ? '\u2605' : '\u2606'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Recent section — hidden when search is active */}
        {!searchQuery.trim() && recent.length > 0 && (
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <div
              onClick={() => setRecExpanded(prev => !prev)}
              style={{
                position: 'sticky', top: favorites.length > 0 && favExpanded ? undefined : 0, zIndex: 1,
                fontSize: 9, ...mono, fontWeight: 700, color: C.dim,
                textTransform: 'uppercase', letterSpacing: '.12em',
                padding: '6px 10px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', cursor: 'pointer', background: C.bg,
                userSelect: 'none', borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span>{'\u21BB RECENT'} ({recent.length})</span>
              <span style={{ fontSize: 8, color: C.dim }}>{recExpanded ? '\u25BC' : '\u25B6'}</span>
            </div>
            {recExpanded && (
              <div style={{ background: 'rgba(0,0,0,0.1)' }}>
                {recent.map(recId => {
                  const info = testLookup[recId];
                  if (!info) return null;
                  const isFav = favorites.includes(recId);
                  return (
                    <div key={recId} style={{ borderTop: `1px dashed ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <button
                          onClick={() => setActive(recId)}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left',
                            background: active === recId ? 'rgba(255,255,255,.04)' : 'transparent',
                            color: active === recId ? info.color : C.text,
                            border: 'none',
                            borderLeft: active === recId ? `3px solid ${info.color}` : '3px solid transparent',
                            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
                            padding: '6px 8px', cursor: 'pointer', lineHeight: 1.15, transition: 'all .1s',
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: info.color, flexShrink: 0 }} />
                          {info.label}
                        </button>
                        <button
                          onClick={(e) => toggleFavorite(e, recId)}
                          title={isFav ? 'Remove favorite' : 'Add favorite'}
                          style={{
                            background: 'transparent', border: 'none', color: isFav ? C.accent : C.dim,
                            cursor: 'pointer', fontSize: 11, padding: '6px 8px', ...mono,
                          }}
                        >
                          {isFav ? '\u2605' : '\u2606'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Core categories */}
        {coreCats.length > 0 && (
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <div
              onClick={() => toggleCategory('__core__')}
              style={{
                position: 'sticky', top: 0, zIndex: 1,
                fontSize: 9, ...mono, fontWeight: 700, color: C.accent,
                textTransform: 'uppercase', letterSpacing: '.12em',
                padding: '6px 10px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', cursor: 'pointer', background: C.bg,
                userSelect: 'none', borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span>CORE ({coreCats.reduce((acc, cat) => acc + cat.tests.length, 0)})</span>
              <span style={{ fontSize: 8, color: C.dim }}>{isExpanded('__core__') ? '\u25BC' : '\u25B6'}</span>
            </div>
            {isExpanded('__core__') && coreCats.map(renderCategory)}
          </div>
        )}

        {/* Long-tail categories */}
        {moreCats.length > 0 && (
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <div
              onClick={() => toggleCategory('__more__')}
              style={{
                position: 'sticky', top: 0, zIndex: 1,
                fontSize: 9, ...mono, fontWeight: 700, color: C.dim,
                textTransform: 'uppercase', letterSpacing: '.12em',
                padding: '6px 10px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', cursor: 'pointer', background: C.bg,
                userSelect: 'none', borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span>MORE CATEGORIES ({moreCats.length})</span>
              <span style={{ fontSize: 8, color: C.dim }}>{isExpanded('__more__') ? '\u25BC' : '\u25B6'}</span>
            </div>
            {isExpanded('__more__') && moreCats.map(renderCategory)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── useInference hook ──────────────────────────────────────────────────────────
export function useInference(data, ds, active, setActive, onResultChange, onContextChange) {
  const numeric     = ds?.numeric     || [];
  const categorical = ds?.categorical || [];

  // ── active test ────────────────────────────────────────────────────────────
  const [alpha,  setAlpha]  = useState('0.05');

  // ── shared parameter state ─────────────────────────────────────────────────
  const [grpVar, setGrpVar] = useState(categorical[0] || '');
  const [tgtVar, setTgtVar] = useState(numeric[0]     || '');
  const [g1,     setG1]     = useState('—');
  const [g2,     setG2]     = useState('—');
  const [xVar,   setXVar]   = useState(numeric[0]     || '');
  const [yVar,   setYVar]   = useState(numeric[1]     || numeric[0] || '');
  const [zVar,   setZVar]   = useState(numeric[2]     || numeric[0] || '');
  const [mVar,   setMVar]   = useState(numeric[1]     || numeric[0] || '');
  const [mu0,    setMu0]    = useState('0');
  const [sigma,  setSigma]  = useState('1');
  const [cat1,   setCat1]   = useState(categorical[0] || '');
  const [cat2,   setCat2]   = useState(categorical[1] || categorical[0] || '');
  const [preds,  setPreds]  = useState(numeric.slice(0, 2));
  const [scaleVars, setScaleVars] = useState(numeric.slice(0, 4));
  const [rmCols,    setRmCols]    = useState(numeric.slice(0, 3));
  const [polDeg, setPolDeg] = useState('2');
  const [tostL,  setTostL]  = useState('-0.5');
  const [tostH,  setTostH]  = useState('0.5');
  const [bfPrior,setBfPrior]= useState('0.707');
  const [ssType, setSsType] = useState('ttest');
  const [ssPow,  setSsPow]  = useState('0.80');
  const [ssD,    setSsD]    = useState('0.5');
  const [ssR,    setSsR]    = useState('0.3');
  const [effFrom,setEffFrom]= useState('d');
  const [effVal, setEffVal] = useState('0.5');
  const [corrMeth,setCorrMeth]   = useState('bonferroni');
  const [pairsInput,setPairsInput] = useState('0.02,0.04,0.001,0.08,0.03');
  const [bsStat, setBsStat] = useState('mean');
  const [bsSeed, setBsSeed] = useState('42');
  const [bsB, setBsB] = useState('1999');
  const [nFactors,setNFactors]= useState('2');
  const [fx_a, setFxa] = useState('20'); const [fx_b, setFxb] = useState('10');
  const [fx_c, setFxc] = useState('15'); const [fx_d, setFxd] = useState('55');
  const [p1x, setP1x] = useState('40'); const [p1n, setP1n] = useState('100');
  const [p2x, setP2x] = useState('30'); const [p2n, setP2n] = useState('100');
  const [binoK, setBinoK] = useState('15'); const [binoN, setBinoN] = useState('30'); const [binoP, setBinoP] = useState('0.5');
  const [metaInput, setMetaInput] = useState('Study1,0.5,0.20\nStudy2,0.3,0.25\nStudy3,0.8,0.18\nStudy4,0.4,0.22\nStudy5,0.6,0.19');
  const [didPCStr, setDidPCStr]   = useState('40,42,39,41');
  const [didPOStr, setDidPOStr]   = useState('41,43,40,42');
  const [didPTStr, setDidPTStr]   = useState('38,40,37,39');
  const [didPTtStr,setDidPTtStr]  = useState('46,49,44,47');

  const [powAnovaF, setPowAnovaF] = useState('0.25');
  const [powKgroups, setPowKgroups] = useState('3');
  const [powNperGrp, setPowNperGrp] = useState('20');
  const [powChiW, setPowChiW] = useState('0.30');
  const [powChiDf, setPowChiDf] = useState('4');
  const [powChiN, setPowChiN] = useState('100');
  const [powLogitOr, setPowLogitOr] = useState('2.0');
  const [powLogitP0, setPowLogitP0] = useState('0.30');
  const [powLogitN, setPowLogitN] = useState('50');
  const [powMixedIcc, setPowMixedIcc] = useState('0.05');
  const [powMixedM, setPowMixedM] = useState('10');
  const [powMixedJ, setPowMixedJ] = useState('15');
  const [powMixedD, setPowMixedD] = useState('0.5');
  const [powMedA, setPowMedA] = useState('0.3');
  const [powMedB, setPowMedB] = useState('0.4');
  const [powMedSea, setPowMedSea] = useState('0.1');
  const [powMedSeb, setPowMedSeb] = useState('0.1');

  const [clusterK, setClusterK] = useState('3');
  const [linkage, setLinkage] = useState('ward');
  const [nLcaClasses, setNLcaClasses] = useState('2');
  const [level2Var, setLevel2Var] = useState(categorical[0] || '');
  const [treatVar, setTreatVar] = useState(categorical[0] || '');
  const [edgeList, setEdgeList] = useState('A-B,B-C,C-D,A-D');
  const [itsTimeStr, setItsTimeStr] = useState('1,2,3,4,5,6,7,8,9,10');
  const [itsValStr, setItsValStr] = useState('10,11,10,12,11,13,18,19,20,22');
  const [itsCut, setItsCut] = useState('5.5');
  const [rddCutoff, setRddCutoff] = useState('0');
  const [rddBw, setRddBw] = useState('');
  const [ivInstrument, setIvInstrument] = useState(numeric[2] || numeric[0] || '');
  const [scaleMethod, setScaleMethod] = useState('sum');
  const [reverseItems, setReverseItems] = useState([]);

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

  // ── robust statistics ──────────────────────────────────────────────────────
  const [robSeed, setRobSeed] = useState('42');

  // ── Bayesian modeling ────────────────────────────────────────────────────
  const [bbPriorA, setBbPriorA] = useState('1');
  const [bbPriorB, setBbPriorB] = useState('1');
  const [gpPriorShape, setGpPriorShape] = useState('1');
  const [gpPriorRate, setGpPriorRate] = useState('1');
  const [nnPriorMean, setNnPriorMean] = useState('0');
  const [nnPriorSD, setNnPriorSD] = useState('10');
  const [nnKnownSigma, setNnKnownSigma] = useState('1');
  const [bayesMcmcIter, setBayesMcmcIter] = useState('800');

  // ── missing data ─────────────────────────────────────────────────────────
  const [missPct, setMissPct] = useState('15');
  const [missSeed, setMissSeed] = useState('42');

  // ── extended power/sample-size calculators (previously dispatched but not in the Navigator) ──
  const [cfgPowCox, setCfgPowCox] = useState({ nEvents: '60', hr: '0.6' });
  const [cfgPowMeta, setCfgPowMeta] = useState({ k: '10', d: '0.3' });
  const [cfgPowEquiv, setCfgPowEquiv] = useState({ meanDiff: '0.2', se: '0.1', dL: '-0.5', dU: '0.5' });
  const [cfgPowIntAnova, setCfgPowIntAnova] = useState({ kA: '2', kB: '3', nPerCell: '20', fInt: '0.25' });
  const [cfgPowCorr, setCfgPowCorr] = useState({ n: '50', r: '0.3' });
  const [cfgReqnT, setCfgReqnT] = useState({ d: '0.5' });
  const [cfgReqnCorr, setCfgReqnCorr] = useState({ r: '0.3' });
  const [cfgReqnOneProp, setCfgReqnOneProp] = useState({ p0: '0.5', p1: '0.7' });
  const [cfgReqnTwoProp, setCfgReqnTwoProp] = useState({ p1: '0.5', p2: '0.7' });
  const [cfgReqnWilcoxon, setCfgReqnWilcoxon] = useState({ d: '0.5' });
  const [cfgReqnLogrank, setCfgReqnLogrank] = useState({ hr: '0.7' });
  const [cfgReqnOls, setCfgReqnOls] = useState({ rSquared: '0.2' });
  const [cfgReqnAnova, setCfgReqnAnova] = useState({ cohenF: '0.25', k: '3' });
  const [cfgPowTtest, setCfgPowTtest] = useState({ n1: '30', n2: '30', d: '0.5' });
  const [cfgPowOneProp, setCfgPowOneProp] = useState({ n: '50', p0: '0.5', p1: '0.7' });
  const [cfgPowTwoProp, setCfgPowTwoProp] = useState({ n1: '50', n2: '50', p1: '0.5', p2: '0.7' });
  const [cfgPowWilcoxon, setCfgPowWilcoxon] = useState({ n1: '30', n2: '30', d: '0.5' });
  const [cfgPowLogrank, setCfgPowLogrank] = useState({ nEvents: '60', hr: '0.7' });
  const [cfgPowRmanova, setCfgPowRmanova] = useState({ k: '3', n: '20', epsilon: '1', f: '0.25' });
  const [cfgPowOlsApa, setCfgPowOlsApa] = useState({ rSquared: '0.2', n: '50', k: '3' });
  const [cfgPowSpearman, setCfgPowSpearman] = useState({ n: '50', rho: '0.3' });

  // ── survival analysis / time series / outlier detection ──────────────────
  const [outlierK, setOutlierK] = useState('5');
  const [outlierSeed, setOutlierSeed] = useState('42');

  // ── econometrics / GAM / mixture models / distance ────────────────────────
  const [gamDf, setGamDf] = useState('5');
  const [lpaProfiles, setLpaProfiles] = useState('2');

  // ── bootstrap ──────────────────────────────────────────────────────────────
  const [bsResult, setBsResult]     = useState(null);
  const [bsRunning, setBsRunning]   = useState(false);
  const [medBs, setMedBs]           = useState(null);
  const [medBsRunning, setMedBsRunning] = useState(false);
  const [powerResult, setPowerResult] = useState(null);
  const [powerRunning, setPowerRunning] = useState(false);

  const aval = parseFinite(alpha, 0.05);

  // ── derived data vectors ───────────────────────────────────────────────────
  const groups   = useMemo(() => grpVar ? [...new Set(data.map(r => r[grpVar]))].filter(v => v != null) : [], [data, grpVar]);
  const getVals  = useCallback(g => finiteNums(data.filter(r => r[grpVar] === g).map(r => r[tgtVar])), [data, grpVar, tgtVar]);
  const g1vals   = useMemo(() => g1 && g1 !== '—' ? getVals(g1) : [], [getVals, g1]);
  const g2vals   = useMemo(() => g2 && g2 !== '—' ? getVals(g2) : [], [getVals, g2]);
  const allTgt   = useMemo(() => finiteNums(data.map(r => r[tgtVar])), [data, tgtVar]);
  const xy       = useMemo(() => { const pts = data.filter(r => rowFinite(r, [xVar, yVar])); return { xs: pts.map(r => +r[xVar]), ys: pts.map(r => +r[yVar]) }; }, [data, xVar, yVar]);
  const xyz      = useMemo(() => { const pts = data.filter(r => rowFinite(r, [xVar, yVar, zVar])); return { xs: pts.map(r => +r[xVar]), ys: pts.map(r => +r[yVar]), zs: pts.map(r => +r[zVar]) }; }, [data, xVar, yVar, zVar]);
  const medXMY   = useMemo(() => { const pts = data.filter(r => rowFinite(r, [xVar, mVar, yVar])); return { X: pts.map(r => +r[xVar]), M: pts.map(r => +r[mVar]), Y: pts.map(r => +r[yVar]) }; }, [data, xVar, mVar, yVar]);
  const modXZY   = useMemo(() => { const pts = data.filter(r => rowFinite(r, [xVar, zVar, yVar])); return { X: pts.map(r => +r[xVar]), Z: pts.map(r => +r[zVar]), Y: pts.map(r => +r[yVar]) }; }, [data, xVar, zVar, yVar]);
  const rmMatrix = useMemo(() => { const cols = rmCols.filter(c => numeric.includes(c)); return data.filter(r => rowFinite(r, cols)).map(r => cols.map(c => +r[c])); }, [data, rmCols, numeric]);
  const scaleMatrix = useMemo(() => { const cols = scaleVars.filter(c => numeric.includes(c)); return data.filter(r => rowFinite(r, cols)).map(r => cols.map(c => +r[c])); }, [data, scaleVars, numeric]);
  const normG1   = useMemo(() => normalityDP(g1vals), [g1vals]);
  const normG2   = useMemo(() => normalityDP(g2vals), [g2vals]);
  const levene   = useMemo(() => g1vals.length >= 2 && g2vals.length >= 2 ? leveneTest([g1vals, g2vals]) : null, [g1vals, g2vals]);

  // ── bootstrap runners ──────────────────────────────────────────────────────
  const onRunBs = useCallback(async () => {
    if (!allTgt.length) return;
    const B = Math.max(100, Math.min(20000, parseInt(bsB, 10) || 1999));
    const seed = parseInt(bsSeed, 10) || 42;
    setBsRunning(true);
    setBsResult(null);
    try {
      const res = await runBootstrapCI(allTgt, bsStat, B, aval, seed);
      setBsResult(res ? { ...res, test: 'Bootstrap CI', stat: bsStat } : null);
    } catch {
      setBsResult(null);
    } finally {
      setBsRunning(false);
    }
  }, [allTgt, bsStat, aval, bsSeed, bsB]);

  const onRunMedBs = useCallback(async () => {
    const { X, M, Y } = medXMY;
    if (!X.length) return;
    const B = Math.max(100, Math.min(20000, parseInt(bsB, 10) || 1999));
    const seed = parseInt(bsSeed, 10) || 42;
    setMedBsRunning(true);
    setMedBs(null);
    try {
      const res = await runBootstrapMediation(X, M, Y, B, aval, seed);
      setMedBs(res);
    } catch {
      setMedBs(null);
    } finally {
      setMedBsRunning(false);
    }
  }, [medXMY, aval, bsSeed, bsB]);

  // ── power calculators (worker when available) ─────────────────────────────
  useEffect(() => {
    if (!POWER_TESTS.has(active)) {
      setPowerResult(null);
      setPowerRunning(false);
      return undefined;
    }
    let cancelled = false;
    setPowerRunning(true);
    setPowerResult(null);

    (async () => {
      try {
        let r = null;
        if (active === 'pow_anova') {
          const f = parseFinite(powAnovaF, 0.25);
          const k = Math.max(2, parseInt(powKgroups, 10) || 3);
          const np = Math.max(2, parseInt(powNperGrp, 10) || 20);
          const pw = await runPowerANOVA(f, k, np, aval, 42);
          if (pw == null) return;
          r = {
            test: 'ANOVA Power',
            power: pw,
            cohenF: f, kGroups: k, nPerGroup: np,
            apa: `ANOVA empirical power ≈ ${(100 * pw).toFixed(1)}% (Cohen's f=${f}, k=${k}, n/group=${np}, α=${aval})`,
          };
        } else if (active === 'pow_chi') {
          const w = parseFinite(powChiW, 0.3);
          const df = Math.max(1, parseInt(powChiDf, 10) || 4);
          const n = Math.max(2, parseInt(powChiN, 10) || 100);
          const pw = await runPowerChi(w, df, n, aval);
          if (pw == null) return;
          r = {
            test: 'Chi-square Power',
            power: pw, cohenW: w, df, n,
            apa: `χ² approx. power ≈ ${(100 * pw).toFixed(1)}% (w=${w}, df=${df}, N=${n}, α=${aval})`,
          };
        } else if (active === 'pow_logit') {
          const or = parseFinite(powLogitOr, 2);
          const p0 = parseFinite(powLogitP0, 0.3);
          const ng = Math.max(5, parseInt(powLogitN, 10) || 50);
          const pw = await runPowerLogistic(or, p0, ng, aval);
          if (pw == null) return;
          r = {
            test: 'Logistic Power',
            power: pw, oddRatio: or, pControl: p0, nPerGroup: ng,
            apa: `Two-group logistic power ≈ ${(100 * pw).toFixed(1)}% (OR=${or}, p₀=${p0}, n/group=${ng}, α=${aval})`,
          };
        } else if (active === 'pow_mixed') {
          const ICCv = parseFinite(powMixedIcc, 0.05);
          const m = Math.max(2, parseInt(powMixedM, 10) || 10);
          const j = Math.max(1, parseInt(powMixedJ, 10) || 15);
          const d = parseFinite(powMixedD, 0.5);
          const pw = await runPowerMixed(ICCv, m, j, d, aval);
          if (pw == null) return;
          r = {
            test: 'Mixed-models Power',
            power: pw, ICC: ICCv, clustersPerArm: m, subjectsPerCluster: j, CohenD: d,
            apa: `Cluster-randomised t-style power ≈ ${(100 * pw).toFixed(1)}% (ICC=${ICCv}, m=${m}, n/cluster=${j}, d=${d}, α=${aval})`,
          };
        } else if (active === 'pow_med') {
          const aHat = parseFinite(powMedA, 0.3);
          const bHat = parseFinite(powMedB, 0.4);
          const sea = parseFinite(powMedSea, 0.1);
          const seb = parseFinite(powMedSeb, 0.1);
          const mc = await runPowerMediation(aHat, bHat, sea, seb, 2000, aval, 42);
          if (!mc) return;
          r = {
            test: 'Mediation Power',
            powerMC: mc.powerMC,
            powerAsymp: mc.powerAsymp,
            zObs: mc.zObs,
            apa: `Indirect effect power MC ≈ ${(100 * mc.powerMC).toFixed(1)}% (asymp Sobel ${(100 * mc.powerAsymp).toFixed(1)}%); z_obs=${mc.zObs}`,
          };
        }
        if (!cancelled) setPowerResult(r);
      } catch {
        if (!cancelled) setPowerResult(null);
      } finally {
        if (!cancelled) setPowerRunning(false);
      }
    })();

    return () => { cancelled = true; };
  }, [
    active, aval,
    powAnovaF, powKgroups, powNperGrp,
    powChiW, powChiDf, powChiN,
    powLogitOr, powLogitP0, powLogitN,
    powMixedIcc, powMixedM, powMixedJ, powMixedD,
    powMedA, powMedB, powMedSea, powMedSeb,
  ]);

  // ── result computation ─────────────────────────────────────────────────────
  const result = useMemo(() => {
    try {
      const a = active;
      if (POWER_TESTS.has(a)) return null;
      if (a === 't_welch')   return tWelch(g1vals, g2vals);
      if (a === 't_one')     return tOne(allTgt, parseFinite(mu0, 0));
      if (a === 't_paired')  return tPaired(g1vals, g2vals);
      if (a === 'trimmed')   return yuentTest(g1vals, g2vals);
      if (a === 'z_known')   return zTestKnownSD(avg(allTgt), parseFinite(mu0, 0), parseFinite(sigma, 1), allTgt.length);
      if (a === 'sign')      return signTest(allTgt, parseFinite(mu0, 0));
      if (a === 'mwu')       return mannWhitney(g1vals, g2vals);
      if (a === 'wilcoxon')  return wilcoxonSR(g1vals, g2vals.length === g1vals.length ? g2vals : null);
      if (a === 'anova')     return oneWayANOVA(groups.map(g => ({ name: g, vals: getVals(g) })).filter(g => g.vals.length >= 2));
      if (a === 'welch_anova') return welchANOVA(groups.map(g => ({ name: g, vals: getVals(g) })));
      if (a === 'twoway')    return twoWayANOVA(data, cat1, cat2, tgtVar);
      if (a === 'ancova')    { const cov = groups.map(g => finiteNums(data.filter(r => r[grpVar] === g).map(r => r[xVar]))); return ancova(groups.map(g => ({ name: g, vals: getVals(g) })), cov); }
      if (a === 'rm_anova')  return rmANOVA(rmMatrix);
      if (a === 'friedman')  return friedman(rmMatrix);
      if (a === 'kruskal')   return kruskalWallis(groups.map(g => ({ name: g, vals: getVals(g) })));
      if (a === 'cochranQ')  return cochranQ(rmMatrix);
      if (a === 'chisq')     return chiSquare(data, cat1, cat2);
      if (a === 'chigof')    {
        if (allTgt.length < 6) return null;
        const bins = (() => {
          const lo = Math.min(...allTgt), hi = Math.max(...allTgt), w = (hi - lo) / 6 || 1, cs = Array(6).fill(0);
          allTgt.forEach(x => { cs[Math.min(Math.floor((x - lo) / w), 5)]++; });
          return cs;
        })();
        const exp = bins.reduce((s, v) => s + v, 0) / 6;
        return chiGoF(bins, Array(6).fill(exp));
      }
      if (a === 'fisher')    return fisherExact(+fx_a, +fx_b, +fx_c, +fx_d);
      if (a === 'mcnemar')   return mcnemar(+fx_b, +fx_c);
      if (a === 'binomial')  return binomialTest(+binoK, +binoN, parseFinite(binoP, 0.5));
      if (a === 'prop1')     return onePropZ(+p1x, +p1n, parseFinite(mu0, 0.5));
      if (a === 'prop2')     return twoPropZ(+p1x, +p1n, +p2x, +p2n);
      if (a === 'pearson')   return pearsonTest(xy.xs, xy.ys);
      if (a === 'spearman')  return spearman(xy.xs, xy.ys);
      if (a === 'kendall')   return kendallTau(xy.xs, xy.ys);
      if (a === 'partial')   return partialCorr(xyz.xs, xyz.ys, xyz.zs);
      if (a === 'pointbis')  { const cats = [...new Set(data.map(r => r[cat1]))].filter(v => v != null).sort(); const posVal = cats[1] || cats[0]; const rows = data.filter(r => cats.includes(r[cat1]) && Number.isFinite(+r[xVar])); return pointBiserial(rows.map(r => r[cat1] === posVal ? 1 : 0), rows.map(r => +r[xVar])); }
      if (a === 'ols_simple') return simpleOLS(xy.xs, xy.ys);
      if (a === 'ols_multi') { const Xc = preds.filter(c => c && c !== yVar); if (!Xc.length) return null; const rows = data.filter(r => rowFinite(r, [yVar, ...Xc])); return multipleOLS(rows.map(r => +r[yVar]), rows.map(r => Xc.map(c => +r[c])), Xc); }
      if (a === 'polynomial') return polynomialOLS(xy.xs, xy.ys, parseInt(polDeg) || 2);
      if (a === 'hierarchical') { const Xc1 = preds.filter(c => c && c !== yVar).slice(0, 1); const Xc2 = preds.filter(c => c && c !== yVar).slice(1); if (!Xc1.length || !Xc2.length) return null; const cols = [yVar, ...preds.filter(c => c)]; const rows = data.filter(r => rowFinite(r, cols)); const Y = rows.map(r => +r[yVar]); return hierarchicalOLS(Y, rows.map(r => Xc1.map(c => +r[c])), rows.map(r => Xc2.map(c => +r[c])), Xc1, Xc2); }
      if (a === 'logistic') {
        const Xc = preds.filter(c => c);
        if (!Xc.length || !cat1) return null;
        const cats = [...new Set(data.map(r => r[cat1]))].filter(v => v != null).sort();
        const posVal = cats[1] || cats[0];
        const rows = data.filter(r => cats.includes(r[cat1]) && rowFinite(r, Xc));
        return logisticReg(rows.map(r => r[cat1] === posVal ? 1 : 0), rows.map(r => Xc.map(c => +r[c])), Xc);
      }
      if (a === 'ordinal') {
        const Xc = preds.filter(c => c);
        if (!Xc.length || !cat1) return null;
        const rowsAll = data.filter(r => r[cat1] != null && rowFinite(r, Xc));
        const levelsOrd = [...new Set(rowsAll.map(r => r[cat1]))];
        if (levelsOrd.length < 2) return null;
        return ordinalLogisticRegression(rowsAll.map(r => r[cat1]), rowsAll.map(r => Xc.map(c => +r[c])), Xc);
      }
      if (a === 'poisson' || a === 'negbinom') {
        const Xc = preds.filter(c => c && c !== yVar);
        if (!Xc.length || !yVar) return null;
        const rows = data.filter(r => rowFinite(r, [yVar, ...Xc]) && +r[yVar] >= 0);
        const Yi = rows.map(r => Math.round(+r[yVar]));
        const Xmat = rows.map(r => Xc.map(c => +r[c]));
        return a === 'poisson' ? poissonRegression(Yi, Xmat, Xc) : negativeBinomialRegression(Yi, Xmat, Xc);
      }
      if (a === 'mediation') return mediation(medXMY.X, medXMY.M, medXMY.Y);
      if (a === 'med_bootstrap') return null;
      if (a === 'moderation') return moderation(modXZY.X, modXZY.Z, modXZY.Y, xVar, zVar);
      if (a === 'tost')      return tost(g1vals, g2vals, parseFinite(tostL, -0.5), parseFinite(tostH, 0.5), aval);
      if (a === 'bayes_t')   { const tw = tWelch(g1vals, g2vals); if (!tw) return null; return { ...tw, ...bayesFactorT(tw.t, tw.na, tw.nb, parseFinite(bfPrior, 0.707)), test: 'Bayesian t-test (JZS)' }; }
      if (a === 'bayes_r')   { const pr = pearsonTest(xy.xs, xy.ys); if (!pr) return null; return { ...pr, ...bayesFactorCorr(pr.r, pr.n), test: 'Bayesian Correlation' }; }
      if (a === 'pca')       return pca(data, scaleVars.filter(c => numeric.includes(c)));
      if (a === 'efa')       return efa(data, scaleVars.filter(c => numeric.includes(c)), parseInt(nFactors) || 2);
      if (a === 'manova') {
        const ys = scaleVars.filter(c => numeric.includes(c));
        if (!grpVar || ys.length < 2) return null;
        return manova(data, ys, grpVar);
      }
      if (a === 'cancorr') {
        const ys = scaleVars.filter(c => numeric.includes(c));
        const mid = Math.max(1, Math.floor(ys.length / 2));
        const xBlk = ys.slice(0, mid);
        const yBlk = ys.slice(mid);
        if (xBlk.length < 1 || yBlk.length < 1) return null;
        return canonicalCorr(data, xBlk, yBlk);
      }
      if (a === 'lda') {
        const Xv = preds.filter(c => numeric.includes(c));
        if (!grpVar || Xv.length < 1) return null;
        return linearDiscriminant(data, grpVar, Xv);
      }
      if (a === 'cronbach')  return cronbachAlpha(scaleMatrix);
      if (a === 'splithalf') return splitHalf(scaleMatrix);
      if (a === 'icc')       return icc(scaleMatrix);
      if (a === 'kappa')     return cohensKappa(data.map(r => r[cat1]), data.map(r => r[cat2]));
      if (a === 'meta')      { const studies = metaInput.trim().split('\n').map(line => { const p = line.split(','); const d = parseFloat(p[1]), se = parseFloat(p[2]); return { label: p[0]?.trim(), d, se }; }).filter(s => Number.isFinite(s.d) && Number.isFinite(s.se) && s.se > 0); return metaAnalysis(studies); }
      if (a === 'did')       return differencesInDifferences(parseNumList(didPCStr), parseNumList(didPOStr), parseNumList(didPTStr), parseNumList(didPTtStr));
      if (a === 'grubbs')    return grubbsTest(allTgt);
      if (a === 'normality') { const dp = normalityDP(allTgt), sw = shapiroWilk(allTgt); return { test: 'Normality Tests', dp, sw, vals: allTgt, apa: `D'Ag-P: K²=${dp?.stat}, ${dp?.p < .001 ? 'p<.001' : `p=${dp?.p.toFixed(3)}`} ${dp?.normal ? '✓' : '⚠'}. Shapiro-Wilk: W=${sw?.stat}, p=${sw?.p.toFixed(3)} ${sw?.normal ? '✓' : '⚠'}.` }; }
      if (a === 'homogeneity') { const allG = groups.map(g => getVals(g)).filter(v => v.length >= 2); return { test: 'Homogeneity', levene: leveneTest(allG), bartlett: bartlettTest(allG), apa: '' }; }
      if (a === 'samplesize') { const pow = parseFinite(ssPow, 0.8), d = parseFinite(ssD, 0.5), r_ = parseFinite(ssR, 0.3); return { test: 'Sample Size', ntTest: requiredN(d, pow, aval), nCorr: requiredNCorr(r_, pow, aval), d, r: r_, pow, apa: `For d=${d}: n=${requiredN(d, pow, aval)}/group. For r=${r_}: N=${requiredNCorr(r_, pow, aval)}.` }; }
      if (a === 'omega') return omegaMcDonald(scaleMatrix);
      if (a === 'parallel') return parallelAnalysis(data, scaleVars.filter(c => numeric.includes(c)));
      if (a === 'irt_1pl') return irtRasch1PL(dichotomizeMatrix(scaleMatrix));
      if (a === 'irt_2pl') return irt2PL(dichotomizeMatrix(scaleMatrix));
      if (a === 'scale_score') {
        const revIdx = reverseItems.map(v => scaleVars.indexOf(v)).filter(i => i >= 0);
        return scaleScore(scaleMatrix, { method: scaleMethod, reverseIdx: revIdx });
      }
      if (a === 'kmeans') return kmeans(data, scaleVars.filter(c => numeric.includes(c)), parseInt(clusterK, 10) || 3);
      if (a === 'hclust') return hierarchicalCluster(data, scaleVars.filter(c => numeric.includes(c)), linkage);
      if (a === 'lca') return latentClassAnalysis(data, [cat1, cat2].filter(c => c), parseInt(nLcaClasses, 10) || 2);
      if (a === 'hlm_ri') return hlmRandomIntercept(data, yVar, level2Var || grpVar, preds.slice(0, 1));
      if (a === 'hlm_rs') return hlmRandomSlope(data, yVar, level2Var || grpVar, xVar);
      if (a === 'icc_ml') return iccMultilevel(data, yVar, level2Var || grpVar);
      if (a === 'psm') return propensityScoreMatch(data, treatVar || cat1, yVar, preds.filter(c => c !== yVar));
      if (a === 'iv2sls') return iv2sls(data, yVar, xVar, ivInstrument, preds.filter(c => c !== xVar && c !== ivInstrument));
      if (a === 'its') {
        return interruptedTimeSeries(parseNumList(itsTimeStr), parseNumList(itsValStr), parseFinite(itsCut, 0));
      }
      if (a === 'rdd') {
        const xs = finiteNums(data.map(r => r[xVar]));
        const ys = finiteNums(data.map(r => r[yVar]));
        const n = Math.min(xs.length, ys.length);
        return regressionDiscontinuity(xs.slice(0, n), ys.slice(0, n), parseFinite(rddCutoff, 0), parseFinite(rddBw, 0));
      }
      if (a === 'centrality' || a === 'community' || a === 'sociogram') {
        const net = networkFromEdgeList(edgeList);
        if (!net?.A?.length) return null;
        if (a === 'centrality') return centralityMeasures(net.A);
        if (a === 'community') return communityDetection(net.A);
        const layout = sociogramLayout(net.A);
        return layout ? { ...layout, nodes: net.nodes } : null;
      }
      if (a === 'effectconv') return convertEffectSize(effFrom, effVal);
      if (a === 'corrections') {
        const pairs = pairsInput.split(',').map((p, i) => {
          const pv = parseFloat(p.trim());
          return Number.isFinite(pv) ? { label: `Test ${i + 1}`, p: pv } : null;
        }).filter(Boolean);
        if (!pairs.length) return null;
        const fn = corrMeth === 'bonferroni' ? bonferroni : corrMeth === 'holm' ? holm : bh;
        const adjusted = fn(pairs);
        return { test: 'Multiple Comparisons', method: corrMeth, pairs: adjusted, nSig: adjusted.filter(p => p.sig).length };
      }
      if (a === 'sensitivity') return sensitivityLOO(allTgt, v => tOne(v, parseFinite(mu0, 0)));
      // ── batch 9: ABM ──────────────────────────────────────────────────────────
      if (a === 'abm_morani') { const nAg = parseInt(abmNAgents, 10) || 100; const agents = Array.from({length: nAg}, (_, i) => ({ id: i, x: i % 10 - 5 + Math.random() * 2, y: Math.floor(i / 10) - 5 + Math.random() * 2, value: Math.random() * 10 })); const r = moranIMulti(agents, abmValueField || 'value'); return r ? { ...r, test: 'Moran\'s I (Agents)' } : null; }
      if (a === 'abm_conv') { const runs = allTgt.length >= 10 ? allTgt : Array.from({length: 50}, () => Math.random() * 10); const w = parseInt(abmWindow, 10) || 10; const tol = parseFinite(abmTolerance, 0.01); const r = simulationConvergence(runs, { window: w, tolerance: tol }); return r ? { ...r, test: 'Simulation Convergence' } : null; }
      if (a === 'abm_sobol') { const p = Math.min(3, numeric.length || 3); const n = 30; const inputs = Array.from({length: p}, (_, j) => Array.from({length: n}, () => Math.random() * 10)); const output = inputs[0].map((_, i) => inputs.reduce((s, inp) => s + inp[i] * (1 + i), 0)); const r = sobolSensitivity(inputs, output); return r ? { ...r, test: 'Sobol Sensitivity (ABM)' } : null; }
      if (a === 'abm_summary') { const nAg = parseInt(abmNAgents, 10) || 100; const agents = Array.from({length: nAg}, (_, i) => ({ id: i, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, value: Math.random() * 10 })); const r = agentSummaryStats(agents, ['x', 'y', 'value']); return r ? { ...r, test: 'Agent Summary Stats' } : null; }
      if (a === 'abm_scenario') { if (g1vals.length < 2 && g2vals.length < 2) { const scenarios = [{ name: 'A', values: Array.from({length: 15}, () => Math.random() * 10) }, { name: 'B', values: Array.from({length: 15}, () => Math.random() * 10) }]; const r = scenarioComparison(scenarios); return r ? { ...r, test: 'Scenario Comparison' } : null; } const r = scenarioComparison([{ name: 'A', values: g1vals.slice(0, 15) }, { name: 'B', values: g2vals.slice(0, 15) }]); return r ? { ...r, test: 'Scenario Comparison' } : null; }
      if (a === 'abm_threshold') { const nAg = parseInt(abmNAgents, 10) || 100; const thresholds = Array.from({length: nAg}, () => Math.random()); const r = thresholdModel(nAg, thresholds, 2); return r ? { ...r, test: 'Threshold Model' } : null; }
      if (a === 'abm_diffusion') { const n = 10; const sd = parseInt(abmSeed, 10) || 42; const adj = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i !== j && Math.random() < 0.3 ? 1 : 0)); const r = networkDiffusion(adj, [0], { seed: sd, steps: 5 }); return r ? { ...r, test: 'Network Diffusion' } : null; }
      if (a === 'abm_segregation') { const nAg = parseInt(abmNAgents, 10) || 100; const dataA = Array.from({length: nAg}, (_, i) => ({ group: i % 3 === 0 ? 'A' : 'B', loc: `L${i % 5}` })); const r = segregationIndex(dataA, 'group', 'loc'); return r ? { ...r, test: 'Segregation Index' } : null; }
      // ── batch 9: Bandit ─────────────────────────────────────────────────────
      if (a === 'bandit_eps') { const nArms = parseInt(banditNArms, 10) || 5; const nIter = parseInt(banditNIter, 10) || 500; const eps = parseFinite(banditEpsilon, 0.1); const sd = parseInt(banditSeed, 10) || 42; const arms = Array.from({length: nArms}, (_, i) => i); const rewards = Array.from({length: nArms}, (_, i) => () => Math.random() * (0.2 + i * 0.15)); const r = epsilonGreedy(arms, rewards, nIter, { epsilon: eps, seed: sd }); return r ? { ...r, test: 'Epsilon-Greedy' } : null; }
      if (a === 'bandit_ucb') { const nArms = parseInt(banditNArms, 10) || 5; const nIter = parseInt(banditNIter, 10) || 500; const arms = Array.from({length: nArms}, (_, i) => i); const rewards = Array.from({length: nArms}, (_, i) => () => Math.random() * (0.2 + i * 0.15)); const r = ucb(arms, rewards, nIter); return r ? { ...r, test: 'UCB' } : null; }
      if (a === 'bandit_thompson') { const nArms = parseInt(banditNArms, 10) || 5; const nIter = parseInt(banditNIter, 10) || 500; const sd = parseInt(banditSeed, 10) || 42; const arms = Array.from({length: nArms}, (_, i) => i); const rewards = Array.from({length: nArms}, () => () => Math.random() < 0.5 ? 1 : 0); const r = thompsonSampling(arms, rewards, nIter, { seed: sd }); return r ? { ...r, test: 'Thompson Sampling' } : null; }
      if (a === 'bandit_context') { const nArms = parseInt(banditNArms, 10) || 5; const nIter = parseInt(banditNIter, 10) || 500; const sd = parseInt(banditSeed, 10) || 42; const arms = Array.from({length: nArms}, (_, i) => Array.from({length: 2}, () => (Math.random() - 0.5) * 2)); const r = contextualBandit(arms, 2, nIter, { seed: sd }); return r ? { ...r, test: 'Contextual Bandit (LinUCB)' } : null; }
      if (a === 'bandit_pg') { const nArms = parseInt(banditNArms, 10) || 5; const nEp = parseInt(banditNEpisodes, 10) || 100; const sd = parseInt(banditSeed, 10) || 42; const lr = parseFinite(banditLr, 0.01); const arms = Array.from({length: nArms}, (_, i) => i); const rewards = Array.from({length: nArms}, (_, i) => () => Math.random() * (0.2 + i * 0.15)); const r = policyGradient(arms, rewards, nEp, { seed: sd, lr }); return r ? { ...r, test: 'Policy Gradient' } : null; }
      if (a === 'bandit_softmax') { const nArms = parseInt(banditNArms, 10) || 5; const nIter = parseInt(banditNIter, 10) || 500; const sd = parseInt(banditSeed, 10) || 42; const tau = parseFinite(banditTemp, 1); const arms = Array.from({length: nArms}, (_, i) => i); const rewards = Array.from({length: nArms}, (_, i) => () => Math.random() * (0.2 + i * 0.15)); const r = softmaxBandit(arms, rewards, nIter, { seed: sd, tau }); return r ? { ...r, test: 'Softmax Bandit' } : null; }
      if (a === 'bandit_ql') { const nStates = parseInt(banditNStates, 10) || 10; const nActions = parseInt(banditNActions, 10) || 4; const sd = parseInt(banditSeed, 10) || 42; const eps = parseFinite(banditEpsilon, 0.1); const lr = parseFinite(banditLr, 0.1); const nEp = parseInt(banditNEpisodes, 10) || 50; const r = qLearning(nStates, nActions, null, null, { seed: sd, episodes: nEp, epsilon: eps, lr }); return r ? { ...r, test: 'Q-Learning' } : null; }
      if (a === 'bandit_sarsa') { const nStates = parseInt(banditNStates, 10) || 10; const nActions = parseInt(banditNActions, 10) || 4; const sd = parseInt(banditSeed, 10) || 42; const eps = parseFinite(banditEpsilon, 0.1); const lr = parseFinite(banditLr, 0.1); const nEp = parseInt(banditNEpisodes, 10) || 50; const r = sarsa(nStates, nActions, null, null, { seed: sd, episodes: nEp, epsilon: eps, lr }); return r ? { ...r, test: 'SARSA' } : null; }
      if (a === 'bandit_dqn') { const nStates = parseInt(banditNStates, 10) || 10; const nActions = parseInt(banditNActions, 10) || 4; const sd = parseInt(banditSeed, 10) || 42; const eps = parseFinite(banditEpsilon, 0.1); const lr = parseFinite(banditLr, 0.01); const nEp = parseInt(banditNEpisodes, 10) || 30; const r = deepQNetwork(nStates, nActions, { seed: sd, episodes: nEp, epsilon: eps, lr }); return r ? { ...r, test: 'Deep Q-Network' } : null; }
      // ── batch 9: Record Linkage ──────────────────────────────────────────────
      if (a === 'link_jaro') { const s1 = String(data[0]?.[cat1] || 'kitten'); const s2 = String(data[1]?.[cat1] || 'sitting'); const r = jaroWinkler(s1, s2); return r ? { ...r, test: 'Jaro-Winkler' } : null; }
      if (a === 'link_lev') { const s1 = String(data[0]?.[cat1] || 'kitten'); const s2 = String(data[1]?.[cat1] || 'sitting'); const r = levenshteinDistance(s1, s2); return r ? { ...r, test: 'Levenshtein Distance' } : null; }
      if (a === 'link_fel') { const pairs = data.slice(0, 30).map(r => ({ s1: String(r[cat1] || r[xVar] || ''), s2: String(r[cat2] || r[yVar] || '') })); if (!pairs.length) return null; const r = fellegiSunter(pairs); return r ? { ...r, test: 'Fellegi-Sunter' } : null; }
      if (a === 'link_block') { const blockVar = cat1 || numeric[0]; if (!blockVar || !data.length) return null; const r = recordBlocking(data.slice(0, 50), blockVar); return r ? { ...r, test: 'Record Blocking' } : null; }
      if (a === 'link_thresh') { if (!numeric.length) return null; const scores = data.filter(r => rowFinite(r, numeric.slice(0, 1))).map(r => +r[numeric[0]] * 0.1 + 0.5); const labels = data.slice(0, scores.length).map((r, i) => (+r[numeric[0]] || 0) > avg(allTgt) ? 1 : 0); if (!scores.length || scores.length !== labels.length) return null; const r = matchThreshold(scores, labels); return r ? { ...r, test: 'Match Threshold' } : null; }
      if (a === 'link_prob') { const pairs = data.slice(0, 30).map(r => ({ agree: (+r[numeric[0]] || 0) > (+r[numeric[1]] || 0), compared: Math.min(Math.max(Math.abs(+r[numeric[0]] || 0) % 10, 1), 10) })); if (!pairs.length) return null; const r = probabilisticRecordLinkage(pairs); return r ? { ...r, test: 'Probabilistic Record Linkage' } : null; }
      if (a === 'link_dedup') { const keyField = cat1 || 'name'; const records = data.slice(0, 20).map((r, i) => ({ id: i, [keyField]: String(r[keyField] || `rec${i}`) })); if (!records.length) return null; const r = deduplication(records, [keyField]); return r ? { ...r, test: 'Deduplication' } : null; }
      // ── batch 9: Privacy ─────────────────────────────────────────────────────
      if (a === 'priv_laplace') { const vals = allTgt.length ? allTgt : Array.from({length: 15}, () => Math.random() * 10); const eps = parseFinite(privEpsilon, 1); const sd = parseInt(banditSeed, 10) || 42; const r = laplaceMechanism(vals.slice(0, 15), eps, { seed: sd }); return r ? { ...r, test: 'Laplace Mechanism' } : null; }
      if (a === 'priv_synthetic') { if (!data.length) return null; const sd = parseInt(banditSeed, 10) || 42; const r = bootstrapSynthetic(data.slice(0, 20), { seed: sd }); return r ? { ...r, test: 'Bootstrap Synthetic' } : null; }
      if (a === 'priv_kanon') { const qid = cat1 ? [cat1] : categorical.slice(0, 1); if (!qid.length || !data.length) return null; const r = kAnonymityCheck(data.slice(0, 20), qid); return r ? { ...r, test: 'K-Anonymity' } : null; }
      if (a === 'priv_diff') { const eps = parseFinite(privEpsilon, 1); const delta = parseFinite(privDelta, 0.01); const queries = [() => avg(allTgt.slice(0, 10)), () => avg(allTgt.slice(10, 20) || allTgt.slice(0, 10))]; if (!allTgt.length) return null; const r = differentialPrivacy(queries, eps, delta); return r ? { ...r, test: 'Differential Privacy' } : null; }
      if (a === 'priv_mask') { if (!data.length || !numeric[0]) return null; const sd = parseInt(banditSeed, 10) || 42; const pct = parseInt(privPct, 10) || 20; const r = dataMasking(data.slice(0, 15), numeric[0], { seed: sd, pct }); return r ? { ...r, test: 'Data Masking' } : null; }
      if (a === 'priv_ldiv') { const qid = cat1 ? [cat1] : categorical.slice(0, 1); const sc = cat2 || categorical[1] || 'cat2'; if (!qid.length || !data.length) return null; const r = lDiversity(data.slice(0, 20), qid, sc); return r ? { ...r, test: 'l-Diversity' } : null; }
      if (a === 'priv_tclose') { const qid = cat1 ? [cat1] : categorical.slice(0, 1); const sc = cat2 || categorical[1] || 'cat2'; if (!qid.length || !data.length) return null; const r = tCloseness(data.slice(0, 20), qid, sc); return r ? { ...r, test: 't-Closeness' } : null; }
      // ── batch 9: Patient-Reported Outcomes ──────────────────────────────────
      if (a === 'pro_rci') { const bl = g1vals.length >= 3 ? g1vals : allTgt.slice(0, 20); const fu = g2vals.length >= 3 ? g2vals : allTgt.slice(0, 20).map(v => v * 1.1 + 1); if (bl.length < 3 || bl.length !== fu.length) return null; const r = reliableChangeIndex(bl, fu); return r ? { ...r, test: 'Reliable Change Index' } : null; }
      if (a === 'pro_mid') { if (!numeric.length) return null; const scores = data.filter(r => rowFinite(r, numeric.slice(0, 1))).map(r => +r[numeric[0]] * 10); const anchors = data.filter(r => rowFinite(r, numeric.slice(1, 2))).map(r => +r[numeric[1]] || 0); if (scores.length < 5) return null; const anc = anchors.length >= scores.length ? anchors.slice(0, scores.length) : Array.from({length: scores.length}, (_, i) => i % 2); const r = minimalImportantDifference(scores, anc); return r ? { ...r, test: 'Minimal Important Difference' } : null; }
      if (a === 'pro_responder') { const bv = numeric[0]; const fv = numeric[1] || numeric[0]; if (!data.length || !bv || !fv) return null; const r = responderAnalysis(data.slice(0, 20), bv, fv, 2); return r ? { ...r, test: 'Responder Analysis' } : null; }
      if (a === 'pro_eq5d') { const domains = allTgt.length >= 5 ? allTgt.slice(0, 5).map(v => Math.min(5, Math.max(1, Math.round(Math.abs(v * 2) + 1)))) : [2, 3, 1, 1, 2]; const r = eq5dIndex(domains); return r ? { ...r, test: 'EQ-5D Index' } : null; }
      if (a === 'pro_srm') { const bl = g1vals.length >= 3 ? g1vals : allTgt.slice(0, 20); const fu = g2vals.length >= 3 ? g2vals : allTgt.slice(0, 20).map(v => v * 1.1 + 1); if (bl.length < 3 || bl.length !== fu.length) return null; const r = standardizedResponseMean(bl, fu); return r ? { ...r, test: 'Standardized Response Mean' } : null; }
      if (a === 'pro_ctgov') { const pv = cat1 || categorical[0]; const sv = cat2 || categorical[1] || categorical[0]; if (!data.length || !pv || !sv) return null; const r = clinicalTrialsGov(data.slice(0, 20), pv, sv); return r ? { ...r, test: 'Clinical Trials Gov' } : null; }
      if (a === 'pro_consort') { const items = Array.from({length: 10}, (_, i) => i < data.length ? (+data[i]?.[numeric[0]] || 0) > 0 ? 1 : 0 : i % 3 === 0 ? 1 : 0); const r = consortChecklist(items); return r ? { ...r, test: 'CONSORT Checklist' } : null; }
      // ── batch 9: Risk-Adjusted Monitoring ────────────────────────────────────
      if (a === 'ram_cusum') { if (!numeric.length) return null; const binary = data.filter(r => rowFinite(r, numeric.slice(0, 1))).map(r => +r[numeric[0]] > 5 ? 1 : 0).slice(0, 20); const predicted = data.filter(r => rowFinite(r, numeric.slice(1, 2))).map(r => Math.max(0, Math.min(1, (+r[numeric[1]] || 5) / 20))).slice(0, 20); if (binary.length < 10) return null; const r = raCusum(binary, predicted); return r ? { ...r, test: 'RA-CUSUM' } : null; }
      if (a === 'ram_vlad') { if (!numeric.length) return null; const pred = data.filter(r => rowFinite(r, numeric.slice(0, 1))).map(r => Math.max(0, Math.min(1, (+r[numeric[0]] || 5) / 20))).slice(0, 20); const obs = data.filter(r => rowFinite(r, numeric.slice(1, 2))).map(r => +r[numeric[1]] > 5 ? 1 : 0).slice(0, 20); if (pred.length < 5) return null; const r = vlad(pred, obs); return r ? { ...r, test: 'VLAD' } : null; }
      if (a === 'ram_sprt') { if (!numeric.length) return null; const binary = data.filter(r => rowFinite(r, numeric.slice(0, 1))).map(r => +r[numeric[0]] > 5 ? 1 : 0).slice(0, 20); const predicted = data.filter(r => rowFinite(r, numeric.slice(1, 2))).map(r => Math.max(0, Math.min(1, (+r[numeric[1]] || 5) / 20))).slice(0, 20); if (binary.length < 10) return null; const r = raSprt(binary, predicted); return r ? { ...r, test: 'RA-SPRT' } : null; }
      if (a === 'ram_funnel') { if (!data.length || !numeric[0] || !numeric[1]) return null; const r = funnelPlot(data.slice(0, 30), numeric[0], numeric[1]); return r ? { ...r, test: 'Funnel Plot' } : null; }
      if (a === 'ram_cchart') { if (!data.length || !numeric[0] || !numeric[1]) return null; const r = cChartRiskAdjusted(data.slice(0, 30), numeric[0], numeric[1]); return r ? { ...r, test: 'C-Chart Risk-Adjusted' } : null; }
      if (a === 'ram_safety') { const ev = 3; const ex = 1.5; const ttl = 100; const r = safetySignal(ev, ex, ttl); return r ? { ...r, test: 'Safety Signal' } : null; }
      if (a === 'ram_prr') { const events = [2, 5, 1, 3, 0, 4, 2, 1]; const expecteds = [1.5, 3.2, 1.1, 2.8, 0.8, 3.5, 1.9, 1.2]; const totals = [100, 150, 80, 120, 60, 180, 100, 90]; const r = prrAnalysis(events, expecteds, totals); return r ? { ...r, test: 'PRR Analysis' } : null; }
      // ── batch 9: Recommendation ──────────────────────────────────────────────
      if (a === 'rec_cf') { const nU = 5; const nI = 3; const mat = Array.from({length: nU}, (_, u) => Array.from({length: nI}, (_, i) => u === i ? null : Math.round(Math.random() * 3 + 1))); const r = collaborativeFilter(mat); return r ? { ...r, test: 'Collaborative Filter' } : null; }
      if (a === 'rec_mf') { const nU = 5; const nI = 3; const mat = Array.from({length: nU}, (_, u) => Array.from({length: nI}, (_, i) => u === i ? null : Math.round(Math.random() * 3 + 1))); const sd = parseInt(banditSeed, 10) || 42; const r = matrixFactorize(mat, 2, { seed: sd }); return r ? { ...r, test: 'Matrix Factorization' } : null; }
      if (a === 'rec_topn') { const nU = 5; const nI = 3; const mat = Array.from({length: nU}, (_, u) => Array.from({length: nI}, (_, i) => u === i ? null : Math.round(Math.random() * 3 + 1))); const r = topNRecommend(mat, 0); return r ? { ...r, test: 'Top-N Recommendations' } : null; }
      // ── batch 9: Single-Case Experimental Design ─────────────────────────────
      if (a === 'sced_tauu') { const bl = g1vals.length >= 5 ? g1vals : allTgt.slice(0, 10); const it = g2vals.length >= 5 ? g2vals : allTgt.slice(0, 10).map(v => v * 1.2 + 1); if (bl.length < 5 || it.length < 5) return null; const r = tauU(bl, it); return r ? { ...r, baseline: bl, intervention: it, test: 'Tau-U' } : null; }
      if (a === 'sced_pnd') { const bl = g1vals.length >= 5 ? g1vals : allTgt.slice(0, 10); const it = g2vals.length >= 5 ? g2vals : allTgt.slice(0, 10).map(v => v * 1.2 + 1); if (bl.length < 5 || it.length < 5) return null; const r = pnd(bl, it); return r ? { ...r, baseline: bl, intervention: it, test: 'PND' } : null; }
      if (a === 'sced_pem') { const bl = g1vals.length >= 5 ? g1vals : allTgt.slice(0, 10); const it = g2vals.length >= 5 ? g2vals : allTgt.slice(0, 10).map(v => v * 1.2 + 1); if (bl.length < 5 || it.length < 5) return null; const r = pem(bl, it); return r ? { ...r, baseline: bl, intervention: it, test: 'PEM' } : null; }
      if (a === 'sced_nap') { const bl = g1vals.length >= 5 ? g1vals : allTgt.slice(0, 10); const it = g2vals.length >= 5 ? g2vals : allTgt.slice(0, 10).map(v => v * 1.2 + 1); if (bl.length < 5 || it.length < 5) return null; const r = nap(bl, it); return r ? { ...r, baseline: bl, intervention: it, test: 'NAP' } : null; }
      if (a === 'sced_rand') { const bl = g1vals.length >= 5 ? g1vals : allTgt.slice(0, 10); const it = g2vals.length >= 5 ? g2vals : allTgt.slice(0, 10).map(v => v * 1.2 + 1); if (bl.length < 5 || it.length < 5) return null; const sd = parseInt(banditSeed, 10) || 42; const r = randomizationTest(bl, it, { seed: sd }); return r ? { ...r, baseline: bl, intervention: it, test: 'SCED Randomization Test' } : null; }
      if (a === 'sced_bctau') { const bl = g1vals.length >= 5 ? g1vals : allTgt.slice(0, 10); const it = g2vals.length >= 5 ? g2vals : allTgt.slice(0, 10).map(v => v * 1.2 + 1); if (bl.length < 5 || it.length < 5) return null; const r = baselineCorrectedTau(bl, it); return r ? { ...r, baseline: bl, intervention: it, test: 'Baseline-Corrected Tau' } : null; }
      if (a === 'sced_bcsmd') { const bl = g1vals.length >= 5 ? g1vals : allTgt.slice(0, 10); const it = g2vals.length >= 5 ? g2vals : allTgt.slice(0, 10).map(v => v * 1.2 + 1); if (bl.length < 5 || it.length < 5) return null; const r = betweenCaseSMD(bl, it); return r ? { ...r, baseline: bl, intervention: it, test: 'Between-Case SMD' } : null; }
      // ── batch 9: Sensitivity Analysis ────────────────────────────────────────
      if (a === 'sens_morris') { const p = Math.min(3, numeric.length || 3); const n = scaleMatrix.length || 20; const X = Array.from({length: n}, () => Array.from({length: p}, () => Math.random() * 10)); const model = (x) => x.reduce((s, xi, i) => s + xi * (i + 1), 0); const sd = parseInt(sensSeed, 10) || 42; const lv = parseInt(sensGridLevels, 10) || 4; const r = morrisMethod(model, X, { seed: sd, levels: lv }); return r ? { ...r, test: 'Morris Method' } : null; }
      if (a === 'sens_fast') { const p = Math.min(3, numeric.length || 3); const n = scaleMatrix.length || 20; const X = Array.from({length: n}, () => Array.from({length: p}, () => Math.random() * 10)); const model = (x) => x.reduce((s, xi, i) => s + xi * (i + 1), 0); const sd = parseInt(sensSeed, 10) || 42; const r = fastSensitivity(model, X, { seed: sd }); return r ? { ...r, test: 'FAST Sensitivity' } : null; }
      if (a === 'sens_modelcomp') { const r = modelComparison(10, 15, 50, 3, 5); return r ? { ...r, test: 'Model Comparison' } : null; }
      if (a === 'sens_forecast') { const k = Math.min(3, numeric.length || 3); const n = Math.min(10, allTgt.length || 10); const forecasts = Array.from({length: k}, () => Array.from({length: n}, () => Math.random() * 10)); const actual = allTgt.length >= n ? allTgt.slice(0, n) : Array.from({length: n}, () => Math.random() * 10); if (n < 5) return null; const r = forecastCombination(forecasts, actual); return r ? { ...r, test: 'Forecast Combination' } : null; }
      if (a === 'sens_sobol1') { const p = Math.min(3, numeric.length || 3); const n = scaleMatrix.length || 20; const X = Array.from({length: n}, () => Array.from({length: p}, () => Math.random() * 10)); const model = (x) => x.reduce((s, xi, i) => s + xi * (i + 1), 0); const sd = parseInt(sensSeed, 10) || 42; const ns = parseInt(sensNSamples, 10) || 50; const r = sobolFirstOrder(model, X, { seed: sd, nSamples: ns }); return r ? { ...r, test: 'Sobol First Order' } : null; }
      if (a === 'sens_sobolt') { const p = Math.min(3, numeric.length || 3); const n = scaleMatrix.length || 20; const X = Array.from({length: n}, () => Array.from({length: p}, () => Math.random() * 10)); const model = (x) => x.reduce((s, xi, i) => s + xi * (i + 1), 0); const sd = parseInt(sensSeed, 10) || 42; const ns = parseInt(sensNSamples, 10) || 50; const r = sobolTotalIndex(model, X, { seed: sd, nSamples: ns }); return r ? { ...r, test: 'Sobol Total Index' } : null; }
      if (a === 'sens_delta') { const r = deltaMethod([2], [0.5], x => x[0] ** 2); return r ? { ...r, test: 'Delta Method' } : null; }
      if (a === 'sens_andrews') { const p = Math.min(3, numeric.length || 3); const n = scaleMatrix.length || 10; const X = Array.from({length: n}, () => Array.from({length: p}, () => Math.random() * 10 - 5)); if (X.length < 2) return null; const r = andrewsPlot(X); return r ? { ...r, test: 'Andrews Plot' } : null; }
      // ── batch 9: Bootstrap ───────────────────────────────────────────────────
      if (a === 'boot_ci') { const d = allTgt.length >= 5 ? allTgt : Array.from({length: 30}, () => Math.random() * 10); const stat = (arr) => avg(arr); const sd = parseInt(bsSeed, 10) || 42; const B = parseInt(bsB, 10) || 500; const r = bootstrapCI(d, stat, { B, seed: sd }); return r ? { ...r, test: 'Bootstrap CI' } : null; }
      if (a === 'boot_se') { const d = allTgt.length >= 5 ? allTgt : Array.from({length: 30}, () => Math.random() * 10); const stat = (arr) => avg(arr); const sd = parseInt(bsSeed, 10) || 42; const B = parseInt(bsB, 10) || 500; const r = bootstrapSE(d, stat, { B, seed: sd }); return r ? { ...r, test: 'Bootstrap SE' } : null; }
      if (a === 'boot_test') { const d = allTgt.length >= 5 ? allTgt : Array.from({length: 30}, () => Math.random() * 10); const stat = (arr) => avg(arr); const sd = parseInt(bsSeed, 10) || 42; const B = parseInt(bsB, 10) || 500; const r = bootstrapTest(d, stat, 5, { B, seed: sd }); return r ? { ...r, test: 'Bootstrap Test' } : null; }
      if (a === 'boot_jack') { const d = allTgt.length >= 5 ? allTgt : Array.from({length: 30}, () => Math.random() * 10); const stat = (arr) => avg(arr); const r = jackknife(d, stat); return r ? { ...r, test: 'Jackknife' } : null; }
      if (a === 'boot_tci') { const d = allTgt.length >= 10 ? allTgt : Array.from({length: 30}, () => Math.random() * 10); const stat = (arr) => avg(arr); const sd = parseInt(bsSeed, 10) || 42; const B = parseInt(bsB, 10) || 500; const r = bootstrapT_CI(d, stat, { B, seed: sd }); return r ? { ...r, test: 'Bootstrap-t CI' } : null; }
      if (a === 'boot_influence') { const d = allTgt.length >= 5 ? allTgt : Array.from({length: 30}, () => Math.random() * 10); const stat = (arr) => avg(arr); const r = empiricalInfluence(d, stat); return r ? { ...r, test: 'Empirical Influence' } : null; }
      if (a === 'boot_mediation') { if (!data.length || !numeric[0] || !numeric[1] || !numeric[2]) return null; const sd = parseInt(bsSeed, 10) || 42; const B = parseInt(bsB, 10) || 200; const r = bsMediation(data.slice(0, 30), numeric[0], numeric[1], numeric[2], { B, seed: sd }); return r ? { ...r, test: 'Bootstrap Mediation' } : null; }
      if (a === 'boot_modmed') { if (!data.length || !numeric[0] || !numeric[1] || !numeric[2] || !numeric[3]) return null; const r = moderatedMediation(data.slice(0, 30), numeric[0], numeric[1], numeric[2], numeric[3]); return r ? { ...r, test: 'Moderated Mediation' } : null; }
      if (a === 'boot_splitconf') { const d = allTgt.length >= 30 ? allTgt : Array.from({length: 30}, () => Math.random() * 10); const r = splitConformal(d.slice(0, 15), d.slice(15, 30)); return r ? { ...r, test: 'Split Conformal' } : null; }
      if (a === 'boot_confpval') { const d = allTgt.length >= 30 ? allTgt : Array.from({length: 30}, () => Math.random() * 10); const r = conformalPvalues(d.slice(0, 20), avg(d.slice(20, 30))); return r ? { ...r, test: 'Conformal P-values' } : null; }
      if (a === 'boot_jackplus') { const X = allTgt.length >= 15 ? allTgt.slice(0, 15) : Array.from({length: 15}, () => Math.random() * 10); const Y = allTgt.length >= 15 ? allTgt.slice(0, 15).map(v => v * 0.8 + 2) : Array.from({length: 15}, () => Math.random() * 10); const r = jackknifePlus(X, Y); return r ? { ...r, test: 'Jackknife+' } : null; }
      // ── batch 9: Power Analysis ──────────────────────────────────────────────
      if (a === 'pow_cox') { const c = cfgPowCox; const r = powerCoxPH(parseFinite(c.nEvents, 60), parseFinite(c.hr, 0.6), 0, 1, aval); return r ? { ...r, test: 'Cox PH Power' } : null; }
      if (a === 'pow_meta') { const c = cfgPowMeta; const r = powerMetaAnalysis(parseInt(c.k, 10) || 10, parseFinite(c.d, 0.3), 0, 50, aval); return r ? { ...r, test: 'Meta-Analysis Power' } : null; }
      if (a === 'pow_equiv') { const c = cfgPowEquiv; const r = powerEquivalence(parseFinite(c.meanDiff, 0.2), parseFinite(c.se, 0.1), parseFinite(c.dL, -0.5), parseFinite(c.dU, 0.5), aval); return r ? { ...r, test: 'Equivalence Power (TOST)' } : null; }
      if (a === 'pow_intanova') { const c = cfgPowIntAnova; const r = powerInteractionANOVA(parseInt(c.kA, 10) || 2, parseInt(c.kB, 10) || 3, parseInt(c.nPerCell, 10) || 20, parseFinite(c.fInt, 0.25), aval); return r ? { ...r, test: 'Interaction ANOVA Power' } : null; }
      if (a === 'pow_corr') { const c = cfgPowCorr; const r = powerCorrelation(parseInt(c.n, 10) || 50, parseFinite(c.r, 0.3), aval); return r ? { ...r, test: 'Correlation Power' } : null; }
      if (a === 'reqn_t') { const c = cfgReqnT; const r = requiredNT(parseFinite(c.d, 0.5), 0.8, aval); return r ? { ...r, test: 'Required N (t-test)' } : null; }
      if (a === 'reqn_corr') { const c = cfgReqnCorr; const r = requiredNCorrelation(parseFinite(c.r, 0.3), 0.8, aval); return r ? { ...r, test: 'Required N (Correlation)' } : null; }
      if (a === 'reqn_oneprop') { const c = cfgReqnOneProp; const r = requiredNOneProp(parseFinite(c.p0, 0.5), parseFinite(c.p1, 0.7), 0.8, aval); return r ? { ...r, test: 'Required N (One Proportion)' } : null; }
      if (a === 'reqn_twoprop') { const c = cfgReqnTwoProp; const r = requiredNTwoProp(parseFinite(c.p1, 0.5), parseFinite(c.p2, 0.7), 0.8, aval); return r ? { ...r, test: 'Required N (Two Proportions)' } : null; }
      if (a === 'reqn_wilcoxon') { const c = cfgReqnWilcoxon; const r = requiredNWilcoxon(parseFinite(c.d, 0.5), 0.8, aval); return r ? { ...r, test: 'Required N (Wilcoxon)' } : null; }
      if (a === 'reqn_logrank') { const c = cfgReqnLogrank; const r = requiredNLogRank(parseFinite(c.hr, 0.7), 0.8, aval); return r ? { ...r, test: 'Required N (Log-Rank)' } : null; }
      if (a === 'reqn_ols') { const c = cfgReqnOls; const r = requiredNOLS(parseFinite(c.rSquared, 0.2), 1, 0.8, aval); return r ? { ...r, test: 'Required N (OLS)' } : null; }
      if (a === 'reqn_anova') { const c = cfgReqnAnova; const r = requiredNANOVA(parseFinite(c.cohenF, 0.25), parseInt(c.k, 10) || 3, 0.8, aval); return r ? { ...r, test: 'Required N (ANOVA)' } : null; }
      if (a === 'pow_ttest') { const c = cfgPowTtest; const r = powerTTestWrapper(parseInt(c.n1, 10) || 30, parseInt(c.n2, 10) || 30, parseFinite(c.d, 0.5), 'two-sample', aval); return r ? { ...r, test: 'T-Test Power' } : null; }
      if (a === 'pow_oneprop') { const c = cfgPowOneProp; const r = powerProportionOne(parseInt(c.n, 10) || 50, parseFinite(c.p0, 0.5), parseFinite(c.p1, 0.7), aval); return r ? { ...r, test: 'One-Proportion Power' } : null; }
      if (a === 'pow_twoprop') { const c = cfgPowTwoProp; const r = powerProportionTwo(parseInt(c.n1, 10) || 50, parseInt(c.n2, 10) || 50, parseFinite(c.p1, 0.5), parseFinite(c.p2, 0.7), aval); return r ? { ...r, test: 'Two-Proportion Power' } : null; }
      if (a === 'pow_wilcoxon') { const c = cfgPowWilcoxon; const r = powerWilcoxonTest(parseInt(c.n1, 10) || 30, parseInt(c.n2, 10) || 30, parseFinite(c.d, 0.5), aval); return r ? { ...r, test: 'Wilcoxon Power' } : null; }
      if (a === 'pow_logrank') { const c = cfgPowLogrank; const r = powerLogRankTest(parseInt(c.nEvents, 10) || 60, parseFinite(c.hr, 0.7), aval); return r ? { ...r, test: 'Log-Rank Power' } : null; }
      if (a === 'pow_rmanova') { const c = cfgPowRmanova; const r = powerRMANOVA(parseInt(c.k, 10) || 3, parseInt(c.n, 10) || 20, parseFinite(c.epsilon, 1), parseFinite(c.f, 0.25), aval); return r ? { ...r, test: 'RM ANOVA Power' } : null; }
      if (a === 'pow_olsapa') { const c = cfgPowOlsApa; const r = powerOLS_apa(parseFinite(c.rSquared, 0.2), parseInt(c.n, 10) || 50, parseInt(c.k, 10) || 3, aval); return r ? { ...r, test: 'OLS Power' } : null; }
      if (a === 'pow_spearman') { const c = cfgPowSpearman; const r = powerSpearmanTest(parseInt(c.n, 10) || 50, parseFinite(c.rho, 0.3), aval); return r ? { ...r, test: 'Spearman Power' } : null; }
      // ── survival analysis ────────────────────────────────────────────────────
      if (a === 'km' || a === 'coxph') {
        if (!tgtVar || !cat1) return null;
        const cats = [...new Set(data.map(r => r[cat1]))].filter(v => v != null).sort();
        const posVal = cats[1] || cats[0];
        if (a === 'km') {
          const obs = data.filter(r => Number.isFinite(+r[tgtVar]) && r[cat1] != null).map(r => ({ time: +r[tgtVar], event: r[cat1] === posVal ? 1 : 0 }));
          return kmEstimate(obs);
        }
        const Xc = preds.filter(c => c && c !== tgtVar);
        if (!Xc.length) return null;
        const obs = data.filter(r => Number.isFinite(+r[tgtVar]) && r[cat1] != null && Xc.every(c => Number.isFinite(+r[c])))
          .map(r => ({ time: +r[tgtVar], event: r[cat1] === posVal ? 1 : 0, ...Object.fromEntries(Xc.map(c => [c, +r[c]])) }));
        return coxPH(obs, Xc);
      }
      if (a === 'logrank') {
        if (!tgtVar || !cat1 || !grpVar) return null;
        const cats = [...new Set(data.map(r => r[cat1]))].filter(v => v != null).sort();
        const posVal = cats[1] || cats[0];
        const toObs = g => data.filter(r => r[grpVar] === g && Number.isFinite(+r[tgtVar]) && r[cat1] != null)
          .map(r => ({ time: +r[tgtVar], event: r[cat1] === posVal ? 1 : 0 }));
        if (!g1 || g1 === '—' || !g2 || g2 === '—') return null;
        const obsA = toObs(g1), obsB = toObs(g2);
        return logRankTest(obsA, obsB);
      }
      // ── time series ──────────────────────────────────────────────────────────
      if (a === 'adf') return allTgt.length >= 10 ? adfTest(allTgt) : null;
      if (a === 'acf' || a === 'pacf') {
        if (allTgt.length < 4) return null;
        const vals = a === 'acf' ? acf(allTgt) : pacf(allTgt);
        if (!vals) return null;
        return { test: a === 'acf' ? 'Autocorrelation (ACF)' : 'Partial Autocorrelation (PACF)', series: vals, n: allTgt.length,
          apa: `${a === 'acf' ? 'ACF' : 'PACF'} computed for ${vals.length - 1} lags (n=${allTgt.length}).` };
      }
      // ── outlier detection ────────────────────────────────────────────────────
      if (a === 'lof' || a === 'iforest') {
        const vars = scaleVars.filter(c => numeric.includes(c));
        if (vars.length < 1) return null;
        const X = data.filter(r => vars.every(c => Number.isFinite(+r[c]))).map(r => vars.map(c => +r[c]));
        if (a === 'lof') return localOutlierFactor(X, { k: Math.max(2, parseInt(outlierK, 10) || 5) });
        return isolationForest(X, { seed: parseInt(outlierSeed, 10) || 42 });
      }
      // ── econometrics (panel data) ────────────────────────────────────────────
      if (a === 'panel_fe' || a === 'panel_re' || a === 'hausman_panel') {
        if (!grpVar || !tgtVar) return null;
        const Xc = preds.filter(c => c && c !== tgtVar && c !== grpVar);
        if (!Xc.length) return null;
        const rows = data.filter(r => r[grpVar] != null && Number.isFinite(+r[tgtVar]) && Xc.every(c => Number.isFinite(+r[c])));
        if (a === 'panel_fe') return panelFixedEffects(rows, tgtVar, Xc, { idVar: grpVar });
        if (a === 'panel_re') return panelRandomEffects(rows, tgtVar, Xc, { idVar: grpVar });
        const fe = panelFixedEffects(rows, tgtVar, Xc, { idVar: grpVar });
        const re = panelRandomEffects(rows, tgtVar, Xc, { idVar: grpVar });
        if (!fe || !re) return null;
        const r = hausmanTest(fe.coefficients.map(c => c.b), fe.coefficients.map(c => c.se), re.coefficients.map(c => c.b), re.coefficients.map(c => c.se));
        return r ? { ...r, feCoeffs: fe.coefficients, reCoeffs: re.coefficients } : null;
      }
      // ── generalized additive models ──────────────────────────────────────────
      if (a === 'gam_backfit') {
        if (!tgtVar) return null;
        const Xc = preds.filter(c => c && c !== tgtVar);
        if (!Xc.length) return null;
        const rows = data.filter(r => Number.isFinite(+r[tgtVar]) && Xc.every(c => Number.isFinite(+r[c])));
        if (rows.length < 10) return null;
        const y = rows.map(r => +r[tgtVar]);
        const X = rows.map(r => Xc.map(c => +r[c]));
        return gamBackfitting(y, X, Xc.map((_, i) => i));
      }
      if (a === 'gam_interact') {
        if (!tgtVar || !xVar || !zVar || xVar === zVar || xVar === tgtVar || zVar === tgtVar) return null;
        return gamInteraction(data, tgtVar, xVar, zVar, { df: Math.max(3, parseInt(gamDf, 10) || 5) });
      }
      // ── mixture models ───────────────────────────────────────────────────────
      if (a === 'gmm_cluster') return gaussianMixtureModel(scaleMatrix, Math.max(2, parseInt(clusterK, 10) || 3), { seed: parseInt(robSeed, 10) || 42 });
      if (a === 'lpa') {
        const vars = scaleVars.filter(c => numeric.includes(c));
        if (vars.length < 2) return null;
        return latentProfileAnalysis(data, vars, Math.max(2, parseInt(lpaProfiles, 10) || 2), { seed: parseInt(robSeed, 10) || 42 });
      }
      // ── distance & dependence ────────────────────────────────────────────────
      if (a === 'dist_corr') return distanceCorrelation(xy.xs, xy.ys);
      if (a === 'dist_cov') return distanceCovariance(xy.xs, xy.ys);
      // ── robust statistics ────────────────────────────────────────────────────
      if (a === 'theil_sen') return theilSenSlope(xy.xs, xy.ys);
      if (a === 'mm_estimator') return mmEstimator(xy.xs, xy.ys, parseInt(robSeed, 10) || 42);
      if (a === 'mad_scale') return madScale(allTgt);
      if (a === 'hampel_m') return hampelM(allTgt);
      if (a === 'mcd_cov') {
        const vars = scaleVars.filter(c => numeric.includes(c));
        if (vars.length < 2) return null;
        const res = mcdCovariance(data, vars, { seed: parseInt(robSeed, 10) || 42 });
        if (!res) return null;
        // mcdCovariance's own `p`/`h` mean "# variables" / "MCD subset size" — rename
        // before returning so they don't collide with the UI's generic p-value / Cohen's h chips.
        const { p: nVars, h: subsetH, ...rest } = res;
        return { ...rest, nVars, subsetH };
      }
      if (a === 's_estimator') return sEstimator(xy.xs, xy.ys);
      if (a === 'lts_reg') {
        const res = ltsRegression(xy.xs, xy.ys, { seed: parseInt(robSeed, 10) || 42 });
        if (!res) return null;
        // ltsRegression's `h` means "trimmed subset size", not Cohen's h — rename
        // so it doesn't collide with the UI's generic Cohen's h chip.
        const { h: subsetH, ...rest } = res;
        return { ...rest, subsetH };
      }
      if (a === 'qq_band') return qqConfidence(allTgt);
      // ── Bayesian modeling ────────────────────────────────────────────────────
      if (a === 'bic_bf') {
        if (xy.xs.length < 5) return null;
        const my = avg(xy.ys);
        const ssRes0 = xy.ys.reduce((s, y) => s + (y - my) ** 2, 0);
        const fit = simpleOLS(xy.xs, xy.ys);
        if (!fit) return null;
        const ssRes1 = fit.mse * (fit.n - 2);
        const logLik0 = gaussianLogLik(ssRes0, fit.n);
        const logLik1 = gaussianLogLik(ssRes1, fit.n);
        return bicBayesFactor(logLik0, logLik1, fit.n, 1, 2);
      }
      if (a === 'beta_binom_post') { const r = betaBinomialPosterior(+binoK, +binoN, parseFinite(bbPriorA, 1), parseFinite(bbPriorB, 1)); return r ? { ...r, test: 'Beta-Binomial Posterior', apa: `Posterior mean = ${r.posteriorMean.toFixed(4)}, 95% credible [${r.credible95[0]}, ${r.credible95[1]}]` } : null; }
      if (a === 'gamma_pois_post') { const counts = allTgt.filter(v => v >= 0).map(v => Math.round(v)); if (counts.length < 1) return null; const r = gammaPoissonPosterior(counts, parseFinite(gpPriorShape, 1), parseFinite(gpPriorRate, 1)); return r ? { ...r, test: 'Gamma-Poisson Posterior', apa: `Posterior mean = ${r.posteriorMean.toFixed(4)}, 95% credible [${r.credible95[0]}, ${r.credible95[1]}]` } : null; }
      if (a === 'norm_norm_post') { const r = normalNormalPosterior(allTgt, parseFinite(nnPriorMean, 0), parseFinite(nnPriorSD, 10), parseFinite(nnKnownSigma, 1)); return r ? { ...r, test: 'Normal-Normal Posterior', apa: `Posterior mean = ${r.posteriorMean.toFixed(4)} (SD=${r.posteriorSD.toFixed(4)}), 95% credible [${r.credible95[0]}, ${r.credible95[1]}]` } : null; }
      if (a === 'nig_post') { if (xy.xs.length < 5) return null; const X = xy.xs.map(x => [1, x]); const r = normalInverseGammaPosterior(xy.ys, X); return r ? { ...r, test: 'Normal-Inverse-Gamma Posterior', apa: `β = ${r.coefficients.map(c => c.posteriorMean.toFixed(3)).join(', ')}, σ² = ${r.sigma2.toFixed(4)}` } : null; }
      if (a === 'bayes_linreg') { if (xy.xs.length < 5) return null; const X = xy.xs.map(x => [1, x]); return bayesianLinearRegression(xy.ys, X); }
      if (a === 'bayes_logit') {
        const Xc = preds.filter(c => c);
        if (!Xc.length || !cat1) return null;
        const cats = [...new Set(data.map(r => r[cat1]))].filter(v => v != null).sort();
        const posVal = cats[1] || cats[0];
        const rows = data.filter(r => cats.includes(r[cat1]) && rowFinite(r, Xc));
        if (rows.length < 10) return null;
        return bayesianLogisticRegression(rows.map(r => r[cat1] === posVal ? 1 : 0), rows.map(r => Xc.map(c => +r[c])), { nIter: Math.max(200, parseInt(bayesMcmcIter, 10) || 800), nBurnin: Math.max(100, Math.floor((parseInt(bayesMcmcIter, 10) || 800) / 3)) });
      }
      if (a === 'bayes_pois') {
        const Xc = preds.filter(c => c && c !== yVar);
        if (!Xc.length || !yVar) return null;
        const rows = data.filter(r => rowFinite(r, [yVar, ...Xc]) && +r[yVar] >= 0);
        if (rows.length < 10) return null;
        return bayesianPoissonRegression(rows.map(r => Math.round(+r[yVar])), rows.map(r => Xc.map(c => +r[c])), { nIter: Math.max(200, parseInt(bayesMcmcIter, 10) || 800), nBurnin: Math.max(100, Math.floor((parseInt(bayesMcmcIter, 10) || 800) / 3)) });
      }
      if (a === 'bayes_dic') { if (xy.xs.length < 5) return null; const fit = simpleOLS(xy.xs, xy.ys); if (!fit) return null; const ssRes = fit.mse * (fit.n - 2); const ll = gaussianLogLik(ssRes, fit.n); return bayesianDIC(ll, 2, null); }
      if (a === 'bma_reg') { const Xc = preds.filter(c => c && c !== yVar); if (Xc.length < 2 || !yVar) return null; return bmaRegression(data, yVar, Xc); }
      // ── missing data ─────────────────────────────────────────────────────────
      if (['little_mcar', 'mice_imp', 'rubin_pool', 'fmi', 'em_impute', 'miss_patt', 'complete_cases'].includes(a)) {
        const vars = scaleVars.filter(c => numeric.includes(c));
        if (vars.length < 2) return null;
        const holey = injectMissing(data, vars, parseFinite(missPct, 15), parseInt(missSeed, 10) || 42);
        if (a === 'little_mcar') return littlesMCAR(holey);
        if (a === 'miss_patt') return missingnessPattern(holey.map(r => Object.fromEntries(vars.map(v => [v, r[v]]))));
        if (a === 'complete_cases') return completeCases(holey, vars);
        if (a === 'em_impute') return emImpute(holey, vars);
        if (a === 'mice_imp') return mice(holey, vars, { seed: parseInt(missSeed, 10) || 42 });
        if (a === 'rubin_pool' || a === 'fmi') {
          const mi = mice(holey, vars, { seed: parseInt(missSeed, 10) || 42 });
          if (!mi) return null;
          const target = tgtVar && vars.includes(tgtVar) ? tgtVar : vars[0];
          const pooled = rubinPool(mi.imputedDatasets, ds => {
            const v = finiteNums(ds.map(r => +r[target]));
            if (v.length < 2) return null;
            const m = avg(v), se = sampleSD(v) / Math.sqrt(v.length);
            return { estimates: [{ name: target, estimate: m, se }] };
          });
          if (!pooled) return null;
          return a === 'rubin_pool' ? pooled : fractionMissingInfo(pooled);
        }
        return null;
      }
      if (a === 'bootstrap') return null;
    } catch (e) { return { error: String(e) }; }
    return null;
  }, [
    active, g1vals, g2vals, allTgt, mu0, sigma, groups, getVals, data,
    cat1, cat2, xy, xyz, medXMY, modXZY, preds, yVar, xVar, mVar, zVar,
    grpVar, tgtVar, tostL, tostH, bfPrior, aval, scaleVars, scaleMatrix,
    rmMatrix, rmCols, polDeg, metaInput, didPCStr, didPOStr, didPTStr, didPTtStr,
    fx_a, fx_b, fx_c, fx_d, p1x, p1n, p2x, p2n, binoK, binoN, binoP,
    nFactors, ssType, ssPow, ssD, ssR, effFrom, effVal, pairsInput, corrMeth,
    numeric, groups, leveneTest, bartlettTest,
    powAnovaF, powKgroups, powNperGrp, powChiW, powChiDf, powChiN,
    powLogitOr, powLogitP0, powLogitN, powMixedIcc, powMixedM, powMixedJ, powMixedD,
    powMedA, powMedB, powMedSea, powMedSeb,
    clusterK, linkage, nLcaClasses, level2Var, treatVar, edgeList,
    itsTimeStr, itsValStr, itsCut, rddCutoff, rddBw, ivInstrument, scaleMethod, reverseItems,
    // batch 9
    abmValueField, abmTolerance, abmWindow, abmNRuns, abmNAgents, abmSeed, abmNSeeds,
    banditEpsilon, banditNIter, banditNArms, banditSeed, banditTemp, banditLr,
    banditNStates, banditNActions, banditNEpisodes,
    privEpsilon, privDelta, privPct,
    sensSeed, sensNSamples, sensNTrajectories, sensGridLevels,
    robSeed, bbPriorA, bbPriorB, gpPriorShape, gpPriorRate,
    nnPriorMean, nnPriorSD, nnKnownSigma, bayesMcmcIter, missPct, missSeed,
    cfgPowCox, cfgPowMeta, cfgPowEquiv, cfgPowIntAnova, cfgPowCorr,
    cfgReqnT, cfgReqnCorr, cfgReqnOneProp, cfgReqnTwoProp, cfgReqnWilcoxon,
    cfgReqnLogrank, cfgReqnOls, cfgReqnAnova, cfgPowTtest, cfgPowOneProp,
    cfgPowTwoProp, cfgPowWilcoxon, cfgPowLogrank, cfgPowRmanova, cfgPowOlsApa, cfgPowSpearman,
    outlierK, outlierSeed, gamDf, lpaProfiles,
  ]);

  const displayResult = POWER_TESTS.has(active) ? powerResult : result;

  useEffect(() => {
    if (active === 'bootstrap' && bsResult) onResultChange?.(bsResult);
    else if (POWER_TESTS.has(active) && powerResult) onResultChange?.(powerResult);
    else onResultChange?.(result);
  }, [result, bsResult, powerResult, active, onResultChange]);

  useEffect(() => {
    onContextChange?.({
      active, grpVar, tgtVar, g1, g2, xVar, yVar, zVar, mVar, cat1, cat2, scaleVars, preds,
    });
  }, [active, grpVar, tgtVar, g1, g2, xVar, yVar, zVar, mVar, cat1, cat2, scaleVars, preds, onContextChange]);

  // ── config state bundle ────────────────────────────────────────────────────
  const configState = {
    grpVar, setGrpVar, tgtVar, setTgtVar, g1, setG1, g2, setG2,
    xVar, setXVar, yVar, setYVar, zVar, setZVar, mVar, setMVar,
    cat1, setCat1, cat2, setCat2, mu0, setMu0, sigma, setSigma,
    preds, setPreds, scaleVars, setScaleVars, rmCols, setRmCols,
    polDeg, setPolDeg, tostL, setTostL, tostH, setTostH,
    bfPrior, setBfPrior, ssType, setSsType, ssPow, setSsPow,
    ssD, setSsD, ssR, setSsR, effFrom, setEffFrom, effVal, setEffVal,
    corrMeth, setCorrMeth, pairsInput, setPairsInput,
    bsStat, setBsStat, bsSeed, setBsSeed, bsB, setBsB, nFactors, setNFactors,
    fx_a, setFxa, fx_b, setFxb, fx_c, setFxc, fx_d, setFxd,
    p1x, setP1x, p1n, setP1n, p2x, setP2x, p2n, setP2n,
    binoK, setBinoK, binoN, setBinoN, binoP, setBinoP,
    didPCStr, setDidPCStr, didPOStr, setDidPOStr,
    didPTStr, setDidPTStr, didPTtStr, setDidPTtStr,
    metaInput, setMetaInput,
    onRunBs, bsRunning, onRunMedBs, medBsRunning,
    powAnovaF, setPowAnovaF, powKgroups, setPowKgroups, powNperGrp, setPowNperGrp,
    powChiW, setPowChiW, powChiDf, setPowChiDf, powChiN, setPowChiN,
    powLogitOr, setPowLogitOr, powLogitP0, setPowLogitP0, powLogitN, setPowLogitN,
    powMixedIcc, setPowMixedIcc, powMixedM, setPowMixedM, powMixedJ, setPowMixedJ, powMixedD, setPowMixedD,
    powMedA, setPowMedA, powMedB, setPowMedB, powMedSea, setPowMedSea, powMedSeb, setPowMedSeb,
    clusterK, setClusterK, linkage, setLinkage, nLcaClasses, setNLcaClasses,
    level2Var, setLevel2Var, treatVar, setTreatVar, edgeList, setEdgeList,
    itsTimeStr, setItsTimeStr, itsValStr, setItsValStr, itsCut, setItsCut,
    rddCutoff, setRddCutoff, rddBw, setRddBw, ivInstrument, setIvInstrument,
    scaleMethod, setScaleMethod, reverseItems, setReverseItems,
    // batch 9
    abmValueField, setAbmValueField, abmTolerance, setAbmTolerance,
    abmWindow, setAbmWindow, abmNRuns, setAbmNRuns,
    abmNAgents, setAbmNAgents, abmSeed, setAbmSeed, abmNSeeds, setAbmNSeeds,
    banditEpsilon, setBanditEpsilon, banditNIter, setBanditNIter,
    banditNArms, setBanditNArms, banditSeed, setBanditSeed,
    banditTemp, setBanditTemp, banditLr, setBanditLr,
    banditNStates, setBanditNStates, banditNActions, setBanditNActions,
    banditNEpisodes, setBanditNEpisodes,
    privEpsilon, setPrivEpsilon, privDelta, setPrivDelta, privPct, setPrivPct,
    sensSeed, setSensSeed, sensNSamples, setSensNSamples,
    sensNTrajectories, setSensNTrajectories, sensGridLevels, setSensGridLevels,
    robSeed, setRobSeed,
    bbPriorA, setBbPriorA, bbPriorB, setBbPriorB,
    gpPriorShape, setGpPriorShape, gpPriorRate, setGpPriorRate,
    nnPriorMean, setNnPriorMean, nnPriorSD, setNnPriorSD, nnKnownSigma, setNnKnownSigma,
    bayesMcmcIter, setBayesMcmcIter,
    missPct, setMissPct, missSeed, setMissSeed,
    cfgPowCox, setCfgPowCox, cfgPowMeta, setCfgPowMeta, cfgPowEquiv, setCfgPowEquiv,
    cfgPowIntAnova, setCfgPowIntAnova, cfgPowCorr, setCfgPowCorr,
    cfgReqnT, setCfgReqnT, cfgReqnCorr, setCfgReqnCorr,
    cfgReqnOneProp, setCfgReqnOneProp, cfgReqnTwoProp, setCfgReqnTwoProp,
    cfgReqnWilcoxon, setCfgReqnWilcoxon, cfgReqnLogrank, setCfgReqnLogrank,
    cfgReqnOls, setCfgReqnOls, cfgReqnAnova, setCfgReqnAnova,
    cfgPowTtest, setCfgPowTtest, cfgPowOneProp, setCfgPowOneProp,
    cfgPowTwoProp, setCfgPowTwoProp, cfgPowWilcoxon, setCfgPowWilcoxon,
    cfgPowLogrank, setCfgPowLogrank, cfgPowRmanova, setCfgPowRmanova,
    cfgPowOlsApa, setCfgPowOlsApa, cfgPowSpearman, setCfgPowSpearman,
    outlierK, setOutlierK, outlierSeed, setOutlierSeed,
    gamDf, setGamDf, lpaProfiles, setLpaProfiles,
  };

  return {
    state: configState,
    result: displayResult,
    alpha, setAlpha,
    medBs, medBsRunning,
    bsResult, bsRunning,
    powerResult, powerRunning,
    bsB, bsSeed, bsStat,
    allTgt,
    g1, g2, g1vals, g2vals,
    normG1, normG2,
    levene,
    scaleVars,
    aval,
    onRunBs, onRunMedBs,
  };
}

// ── InferencePanel (backwards-compatible standalone wrapper) ──────────────────
export function InferencePanel({ data, ds, active, setActive, onResultChange, onContextChange }) {
  const inf = useInference(data, ds, active, setActive, onResultChange, onContextChange);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Navigator active={active} setActive={setActive} width={200} borderRight={true} />
      <InferenceConfig
        active={active}
        ds={ds} data={data} state={inf.state}
        width={220} borderRight={true}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {active === 'med_bootstrap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {inf.medBs && Number.isFinite(inf.medBs.lo) && Number.isFinite(inf.medBs.hi) && <>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  { label: 'indirect a×b', value: inf.medBs.ab.toFixed(5), color: inf.medBs.sig ? C.ok : C.warn },
                  { label: `${Math.round((1 - inf.aval) * 100)}% CI lo`, value: inf.medBs.lo.toFixed(5), color: C.pos },
                  { label: `${Math.round((1 - inf.aval) * 100)}% CI hi`, value: inf.medBs.hi.toFixed(5), color: C.pos },
                  { label: 'CI excl. 0', value: inf.medBs.sig ? 'YES' : 'NO', color: inf.medBs.sig ? C.ok : C.neg },
                  { label: 'B', value: inf.medBs.B, color: C.dim },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: '3px 8px' }}>
                    <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 11, color, ...mono, fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 70 }}>
                <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 2 }}>Bootstrap a×b distribution (B={inf.medBs.B})</div>
                <div style={{ height: 60, background: C.panel, borderRadius: 3, display: 'flex', alignItems: 'flex-end', padding: '2px 4px', gap: 1, overflow: 'hidden' }}>
                  {(() => {
                    const dist = inf.medBs.dist, lo_ = Math.min(...dist), hi_ = Math.max(...dist), w = (hi_ - lo_) / 24 || 1, cs = Array(24).fill(0);
                    dist.forEach(x => { cs[Math.min(Math.floor((x - lo_) / w), 23)]++; });
                    const maxC = Math.max(...cs, 1);
                    return cs.map((c, i) => (
                      <div key={i} style={{ flex: 1, height: barHeightPct(c, maxC), background: C.warn, opacity: .7, borderRadius: '1px 1px 0 0' }} />
                    ));
                  })()}
                </div>
              </div>
            </>}
            {!inf.medBs && <div style={{ color: C.dim, ...mono, fontSize: 10 }}>Click RUN BOOTSTRAP in the config panel.</div>}
          </div>
        )}

        {active === 'bootstrap' && inf.bsResult?.dist?.length && Number.isFinite(inf.bsResult.lo) && Number.isFinite(inf.bsResult.hi) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { label: inf.bsStat, value: (inf.bsStat === 'mean' ? avg : inf.bsStat === 'median' ? v => { const s = [...v].sort((a, b) => a - b), n = s.length; return n % 2 ? s[Math.floor(n / 2)] : (s[n / 2 - 1] + s[n / 2]) / 2; } : sampleSD)(inf.allTgt).toFixed(4), color: C.accent },
                { label: `${Math.round((1 - inf.aval) * 100)}% CI lo`, value: inf.bsResult.lo.toFixed(4), color: C.pos },
                { label: `${Math.round((1 - inf.aval) * 100)}% CI hi`, value: inf.bsResult.hi.toFixed(4), color: C.pos },
                { label: 'B', value: '1999', color: C.dim },
                { label: 'n', value: inf.allTgt.length, color: C.dim },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: '3px 8px' }}>
                  <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 11, color, ...mono, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 2 }}>Bootstrap distribution (B=1999)</div>
            <div style={{ height: 60, background: C.panel, borderRadius: 3, display: 'flex', alignItems: 'flex-end', padding: '2px 4px', gap: 1, overflow: 'hidden' }}>
              {(() => {
                const dist = inf.bsResult.dist, lo_ = Math.min(...dist), hi_ = Math.max(...dist), w = (hi_ - lo_) / 28 || 1, cs = Array(28).fill(0);
                dist.forEach(x => { cs[Math.min(Math.floor((x - lo_) / w), 27)]++; });
                const maxC = Math.max(...cs, 1);
                return cs.map((c, i) => (
                  <div key={i} style={{ flex: 1, height: barHeightPct(c, maxC), background: C.accent, opacity: .7, borderRadius: '1px 1px 0 0' }} />
                ));
              })()}
            </div>
          </div>
        )}

        {POWER_TESTS.has(active) && inf.powerRunning && (
          <div style={{ color: C.dim, ...mono, fontSize: 10, padding: 8 }}>Computing power…</div>
        )}

        {!['bootstrap', 'med_bootstrap'].includes(active) && !(POWER_TESTS.has(active) && inf.powerRunning && !inf.powerResult) && (
          <InferenceResults
            r={inf.result}
            active={active}
            alpha={inf.alpha}
            g1={inf.g1} g2={inf.g2}
            g1vals={inf.g1vals} g2vals={inf.g2vals}
            normG1={inf.normG1} normG2={inf.normG2}
            levene={inf.levene}
            scaleVars={inf.scaleVars}
            ds={ds}
          />
        )}
      </div>
    </div>
  );
}
