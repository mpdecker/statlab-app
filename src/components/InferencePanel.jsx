import { useState, useMemo, useCallback } from 'react';
import { C } from '../palette.js';
import { TREE } from '../config/tree.js';
import { InferenceConfig } from './InferenceConfig.jsx';
import { InferenceResults } from './InferenceResults.jsx';

// ── test runners ──────────────────────────────────────────────────────────────
import { tWelch, tOne, tPaired, yuentTest, zTestKnownSD, signTest } from '../tests/means.js';
import { oneWayANOVA, welchANOVA, twoWayANOVA, ancova, rmANOVA, friedman, kruskalWallis, cochranQ } from '../tests/anova.js';
import { pearsonTest, spearman, kendallTau, partialCorr, pointBiserial, simpleOLS, multipleOLS, polynomialOLS, hierarchicalOLS, logisticReg, mediation, bootstrapMediation, moderation } from '../tests/regression.js';
import {
  chiSquare, chiGoF, fisherExact, mcnemar, binomialTest, onePropZ, twoPropZ,
  mannWhitney, wilcoxonSR, tost, bayesFactorT, bayesFactorCorr,
  grubbsTest, leveneTest, bartlettTest,
  bonferroni, holm, bh, sensitivityLOO,
} from '../tests/categorical.js';
import { pca, efa, cronbachAlpha, splitHalf, icc, cohensKappa, metaAnalysis, differencesInDifferences, convertEffectSize } from '../tests/multivariate.js';
import { normalityDP, shapiroWilk, bootstrapCI, computePowerT, requiredN, requiredNCorr } from '../math/distributions.js';
import { avg, sampleSD, median } from '../math/core.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

// ── Left navigator ────────────────────────────────────────────────────────────
function Navigator({ active, setActive }) {
  return (
    <div style={{ width: 200, borderRight: `1px solid ${C.border}`, overflowY: 'auto', flexShrink: 0 }}>
      {TREE.map(cat => (
        <div key={cat.cat}>
          <div style={{ fontSize: 8, ...mono, color: cat.color, textTransform: 'uppercase', letterSpacing: '.12em', padding: '5px 10px 2px', borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>
            {cat.cat}
          </div>
          {cat.tests.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
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
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function InferencePanel({ data, ds, active, setActive }) {
  const numeric     = ds?.numeric     || [];
  const categorical = ds?.categorical || [];

  // ── active test (lifted to App when props provided) ─────────────────────────
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

  // ── bootstrap ──────────────────────────────────────────────────────────────
  const [bsResult, setBsResult]     = useState(null);
  const [bsRunning, setBsRunning]   = useState(false);
  const [medBs, setMedBs]           = useState(null);
  const [medBsRunning, setMedBsRunning] = useState(false);

  const aval = parseFloat(alpha) || .05;

  // ── derived data vectors ───────────────────────────────────────────────────
  const groups   = useMemo(() => grpVar ? [...new Set(data.map(r => r[grpVar]))].filter(v => v != null) : [], [data, grpVar]);
  const getVals  = useCallback(g => data.filter(r => r[grpVar] === g).map(r => +r[tgtVar]).filter(v => !isNaN(v)), [data, grpVar, tgtVar]);
  const g1vals   = useMemo(() => g1 && g1 !== '—' ? getVals(g1) : [], [getVals, g1]);
  const g2vals   = useMemo(() => g2 && g2 !== '—' ? getVals(g2) : [], [getVals, g2]);
  const allTgt   = useMemo(() => data.map(r => +r[tgtVar]).filter(v => !isNaN(v)), [data, tgtVar]);
  const xy       = useMemo(() => { const pts = data.filter(r => !isNaN(+r[xVar]) && !isNaN(+r[yVar])); return { xs: pts.map(r => +r[xVar]), ys: pts.map(r => +r[yVar]) }; }, [data, xVar, yVar]);
  const xyz      = useMemo(() => { const pts = data.filter(r => !isNaN(+r[xVar]) && !isNaN(+r[yVar]) && !isNaN(+r[zVar])); return { xs: pts.map(r => +r[xVar]), ys: pts.map(r => +r[yVar]), zs: pts.map(r => +r[zVar]) }; }, [data, xVar, yVar, zVar]);
  const medXMY   = useMemo(() => { const pts = data.filter(r => !isNaN(+r[xVar]) && !isNaN(+r[mVar]) && !isNaN(+r[yVar])); return { X: pts.map(r => +r[xVar]), M: pts.map(r => +r[mVar]), Y: pts.map(r => +r[yVar]) }; }, [data, xVar, mVar, yVar]);
  const modXZY   = useMemo(() => { const pts = data.filter(r => !isNaN(+r[xVar]) && !isNaN(+r[zVar]) && !isNaN(+r[yVar])); return { X: pts.map(r => +r[xVar]), Z: pts.map(r => +r[zVar]), Y: pts.map(r => +r[yVar]) }; }, [data, xVar, zVar, yVar]);
  const rmMatrix = useMemo(() => { const cols = rmCols.filter(c => numeric.includes(c)); return data.filter(r => cols.every(c => !isNaN(+r[c]))).map(r => cols.map(c => +r[c])); }, [data, rmCols, numeric]);
  const scaleMatrix = useMemo(() => { const cols = scaleVars.filter(c => numeric.includes(c)); return data.filter(r => cols.every(c => !isNaN(+r[c]))).map(r => cols.map(c => +r[c])); }, [data, scaleVars, numeric]);
  const normG1   = useMemo(() => normalityDP(g1vals), [g1vals]);
  const normG2   = useMemo(() => normalityDP(g2vals), [g2vals]);
  const levene   = useMemo(() => g1vals.length >= 2 && g2vals.length >= 2 ? leveneTest([g1vals, g2vals]) : null, [g1vals, g2vals]);

  // ── bootstrap runners ──────────────────────────────────────────────────────
  const onRunBs = useCallback(() => {
    if (!allTgt.length) return;
    setBsRunning(true);
    setTimeout(() => {
      const fn = bsStat === 'mean' ? avg : bsStat === 'median' ? v => median(v) : v => sampleSD(v);
      setBsResult(bootstrapCI(allTgt, fn, 1999, aval));
      setBsRunning(false);
    }, 20);
  }, [allTgt, bsStat, aval]);

  const onRunMedBs = useCallback(() => {
    const { X, M, Y } = medXMY;
    if (!X.length) return;
    setMedBsRunning(true);
    setTimeout(() => {
      setMedBs(bootstrapMediation(X, M, Y, 1999, aval));
      setMedBsRunning(false);
    }, 20);
  }, [medXMY, aval]);

  // ── result computation ─────────────────────────────────────────────────────
  const result = useMemo(() => {
    try {
      const a = active;
      if (a === 't_welch')   return tWelch(g1vals, g2vals);
      if (a === 't_one')     return tOne(allTgt, parseFloat(mu0) || 0);
      if (a === 't_paired')  return tPaired(g1vals, g2vals);
      if (a === 'trimmed')   return yuentTest(g1vals, g2vals);
      if (a === 'z_known')   return zTestKnownSD(avg(allTgt), parseFloat(mu0) || 0, parseFloat(sigma) || 1, allTgt.length);
      if (a === 'sign')      return signTest(allTgt, parseFloat(mu0) || 0);
      if (a === 'mwu')       return mannWhitney(g1vals, g2vals);
      if (a === 'wilcoxon')  return wilcoxonSR(g1vals, g2vals.length === g1vals.length ? g2vals : null);
      if (a === 'anova')     return oneWayANOVA(groups.map(g => ({ name: g, vals: getVals(g) })));
      if (a === 'welch_anova') return welchANOVA(groups.map(g => ({ name: g, vals: getVals(g) })));
      if (a === 'twoway')    return twoWayANOVA(data, cat1, cat2, tgtVar);
      if (a === 'ancova')    { const cov = groups.map(g => data.filter(r => r[grpVar] === g).map(r => +r[xVar]).filter(v => !isNaN(v))); return ancova(groups.map(g => ({ name: g, vals: getVals(g) })), cov); }
      if (a === 'rm_anova')  return rmANOVA(rmMatrix);
      if (a === 'friedman')  return friedman(rmMatrix);
      if (a === 'kruskal')   return kruskalWallis(groups.map(g => ({ name: g, vals: getVals(g) })));
      if (a === 'cochranQ')  return cochranQ(rmMatrix);
      if (a === 'chisq')     return chiSquare(data, cat1, cat2);
      if (a === 'chigof')    { const bins = (() => { const lo = Math.min(...allTgt), hi = Math.max(...allTgt), w = (hi - lo) / 6 || 1, cs = Array(6).fill(0); allTgt.forEach(x => { cs[Math.min(Math.floor((x - lo) / w), 5)]++; }); return cs; })(); return chiGoF(bins, Array(6).fill(bins.reduce((s, v) => s + v, 0) / 6)); }
      if (a === 'fisher')    return fisherExact(+fx_a, +fx_b, +fx_c, +fx_d);
      if (a === 'mcnemar')   return mcnemar(+fx_b, +fx_c);
      if (a === 'binomial')  return binomialTest(+binoK, +binoN, parseFloat(binoP) || .5);
      if (a === 'prop1')     return onePropZ(+p1x, +p1n, parseFloat(mu0) || .5);
      if (a === 'prop2')     return twoPropZ(+p1x, +p1n, +p2x, +p2n);
      if (a === 'pearson')   return pearsonTest(xy.xs, xy.ys);
      if (a === 'spearman')  return spearman(xy.xs, xy.ys);
      if (a === 'kendall')   return kendallTau(xy.xs, xy.ys);
      if (a === 'partial')   return partialCorr(xyz.xs, xyz.ys, xyz.zs);
      if (a === 'pointbis')  { const cats = [...new Set(data.map(r => r[cat1]))].filter(v => v != null).sort(); const posVal = cats[1] || cats[0]; const rows = data.filter(r => cats.includes(r[cat1]) && !isNaN(+r[xVar])); return pointBiserial(rows.map(r => r[cat1] === posVal ? 1 : 0), rows.map(r => +r[xVar])); }
      if (a === 'ols_simple') return simpleOLS(xy.xs, xy.ys);
      if (a === 'ols_multi') { const Xc = preds.filter(c => c && c !== yVar); if (!Xc.length) return null; const rows = data.filter(r => !isNaN(+r[yVar]) && Xc.every(c => !isNaN(+r[c]))); return multipleOLS(rows.map(r => +r[yVar]), rows.map(r => Xc.map(c => +r[c])), Xc); }
      if (a === 'polynomial') return polynomialOLS(xy.xs, xy.ys, parseInt(polDeg) || 2);
      if (a === 'hierarchical') { const Xc1 = preds.filter(c => c && c !== yVar).slice(0, 1); const Xc2 = preds.filter(c => c && c !== yVar).slice(1); if (!Xc1.length || !Xc2.length) return null; const rows = data.filter(r => !isNaN(+r[yVar]) && preds.every(c => !isNaN(+r[c]))); const Y = rows.map(r => +r[yVar]); return hierarchicalOLS(Y, rows.map(r => Xc1.map(c => +r[c])), rows.map(r => Xc2.map(c => +r[c])), Xc1, Xc2); }
      if (a === 'logistic')  { const Xc = preds.filter(c => c); if (!Xc.length || !cat1) return null; const cats = [...new Set(data.map(r => r[cat1]))].filter(v => v != null).sort(); const posVal = cats[1] || cats[0]; const rows = data.filter(r => cats.includes(r[cat1]) && Xc.every(c => !isNaN(+r[c]))); return logisticReg(rows.map(r => r[cat1] === posVal ? 1 : 0), rows.map(r => Xc.map(c => +r[c])), Xc); }
      if (a === 'mediation') return mediation(medXMY.X, medXMY.M, medXMY.Y);
      if (a === 'med_bootstrap') return null; // handled by bootstrap runner
      if (a === 'moderation') return moderation(modXZY.X, modXZY.Z, modXZY.Y, xVar, zVar);
      if (a === 'tost')      return tost(g1vals, g2vals, parseFloat(tostL) || -.5, parseFloat(tostH) || .5, aval);
      if (a === 'bayes_t')   { const tw = tWelch(g1vals, g2vals); if (!tw) return null; return { ...tw, ...bayesFactorT(tw.t, tw.na, tw.nb, parseFloat(bfPrior) || .707), test: 'Bayesian t-test (JZS)' }; }
      if (a === 'bayes_r')   { const pr = pearsonTest(xy.xs, xy.ys); if (!pr) return null; return { ...pr, ...bayesFactorCorr(pr.r, pr.n), test: 'Bayesian Correlation' }; }
      if (a === 'pca')       return pca(data, scaleVars.filter(c => numeric.includes(c)));
      if (a === 'efa')       return efa(data, scaleVars.filter(c => numeric.includes(c)), parseInt(nFactors) || 2);
      if (a === 'cronbach')  return cronbachAlpha(scaleMatrix);
      if (a === 'splithalf') return splitHalf(scaleMatrix);
      if (a === 'icc')       return icc(scaleMatrix);
      if (a === 'kappa')     return cohensKappa(data.map(r => r[cat1]), data.map(r => r[cat2]));
      if (a === 'meta')      { const studies = metaInput.trim().split('\n').map(line => { const p = line.split(','); return { label: p[0]?.trim(), d: parseFloat(p[1]), se: parseFloat(p[2]) }; }).filter(s => !isNaN(s.d) && !isNaN(s.se) && s.se > 0); return metaAnalysis(studies); }
      if (a === 'did')       { const parse = s => s.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)); return differencesInDifferences(parse(didPCStr), parse(didPOStr), parse(didPTStr), parse(didPTtStr)); }
      if (a === 'grubbs')    return grubbsTest(allTgt);
      if (a === 'normality') { const dp = normalityDP(allTgt), sw = shapiroWilk(allTgt); return { test: 'Normality Tests', dp, sw, vals: allTgt, apa: `D'Ag-P: K²=${dp?.stat}, ${dp?.p < .001 ? 'p<.001' : `p=${dp?.p.toFixed(3)}`} ${dp?.normal ? '✓' : '⚠'}. Shapiro-Wilk: W=${sw?.stat}, p=${sw?.p.toFixed(3)} ${sw?.normal ? '✓' : '⚠'}.` }; }
      if (a === 'homogeneity') { const allG = groups.map(g => getVals(g)).filter(v => v.length >= 2); return { test: 'Homogeneity', levene: leveneTest(allG), bartlett: bartlettTest(allG), apa: '' }; }
      if (a === 'samplesize') { const pow = parseFloat(ssPow) || .8, d = parseFloat(ssD) || .5, r_ = parseFloat(ssR) || .3; return { test: 'Sample Size', ntTest: requiredN(d, pow, aval), nCorr: requiredNCorr(r_, pow, aval), d, r: r_, pow, apa: `For d=${d}: n=${requiredN(d, pow, aval)}/group. For r=${r_}: N=${requiredNCorr(r_, pow, aval)}.` }; }
      if (a === 'effectconv') return convertEffectSize(effFrom, effVal);
      if (a === 'corrections') { const pairs = pairsInput.split(',').map((p, i) => ({ label: `Test ${i + 1}`, p: parseFloat(p.trim()) || 0 })).filter(p => !isNaN(p.p)); if (!pairs.length) return null; const fn = corrMeth === 'bonferroni' ? bonferroni : corrMeth === 'holm' ? holm : bh; return { test: 'Multiple Comparisons', method: corrMeth, pairs: fn(pairs), nSig: fn(pairs).filter(p => p.sig).length }; }
      if (a === 'sensitivity') return sensitivityLOO(allTgt, v => tOne(v, parseFloat(mu0) || 0));
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
  ]);

  // ── config state bundle (passed to InferenceConfig) ────────────────────────
  const configState = {
    grpVar, setGrpVar, tgtVar, setTgtVar, g1, setG1, g2, setG2,
    xVar, setXVar, yVar, setYVar, zVar, setZVar, mVar, setMVar,
    cat1, setCat1, cat2, setCat2, mu0, setMu0, sigma, setSigma,
    preds, setPreds, scaleVars, setScaleVars, rmCols, setRmCols,
    polDeg, setPolDeg, tostL, setTostL, tostH, setTostH,
    bfPrior, setBfPrior, ssType, setSsType, ssPow, setSsPow,
    ssD, setSsD, ssR, setSsR, effFrom, setEffFrom, effVal, setEffVal,
    corrMeth, setCorrMeth, pairsInput, setPairsInput,
    bsStat, setBsStat, nFactors, setNFactors,
    fx_a, setFxa, fx_b, setFxb, fx_c, setFxc, fx_d, setFxd,
    p1x, setP1x, p1n, setP1n, p2x, setP2x, p2n, setP2n,
    binoK, setBinoK, binoN, setBinoN, binoP, setBinoP,
    didPCStr, setDidPCStr, didPOStr, setDidPOStr,
    didPTStr, setDidPTStr, didPTtStr, setDidPTtStr,
    metaInput, setMetaInput,
    onRunBs, bsRunning, onRunMedBs, medBsRunning,
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: test navigator */}
      <Navigator active={active} setActive={setActive} />

      {/* Centre: parameter controls */}
      <InferenceConfig
        active={active} alpha={alpha} setAlpha={setAlpha}
        ds={ds} data={data} state={configState}
      />

      {/* Right: results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {/* Bootstrap mediation path + CI */}
        {active === 'med_bootstrap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {medBs && <>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  { label: 'indirect a×b', value: medBs.ab.toFixed(5), color: medBs.sig ? C.ok : C.warn },
                  { label: `${Math.round((1 - aval) * 100)}% CI lo`, value: medBs.lo.toFixed(5), color: C.pos },
                  { label: `${Math.round((1 - aval) * 100)}% CI hi`, value: medBs.hi.toFixed(5), color: C.pos },
                  { label: 'CI excl. 0', value: medBs.sig ? 'YES' : 'NO', color: medBs.sig ? C.ok : C.neg },
                  { label: 'B', value: medBs.B, color: C.dim },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: '3px 8px' }}>
                    <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 11, color, ...mono, fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
              {/* bootstrap distribution */}
              <div style={{ height: 70 }}>
                {/* inline mini chart */}
                <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 2 }}>Bootstrap a×b distribution (B={medBs.B})</div>
                <div style={{ height: 60, background: C.panel, borderRadius: 3, display: 'flex', alignItems: 'flex-end', padding: '2px 4px', gap: 1, overflow: 'hidden' }}>
                  {(() => {
                    const dist = medBs.dist, lo_ = Math.min(...dist), hi_ = Math.max(...dist), w = (hi_ - lo_) / 24 || 1, cs = Array(24).fill(0);
                    dist.forEach(x => { cs[Math.min(Math.floor((x - lo_) / w), 23)]++; });
                    const maxC = Math.max(...cs);
                    return cs.map((c, i) => (
                      <div key={i} style={{ flex: 1, height: `${(c / maxC) * 100}%`, background: C.warn, opacity: .7, borderRadius: '1px 1px 0 0' }} />
                    ));
                  })()}
                </div>
              </div>
            </>}
            {!medBs && <div style={{ color: C.dim, ...mono, fontSize: 10 }}>Click RUN BOOTSTRAP in the config panel.</div>}
          </div>
        )}

        {/* Bootstrap CI */}
        {active === 'bootstrap' && bsResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { label: bsStat, value: (bsStat === 'mean' ? avg : bsStat === 'median' ? v => { const s = [...v].sort((a, b) => a - b), n = s.length; return n % 2 ? s[Math.floor(n / 2)] : (s[n / 2 - 1] + s[n / 2]) / 2; } : sampleSD)(allTgt).toFixed(4), color: C.accent },
                { label: `${Math.round((1 - aval) * 100)}% CI lo`, value: bsResult.lo.toFixed(4), color: C.pos },
                { label: `${Math.round((1 - aval) * 100)}% CI hi`, value: bsResult.hi.toFixed(4), color: C.pos },
                { label: 'B', value: '1999', color: C.dim },
                { label: 'n', value: allTgt.length, color: C.dim },
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
                const dist = bsResult.dist, lo_ = Math.min(...dist), hi_ = Math.max(...dist), w = (hi_ - lo_) / 28 || 1, cs = Array(28).fill(0);
                dist.forEach(x => { cs[Math.min(Math.floor((x - lo_) / w), 27)]++; });
                const maxC = Math.max(...cs);
                return cs.map((c, i) => (
                  <div key={i} style={{ flex: 1, height: `${(c / maxC) * 100}%`, background: C.accent, opacity: .7, borderRadius: '1px 1px 0 0' }} />
                ));
              })()}
            </div>
          </div>
        )}

        {/* All other test results */}
        {!['bootstrap', 'med_bootstrap'].includes(active) && (
          <InferenceResults
            r={result}
            active={active}
            alpha={alpha}
            g1={g1} g2={g2}
            g1vals={g1vals} g2vals={g2vals}
            normG1={normG1} normG2={normG2}
            levene={levene}
            scaleVars={scaleVars}
            ds={ds}
          />
        )}
      </div>
    </div>
  );
}
