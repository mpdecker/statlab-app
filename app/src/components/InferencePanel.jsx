import { useState, useMemo, useCallback, useEffect } from 'react';
import { C } from '../palette.js';
import { TREE } from '../config/tree.js';
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
export function Navigator({ active, setActive }) {
  const [expandedNote, setExpandedNote] = useState(null);
  return (
    <div style={{ width: 200, borderRight: `1px solid ${C.border}`, overflowY: 'auto', flexShrink: 0 }}>
      {TREE.map(cat => (
        <div key={cat.cat}>
          <div style={{ fontSize: 8, ...mono, color: cat.color, textTransform: 'uppercase', letterSpacing: '.12em', padding: '5px 10px 2px', borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>
            {cat.cat}
          </div>
          {cat.tests.map(t => (
            <div key={t.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <button
                  onClick={() => setActive(t.id)}
                  style={{
                    flex: 1, display: 'block', textAlign: 'left',
                    background: active === t.id ? 'rgba(255,255,255,.04)' : 'transparent',
                    color: active === t.id ? cat.color : C.dim,
                    border: 'none',
                    borderLeft: active === t.id ? `2px solid ${cat.color}` : '2px solid transparent',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12,
                    padding: '4px 8px', cursor: 'pointer', lineHeight: 1.1, transition: 'all .1s',
                  }}
                >
                  {t.label}
                  <div style={{ fontSize: 8, ...mono, color: C.dim, fontWeight: 400 }}>{t.tag}</div>
                </button>
                {METHOD_NOTES[t.id] && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedNote(expandedNote === t.id ? null : t.id); }}
                    title="Method info"
                    style={{
                      background: 'transparent', border: 'none', color: expandedNote === t.id ? C.accent : C.dim,
                      cursor: 'pointer', fontSize: 11, padding: '4px 6px 4px 0', ...mono,
                    }}
                  >
                    ?
                  </button>
                )}
              </div>
              {expandedNote === t.id && METHOD_NOTES[t.id] && (
                <div style={{
                  margin: '0 8px 4px 10px', padding: '6px 8px', background: C.panel, borderRadius: 3,
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
          ))}
        </div>
      ))}
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
      <Navigator active={active} setActive={setActive} />
      <InferenceConfig
        active={active} alpha={inf.alpha} setAlpha={inf.setAlpha}
        ds={ds} data={data} state={inf.state}
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
