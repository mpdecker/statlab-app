import { useState } from 'react';
import { C, PAL } from '../palette.js';
import { fmtP, sig, effD, effR, effEta, effV } from '../math/core.js';
import { computePowerT, requiredN } from '../math/distributions.js';
import {
  Chip, APABlock, SigBadge, SectionHead, LinkBtn, NormBadge,
} from './ui.jsx';
import {
  TDistViz, QQPlot, ResidualPlot, PowerCurve, ScreePlot,
  ForestPlot, PathDiagram, BootstrapHist,
} from './charts.jsx';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

function Row({ children }) {
  return <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>{children}</div>;
}

function CoeffTable({ coeffs }) {
  if (!coeffs?.length) return null;
  const headers = ['predictor', 'b', 'β', 'SE', 't', 'p', 'OR/VIF'];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 9, width: '100%' }}>
        <thead>
          <tr>{headers.map(h => <th key={h} style={{ padding: '2px 6px', textAlign: 'left', color: C.dim, borderBottom: `1px solid ${C.border}`, fontSize: 7, textTransform: 'uppercase' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {coeffs.map((c, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.panel }}>
              <td style={{ padding: '2px 6px', color: PAL[i % PAL.length] }}>{c.name}</td>
              <td style={{ padding: '2px 6px', color: c.sig ? C.ok : C.text }}>{c.b}</td>
              <td style={{ padding: '2px 6px', color: C.pos }}>{c.beta ?? '—'}</td>
              <td style={{ padding: '2px 6px', color: C.dim }}>{c.se ?? '—'}</td>
              <td style={{ padding: '2px 6px', color: C.dim }}>{c.t ?? '—'}</td>
              <td style={{ padding: '2px 6px', color: c.p != null ? (sig(c.p) ? C.ok : C.neg) : C.dim }}>
                {c.p != null ? fmtP(c.p) : '—'}
              </td>
              <td style={{ padding: '2px 6px', color: c.vif > 5 ? C.neg : c.OR ? C.purple : C.dim }}>
                {c.vif ?? c.OR ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {coeffs.some(c => c.vif > 5) && (
        <div style={{ fontSize: 8, color: C.neg, ...mono, marginTop: 2 }}>⚠ VIF &gt; 5 — multicollinearity concern</div>
      )}
    </div>
  );
}

export function InferenceResults({ r, active, alpha, g1, g2, g1vals, g2vals, normG1, normG2, levene, scaleVars, ds }) {
  const [showQQ, setShowQQ] = useState(false);
  const [showPow, setShowPow] = useState(false);
  const [showResid, setShowResid] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  if (!r) {
    if (['bootstrap', 'med_bootstrap'].includes(active)) return null;
    return <div style={{ color: C.dim, ...mono, fontSize: 10 }}>Configure parameters to the left.</div>;
  }
  if (r.error) return <div style={{ color: C.neg, ...mono, fontSize: 11 }}>{r.error}</div>;

  const aval = parseFloat(alpha) || .05;
  const isSig = r.p != null ? sig(r.p, aval) : false;
  const pColor = r.p != null ? (isSig ? C.ok : C.neg) : C.dim;

  const forestItems = (() => {
    if (!r) return null;
    if (r.test === 'Welch t-test' && r.d != null)
      return [{ label: `d=${r.d.toFixed(2)}`, est: r.d, lo: r.d - .8 * Math.abs(r.d / (r.t || 1)), hi: r.d + .8 * Math.abs(r.d / (r.t || 1)), p: r.p }];
    if (r.tukey)
      return r.tukey.map(t => ({ label: `${t.g1} vs ${t.g2}`, est: t.diff, lo: t.diff - .5 * Math.abs(t.diff / (t.q || 1)), hi: t.diff + .5 * Math.abs(t.diff / (t.q || 1)), p: t.p }));
    if (r.test?.includes('OLS') && r.coeffs)
      return r.coeffs.filter(c => c.name !== 'Intercept').map(c => ({ label: c.name, est: c.b, lo: c.b - 1.96 * (c.se || 0), hi: c.b + 1.96 * (c.se || 0), p: c.p }));
    if (r.test?.includes('Meta') && r.studies)
      return r.studies.map(s => ({ label: s.label, est: s.d, lo: s.d - 1.96 * s.se, hi: s.d + 1.96 * s.se, p: .05, weight: s.wr }));
    return null;
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

      {/* APA */}
      <APABlock
        text={r.apa}
        onCopy={() => { navigator.clipboard?.writeText(r.apa || '').catch(() => {}); setCopyMsg('copied!'); setTimeout(() => setCopyMsg(''), 1500); }}
        copyMsg={copyMsg}
      />

      {/* Significance badge */}
      {r.p != null && <SigBadge p={r.p} alpha={aval} />}

      {/* ── Sample size planning ── */}
      {active === 'samplesize' && r.ntTest && <>
        <Row>
          <Chip label="n/group (t-test)" value={r.ntTest} color={C.accent} sub={`d=${r.d}`} />
          <Chip label="N (correlation)" value={r.nCorr} color={C.pos} sub={`r=${r.r}`} />
          <Chip label="power target" value={r.pow} color={C.dim} />
        </Row>
        <PowerCurve d={r.d} alpha={aval} />
      </>}

      {/* ── Effect size converter ── */}
      {active === 'effectconv' && r.d != null && <>
        <SectionHead label={`Converted from ${r.from} = ${r.inputVal}`} />
        <Row>
          <Chip label="Cohen's d" value={r.d} color={C.accent} sub={r.effD} />
          <Chip label="Pearson r" value={r.r} color={C.pos} sub={r.effR} />
          <Chip label="Odds Ratio" value={r.OR} color={C.warn} />
          <Chip label="η²" value={r.eta2} color={C.purple} />
          <Chip label="Cohen's f" value={r.f} color={C.neg} />
        </Row>
        <div style={{ fontSize: 8, ...mono, color: C.dim, lineHeight: 1.7 }}>d↔r: r=d/√(d²+4) · d↔OR: exp(πd/√3) · d↔η²: d²/(d²+4)</div>
      </>}

      {/* ── Multiple comparisons ── */}
      {active === 'corrections' && r.pairs && <>
        <SectionHead label={`${r.method} · ${r.nSig}/${r.pairs.length} significant`} />
        <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 9, width: '100%' }}>
          <thead><tr>{['test', 'raw p', 'adj. p', 'sig'].map(h => <th key={h} style={{ padding: '2px 8px', textAlign: 'left', color: C.dim, borderBottom: `1px solid ${C.border}`, fontSize: 8 }}>{h}</th>)}</tr></thead>
          <tbody>{r.pairs.map((p, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.panel }}>
              <td style={{ padding: '2px 8px', color: C.text }}>{p.label}</td>
              <td style={{ padding: '2px 8px', color: C.dim }}>{p.p.toFixed(4)}</td>
              <td style={{ padding: '2px 8px', color: p.sig ? C.ok : C.dim }}>{p.pAdj?.toFixed(4)}</td>
              <td style={{ padding: '2px 8px' }}>{p.sig ? <span style={{ color: C.ok }}>*</span> : <span style={{ color: C.dim }}>—</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </>}

      {/* ── LOO sensitivity ── */}
      {active === 'sensitivity' && r.ps && <>
        <Row>
          <Chip label="LOO mean p" value={r.mean_p} color={C.dim} />
          <Chip label="LOO SD p" value={r.sd_p} color={C.dim} />
          <Chip label="prop. sig" value={r.propSig} color={r.propSig > .9 ? C.ok : r.propSig > .5 ? C.warn : C.neg} />
          <Chip label="robust" value={r.stable ? 'YES' : 'FRAGILE'} color={r.stable ? C.ok : C.neg} />
        </Row>
      </>}

      {/* ── Normality ── */}
      {active === 'normality' && <>
        <Row>
          {r.dp && <><Chip label="D'Ag-P K²" value={r.dp.stat} color={C.dim} /><Chip label="D'Ag-P p" value={fmtP(r.dp.p)} color={r.dp.normal ? C.ok : C.neg} /><Chip label="D'Ag-P" value={r.dp.normal ? '✓ normal' : '⚠ non-normal'} color={r.dp.normal ? C.ok : C.neg} /></>}
          {r.sw && <><Chip label="Shapiro-Wilk W" value={r.sw.stat} color={C.dim} /><Chip label="SW p" value={fmtP(r.sw.p)} color={r.sw.normal ? C.ok : C.neg} /><Chip label="SW" value={r.sw.normal ? '✓ normal' : '⚠ non-normal'} color={r.sw.normal ? C.ok : C.neg} /></>}
        </Row>
        {r.vals && <QQPlot vals={r.vals} label="variable" />}
      </>}

      {/* ── Homogeneity ── */}
      {active === 'homogeneity' && r.levene && <>
        <Row>
          <Chip label="Levene F" value={r.levene.F} color={C.dim} />
          <Chip label="Levene p" value={fmtP(r.levene.p)} color={r.levene.equal ? C.ok : C.neg} />
          <Chip label="Levene" value={r.levene.equal ? '✓ equal var' : '⚠ unequal'} color={r.levene.equal ? C.ok : C.neg} />
          {r.bartlett && <><Chip label="Bartlett B" value={r.bartlett.B} color={C.dim} /><Chip label="Bartlett p" value={fmtP(r.bartlett.p)} color={C.dim} /></>}
        </Row>
      </>}

      {/* ── Core stat chips ── */}
      <Row>
        {r.t != null && !['Simple OLS', 'Multiple OLS', 'Mediation (Baron-Kenny)', 'Hierarchical OLS'].some(t => r.test?.includes(t)) && <Chip label="t" value={r.t} />}
        {r.W != null && <Chip label="W" value={r.W} />}
        {r.H != null && <Chip label="H" value={r.H} />}
        {r.F != null && !r.pA && <Chip label="F" value={r.F} />}
        {r.FA != null && <><Chip label={`F(${r.factA})`} value={r.FA} /><Chip label={`F(${r.factB})`} value={r.FB} /><Chip label="F(interaction)" value={r.FAB} /></>}
        {r.chi2 != null && <Chip label="χ²" value={r.chi2} />}
        {r.Q != null && r.test === "Cochran's Q" && <Chip label="Q" value={r.Q} />}
        {r.u != null && <Chip label="U" value={r.u} />}
        {r.rho != null && <Chip label="ρ" value={r.rho} color={r.rho > 0 ? C.pos : C.neg} />}
        {r.tau != null && <Chip label="τ" value={r.tau} color={r.tau > 0 ? C.pos : C.neg} />}
        {r.rpb != null && <Chip label="r_pb" value={r.rpb} color={r.rpb > 0 ? C.pos : C.neg} />}
        {r.rPartial != null && <Chip label="r_partial" value={r.rPartial} color={r.rPartial > 0 ? C.pos : C.neg} />}
        {r.rSemiX != null && <Chip label="sr (semi-partial)" value={r.rSemiX} color={C.dim} />}
        {r.r != null && r.test === 'Pearson r' && <Chip label="r" value={r.r} color={r.r > 0 ? C.pos : C.neg} />}
        {r.ciLo != null && <Chip label="95% CI [r]" value={`[${r.ciLo}, ${r.ciHi}]`} color={C.pos} />}
        {r.df != null && !r.dfB && !r.dfBetween && <Chip label="df" value={r.df} color={C.dim} />}
        {r.dfB != null && <Chip label="df B/W" value={`${r.dfB}/${r.dfW}`} color={C.dim} />}
        {r.dfBetween != null && <Chip label="df B/E" value={`${r.dfBetween}/${r.dfError}`} color={C.dim} />}
        {r.p != null && <Chip label="p" value={fmtP(r.p)} color={pColor} />}
        {r.pGG != null && <Chip label="p (GG)" value={fmtP(r.pGG)} color={sig(r.pGG, aval) ? C.ok : C.neg} sub={`ε=${r.ggEps}`} />}
        {r.G != null && <Chip label="Grubbs G" value={r.G} color={C.warn} />}
        {r.outlierVal != null && <Chip label="outlier" value={r.outlierVal} color={isSig ? C.neg : C.dim} />}
      </Row>

      {/* ── Effect sizes ── */}
      <Row>
        {r.d != null && <Chip label="Cohen's d" value={r.d} color={C.warn} sub={r.effD || effD(r.d)} />}
        {r.g != null && <Chip label="Hedges' g" value={r.g} color={C.warn} />}
        {r.rb != null && <Chip label="r (rank-biserial)" value={r.rb} color={C.warn} sub={r.effR} />}
        {r.cliffsDelta != null && <Chip label="Cliff's δ" value={r.cliffsDelta} color={C.warn} />}
        {r.eta2 != null && <Chip label="η²" value={r.eta2} color={C.warn} sub={r.effEta || effEta(r.eta2)} />}
        {r.omega2 != null && <Chip label="ω²" value={r.omega2} color={C.warn} />}
        {r.cohenF != null && <Chip label="Cohen's f" value={r.cohenF} color={C.warn} />}
        {r.V != null && <Chip label="Cramér's V" value={r.V} color={C.warn} sub={r.effV || effV(r.V)} />}
        {r.phi != null && <Chip label="φ" value={r.phi} color={C.warn} />}
        {r.OR != null && !r.test?.includes('Logistic') && <Chip label="OR" value={r.OR} color={C.purple} sub={r.orCI ? `[${r.orCI[0]}, ${r.orCI[1]}]` : ''} />}
        {r.RR != null && <Chip label="RR" value={r.RR} color={C.purple} />}
        {r.ARR != null && <Chip label="ARR" value={r.ARR} color={C.purple} />}
        {r.NNT != null && <Chip label="NNT" value={r.NNT} color={C.purple} />}
        {r.h != null && <Chip label="Cohen's h" value={r.h} color={C.warn} />}
        {r.r2 != null && r.test !== 'Pearson r' && <Chip label="R²" value={r.r2} color={C.warn} />}
        {r.adj != null && <Chip label="adj. R²" value={r.adj} color={C.warn} />}
        {r.ci95 != null && !Array.isArray(r.ci95) && <Chip label="95% CI ±" value={r.ci95} color={C.pos} />}
        {r.ci95 != null && Array.isArray(r.ci95) && <Chip label="95% CI" value={`[${r.ci95[0]}, ${r.ci95[1]}]`} color={C.pos} />}
        {r.ma != null && <Chip label="M₁" value={r.ma} color={PAL[0]} sub={`SD=${r.sdA} n=${r.na}`} />}
        {r.mb != null && <Chip label="M₂" value={r.mb} color={PAL[1]} sub={`SD=${r.sdB} n=${r.nb}`} />}
        {r.durbinWatson != null && <Chip label="Durbin-Watson" value={r.durbinWatson} color={r.durbinWatson > 1.5 && r.durbinWatson < 2.5 ? C.ok : C.warn} />}
      </Row>

      {/* ── Bayes factor ── */}
      {r.BF10 != null && (
        <Row>
          <Chip label="BF₁₀" value={r.BF10 > 1000 ? `${(r.BF10 / 1000).toFixed(1)}k` : r.BF10.toFixed(3)} color={r.BF10 > 3 ? C.ok : r.BF10 < .33 ? C.neg : C.warn} sub={r.label} />
          <Chip label="BF₀₁" value={r.BF01?.toFixed(4)} color={C.dim} />
          {r.logBF10 != null && <Chip label="log BF₁₀" value={r.logBF10} color={C.dim} />}
        </Row>
      )}
      {r.BF10_approx != null && !r.BF10 && <Chip label="BF₁₀ (approx)" value={r.BF10_approx.toFixed(4)} color={r.BF10_approx > 3 ? C.ok : C.warn} sub={r.label} />}

      {/* ── TOST ── */}
      {r.test === 'TOST Equivalence' && <>
        <Row>
          <Chip label="Δ" value={r.diff} color={C.dim} />
          <Chip label="t₁" value={r.t1} />
          <Chip label="t₂" value={r.t2} />
          <Chip label="p₁" value={r.p1.toFixed(4)} color={sig(r.p1) ? C.ok : C.neg} />
          <Chip label="p₂" value={r.p2.toFixed(4)} color={sig(r.p2) ? C.ok : C.neg} />
          <Chip label="verdict" value={r.equiv ? '✓ EQUIV.' : '✗ NOT EQUIV.'} color={r.equiv ? C.ok : C.neg} />
        </Row>
        <TDistViz t={r.t1} df={r.df} alpha={aval} t2={r.t2} />
      </>}

      {/* ── ANOVA group means + Tukey ── */}
      {r.gMeans && <>
        <Row>{r.gMeans.map((g, i) => <Chip key={g.name} label={g.name} value={`${g.adj ?? g.mean}${g.sd ? ` ±${g.sd}` : ''}${g.n ? ` n=${g.n}` : ''}`} color={PAL[i % PAL.length]} />)}</Row>
        {r.tukey?.length > 0 && <>
          <SectionHead label="Tukey HSD (Bonferroni-adjusted)" />
          {r.tukey.map((t, i) => (
            <div key={i} style={{ fontSize: 9, ...mono, color: t.sig ? C.ok : C.dim }}>
              {t.g1} vs {t.g2}: Δ={t.diff}, q={t.q}, p_bon={t.pBon}, d={t.d} {t.sig ? '*' : ''}
            </div>
          ))}
        </>}
      </>}

      {/* ── RM ANOVA ── */}
      {r.test === 'One-Way RM ANOVA' && <>
        <Row>
          {r.colMeans?.map((m, i) => <Chip key={i} label={`C${i + 1}`} value={m.toFixed(3)} color={PAL[i % PAL.length]} />)}
          <Chip label="n subjects" value={r.n} color={C.dim} />
          <Chip label="k conditions" value={r.k} color={C.dim} />
          <Chip label="GG ε" value={r.ggEps} color={r.ggEps < .7 ? C.warn : C.ok} sub="sphericity" />
        </Row>
      </>}

      {/* ── Two-Way ANOVA ── */}
      {r.test === 'Two-Way ANOVA' && r.cellMeans && <>
        <Row>
          <Chip label={`p(${r.factA})`} value={fmtP(r.pA)} color={sig(r.pA, aval) ? C.ok : C.neg} />
          <Chip label={`η²(${r.factA})`} value={r.eta2A} color={C.warn} />
          <Chip label={`p(${r.factB})`} value={fmtP(r.pB)} color={sig(r.pB, aval) ? C.ok : C.neg} />
          <Chip label={`η²(${r.factB})`} value={r.eta2B} color={C.warn} />
          <Chip label="p(interaction)" value={fmtP(r.pAB)} color={sig(r.pAB, aval) ? C.ok : C.neg} />
          <Chip label="η²(interaction)" value={r.eta2AB} color={C.warn} />
        </Row>
        <SectionHead label={`Cell means: ${r.factA} × ${r.factB}`} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 9 }}>
            <thead><tr><th style={{ padding: '2px 8px', color: C.dim, borderBottom: `1px solid ${C.border}` }}></th>
              {r.bLevs.map(b => <th key={b} style={{ padding: '2px 8px', color: C.pos, borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>{b}</th>)}</tr></thead>
            <tbody>{r.aLevs.map((a, i) => <tr key={a}><td style={{ padding: '2px 8px', color: PAL[i % PAL.length] }}>{a}</td>
              {r.cellMeans[i].map((m, j) => <td key={j} style={{ padding: '2px 8px', textAlign: 'center', color: C.text }}>{m.toFixed(3)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </>}

      {/* ── ANCOVA ── */}
      {r.test === 'ANCOVA' && r.adjMeans && <>
        <SectionHead label="Adjusted means (covariate controlled)" />
        <Row>
          {r.adjMeans.map((g, i) => <Chip key={g.name} label={g.name} value={g.adj.toFixed(4)} color={PAL[i % PAL.length]} sub={`n=${g.n}`} />)}
          <Chip label="b_within" value={r.bWithin} color={C.dim} sub="covariate slope" />
        </Row>
      </>}

      {/* ── Chi-square table ── */}
      {r.test === 'Chi-Square' && r.cats1 && <>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 9 }}>
            <thead><tr><th style={{ padding: '2px 8px', color: C.dim, borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}></th>
              {r.cats2.map(c => <th key={c} style={{ padding: '2px 8px', color: C.pos, borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>{c}</th>)}</tr></thead>
            <tbody>{r.cats1.map((c1, i) => <tr key={c1}><td style={{ padding: '2px 8px', color: PAL[i % PAL.length] }}>{c1}</td>
              {r.obs[i].map((o, j) => <td key={j} style={{ padding: '2px 8px', textAlign: 'center', color: C.text }}>{o} <span style={{ color: C.dim }}>({r.exp[i][j]})</span></td>)}</tr>)}
            </tbody>
          </table>
          {r.lowExp && <div style={{ fontSize: 8, color: C.warn, ...mono, marginTop: 2 }}>⚠ Expected &lt; 5 — consider Fisher's Exact</div>}
        </div>
      </>}

      {/* ── Proportion tests ── */}
      {(r.test === 'One-Proportion z' || r.test === 'Two-Proportion z') && (
        <Row>
          {r.ph != null && <Chip label="p̂" value={r.ph} color={C.accent} />}
          {r.p1 != null && <><Chip label="p̂₁" value={r.p1} color={PAL[0]} /><Chip label="p̂₂" value={r.p2} color={PAL[1]} /></>}
        </Row>
      )}

      {/* ── Logistic regression ── */}
      {r.test === 'Logistic Regression' && <>
        <CoeffTable coeffs={r.coeffs} />
        {r.confMatrix && <>
          <SectionHead label="Confusion Matrix + Metrics" />
          <Row>
            <Chip label="TP" value={r.confMatrix.TP} color={C.ok} />
            <Chip label="FP" value={r.confMatrix.FP} color={C.neg} />
            <Chip label="FN" value={r.confMatrix.FN} color={C.neg} />
            <Chip label="TN" value={r.confMatrix.TN} color={C.ok} />
            <Chip label="accuracy" value={`${(r.acc * 100).toFixed(1)}%`} color={C.accent} />
            <Chip label="precision" value={r.precision.toFixed(3)} color={C.warn} />
            <Chip label="recall" value={r.recall.toFixed(3)} color={C.warn} />
            <Chip label="F1" value={r.f1.toFixed(3)} color={r.f1 > .7 ? C.ok : C.warn} />
            <Chip label="AIC" value={r.AIC.toFixed(1)} color={C.dim} />
            <Chip label="R²(McF)" value={r.McFaddenR2.toFixed(3)} color={C.dim} />
          </Row>
        </>}
      </>}

      {/* ── OLS / polynomial / moderation coefficient tables ── */}
      {['Simple OLS', 'Multiple OLS', 'Polynomial OLS', 'Moderation (Interaction)', 'Hierarchical OLS'].some(t => r.test?.includes(t)) && r.coeffs && <>
        <SectionHead label="Coefficients" />
        <CoeffTable coeffs={r.coeffs} />
        {r.test?.includes('Hierarchical') && r.model1 && <>
          <SectionHead label="Model comparison" />
          <Row>
            <Chip label="M1 R²" value={r.model1.r2} color={C.dim} sub={`adj=${r.model1.adj}`} />
            <Chip label="M2 R²" value={r.model2.r2} color={C.accent} sub={`adj=${r.model2.adj}`} />
            <Chip label="ΔR²" value={r.deltaR2} color={C.warn} />
            <Chip label="F change" value={r.F_change} color={C.warn} />
            <Chip label="p(ΔR²)" value={fmtP(r.p_change)} color={sig(r.p_change) ? C.ok : C.neg} />
          </Row>
        </>}
        {r.test === 'Moderation (Interaction)' && r.simpleSlopes && <>
          <SectionHead label={`Simple slopes of ${r.xL} at levels of ${r.zL}`} />
          <Row>{r.simpleSlopes.map((ss, i) => <Chip key={i} label={ss.z} value={ss.slope} color={PAL[i]} />)}</Row>
        </>}
      </>}

      {/* ── Mediation ── */}
      {r.test === 'Mediation (Baron-Kenny)' && <>
        <PathDiagram r={r} />
        <Row>
          <Chip label="c (total)" value={r.c_total?.toFixed(4)} color={sig(r.c_p || 1) ? C.ok : C.dim} />
          <Chip label="a (X→M)" value={r.a_path?.toFixed(4)} color={sig(r.a_p || 1) ? C.ok : C.dim} />
          <Chip label="b (M→Y)" value={r.b_path?.toFixed(4)} color={sig(r.b_p || 1) ? C.ok : C.dim} />
          <Chip label="c' (direct)" value={r.cp_direct?.toFixed(4)} color={sig(r.cp_p || 1) ? C.ok : C.dim} />
          <Chip label="a×b (indirect)" value={r.ab?.toFixed(5)} color={sig(r.p_sobel) ? C.ok : C.warn} />
          <Chip label="Sobel z" value={r.z_sobel} />
          <Chip label="Sobel p" value={fmtP(r.p_sobel)} color={sig(r.p_sobel) ? C.ok : C.neg} />
          {r.propMed != null && <Chip label="% mediated" value={`${(r.propMed * 100).toFixed(1)}%`} color={C.warn} />}
        </Row>
        <div style={{ fontSize: 9, ...mono, color: C.dim }}>
          Steps: {r.steps.cSig ? '✓' : '✗'} c · {r.steps.aSig ? '✓' : '✗'} a · {r.steps.bSig ? '✓' : '✗'} b · {r.steps.cpSig ? 'direct remains' : 'fully mediated (c\'≈0)'}
        </div>
      </>}

      {/* ── PCA ── */}
      {r.test === 'PCA' && <>
        <ScreePlot eigenvalues={r.eigenvalues} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 9, width: '100%' }}>
            <thead><tr>
              <th style={{ padding: '2px 7px', textAlign: 'left', color: C.dim, borderBottom: `1px solid ${C.border}` }}>Variable</th>
              {r.eigenvalues.slice(0, 5).map((_, i) => <th key={i} style={{ padding: '2px 7px', color: PAL[i], borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>PC{i + 1}</th>)}
            </tr></thead>
            <tbody>
              <tr><td style={{ padding: '2px 7px', color: C.dim, fontSize: 7 }}>λ</td>{r.eigenvalues.slice(0, 5).map((e, i) => <td key={i} style={{ padding: '2px 7px', textAlign: 'center', color: PAL[i] }}>{e.toFixed(3)}</td>)}</tr>
              <tr><td style={{ padding: '2px 7px', color: C.dim, fontSize: 7 }}>% var</td>{r.pctV.slice(0, 5).map((p, i) => <td key={i} style={{ padding: '2px 7px', textAlign: 'center', color: PAL[i] }}>{p}%</td>)}</tr>
              <tr><td style={{ padding: '2px 7px', color: C.dim, fontSize: 7 }}>cum%</td>{r.cumP.slice(0, 5).map((p, i) => <td key={i} style={{ padding: '2px 7px', textAlign: 'center', color: C.dim }}>{p}%</td>)}</tr>
              {r.vars.map((v, vi) => (
                <tr key={v} style={{ background: vi % 2 === 0 ? 'transparent' : C.panel }}>
                  <td style={{ padding: '2px 7px', color: C.text }}>{v}</td>
                  {r.loadings.slice(0, 5).map((lc, i) => (
                    <td key={i} style={{ padding: '2px 7px', textAlign: 'center', color: Math.abs(lc[vi]) > .4 ? C.accent : C.dim, fontWeight: Math.abs(lc[vi]) > .4 ? '700' : '400' }}>{lc[vi]?.toFixed(3)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 8, ...mono, color: C.dim }}>Loadings |&gt;.40| highlighted · {r.nSig} comp. (λ&gt;1)</div>
      </>}

      {/* ── EFA ── */}
      {r.test?.includes('EFA') && r.loadings && <>
        <Row>{r.varianceExpl.map((v, i) => <Chip key={i} label={`F${i + 1} var%`} value={`${v}%`} color={PAL[i]} />)}</Row>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 9, width: '100%' }}>
            <thead><tr>
              <th style={{ padding: '2px 7px', textAlign: 'left', color: C.dim, borderBottom: `1px solid ${C.border}` }}>Variable</th>
              {r.loadings[0]?.factors.map((_, i) => <th key={i} style={{ padding: '2px 7px', color: PAL[i], borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>F{i + 1}</th>)}
              <th style={{ padding: '2px 7px', color: C.dim, borderBottom: `1px solid ${C.border}`, textAlign: 'center' }}>h²</th>
            </tr></thead>
            <tbody>{r.loadings.map((l, vi) => (
              <tr key={vi} style={{ background: vi % 2 === 0 ? 'transparent' : C.panel }}>
                <td style={{ padding: '2px 7px', color: C.text }}>{l.var}</td>
                {l.factors.map((v, i) => <td key={i} style={{ padding: '2px 7px', textAlign: 'center', color: Math.abs(v) > .3 ? PAL[i] : C.dim, fontWeight: Math.abs(v) > .3 ? '700' : '400' }}>{v.toFixed(3)}</td>)}
                <td style={{ padding: '2px 7px', textAlign: 'center', color: l.communality > .5 ? C.ok : C.warn }}>{l.communality.toFixed(3)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{ fontSize: 8, ...mono, color: C.dim }}>Loadings |&gt;.30| highlighted · h² = communality</div>
      </>}

      {/* ── Cronbach's α ── */}
      {r.test === "Cronbach's α" && r.itc && <>
        <Row>
          <Chip label="α" value={r.alpha} color={r.alpha >= .8 ? C.ok : r.alpha >= .7 ? C.warn : C.neg} sub={r.label} />
          <Chip label="k items" value={r.k} color={C.dim} />
          <Chip label="N" value={r.n} color={C.dim} />
        </Row>
        <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 9, width: '100%' }}>
          <thead><tr>{['item', 'item-total r', 'α if deleted'].map(h => <th key={h} style={{ padding: '2px 7px', textAlign: 'left', color: C.dim, borderBottom: `1px solid ${C.border}`, fontSize: 7, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
          <tbody>{(scaleVars || []).filter(c => ds?.numeric?.includes(c)).map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.panel }}>
              <td style={{ padding: '2px 7px', color: PAL[i % PAL.length] }}>{item}</td>
              <td style={{ padding: '2px 7px', color: r.itc[i] >= .3 ? C.ok : C.warn }}>{r.itc[i]?.toFixed(4)}</td>
              <td style={{ padding: '2px 7px', color: r.aDel[i] > r.alpha ? C.warn : C.dim }}>{r.aDel[i]?.toFixed(4)} {r.aDel[i] > r.alpha ? '↑' : ''}</td>
            </tr>
          ))}</tbody>
        </table>
      </>}

      {/* ── ICC + κ ── */}
      {r.test === 'ICC(2,1)' && <Row><Chip label="ICC(2,1)" value={r.icc21} color={r.icc21 >= .75 ? C.ok : r.icc21 >= .5 ? C.warn : C.neg} sub={r.label} /><Chip label="ICC(1,1)" value={r.icc11} color={C.dim} /><Chip label="N subj." value={r.n} color={C.dim} /><Chip label="k raters" value={r.k} color={C.dim} /></Row>}
      {r.test === "Cohen's κ" && <Row><Chip label="κ" value={r.kappa} color={r.kappa >= .6 ? C.ok : r.kappa >= .4 ? C.warn : C.neg} sub={r.label} /><Chip label="SE" value={r.se} color={C.dim} /><Chip label="Po" value={r.Po} color={C.dim} /><Chip label="Pe" value={r.Pe} color={C.dim} /></Row>}

      {/* ── Meta-analysis ── */}
      {r.test?.includes('Meta') && <>
        <Row>
          <Chip label="d (random)" value={r.dRE} color={isSig ? C.ok : C.dim} sub={`SE=${r.seRE}`} />
          <Chip label="95% CI" value={`[${r.ci[0]}, ${r.ci[1]}]`} color={C.pos} />
          <Chip label="PI 95%" value={`[${r.pi[0]}, ${r.pi[1]}]`} color={C.dim} sub="prediction interval" />
          <Chip label="d (fixed)" value={r.dFixed} color={C.dim} />
          <Chip label="Q" value={r.Q} color={C.dim} sub={`p=${r.pQ.toFixed(3)}`} />
          <Chip label="I²" value={`${r.I2}%`} color={r.I2 > 75 ? C.neg : r.I2 > 50 ? C.warn : C.ok} />
          <Chip label="τ" value={r.tau} color={C.dim} sub={`τ²=${r.tau2}`} />
          <Chip label="k studies" value={r.k} color={C.dim} />
        </Row>
        <ForestPlot items={r.studies?.map(s => ({ label: s.label, est: s.d, lo: s.d - 1.96 * s.se, hi: s.d + 1.96 * s.se, p: .05, weight: s.wr })) || []} />
      </>}

      {/* ── DiD ── */}
      {r.test === 'Difference-in-Differences' && (
        <Row>
          <Chip label="DiD estimator" value={r.did} color={isSig ? C.ok : C.dim} />
          <Chip label="control diff" value={r.ctrlDiff} color={PAL[0]} sub="post−pre" />
          <Chip label="treat diff" value={r.treatDiff} color={PAL[1]} sub="post−pre" />
          <Chip label="SE" value={r.se} color={C.dim} />
          <Chip label="t" value={r.t} color={C.dim} />
        </Row>
      )}

      {/* ── Friedman / Cochran ── */}
      {(r.test === 'Friedman Test' || r.test === "Cochran's Q") && (
        <Row>
          {r.W_kendall != null && <Chip label="Kendall's W" value={r.W_kendall} color={C.warn} />}
          {r.colRankMeans?.map((m, i) => <Chip key={i} label={`C${i + 1} rank mean`} value={m} color={PAL[i % PAL.length]} />)}
          {r.colProps?.map((p, i) => <Chip key={i} label={`C${i + 1} prop`} value={p} color={PAL[i % PAL.length]} />)}
        </Row>
      )}

      {/* ── Power section ── */}
      {r.d != null && ['Welch t-test', 'One-sample t-test', 'Paired t-test', "Yuen's Trimmed t-test"].includes(r.test) && <>
        <Row>
          <Chip label="power" value={(r.power || computePowerT(r.na || r.n || 50, r.nb || r.n || 50, Math.abs(r.d))).toFixed(3)} color={(r.power || computePowerT(r.na || r.n || 50, r.nb || r.n || 50, Math.abs(r.d))) >= .8 ? C.ok : C.warn} />
          <Chip label="n for 80%" value={r.reqN || requiredN(Math.abs(r.d))} color={C.dim} />
          <LinkBtn label={showPow ? 'hide curve' : 'power curve'} onClick={() => setShowPow(v => !v)} />
        </Row>
        {showPow && <PowerCurve d={r.d} alpha={aval} currentN={r.na || r.n} />}
      </>}

      {/* ── Normality / Levene badges ── */}
      <Row>
        {normG1 && g1vals.length >= 8 && <NormBadge nt={normG1} label={g1 || 'G1'} />}
        {normG2 && g2vals.length >= 8 && <NormBadge nt={normG2} label={g2 || 'G2'} />}
        {levene && (
          <div style={{ fontSize: 8, ...mono, color: levene.equal ? C.ok : C.warn, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: '2px 6px' }}>
            Levene: F={levene.F} {fmtP(levene.p)} {levene.equal ? '✓ equal var' : '⚠ unequal'}
          </div>
        )}
      </Row>

      {/* ── t-distribution + QQ for t-tests ── */}
      {r.t != null && ['Welch t-test', 'One-sample t-test', 'Paired t-test', "Yuen's Trimmed t-test"].includes(r.test) && <>
        <TDistViz t={r.t} df={r.df} alpha={aval} />
        <Row>
          <LinkBtn label={showQQ ? 'hide QQ' : 'QQ plots'} onClick={() => setShowQQ(v => !v)} />
        </Row>
        {showQQ && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {g1vals.length > 3 && <QQPlot vals={g1vals} label={g1 || 'Group 1'} />}
            {g2vals.length > 3 && <QQPlot vals={g2vals} label={g2 || 'Group 2'} />}
          </div>
        )}
      </>}

      {/* ── Residual plots for regression ── */}
      {r.fitted && r.residuals && <>
        <Row>
          <LinkBtn label={showResid ? 'hide residuals' : 'residual plot'} onClick={() => setShowResid(v => !v)} />
          <LinkBtn label={showQQ ? 'hide QQ' : 'residual QQ'} onClick={() => setShowQQ(v => !v)} />
        </Row>
        {showResid && <ResidualPlot fitted={r.fitted} residuals={r.residuals} />}
        {showQQ && <QQPlot vals={r.residuals} label="residuals" />}
      </>}

      {/* ── Forest plot for effect sizes ── */}
      {forestItems && forestItems.length > 0 && ['Welch t-test', 'One-Way ANOVA', 'Simple OLS', 'Multiple OLS'].some(t => r.test?.includes(t) || r.test === t) && <>
        <SectionHead label="Forest plot (95% CI)" />
        <ForestPlot items={forestItems} />
      </>}
    </div>
  );
}
