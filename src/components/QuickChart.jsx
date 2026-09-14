import {
  QuickScatter, QuickScatterFit, ViolinPlot, BarCI, HistogramDensity, HeatmapCorr, MosaicPlot,
  PowerCurve, PathDiagram, ForestPlot, QQPlot, ScreePlot, ResidualPlot, BootstrapHist,
  QuickSlopes, BoxPlotGrid, IRTCurves, LCAProfiles, SpaghettiPlot, CaterpillarPlot,
  ITSPlot, RDPlot, SociogramPlot, TimeSeriesChart,
} from './charts.jsx';
import { C } from '../palette.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };
export default function QuickChart({ mode, data, xVar, yVar, colorVar, ds, colorMap, groups, inferenceResult, activeTest }) {
  const numVals = (col) => data.map(r => +r[col]).filter(Number.isFinite);
  const gVar = colorVar && colorVar !== '(none)' ? colorVar : null;
  const emptyHint = (msg) => (
    <div style={{ padding: 12, fontSize: 9, color: C.dim, ...mono, textAlign: 'center', lineHeight: 1.5 }}>{msg}</div>
  );
  switch (mode) {
    case 'violin': {
      const gVar = colorVar && colorVar !== '(none)' ? colorVar : null;
      const gList = gVar ? [...new Set(data.map(r => r[gVar]))].slice(0, 4) : ['all'];
      return (
        <div style={{ display: 'flex', gap: 4, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          {gList.map(g => (
            <div key={g} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: C.dim }}>{g}</div>
              <ViolinPlot
                data={(gVar ? data.filter(r => r[gVar] === g) : data).map(r => +r[yVar]).filter(Number.isFinite)}
                  width={90} height={130}
              />
            </div>
          ))}
        </div>
      );
    }
    case 'scatter':
      return (
        <QuickScatter
          data={data} xVar={xVar} yVar={yVar}
          colorVar={colorVar !== '(none)' ? colorVar : null}
          colorMap={colorMap} groups={groups}
        />
      );
    case 'scatterfit':
      return (
        <QuickScatterFit
          data={data} xVar={xVar} yVar={yVar}
          colorVar={colorVar !== '(none)' ? colorVar : null}
          colorMap={colorMap} groups={groups}
        />
      );
    case 'path':
      return inferenceResult && activeTest === 'mediation'
        ? <PathDiagram r={inferenceResult} />
        : emptyHint('Run Mediation in Inference to see the path diagram.');
    case 'forest':
      return inferenceResult?.studies?.length
        ? <ForestPlot items={inferenceResult.studies.map(s => ({ label: s.label, est: s.d, lo: s.d - 1.96 * s.se, hi: s.d + 1.96 * s.se, p: s.p }))} />
        : emptyHint('Enter study effects in Meta-analysis, then run.');
    case 'qq':
      return <QQPlot vals={numVals(yVar || xVar)} label={yVar || xVar} />;
    case 'scree':
      return inferenceResult?.eigenvalues?.length
        ? <ScreePlot eigenvalues={inferenceResult.eigenvalues} />
        : emptyHint('Run PCA with scale variables selected.');
    case 'residual':
      return inferenceResult?.fitted && inferenceResult?.residuals
        ? <ResidualPlot fitted={inferenceResult.fitted} residuals={inferenceResult.residuals} />
        : emptyHint('Run Simple OLS to view residuals vs fitted.');
    case 'boot':
      return inferenceResult?.dist
        ? <BootstrapHist dist={inferenceResult.dist} lo={inferenceResult.lo} hi={inferenceResult.hi} />
        : <HistogramDensity values={numVals(yVar || xVar)} width={210} height={160} />;
    case 'timeseries': {
      const tsSeries = seriesFromResult(inferenceResult, activeTest);
      if (tsSeries?.length) return <TimeSeriesChart series={tsSeries} width={210} height={140} />;
      return <HistogramDensity values={numVals(yVar || xVar)} width={210} height={160} />;
    }
    case 'histogram':
      return <HistogramDensity values={numVals(yVar || xVar)} width={210} height={160} />;
    case 'barci':
      return <BarCI groups={barGroupsFromResult(inferenceResult, activeTest, data, gVar, yVar)} width={210} height={160} />;
    case 'box':
      return gVar
        ? <BoxPlotGrid data={data} groupVar={gVar} yVar={yVar} width={210} height={160} />
        : emptyHint('Select a Color / group variable for box plots.');
    case 'slopes':
      return inferenceResult?.simpleSlopes?.length
        ? <QuickSlopes slopes={inferenceResult.simpleSlopes} />
        : emptyHint('Run Moderation in Inference to see simple slopes at \u00B11 SD.');
    case 'loading': {
      const load = loadingFromResult(inferenceResult, activeTest, ds?.numeric);
      if (load) {
        return (
          <HeatmapCorr
            matrix={load.matrix} labels={load.colLabels} rowLabels={load.rowLabels}
            width={210} height={210}
          />
        );
      }
      return emptyHint('Run PCA, EFA, or Cronbach \u03B1 in Inference.');
    }
    case 'heatmap': {
      const vars = (ds?.numeric || []).slice(0, 6);
      return <HeatmapCorr matrix={computeCorrMatrix(data, vars)} labels={vars} width={210} height={210} />;
    }
    case 'mosaic':
      return <MosaicPlot data={data} xVar={gVar || xVar} yVar={yVar} width={210} height={160} />;
    case 'power':
      return <PowerCurve d={0.5} currentN={Math.floor(data.length / 2)} />;
    case 'irtplot':
      return inferenceResult?.icc?.length
        ? <IRTCurves icc={inferenceResult.icc} itemCount={inferenceResult.k} />
        : emptyHint('Run IRT 1PL or 2PL with scale items selected.');
    case 'lca':
      return inferenceResult?.profiles?.length
        ? <LCAProfiles profiles={inferenceResult.profiles} />
        : emptyHint('Run Latent Class Analysis with two categorical indicators.');
    case 'spaghetti':
      return gVar && yVar
        ? <SpaghettiPlot data={data} xVar={xVar || ds?.numeric?.[0]} yVar={yVar} groupVar={gVar} />
        : emptyHint('Select cluster ID and outcome for spaghetti plot.');
    case 'caterpillar':
      return inferenceResult?.groupMeans?.length
        ? <CaterpillarPlot groups={inferenceResult.groupMeans} />
        : emptyHint('Run HLM random intercept to see caterpillar plot.');
    case 'its':
      return inferenceResult?.series?.length
        ? <ITSPlot series={inferenceResult.series} />
        : emptyHint('Run Interrupted Time Series with time and outcome vectors.');
    case 'rddplot':
      return inferenceResult?.points?.length
        ? <RDPlot points={inferenceResult.points} cutoff={inferenceResult.cutoff} />
        : emptyHint('Run Regression Discontinuity with X and Y variables.');
    case 'sociogram':
      return inferenceResult?.nodes?.length
        ? <SociogramPlot nodes={inferenceResult.nodes} edges={inferenceResult.edges} />
        : emptyHint('Run Sociogram / enter edge list (A-B,B-C).');
    default:
      return (
        <QuickScatter
          data={data} xVar={xVar} yVar={yVar}
          colorVar={colorVar !== '(none)' ? colorVar : null}
          colorMap={colorMap} groups={groups}
        />
      );
  }
}

// ── Panel layout hook ────────────────────────────────────────────────────────
const defaultPanelLayout = {
  navigator: { width: 240, visible: true },
  advanced: { width: 280, visible: false },
  calc: { height: 260, visible: true },
};
