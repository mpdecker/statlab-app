import { useState, useMemo } from 'react';
import { Sel, Inp, TA, CheckList } from './ui.jsx';
import { C } from '../palette.js';

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
    bsStat, setBsStat, nFactors, setNFactors,
    fx_a, setFxa, fx_b, setFxb, fx_c, setFxc, fx_d, setFxd,
    p1x, setP1x, p1n, setP1n, p2x, setP2x, p2n, setP2n,
    binoK, setBinoK, binoN, setBinoN, binoP, setBinoP,
    didPCStr, setDidPCStr, didPOStr, setDidPOStr,
    didPTStr, setDidPTStr, didPTtStr, setDidPTtStr,
    onRunBs, bsRunning, onRunMedBs, medBsRunning,
  } = state;

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
    mediation: <>
      <Sel label="X (predictor)" value={xVar} onChange={setXVar} options={numeric} width={130} />
      <Sel label="M (mediator)"  value={mVar} onChange={setMVar} options={numeric} width={130} />
      <Sel label="Y (outcome)"   value={yVar} onChange={setYVar} options={numeric} width={130} />
    </>,
    med_bootstrap: <>
      <Sel label="X" value={xVar} onChange={setXVar} options={numeric} width={130} />
      <Sel label="M" value={mVar} onChange={setMVar} options={numeric} width={130} />
      <Sel label="Y" value={yVar} onChange={setYVar} options={numeric} width={130} />
      <button
        onClick={onRunMedBs} disabled={medBsRunning}
        style={{ marginTop: 6, background: C.accent, color: '#000', border: 'none', ...mono, fontWeight: 700, fontSize: 10, padding: '5px 12px', borderRadius: 3, cursor: 'pointer' }}
      >
        {medBsRunning ? 'bootstrapping…' : 'RUN (B=1999)'}
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
    bootstrap: <>
      <Sel label="Variable"  value={tgtVar}  onChange={setTgtVar}  options={numeric} width={130} />
      <Sel label="Statistic" value={bsStat}  onChange={setBsStat}  options={['mean', 'median', 'sd']} width={100} />
      <button
        onClick={onRunBs} disabled={bsRunning}
        style={{ background: C.accent, color: '#000', border: 'none', ...mono, fontWeight: 700, fontSize: 10, padding: '5px 12px', borderRadius: 3, cursor: 'pointer' }}
      >
        {bsRunning ? 'running…' : 'RUN (B=1999)'}
      </button>
    </>,
    sensitivity: <>{grpCfg}<Inp label="μ₀" value={mu0} onChange={setMu0} /></>,
  };

  return (
    <div style={{ width: 220, borderRight: `1px solid ${C.border}`, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flexShrink: 0 }}>
      <Inp label="α (significance)" value={alpha} onChange={setAlpha} width={65} />
      {configMap[active] || <div style={{ color: C.dim, ...mono, fontSize: 10 }}>Select a test</div>}
    </div>
  );
}
