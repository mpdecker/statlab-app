import { useState, useMemo } from 'react';
import { Sel, Inp, TA, CheckList, GroupEditor } from './ui.jsx';
import { C } from '../palette.js';
import { methodNoteForTest } from '../config/methodNotes.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

export function InferenceConfig({ active, ds, data, state, set, width = '100%', borderRight = false }) {
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
  } = state;

  // Field editor for the object-shaped power-calculator configs above:
  // <Fld cfg={cfgPowCox} setCfg={setCfgPowCox} k="nEvents" label="N events" width={70} />
  const Fld = ({ cfg, setCfg, k, label, width = 65 }) => (
    <Inp label={label} value={cfg[k]} onChange={v => setCfg(c => ({ ...c, [k]: v }))} width={width} />
  );

  const scaffold = txt => (<div style={{ fontSize: 9, color: C.dim, ...mono, lineHeight: 1.45 }}>{txt}</div>);
  const numeric = ds?.numeric || [];
  const categorical = ds?.categorical || [];
  const groups = useMemo(() =>
    grpVar ? [...new Set(data.map(r => r[grpVar]))].filter(v => v != null) : [],
    [data, grpVar]
  );

  // Shared config blocks
  const grpCfg = <>
    <Sel label="Group var" value={grpVar} onChange={v => { setGrpVar(v); setG1('—'); setG2('—'); }} options={categorical} width="100%" />
    <Sel label="Target var" value={tgtVar} onChange={setTgtVar} options={numeric} width="100%" />
  </>;
  const singleVarCfg = <Sel label="Variable" value={tgtVar} onChange={setTgtVar} options={numeric} width="100%" />;
  const twoGrp = <div style={{ display: 'flex', gap: 6 }}>
    <div style={{ flex: 1 }}><Sel label="Group 1" value={g1} onChange={setG1} options={['—', ...groups]} width="100%" /></div>
    <div style={{ flex: 1 }}><Sel label="Group 2" value={g2} onChange={setG2} options={['—', ...groups]} width="100%" /></div>
  </div>;
  const xyPick = <div style={{ display: 'flex', gap: 6 }}>
    <div style={{ flex: 1 }}><Sel label="X" value={xVar} onChange={setXVar} options={numeric} width="100%" /></div>
    <div style={{ flex: 1 }}><Sel label="Y" value={yVar} onChange={setYVar} options={numeric} width="100%" /></div>
  </div>;
  const tbl2x2 = <>
    <div style={{ fontSize: 8, color: C.dim, ...mono, textTransform: 'uppercase', marginBottom: 3 }}>2×2 table</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      <Inp label="a (++)" value={fx_a} onChange={setFxa} width="100%" />
      <Inp label="b (+-)" value={fx_b} onChange={setFxb} width="100%" />
      <Inp label="c (-+)" value={fx_c} onChange={setFxc} width="100%" />
      <Inp label="d (--)" value={fx_d} onChange={setFxd} width="100%" />
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
    mds_classical: <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
    mds_sammon:    <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
    mds_nonmetric: <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />,
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
    wmean: <>
      <Sel label="Value" value={xVar} onChange={setXVar} options={numeric} width={130} />
      <Sel label="Weight" value={zVar} onChange={setZVar} options={numeric} width={130} />
    </>,
    wcorr: <>
      <Sel label="X" value={xVar} onChange={setXVar} options={numeric} width={110} />
      <Sel label="Y" value={yVar} onChange={setYVar} options={numeric} width={110} />
      <Sel label="Weight" value={zVar} onChange={setZVar} options={numeric} width={110} />
    </>,
    deff: <Sel label="Weight" value={zVar} onChange={setZVar} options={numeric} width={130} />,
    taylor: <>
      <Sel label="Value" value={xVar} onChange={setXVar} options={numeric} width={110} />
      <Sel label="Strata" value={cat1} onChange={setCat1} options={categorical} width={110} />
      <Sel label="PSU / cluster" value={cat2} onChange={setCat2} options={categorical} width={110} />
    </>,
    meta: <TA
      label="Studies  (label, d, se — one per line)"
      value={state.metaInput} onChange={state.setMetaInput} rows={7}
    />,
    sem: <TA
      label="Model syntax (one equation per line: f =~ x1 + x2 for a latent factor, y ~ x for a regression)"
      value={state.semEquations} onChange={state.setSemEquations} rows={7}
    />,
    ordinal_sem: <>
      <CheckList label="Ordinal / Likert items (3+)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="Factor name" value={state.ordinalFactorName} onChange={state.setOrdinalFactorName} width={100} placeholder="f1" />
    </>,
    path_analysis: <TA
      label="Equations (one per line: y ~ x1 + x2)"
      value={state.pathEquations} onChange={state.setPathEquations} rows={5}
    />,
    latent_growth: <>
      <CheckList label="Repeated measures (select in time order)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="Custom time points (optional, comma-separated)" value={state.semTimes} onChange={state.setSemTimes} width={200} placeholder="0, 6, 12" />
    </>,
    bifactor: <GroupEditor label="Item groups (2+ recommended)" items={numeric} groups={state.bifactorGroups} onChange={state.setBifactorGroups} />,
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

    // ── batch 9: ABM ──────────────────────────────────────────────────────────
    abm_morani: <>
      <Sel label="Value Field" value={abmValueField} onChange={setAbmValueField} options={numeric} width={80} />
      <Inp label="# Agents" value={abmNAgents} onChange={setAbmNAgents} width={45} />
      <Inp label="Seed" value={abmSeed} onChange={setAbmSeed} width={45} />
    </>,
    abm_conv: <>
      <Inp label="Window" value={abmWindow} onChange={setAbmWindow} width={45} />
      <Inp label="Tolerance" value={abmTolerance} onChange={setAbmTolerance} width={50} />
      <Inp label="# Runs" value={abmNRuns} onChange={setAbmNRuns} width={45} />
    </>,
    abm_sobol: <>
      <Inp label="Seed" value={abmSeed} onChange={setAbmSeed} width={45} />
      <Inp label="# Agents" value={abmNAgents} onChange={setAbmNAgents} width={50} />
    </>,
    abm_summary: <><Inp label="# Agents" value={abmNAgents} onChange={setAbmNAgents} width={50} /></>,
    abm_scenario: <></>,
    abm_threshold: <><Inp label="# Agents" value={abmNAgents} onChange={setAbmNAgents} width={50} /></>,
    abm_diffusion: <><Inp label="Seed" value={abmSeed} onChange={setAbmSeed} width={45} /></>,
    abm_segregation: <><Inp label="# Agents" value={abmNAgents} onChange={setAbmNAgents} width={50} /></>,
    // ── batch 9: Bandit ─────────────────────────────────────────────────────
    bandit_eps: <>
      <Inp label="Arms" value={banditNArms} onChange={setBanditNArms} width={40} />
      <Inp label="Iter" value={banditNIter} onChange={setBanditNIter} width={40} />
      <Inp label="Epsilon" value={banditEpsilon} onChange={setBanditEpsilon} width={50} />
      <Inp label="Seed" value={banditSeed} onChange={setBanditSeed} width={45} />
    </>,
    bandit_ucb: <>
      <Inp label="Arms" value={banditNArms} onChange={setBanditNArms} width={40} />
      <Inp label="Iter" value={banditNIter} onChange={setBanditNIter} width={40} />
    </>,
    bandit_thompson: <>
      <Inp label="Arms" value={banditNArms} onChange={setBanditNArms} width={40} />
      <Inp label="Iter" value={banditNIter} onChange={setBanditNIter} width={40} />
      <Inp label="Seed" value={banditSeed} onChange={setBanditSeed} width={45} />
    </>,
    bandit_context: <>
      <Inp label="Arms" value={banditNArms} onChange={setBanditNArms} width={40} />
      <Inp label="Iter" value={banditNIter} onChange={setBanditNIter} width={40} />
      <Inp label="Seed" value={banditSeed} onChange={setBanditSeed} width={45} />
    </>,
    bandit_pg: <>
      <Inp label="Arms" value={banditNArms} onChange={setBanditNArms} width={40} />
      <Inp label="Episodes" value={banditNEpisodes} onChange={setBanditNEpisodes} width={50} />
      <Inp label="LR" value={banditLr} onChange={setBanditLr} width={45} />
      <Inp label="Seed" value={banditSeed} onChange={setBanditSeed} width={45} />
    </>,
    bandit_softmax: <>
      <Inp label="Arms" value={banditNArms} onChange={setBanditNArms} width={40} />
      <Inp label="Iter" value={banditNIter} onChange={setBanditNIter} width={40} />
      <Inp label="Temp" value={banditTemp} onChange={setBanditTemp} width={45} />
      <Inp label="Seed" value={banditSeed} onChange={setBanditSeed} width={45} />
    </>,
    bandit_ql: <>
      <Inp label="States" value={banditNStates} onChange={setBanditNStates} width={45} />
      <Inp label="Actions" value={banditNActions} onChange={setBanditNActions} width={45} />
      <Inp label="Eps" value={banditEpsilon} onChange={setBanditEpsilon} width={45} />
      <Inp label="LR" value={banditLr} onChange={setBanditLr} width={45} />
      <Inp label="Episodes" value={banditNEpisodes} onChange={setBanditNEpisodes} width={50} />
      <Inp label="Seed" value={banditSeed} onChange={setBanditSeed} width={45} />
    </>,
    bandit_sarsa: <>
      <Inp label="States" value={banditNStates} onChange={setBanditNStates} width={45} />
      <Inp label="Actions" value={banditNActions} onChange={setBanditNActions} width={45} />
      <Inp label="Eps" value={banditEpsilon} onChange={setBanditEpsilon} width={45} />
      <Inp label="LR" value={banditLr} onChange={setBanditLr} width={45} />
      <Inp label="Episodes" value={banditNEpisodes} onChange={setBanditNEpisodes} width={50} />
      <Inp label="Seed" value={banditSeed} onChange={setBanditSeed} width={45} />
    </>,
    bandit_dqn: <>
      <Inp label="States" value={banditNStates} onChange={setBanditNStates} width={45} />
      <Inp label="Actions" value={banditNActions} onChange={setBanditNActions} width={45} />
      <Inp label="Eps" value={banditEpsilon} onChange={setBanditEpsilon} width={45} />
      <Inp label="LR" value={banditLr} onChange={setBanditLr} width={45} />
      <Inp label="Episodes" value={banditNEpisodes} onChange={setBanditNEpisodes} width={50} />
      <Inp label="Seed" value={banditSeed} onChange={setBanditSeed} width={45} />
    </>,
    // ── batch 9: Record Linkage ──────────────────────────────────────────────
    link_thresh: <></>,
    // ── batch 9: Privacy ─────────────────────────────────────────────────────
    priv_laplace: <><Inp label="Epsilon" value={privEpsilon} onChange={setPrivEpsilon} width={50} /></>,
    priv_synthetic: <></>,
    priv_kanon: <></>,
    priv_diff: <>
      <Inp label="Epsilon" value={privEpsilon} onChange={setPrivEpsilon} width={50} />
      <Inp label="Delta" value={privDelta} onChange={setPrivDelta} width={60} />
    </>,
    priv_mask: <><Inp label="Pct" value={privPct} onChange={setPrivPct} width={40} /></>,
    priv_ldiv: <></>,
    priv_tclose: <></>,
    // ── batch 9: Sensitivity ──────────────────────────────────────────────────
    sens_morris: <>
      <Inp label="Seed" value={sensSeed} onChange={setSensSeed} width={45} />
      <Inp label="Levels" value={sensGridLevels} onChange={setSensGridLevels} width={45} />
    </>,
    sens_fast: <><Inp label="Seed" value={sensSeed} onChange={setSensSeed} width={45} /></>,
    sens_modelcomp: <></>,
    sens_forecast: <></>,
    sens_sobol1: <>
      <Inp label="Seed" value={sensSeed} onChange={setSensSeed} width={45} />
      <Inp label="Samples" value={sensNSamples} onChange={setSensNSamples} width={50} />
    </>,
    sens_sobolt: <>
      <Inp label="Seed" value={sensSeed} onChange={setSensSeed} width={45} />
      <Inp label="Samples" value={sensNSamples} onChange={setSensNSamples} width={50} />
    </>,
    sens_delta: <></>,
    sens_andrews: <></>,
    // ── batch 9: Bootstrap ───────────────────────────────────────────────────
    boot_ci: <>
      <Inp label="B" value={bsB} onChange={setBsB} width={40} />
      <Inp label="Seed" value={bsSeed} onChange={setBsSeed} width={45} />
    </>,
    boot_se: <>
      <Inp label="B" value={bsB} onChange={setBsB} width={40} />
      <Inp label="Seed" value={bsSeed} onChange={setBsSeed} width={45} />
    </>,
    boot_test: <>
      <Inp label="B" value={bsB} onChange={setBsB} width={40} />
      <Inp label="Seed" value={bsSeed} onChange={setBsSeed} width={45} />
    </>,
    boot_jack: <></>,
    boot_tci: <>
      <Inp label="B" value={bsB} onChange={setBsB} width={40} />
      <Inp label="Seed" value={bsSeed} onChange={setBsSeed} width={45} />
    </>,
    boot_influence: <></>,
    boot_mediation: <>
      <Inp label="B" value={bsB} onChange={setBsB} width={40} />
      <Inp label="Seed" value={bsSeed} onChange={setBsSeed} width={45} />
    </>,
    boot_modmed: <></>,
    boot_splitconf: <></>,
    boot_confpval: <></>,
    boot_jackplus: <></>,
    // ── batch 9: Power Analysis (extended) ───────────────────────────────────
    pow_cox: <>
      <Fld cfg={cfgPowCox} setCfg={setCfgPowCox} k="nEvents" label="N events" />
      <Fld cfg={cfgPowCox} setCfg={setCfgPowCox} k="hr" label="Hazard ratio" />
    </>,
    pow_meta: <>
      <Fld cfg={cfgPowMeta} setCfg={setCfgPowMeta} k="k" label="K studies" />
      <Fld cfg={cfgPowMeta} setCfg={setCfgPowMeta} k="d" label="Effect d" />
    </>,
    pow_equiv: <>
      <Fld cfg={cfgPowEquiv} setCfg={setCfgPowEquiv} k="meanDiff" label="Mean diff" />
      <Fld cfg={cfgPowEquiv} setCfg={setCfgPowEquiv} k="se" label="SE" />
      <Fld cfg={cfgPowEquiv} setCfg={setCfgPowEquiv} k="dL" label="Lower Δ" />
      <Fld cfg={cfgPowEquiv} setCfg={setCfgPowEquiv} k="dU" label="Upper Δ" />
    </>,
    pow_intanova: <>
      <Fld cfg={cfgPowIntAnova} setCfg={setCfgPowIntAnova} k="kA" label="Levels A" width={55} />
      <Fld cfg={cfgPowIntAnova} setCfg={setCfgPowIntAnova} k="kB" label="Levels B" width={55} />
      <Fld cfg={cfgPowIntAnova} setCfg={setCfgPowIntAnova} k="nPerCell" label="n/cell" />
      <Fld cfg={cfgPowIntAnova} setCfg={setCfgPowIntAnova} k="fInt" label="Cohen's f (int.)" width={80} />
    </>,
    pow_corr: <>
      <Fld cfg={cfgPowCorr} setCfg={setCfgPowCorr} k="n" label="N" width={55} />
      <Fld cfg={cfgPowCorr} setCfg={setCfgPowCorr} k="r" label="r" width={55} />
    </>,
    reqn_t: <Fld cfg={cfgReqnT} setCfg={setCfgReqnT} k="d" label="Cohen's d" />,
    reqn_corr: <Fld cfg={cfgReqnCorr} setCfg={setCfgReqnCorr} k="r" label="r" />,
    reqn_oneprop: <>
      <Fld cfg={cfgReqnOneProp} setCfg={setCfgReqnOneProp} k="p0" label="p₀" />
      <Fld cfg={cfgReqnOneProp} setCfg={setCfgReqnOneProp} k="p1" label="p₁" />
    </>,
    reqn_twoprop: <>
      <Fld cfg={cfgReqnTwoProp} setCfg={setCfgReqnTwoProp} k="p1" label="p₁" />
      <Fld cfg={cfgReqnTwoProp} setCfg={setCfgReqnTwoProp} k="p2" label="p₂" />
    </>,
    reqn_wilcoxon: <Fld cfg={cfgReqnWilcoxon} setCfg={setCfgReqnWilcoxon} k="d" label="Cohen's d" />,
    reqn_logrank: <Fld cfg={cfgReqnLogrank} setCfg={setCfgReqnLogrank} k="hr" label="Hazard ratio" />,
    reqn_ols: <Fld cfg={cfgReqnOls} setCfg={setCfgReqnOls} k="rSquared" label="R²" />,
    reqn_anova: <>
      <Fld cfg={cfgReqnAnova} setCfg={setCfgReqnAnova} k="cohenF" label="Cohen's f" />
      <Fld cfg={cfgReqnAnova} setCfg={setCfgReqnAnova} k="k" label="k groups" width={55} />
    </>,
    pow_ttest: <>
      <Fld cfg={cfgPowTtest} setCfg={setCfgPowTtest} k="n1" label="n₁" width={55} />
      <Fld cfg={cfgPowTtest} setCfg={setCfgPowTtest} k="n2" label="n₂" width={55} />
      <Fld cfg={cfgPowTtest} setCfg={setCfgPowTtest} k="d" label="Cohen's d" />
    </>,
    pow_oneprop: <>
      <Fld cfg={cfgPowOneProp} setCfg={setCfgPowOneProp} k="n" label="N" width={55} />
      <Fld cfg={cfgPowOneProp} setCfg={setCfgPowOneProp} k="p0" label="p₀" />
      <Fld cfg={cfgPowOneProp} setCfg={setCfgPowOneProp} k="p1" label="p₁" />
    </>,
    pow_twoprop: <>
      <Fld cfg={cfgPowTwoProp} setCfg={setCfgPowTwoProp} k="n1" label="n₁" width={55} />
      <Fld cfg={cfgPowTwoProp} setCfg={setCfgPowTwoProp} k="n2" label="n₂" width={55} />
      <Fld cfg={cfgPowTwoProp} setCfg={setCfgPowTwoProp} k="p1" label="p₁" />
      <Fld cfg={cfgPowTwoProp} setCfg={setCfgPowTwoProp} k="p2" label="p₂" />
    </>,
    pow_wilcoxon: <>
      <Fld cfg={cfgPowWilcoxon} setCfg={setCfgPowWilcoxon} k="n1" label="n₁" width={55} />
      <Fld cfg={cfgPowWilcoxon} setCfg={setCfgPowWilcoxon} k="n2" label="n₂" width={55} />
      <Fld cfg={cfgPowWilcoxon} setCfg={setCfgPowWilcoxon} k="d" label="Cohen's d" />
    </>,
    pow_logrank: <>
      <Fld cfg={cfgPowLogrank} setCfg={setCfgPowLogrank} k="nEvents" label="N events" />
      <Fld cfg={cfgPowLogrank} setCfg={setCfgPowLogrank} k="hr" label="Hazard ratio" />
    </>,
    pow_rmanova: <>
      <Fld cfg={cfgPowRmanova} setCfg={setCfgPowRmanova} k="k" label="k occasions" width={65} />
      <Fld cfg={cfgPowRmanova} setCfg={setCfgPowRmanova} k="n" label="n" width={55} />
      <Fld cfg={cfgPowRmanova} setCfg={setCfgPowRmanova} k="epsilon" label="ε (GG)" width={60} />
      <Fld cfg={cfgPowRmanova} setCfg={setCfgPowRmanova} k="f" label="Cohen's f" />
    </>,
    pow_olsapa: <>
      <Fld cfg={cfgPowOlsApa} setCfg={setCfgPowOlsApa} k="rSquared" label="R²" />
      <Fld cfg={cfgPowOlsApa} setCfg={setCfgPowOlsApa} k="n" label="n" width={55} />
      <Fld cfg={cfgPowOlsApa} setCfg={setCfgPowOlsApa} k="k" label="k predictors" width={70} />
    </>,
    pow_spearman: <>
      <Fld cfg={cfgPowSpearman} setCfg={setCfgPowSpearman} k="n" label="n" width={55} />
      <Fld cfg={cfgPowSpearman} setCfg={setCfgPowSpearman} k="rho" label="ρ" width={55} />
    </>,
    // ── survival analysis ────────────────────────────────────────────────────
    km: <>
      <Sel label="Time var" value={tgtVar} onChange={setTgtVar} options={numeric} width={130} />
      <Sel label="Event (binary)" value={cat1} onChange={setCat1} options={categorical} width={130} />
    </>,
    logrank: <>
      <Sel label="Group var" value={grpVar} onChange={v => { setGrpVar(v); setG1('—'); setG2('—'); }} options={categorical} width={130} />
      {twoGrp}
      <Sel label="Time var" value={tgtVar} onChange={setTgtVar} options={numeric} width={130} />
      <Sel label="Event (binary)" value={cat1} onChange={setCat1} options={categorical} width={130} />
    </>,
    coxph: <>
      <Sel label="Time var" value={tgtVar} onChange={setTgtVar} options={numeric} width={130} />
      <Sel label="Event (binary)" value={cat1} onChange={setCat1} options={categorical} width={130} />
      <CheckList label="Covariates" items={numeric.filter(c => c !== tgtVar)} selected={preds} onChange={setPreds} />
    </>,
    // ── time series ──────────────────────────────────────────────────────────
    adf: singleVarCfg,
    acf: singleVarCfg,
    pacf: singleVarCfg,
    // ── outlier detection ────────────────────────────────────────────────────
    lof: <>
      <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="k (neighbors)" value={outlierK} onChange={setOutlierK} width={65} />
    </>,
    iforest: <>
      <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="Seed" value={outlierSeed} onChange={setOutlierSeed} width={55} />
    </>,
    // ── econometrics (panel data) ────────────────────────────────────────────
    panel_fe: <>
      {grpCfg}
      <CheckList label="Covariates" items={numeric.filter(c => c !== tgtVar)} selected={preds} onChange={setPreds} />
    </>,
    panel_re: <>
      {grpCfg}
      <CheckList label="Covariates" items={numeric.filter(c => c !== tgtVar)} selected={preds} onChange={setPreds} />
    </>,
    hausman_panel: <>
      {grpCfg}
      <CheckList label="Covariates" items={numeric.filter(c => c !== tgtVar)} selected={preds} onChange={setPreds} />
    </>,
    // ── generalized additive models ──────────────────────────────────────────
    gam_backfit: <>
      <Sel label="Outcome Y" value={tgtVar} onChange={setTgtVar} options={numeric} width="100%" />
      <CheckList label="Smooth predictors" items={numeric.filter(c => c !== tgtVar)} selected={preds} onChange={setPreds} />
    </>,
    gam_interact: <>
      <Sel label="Outcome Y" value={tgtVar} onChange={setTgtVar} options={numeric} width="100%" />
      <Sel label="Predictor 1" value={xVar} onChange={setXVar} options={numeric.filter(c => c !== tgtVar)} width="100%" />
      <Sel label="Predictor 2" value={zVar} onChange={setZVar} options={numeric.filter(c => c !== tgtVar)} width="100%" />
      <Inp label="Spline df" value={gamDf} onChange={setGamDf} width={55} />
    </>,
    // ── mixture models ───────────────────────────────────────────────────────
    gmm_cluster: <>
      <CheckList label="Variables" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="k (components)" value={clusterK} onChange={setClusterK} width={65} />
      <Inp label="Seed" value={robSeed} onChange={setRobSeed} width={55} />
    </>,
    lpa: <>
      <CheckList label="Variables (2+)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="Profiles" value={lpaProfiles} onChange={setLpaProfiles} width={65} />
      <Inp label="Seed" value={robSeed} onChange={setRobSeed} width={55} />
    </>,
    // ── distance & dependence ────────────────────────────────────────────────
    dist_corr: xyPick,
    dist_cov: xyPick,
    // ── robust statistics ────────────────────────────────────────────────────
    theil_sen: xyPick,
    mm_estimator: <>{xyPick}<Inp label="Seed" value={robSeed} onChange={setRobSeed} width={55} /></>,
    mad_scale: singleVarCfg,
    hampel_m: singleVarCfg,
    mcd_cov: <>
      <CheckList label="Variables (2+)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="Seed" value={robSeed} onChange={setRobSeed} width={55} />
    </>,
    s_estimator: xyPick,
    lts_reg: <>{xyPick}<Inp label="Seed" value={robSeed} onChange={setRobSeed} width={55} /></>,
    qq_band: singleVarCfg,
    // ── Bayesian modeling ────────────────────────────────────────────────────
    bic_bf: xyPick,
    beta_binom_post: <>
      <Inp label="k (successes)" value={binoK} onChange={setBinoK} width={65} />
      <Inp label="n (trials)" value={binoN} onChange={setBinoN} width={65} />
      <Inp label="Prior α" value={bbPriorA} onChange={setBbPriorA} width={60} />
      <Inp label="Prior β" value={bbPriorB} onChange={setBbPriorB} width={60} />
    </>,
    gamma_pois_post: <>
      {singleVarCfg}
      <Inp label="Prior shape" value={gpPriorShape} onChange={setGpPriorShape} width={70} />
      <Inp label="Prior rate" value={gpPriorRate} onChange={setGpPriorRate} width={70} />
    </>,
    norm_norm_post: <>
      {singleVarCfg}
      <Inp label="Prior mean" value={nnPriorMean} onChange={setNnPriorMean} width={70} />
      <Inp label="Prior SD" value={nnPriorSD} onChange={setNnPriorSD} width={65} />
      <Inp label="Known σ" value={nnKnownSigma} onChange={setNnKnownSigma} width={65} />
    </>,
    nig_post: xyPick,
    bayes_linreg: xyPick,
    bayes_logit: <>
      <Sel label="Binary outcome" value={cat1} onChange={setCat1} options={categorical} width={130} />
      <CheckList label="Predictors" items={numeric} selected={preds} onChange={setPreds} />
      <Inp label="MCMC iter" value={bayesMcmcIter} onChange={setBayesMcmcIter} width={70} />
    </>,
    bayes_pois: <>
      <Sel label="Count outcome Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <CheckList label="Predictors X" items={numeric.filter(c => c !== yVar)} selected={preds} onChange={setPreds} />
      <Inp label="MCMC iter" value={bayesMcmcIter} onChange={setBayesMcmcIter} width={70} />
    </>,
    bayes_dic: xyPick,
    bma_reg: <>
      <Sel label="Outcome Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <CheckList label="Candidate predictors (2+)" items={numeric.filter(c => c !== yVar)} selected={preds} onChange={setPreds} />
    </>,
    // ── missing data ─────────────────────────────────────────────────────────
    little_mcar: <>
      <CheckList label="Variables (2+)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="Missing %" value={missPct} onChange={setMissPct} width={60} />
      <Inp label="Seed" value={missSeed} onChange={setMissSeed} width={55} />
      <div style={{ fontSize: 7, color: C.dim, ...mono }}>Missingness injected for demo — real data has none.</div>
    </>,
    mice_imp: <>
      <CheckList label="Variables (2+)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="Missing %" value={missPct} onChange={setMissPct} width={60} />
      <Inp label="Seed" value={missSeed} onChange={setMissSeed} width={55} />
    </>,
    rubin_pool: <>
      <CheckList label="Variables (2+)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Sel label="Pool estimate for" value={tgtVar} onChange={setTgtVar} options={numeric} width={130} />
      <Inp label="Missing %" value={missPct} onChange={setMissPct} width={60} />
      <Inp label="Seed" value={missSeed} onChange={setMissSeed} width={55} />
    </>,
    fmi: <>
      <CheckList label="Variables (2+)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Sel label="Pool estimate for" value={tgtVar} onChange={setTgtVar} options={numeric} width={130} />
      <Inp label="Missing %" value={missPct} onChange={setMissPct} width={60} />
      <Inp label="Seed" value={missSeed} onChange={setMissSeed} width={55} />
    </>,
    em_impute: <>
      <CheckList label="Variables (2+)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="Missing %" value={missPct} onChange={setMissPct} width={60} />
      <Inp label="Seed" value={missSeed} onChange={setMissSeed} width={55} />
    </>,
    miss_patt: <>
      <CheckList label="Variables (2+)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="Missing %" value={missPct} onChange={setMissPct} width={60} />
      <Inp label="Seed" value={missSeed} onChange={setMissSeed} width={55} />
    </>,
    complete_cases: <>
      <CheckList label="Variables (2+)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="Missing %" value={missPct} onChange={setMissPct} width={60} />
      <Inp label="Seed" value={missSeed} onChange={setMissSeed} width={55} />
    </>,
  };

  return (
    <div style={{ width, borderRight: borderRight ? `1px solid ${C.border}` : 'none', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flexShrink: 0 }}>
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
