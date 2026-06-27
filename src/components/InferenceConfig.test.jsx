// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { InferenceConfig } from './InferenceConfig.jsx';

const mockDs = { numeric: ['x', 'y'], categorical: ['group'] };

const noop = () => {};
const mockState = {
  grpVar: '', setGrpVar: noop, tgtVar: '', setTgtVar: noop,
  g1: '', setG1: noop, g2: '', setG2: noop,
  xVar: '', setXVar: noop, yVar: '', setYVar: noop,
  zVar: '', setZVar: noop, mVar: '', setMVar: noop,
  cat1: '', setCat1: noop, cat2: '', setCat2: noop,
  mu0: '0', setMu0: noop, sigma: '', setSigma: noop,
  preds: [], setPreds: noop, scaleVars: [], setScaleVars: noop,
  rmCols: [], setRmCols: noop, polDeg: 2, setPolDeg: noop,
  tostL: '', setTostL: noop, tostH: '', setTostH: noop,
  bfPrior: '', setBfPrior: noop, ssType: 'II', setSsType: noop,
  ssPow: 0.8, setSsPow: noop, ssD: 0.5, setSsD: noop,
  ssR: 0, setSsR: noop, effFrom: 'd', setEffFrom: noop,
  effVal: 0.5, setEffVal: noop, corrMeth: 'pearson', setCorrMeth: noop,
  pairsInput: '', setPairsInput: noop, bsStat: 'mean', setBsStat: noop,
  bsSeed: '42', setBsSeed: noop, bsB: '1000', setBsB: noop,
  nFactors: 1, setNFactors: noop,
  fx_a: '', setFxa: noop, fx_b: '', setFxb: noop,
  fx_c: '', setFxc: noop, fx_d: '', setFxd: noop,
  p1x: '', setP1x: noop, p1n: '', setP1n: noop,
  p2x: '', setP2x: noop, p2n: '', setP2n: noop,
  binoK: '', setBinoK: noop, binoN: '', setBinoN: noop,
  binoP: '', setBinoP: noop,
  didPCStr: '', setDidPCStr: noop, didPOStr: '', setDidPOStr: noop,
  didPTStr: '', setDidPTStr: noop, didPTtStr: '', setDidPTtStr: noop,
  onRunBs: noop, bsRunning: false, onRunMedBs: noop, medBsRunning: false,
  powAnovaF: 0.25, setPowAnovaF: noop, powKgroups: 3, setPowKgroups: noop,
  powNperGrp: 20, setPowNperGrp: noop,
  powChiW: 0.3, setPowChiW: noop, powChiDf: 4, setPowChiDf: noop,
  powChiN: 100, setPowChiN: noop,
  powLogitOr: 2, setPowLogitOr: noop, powLogitP0: 0.3, setPowLogitP0: noop,
  powLogitN: 50, setPowLogitN: noop,
  powMixedIcc: 0.05, setPowMixedIcc: noop, powMixedM: 10, setPowMixedM: noop,
  powMixedJ: 15, setPowMixedJ: noop, powMixedD: 0.5, setPowMixedD: noop,
  powMedA: 0.3, setPowMedA: noop, powMedB: 0.4, setPowMedB: noop,
  powMedSea: 0.1, setPowMedSea: noop, powMedSeb: 0.1, setPowMedSeb: noop,
  clusterK: 3, setClusterK: noop, linkage: 'ward', setLinkage: noop,
  nLcaClasses: 3, setNLcaClasses: noop,
  level2Var: '', setLevel2Var: noop, treatVar: '', setTreatVar: noop,
  edgeList: '', setEdgeList: noop,
  itsTimeStr: '', setItsTimeStr: noop, itsValStr: '', setItsValStr: noop,
  itsCut: '', setItsCut: noop,
  rddCutoff: '', setRddCutoff: noop, rddBw: '', setRddBw: noop,
  ivInstrument: '', setIvInstrument: noop,
  scaleMethod: 'sum', setScaleMethod: noop, reverseItems: [], setReverseItems: noop,
};

describe('InferenceConfig', () => {
  test('renders without crashing', () => {
    const { container } = render(
      <InferenceConfig active="t_welch" alpha={0.05} setAlpha={noop} ds={mockDs} data={[]} state={mockState} set={noop} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
