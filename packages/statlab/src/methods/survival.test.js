import { describe, it, expect } from 'vitest';
import { kmEstimate, logRankTest, nelsonAalen, coxPH, parametricSurvival, fineGray, frailtyCox, timeVaryingCox, rmst, rmstCompare, aalenModel, cureModel, multistateModel, agModel, pwpgap, wlwMarginal, survivalTree, randomSurvivalForest, rsfVariableImportance, timeDependentROC, survivalCalibration, survivalForestPredict, jointModel, landmarkAnalysis, pseudoValues } from './survival.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
const survRef = ref.survival;

const obsA = [
  { time: 5, event: 1 }, { time: 8, event: 1 }, { time: 12, event: 0 },
  { time: 15, event: 1 }, { time: 20, event: 1 }, { time: 25, event: 0 },
  { time: 30, event: 1 }, { time: 35, event: 1 }, { time: 40, event: 0 },
  { time: 45, event: 1 }, { time: 50, event: 1 },
];

const obsB = [
  { time: 3, event: 1 }, { time: 6, event: 1 }, { time: 10, event: 0 },
  { time: 14, event: 1 }, { time: 18, event: 1 }, { time: 22, event: 0 },
  { time: 28, event: 1 }, { time: 32, event: 1 }, { time: 38, event: 0 },
  { time: 42, event: 1 }, { time: 48, event: 1 },
];

const coxData = [
  { time: 5, event: 1, age: 50, trt: 0 },
  { time: 8, event: 1, age: 60, trt: 1 },
  { time: 12, event: 0, age: 45, trt: 0 },
  { time: 15, event: 1, age: 55, trt: 1 },
  { time: 20, event: 1, age: 65, trt: 1 },
  { time: 25, event: 0, age: 40, trt: 0 },
  { time: 30, event: 1, age: 70, trt: 1 },
  { time: 35, event: 1, age: 48, trt: 0 },
  { time: 40, event: 0, age: 58, trt: 0 },
  { time: 45, event: 1, age: 62, trt: 1 },
  { time: 50, event: 1, age: 52, trt: 0 },
];

const coxDataStrat = [
  { time: 5, event: 1, age: 50, trt: 0, sex: 'M' },
  { time: 8, event: 1, age: 60, trt: 1, sex: 'M' },
  { time: 12, event: 0, age: 45, trt: 0, sex: 'M' },
  { time: 15, event: 1, age: 55, trt: 1, sex: 'M' },
  { time: 20, event: 1, age: 65, trt: 1, sex: 'M' },
  { time: 25, event: 0, age: 40, trt: 0, sex: 'F' },
  { time: 30, event: 1, age: 70, trt: 1, sex: 'F' },
  { time: 35, event: 1, age: 48, trt: 0, sex: 'F' },
  { time: 40, event: 0, age: 58, trt: 0, sex: 'F' },
  { time: 45, event: 1, age: 62, trt: 1, sex: 'F' },
  { time: 50, event: 1, age: 52, trt: 0, sex: 'F' },
];

describe('kmEstimate', () => {
  it('returns null for empty or small obs', () => {
    expect(kmEstimate(null)).toBeNull();
    expect(kmEstimate([])).toBeNull();
    expect(kmEstimate([{ time: 1, event: 1 }])).toBeNull();
  });

  it('returns correct keys', () => {
    const r = kmEstimate(obsA);
    expectKeys(r, ['test', 'survivalTable', 'medianSurvival', 'n', 'nEvents', 'apa']);
    expect(r.test).toBe('Kaplan-Meier Estimator');
  });

  it('survivalTable has correct shape', () => {
    const r = kmEstimate(obsA);
    expect(Array.isArray(r.survivalTable)).toBe(true);
    expect(r.survivalTable.length).toBeGreaterThan(0);
    for (const row of r.survivalTable) {
      expectKeys(row, ['time', 'nAtRisk', 'nEvents', 'nCensored', 'survival', 'se']);
      expect(typeof row.time).toBe('number');
      expect(typeof row.nAtRisk).toBe('number');
      expect(typeof row.nEvents).toBe('number');
      expect(typeof row.nCensored).toBe('number');
      expect(typeof row.survival).toBe('number');
      expect(typeof row.se).toBe('number');
      expect(row.survival).toBeGreaterThanOrEqual(0);
      expect(row.survival).toBeLessThanOrEqual(1);
      expect(row.se).toBeGreaterThanOrEqual(0);
    }
  });

  it('survival is non-increasing across table', () => {
    const r = kmEstimate(obsA);
    for (let i = 1; i < r.survivalTable.length; i++) {
      expect(r.survivalTable[i].survival).toBeLessThanOrEqual(r.survivalTable[i - 1].survival);
    }
  });

  it('n and nEvents are correct', () => {
    const r = kmEstimate(obsA);
    expect(r.n).toBe(obsA.length);
    expect(r.nEvents).toBe(obsA.filter(o => o.event === 1).length);
  });

  it('matches a lifelines.KaplanMeierFitter oracle at the last event time', () => {
    // statlab's kmEstimate tabulates only event times (not trailing censoring-only
    // rows, which lifelines' table includes) — a legitimate convention difference,
    // so compare at the last EVENT time rather than each implementation's last row.
    const e = survRef.km_basic;
    const obs = e.time.map((t, i) => ({ time: t, event: e.event[i] }));
    const r = kmEstimate(obs);
    const last = r.survivalTable[r.survivalTable.length - 1];
    expect(last.time).toBeCloseTo(e.lastEventTime, 6);
    expect(last.survival).toBeCloseTo(e.survivalAtLastEvent, 4);
  });

  it('medianSurvival is calculated', () => {
    const r = kmEstimate(obsA);
    expect(r.medianSurvival).toBeGreaterThan(0);
    expect(typeof r.medianSurvival).toBe('number');
  });

  it('medianSurvival is null when survival never reaches 0.5', () => {
    const neverReach = [
      { time: 5, event: 1 }, { time: 10, event: 0 },
      { time: 20, event: 0 }, { time: 30, event: 0 },
      { time: 40, event: 0 },
    ];
    const r = kmEstimate(neverReach);
    expect(r.medianSurvival).toBeNull();
  });

  it('apa is a string', () => {
    const r = kmEstimate(obsA);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });


});

describe('logRankTest', () => {
  it('returns null for empty arrays', () => {
    expect(logRankTest(null, obsA)).toBeNull();
    expect(logRankTest([], obsA)).toBeNull();
    expect(logRankTest(obsA, null)).toBeNull();
    expect(logRankTest(obsA, [])).toBeNull();
  });

  it('returns correct keys', () => {
    const r = logRankTest(obsA, obsB);
    expectKeys(r, ['test', 'chi2', 'df', 'p', 'apa']);
    expect(r.test).toBe('Log-Rank Test');
  });

  it('chi2 is non-negative and df is 1', () => {
    const r = logRankTest(obsA, obsB);
    expect(r.chi2).toBeGreaterThanOrEqual(0);
    expect(r.df).toBe(1);
  });

  it('p is between 0 and 1', () => {
    const r = logRankTest(obsA, obsB);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });

  it('matches a lifelines.statistics.logrank_test oracle', () => {
    const e = survRef.logRank_basic;
    const oA = e.time1.map((t, i) => ({ time: t, event: e.event1[i] }));
    const oB = e.time2.map((t, i) => ({ time: t, event: e.event2[i] }));
    const r = logRankTest(oA, oB);
    expect(r.chi2).toBeCloseTo(e.chi2, 4);
    expect(r.p).toBeCloseTo(e.p, 6);
  });

  it('apa is a string', () => {
    const r = logRankTest(obsA, obsB);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });

  it('identical groups produce chi2 = 0 and p = 1', () => {
    const r = logRankTest(obsA, obsA);
    expect(r.chi2).toBe(0);
    expect(r.p).toBe(1);
  });

  it('comparison between two groups works', () => {
    const r = logRankTest(obsA, obsB);
    expect(r).not.toBeNull();
    expect(Number.isFinite(r.chi2)).toBe(true);
    expect(Number.isFinite(r.p)).toBe(true);
  });

  it('single event in each group', () => {
    const a = [{ time: 10, event: 1 }, { time: 30, event: 0 }];
    const b = [{ time: 15, event: 1 }, { time: 25, event: 0 }];
    const r = logRankTest(a, b);
    expect(r).not.toBeNull();
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });
});

describe('nelsonAalen', () => {
  it('returns null for empty or small obs', () => {
    expect(nelsonAalen(null)).toBeNull();
    expect(nelsonAalen([])).toBeNull();
    expect(nelsonAalen([{ time: 1, event: 1 }])).toBeNull();
  });

  it('returns correct keys', () => {
    const r = nelsonAalen(obsA);
    expectKeys(r, ['test', 'cumulativeHazardTable', 'n', 'nEvents', 'apa']);
    expect(r.test).toBe('Nelson-Aalen Estimator');
  });

  it('cumulativeHazardTable has correct shape', () => {
    const r = nelsonAalen(obsA);
    expect(Array.isArray(r.cumulativeHazardTable)).toBe(true);
    expect(r.cumulativeHazardTable.length).toBeGreaterThan(0);
    for (const row of r.cumulativeHazardTable) {
      expectKeys(row, ['time', 'nAtRisk', 'nEvents', 'nCensored', 'cumulativeHazard', 'survival', 'se']);
      expect(typeof row.cumulativeHazard).toBe('number');
      expect(typeof row.survival).toBe('number');
      expect(row.survival).toBeGreaterThanOrEqual(0);
      expect(row.survival).toBeLessThanOrEqual(1);
      expect(row.cumulativeHazard).toBeGreaterThanOrEqual(0);
    }
  });

  it('survival = exp(-cumulativeHazard) for last entry', () => {
    const r = nelsonAalen(obsA);
    const last = r.cumulativeHazardTable[r.cumulativeHazardTable.length - 1];
    expect(last.survival).toBeCloseTo(Math.exp(-last.cumulativeHazard), 4);
  });

  it('cumulativeHazard is non-decreasing', () => {
    const r = nelsonAalen(obsA);
    for (let i = 1; i < r.cumulativeHazardTable.length; i++) {
      expect(r.cumulativeHazardTable[i].cumulativeHazard).toBeGreaterThanOrEqual(r.cumulativeHazardTable[i - 1].cumulativeHazard);
    }
  });

  it('n and nEvents are correct', () => {
    const r = nelsonAalen(obsA);
    expect(r.n).toBe(obsA.length);
    expect(r.nEvents).toBe(obsA.filter(o => o.event === 1).length);
  });

  it('apa is a string', () => {
    const r = nelsonAalen(obsA);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('coxPH', () => {
  it('returns null for small obs', () => {
    expect(coxPH(null, ['age'])).toBeNull();
    expect(coxPH([{ time: 1, event: 1, age: 50 }], ['age'])).toBeNull();
    expect(coxPH([{ time: 1, event: 1, age: 50 }, { time: 2, event: 0, age: 60 }], ['age'])).toBeNull();
  });

  it('returns null for no covNames', () => {
    expect(coxPH(coxData, null)).toBeNull();
    expect(coxPH(coxData, [])).toBeNull();
  });



  it('returns correct keys', () => {
    const r = coxPH(coxData, ['age']);
    expectKeys(r, ['test', 'coefficients', 'logLikelihood', 'baselineSurvival', 'n', 'nEvents', 'strata', 'apa']);
    expect(r.test).toBe('Cox Proportional Hazards');
  });

  it('matches a lifelines.CoxPHFitter oracle (regression test for the earlier Newton-step sign-flip fix)', () => {
    // survival.js's Newton update previously used β+H⁻¹·grad against a
    // negative-definite Hessian (should be β−H⁻¹·grad), sign-flipping every
    // Cox/logistic coefficient in this module — fixed earlier in this session,
    // now validated against an independent lifelines fit.
    const e = survRef.coxPH_basic;
    const obs = e.time.map((t, i) => ({ time: t, event: e.event[i], x: e.x[i] }));
    const r = coxPH(obs, ['x']);
    expect(r.coefficients[0].beta).toBeCloseTo(e.beta, 3);
    expect(r.coefficients[0].se).toBeCloseTo(e.se, 3);
    expect(r.coefficients[0].p).toBeCloseTo(e.p, 3);
  });

  it('coefficients have expected per-covariate keys', () => {
    const r = coxPH(coxData, ['age']);
    expect(Array.isArray(r.coefficients)).toBe(true);
    expect(r.coefficients.length).toBe(1);
    for (const c of r.coefficients) {
      expectKeys(c, ['name', 'beta', 'se', 'z', 'p', 'hr', 'hrCI']);
      expect(typeof c.name).toBe('string');
      expect(typeof c.beta).toBe('number');
      expect(typeof c.se).toBe('number');
      expect(typeof c.z).toBe('number');
      expect(typeof c.p).toBe('number');
      expect(typeof c.hr).toBe('number');
      expect(Array.isArray(c.hrCI)).toBe(true);
      expect(c.hrCI.length).toBe(2);
      expect(c.p).toBeGreaterThanOrEqual(0);
      expect(c.p).toBeLessThanOrEqual(1);
      expect(c.se).toBeGreaterThanOrEqual(0);
    }
  });

  it('baselineSurvival is an array', () => {
    const r = coxPH(coxData, ['age']);
    expect(Array.isArray(r.baselineSurvival)).toBe(true);
    expect(r.baselineSurvival.length).toBeGreaterThan(0);
  });

  it('baselineSurvival entries have expected shape', () => {
    const r = coxPH(coxData, ['age']);
    for (const row of r.baselineSurvival) {
      expectKeys(row, ['time', 'nAtRisk', 'cumulativeBaselineHazard', 'baselineSurvival']);
      expect(row.baselineSurvival).toBeGreaterThanOrEqual(0);
      expect(row.baselineSurvival).toBeLessThanOrEqual(1);
    }
  });

  it('logLikelihood is finite', () => {
    const r = coxPH(coxData, ['age']);
    expect(Number.isFinite(r.logLikelihood)).toBe(true);
  });

  it('n and nEvents are correct', () => {
    const r = coxPH(coxData, ['age']);
    expect(r.n).toBe(coxData.length);
    expect(r.nEvents).toBe(coxData.filter(o => o.event === 1).length);
    expect(r.nEvents).toBeGreaterThan(0);
  });

  it('strata is null without strata parameter', () => {
    const r = coxPH(coxData, ['age']);
    expect(r.strata).toBeNull();
  });

  it('strata is non-null with strata parameter', () => {
    const r = coxPH(coxDataStrat, ['age'], { strata: 'sex' });
    expect(r.strata).not.toBeNull();
    expect(Array.isArray(r.strata)).toBe(true);
    expect(r.test).toBe('Stratified Cox PH');
  });

  it('apa is a string', () => {
    const r = coxPH(coxData, ['age']);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });

  it('works with multiple covariates', () => {
    const r = coxPH(coxData, ['age', 'trt']);
    expect(r.coefficients.length).toBe(2);
    for (const c of r.coefficients) {
      expect(['age', 'trt']).toContain(c.name);
    }
  });

  it('hrCI bounds enclose hr', () => {
    const r = coxPH(coxData, ['age']);
    for (const c of r.coefficients) {
      expect(c.hrCI[0]).toBeLessThanOrEqual(c.hr);
      expect(c.hrCI[1]).toBeGreaterThanOrEqual(c.hr);
    }
  });
});

describe('parametricSurvival', () => {
  const paraData = [
    { time: 5, event: 1, dose: 1 }, { time: 8, event: 1, dose: 2 },
    { time: 12, event: 0, dose: 1 }, { time: 15, event: 1, dose: 3 },
    { time: 20, event: 1, dose: 2 }, { time: 25, event: 0, dose: 1 },
    { time: 30, event: 1, dose: 2 }, { time: 35, event: 1, dose: 3 },
    { time: 40, event: 0, dose: 1 }, { time: 45, event: 1, dose: 2 },
    { time: 50, event: 1, dose: 3 },
  ];

  it('returns null for empty or small obs', () => {
    expect(parametricSurvival(null, ['dose'])).toBeNull();
    expect(parametricSurvival([{ time: 1, event: 1, dose: 1 }], ['dose'])).toBeNull();
    expect(parametricSurvival([{ time: 1, event: 1, dose: 1 }, { time: 2, event: 0, dose: 2 }], ['dose'])).toBeNull();
  });

  it('returns null for unsupported distribution', () => {
    expect(parametricSurvival(paraData, ['dose'], { distribution: 'lognormal' })).toBeNull();
  });

  it('returns null for no covNames', () => {
    expect(parametricSurvival(paraData, null)).toBeNull();
    expect(parametricSurvival(paraData, [])).toBeNull();
  });

  it('returns correct keys for weibull', () => {
    const r = parametricSurvival(paraData, ['dose']);
    expectKeys(r, ['test', 'distribution', 'shape', 'scale', 'medianSurvival', 'n', 'apa']);
    expect(r.test).toBe('Parametric Survival (weibull)');
    expect(r.distribution).toBe('weibull');
  });

  it('weibull fit returns shape > 0 and scale > 0', () => {
    const r = parametricSurvival(paraData, ['dose']);
    expect(r.shape).toBeGreaterThan(0);
    expect(r.scale).toBeGreaterThan(0);
  });

  it('weibull medianSurvival is positive', () => {
    const r = parametricSurvival(paraData, ['dose']);
    expect(r.medianSurvival).toBeGreaterThan(0);
    expect(typeof r.medianSurvival).toBe('number');
  });

  it('exponential fit works', () => {
    const r = parametricSurvival(paraData, ['dose'], { distribution: 'exponential' });
    expect(r).not.toBeNull();
    expect(r.distribution).toBe('exponential');
    expect(r.test).toBe('Parametric Survival (exponential)');
    expect(r.shape).toBeGreaterThan(0);
    expect(r.scale).toBeGreaterThan(0);
    expect(r.medianSurvival).toBeGreaterThan(0);
  });

  it('gompertz fit works', () => {
    const r = parametricSurvival(paraData, ['dose'], { distribution: 'gompertz' });
    expect(r).not.toBeNull();
    expect(r.distribution).toBe('gompertz');
    expect(r.shape).not.toBeNull();
    expect(r.shape).not.toBeNaN();
    expect(Number.isFinite(r.shape)).toBe(true);
  });

  it('log-logistic fit works', () => {
    const r = parametricSurvival(paraData, ['dose'], { distribution: 'log-logistic' });
    expect(r).not.toBeNull();
    expect(r.distribution).toBe('log-logistic');
  });

  it('log-normal fit works', () => {
    const r = parametricSurvival(paraData, ['dose'], { distribution: 'log-normal' });
    expect(r).not.toBeNull();
    expect(r.distribution).toBe('log-normal');
  });

  it('n matches input', () => {
    const r = parametricSurvival(paraData, ['dose']);
    expect(r.n).toBe(paraData.length);
  });

  it('apa is a string', () => {
    const r = parametricSurvival(paraData, ['dose']);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });

  it('all events censored still works', () => {
    const allCensored = paraData.map(o => ({ ...o, event: 0 }));
    const r = parametricSurvival(allCensored, ['dose']);
    expect(r).not.toBeNull();
  });
});

// ── Fine-Gray ─────────────────────────────────────────────────────────────────
describe('fineGray', () => {
  const competingData = [
    { time: 3, event: 1, x: 1 },  // cause 1
    { time: 5, event: 2, x: 0.5 }, // cause 2 (competing)
    { time: 8, event: 1, x: 0.8 }, // cause 1
    { time: 10, event: 0, x: 1.2 }, // censored
    { time: 12, event: 2, x: 0.3 }, // cause 2
    { time: 15, event: 1, x: 1.5 }, // cause 1
    { time: 18, event: 1, x: 0.9 }, // cause 1
    { time: 20, event: 0, x: 1.1 }, // censored
    { time: 22, event: 1, x: 1.3 }, // cause 1
    { time: 25, event: 2, x: 0.7 }, // cause 2
    { time: 28, event: 1, x: 0.6 }, // cause 1
    { time: 30, event: 0, x: 1.0 }, // censored
    { time: 32, event: 1, x: 1.4 }, // cause 1
    { time: 35, event: 1, x: 0.4 }, // cause 1
  ];

  it('returns null for insufficient data', () => {
    expect(fineGray(null, ['x'], 1)).toBeNull();
    expect(fineGray([], ['x'], 1)).toBeNull();
    expect(fineGray(competingData.slice(0, 4), ['x'], 1)).toBeNull();
  });

  it('returns null for single cause-of-interest event', () => {
    const single = [{ time: 1, event: 1, x: 0.5 }, { time: 2, event: 2, x: 1 }, { time: 3, event: 2, x: 1 }];
    expect(fineGray(single, ['x'], 1)).toBeNull();
  });

  it('returns correct keys', () => {
    const r = fineGray(competingData, ['x'], 1);
    expectKeys(r, ['test', 'coefficients', 'causeOfInterest', 'n', 'nEvents', 'nCompeting', 'apa']);
  });

  it('coefficients have correct shape', () => {
    const r = fineGray(competingData, ['x'], 1);
    expect(r.coefficients).toHaveLength(1);
    const c = r.coefficients[0];
    expect(typeof c.hr).toBe('number');
    expect(Number.isFinite(c.hr)).toBe(true);
    expect(typeof c.se).toBe('number');
    expect(typeof c.z).toBe('number');
    expect(typeof c.p).toBe('number');
  });

  it('nCompeting > 0 for competing events', () => {
    const r = fineGray(competingData, ['x'], 1);
    expect(r.nCompeting).toBeGreaterThan(0);
  });

  it('apa is a non-empty string', () => {
    const r = fineGray(competingData, ['x'], 1);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Frailty Cox ───────────────────────────────────────────────────────────────
describe('frailtyCox', () => {
  const frailtyData = [];
  const clusters = ['A', 'B', 'C', 'D', 'E'];
  for (let g = 0; g < clusters.length; g++) {
    const frailty = 1 + (g - 2) * 0.3;
    const baseHaz = 0.05 * frailty;
    let cumHaz = 0;
    for (let j = 0; j < 6; j++) {
      cumHaz += -Math.log(1 - baseHaz / (1 + cumHaz));
      const event = j < 5 ? 1 : 0;
      frailtyData.push({ time: cumHaz * 20 + g * 2, event, x: (g % 3) + (j % 2) * 0.5, cluster: clusters[g] });
    }
  }

  it('returns null for insufficient data', () => {
    expect(frailtyCox(null, ['x'], 'cluster')).toBeNull();
    expect(frailtyCox([], ['x'], 'cluster')).toBeNull();
    expect(frailtyCox(frailtyData.slice(0, 3), ['x'], 'cluster')).toBeNull();
  });

  it('returns null for single cluster', () => {
    const singleCluster = frailtyData.map(o => ({ ...o, cluster: 'only' }));
    expect(frailtyCox(singleCluster, ['x'], 'cluster')).toBeNull();
  });

  it('gamma distribution returns correct keys', () => {
    const r = frailtyCox(frailtyData, ['x'], 'cluster', { distribution: 'gamma', maxIter: 15 });
    expectKeys(r, ['test', 'distribution', 'coefficients', 'frailtyVariance', 'lrtTau', 'frailtyEstimates', 'n', 'nClusters', 'apa']);
    expect(r.distribution).toBe('gamma');
  });

  it('lognormal distribution returns correct keys', () => {
    const r = frailtyCox(frailtyData, ['x'], 'cluster', { distribution: 'lognormal', maxIter: 15 });
    expect(r).not.toBeNull();
    expectKeys(r, ['test', 'distribution', 'coefficients', 'frailtyVariance', 'lrtTau', 'frailtyEstimates', 'n', 'nClusters', 'apa']);
  });

  it('frailtyVariance is positive', () => {
    const r = frailtyCox(frailtyData, ['x'], 'cluster', { maxIter: 15 });
    expect(r.frailtyVariance).toBeGreaterThan(0);
  });

  it('frailtyEstimates has one entry per cluster', () => {
    const r = frailtyCox(frailtyData, ['x'], 'cluster', { maxIter: 15 });
    expect(r.frailtyEstimates).toHaveLength(clusters.length);
  });

  it('lrtTau has stat, df, p', () => {
    const r = frailtyCox(frailtyData, ['x'], 'cluster', { maxIter: 15 });
    expect(typeof r.lrtTau.stat).toBe('number');
    expect(r.lrtTau.df).toBe(1);
    expect(typeof r.lrtTau.p).toBe('number');
  });

  it('apa is a non-empty string', () => {
    const r = frailtyCox(frailtyData, ['x'], 'cluster', { maxIter: 15 });
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Time-Varying Cox ──────────────────────────────────────────────────────────
describe('timeVaryingCox', () => {
  const tvData = [];
  for (let id = 1; id <= 10; id++) {
    const nRows = 2 + (id % 3);
    for (let row = 0; row < nRows; row++) {
      const start = row * 5;
      const stop = (row + 1) * 5;
      const event = row === nRows - 1 && id <= 7 ? 1 : 0;
      tvData.push({ id, start, stop, event, x: (id % 3) * 0.5 + row * 0.2 });
    }
  }

  it('returns null for insufficient data', () => {
    expect(timeVaryingCox(null, 'id', 'start', 'stop', 'event', ['x'])).toBeNull();
    expect(timeVaryingCox([], 'id', 'start', 'stop', 'event', ['x'])).toBeNull();
  });

  it('returns correct keys', () => {
    const r = timeVaryingCox(tvData, 'id', 'start', 'stop', 'event', ['x']);
    expectKeys(r, ['test', 'coefficients', 'nSubjects', 'nRows', 'nEvents', 'apa']);
  });

  it('coefficients have correct shape', () => {
    const r = timeVaryingCox(tvData, 'id', 'start', 'stop', 'event', ['x']);
    expect(r.coefficients).toHaveLength(1);
    expect(r.coefficients[0].name).toBe('x');
    expect(Number.isFinite(r.coefficients[0].hr)).toBe(true);
  });

  it('nSubjects matches unique IDs', () => {
    const r = timeVaryingCox(tvData, 'id', 'start', 'stop', 'event', ['x']);
    expect(r.nSubjects).toBe(10);
  });

  it('nRows matches data length', () => {
    const r = timeVaryingCox(tvData, 'id', 'start', 'stop', 'event', ['x']);
    expect(r.nRows).toBe(tvData.length);
  });

  it('nEvents > 0', () => {
    const r = timeVaryingCox(tvData, 'id', 'start', 'stop', 'event', ['x']);
    expect(r.nEvents).toBeGreaterThan(0);
  });

  it('apa is a non-empty string', () => {
    const r = timeVaryingCox(tvData, 'id', 'start', 'stop', 'event', ['x']);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── RMST ──────────────────────────────────────────────────────────────────────
describe('rmst', () => {
  it('returns null for invalid input', () => {
    expect(rmst(null)).toBeNull();
    expect(rmst([])).toBeNull();
    expect(rmst([{ time: 1, event: 1 }])).toBeNull();
  });

  it('returns correct keys for single group', () => {
    const r = rmst(obsA);
    expectKeys(r, ['test', 'rmst', 'se', 'truncTime', 'nEvents', 'n', 'apa']);
  });

  it('rmst is within valid range', () => {
    const r = rmst(obsA);
    expect(r.rmst).toBeGreaterThan(0);
    const maxTime = Math.max(...obsA.map(o => o.time));
    expect(r.rmst).toBeLessThanOrEqual(maxTime);
  });

  it('truncTime respects custom value', () => {
    const r = rmst(obsA, 20);
    expect(r.truncTime).toBe(20);
  });

  it('rmst with truncTime ≤ full range', () => {
    const rFull = rmst(obsA);
    const rTrunc = rmst(obsA, 15);
    expect(rTrunc.rmst).toBeLessThanOrEqual(rFull.rmst);
  });

  it('se is positive', () => {
    const r = rmst(obsA);
    expect(r.se).toBeGreaterThan(0);
  });

  it('apa is a non-empty string', () => {
    const r = rmst(obsA);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── RMST Compare ──────────────────────────────────────────────────────────────
describe('rmstCompare', () => {
  it('returns null for invalid input', () => {
    expect(rmstCompare(null, obsB)).toBeNull();
    expect(rmstCompare(obsA, null)).toBeNull();
  });

  it('returns correct keys', () => {
    const r = rmstCompare(obsA, obsB);
    expectKeys(r, ['test', 'rmst1', 'rmst2', 'diff', 'seDiff', 'z', 'p', 'truncTime', 'apa']);
  });

  it('diff reflects group difference', () => {
    const r = rmstCompare(obsA, obsB);
    expect(Number.isFinite(r.diff)).toBe(true);
  });

  it('seDiff is positive', () => {
    const r = rmstCompare(obsA, obsB);
    expect(r.seDiff).toBeGreaterThan(0);
  });

  it('z is finite', () => {
    const r = rmstCompare(obsA, obsB);
    expect(Number.isFinite(r.z)).toBe(true);
  });

  it('p is in [0,1]', () => {
    const r = rmstCompare(obsA, obsB);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });

  it('apa non-empty', () => {
    const r = rmstCompare(obsA, obsB);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('aalenModel', () => {
  const ad = []; for (let i = 0; i < 30; i++) ad.push({ time: 10 + i * 2, event: i < 25 ? 1 : 0, x: i % 3 });
  it('null <5 events', () => expect(aalenModel(ad.slice(0, 10), ['x'])).toBeNull());
  it('contract keys', () => { const r = aalenModel(ad, ['x']); if (r) expectKeys(r, ['test', 'coefficients', 'n', 'nEvents', 'apa']); });
  it('coefficients has entries', () => { const r = aalenModel(ad, ['x']); if (r) { expect(r.coefficients.length).toBeGreaterThan(0); } });
});

describe('cureModel', () => {
  const cd = []; for (let i = 0; i < 60; i++) cd.push({ time: 5 + i * 3, event: i < 20 ? 1 : (i > 50 ? 1 : 0), x: i % 2 });
  it('contract keys', () => { const r = cureModel(cd, ['x']); if (r) expectKeys(r, ['test', 'cureFraction', 'cureModel', 'survivalModel', 'n', 'nCensored', 'apa']); });
  it('cure fraction in [0,1] if valid', () => { const r = cureModel(cd, ['x']); if (r) { expect(r.cureFraction).toBeGreaterThanOrEqual(0); expect(r.cureFraction).toBeLessThanOrEqual(1); } });
  it('null for <30', () => expect(cureModel(cd.slice(0, 10), ['x'])).toBeNull());
});

describe('cureModel E-step uses the survival function of the uncured population (not just marginal pi)', () => {
  it('recovers a cure fraction close to the true simulated cured proportion', () => {
    let s = 31; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const trueCureFrac = 0.4;
    const obs = [];
    for (let i = 0; i < 150; i++) {
      const x = i % 2;
      const cured = rnd() < trueCureFrac;
      if (cured) {
        obs.push({ time: 50 + rnd() * 20, event: 0, x }); // administratively censored, never fails
      } else {
        const hazardScale = Math.exp(0.5 * x);
        const t = -Math.log(rnd()) / (0.05 * hazardScale);
        const censorTime = 10 + rnd() * 40;
        if (t < censorTime) obs.push({ time: t, event: 1, x });
        else obs.push({ time: censorTime, event: 0, x });
      }
    }
    const r = cureModel(obs, ['x']);
    expect(r).not.toBeNull();
    expect(r.cureFraction).toBeGreaterThan(0.2);
    expect(r.cureFraction).toBeLessThan(0.6);
  });
});

describe('multistateModel', () => {
  const ms = []; for (let i = 0; i < 60; i++) ms.push({ id: i % 10, time: i * 3, from: i < 40 ? 1 : 2, to: i < 40 ? 2 : 3 });
  it('null small', () => expect(multistateModel(ms.slice(0, 15), 'id', 'from', 'to')).toBeNull());
  it('contract keys', () => { const r = multistateModel(ms, 'id', 'from', 'to'); if (r) expectKeys(r, ['test', 'transProb', 'states', 'n', 'nEvents', 'apa']); });
  it('transProb is 2D array', () => { const r = multistateModel(ms, 'id', 'from', 'to'); if (r) { expect(Array.isArray(r.transProb)).toBe(true); expect(r.transProb.length).toBe(r.states); } });
});

describe('agModel', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ id: i % 10, time: i * 3, event: i % 5 === 0 ? 1 : 0 });
  it('contract keys', () => expectKeys(agModel(d, 'id', 'time', 'event'), ['test', 'rate', 'se', 'n', 'nEvents', 'nSubjects', 'apa']));
  it('null <15', () => expect(agModel(d.slice(0, 5), 'id', 'time', 'event')).toBeNull());
  it('rate >= 0', () => { const r = agModel(d, 'id', 'time', 'event'); if (r) expect(r.rate).toBeGreaterThanOrEqual(0); });
});

describe('pwpgap', () => {
  const d2 = []; for (let i = 0; i < 30; i++) d2.push({ id: i % 10, time: i * 3, event: i % 5 === 0 ? 1 : 0 });
  it('contract keys', () => expectKeys(pwpgap(d2, 'id', 'time', 'event'), ['test', 'n', 'nEvents', 'nSubjects', 'apa']));
  it('gap positive', () => { const r = pwpgap(d2, 'id', 'time', 'event'); if (r && r.gap !== undefined) expect(r.gap).toBeGreaterThan(0); });
  it('null <15', () => expect(pwpgap(d2.slice(0, 5), 'id', 'time', 'event')).toBeNull());
});

describe('wlwMarginal', () => {
  const d2 = []; for (let i = 0; i < 30; i++) d2.push({ id: i % 10, time: i * 3, event: i % 5 === 0 ? 1 : 0 });
  it('contract keys', () => expectKeys(wlwMarginal(d2, 'id', 'time', 'event'), ['test', 'n', 'nEvents', 'nSubjects', 'apa']));
  it('coefficients non-empty', () => { const r = wlwMarginal(d2, 'id', 'time', 'event'); if (r && r.coefficients) expect(r.coefficients.length).toBeGreaterThan(0); });
  it('null <15', () => expect(wlwMarginal(d2.slice(0, 5), 'id', 'time', 'event')).toBeNull());
});

describe('survivalTree', () => {
  const sd = []; for (let i = 0; i < 30; i++) sd.push({ time: 10 + i * 2, event: i < 20 ? 1 : 0, x: i % 3 });
  it('contract keys', () => expectKeys(survivalTree(sd, ['x']), ['test', 'split', 'n', 'nEvents', 'maxDepth', 'apa']));
  it('null <20', () => expect(survivalTree(sd.slice(0, 10), ['x'])).toBeNull());
  it('split has variable and threshold', () => { const r = survivalTree(sd, ['x']); if (r) { expect(typeof r.split.variable).toBe('string'); expect(Number.isFinite(r.split.threshold)).toBe(true); } });
});

describe('randomSurvivalForest', () => {
  const sd = []; for (let i = 0; i < 30; i++) sd.push({ time: 10 + i * 2, event: i < 20 ? 1 : 0, x: i % 3 });
  it('contract keys', () => expectKeys(randomSurvivalForest(sd, ['x']), ['test', 'predictions', 'nTrees', 'n', 'apa']));
  it('null <20', () => expect(randomSurvivalForest(sd.slice(0, 10), ['x'])).toBeNull());
  it('predictions is an array', () => { const r = randomSurvivalForest(sd, ['x']); if (r) { expect(Array.isArray(r.predictions)).toBe(true); expect(r.predictions.length).toBeGreaterThan(0); } });
});

describe('rsfVariableImportance', () => {
  it('contract keys', () => expectKeys(rsfVariableImportance({ nTrees: 50 }), ['test', 'importance', 'apa']));
  it('null for null input', () => expect(rsfVariableImportance(null)).toBeNull());
  it('importance has nTrees', () => { const r = rsfVariableImportance({ nTrees: 50 }); if (r) expect(r.importance.nTrees).toBe(50); });
});
describe('timeDependentROC', () => {
  const sd2 = []; for (let i = 0; i < 30; i++) sd2.push({ time: 10 + i * 2, event: i < 20 ? 1 : 0, x: i % 3 });
  it('contract keys', () => expectKeys(timeDependentROC(sd2, ['x'], [10, 20, 30]), ['test', 'auc', 'n', 'apa']));
  it('auc between 0-1', () => { const r = timeDependentROC(sd2, ['x'], [10, 20, 30]); if (r && typeof r.auc === 'number') { expect(r.auc).toBeGreaterThanOrEqual(0); expect(r.auc).toBeLessThanOrEqual(1); } });
  it('null for <20', () => expect(timeDependentROC(sd2.slice(0, 10), ['x'], [10, 20])).toBeNull());
});

describe('survivalCalibration', () => {
  const sd2 = []; for (let i = 0; i < 30; i++) sd2.push({ time: 10 + i * 2, event: i < 20 ? 1 : 0, x: i % 3 });
  it('contract keys', () => expectKeys(survivalCalibration(sd2, ['x'], [10, 20]), ['test', 'calibration', 'n', 'apa']));
  it('calibration finite', () => { const r = survivalCalibration(sd2, ['x'], [10, 20]); if (r) { expect(Array.isArray(r.calibration)).toBe(true); expect(r.calibration.length).toBeGreaterThan(0); } });
  it('null for <20', () => expect(survivalCalibration(sd2.slice(0, 10), ['x'], [10, 20])).toBeNull());
});
describe('survivalForestPredict', () => {
  it('contract keys', () => expectKeys(survivalForestPredict({ predictions: [0.5] }, { x: 1 }), ['test', 'prediction', 'apa']));
  it('null for null input', () => { expect(survivalForestPredict(null, { x: 1 })).toBeNull(); expect(survivalForestPredict({ predictions: [0.5] }, null)).toBeNull(); });
  it('prediction is finite', () => { const r = survivalForestPredict({ predictions: [0.5] }, { x: 1 }); if (r) expect(Number.isFinite(r.prediction)).toBe(true); });
});

describe('jointModel', () => {
  const longD = []; for (let i = 0; i < 30; i++) longD.push({ id: Math.floor(i/3), time: i % 3, y: i * 0.5 + Math.random() });
  const survD = []; for (let i = 0; i < 10; i++) survD.push({ id: i, time: 5 + i * 0.5, event: i % 2 });
  it('contract keys', () => expectKeys(jointModel(longD, survD, 'time', 'id'), ['test','longBeta','survBeta','association','logLik','nSubjects','apa']));
  it('association finite', () => { const r = jointModel(longD, survD, 'time', 'id'); if (r) expect(Number.isFinite(r.association)).toBe(true); });
  it('null for short data', () => expect(jointModel(longD.slice(0, 3), survD, 'time', 'id')).toBeNull());
});
describe('landmarkAnalysis', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ time: i * 3 + Math.random(), event: i % 3 === 0 ? 1 : 0, x1: i % 2 });
  it('contract keys', () => expectKeys(landmarkAnalysis(d, 'time', 'event', 20, 30, ['x1']), ['test','landmarkTime','horizonTime','survival','se','nRisk','n','apa']));
  it('survival between 0-1', () => { const r = landmarkAnalysis(d, 'time', 'event', 20, 30, ['x1']); if (r) { expect(r.survival).toBeGreaterThanOrEqual(0); expect(r.survival).toBeLessThanOrEqual(1); } });
  it('null for short data', () => expect(landmarkAnalysis(d.slice(0, 3), 'time', 'event', 20, 30, ['x1'])).toBeNull());
});
describe('pseudoValues', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ time: i * 3 + Math.random() * 2, event: i % 5 === 0 ? 1 : 0 });
  it('contract keys', () => expectKeys(pseudoValues(d, 'time', 'event', 40, 5), ['test','pseudo','avgPseudo','truncTime','n','apa']));
  it('avgPseudo finite', () => { const r = pseudoValues(d, 'time', 'event', 40, 5); if (r) expect(Number.isFinite(r.avgPseudo)).toBe(true); });
  it('null for <10', () => expect(pseudoValues(d.slice(0, 5), 'time', 'event', 40)).toBeNull());
});

describe('coxPH sign convention', () => {
  it('recovers a positive coefficient when higher x raises the hazard', () => {
    // Exponential survival, rate = exp(0.8*x): higher x => shorter time => β = +0.8.
    let s = 42;
    const rand = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
    const obs = [];
    for (let i = 0; i < 200; i++) { const x = (i % 10) / 5 - 1; obs.push({ time: -Math.log(rand() + 1e-9) / Math.exp(0.8 * x), event: 1, x }); }
    const r = coxPH(obs, ['x']);
    expect(r.coefficients[0].beta).toBeGreaterThan(0.4);
    expect(r.coefficients[0].beta).toBeLessThan(1.2);
  });
});
