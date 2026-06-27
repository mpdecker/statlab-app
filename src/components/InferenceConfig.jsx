import { useState, useMemo } from 'react';
import { Sel, Inp, TA, CheckList } from './ui.jsx';
import { C } from '../palette.js';
import { methodNoteForTest } from '../config/methodNotes.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

export function InferenceConfig({ active, alpha, setAlpha, ds, data, state, set }) {
  const {
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
  } = state;

  const scaffold = txt => (<div style={{ fontSize: 9, color: C.dim, ...mono, lineHeight: 1.45 }}>{txt}</div>);
  const numeric = ds?.numeric || [];
  const categorical = ds?.categorical || [];
  const groups = useMemo(() =>
    grpVar ? [...new Set(data.map(r => r[grpVar]))].filter(v => v != null) : [],
    [data, grpVar]
  );

  // Shared config blocks
  const grpCfg = <>
    <Sel label="Group var" value={grpVar} onChange={v => { setGrpVar(v); setG1('—'); setG2('—'); }} options={categorical} width={130} />
    <Sel label="Target var" value={tgtVar} onChange={setTgtVar} options={numeric} width={130} />
  </>;
  const twoGrp = <>
    <Sel label="Group 1" value={g1} onChange={setG1} options={['—', ...groups]} width={100} />
    <Sel label="Group 2" value={g2} onChange={setG2} options={['—', ...groups]} width={100} />
  </>;
  const xyPick = <>
    <Sel label="X" value={xVar} onChange={setXVar} options={numeric} width={130} />
    <Sel label="Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
  </>;
  const tbl2x2 = <>
    <div style={{ fontSize: 8, color: C.dim, ...mono, textTransform: 'uppercase', marginBottom: 3 }}>2×2 table</div>
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <Inp label="a (++)" value={fx_a} onChange={setFxa} width={55} />
      <Inp label="b (+-)" value={fx_b} onChange={setFxb} width={55} />
      <Inp label="c (-+)" value={fx_c} onChange={setFxc} width={55} />
      <Inp label="d (--)" value={fx_d} onChange={setFxd} width={55} />
    </div>
  </>;

  const configMap = {
    t_welch:   <>{grpCfg}{twoGrp}</>,
    t_one:     <>{grpCfg}<Inp label="μ₀" value={mu0} onChange={setMu0} /></>,
    t_paired:  <>{grpCfg}{twoGrp}</>,
    trimmed:   <>{grpCfg}{twoGrp}</>,
    z_known:   <>{grpCfg}<Inp label="μ₀" value={mu0} onChange={setMu0} width={60} /><Inp label="σ (known)" value={sigma} onChange={setSigma} width={60} /></>,
    sign:      <>{grpCfg}<Inp label="μ₀" value={mu0} onChange={setMu0} /></>,
    mwu:       <>{grpCfg}{twoGrp}</>,
    wilcoxon:  <>{grpCfg}{twoGrp}</>,
    anova:     <>{grpCfg}</>,
    welch_anova: <>{grpCfg}</>,
    twoway: <>
      <Sel label="Factor A" value={cat1} onChange={setCat1} options={categorical} width={130} />
      <Sel label="Factor B" value={cat2} onChange={setCat2} options={categorical} width={130} />
      <Sel label="Response" value={tgtVar} onChange={setTgtVar} options={numeric} width={130} />
    </>,
    ancova: <>{grpCfg}<Sel label="Covariate" value={xVar} onChange={setXVar} options={numeric} width={130} /></>,
    rm_anova:  <CheckList label="Conditions (cols)" items={numeric} selected={rmCols} onChange={setRmCols} />,
    friedman:  <CheckList label="Conditions (cols)" items={numeric} selected={rmCols} onChange={setRmCols} />,
    cochranQ:  <CheckList label="Binary cols (0/1)" items={numeric} selected={rmCols} onChange={setRmCols} />,
    kruskal:   <>{grpCfg}</>,
    chisq: <>
      <Sel label="Variable 1" value={cat1} onChange={setCat1} options={categorical} width={130} />
      <Sel label="Variable 2" value={cat2} onChange={setCat2} options={categorical} width={130} />
    </>,
    chigof: <Sel label="Numeric var" value={tgtVar} onChange={setTgtVar} options={numeric} width={130} />,
    fisher:   tbl2x2,
    mcnemar: <>
      <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 3 }}>Discordant pairs</div>
      <div style={{ display: 'flex', gap: 4 }}>
        <Inp label="b (+→-)" value={fx_b} onChange={setFxb} width={70} />
        <Inp label="c (-→+)" value={fx_c} onChange={setFxc} width={70} />
      </div>
    </>,
    binomial: <>
      <Inp label="k (successes)" value={binoK} onChange={setBinoK} width={65} />
      <Inp label="n (trials)" value={binoN} onChange={setBinoN} width={65} />
      <Inp label="p₀" value={binoP} onChange={setBinoP} width={65} />
    </>,
    prop1: <>
      <Inp label="x (successes)" value={p1x} onChange={setP1x} width={70} />
      <Inp label="n" value={p1n} onChange={setP1n} width={70} />
      <Inp label="p₀" value={mu0} onChange={setMu0} width={70} />
    </>,
    prop2: <>
      <div style={{ fontSize: 8, color: C.dim, ...mono }}>Group 1</div>
      <div style={{ display: 'flex', gap: 3 }}>
        <Inp label="x₁" value={p1x} onChange={setP1x} width={55} />
        <Inp label="n₁" value={p1n} onChange={setP1n} width={55} />
      </div>
      <div style={{ fontSize: 8, color: C.dim, ...mono, marginTop: 4 }}>Group 2</div>
      <div style={{ display: 'flex', gap: 3 }}>
        <Inp label="x₂" value={p2x} onChange={setP2x} width={55} />
        <Inp label="n₂" value={p2n} onChange={setP2n} width={55} />
      </div>
    </>,
    pearson:   xyPick,
    spearman:  xyPick,
    kendall:   xyPick,
    partial: <>
      <Sel label="X" value={xVar} onChange={setXVar} options={numeric} width={125} />
      <Sel label="Y" value={yVar} onChange={setYVar} options={numeric} width={125} />
      <Sel label="Z (control)" value={zVar} onChange={setZVar} options={numeric} width={125} />
    </>,
    pointbis: <>
      <Sel label="Binary col" value={cat1} onChange={setCat1} options={categorical} width={130} />
      <Sel label="Continuous" value={xVar} onChange={setXVar} options={numeric} width={130} />
    </>,
    ols_simple: xyPick,
    ols_multi: <>
      <Sel label="Outcome Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <CheckList label="Predictors X" items={numeric.filter(c => c !== yVar)} selected={preds} onChange={setPreds} />
    </>,
    polynomial: <>
      {xyPick}
      <Sel label="Degree" value={polDeg} onChange={setPolDeg} options={[
        { value: '2', label: 'Quadratic (2)' },
        { value: '3', label: 'Cubic (3)' },
        { value: '4', label: 'Quartic (4)' },
      ]} width={150} />
    </>,
    hierarchical: <>
      <Sel label="Outcome Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <CheckList label="Predictors (M1=first, M2=rest)" items={numeric.filter(c => c !== yVar)} selected={preds} onChange={setPreds} />
    </>,
    logistic: <>
      <Sel label="Binary outcome" value={cat1} onChange={setCat1} options={categorical} width={130} />
      <CheckList label="Predictors" items={numeric} selected={preds} onChange={setPreds} />
    </>,
    ordinal: <>
      <Sel label="Ordinal outcome (categorical)" value={cat1} onChange={setCat1} options={categorical} width={158} />
      <CheckList label="Predictors" items={numeric} selected={preds} onChange={setPreds} />
    </>,
    poisson: <>
      <Sel label="Count outcome Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <CheckList label="Predictors X" items={numeric.filter(c => c !== yVar)} selected={preds} onChange={setPreds} />
    </>,
    negbinom: <>
      <Sel label="Count outcome Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <CheckList label="Predictors X" items={numeric.filter(c => c !== yVar)} selected={preds} onChange={setPreds} />
    </>,
    mediation: <>
      <Sel label="X (predictor)" value={xVar} onChange={setXVar} options={numeric} width={130} />
      <Sel label="M (mediator)"  value={mVar} onChange={setMVar} options={numeric} width={130} />
      <Sel label="Y (outcome)"   value={yVar} onChange={setYVar} options={numeric} width={130} />
    </>,
    med_bootstrap: <>
      <Sel label="X" value={xVar} onChange={setXVar} options={numeric} width={130} />
      <Sel label="M" value={mVar} onChange={setMVar} options={numeric} width={130} />
      <Sel label="Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <Inp label="B (replicates)" value={bsB} onChange={setBsB} width={70} />
      <Inp label="RNG seed" value={bsSeed} onChange={setBsSeed} width={70} />
      <button
        onClick={onRunMedBs} disabled={medBsRunning}
        style={{ marginTop: 6, background: C.accent, color: '#000', border: 'none', ...mono, fontWeight: 700, fontSize: 10, padding: '5px 12px', borderRadius: 3, cursor: 'pointer' }}
      >
        {medBsRunning ? 'bootstrapping…' : `RUN (B=${bsB || 1999})`}
      </button>
    </>,
    moderation: <>
      <Sel label="X (predictor)"  value={xVar} onChange={setXVar} options={numeric} width={130} />
      <Sel label="Z (moderator)"  value={zVar} onChange={setZVar} options={numeric} width={130} />
      <Sel label="Y (outcome)"    value={yVar} onChange={setYVar} options={numeric} width={130} />
    </>,
    tost: <>
      {grpCfg}{twoGrp}
      <Inp label="Lower Δ" value={tostL} onChange={setTostL} width={70} />
      <Inp label="Upper Δ" value={tostH} onChange={setTostH} width={70} />
    </>,
    bayes_t: <>{grpCfg}{twoGrp}<Inp label="Prior r (Cauchy)" value={bfPrior} onChange={setBfPrior} width={80} /></>,
    bayes_r: xyPick,
    manova: <>
      <Sel label="Grouping" value={grpVar} onChange={v => { setGrpVar(v); setG1('—'); setG2('—'); }} options={categorical} width={130} />
      <CheckList label="DVs — 2+ numeric" items={numeric} selected={scaleVars} onChange={setScaleVars} />
    </>,
    cancorr: <>
      <div style={{ fontSize: 7, color: C.dim, ...mono, marginBottom: 4 }}>First half → X-set, rest → Y-set.</div>
      <CheckList label="Variables (4+ → split)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
    </>,
    lda: <>
      <Sel label="Grouping" value={grpVar} onChange={v => { setGrpVar(v); setG1('—'); setG2('—'); }} options={categorical} width={130} />
      <CheckList label="Predictors X" items={numeric} selected={preds} onChange={setPreds} />
    </>,
    pca:       <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
    efa: <>
      <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Sel label="# Factors" value={nFactors} onChange={setNFactors} options={['1', '2', '3', '4']} width={80} />
    </>,
    cronbach:  <CheckList label="Scale items" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
    splithalf: <CheckList label="Scale items" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
    icc:       <CheckList label="Rater columns" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
    kappa: <>
      <Sel label="Rater 1" value={cat1} onChange={setCat1} options={categorical} width={130} />
      <Sel label="Rater 2" value={cat2} onChange={setCat2} options={categorical} width={130} />
    </>,
    meta: <TA
      label="Studies  (label, d, se — one per line)"
      value={state.metaInput} onChange={state.setMetaInput} rows={7}
    />,
    did: <>
      <div style={{ fontSize: 8, color: C.dim, ...mono, textTransform: 'uppercase', marginBottom: 4 }}>Comma-separated values per cell</div>
      <Inp label="Pre-control"    value={didPCStr}  onChange={setDidPCStr}  width={160} placeholder="40,42,39" />
      <Inp label="Post-control"   value={didPOStr}  onChange={setDidPOStr}  width={160} placeholder="41,43,40" />
      <Inp label="Pre-treatment"  value={didPTStr}  onChange={setDidPTStr}  width={160} placeholder="38,40,37" />
      <Inp label="Post-treatment" value={didPTtStr} onChange={setDidPTtStr} width={160} placeholder="46,49,44" />
    </>,
    grubbs:      <>{grpCfg}</>,
    normality:   <>{grpCfg}</>,
    homogeneity: <>{grpCfg}</>,
    samplesize: <>
      <Sel label="Test type" value={ssType} onChange={setSsType} options={[
        { value: 'ttest', label: 't-test (Cohen\'s d)' },
        { value: 'corr',  label: 'Correlation (r)' },
      ]} width={175} />
      <Inp label={ssType === 'ttest' ? "d" : "r"} value={ssType === 'ttest' ? ssD : ssR} onChange={ssType === 'ttest' ? setSsD : setSsR} width={70} />
      <Inp label="Power target" value={ssPow} onChange={setSsPow} width={70} />
    </>,
    effectconv: <>
      <Sel label="Convert from" value={effFrom} onChange={setEffFrom} options={[
        { value: 'd',    label: "Cohen's d" },
        { value: 'r',    label: "Pearson r" },
        { value: 'OR',   label: "Odds Ratio" },
        { value: 'eta2', label: "η²" },
      ]} width={165} />
      <Inp label="Value" value={effVal} onChange={setEffVal} width={100} />
    </>,
    corrections: <>
      <Sel label="Method" value={corrMeth} onChange={setCorrMeth} options={[
        { value: 'bonferroni', label: 'Bonferroni' },
        { value: 'holm',       label: 'Holm-Bonferroni' },
        { value: 'bh',         label: 'Benjamini-Hochberg (FDR)' },
      ]} width={205} />
      <Inp label="p-values (comma-separated)" value={pairsInput} onChange={setPairsInput} width={205} placeholder="0.02,0.04,0.001" />
    </>,

    pow_anova: <>
      <Inp label="Cohen's f" value={powAnovaF} onChange={setPowAnovaF} width={70} />
      <Inp label="k groups (≥2)" value={powKgroups} onChange={setPowKgroups} width={72} />
      <Inp label="n / group" value={powNperGrp} onChange={setPowNperGrp} width={72} />
    </>,
    pow_chi: <>
      <Inp label="Cohen's w" value={powChiW} onChange={setPowChiW} width={70} />
      <Inp label="df" value={powChiDf} onChange={setPowChiDf} width={54} />
      <Inp label="N total" value={powChiN} onChange={setPowChiN} width={72} />
    </>,
    pow_logit: <>
      <Inp label="OR" value={powLogitOr} onChange={setPowLogitOr} width={60} />
      <Inp label="p (control)" value={powLogitP0} onChange={setPowLogitP0} width={80} />
      <Inp label="n / group" value={powLogitN} onChange={setPowLogitN} width={74} />
    </>,
    pow_mixed: <>
      <Inp label="ICC" value={powMixedIcc} onChange={setPowMixedIcc} width={60} />
      <Inp label="clusters / arm" value={powMixedM} onChange={setPowMixedM} width={90} />
      <Inp label="subs / cluster" value={powMixedJ} onChange={setPowMixedJ} width={94} />
      <Inp label="Cohen's d" value={powMixedD} onChange={setPowMixedD} width={70} />
    </>,
    pow_med: <>
      <Inp label="a path est." value={powMedA} onChange={setPowMedA} width={74} />
      <Inp label="b path est." value={powMedB} onChange={setPowMedB} width={74} />
      <Inp label="SE(a)" value={powMedSea} onChange={setPowMedSea} width={62} />
      <Inp label="SE(b)" value={powMedSeb} onChange={setPowMedSeb} width={62} />
      <div style={{ fontSize: 7, color: C.dim, ...mono }}>Monte Carlo B=2000 (Sobel z hybrid)</div>
    </>,

    omega: <CheckList label="Scale items" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
    parallel: <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
    irt_1pl: <>
      <CheckList label="Items (dichotomized at M)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <div style={{ fontSize: 7, color: C.dim, ...mono }}>0/1 coding via item mean split</div>
    </>,
    irt_2pl: <CheckList label="Items (dichotomized)" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
    scale_score: <>
      <Sel label="Method" value={scaleMethod} onChange={setScaleMethod} options={['sum', 'mean']} width={90} />
      <CheckList label="Items" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <CheckList label="Reverse items" items={scaleVars} selected={reverseItems} onChange={setReverseItems} />
    </>,
    kmeans: <>
      <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="k (2–8)" value={clusterK} onChange={setClusterK} width={60} />
    </>,
    hclust: <>
      <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Sel label="Linkage" value={linkage} onChange={setLinkage} options={['ward', 'single', 'complete']} width={120} />
    </>,
    lca: <>
      <Sel label="Indicator 1" value={cat1} onChange={setCat1} options={categorical} width={130} />
      <Sel label="Indicator 2" value={cat2} onChange={setCat2} options={categorical} width={130} />
      <Inp label="Classes (2–4)" value={nLcaClasses} onChange={setNLcaClasses} width={70} />
    </>,
    hlm_ri: <>
      <Sel label="Outcome Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <Sel label="Cluster (L2)" value={level2Var} onChange={setLevel2Var} options={categorical} width={130} />
      <CheckList label="L1 predictor (optional)" items={numeric.filter(c => c !== yVar)} selected={preds.slice(0, 1)} onChange={v => setPreds(v)} />
    </>,
    hlm_rs: <>
      <Sel label="Outcome Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <Sel label="Cluster" value={level2Var} onChange={setLevel2Var} options={categorical} width={130} />
      <Sel label="Slope predictor" value={xVar} onChange={setXVar} options={numeric} width={130} />
    </>,
    icc_ml: <>
      <Sel label="Outcome Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <Sel label="Cluster" value={level2Var} onChange={setLevel2Var} options={categorical} width={130} />
    </>,
    psm: <>
      <Sel label="Treatment" value={treatVar} onChange={setTreatVar} options={categorical} width={130} />
      <Sel label="Outcome" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <CheckList label="Covariates" items={numeric.filter(c => c !== yVar)} selected={preds} onChange={setPreds} />
    </>,
    iv2sls: <>
      <Sel label="Outcome Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <Sel label="Endogenous X" value={xVar} onChange={setXVar} options={numeric} width={130} />
      <Sel label="Instrument Z" value={ivInstrument} onChange={setIvInstrument} options={numeric} width={130} />
      <CheckList label="Controls" items={numeric.filter(c => c !== yVar && c !== xVar)} selected={preds} onChange={setPreds} />
    </>,
    its: <>
      <Inp label="Time points" value={itsTimeStr} onChange={setItsTimeStr} width={180} />
      <Inp label="Outcome series" value={itsValStr} onChange={setItsValStr} width={180} />
      <Inp label="Intervention at t" value={itsCut} onChange={setItsCut} width={90} />
    </>,
    rdd: <>
      {xyPick}
      <Inp label="Cutoff on X" value={rddCutoff} onChange={setRddCutoff} width={80} />
      <Inp label="Bandwidth (opt.)" value={rddBw} onChange={setRddBw} width={100} placeholder="auto" />
    </>,
    centrality: <Inp label="Edges (A-B,B-C)" value={edgeList} onChange={setEdgeList} width={200} />,
    community: <Inp label="Edges (A-B,B-C)" value={edgeList} onChange={setEdgeList} width={200} />,
    sociogram: <Inp label="Edges (A-B,B-C)" value={edgeList} onChange={setEdgeList} width={200} />,

    bootstrap: <>
      <Sel label="Variable"  value={tgtVar}  onChange={setTgtVar}  options={numeric} width={130} />
      <Sel label="Statistic" value={bsStat}  onChange={setBsStat}  options={['mean', 'median', 'sd']} width={100} />
      <Inp label="B (replicates)" value={bsB} onChange={setBsB} width={70} />
      <Inp label="RNG seed" value={bsSeed} onChange={setBsSeed} width={70} />
      <button
        onClick={onRunBs} disabled={bsRunning}
        style={{ background: C.accent, color: '#000', border: 'none', ...mono, fontWeight: 700, fontSize: 10, padding: '5px 12px', borderRadius: 3, cursor: 'pointer' }}
      >
        {bsRunning ? 'running…' : `RUN (B=${bsB || 1999})`}
      </button>
    </>,
    sensitivity: <>{grpCfg}<Inp label="μ₀" value={mu0} onChange={setMu0} /></>,
  };

  return (
    <div style={{ width: 220, borderRight: `1px solid ${C.border}`, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flexShrink: 0 }}>
      <Inp label="α (significance)" value={alpha} onChange={setAlpha} width={65} />
      {configMap[active] || <div style={{ color: C.dim, ...mono, fontSize: 10 }}>Select a test</div>}
      {methodNoteForTest(active, null) && (
        <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(96,165,250,.08)', border: `1px solid ${C.border}`, borderRadius: 3, fontSize: 8, color: C.dim, ...mono, lineHeight: 1.4 }}>
          <div style={{ color: C.accent, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.08em' }}>Methods</div>
          {(() => {
            const note = methodNoteForTest(active, null);
            if (typeof note === 'string') return note;
            return (
              <>
                <div style={{ color: C.text, marginBottom: 3 }}>{note.description}</div>
                {note.usage && <div style={{ marginBottom: 3 }}><b style={{ color: C.text }}>Use:</b> {note.usage}</div>}
                {note.assumptions && (
                  <div>
                    <b style={{ color: C.text }}>Assumptions:</b>
                    <ul style={{ margin: '2px 0 0 12px', padding: 0 }}>
                      {note.assumptions.map((a, i) => <li key={i} style={{ marginBottom: 1 }}>{a}</li>)}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
