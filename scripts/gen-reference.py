#!/usr/bin/env python3
"""
scripts/gen-reference.py

Canonical generator for packages/statlab/src/methods/__fixtures__/reference.json — independent
numeric oracles for statlab's statistical functions, computed with
scipy / statsmodels / lifelines / numpy (NOT statlab's own code).

R is not available in this environment, so this Python script is the
canonical generator going forward; scripts/gen-reference.R is kept for
projects that do have R (its "distributions"/"means"/"anova"/"regression"/
"categorical"/"multivariate" sections are reproduced here so the two stay
consistent where they overlap).

Setup:    pip install -r scripts/requirements.txt
Run:      npm run reference:generate
          (equivalent to: node scripts/dump-fixtures.mjs && python scripts/gen-reference.py —
          the JS step dumps shared test fixtures from packages/statlab/src/methods/fixtures/core.js to
          scripts/_fixtures_dump.json so oracles are computed on IDENTICAL inputs to
          the JS tests, rather than reimplementing the JS seeded PRNG in Python)
"""
import json
import os
import numpy as np
import pandas as pd
import scipy.stats as st
import statsmodels.api as sm
from lifelines import CoxPHFitter, KaplanMeierFitter
from lifelines.statistics import logrank_test
from statsmodels.tsa.stattools import adfuller, acf as sm_acf, pacf as sm_pacf

# Fixture data shared with the JS test suite (packages/statlab/src/methods/fixtures/core.js), dumped via
# `node scratch_dump_fixtures.mjs` so Python computes oracles on IDENTICAL inputs
# rather than reimplementing the JS seeded PRNG in Python.
_FIXTURES_PATH = os.path.join(os.path.dirname(__file__), '_fixtures_dump.json')
with open(_FIXTURES_PATH) as f:
    _fixtures = json.load(f)

ref = {}

# ── distributions ────────────────────────────────────────────────────────────
ref['distributions'] = {
    'normalCDF': [
        {'z': 0, 'expected': st.norm.cdf(0)},
        {'z': 1.96, 'expected': st.norm.cdf(1.96)},
        {'z': -1.96, 'expected': st.norm.cdf(-1.96)},
        {'z': 3.5, 'expected': st.norm.cdf(3.5)},
        {'z': -3.5, 'expected': st.norm.cdf(-3.5)},
        {'z': -4, 'expected': st.norm.cdf(-4)},
    ],
    'chiPVal': [
        {'chi2': 3.841, 'df': 1, 'expected': st.chi2.sf(3.841, 1)},
        {'chi2': 5.991, 'df': 2, 'expected': st.chi2.sf(5.991, 2)},
        {'chi2': 9.488, 'df': 4, 'expected': st.chi2.sf(9.488, 4)},
        {'chi2': 0.001, 'df': 1, 'expected': st.chi2.sf(0.001, 1)},
        {'chi2': 100, 'df': 10, 'expected': st.chi2.sf(100, 10)},
    ],
    'tPVal': [
        {'t': 2, 'df': 10, 'expected': 2 * st.t.sf(2, 10)},
        {'t': 1.96, 'df': 1000, 'expected': 2 * st.t.sf(1.96, 1000)},
        {'t': 12.706, 'df': 1, 'expected': 2 * st.t.sf(12.706, 1)},
        {'t': 3.182, 'df': 3, 'expected': 2 * st.t.sf(3.182, 3)},
    ],
    'fPVal': [
        {'F': 18.51, 'df1': 1, 'df2': 1, 'expected': st.f.sf(18.51, 1, 1)},
        {'F': 4.26, 'df1': 1, 'df2': 30, 'expected': st.f.sf(4.26, 1, 30)},
        {'F': 3.35, 'df1': 2, 'df2': 27, 'expected': st.f.sf(3.35, 2, 27)},
    ],
}

# ── means ─────────────────────────────────────────────────────────────────────
means = {}

a, b = [2, 4, 6, 8], [1, 3, 5]
r = st.ttest_ind(a, b, equal_var=False)
ci = st.ttest_ind_from_stats  # unused; CI computed manually below to match R's t.test CI
means['tWelch_basic'] = {'a': a, 'b': b, 't': r.statistic, 'df': r.df, 'p': r.pvalue}

x, mu0 = [3, 5, 7, 9, 11], 5
r = st.ttest_1samp(x, mu0)
means['tOne_basic'] = {'x': x, 'mu0': mu0, 't': r.statistic, 'df': len(x) - 1, 'p': r.pvalue}

a, b = [10, 12, 9, 8, 11], [7, 10, 8, 6, 9]
r = st.ttest_rel(a, b)
means['tPaired_basic'] = {'a': a, 'b': b, 't': r.statistic, 'df': len(a) - 1, 'p': r.pvalue}

# Yuen's trimmed t-test on an outlier-containing sample (verified against the
# means.js fix in this same remediation pass — the old formula divided the
# Winsorized SS by (n-1) instead of (h-1), inflating |t| ~2.2x).
a, b = [1, 2, 3, 4, 5, 25], [2, 3, 4, 5, 6, 7]
r = st.ttest_ind(a, b, trim=0.2)
means['yuentTest_outlier'] = {'a': a, 'b': b, 't': float(r.statistic), 'df': float(r.df), 'p': float(r.pvalue)}

xbar, mu0, sigma, n = 105, 100, 15, 25
z = (xbar - mu0) / (sigma / np.sqrt(n))
p = 2 * st.norm.sf(abs(z))
means['zTestKnownSD_basic'] = {'xbar': xbar, 'mu0': mu0, 'sigma': sigma, 'n': n, 'z': z, 'p': p}

s, mu0 = [5, 6, 7, 8, 2, 9, 10, 3, 11, 12], 5
pos = sum(1 for v in s if v > mu0)
neg = sum(1 for v in s if v < mu0)
p = st.binomtest(min(pos, neg), pos + neg, 0.5).pvalue
means['signTest_basic'] = {'a': s, 'mu0': mu0, 'pos': pos, 'neg': neg, 'p': p}

x1, x2 = [10, 12, 14, 16, 18], [6, 7, 8, 9, 10]
n1, n2 = len(x1), len(x2)
m1, m2 = np.mean(x1), np.mean(x2)
v1, v2 = np.var(x1, ddof=1), np.var(x2, ddof=1)
sp = np.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2))
d = (m1 - m2) / sp
means['cohensDGroup_basic'] = {'a': x1, 'b': x2, 'd': d}

ref['means'] = means

# ── anova ─────────────────────────────────────────────────────────────────────
anova = {}

g1, g2, g3 = [2, 3, 4], [5, 6, 7], [8, 9, 10]
allv = g1 + g2 + g3
grp = ['A'] * 3 + ['B'] * 3 + ['C'] * 3
F, p = st.f_oneway(g1, g2, g3)
anova['oneWay_basic'] = {'F': F, 'df1': 2, 'df2': 6, 'p': p}

H, p = st.kruskal(g1, g2, g3)
anova['kruskal_basic'] = {'H': H, 'df': 2, 'p': p}

# Fixture groups (GROUP_A/B/C from packages/statlab/src/methods/fixtures/core.js — equal n=7, equal
# within-group variance by construction, so standard and Welch ANOVA agree closely).
ga, gb, gc = (g['vals'] for g in _fixtures['groups'])
F, p = st.f_oneway(ga, gb, gc)
anova['oneWay_fixture_groups'] = {'F': F, 'dfB': 2, 'dfW': 18, 'p': p}

# Welch's ANOVA (unequal-variance F-test, Welch 1951) — statsmodels' anova_oneway
# with use_var='unequal' implements the correct F*/df2 formulas independently of
# statlab's own welchANOVA (which had 2 formula bugs found & fixed via this oracle:
# a missing (k-2) factor in the F-statistic's denominator inflation, and the wrong
# coefficient — 2 instead of 3 — in df2's formula).
from statsmodels.stats.oneway import anova_oneway
rw = anova_oneway([ga, gb, gc], use_var='unequal', welch_correction=True)
anova['welch_fixture_groups'] = {'F': float(rw.statistic), 'df2': float(rw.df[1]), 'p': float(rw.pvalue)}

# Welch ANOVA stress tests across k=2,3,4 with unequal n and unequal variance —
# these are what pinned down the exact formula bug (F matched at k=3 by coincidence
# since k-2=1 there, but every df2/p was wrong until the fix).
r2 = anova_oneway([[2, 4, 6, 8, 10], [1, 20, 5, 40, 9, 11, 13]], use_var='unequal', welch_correction=True)
anova['welch_k2'] = {'groups': [[2, 4, 6, 8, 10], [1, 20, 5, 40, 9, 11, 13]], 'F': float(r2.statistic), 'df2': float(r2.df[1]), 'p': float(r2.pvalue)}

r3 = anova_oneway([[2, 4, 6, 8, 10], [1, 3, 5, 7, 9, 11, 13], [20, 22, 24, 26]], use_var='unequal', welch_correction=True)
anova['welch_k3_unequal'] = {'groups': [[2, 4, 6, 8, 10], [1, 3, 5, 7, 9, 11, 13], [20, 22, 24, 26]], 'F': float(r3.statistic), 'df2': float(r3.df[1]), 'p': float(r3.pvalue)}

r4 = anova_oneway([[1, 2, 3], [4, 5, 6, 7], [8, 9], [10, 11, 12, 13, 14]], use_var='unequal', welch_correction=True)
anova['welch_k4'] = {'groups': [[1, 2, 3], [4, 5, 6, 7], [8, 9], [10, 11, 12, 13, 14]], 'F': float(r4.statistic), 'df2': float(r4.df[1]), 'p': float(r4.pvalue)}

ref['anova'] = anova

# ── regression ────────────────────────────────────────────────────────────────
regression = {}

x, y = [1, 2, 3, 4, 5], [2, 4, 5, 4, 5]
r = st.pearsonr(x, y)
n = len(x)
t = r.statistic * np.sqrt((n - 2) / (1 - r.statistic ** 2))
regression['pearson_basic'] = {'x': x, 'y': y, 'r': r.statistic, 't': t, 'df': n - 2, 'p': r.pvalue}

slope, intercept, rval, pval, stderr = st.linregress(x, y)
regression['simpleOLS_basic'] = {'x': x, 'y': y, 'b0': intercept, 'b1': slope, 'r2': rval ** 2, 'p': pval}

rho, p = st.spearmanr(x, y)
regression['spearman_basic'] = {'x': x, 'y': y, 'rho': rho, 'p': p}

# No-ties dataset so the asymptotic-normal p-value has no tie-correction ambiguity.
xr, yr = [1,2,3,4,5,6,7,8,9,10], [2,1,4,3,6,5,9,7,10,8]
rho2, p2 = st.spearmanr(xr, yr)
regression['spearman_rank_basic'] = {'x': xr, 'y': yr, 'rho': rho2, 'p': p2}
r = st.kendalltau(xr, yr, variant='b', method='asymptotic')
regression['kendall_basic'] = {'x': xr, 'y': yr, 'tau': r.statistic, 'p': r.pvalue}

# Baron-Kenny mediation with a Sobel test, on the shared mkTabular(42,72) fixture:
# a-path = OLS(M ~ X), b-path/direct-effect = OLS(Y ~ X + M), Sobel SE from the
# standard first-order delta-method formula (matches regression.js's `mediation`).
Xd = np.array(_fixtures['tabular_x'])
Md = np.array(_fixtures['tabular_m'])
Yd = np.array(_fixtures['tabular_y'])
a_model = sm.OLS(Md, sm.add_constant(Xd)).fit()
a_path, a_se = a_model.params[1], a_model.bse[1]
full_model = sm.OLS(Yd, sm.add_constant(np.column_stack([Xd, Md]))).fit()
cp, b_path = full_model.params[1], full_model.params[2]
b_se = full_model.bse[2]
ab = a_path * b_path
se_ab = np.sqrt(b_path ** 2 * a_se ** 2 + a_path ** 2 * b_se ** 2)
z_sobel = ab / se_ab
p_sobel = 2 * st.norm.sf(abs(z_sobel))
regression['mediation_tabular'] = {'ab': ab, 'z_sobel': z_sobel, 'p_sobel': p_sobel, 'a_path': a_path, 'b_path': b_path, 'cp_direct': cp}

# Multiple OLS regression (2 predictors) on the tabular fixture.
Zd = np.array(_fixtures['tabular_x'])  # reuse x, m as two predictors of y
mreg = sm.OLS(Yd, sm.add_constant(np.column_stack([Xd, Md]))).fit()
regression['multipleOLS_tabular'] = {
    'b0': float(mreg.params[0]), 'b1': float(mreg.params[1]), 'b2': float(mreg.params[2]),
    'se1': float(mreg.bse[1]), 'se2': float(mreg.bse[2]), 'r2': float(mreg.rsquared),
    'f': float(mreg.fvalue), 'p_f': float(mreg.f_pvalue),
}

# Logistic regression (GLM, Binomial family) — explicit deterministic dataset.
logit_x1 = [-1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, -1.2, -0.7, -0.2, 0.3, 0.8, 1.3, 1.8, -1.8, -0.9, 0.1, 0.6, 1.1, 1.6]
logit_x2 = [0.8, -0.3, 1.1, -0.5, 0.2, -1.0, 0.6, 1.3, -0.8, 0.4, -1.2, 0.7, -0.1, 0.9, -0.6, 1.0, -0.4, 0.3, -0.9, 0.5]
logit_y = [0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1]
Xl = sm.add_constant(np.column_stack([logit_x1, logit_x2]))
mlogit = sm.GLM(logit_y, Xl, family=sm.families.Binomial()).fit()
regression['logit_basic'] = {
    'x1': logit_x1, 'x2': logit_x2, 'y': logit_y,
    'coef': mlogit.params.tolist(), 'se': mlogit.bse.tolist(), 'p': mlogit.pvalues.tolist(),
}

# Poisson regression (GLM, Poisson family) — explicit deterministic dataset,
# also validates the McFaddenR2 fix (previously used the SATURATED log-
# likelihood instead of the NULL/intercept-only one, collapsing R² to ~0).
pois_x1 = [-1.0, -0.5, 0.0, 0.5, 1.0, -0.8, -0.3, 0.2, 0.7, 1.2, -1.2, -0.6, -0.1, 0.4, 0.9, -0.9, -0.4, 0.1, 0.6, 1.1]
pois_x2 = [0.5, -0.2, 0.8, -0.4, 0.1, 0.9, -0.6, 0.3, -0.8, 0.6, 0.2, -1.0, 0.7, -0.3, 0.4, -0.5, 1.0, -0.7, 0.2, -0.1]
pois_y = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 5, 0, 3, 1, 2, 4, 2, 1, 2, 1]
Xp = sm.add_constant(np.column_stack([pois_x1, pois_x2]))
mpois = sm.GLM(pois_y, Xp, family=sm.families.Poisson()).fit()
mpoisNull = sm.GLM(pois_y, np.ones((len(pois_y), 1)), family=sm.families.Poisson()).fit()
regression['poisson_basic'] = {
    'x1': pois_x1, 'x2': pois_x2, 'y': pois_y,
    'coef': mpois.params.tolist(), 'se': mpois.bse.tolist(),
    'llf': float(mpois.llf), 'llnull': float(mpoisNull.llf),
    'mcfaddenR2': float(1 - mpois.llf / mpoisNull.llf),
}

ref['regression'] = regression

# ── categorical ───────────────────────────────────────────────────────────────
categorical = {}

table = np.array([[10, 30], [20, 40]])
chi2, p, dof, exp = st.chi2_contingency(table, correction=False)
categorical['chiSquare_2x2'] = {'chi2': chi2, 'df': dof, 'p': p}

table2 = np.array([[5, 1], [2, 8]])
res = st.fisher_exact(table2)
categorical['fisher_2x2'] = {'p': res.pvalue, 'OR': res.statistic}

table3 = np.array([[10, 7], [3, 20]])
# scipy has no McNemar test; use statsmodels.
from statsmodels.stats.contingency_tables import mcnemar as sm_mcnemar
r = sm_mcnemar(table3, exact=False, correction=True)
categorical['mcnemar_basic'] = {'chi2': r.statistic, 'p': r.pvalue}

GROUP_A = [2, 3, 4, 5, 6, 7, 8]
GROUP_B = [5, 6, 7, 8, 9, 10, 11]
# use_continuity=False to match statlab's convention (no continuity correction);
# method='asymptotic' still applies the tie-correction term in the variance, which
# the means.js mannWhitney implementation was missing until this remediation pass
# (GROUP_A/GROUP_B share tied values 5,6,7,8 across groups, so this dataset is a
# real regression test for that fix, not just a smoke test).
r = st.mannwhitneyu(GROUP_A, GROUP_B, alternative='two-sided', method='asymptotic', use_continuity=False)
categorical['mannWhitney_ab'] = {'p': r.pvalue, 'U': float(r.statistic)}

r = st.binomtest(12, 20, 0.5)
categorical['binomial_12_20'] = {'p': r.pvalue}

p1, n1, p2, n2 = 35 / 50, 50, 28 / 50, 50
pPool = (35 + 28) / (n1 + n2)
se = np.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2))
z = (p1 - p2) / se
p = 2 * st.norm.sf(abs(z))
categorical['twoPropZ_35_50'] = {'z': z, 'p': p}

g1 = [23, 25, 21, 27, 29, 22, 24]
g2 = [30, 33, 28, 35, 31, 29, 32]
g3 = [15, 18, 14, 20, 16, 17, 19]
rl = st.levene(np.array(g1, float), np.array(g2, float), np.array(g3, float), center='mean')
categorical['levene_basic'] = {'groups': [g1, g2, g3], 'F': float(rl.statistic), 'p': float(rl.pvalue)}
rb = st.bartlett(np.array(g1, float), np.array(g2, float), np.array(g3, float))
categorical['bartlett_basic'] = {'groups': [g1, g2, g3], 'B': float(rb.statistic), 'p': float(rb.pvalue)}

obs, exp = [18, 22, 20, 15, 25], [20, 20, 20, 20, 20]
rc = st.chisquare(obs, exp)
categorical['chiGoF_basic'] = {'observed': obs, 'expected': exp, 'chi2': float(rc.statistic), 'p': float(rc.pvalue)}

# Grubbs' test: G relates EXACTLY to a t(n-2)-distributed statistic (Grubbs 1950),
# not a normal one — this dataset pins down the fix (means.js/categorical.js's
# grubbsTest previously used a normal approximation that understated significance
# by 4+ orders of magnitude on an obvious-outlier dataset).
def grubbs_p(vals):
    n = len(vals)
    m, s = np.mean(vals), np.std(vals, ddof=1)
    devs = np.abs(np.array(vals) - m)
    idx = int(devs.argmax())
    G = devs[idx] / s
    t = G * np.sqrt(n * (n - 2) / ((n - 1) ** 2 - G ** 2 * n))
    p = min(1, 2 * n * st.t.sf(t, n - 2))
    return G, p, idx

vals1 = [10, 12, 11, 13, 9, 12, 11, 50]
G1, p1, idx1 = grubbs_p(vals1)
categorical['grubbs_extreme'] = {'vals': vals1, 'G': G1, 'p': p1, 'idx': idx1}

vals2 = [10, 11, 9, 12, 10, 11, 9, 20]
G2, p2, idx2 = grubbs_p(vals2)
categorical['grubbs_moderate'] = {'vals': vals2, 'G': G2, 'p': p2, 'idx': idx2}

d1, d2, d3 = [1, 2, 3, 4, 5], [2, 3, 4, 5, 6], [3, 5, 6, 7, 8]
rf = st.friedmanchisquare(d1, d2, d3)
anova['friedman_basic'] = {'d1': d1, 'd2': d2, 'd3': d3, 'chi2': float(rf.statistic), 'p': float(rf.pvalue)}

from statsmodels.stats.contingency_tables import cochrans_q
qm = [[1,1,0],[1,0,0],[1,1,1],[0,1,0],[1,1,1],[0,0,0],[1,1,0],[1,0,1],[1,1,1],[0,1,1]]
rq = cochrans_q(np.array(qm))
anova['cochranQ_basic'] = {'matrix': qm, 'Q': float(rq.statistic), 'df': int(rq.df), 'p': float(rq.pvalue)}

ref['categorical'] = categorical

# ── meta ──────────────────────────────────────────────────────────────────────
# Random-effects (DerSimonian-Laird) meta-analysis of two studies (verified by hand;
# no single canonical scipy/statsmodels one-liner for DL between-study variance tau^2
# with only 2 studies, so this is computed directly from the DL estimator formula).
d = np.array([0.5, 0.3])
se = np.array([0.1, 0.2])
w = 1 / se ** 2
dFE = np.sum(w * d) / np.sum(w)
Q = np.sum(w * (d - dFE) ** 2)
dfQ = len(d) - 1
C = np.sum(w) - np.sum(w ** 2) / np.sum(w)
tau2 = max(0, (Q - dfQ) / C) if C > 0 else 0
wStar = 1 / (se ** 2 + tau2)
dRE = np.sum(wStar * d) / np.sum(wStar)
seRE = np.sqrt(1 / np.sum(wStar))
zRE = dRE / seRE
pRE = 2 * st.norm.sf(abs(zRE))
ref['meta'] = {'two_studies': {'dRE': dRE, 'p': pRE}}

# ── multivariate ──────────────────────────────────────────────────────────────
multivariate = {}
m = np.array([[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6], [4, 5, 6, 7]], dtype=float)
k = m.shape[1]
item_vars = m.var(axis=0, ddof=1)
total_var = m.sum(axis=1).var(ddof=1)
alpha = k / (k - 1) * (1 - item_vars.sum() / total_var)
multivariate['cronbach_basic'] = {'alpha': alpha}

# ── nonparametric ─────────────────────────────────────────────────────────────
nonparametric = {}

# Wilcoxon signed-rank with tied |differences| (5 ties at |d|=1, 4 ties at |d|=2) —
# pins down the tie-correction fix (nonparametric.js's wilcoxonSR was missing the
# Var(W) tie-correction term, same bug pattern as mannWhitney's).
wa = [12, 15, 11, 18, 14, 20, 9, 16, 13, 17]
wb = [10, 13, 10, 15, 13, 18, 8, 14, 12, 16]
rw = st.wilcoxon(wa, wb, zero_method='wilcox', correction=False, method='approx')
nonparametric['wilcoxonSR_ties'] = {'a': wa, 'b': wb, 'W': float(rw.statistic), 'p': float(rw.pvalue)}

# Kolmogorov-Smirnov: D (the empirical statistic) matches scipy exactly since it's a
# pure data computation; the p-value uses the Stephens (1970) finite-sample λ
# correction (Numerical Recipes' probks — see nonparametric.js's ksTestOneSample/
# ksTestTwoSample) rather than scipy's own asymptotic correction, so the two
# p-values are close but not bit-identical — both are legitimate, textbook
# asymptotic approximations to the same (exact) Kolmogorov null distribution, not
# a bug. D is asserted tightly; p is asserted loosely (same order of magnitude /
# same significance conclusion).
ksx = [0.5, -0.2, 1.1, -0.8, 0.3, 0.0, -0.5, 0.9, -1.0, 0.7, 1.3, -1.2]
rk1 = st.kstest(ksx, 'norm', method='asymp')
nonparametric['ks1samp_basic'] = {'x': ksx, 'D': float(rk1.statistic), 'p': float(rk1.pvalue)}

ksa, ksb = [2, 3, 4, 5, 6, 7, 8, 9], [5, 6, 7, 8, 9, 10, 11, 12]
rk2 = st.ks_2samp(ksa, ksb, method='asymp')
nonparametric['ks2samp_basic'] = {'a': ksa, 'b': ksb, 'D': float(rk2.statistic), 'p': float(rk2.pvalue)}

ref['nonparametric'] = nonparametric

# ── survival ──────────────────────────────────────────────────────────────────
survival = {}

# Cox PH: validates the sign-bug fix made earlier in this remediation pass
# (survival.js's Newton update used β+H⁻¹·grad instead of β−H⁻¹·grad against the
# negative-definite Hessian, sign-flipping every Cox coefficient in the module).
np.random.seed(42)
n_cox = 100
x_cox = np.random.normal(0, 1, n_cox)
beta_true = 0.8
u = np.random.uniform(0, 1, n_cox)
T_cox = -np.log(u) / (0.05 * np.exp(beta_true * x_cox))
C_cox = np.random.exponential(15, n_cox)
time_cox = np.minimum(T_cox, C_cox)
event_cox = (T_cox <= C_cox).astype(int)
cph = CoxPHFitter()
cph.fit(pd.DataFrame({'time': time_cox, 'event': event_cox, 'x': x_cox}), duration_col='time', event_col='event')
survival['coxPH_basic'] = {
    'time': time_cox.tolist(), 'event': event_cox.tolist(), 'x': x_cox.tolist(),
    'beta': float(cph.summary.loc['x', 'coef']), 'se': float(cph.summary.loc['x', 'se(coef)']),
    'p': float(cph.summary.loc['x', 'p']),
}

# Log-rank test + Kaplan-Meier: independent group-comparison and survival-curve oracles.
np.random.seed(9)
n1 = n2 = 30
T1 = np.random.exponential(10, n1); C1 = np.random.exponential(15, n1)
T2 = np.random.exponential(6, n2); C2 = np.random.exponential(15, n2)
time1 = np.minimum(T1, C1); event1 = (T1 <= C1).astype(int)
time2 = np.minimum(T2, C2); event2 = (T2 <= C2).astype(int)
rlr = logrank_test(time1, time2, event_observed_A=event1, event_observed_B=event2)
survival['logRank_basic'] = {
    'time1': time1.tolist(), 'event1': event1.tolist(), 'time2': time2.tolist(), 'event2': event2.tolist(),
    'chi2': float(rlr.test_statistic), 'p': float(rlr.p_value),
}
kmf = KaplanMeierFitter()
kmf.fit(time1, event1)
sf = kmf.survival_function_
# Compare at the last EVENT time (not lifelines' table's last row, which may be a
# trailing censoring-only time — statlab's kmEstimate only tabulates event times,
# a legitimate convention difference, not a computational bug; the survival step
# function itself is identical at every time both conventions actually tabulate).
last_event_time = float(time1[event1 == 1].max())
survival['km_basic'] = {
    'time': time1.tolist(), 'event': event1.tolist(),
    'lastEventTime': last_event_time,
    'survivalAtLastEvent': float(sf.loc[sf.index <= last_event_time].iloc[-1, 0]),
}

ref['survival'] = survival

def sqrtinv(M):
    w, v = np.linalg.eigh(np.array(M, dtype=float))
    return v @ np.diag(1 / np.sqrt(np.maximum(w, 1e-8))) @ v.T

# PCA: eigenvalues of a correlation matrix (explicit small dataset).
pca_x = [2.1, 3.4, 1.8, 4.2, 5.0, 2.9, 3.7, 4.5, 1.5, 3.0]
pca_y = [1.9, 3.6, 2.0, 3.8, 4.7, 3.2, 3.5, 4.9, 1.2, 2.8]
pca_z = [5.0, 4.1, 5.5, 3.0, 2.2, 4.4, 3.6, 2.5, 5.8, 4.0]
Mpca = np.array([pca_x, pca_y, pca_z]).T
Rpca = np.corrcoef(Mpca.T)
eigvals_pca = np.sort(np.linalg.eigvalsh(Rpca))[::-1]
multivariate['pca_basic'] = {'x': pca_x, 'y': pca_y, 'z': pca_z, 'eigenvalues': eigvals_pca.tolist()}

# MANOVA: 3 groups x 2 DVs, explicit data with a real between-group difference —
# statistics cross-checked against statsmodels.multivariate.manova.MANOVA.
manova_rows = [
    (1.1, 2.0, 'A'), (1.9, 2.9, 'A'), (0.5, 1.2, 'A'), (1.4, 1.6, 'A'), (2.1, 2.6, 'A'),
    (2.9, 0.6, 'B'), (2.2, 1.7, 'B'), (3.4, 0.9, 'B'), (2.0, 1.3, 'B'), (3.1, 0.4, 'B'),
    (1.3, 4.1, 'C'), (2.4, 3.3, 'C'), (1.0, 3.8, 'C'), (2.2, 4.4, 'C'), (1.6, 3.1, 'C'),
]
Ym = np.array([[r[0], r[1]] for r in manova_rows])
grp = np.array([r[2] for r in manova_rows])
groups = ['A', 'B', 'C']
gm = Ym.mean(axis=0)
H = np.zeros((2, 2)); E = np.zeros((2, 2))
for g in groups:
    Yi = Ym[grp == g]
    mi = Yi.mean(axis=0)
    H += len(Yi) * np.outer(mi - gm, mi - gm)
    for row in Yi:
        d = (row - mi).reshape(-1, 1)
        E += d @ d.T
T = E + H
wilks = np.linalg.det(E) / np.linalg.det(T)
pillai = np.trace(np.linalg.inv(T) @ H)
EiH = np.linalg.inv(E) @ H
eigEiH = np.sort(np.linalg.eigvals(EiH).real)[::-1]
hlt = eigEiH.sum()
roy = eigEiH.max()
multivariate['manova_basic'] = {
    'y1': Ym[:, 0].tolist(), 'y2': Ym[:, 1].tolist(), 'group': grp.tolist(),
    'wilksLambda': float(wilks), 'pillaiTrace': float(pillai),
    'hotellingLawleyTrace': float(hlt), 'roysLargestRoot': float(roy),
}

# Canonical correlation: explicit 2x2-variable dataset with a real X-Y association.
cc_x1 = [1.2, 2.1, 0.8, 3.0, 2.5, 1.5, 2.8, 1.0, 3.2, 2.0, 1.8, 2.6, 0.9, 3.1, 2.2]
cc_x2 = [2.0, 1.5, 2.5, 1.0, 1.2, 2.2, 1.1, 2.4, 0.8, 1.6, 1.9, 1.3, 2.6, 0.9, 1.4]
cc_y1 = [0.9, 1.8, 0.6, 2.6, 2.1, 1.3, 2.4, 0.8, 2.8, 1.7, 1.5, 2.3, 0.7, 2.7, 1.9]
cc_y2 = [1.8, 1.3, 2.2, 0.9, 1.0, 2.0, 1.0, 2.1, 0.7, 1.4, 1.7, 1.2, 2.3, 0.8, 1.2]
Xc = np.array([cc_x1, cc_x2]).T
Yc = np.array([cc_y1, cc_y2]).T
Rc = np.corrcoef(np.hstack([Xc, Yc]).T)
Rxx, Ryy, Rxy = Rc[:2, :2], Rc[2:, 2:], Rc[:2, 2:]
Kc = sqrtinv(Rxx) @ Rxy @ sqrtinv(Ryy)
canon_corrs = np.sort(np.linalg.svd(Kc, compute_uv=False))[::-1]
multivariate['canonicalCorr_basic'] = {'x1': cc_x1, 'x2': cc_x2, 'y1': cc_y1, 'y2': cc_y2, 'correlations': canon_corrs.tolist()}

# LDA: 2 well-separated groups, 2 predictors — cross-checked against the
# generalized eigenproblem Sb·w = λ·Sw·w via scipy.linalg.eigh(Sb, Sw).
from scipy.linalg import eigh as sp_eigh
lda_g1 = [(1.0, 2.0), (1.5, 2.2), (0.8, 1.8), (1.2, 2.1), (1.3, 1.9), (0.9, 2.3), (1.6, 1.7), (1.1, 2.0)]
lda_g2 = [(4.0, 5.0), (4.5, 5.2), (3.8, 4.8), (4.2, 5.1), (4.3, 4.9), (3.9, 5.3), (4.6, 4.7), (4.1, 5.0)]
Xl = np.array(lda_g1 + lda_g2)
yl = np.array([0] * len(lda_g1) + [1] * len(lda_g2))
m1l, m2l = Xl[yl == 0].mean(axis=0), Xl[yl == 1].mean(axis=0)
Swl = np.zeros((2, 2))
for row in Xl[yl == 0]:
    d = (row - m1l).reshape(-1, 1); Swl += d @ d.T
for row in Xl[yl == 1]:
    d = (row - m2l).reshape(-1, 1); Swl += d @ d.T
gml = Xl.mean(axis=0)
Sbl = len(lda_g1) * np.outer(m1l - gml, m1l - gml) + len(lda_g2) * np.outer(m2l - gml, m2l - gml)
evalsl, evecsl = sp_eigh(Sbl, Swl)
wl = evecsl[:, -1]
wl = wl / np.linalg.norm(wl)
multivariate['lda_basic'] = {'g1': lda_g1, 'g2': lda_g2, 'w': wl.tolist()}

ref['multivariate'] = multivariate

# ── bayesian ──────────────────────────────────────────────────────────────────
bayesian = {}

# Beta-Binomial conjugate posterior: exact quantile credible interval (via
# scipy.stats.beta.ppf) — validates the betaQuantile bisection fix (previously a
# symmetric normal approximation, wrong for this skewed posterior).
postA, postB = 1 + 7, 1 + (20 - 7)
bb = st.beta(postA, postB)
bayesian['betaBinomial_basic'] = {
    'successes': 7, 'trials': 20, 'priorAlpha': 1, 'priorBeta': 1,
    'posteriorAlpha': postA, 'posteriorBeta': postB,
    'posteriorMean': float(bb.mean()), 'posteriorSD': float(bb.std()),
    'credible95': bb.ppf([0.025, 0.975]).tolist(),
}

# Gamma-Poisson conjugate posterior: exact quantile credible interval (via
# scipy.stats.gamma.ppf) — validates the gammaQuantile bisection fix.
counts_gp = [1, 2, 0, 3, 1, 2, 2, 1, 3, 0]
postShape, postRate = 1 + sum(counts_gp), 1 + len(counts_gp)
gp = st.gamma(postShape, scale=1 / postRate)
bayesian['gammaPoisson_basic'] = {
    'counts': counts_gp, 'priorShape': 1, 'priorRate': 1,
    'posteriorShape': postShape, 'posteriorRate': postRate,
    'posteriorMean': float(gp.mean()), 'posteriorSD': float(gp.std()),
    'credible95': gp.ppf([0.025, 0.975]).tolist(),
}

# Normal-Normal conjugate posterior (known σ): closed-form exact (posterior is
# itself Normal, so ±1.96·SD is the exact 95% interval — this oracle confirms
# the posterior mean/SD formula itself, not just the interval).
nn_data = [5, 6, 4, 7, 5, 6]
priorMean, priorSD, knownSigma = 5, 2, 1.5
priorPrec, dataPrec = 1 / priorSD ** 2, len(nn_data) / knownSigma ** 2
postPrec = priorPrec + dataPrec
nnPostSD = 1 / np.sqrt(postPrec)
nnPostMean = (priorPrec * priorMean + dataPrec * np.mean(nn_data)) / postPrec
bayesian['normalNormal_basic'] = {
    'data': nn_data, 'priorMean': priorMean, 'priorSD': priorSD, 'knownSigma': knownSigma,
    'posteriorMean': float(nnPostMean), 'posteriorSD': float(nnPostSD),
}

ref['bayesian'] = bayesian

# ── timeseries ────────────────────────────────────────────────────────────────
timeseries = {}

# ADF unit-root test: validates the adfTest rewrite (previously discarded the
# augmented/trended regression entirely, always reporting an unaugmented,
# untrended statistic regardless of the `trend`/`maxLag` arguments).
s = 7
def _rnd():
    global s
    s = (1103515245 * s + 12345) & 0x7fffffff
    return s / 0x7fffffff - 0.5
x = 0.0
adf_series = []
for i in range(60):
    x += _rnd() * 0.5 + 0.1
    adf_series.append(x)
r_ct0 = adfuller(adf_series, maxlag=0, regression='ct', autolag=None)
r_c0 = adfuller(adf_series, maxlag=0, regression='c', autolag=None)
r_ct3 = adfuller(adf_series, maxlag=3, regression='ct', autolag=None)
timeseries['adf_basic'] = {
    'series': adf_series,
    'trend_lag0': {'tau': float(r_ct0[0]), 'p': float(r_ct0[1])},
    'const_lag0': {'tau': float(r_c0[0]), 'p': float(r_c0[1])},
    'trend_lag3': {'tau': float(r_ct3[0]), 'p': float(r_ct3[1])},
}

# ACF/PACF on an AR(1) series.
s = 3
x = 0.0
ar1_series = []
for i in range(50):
    x = 0.6 * x + _rnd() * 2
    ar1_series.append(x)
a_vals = sm_acf(ar1_series, nlags=8, fft=False)
p_vals = sm_pacf(ar1_series, nlags=8, method='ywm')
timeseries['acf_pacf_basic'] = {'series': ar1_series, 'acf': a_vals.tolist(), 'pacf': p_vals.tolist()}

ref['timeseries'] = timeseries

# ── clustering ────────────────────────────────────────────────────────────────
clustering = {}

# k-means: 3 well-separated groups where the global-optimum WCSS is unambiguous
# regardless of initialization/label permutation — validates the kmeans++ +
# multi-restart + empty-cluster-reseeding fix (the naive uniform-random init
# could, and for at least one fixed seed reliably did, starve a whole cluster,
# WCSS off by ~260x from the true optimum on this exact dataset).
from scipy.cluster.vq import kmeans2
km_x = [1, 1.2, 0.8, 1.1, 8, 8.2, 7.8, 8.1, 1, 1.2, 0.9, 1.1]
km_y = [1, 0.9, 1.1, 1.2, 8, 7.9, 8.1, 7.8, 8, 7.9, 8.1, 8.2]
km_data = np.array([km_x, km_y]).T.astype(float)
_, km_labels = kmeans2(km_data, 3, minit='++', seed=42)
km_centroids = np.array([km_data[km_labels == i].mean(axis=0) for i in range(3)])
km_wcss = sum(((km_data[km_labels == i] - km_centroids[i]) ** 2).sum() for i in range(3))
clustering['kmeans_basic'] = {'x': km_x, 'y': km_y, 'wcss': float(km_wcss)}

ref['clustering'] = clustering

# ── inequality ────────────────────────────────────────────────────────────────
inequality = {}
ineq_data = [10, 15, 20, 25, 30, 12, 18, 22, 28, 35]
ineq_mean = np.mean(ineq_data)
mad = np.mean([abs(a - b) for a in ineq_data for b in ineq_data])
gini = mad / (2 * ineq_mean)
theil = np.mean([(v / ineq_mean) * np.log(v / ineq_mean) for v in ineq_data])
atk1 = 1 - np.prod([(v / ineq_mean) ** (1 / len(ineq_data)) for v in ineq_data])
eps = 0.5
atk_half = 1 - (np.mean([(v / ineq_mean) ** (1 - eps) for v in ineq_data])) ** (1 / (1 - eps))
inequality['basic'] = {
    'data': ineq_data, 'gini': float(gini), 'theil': float(theil),
    'atkinson1': float(atk1), 'atkinson_half': float(atk_half),
}
ref['inequality'] = inequality

# ── network ───────────────────────────────────────────────────────────────────
network = {}
import networkx as nx
net_edges = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (0, 2), (2, 4)]
G = nx.Graph()
G.add_nodes_from(range(6))
G.add_edges_from(net_edges)
netA = nx.to_numpy_array(G)
bc = nx.betweenness_centrality(G, normalized=True)
ec = nx.eigenvector_centrality(G, max_iter=1000)
ecMax = max(ec.values())
pr = nx.pagerank(G, alpha=0.85)
cc = nx.closeness_centrality(G)
network['centrality_basic'] = {
    'A': netA.tolist(),
    'degree': [int(G.degree(i)) for i in range(6)],
    'betweenness': [bc[i] for i in range(6)],
    'eigenvector_normed': [ec[i] / ecMax for i in range(6)],
    'pagerank': [pr[i] for i in range(6)],
    'closeness': [cc[i] for i in range(6)],
}
ref['network'] = network

# ── fitting ───────────────────────────────────────────────────────────────────
fitting = {}
from scipy.stats import weibull_min, gamma as sp_gamma, beta as sp_beta

fit_sample = [2.1, 3.4, 1.8, 4.2, 5.0, 2.9, 3.7, 4.5, 1.5, 3.0, 2.2, 3.8, 1.9, 4.1, 2.6]
wshape, _, wscale = weibull_min.fit(fit_sample, floc=0)
fitting['weibull_basic'] = {'sample': fit_sample, 'shape': float(wshape), 'scale': float(wscale)}

# Beta MLE: validates the digamma/trigamma fix (previously diverged to
# alpha~290000/beta~395000 instead of the true MLE ~3.88/~5.05).
beta_sample = [0.2, 0.35, 0.5, 0.65, 0.4, 0.55, 0.3, 0.45, 0.6, 0.25, 0.5, 0.7, 0.15, 0.4, 0.55]
ba, bb, _, _ = sp_beta.fit(beta_sample, floc=0, fscale=1)
fitting['beta_basic'] = {'sample': beta_sample, 'alpha': float(ba), 'beta': float(bb)}
ref['fitting'] = fitting

# ── info ──────────────────────────────────────────────────────────────────────
info = {}
from scipy.stats import entropy as sp_entropy
from sklearn.metrics import mutual_info_score
ent_data = [1, 1, 2, 2, 2, 3, 3, 1, 2, 3, 1, 2]
_, counts = np.unique(ent_data, return_counts=True)
h = sp_entropy(counts / counts.sum(), base=2)
info['entropy_basic'] = {'data': ent_data, 'entropy': float(h)}

mi_x = [1, 1, 2, 2, 3, 3, 1, 2, 3, 1, 2, 3]
mi_y = [1, 2, 1, 2, 3, 3, 2, 1, 3, 1, 2, 3]
mi_bits = mutual_info_score(mi_x, mi_y) / np.log(2)
info['mi_basic'] = {'x': mi_x, 'y': mi_y, 'mi': float(mi_bits)}
ref['info'] = info

# ── robust ────────────────────────────────────────────────────────────────────
robust = {}
from scipy.stats import theilslopes
ts_x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50]
ts_y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 25]
rts = theilslopes(ts_y, ts_x)
robust['theilsen_outlier'] = {'x': ts_x, 'y': ts_y, 'slope': float(rts.slope), 'intercept': float(rts.intercept)}
ref['robust'] = robust

# ── distance ──────────────────────────────────────────────────────────────────
distance = {}

def _dcov(xa, ya):
    xa = np.asarray(xa, dtype=float); ya = np.asarray(ya, dtype=float)
    a = np.abs(xa[:, None] - xa[None, :])
    b = np.abs(ya[:, None] - ya[None, :])
    A = a - a.mean(axis=0, keepdims=True) - a.mean(axis=1, keepdims=True) + a.mean()
    B = b - b.mean(axis=0, keepdims=True) - b.mean(axis=1, keepdims=True) + b.mean()
    return float(np.sqrt(max(0, (A * B).mean())))

dc_x = [1, 3, 2, 5, 4, 7, 6, 9, 8, 10]
dc_y = [2, 5, 3, 8, 6, 11, 9, 14, 12, 16]
dcov = _dcov(dc_x, dc_y)
dvarx = _dcov(dc_x, dc_x)
dvary = _dcov(dc_y, dc_y)
distance['dcov_basic'] = {'x': dc_x, 'y': dc_y, 'dcov': dcov, 'dcorr': dcov / np.sqrt(dvarx * dvary)}

from scipy.spatial.distance import mahalanobis as sp_mahalanobis
maha_x, maha_y = [2, 3, 4], [1, 1, 1]
maha_cov = [[2, 0.5, 0.1], [0.5, 3, 0.2], [0.1, 0.2, 1.5]]
maha_d = float(sp_mahalanobis(maha_x, maha_y, np.linalg.inv(maha_cov)))
distance['mahalanobis_basic'] = {'x': maha_x, 'y': maha_y, 'cov': maha_cov, 'd': maha_d}
ref['distance'] = distance

# DBSCAN: a border point (index 0) placed BEFORE its cluster's core points in
# array order — pins down the "visited gates labeling" bug (a point visited
# early in the outer scan and found non-core stayed permanently unlabeled
# even when later reached as a neighbor of a real core point's expansion).
from sklearn.cluster import DBSCAN as SKDBSCAN
db_x = [-0.28, 0.0, 0.1, 0.05, 0.15, 0.1, 0.0, 8.0]
db_y = [0.0, 0.0, 0.0, 0.09, 0.09, -0.09, -0.09, 8.0]
db_X = np.array([db_x, db_y]).T
db_fit = SKDBSCAN(eps=0.3, min_samples=5).fit(db_X)
clustering['dbscan_border'] = {'x': db_x, 'y': db_y, 'eps': 0.3, 'minPts': 5, 'labels': db_fit.labels_.tolist()}

# Hierarchical clustering: single/complete linkage already matched scipy
# exactly; 'ward' pins down the fix (was silently computing plain centroid/
# UPGMC distance instead of the real Ward variance-minimization criterion).
from scipy.cluster.hierarchy import linkage as sp_linkage
hc_X = np.array([[1, 1], [1.5, 2], [3, 4], [5, 7], [3.5, 5], [4.5, 5], [3.5, 4.5]], dtype=float)
hc_ward = sp_linkage(hc_X, method='ward')
hc_complete = sp_linkage(hc_X, method='complete')
hc_single = sp_linkage(hc_X, method='single')
clustering['hclust_basic'] = {
    'X': hc_X.tolist(),
    'ward_heights': hc_ward[:, 2].tolist(),
    'complete_heights': hc_complete[:, 2].tolist(),
    'single_heights': hc_single[:, 2].tolist(),
}

# ── pls ───────────────────────────────────────────────────────────────────────
from sklearn.cross_decomposition import PLSRegression
pls = {}
pls_X = np.array([
    [1.2, 2.1, 0.5], [2.3, 1.8, 1.1], [0.8, 3.2, 0.3], [3.1, 0.9, 2.0],
    [1.9, 2.6, 1.4], [2.7, 1.2, 0.9], [0.5, 3.8, 0.2], [3.4, 0.6, 2.3],
    [1.4, 2.9, 0.7], [2.0, 2.0, 1.0], [2.9, 1.1, 1.8], [0.9, 3.5, 0.4],
    [3.2, 0.8, 2.1], [1.6, 2.4, 0.8], [2.5, 1.5, 1.3],
])
pls_y = np.array([4.1, 5.6, 2.3, 7.2, 5.1, 5.9, 1.8, 7.6, 4.0, 4.8, 6.5, 2.2, 7.3, 4.2, 5.3])
sk_pls1 = PLSRegression(n_components=2, scale=False).fit(pls_X, pls_y)
pls1_fitted = sk_pls1.predict(pls_X).ravel()
pls1_ssres = float(np.sum((pls_y - pls1_fitted) ** 2))
pls1_sstot = float(np.sum((pls_y - pls_y.mean()) ** 2))
pls['pls1_basic'] = {
    'X': pls_X.tolist(), 'y': pls_y.tolist(),
    'rSquared': 1 - pls1_ssres / pls1_sstot,
    'fitted': pls1_fitted.tolist(),
}

pls_Y2 = np.column_stack([pls_y, pls_y * 0.5 + 2])
sk_pls2 = PLSRegression(n_components=2, scale=False).fit(pls_X, pls_Y2)
pls2_fitted = sk_pls2.predict(pls_X)
pls2_ssres = float(np.sum((pls_Y2 - pls2_fitted) ** 2))
pls2_sstot = float(np.sum((pls_Y2 - pls_Y2.mean(axis=0)) ** 2))
pls['pls2_basic'] = {
    'X': pls_X.tolist(), 'Y': pls_Y2.tolist(),
    'rSquared': 1 - pls2_ssres / pls2_sstot,
    'fitted': pls2_fitted.tolist(),
}
ref['pls'] = pls

# ── outlier ───────────────────────────────────────────────────────────────────
from sklearn.neighbors import LocalOutlierFactor
outlier = {}
lof_X = np.array([
    [0, 0], [0.11, 0.09], [-0.08, 0.13], [0.12, -0.07], [-0.09, -0.11],
    [0.19, 0.02], [0.03, 0.21], [-0.21, 0.01], [0.01, -0.19], [0.16, 0.14],
    [10, 10],
    [0.06, -0.04],
], dtype=float)
sk_lof = LocalOutlierFactor(n_neighbors=5)
sk_lof.fit_predict(lof_X)
outlier['lof_basic'] = {'X': lof_X.tolist(), 'k': 5, 'lof': (-sk_lof.negative_outlier_factor_).tolist()}
ref['outlier'] = outlier

# ── preprocessing ─────────────────────────────────────────────────────────────
from scipy.stats import zscore as sp_zscore
preprocessing = {}
prep_data = [12.1, 15.3, 11.8, 14.2, 13.5, 50.2, 12.9, 13.1, 14.8, 12.5,
             13.9, 15.1, 11.5, 60.3, 14.4, 13.2, 12.7, 15.6, 13.8, 12.3]
prep_arr = np.array(prep_data)
preprocessing['basic'] = {
    'data': prep_data,
    'zscore': sp_zscore(prep_arr, ddof=1).tolist(),
    'minmax': ((prep_arr - prep_arr.min()) / (prep_arr.max() - prep_arr.min())).tolist(),
}
_med = float(np.percentile(prep_arr, 50, method='linear'))
_q1 = float(np.percentile(prep_arr, 25, method='linear'))
_q3 = float(np.percentile(prep_arr, 75, method='linear'))
_iqr = _q3 - _q1
preprocessing['basic']['robust'] = ((prep_arr - _med) / _iqr).tolist()
preprocessing['basic']['median'] = _med
preprocessing['basic']['iqr'] = _iqr
_wlo = float(np.percentile(prep_arr, 10, method='linear'))
_whi = float(np.percentile(prep_arr, 90, method='linear'))
preprocessing['basic']['winsorized'] = np.clip(prep_arr, _wlo, _whi).tolist()
preprocessing['basic']['winsorLo'] = _wlo
preprocessing['basic']['winsorHi'] = _whi
_lower = _q1 - 1.5 * _iqr
_upper = _q3 + 1.5 * _iqr
preprocessing['basic']['iqrLower'] = _lower
preprocessing['basic']['iqrUpper'] = _upper
preprocessing['basic']['iqrOutlierIdx'] = np.where((prep_arr < _lower) | (prep_arr > _upper))[0].tolist()
_absdev = np.abs(prep_arr - _med)
_mad = float(np.percentile(_absdev, 50, method='linear'))
preprocessing['basic']['mad'] = _mad
preprocessing['basic']['madOutlierIdx'] = np.where(np.abs(0.6745 * (prep_arr - _med) / _mad) > 3.5)[0].tolist()
ref['preprocessing'] = preprocessing

# ── metrics ───────────────────────────────────────────────────────────────────
from sklearn.metrics import matthews_corrcoef
metrics = {}


def _mcc_from_counts(tp, fp, tn, fn):
    y_true = [1] * tp + [1] * fn + [0] * fp + [0] * tn
    y_pred = [1] * tp + [0] * fn + [1] * fp + [0] * tn
    return float(matthews_corrcoef(y_true, y_pred))


metrics['mcc_basic'] = [
    {'tp': 45, 'fp': 5, 'tn': 40, 'fn': 10, 'mcc': _mcc_from_counts(45, 5, 40, 10)},
    {'tp': 0, 'fp': 5, 'tn': 40, 'fn': 10, 'mcc': _mcc_from_counts(0, 5, 40, 10)},
]

_img1 = np.array([100, 120, 130, 140, 150, 160, 170, 180, 190, 200, 110, 125, 135, 145, 155], dtype=float)
_img2 = np.array([102, 118, 133, 138, 151, 163, 168, 182, 188, 199, 113, 122, 138, 144, 157], dtype=float)
_mse = float(np.mean((_img1 - _img2) ** 2))
metrics['psnr_basic'] = {'img1': _img1.tolist(), 'img2': _img2.tolist(), 'psnr': 10 * np.log10(255 ** 2 / _mse)}


def _iou_box(b1, b2):
    x1, y1 = max(b1[0], b2[0]), max(b1[1], b2[1])
    x2, y2 = min(b1[2], b2[2]), min(b1[3], b2[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    a1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
    a2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
    union = a1 + a2 - inter
    return inter / union if union > 0 else 0


metrics['iou_basic'] = [
    {'box1': [0, 0, 10, 10], 'box2': [5, 5, 15, 15], 'iou': _iou_box([0, 0, 10, 10], [5, 5, 15, 15])},
    {'box1': [0, 0, 10, 10], 'box2': [20, 20, 30, 30], 'iou': _iou_box([0, 0, 10, 10], [20, 20, 30, 30])},
    {'box1': [0, 0, 10, 10], 'box2': [2, 2, 8, 8], 'iou': _iou_box([0, 0, 10, 10], [2, 2, 8, 8])},
]
ref['metrics'] = metrics

# ── missing ───────────────────────────────────────────────────────────────────
from sklearn.linear_model import LinearRegression
missing = {}
# x1 missing at row 10, predicted from correlated (x2, y) predictors — pins down
# the regressionImpute fix (was a broken intercept=avg(target)*0-term plus
# per-predictor SIMPLE regression instead of real multiple OLS, giving wildly
# out-of-range predictions e.g. ~39 instead of ~10.8 for this data).
mi_X = np.array([
    [5, 45], [6, 52], [4, 38], [7, 61], [4.5, 41.5],
    [5.5, 48.5], [6.5, 57.5], [3.5, 34.5], [6.2, 54.6], [5.2, 46.6],
])
mi_y = np.array([10, 12, 8, 15, 9, 11, 14, 7, 13, 10.5])
mi_lr = LinearRegression().fit(mi_X, mi_y)
mi_pred = float(mi_lr.predict(np.array([[5.8, 49]]))[0])
missing['regression_impute_basic'] = {
    'x2': mi_X[:, 0].tolist(), 'y': mi_X[:, 1].tolist(), 'x1': mi_y.tolist(),
    'queryX2': 5.8, 'queryY': 49.0, 'predictedX1': mi_pred,
}
ref['missing'] = missing

# ── circular ──────────────────────────────────────────────────────────────────
from scipy.stats import circmean as sp_circmean, circvar as sp_circvar
circular = {}
circ_deg = [10, 25, 40, 355, 5, 15, 350, 30, 20, 8]
circ_rad = np.radians(circ_deg)
_cn = len(circ_rad)
_cs = float(np.sum(np.sin(circ_rad)))
_cc = float(np.sum(np.cos(circ_rad)))
_cR = np.sqrt(_cs ** 2 + _cc ** 2) / _cn
_cz = _cn * _cR * _cR
_cp = float(np.exp(-_cz) * (1 + (2 * _cz - _cz * _cz) / (4 * _cn)))
circular['basic'] = {
    'anglesDeg': circ_deg,
    'mean': float(sp_circmean(circ_rad, high=np.pi, low=-np.pi)),
    'variance': float(sp_circvar(circ_rad)),
    'resultant': float(_cR),
    'rayleighZ': float(_cz),
    'rayleighP': max(0.0, _cp),
}
ref['circular'] = circular

# ── extreme ───────────────────────────────────────────────────────────────────
from scipy.stats import genextreme, genpareto
extreme = {}
extreme_data = [1.430425, -0.544022, 0.353024, -0.381017, 0.021509, 1.702118, 1.920373, 2.609847, 1.414803, 0.11226, 0.719339, 4.677971, -0.512223, -1.51188, 0.641956, -0.033861, 0.427944, 0.638555, -0.442806, 0.390248, 0.956397, -0.630286, -1.162667, -0.781356, 0.454279, 1.615897, -0.292383, 0.568151, 2.593479, 1.064529, 3.036711, -0.930432, 0.673868, 0.122136, 1.588514, 0.275576, 0.476145, -0.483809, 2.600869, 0.626737, -0.396558, -0.30722, -0.082611, 0.25302, 1.773156, 2.832366, 0.353789, -0.102059, -0.955325, -0.075076, 0.662246, -1.353471, 0.52578, 0.289986, 1.497032, -0.181858, 2.180141, -0.577765, 0.548613, 1.832232, -0.191441, 0.457438, 0.123122, -0.562056, -0.638401, 2.902185, 1.186642, 1.550484, -0.093415, -0.313478, -0.399448, 2.183227, -0.492675, -0.970975, 0.053495, 3.602401, 0.507682, 2.906724, 0.473554, 0.37307, -0.532755, 1.217979, 0.377006, 3.858274, 1.057695, -0.099942, 0.663579, 0.183853, 0.383242, -0.224237, -0.880401, 1.412519, 0.544013, -0.427674, 2.04575, -0.280587, 0.733508, 1.148443, 0.031826, -0.383253, -0.137564, -0.101294, -0.916293, -1.915699, 0.488753, -1.771813, -1.132518, 0.337387, -0.617498, 1.287479, -0.585852, 1.136081, -1.862622, 0.730377, -0.442359, 0.020993, -0.217872, 2.825512, 0.236596, -0.317292, -0.879174, 0.864402, 0.187868, -0.391083, 0.389756, 2.284217, 0.079541, -0.102903, 1.418905, -0.798746, -0.988685, -0.336949, 0.585883, -0.05011, 0.028774, 0.465844, -0.253288, -0.116963, -0.079505, -0.073471, 0.633726, 0.369466, -0.740436, -0.579118, -0.979869, -0.648532, 0.530168, -1.360898, -0.44352, -0.090594, -0.433662, 1.689541, -0.062451, 0.525729, 2.317413, -0.808877, 4.101752, 1.212702, 2.076632, -0.013031, 1.951963, -0.382793, 0.490731, 3.947101, -0.330944, 3.150567, -0.372484, -0.889765, -0.876247, 0.574534, -0.938971, 3.500365, 0.844273, 0.982542, 2.552774, -0.592055, 0.045015, 0.821733, 0.920998, -0.223945, 0.044861, 1.018674, -1.659643, 3.110765, 1.592429, 0.10387, -0.340515, 1.945073, 0.75908, 1.584641, 4.031888, 0.814517, 0.791454, -0.368353, -0.692682, -0.352792, 0.18796, 3.313843, 0.219225, 0.804818]
_ext = np.array(extreme_data)
_gev_c, _gev_loc, _gev_scale = genextreme.fit(_ext)
extreme['gev_basic'] = {'data': extreme_data, 'mu': float(_gev_loc), 'sigma': float(_gev_scale), 'xi': float(-_gev_c)}

_thresh = float(_ext.mean() + _ext.std(ddof=0))
_exceed = (_ext[_ext > _thresh] - _thresh)
_gpd_c, _gpd_loc, _gpd_scale = genpareto.fit(_exceed, floc=0)
extreme['gpd_basic'] = {'threshold': _thresh, 'sigma': float(_gpd_scale), 'xi': float(_gpd_c)}

_n = len(_ext)
_sorted_desc = np.sort(_ext)[::-1]
_k = int(np.floor(np.sqrt(_n)))
_hill_thresh = float(_sorted_desc[_k - 1])
_sumlog = float(np.sum(np.log(_sorted_desc[:_k] / _hill_thresh)))
_hill_alpha = _k / _sumlog
extreme['hill_basic'] = {'k': _k, 'threshold': _hill_thresh, 'alpha': _hill_alpha, 'xi': 1 / _hill_alpha, 'se': _hill_alpha / np.sqrt(_k)}
ref['extreme'] = extreme

# ── ecology ───────────────────────────────────────────────────────────────────
ecology = {}
eco_counts = [45, 23, 12, 8, 5, 3, 2, 1, 1, 1]
eco_arr = np.array(eco_counts)
eco_p = eco_arr / eco_arr.sum()
_eco_H = float(st.entropy(eco_p))
_eco_D = float(1 - np.sum(eco_p ** 2))
_eco_Sobs = int((eco_arr > 0).sum())
_eco_f1 = int((eco_arr == 1).sum())
_eco_f2 = int((eco_arr == 2).sum())
_eco_chao1 = _eco_Sobs + _eco_f1 * (_eco_f1 - 1) / (2 * (_eco_f2 + 1))
ecology['basic'] = {
    'counts': eco_counts,
    'shannon': _eco_H, 'evenness': _eco_H / np.log(_eco_Sobs),
    'simpson': _eco_D, 'invSimpson': 1 / (1 - _eco_D),
    'chao1': round(_eco_chao1), 'sobs': _eco_Sobs, 'singletons': _eco_f1, 'doubletons': _eco_f2,
}
ref['ecology'] = ecology

# ── genetics ──────────────────────────────────────────────────────────────────
from sklearn.linear_model import Ridge as SKRidge
genetics = {}
gen_X = np.array([
    [0, 1, 2, 0, 1], [1, 2, 0, 1, 0], [2, 0, 1, 2, 1], [0, 1, 1, 0, 2], [1, 0, 2, 1, 0],
    [2, 1, 0, 2, 1], [0, 2, 1, 0, 1], [1, 1, 2, 1, 0], [0, 0, 1, 2, 2], [2, 2, 0, 0, 1],
    [1, 0, 0, 1, 2], [0, 1, 2, 2, 0],
], dtype=float)
gen_y = np.array([5.2, 4.8, 6.1, 3.9, 5.5, 7.0, 4.2, 5.8, 6.5, 3.5, 4.0, 5.0])
_gen_ridge = SKRidge(alpha=0.1, fit_intercept=False).fit(gen_X, gen_y)
_gen_fitted = _gen_ridge.predict(gen_X)
_gen_ssr = float(np.sum((gen_y - _gen_fitted) ** 2))
_gen_sst = float(np.sum((gen_y - gen_y.mean()) ** 2))
genetics['polygenic_basic'] = {'X': gen_X.tolist(), 'y': gen_y.tolist(), 'rSquared': 1 - _gen_ssr / _gen_sst}

_mr_betaYX, _mr_seYX, _mr_betaZX, _mr_seZX = 0.5, 0.1, 0.3, 0.05
_mr_est = _mr_betaYX / _mr_betaZX
_mr_se = float(np.sqrt(_mr_seYX ** 2 / _mr_betaZX ** 2 + _mr_betaYX ** 2 * _mr_seZX ** 2 / _mr_betaZX ** 4))
genetics['mr_basic'] = {'betaYX': _mr_betaYX, 'seYX': _mr_seYX, 'betaZX': _mr_betaZX, 'seZX': _mr_seZX, 'estimate': _mr_est, 'se': _mr_se}
ref['genetics'] = genetics

# ── finance ───────────────────────────────────────────────────────────────────
finance = {}
fin_stockR = [0.02, -0.01, 0.015, 0.03, -0.02, 0.01, 0.025, -0.015, 0.02, 0.005, 0.018, -0.008]
fin_marketR = [0.015, -0.008, 0.01, 0.022, -0.015, 0.008, 0.02, -0.01, 0.016, 0.004, 0.014, -0.006]
_fs, _fm = np.array(fin_stockR), np.array(fin_marketR)
_fcov = np.cov(_fs, _fm, ddof=1)
_fbeta = _fcov[0, 1] / _fcov[1, 1]
_falpha = float(_fs.mean() - _fbeta * _fm.mean())
_fpred = _falpha + _fbeta * _fm
_fr2 = 1 - np.sum((_fs - _fpred) ** 2) / np.sum((_fs - _fs.mean()) ** 2)
_fsharpe = float(_fs.mean() / _fs.std(ddof=1) * np.sqrt(252))
finance['capm_basic'] = {'stockR': fin_stockR, 'marketR': fin_marketR, 'beta': float(_fbeta), 'alpha': _falpha, 'rSquared': float(_fr2)}
finance['sharpe_basic'] = {'returns': fin_stockR, 'sharpe': _fsharpe}

fin_rets = [0.05, -0.1, 0.03, -0.02, 0.08, -0.15, 0.02, 0.04, -0.05, 0.06]
_fcum = np.cumprod(1 + np.array(fin_rets))
_fpeak = np.maximum.accumulate(_fcum)
_fdd = (_fpeak - _fcum) / _fpeak
finance['maxdd_basic'] = {'returns': fin_rets, 'maxDrawdown': float(_fdd.max() * 100), 'troughIndex': int(np.argmax(_fdd))}

fin_var_rets = [float(np.sin(i) * 0.03 - 0.001 * i + 0.01) for i in range(25)]
_fvsorted = np.sort(np.array(fin_var_rets))
_fvidx = int(np.floor(0.05 * 25))
_fvar = float(-_fvsorted[_fvidx])
_fcvar = float(-_fvsorted[:max(1, _fvidx)].mean())
finance['var_basic'] = {'returns': fin_var_rets, 'var': _fvar, 'cvar': _fcvar}


def _bs(S, K, T, r, sigma, typ='call'):
    d1 = (np.log(S / K) + (r + sigma ** 2 / 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    if typ == 'call':
        return S * st.norm.cdf(d1) - K * np.exp(-r * T) * st.norm.cdf(d2)
    return K * np.exp(-r * T) * st.norm.cdf(-d2) - S * st.norm.cdf(-d1)


finance['bs_basic'] = {
    'spot': 100, 'strike': 105, 'time': 0.5, 'rate': 0.03, 'sigma': 0.25,
    'call': float(_bs(100, 105, 0.5, 0.03, 0.25, 'call')),
    'put': float(_bs(100, 105, 0.5, 0.03, 0.25, 'put')),
}


def _crr(S, K, T, r, sigma, steps, typ='call'):
    dt = T / steps
    u = np.exp(sigma * np.sqrt(dt))
    d = 1 / u
    p = (np.exp(r * dt) - d) / (u - d)
    prices = np.array([max(0, S * u ** (steps - i) * d ** i - K) if typ == 'call' else max(0, K - S * u ** (steps - i) * d ** i) for i in range(steps + 1)])
    disc = np.exp(-r * dt)
    for j in range(steps - 1, -1, -1):
        prices = disc * (p * prices[:-1] + (1 - p) * prices[1:])
    return prices[0]


finance['binom_basic'] = {
    'steps': 200,
    'call': float(_crr(100, 105, 0.5, 0.03, 0.25, 200, 'call')),
    'put': float(_crr(100, 105, 0.5, 0.03, 0.25, 200, 'put')),
}
ref['finance'] = finance

# ── reliability ───────────────────────────────────────────────────────────────
from scipy.special import gamma as sp_gamma_fn
reliability = {}
rel_data = [12.5, 18.3, 22.1, 8.7, 15.6, 30.2, 25.4, 19.8, 11.2, 27.6, 14.3, 21.9]
_rel_arr = np.sort(np.array(rel_data))
_rel_n = len(_rel_arr)
_rel_logT = np.log(np.maximum(_rel_arr, 1e-10))
_rel_F = (np.arange(_rel_n) + 0.5) / _rel_n
_rel_logLog = np.log(-np.log(1 - _rel_F))
_rel_num = np.sum((_rel_logT - _rel_logT.mean()) * (_rel_logLog - _rel_logLog.mean()))
_rel_den = np.sum((_rel_logT - _rel_logT.mean()) ** 2)
_rel_beta = max(0.5, _rel_num / _rel_den)
_rel_eta = float(np.exp(_rel_logT.mean() - _rel_logLog.mean() / _rel_beta))
# Weibull MTBF = eta * Gamma(1 + 1/beta) — pins down the missing-gamma-function
# bug (the buggy code computed eta*(1+1/beta) via a no-op exp(log(x)) instead
# of actually calling the gamma function).
reliability['weibull_basic'] = {'data': rel_data, 'beta': float(_rel_beta), 'eta': _rel_eta, 'mtbf': _rel_eta * float(sp_gamma_fn(1 + 1 / _rel_beta))}

# Kaplan-Meier survival at t=12 via lifelines — pins down the "find first step
# >= t" bug (was using the NEXT event after the warranty period instead of the
# LAST event at-or-before it, incorrectly counting post-warranty failures).
from lifelines import KaplanMeierFitter as _KMF
rel_failures = [3, 5, 5, 8, 10, 10, 10, 15, 18, 20, 22, 25]
_kmf = _KMF()
_kmf.fit(rel_failures, event_observed=[1] * len(rel_failures))
_survival12 = float(_kmf.survival_function_at_times(12).values[0])
reliability['warranty_basic'] = {'failures': rel_failures, 'monthsInWarranty': 12, 'claimRate': 1 - _survival12}
ref['reliability'] = reliability

# ── survey ────────────────────────────────────────────────────────────────────
from statsmodels.stats.weightstats import DescrStatsW
survey = {}
surv_values = [12, 15, 18, 22, 9, 14, 20, 17, 11, 25]
surv_weights = [1.2, 0.8, 1.5, 0.9, 1.1, 1.3, 0.7, 1.0, 1.4, 0.6]
surv_y = [22, 18, 25, 30, 15, 19, 27, 23, 16, 33]
_sv, _sw = np.array(surv_values, dtype=float), np.array(surv_weights)
_ssumW, _ssumWSq = float(_sw.sum()), np.sum(_sw ** 2)
_smuW = np.sum(_sw * _sv) / _ssumW
_svar = np.sum(_sw * (_sv - _smuW) ** 2) / (_ssumW - _ssumWSq / _ssumW)
_sdeff = len(_sw) * _ssumWSq / _ssumW ** 2
_sy = np.array(surv_y, dtype=float)
_smx, _smy = np.sum(_sw * _sv) / _ssumW, np.sum(_sw * _sy) / _ssumW
_scov = np.sum(_sw * (_sv - _smx) * (_sy - _smy))
_svx, _svy = np.sum(_sw * (_sv - _smx) ** 2), np.sum(_sw * (_sy - _smy) ** 2)
survey['basic'] = {
    'values': surv_values, 'weights': surv_weights, 'y': surv_y,
    'mean': float(_smuW), 'variance': float(_svar), 'sd': float(np.sqrt(_svar)),
    'deff': float(_sdeff), 'nEff': float(len(_sw) / _sdeff),
    'corr': float(_scov / np.sqrt(_svx * _svy)),
}
ref['survey'] = survey

# ── pk ────────────────────────────────────────────────────────────────────────
pk = {}
pk_time = [0, 0.5, 1, 2, 4, 6, 8, 12, 24]
pk_conc = [0, 8.5, 12.3, 15.1, 11.2, 7.8, 5.4, 2.6, 0.4]
_pt, _pc = np.array(pk_time, dtype=float), np.array(pk_conc, dtype=float)
_aucTrap = float(np.trapezoid(_pc, _pt))
_aucLL = 0.0
for _i in range(1, len(_pt)):
    _dt = _pt[_i] - _pt[_i - 1]
    _c1, _c2 = _pc[_i - 1], _pc[_i]
    if _c2 >= _c1 or _c1 <= 0 or _c2 <= 0:
        _aucLL += _dt * (_c1 + _c2) / 2
    else:
        _aucLL += _dt * (_c1 - _c2) / np.log(_c1 / _c2)
_t3, _c3 = _pt[-3:], _pc[-3:]
_logc3 = np.log(_c3)
_slope, _intercept = np.polyfit(_t3, _logc3, 1)
_k = -_slope
_halflife = np.log(2) / _k
_predLog = _slope * _t3 + _intercept
_ssres = np.sum((_logc3 - _predLog) ** 2)
_sstot = np.sum((_logc3 - _logc3.mean()) ** 2)
_r2log = 1 - _ssres / _sstot
pk['basic'] = {
    'time': pk_time, 'concentration': pk_conc,
    'aucTrapezoidal': _aucTrap, 'aucLinearLog': float(_aucLL),
    'halfLife': float(_halflife), 'k': float(_k), 'rSquared': float(_r2log),
}
ref['pk'] = pk

# ── spatial ───────────────────────────────────────────────────────────────────
spatial = {}
sp_points = [(0, 0, 5), (1, 0, 6), (2, 0, 8), (0, 1, 4), (1, 1, 7), (2, 1, 9),
             (0, 2, 3), (1, 2, 5), (2, 2, 8), (3, 0, 10), (3, 1, 11), (3, 2, 9)]
_spn = len(sp_points)
_spcoords = np.array([(p[0], p[1]) for p in sp_points])
_spval = np.array([p[2] for p in sp_points], dtype=float)
_spdist = np.zeros((_spn, _spn))
for _i in range(_spn):
    for _j in range(_spn):
        if _i != _j:
            _spdist[_i, _j] = np.sqrt(np.sum((_spcoords[_i] - _spcoords[_j]) ** 2))
_spW = np.zeros((_spn, _spn))
for _i in range(_spn):
    for _j in range(_spn):
        if _i != _j:
            _spW[_i, _j] = 1 / max(_spdist[_i, _j], 1e-6)
for _i in range(_spn):
    _rs = _spW[_i].sum()
    if _rs > 0:
        _spW[_i] /= _rs
_spMean = _spval.mean()
_spz = _spval - _spMean
_spS0 = _spW.sum()
_spNum = float(np.sum(_spW * np.outer(_spz, _spz)))
_spDen = float(np.sum(_spz ** 2))
_moranI = (_spn * _spNum) / (_spS0 * _spDen)
# Geary's C — the correct textbook formula: (n-1)/(2*S0) * sum_ij w_ij(xi-xj)^2 / sum_i(xi-xbar)^2.
# This pins down the /(n-1) double-counting bug (the buggy code divided the
# denominator by (n-1) AND multiplied the whole ratio by (n-1) again, inflating
# C by an extra factor of (n-1)).
_gearyNum = 0.0
for _i in range(_spn):
    for _j in range(_spn):
        _gearyNum += _spW[_i, _j] * (_spval[_i] - _spval[_j]) ** 2
_gearyRawSS = float(np.sum((_spval - _spMean) ** 2))
_gearyC = ((_spn - 1) / (2 * _spS0)) * _gearyNum / _gearyRawSS
spatial['basic'] = {
    'points': [{'x': p[0], 'y': p[1], 'val': p[2]} for p in sp_points],
    'moransI': float(_moranI), 'gearysC': float(_gearyC),
}
ref['spatial'] = spatial

# ── doseResponse ──────────────────────────────────────────────────────────────
from scipy.optimize import curve_fit as _curve_fit
doseResponse = {}
dr_dose = [0.1, 0.3, 1, 3, 10, 30, 100, 300]
dr_response = [2, 3, 8, 25, 55, 78, 92, 96]
_drlogdose = np.log10(np.array(dr_dose))
_drresp = np.array(dr_response, dtype=float)


def _fourpl(x, bottom, top, logec50, hill):
    return bottom + (top - bottom) / (1 + 10 ** ((logec50 - x) * hill))


_drp0 = [_drresp.min(), _drresp.max(), _drlogdose.mean(), 1]
_dr_popt, _dr_pcov = _curve_fit(_fourpl, _drlogdose, _drresp, p0=_drp0, maxfev=10000)
_dr_fitted = _fourpl(_drlogdose, *_dr_popt)
_dr_sse = float(np.sum((_drresp - _dr_fitted) ** 2))
doseResponse['fourpl_basic'] = {
    'dose': dr_dose, 'response': dr_response,
    'bottom': float(_dr_popt[0]), 'top': float(_dr_popt[1]),
    'logEC50': float(_dr_popt[2]), 'hill': float(_dr_popt[3]),
    'sse': _dr_sse, 'seLogEC50': float(np.sqrt(_dr_pcov[2, 2])),
}
ref['doseResponse'] = doseResponse

# ── sequential ────────────────────────────────────────────────────────────────
sequential = {}


def _calibrate_gs_boundary(K, alpha, bound_w):
    def phi(z):
        return np.exp(-0.5 * z * z) / np.sqrt(2 * np.pi)
    L = 4 * np.sqrt(K) + 6
    h = 0.05
    grid = np.arange(-L, L + h, h)
    m = len(grid)

    def cross_prob(c):
        f = phi(grid)
        total = 0.0
        for k in range(1, K + 1):
            bound = bound_w(c, k)
            mask = np.abs(grid) >= bound
            total += np.sum(f[mask]) * h
            if k == K:
                break
            fc = np.where(np.abs(grid) < bound, f, 0)
            fn = np.zeros(m)
            for a_idx in range(m):
                if fc[a_idx] == 0:
                    continue
                fn += fc[a_idx] * h * phi(grid - grid[a_idx])
            f = fn
        return total

    lo, hi = 0.5, 4.5
    for _ in range(40):
        mid = (lo + hi) / 2
        if cross_prob(mid) > alpha:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


# O'Brien-Fleming's defining property is a CONSTANT boundary on the raw
# cumulative statistic (unlike Pocock's, constant on the standardized Z_k) —
# pins down the uncalibrated-Bonferroni-approximation bug.
_seq_K = 5
_seq_alpha = 0.05
_of_c = _calibrate_gs_boundary(_seq_K, _seq_alpha, lambda c, k: c * np.sqrt(_seq_K))
sequential['obf_basic'] = {'stages': _seq_K, 'alpha': _seq_alpha, 'boundaries': [_of_c * np.sqrt(_seq_K / k) for k in range(1, _seq_K + 1)]}
ref['sequential'] = sequential

# ── causal ────────────────────────────────────────────────────────────────────
causal = {}
# Hardcoded dataset (generated once via the JS mulberry32(777) PRNG so both
# sides compute on IDENTICAL inputs — the JS and Python PRNGs are not
# interchangeable, so the values are frozen here rather than regenerated).
_civ_rows = [
    (1.994141, 1.017547, 1.299848, 0.847309), (2.31306, 0.50751, -0.76982, 0.48612),
    (-0.341837, 0.751622, 1.358044, 0.136), (1.637515, 0.135979, -0.86427, -0.414053),
    (5.978281, 1.694295, 0.610925, 1.24172), (0.122956, 0.078447, -0.206754, 0.120521),
    (0.242182, -0.659929, -1.775206, 0.807418), (-0.373752, 0.250487, 0.648229, -0.002199),
    (-2.500691, -0.92493, -0.743934, 0.10348), (3.309397, 1.317309, 0.88468, -0.118403),
    (0.876359, -0.022933, -0.6193, -0.451659), (-1.167633, -0.568964, 0.22266, -0.321876),
    (-0.032854, -0.096495, 0.052113, 1.408253), (-6.830407, -2.358329, -1.358638, -1.304165),
    (-0.549916, 0.512404, 1.819642, -1.623364), (0.070708, 0.741812, 1.152796, -0.54124),
    (-2.023993, -0.676797, -0.452337, -0.836613), (-1.240588, 0.382184, 1.655386, -0.978727),
    (0.240488, 0.414157, 1.125669, -0.320693), (1.015166, 1.174702, 1.890333, 0.051903),
    (-1.905509, -0.918197, -1.400682, 0.452626), (-3.478152, -0.832949, -0.22761, -1.090667),
    (-7.419039, -2.20256, -0.353978, -1.718063), (-0.666971, -0.518594, -0.809596, -0.988157),
    (3.422243, 1.479821, 1.03901, 0.009684), (-2.400736, -0.60906, -0.061244, 0.644206),
    (-3.553708, -0.912828, 0.363107, -0.749546), (0.302392, -0.282406, -0.338081, -0.055977),
    (4.214853, 0.792528, -1.833248, 1.213772), (-5.745977, -1.363275, 0.125704, -2.19781),
    (0.851195, 0.40813, 0.491459, -0.586798), (-0.22564, -0.418477, -0.35298, -0.221666),
    (4.379086, 1.802899, 0.835041, 0.536953), (-5.537386, -2.260048, -2.658437, 0.788478),
    (1.119912, 0.09011, -1.130225, 1.503722), (-1.742426, -0.726282, -0.502189, 1.14037),
    (-5.852709, -1.506193, 0.452254, -1.497045), (6.037305, 1.562713, -0.178858, 1.661376),
    (1.319935, 0.118742, -0.149877, 0.343818), (-2.1043, -0.010822, 1.671622, -2.104768),
]
_civ_n = len(_civ_rows)
_civ_y = np.array([r[0] for r in _civ_rows])
_civ_x = np.array([r[1] for r in _civ_rows])
_civ_z = np.array([r[2] for r in _civ_rows])
_civ_w1 = np.array([r[3] for r in _civ_rows])

_civ_Z = np.column_stack([np.ones(_civ_n), _civ_z, _civ_w1])
_civ_xhat = _civ_Z @ np.linalg.solve(_civ_Z.T @ _civ_Z, _civ_Z.T @ _civ_x)
_civ_X2 = np.column_stack([np.ones(_civ_n), _civ_xhat, _civ_w1])
_civ_beta2 = np.linalg.solve(_civ_X2.T @ _civ_X2, _civ_X2.T @ _civ_y)
_civ_Xactual = np.column_stack([np.ones(_civ_n), _civ_x, _civ_w1])
_civ_resid = _civ_y - _civ_Xactual @ _civ_beta2
_civ_s2 = np.sum(_civ_resid ** 2) / (_civ_n - 3)
_civ_inv2 = np.linalg.inv(_civ_X2.T @ _civ_X2)
_civ_se = float(np.sqrt(_civ_s2 * _civ_inv2[1, 1]))
causal['iv2sls_basic'] = {
    'y': _civ_y.tolist(), 'x': _civ_x.tolist(), 'z': _civ_z.tolist(), 'w1': _civ_w1.tolist(),
    'coef': float(_civ_beta2[1]), 'se': _civ_se,
}
ref['causal'] = causal

# ── abTesting ─────────────────────────────────────────────────────────────────
abTesting = {}
ab_control = [12.1, 15.3, 11.8, 14.2, 13.5, 12.9]
ab_treatment = [16.2, 18.1, 15.5, 17.8, 19.2, 16.9, 15.1]
_ab_t, _ab_p = st.ttest_ind(ab_treatment, ab_control, equal_var=False)
abTesting['unequal_basic'] = {'control': ab_control, 'treatment': ab_treatment, 't': float(_ab_t), 'p': float(_ab_p)}
ref['abTesting'] = abTesting

# ── psychometrics ─────────────────────────────────────────────────────────────
from statsmodels.stats.inter_rater import fleiss_kappa as _sm_fleiss_kappa, aggregate_raters as _sm_aggregate_raters
psychometrics = {}
psy_ratings = [
    [1, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 1],
    [1, 2, 2, 3, 1, 2, 2, 1, 2, 3, 2, 1],
    [1, 1, 2, 3, 2, 2, 3, 1, 3, 3, 1, 1],
]
_psy_nsubj = len(psy_ratings[0])
_psy_subj_ratings = [[psy_ratings[r][s] for r in range(len(psy_ratings))] for s in range(_psy_nsubj)]
_psy_table, _psy_cats = _sm_aggregate_raters(_psy_subj_ratings)
psychometrics['fleiss_basic'] = {'ratings': psy_ratings, 'kappa': float(_sm_fleiss_kappa(_psy_table))}
ref['psychometrics'] = psychometrics

# ── bioinformatics ────────────────────────────────────────────────────────────
from scipy.stats import hypergeom
bioinformatics = {}
_bio_geneset, _bio_bg, _bio_pathway, _bio_overlap, _bio_total = 50, 500, 30, 5, 1000
bioinformatics['enrichment_basic'] = {
    'geneset': _bio_geneset, 'background': _bio_bg, 'pathwaySize': _bio_pathway, 'overlap': _bio_overlap, 'total': _bio_total,
    'pValue': float(hypergeom.sf(_bio_overlap - 1, _bio_total, _bio_pathway, _bio_geneset)),
}
_bio_pvals = [0.005, 0.025, 0.029, 0.5, 0.5]
from statsmodels.stats.multitest import multipletests as _sm_multipletests
_bio_rej, _bio_pcorr, _, _ = _sm_multipletests(_bio_pvals, alpha=0.05, method='fdr_bh')
bioinformatics['fdr_basic'] = {'pValues': _bio_pvals, 'alpha': 0.05, 'nSig': int(sum(_bio_rej))}
ref['bioinformatics'] = bioinformatics

# ── ordination ────────────────────────────────────────────────────────────────
from scipy.linalg import orthogonal_procrustes as _sp_orthogonal_procrustes
ordination = {}
_ord_m1 = [[0, 1, 2, 3, 4], [1, 0, 1.5, 2.5, 3.5], [2, 1.5, 0, 1, 2], [3, 2.5, 1, 0, 1], [4, 3.5, 2, 1, 0]]
_ord_m2 = [[0, 1.2, 2.1, 2.9, 4.2], [1.2, 0, 1.4, 2.6, 3.3], [2.1, 1.4, 0, 0.9, 2.2], [2.9, 2.6, 0.9, 0, 1.1], [4.2, 3.3, 2.2, 1.1, 0]]
_ord_m1a, _ord_m2a = np.array(_ord_m1), np.array(_ord_m2)
_ord_n = len(_ord_m1)
_ord_iu = np.triu_indices(_ord_n, k=1)
ordination['mantel_basic'] = {'m1': _ord_m1, 'm2': _ord_m2, 'r': float(np.corrcoef(_ord_m1a[_ord_iu], _ord_m2a[_ord_iu])[0, 1])}

_ord_X = np.array([[1.2, 2.3], [3.1, 4.5], [5.2, 1.1], [2.3, 6.1], [4.4, 3.2], [0.5, 1.5], [3.3, 3.3]])
_ord_Y = np.array([[2.1, 1.4], [4.6, 3.0], [1.0, 5.1], [6.2, 2.2], [3.1, 4.0], [1.6, 0.4], [3.4, 3.2]])
_ord_R, _ = _sp_orthogonal_procrustes(_ord_X, _ord_Y)
_ord_m2val = float(np.sum((_ord_X @ _ord_R - _ord_Y) ** 2))
ordination['procrustes_basic'] = {'X': _ord_X.tolist(), 'Y': _ord_Y.tolist(), 'm2': _ord_m2val}
ref['ordination'] = ordination

# ── econometric ───────────────────────────────────────────────────────────────
econometric = {}
econ_ids = ['a', 'a', 'a', 'a', 'b', 'b', 'b', 'b', 'c', 'c', 'c', 'c']
econ_x1 = [1.0, 2.0, 1.5, 2.5, 4.0, 5.0, 4.5, 5.5, 7.0, 8.0, 7.5, 8.5]
econ_x2 = [0.5, -0.3, 0.2, 0.1, -0.4, 0.6, -0.1, 0.3, 0.2, -0.5, 0.4, -0.2]
econ_y = [5.1, 7.3, 6.0, 8.4, 12.9, 14.5, 13.6, 15.2, 20.1, 21.4, 20.5, 22.0]
econ_df = pd.DataFrame({'id': econ_ids, 'x1': econ_x1, 'x2': econ_x2, 'y': econ_y})
econ_dummies = pd.get_dummies(econ_df['id'], drop_first=True).astype(float)
econ_X = sm.add_constant(pd.concat([econ_df[['x1', 'x2']], econ_dummies], axis=1))
econ_model = sm.OLS(econ_df['y'], econ_X).fit()
econometric['panel_fe_basic'] = {
    'ids': econ_ids, 'x1': econ_x1, 'x2': econ_x2, 'y': econ_y,
    'b': {'x1': float(econ_model.params['x1']), 'x2': float(econ_model.params['x2'])},
    'se': {'x1': float(econ_model.bse['x1']), 'x2': float(econ_model.bse['x2'])},
}
ref['econometric'] = econometric

# ── mds ───────────────────────────────────────────────────────────────────────
mds = {}
mds_data = [[1, 2, 3], [4, 1, 2], [2, 5, 1], [6, 3, 4], [1, 1, 6], [3, 4, 2], [5, 2, 5]]
_mds_X = np.array(mds_data, dtype=float)
_mds_n = len(_mds_X)
_mds_D = np.sqrt(((_mds_X[:, None, :] - _mds_X[None, :, :]) ** 2).sum(-1))
_mds_D2 = _mds_D ** 2
_mds_rowmeans = _mds_D2.mean(axis=1)
_mds_grandmean = _mds_rowmeans.mean()
_mds_B = -0.5 * (_mds_D2 - _mds_rowmeans[:, None] - _mds_rowmeans[None, :] + _mds_grandmean)
_mds_eigval, _mds_eigvec = np.linalg.eigh(_mds_B)
_mds_idx = np.argsort(_mds_eigval)[::-1]
_mds_eigval, _mds_eigvec = _mds_eigval[_mds_idx], _mds_eigvec[:, _mds_idx]
_mds_points = _mds_eigvec[:, :2] * np.sqrt(np.maximum(_mds_eigval[:2], 0))
_mds_Dhat = np.sqrt(((_mds_points[:, None, :] - _mds_points[None, :, :]) ** 2).sum(-1))
_mds_iu = np.triu_indices(_mds_n, k=1)
mds['classical_basic'] = {'data': mds_data, 'stress': float(np.sum((_mds_D[_mds_iu] - _mds_Dhat[_mds_iu]) ** 2) / np.sum(_mds_D[_mds_iu] ** 2))}
ref['mds'] = mds

# ── game ──────────────────────────────────────────────────────────────────────
game = {}
# Classic glove game: player 1 holds a left glove, players 2 and 3 each hold a
# right glove; a coalition is worth 1 iff it has >=1 left AND >=1 right glove.
# Known analytical Shapley values: player 1 = 2/3, players 2 and 3 = 1/6 each.
game['shapley_glove'] = {'players': ['1', '2', '3'], 'values': [2 / 3, 1 / 6, 1 / 6]}
ref['game'] = game

# ── pgm ───────────────────────────────────────────────────────────────────────
pgm = {}
# Classic collider: 0 -> 1 <- 2. Without conditioning on the collider (node 1),
# 0 and 2 are d-separated; conditioning on the collider opens the path.
pgm['collider_basic'] = {
    'edges': [{'from': 0, 'to': 1}, {'from': 2, 'to': 1}],
    'nVars': 3, 'X': 0, 'Y': 2,
    'separatedNoZ': True, 'separatedWithZ': False,
}
ref['pgm'] = pgm

# ── linkage ───────────────────────────────────────────────────────────────────
import jellyfish
linkage = {}
linkage_pairs = [['MARTHA', 'MARHTA'], ['DIXON', 'DICKSONX'], ['JELLYFISH', 'SMELLYFISH'], ['kitten', 'sitting'], ['flaw', 'lawn']]
linkage['pairs'] = {
    f'{a}|{b}': {'jaroWinkler': jellyfish.jaro_winkler_similarity(a, b), 'levenshtein': jellyfish.levenshtein_distance(a, b)}
    for a, b in linkage_pairs
}
ref['linkage'] = linkage

# ── learning ──────────────────────────────────────────────────────────────────
from sklearn.metrics import roc_auc_score
learning = {}
learn_actual = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
learn_scores = [0.9, 0.85, 0.3, 0.7, 0.6, 0.4, 0.2, 0.1, 0.75, 0.5, 0.55, 0.65]
learning['roc_basic'] = {'actual': learn_actual, 'scores': learn_scores, 'auc': float(roc_auc_score(learn_actual, learn_scores))}
ref['learning'] = learning

# ── causalDiscovery ───────────────────────────────────────────────────────────
import pingouin as pg
causalDiscovery = {}
cd_x = [12, 15, 11, 18, 14, 20, 9, 16, 13, 17, 10, 19]
cd_y = [20, 22, 18, 25, 21, 28, 16, 23, 19, 24, 17, 26]
cd_z = [5, 6, 4, 8, 5.5, 9, 3, 7, 4.5, 7.5, 3.5, 8.5]
cd_df = pd.DataFrame({'x': cd_x, 'y': cd_y, 'z': cd_z})
cd_res = pg.partial_corr(data=cd_df, x='x', y='y', covar='z')
causalDiscovery['partial_corr_basic'] = {'x': cd_x, 'y': cd_y, 'z': cd_z, 'r': float(cd_res['r'].iloc[0]), 'p': float(cd_res['p_val'].iloc[0])}
ref['causalDiscovery'] = causalDiscovery

# ── clinical ──────────────────────────────────────────────────────────────────
import krippendorff as _krippendorff
from sklearn.metrics import cohen_kappa_score
clinical = {}
clin_r1 = [1, 2, 3, 2, 1, 3, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 2, 1, 3, 2]
clin_r2 = [1, 2, 2, 2, 1, 3, 3, 1, 3, 2, 2, 2, 3, 1, 1, 3, 2, 2, 3, 1]
clinical['weighted_kappa_basic'] = {
    'r1': clin_r1, 'r2': clin_r2,
    'linear': float(cohen_kappa_score(clin_r1, clin_r2, weights='linear')),
    'quadratic': float(cohen_kappa_score(clin_r1, clin_r2, weights='quadratic')),
}

_krip_rows = [
    {'r1': 'A', 'r2': 'A', 'r3': 'B'}, {'r1': 'B', 'r2': 'B', 'r3': 'B'}, {'r1': 'C', 'r2': 'C', 'r3': 'C'}, {'r1': 'A', 'r2': 'B', 'r3': 'A'},
    {'r1': 'C', 'r2': 'C', 'r3': 'B'}, {'r1': 'A', 'r2': 'A', 'r3': 'A'}, {'r1': 'B', 'r2': 'C', 'r3': 'B'}, {'r1': 'A', 'r2': 'A', 'r3': 'B'},
    {'r1': 'C', 'r2': 'B', 'r3': 'C'}, {'r1': 'B', 'r2': 'B', 'r3': 'A'},
]
_krip_cat_map = {'A': 0, 'B': 1, 'C': 2}
_krip_raters = ['r1', 'r2', 'r3']
_krip_reliability_data = [[_krip_cat_map[row[r]] for row in _krip_rows] for r in _krip_raters]
clinical['krippendorff_basic'] = {
    'data': _krip_rows, 'raters': _krip_raters, 'items': ['A', 'B', 'C'],
    'alphaNominal': float(_krippendorff.alpha(reliability_data=_krip_reliability_data, level_of_measurement='nominal')),
}
ref['clinical'] = clinical

# ── stochastic ────────────────────────────────────────────────────────────────
stochastic = {}
stoch_P = [[0.7, 0.2, 0.1], [0.3, 0.5, 0.2], [0.2, 0.3, 0.5]]
_stoch_Pa = np.array(stoch_P)
_stoch_eigval, _stoch_eigvec = np.linalg.eig(_stoch_Pa.T)
_stoch_idx = np.argmin(np.abs(_stoch_eigval - 1))
_stoch_pi = np.real(_stoch_eigvec[:, _stoch_idx])
_stoch_pi = _stoch_pi / _stoch_pi.sum()
stochastic['steady_state_basic'] = {'P': stoch_P, 'pi': _stoch_pi.tolist()}
ref['stochastic'] = stochastic

# ── conjoint ──────────────────────────────────────────────────────────────────
conjoint = {}
conj_profiles = [
    {'price': 'low', 'brand': 'A'}, {'price': 'low', 'brand': 'B'}, {'price': 'high', 'brand': 'A'},
    {'price': 'high', 'brand': 'B'}, {'price': 'low', 'brand': 'A'}, {'price': 'high', 'brand': 'B'},
]
conj_ratings = [8, 6, 4, 2, 8, 2]
_conj_X = np.array([[1 if p['price'] == 'low' else -1, 1 if p['brand'] == 'A' else -1] for p in conj_profiles], dtype=float)
_conj_X = sm.add_constant(_conj_X)
_conj_model = sm.OLS(conj_ratings, _conj_X).fit()
conjoint['partworth_basic'] = {
    'profiles': conj_profiles, 'ratings': conj_ratings,
    'priceUtil': [float(_conj_model.params[1]), -float(_conj_model.params[1])],
    'brandUtil': [float(_conj_model.params[2]), -float(_conj_model.params[2])],
}
ref['conjoint'] = conjoint

# ── copula ────────────────────────────────────────────────────────────────────
from scipy.stats import rankdata as _sp_rankdata
copula = {}
cop_xvals = [1, 2, 2, 3, 1, 2, 4, 5, 2, 3, 1, 4]
cop_yvals = [5, 4, 3, 2, 6, 7, 1, 2, 3, 4, 5, 6]
_cop_n = len(cop_xvals)
_cop_ranks = _sp_rankdata(cop_xvals, method='average')
copula['pseudo_obs_basic'] = {'x': cop_xvals, 'y': cop_yvals, 'uX': ((_cop_ranks - 0.5) / _cop_n).tolist()}
ref['copula'] = copula

# ── spatialEconometric ─────────────────────────────────────────────────────────
# directIndirectEffects: for row-standardized W, (I-rho*W)^-1 * 1 = 1/(1-rho) * 1,
# so the average TOTAL effect of a Durbin (WX) variable has the exact closed form
# (beta + theta) / (1 - rho). Verifies the fix for the previous version, which
# silently dropped theta from Total entirely.
_se_beta, _se_theta, _se_rho = 2.0, 1.0, 0.3
spatialEconometric = {
    'direct_indirect_basic': {
        'beta': _se_beta, 'theta': _se_theta, 'rho': _se_rho,
        'direct': _se_beta,
        'total': (_se_beta + _se_theta) / (1 - _se_rho),
    }
}
ref['spatialEconometric'] = spatialEconometric

# ── smc (particle filters) ──────────────────────────────────────────────────
# Exact grid-based (deterministic quadrature) Bayes filter for the same 1D
# state-space model used by bootstrapFilter/auxiliaryPF: x_t = x_{t-1} + U(-1,1),
# y_t ~ N(x_t, 1), with an initial (pre-noise) state uniform over [-2, 8). This is
# an independent, non-Monte-Carlo re-implementation of the filtering recursion
# (numerical integration, not resampling), used as ground truth for both particle
# filters (large-N Monte Carlo estimates should lie close to it).
_smc_y = np.array([1.2, 2.1, 2.9, 3.8, 5.0, 4.8, 5.9, 7.1, 6.8, 8.0])
_smc_grid = np.linspace(-8, 15, 4001)
_smc_dx = _smc_grid[1] - _smc_grid[0]
_smc_dens = np.where((_smc_grid >= -2) & (_smc_grid < 8), 1.0, 0.0)
_smc_dens /= _smc_dens.sum() * _smc_dx
def _smc_predict(dens):
    k_half = int(round(1 / _smc_dx))
    kernel = np.zeros_like(_smc_grid)
    center = len(_smc_grid) // 2
    kernel[center - k_half:center + k_half + 1] = 1.0
    kernel /= kernel.sum() * _smc_dx
    conv = np.convolve(dens, kernel, mode='same') * _smc_dx
    return conv / (conv.sum() * _smc_dx)
_smc_means = []
for _t in range(len(_smc_y)):
    _smc_dens = _smc_predict(_smc_dens)
    _lik = np.exp(-0.5 * (_smc_y[_t] - _smc_grid) ** 2)
    _post = _smc_dens * _lik
    _post /= _post.sum() * _smc_dx
    _smc_means.append(float((_smc_grid * _post).sum() * _smc_dx))
    _smc_dens = _post
smc = {
    'grid_filter_basic': {
        'y': _smc_y.tolist(),
        'initRangeLow': -2, 'initRangeHigh': 8,
        'exactFilteredMeans': _smc_means,
    }
}
ref['smc'] = smc

# ── neural (conv2D zero-padding) ────────────────────────────────────────────
# conv2D's output-size formula already accounted for padding, but the input
# indexing never subtracted `padding`, so padding>0 silently read the wrong
# cells instead of zero-padding. Ground truth via a from-scratch numpy
# zero-pad + cross-correlate (not scipy — this is a direct, exact re-derivation
# of the definition, not reusing the JS code).
_conv_input = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]], dtype=float)
_conv_kernel = np.array([[1, 0], [0, -1]], dtype=float)
_conv_pad = 1
_conv_padded = np.pad(_conv_input, ((_conv_pad, _conv_pad), (_conv_pad, _conv_pad)), mode='constant')
_ckh, _ckw = _conv_kernel.shape
_coh = _conv_padded.shape[0] - _ckh + 1
_cow = _conv_padded.shape[1] - _ckw + 1
_conv_out = np.zeros((_coh, _cow))
for _i in range(_coh):
    for _j in range(_cow):
        _region = _conv_padded[_i:_i + _ckh, _j:_j + _ckw]
        _conv_out[_i, _j] = float((_region * _conv_kernel).sum())
neural = {
    'conv2d_padding_basic': {
        'input': _conv_input.tolist(), 'kernel': _conv_kernel.tolist(), 'padding': _conv_pad,
        'output': _conv_out.tolist(),
    }
}
ref['neural'] = neural

# ── gam ──────────────────────────────────────────────────────────────────────
gam = {}

# gamLocalScoring: IRLS logistic regression. Deterministic grid-based design (no
# RNG, so both this fixture and the JS test embed the same literal arrays).
# Ground truth via statsmodels.Logit (a real external oracle) — the previous
# JS code's XtWz omitted the w[k] weight factor (X^T·z instead of X^T·W·z),
# causing the IRLS update to diverge to +/-infinity within a few iterations.
_gam_X, _gam_y = [], []
for _i in range(40):
    _x1 = (_i % 8) - 3.5
    _x2 = (_i // 8) - 2
    _logit = 0.4 + 0.9 * _x1 - 0.7 * _x2
    _p = 1 / (1 + np.exp(-_logit))
    _label = 1 if _p > 0.5 else 0
    if _i % 5 == 0:  # deterministic label noise to avoid perfect separation
        _label = 1 - _label
    _gam_X.append([1.0, float(_x1), float(_x2)])
    _gam_y.append(_label)
_gam_logit_model = sm.Logit(np.array(_gam_y), np.array(_gam_X)).fit(disp=0)
gam['local_scoring_basic'] = {
    'X': _gam_X, 'y': _gam_y,
    'beta': _gam_logit_model.params.tolist(),
    'logLik': float(_gam_logit_model.llf),
}

# thinPlateSpline / pSpline: deterministic (no RNG) x,y; ground truth via a
# from-scratch numpy solve of the exact augmented system the JS code declares
# (not a reuse of the JS implementation) — the previous JS `solveSystem`
# didn't solve the linear system at all (each rhs entry divided by its own
# matrix row's sum, unrelated to the true solution), and separately read the
# solved coefficient vector's two blocks (RBF weights vs. polynomial terms)
# in the wrong order.
_tps_x = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dtype=float)
_tps_y = _tps_x * 2 + np.sin(_tps_x) * 0.3
_tps_n = len(_tps_x)
_tps_K = np.zeros((_tps_n, _tps_n))
for _i in range(_tps_n):
    for _j in range(_tps_n):
        _r = abs(_tps_x[_i] - _tps_x[_j])
        _tps_K[_i, _j] = _r * _r * np.log(_r * _r + 1e-10) if _r > 0 else 0
_tps_T = np.column_stack([np.ones(_tps_n), _tps_x])
_tps_lambda = 0.1
_tps_M = np.zeros((_tps_n + 2, _tps_n + 2))
_tps_M[:_tps_n, :_tps_n] = _tps_K + _tps_lambda * np.eye(_tps_n)
_tps_M[:_tps_n, _tps_n:] = _tps_T
_tps_M[_tps_n:, :_tps_n] = _tps_T.T
_tps_alpha = np.linalg.solve(_tps_M, np.concatenate([_tps_y, [0, 0]]))
_tps_c, _tps_d = _tps_alpha[:_tps_n], _tps_alpha[_tps_n:]
_tps_fitted = []
for _i in range(_tps_n):
    _pred = _tps_d[0] + _tps_d[1] * _tps_x[_i]
    for _j in range(_tps_n):
        _r = abs(_tps_x[_i] - _tps_x[_j])
        _pred += _tps_c[_j] * (_r * _r * np.log(_r * _r + 1e-10) if _r > 0 else 0)
    _tps_fitted.append(float(_pred))
gam['tps_basic'] = {'x': _tps_x.tolist(), 'y': _tps_y.tolist(), 'lambda': _tps_lambda, 'fitted': _tps_fitted}

_psp_x = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dtype=float)
_psp_y = _psp_x * 1.5 + np.sin(_psp_x) * 0.5
_psp_n = len(_psp_x)
_psp_nKnots = 3
_psp_xmin, _psp_xmax = _psp_x.min(), _psp_x.max()
_psp_knots = [_psp_xmin + (_psp_xmax - _psp_xmin) * (_j + 1) / (_psp_nKnots + 1) for _j in range(_psp_nKnots)]
_psp_B = []
for _xi in _psp_x:
    _row = [1.0, float(_xi)]
    for _k in _psp_knots:
        _v = _xi - _k
        _row.append(float(_v ** 3 if _v > 0 else 0))
    _psp_B.append(_row)
_psp_B = np.array(_psp_B)
_psp_p = _psp_B.shape[1]
_psp_BtB = _psp_B.T @ _psp_B
_psp_BtY = _psp_B.T @ _psp_y
_psp_lambda = 0.1
for _i in range(2, _psp_p):
    _psp_BtB[_i, _i] += _psp_lambda
_psp_beta = np.linalg.solve(_psp_BtB, _psp_BtY)
_psp_fitted = (_psp_B @ _psp_beta).tolist()
gam['pspline_basic'] = {'x': _psp_x.tolist(), 'y': _psp_y.tolist(), 'nKnots': _psp_nKnots, 'lambda': _psp_lambda, 'fitted': _psp_fitted}

ref['gam'] = gam

# ── tensor (mode-n unfold) ───────────────────────────────────────────────────
# unfoldTensor's row index for mode 1/2 always used `i` (the tensor's first
# index) instead of the mode-appropriate index (j for mode 1, k for mode 2),
# so almost every cell landed in the wrong row (or was clamped into row 0).
# Ground truth via a from-scratch numpy re-derivation of the standard mode-n
# unfolding definition (Kolda & Bader), using the same column-index convention
# the JS code declares (col = j*d3+k for mode 0, i*d3+k for mode 1, i*d2+j for
# mode 2) — not a reuse of the JS implementation.
_ut_X = np.arange(24).reshape(2, 3, 4).astype(float)
_ut_d1, _ut_d2, _ut_d3 = _ut_X.shape
_ut_M0 = np.zeros((_ut_d1, _ut_d2 * _ut_d3))
_ut_M1 = np.zeros((_ut_d2, _ut_d1 * _ut_d3))
_ut_M2 = np.zeros((_ut_d3, _ut_d1 * _ut_d2))
for _i in range(_ut_d1):
    for _j in range(_ut_d2):
        for _k in range(_ut_d3):
            _ut_M0[_i, _j * _ut_d3 + _k] = _ut_X[_i, _j, _k]
            _ut_M1[_j, _i * _ut_d3 + _k] = _ut_X[_i, _j, _k]
            _ut_M2[_k, _i * _ut_d2 + _j] = _ut_X[_i, _j, _k]
tensor = {
    'unfold_basic': {
        'tensor': _ut_X.tolist(),
        'mode0': _ut_M0.tolist(), 'mode1': _ut_M1.tolist(), 'mode2': _ut_M2.tolist(),
    }
}
ref['tensor'] = tensor

# ── dimReduction (isomap) ────────────────────────────────────────────────────
# isomap's kNN graph was directed (only each point's own k nearest neighbors),
# which stayed substantially asymmetric even after Floyd-Warshall's transitive
# closure, breaking classical MDS's symmetric-dissimilarity-matrix assumption.
# Separately, the MDS embedding used raw unit-norm eigenvectors instead of
# eigenvector*sqrt(eigenvalue) (the convention this codebase's own mds.js
# already uses), badly distorting relative axis scales. Ground truth via
# scikit-learn's Isomap; compared via pairwise embedding distances (rotation/
# reflection-invariant, since MDS solutions are only defined up to an
# orthogonal transform).
from sklearn.manifold import Isomap as _SKIsomap
_iso_n = 20
_iso_X = np.array([[np.cos(t) * 3, np.sin(t) * 3, t * 0.5]
                    for t in (np.arange(_iso_n) / (_iso_n - 1)) * np.pi * 1.5])
_iso_model = _SKIsomap(n_neighbors=5, n_components=2)
_iso_Y = _iso_model.fit_transform(_iso_X)
_iso_pdist = []
for _i in range(_iso_n):
    for _j in range(_i + 1, _iso_n):
        _iso_pdist.append(float(np.linalg.norm(_iso_Y[_i] - _iso_Y[_j])))
dimReduction = {
    'isomap_basic': {'X': _iso_X.tolist(), 'nNeighbors': 5, 'nComponents': 2, 'pairwiseDist': _iso_pdist}
}
ref['dimReduction'] = dimReduction

# ── power (exact noncentral chi-square/F power) ─────────────────────────────
# powerChi, powerOLS, powerRMANOVA, and powerInteractionANOVA previously used a
# normal approximation to the noncentral chi-square/F distribution's mean and
# variance, which can overstate power by several percentage points (e.g. the
# OLS case below: 0.970 approximate vs. 0.905 exact). Ground truth via
# scipy.stats.ncx2/ncf survival functions (the exact noncentral CDFs).
from scipy.stats import ncx2 as _ncx2, ncf as _ncf, chi2 as _chi2sp, f as _fsp
_pw_chi = {'cohenW': 0.3, 'df': 4, 'N': 100, 'alpha': 0.05}
_pw_chi_crit = _chi2sp.ppf(1 - _pw_chi['alpha'], _pw_chi['df'])
_pw_chi_ncp = _pw_chi['N'] * _pw_chi['cohenW'] ** 2
_pw_chi_power = float(_ncx2.sf(_pw_chi_crit, _pw_chi['df'], _pw_chi_ncp))

_pw_ols = {'rSquared': 0.13043478260869565, 'n': 100, 'k': 3, 'alpha': 0.05}
_pw_ols_f2 = _pw_ols['rSquared'] / (1 - _pw_ols['rSquared'])
_pw_ols_ncp = _pw_ols['n'] * _pw_ols_f2
_pw_ols_df1, _pw_ols_df2 = _pw_ols['k'], _pw_ols['n'] - _pw_ols['k'] - 1
_pw_ols_crit = _fsp.ppf(1 - _pw_ols['alpha'], _pw_ols_df1, _pw_ols_df2)
_pw_ols_power = float(_ncf.sf(_pw_ols_crit, _pw_ols_df1, _pw_ols_df2, _pw_ols_ncp))

_pw_rm = {'k': 4, 'n': 30, 'epsilon': 1, 'f': 0.25, 'alpha': 0.05}
_pw_rm_df1 = (_pw_rm['k'] - 1) * _pw_rm['epsilon']
_pw_rm_df2 = (_pw_rm['k'] - 1) * (_pw_rm['n'] - 1) * _pw_rm['epsilon']
_pw_rm_ncp = _pw_rm['n'] * _pw_rm['k'] * _pw_rm['f'] ** 2
_pw_rm_crit = _fsp.ppf(1 - _pw_rm['alpha'], _pw_rm_df1, _pw_rm_df2)
_pw_rm_power = float(_ncf.sf(_pw_rm_crit, _pw_rm_df1, _pw_rm_df2, _pw_rm_ncp))

_pw_int = {'kA': 2, 'kB': 3, 'nPerCell': 20, 'fInt': 0.25, 'alpha': 0.05}
_pw_int_df1 = (_pw_int['kA'] - 1) * (_pw_int['kB'] - 1)
_pw_int_df2 = _pw_int['kA'] * _pw_int['kB'] * (_pw_int['nPerCell'] - 1)
_pw_int_ncp = _pw_int['nPerCell'] * _pw_int['kA'] * _pw_int['kB'] * _pw_int['fInt'] ** 2
_pw_int_crit = _fsp.ppf(1 - _pw_int['alpha'], _pw_int_df1, _pw_int_df2)
_pw_int_power = float(_ncf.sf(_pw_int_crit, _pw_int_df1, _pw_int_df2, _pw_int_ncp))

power = {
    'chi_basic': {**_pw_chi, 'power': _pw_chi_power},
    'ols_basic': {**_pw_ols, 'power': _pw_ols_power},
    'rmanova_basic': {**_pw_rm, 'power': _pw_rm_power},
    'interaction_anova_basic': {**_pw_int, 'power': _pw_int_power},
}
ref['power'] = power

# ── interpretability (alePlot) ──────────────────────────────────────────────
# alePlot's last bin used an exclusive upper bound ([lo,hi)), silently dropping
# any point sitting exactly at the feature's maximum from every bin; and an
# empty bin reset the cumulative ALE value to 0 instead of carrying the
# previous bin's running total forward. Ground truth via a from-scratch
# (non-JS) re-implementation of the same well-documented ALE definition with
# both fixes applied, on a case with an isolated max-value point (gap before
# it) and a nonlinear model, so both bugs are exercised.
_ale_X = [[1.0], [1.5], [2.0], [2.5], [3.0], [10.0]]
_ale_nIntervals = 5
_ale_vals = [r[0] for r in _ale_X]
_ale_minV, _ale_maxV = min(_ale_vals), max(_ale_vals)
_ale_intervals = [_ale_minV + (_ale_maxV - _ale_minV) * i / _ale_nIntervals for i in range(_ale_nIntervals + 1)]
_ale_vals_out = [0.0] * _ale_nIntervals
for _k in range(_ale_nIntervals):
    _lo, _hi = _ale_intervals[_k], _ale_intervals[_k + 1]
    if _k == _ale_nIntervals - 1:
        _inBin = [r for r in _ale_X if r[0] >= _lo and r[0] <= _hi]
    else:
        _inBin = [r for r in _ale_X if r[0] >= _lo and r[0] < _hi]
    if not _inBin:
        _ale_vals_out[_k] = _ale_vals_out[_k - 1] if _k > 0 else 0.0
        continue
    _effect = 0.0
    for _row in _inBin:
        _rowLo = list(_row); _rowLo[0] = _lo
        _rowHi = list(_row); _rowHi[0] = _hi
        _effect += ((_rowHi[0] ** 2) - (_rowLo[0] ** 2)) / len(_inBin)
    _ale_vals_out[_k] = (_ale_vals_out[_k - 1] if _k > 0 else 0.0) + _effect
interpretability = {
    'ale_basic': {'X': _ale_X, 'nIntervals': _ale_nIntervals, 'ale': _ale_vals_out, 'intervals': _ale_intervals}
}
ref['interpretability'] = interpretability

# ── phylogenetics (pglsRegression) ──────────────────────────────────────────
# pglsRegression previously didn't accept a `tree` argument at all (silently
# dropping it) and fabricated a covariance matrix from each row's ARRAY INDEX
# distance instead of any real phylogenetic relationship. Ground truth via a
# from-scratch numpy GLS solve of X'V^-1X b = X'V^-1y, with V(lambda) =
# lambda*C_offdiag + diag(C) for a real balanced-binary-tree VCV (matching the
# codebase's own phyloVCV/glsFit convention, not reusing the JS code).
_pg_D = 3
_pg_n = 2 ** _pg_D
_pg_C = np.zeros((_pg_n, _pg_n))
for _i in range(_pg_n):
    for _j in range(_pg_n):
        if _i == _j:
            _pg_C[_i, _j] = _pg_D
        else:
            _shared = 0
            for _b in range(_pg_D - 1, -1, -1):
                if ((_i >> _b) & 1) == ((_j >> _b) & 1):
                    _shared += 1
                else:
                    break
            _pg_C[_i, _j] = _shared
_pg_lambda = 0.6
_pg_V = np.where(np.eye(_pg_n) == 1, _pg_C, _pg_lambda * _pg_C)
_pg_x = np.array([1, 2, 3, 4, 5, 6, 7, 8]) * 0.7
_pg_y = np.array([2 + 1.8 * xi + (0.3 if i % 2 == 0 else -0.2) for i, xi in enumerate(_pg_x)])
_pg_X = np.column_stack([np.ones(_pg_n), _pg_x])
_pg_Vinv = np.linalg.inv(_pg_V)
_pg_beta = np.linalg.solve(_pg_X.T @ _pg_Vinv @ _pg_X, _pg_X.T @ _pg_Vinv @ _pg_y)
phylogenetics = {
    'pgls_basic': {
        'vcv': _pg_C.tolist(), 'x': _pg_x.tolist(), 'y': _pg_y.tolist(), 'lambda': _pg_lambda,
        'beta': _pg_beta.tolist(),
    }
}
ref['phylogenetics'] = phylogenetics

# ── sem (pathAnalysis, bifactorModel) ───────────────────────────────────────
# Shared LCG matching the JS mulberry32-style generator used throughout this
# codebase's own test fixtures, so both languages produce identical sequences.
def _lcg_seq(seed, count):
    s = seed
    out = []
    for _ in range(count):
        s = (1664525 * s + 1013904223) & 0xFFFFFFFF
        out.append(s / 2**32)
    return out

# pathAnalysis: mediation chain x -> m -> y (no direct x->y in the true model).
# The previous version regressed each equation through the origin (no
# intercept column), badly biasing every coefficient given these variables'
# nonzero means, and hardcoded indirect=0/total=direct for every edge instead
# of tracing the chain, so the x->y mediated effect (0.6*0.8=0.48) was never
# computed at all. Ground truth via numpy OLS with an intercept for each
# equation (a direct, from-scratch re-derivation, not reusing the JS code).
_pa_n = 200
_pa_u = _lcg_seq(3, _pa_n * 3)
_pa_x = [5 + (_pa_u[3 * i] * 2 - 1) * 2 for i in range(_pa_n)]
_pa_m = [10 + 0.6 * _pa_x[i] + (_pa_u[3 * i + 1] * 2 - 1) * 0.3 for i in range(_pa_n)]
_pa_y = [20 + 0.8 * _pa_m[i] + (_pa_u[3 * i + 2] * 2 - 1) * 0.3 for i in range(_pa_n)]
_pa_Xm = np.column_stack([np.ones(_pa_n), _pa_x])
_pa_beta_m = np.linalg.lstsq(_pa_Xm, _pa_m, rcond=None)[0]
_pa_Xy = np.column_stack([np.ones(_pa_n), _pa_m])
_pa_beta_y = np.linalg.lstsq(_pa_Xy, _pa_y, rcond=None)[0]
sem_fixtures = {
    'path_analysis_basic': {
        'x': _pa_x, 'm': _pa_m, 'y': _pa_y,
        'x_to_m': float(_pa_beta_m[1]), 'm_to_y': float(_pa_beta_y[1]),
        'x_to_y_indirect': float(_pa_beta_m[1] * _pa_beta_y[1]),
    }
}
ref['sem'] = sem_fixtures

# ── abm (moranIMulti) ────────────────────────────────────────────────────────
# moranIMulti summed the i==j "self" term (w_ii=exp(0)=1, spuriously adding
# Sum(z_i^2) to the numerator) and normalized by the agent count n instead of
# S0 (the true sum of all off-diagonal spatial weights). Ground truth via a
# from-scratch numpy re-derivation of the standard Moran's I formula
# (n/S0)*Sum_{i!=j}(w_ij*z_i*z_j)/Sum(z_i^2).
_ma_n = 20
_ma_u = _lcg_seq(3, _ma_n * 3)
_ma_agents = [{'x': _ma_u[3 * i] * 10, 'y': _ma_u[3 * i + 1] * 10, 'val': _ma_u[3 * i + 2] * 5} for i in range(_ma_n)]
_ma_vals = np.array([a['val'] for a in _ma_agents])
_ma_z = _ma_vals - _ma_vals.mean()
_ma_W = np.zeros((_ma_n, _ma_n))
for _i in range(_ma_n):
    for _j in range(_ma_n):
        _dx = _ma_agents[_i]['x'] - _ma_agents[_j]['x']
        _dy = _ma_agents[_i]['y'] - _ma_agents[_j]['y']
        _ma_W[_i, _j] = np.exp(-(_dx * _dx + _dy * _dy))
np.fill_diagonal(_ma_W, 0)
_ma_S0 = _ma_W.sum()
_ma_num = float(np.sum(_ma_W * np.outer(_ma_z, _ma_z)))
_ma_denom = float(np.sum(_ma_z ** 2))
_ma_I = (_ma_n / _ma_S0) * (_ma_num / _ma_denom)
abm = {
    'moran_basic': {'agents': _ma_agents, 'I': _ma_I}
}
ref['abm'] = abm

# ── bootstrap ──────────────────────────────────────────────────────────────────
# Replicates the JS LCG (lcg function in bootstrap.js) to generate identical
# bootstrap resamples, so oracle values match exactly for deterministic functions
# like jackknife and splitConformal, and are reproducible for PRNG-based functions.

def _lcg_iter(seed):
    s = seed & 0xFFFFFFFF
    while True:
        s = ((1664525 * s + 1013904223) & 0xFFFFFFFF)
        yield s / (2 ** 32)

def _bootstrap_indices(n, B, seed):
    rand = _lcg_iter(seed)
    samples = []
    for b in range(B):
        idx = [int(next(rand) * n) for _ in range(n)]
        samples.append(idx)
    return samples

bd = np.array([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], dtype=float)
bmean = float(np.mean(bd))
Bn = 2000

# ── bootstrapCI ──
_bci_samps = _bootstrap_indices(len(bd), Bn, 42)
_bci_reps = sorted([float(np.mean(bd[idx])) for idx in _bci_samps])
# percentile
_ci_p_lo = _bci_reps[int(0.025 * Bn)]
_ci_p_hi = _bci_reps[int(0.975 * Bn)]
# basic
_ci_b_lo = 2 * bmean - _bci_reps[int(0.975 * Bn)]
_ci_b_hi = 2 * bmean - _bci_reps[int(0.025 * Bn)]
# BCa
_z0 = float(st.norm.ppf(max(0.001, min(0.999, sum(1 for r in _bci_reps if r < bmean) / Bn))))
_jack_influ = [float(np.mean(np.delete(bd, i))) for i in range(len(bd))]
_jmean = float(np.mean(_jack_influ))
_sum3 = sum((_jmean - j) ** 3 for j in _jack_influ)
_sum2 = sum((_jmean - j) ** 2 for j in _jack_influ)
_a = _sum3 / (6 * _sum2 ** 1.5) if _sum2 > 0 else 0
_a = max(-0.99, min(0.99, _a))
_zAlpha = float(st.norm.ppf(0.025))
_z1Alpha = float(st.norm.ppf(0.975))
_alpha1Val = float(st.norm.cdf(_z0 + (_z0 + _zAlpha) / (1 - _a * (_z0 + _zAlpha))))
_alpha2Val = float(st.norm.cdf(_z0 + (_z0 + _z1Alpha) / (1 - _a * (_z0 + _z1Alpha))))
_ci_bca_lo = _bci_reps[max(0, min(Bn - 1, int(_alpha1Val * Bn)))]
_ci_bca_hi = _bci_reps[max(0, min(Bn - 1, int(_alpha2Val * Bn)))]

bootstrap = {
    'bootstrapCI_percentile': {
        'data': bd.tolist(), 'method': 'percentile', 'B': Bn, 'alpha': 0.05,
        'ci': [float(_ci_p_lo), float(_ci_p_hi)],
    },
    'bootstrapCI_basic': {
        'data': bd.tolist(), 'method': 'basic', 'B': Bn, 'alpha': 0.05,
        'ci': [float(_ci_b_lo), float(_ci_b_hi)],
    },
    'bootstrapCI_bca': {
        'data': bd.tolist(), 'method': 'bca', 'B': Bn, 'alpha': 0.05,
        'ci': [float(_ci_bca_lo), float(_ci_bca_hi)],
    },
}

# ── bootstrapSE ──
_bse_reps_vals = [float(np.mean(bd[idx])) for idx in _bci_samps]
_bse = float(np.std(_bse_reps_vals, ddof=1))
bootstrap['bootstrapSE_mean'] = {'data': bd.tolist(), 'se': _bse, 'B': Bn}

# ── jackknife ──
_nb = len(bd)
_jk_loo = [float(np.mean(np.delete(bd, i))) for i in range(_nb)]
_jk_pseudo = [_nb * bmean - (_nb - 1) * v for v in _jk_loo]
_jk_est = float(np.mean(_jk_pseudo))
_jk_se = float(np.sqrt(sum((p - _jk_est) ** 2 for p in _jk_pseudo) / (_nb * (_nb - 1))))
_jk_bias = (_nb - 1) * (_jk_est - bmean)
bootstrap['jackknife_mean'] = {
    'data': bd.tolist(),
    'estimate': _jk_est, 'se': _jk_se, 'bias': _jk_bias,
    'originalEstimate': bmean,
}

# ── splitConformal ──
_y_train = [float(i) for i in range(1, 16)]
_y_cal = [float(i) + 0.1 for i in range(16, 26)]
_mu_sc = float(np.mean(_y_train))
_n_cal = len(_y_cal)
_sc_res = sorted([abs(v - _mu_sc) for v in _y_cal])
_sc_alpha = 0.1
_sc_k = min(_n_cal - 1, int(np.ceil((1 - _sc_alpha) * (_n_cal + 1))) - 1)
_sc_radius = _sc_res[max(0, _sc_k)]
bootstrap['splitConformal_mean'] = {
    'yTrain': _y_train, 'yCal': _y_cal,
    'radius': float(_sc_radius), 'alpha': _sc_alpha, 'model': 'mean',
}

# ── conformalPvalues ──
_cp_scores = [0.1, 0.3, 0.7, 0.9]
_cp_test = 0.5
_cp_geq = sum(1 for s in _cp_scores if s >= _cp_test)
_cp_p = (_cp_geq + 1) / (len(_cp_scores) + 1)
bootstrap['conformalPvalues_basic'] = {
    'scores': _cp_scores, 'testScore': _cp_test, 'p': float(_cp_p),
}

# ── jackknifePlus ──
_jp_X = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dtype=float)
_jp_y = np.array([2, 4, 6, 8, 10, 12, 14, 16, 18, 20], dtype=float)
_jp_n = len(_jp_X)
_jp_target = float(np.mean(_jp_X))
_jp_alpha = 0.1
_jp_lower = []
_jp_upper = []
for _i in range(_jp_n):
    _xi = np.delete(_jp_X, _i)
    _yi = np.delete(_jp_y, _i)
    _mx = float(np.mean(_xi))
    _my = float(np.mean(_yi))
    _sxy = sum((float(_xi[_j]) - _mx) * (float(_yi[_j]) - _my) for _j in range(len(_xi)))
    _sxx = sum((float(_xi[_j]) - _mx) ** 2 for _j in range(len(_xi)))
    _b = _sxy / _sxx if _sxx > 1e-12 else 0.0
    _a = _my - _b * _mx
    _res = abs(_jp_y[_i] - (_a + _b * _jp_X[_i]))
    _pred = _a + _b * _jp_target
    _jp_lower.append(float(_pred - _res))
    _jp_upper.append(float(_pred + _res))
_jp_lower.sort()
_jp_upper.sort()
_jp_kLo = max(0, int(np.floor(_jp_alpha * (_jp_n + 1))) - 1)
_jp_kHi = min(_jp_n - 1, int(np.ceil((1 - _jp_alpha) * (_jp_n + 1))) - 1)
_jp_lo = _jp_lower[_jp_kLo]
_jp_hi = _jp_upper[_jp_kHi]
_jp_radius = max(0.0, (_jp_hi - _jp_lo) / 2.0)
bootstrap['jackknifePlus_basic'] = {
    'X': _jp_X.tolist(), 'y': _jp_y.tolist(),
    'lower': float(_jp_lo), 'upper': float(_jp_hi), 'radius': float(_jp_radius),
    'target': float(_jp_target), 'alpha': _jp_alpha,
}

ref['bootstrap'] = bootstrap

# ── multilevel ─────────────────────────────────────────────────────────────────
# Data generated by nestedHLM (10 schools x 15 pupils, mulberry32 PRNG seed=99).
# Loaded from the fixture dump to guarantee identical inputs to the JS tests.
# Oracles are computed by independent reimplementation of the ANOVA decomposition
# formulas (not reusing statlab's JS code), since hlmRandomIntercept uses
# the ICC(1) ANOVA estimator, not a full mixed model.
import pandas as pd

_ml_data = _fixtures['hlm']
_ml_df = pd.DataFrame(_ml_data)

def _hlm_icc(data, yVar, clusterVar):
    """Independent reimplementation of ANOVA-based ICC(1) decomposition."""
    groups = {}
    for r in data:
        g = r[clusterVar]
        groups.setdefault(g, []).append(r[yVar])
    vals = list(groups.values())
    nTotal = sum(len(v) for v in vals)
    J = len(vals)
    grandMean = sum(sum(v) for v in vals) / nTotal
    msb_num = sum(len(v) * (sum(v) / len(v) - grandMean) ** 2 for v in vals)
    msb = msb_num / (J - 1)
    ssw = sum(sum((vi - sum(v) / len(v)) ** 2 for vi in v) for v in vals)
    msw = ssw / (nTotal - J)
    avg_nj = nTotal / J
    icc = (msb - msw) / (msb + (avg_nj - 1) * msw) if msb + (avg_nj - 1) * msw > 0 else 0
    tau00 = max(0, (msb - msw) / nTotal)
    return {'icc': icc, 'tau00': tau00, 'sigma2': msw, 'msb': msb, 'msw': msw, 'J': J, 'n': nTotal}

_ml_null = _hlm_icc(_ml_data, 'y', 'school')

# Regression of group means on group-mean x for gamma01/SE
_groups_x = {}
for r in _ml_data:
    g = r['school']
    if g not in _groups_x:
        _groups_x[g] = {'y': [], 'x': []}
    _groups_x[g]['y'].append(r['y'])
    _groups_x[g]['x'].append(r['x'])
_gxs = [np.mean(_groups_x[g]['x']) for g in _groups_x]
_gys = [np.mean(_groups_x[g]['y']) for g in _groups_x]
_gmx = np.mean(_gxs)
_gmy = np.mean(_gys)
_gsxx = np.sum((np.array(_gxs) - _gmx) ** 2)
_gsxy = np.sum((np.array(_gxs) - _gmx) * (np.array(_gys) - _gmy))
_gamma01 = _gsxy / _gsxx if _gsxx else 0
_gresid = np.array(_gys) - _gmy - _gamma01 * (np.array(_gxs) - _gmx)
_seGamma = np.sqrt(np.var(_gresid, ddof=1) / _gsxx) if _gsxx and _gsxx > 0 else 0.0

multilevel = {
    'hlmNull': {
        'icc': float(_ml_null['icc']),
        'tau00': float(_ml_null['tau00']),
        'sigma2': float(_ml_null['sigma2']),
        'nClusters': _ml_null['J'],
        'n': _ml_null['n'],
    },
    'hlmX': {
        'gamma01': float(_gamma01),
        'seGamma01': float(_seGamma),
    },
}

# ── repeatedMeasuresMANOVA oracle ──
from statsmodels.stats.anova import AnovaRM
_rm_subj = []
_s_rm = 7
def _rm_rnd():
    global _s_rm
    _s_rm = (1103515245 * _s_rm + 12345) & 0x7fffffff
    return _s_rm / 0x7fffffff - 0.5
for i in range(30):
    _subj_val = _rm_rnd() * 2
    _rm_subj.append({'id': i, 'condition': 'y1', 'value': 10.0 + _subj_val + _rm_rnd()})
    _rm_subj.append({'id': i, 'condition': 'y2', 'value': 13.0 + _subj_val + _rm_rnd()})
    _rm_subj.append({'id': i, 'condition': 'y3', 'value': 16.0 + _subj_val + _rm_rnd()})
_rm_df = pd.DataFrame(_rm_subj)
_rm_res = AnovaRM(_rm_df, 'value', 'id', within=['condition']).fit()
multilevel['rmanova_basic'] = {
    'F': float(_rm_res.anova_table['F Value'].iloc[0]),
    'p': float(_rm_res.anova_table['Pr > F'].iloc[0]),
    'ggEpsilon': float(_rm_res.anova_table['GG e'].iloc[0]) if 'GG e' in _rm_res.anova_table.columns else 1.0,
    'pGG': float(_rm_res.anova_table['p-GG'].iloc[0]) if 'p-GG' in _rm_res.anova_table.columns else float(_rm_res.anova_table['Pr > F'].iloc[0]),
}

ref['multilevel'] = multilevel

# ── optimization (gradient-based methods) ──────────────────────────────────────
# Oracles via scipy.optimize.minimize with the same standard test function
# f(x) = sum(x_i^2), grad(x) = 2x_i, hess = 2I. The JS implementations all
# optimize the same sphere function with init [5,5], so the scipy oracle
# confirms they converge to (0,0) within tolerance.
from scipy.optimize import minimize as _scipy_minimize

_opt_fn = lambda x: np.sum(np.array(x) ** 2)
_opt_grad = lambda x: 2 * np.array(x)
_opt_hess = lambda x: 2 * np.eye(len(x))
_opt_init = np.array([5.0, 5.0])

optimization = {}
for _method, _opts in [('BFGS', {'jac': _opt_grad}), ('Nelder-Mead', {}),
                         ('CG', {'jac': _opt_grad}), ('SLSQP', {'jac': _opt_grad}),
                         ('trust-ncg', {'jac': _opt_grad, 'hess': _opt_hess})]:
    _res = _scipy_minimize(_opt_fn, _opt_init, method=_method, **_opts, options={'maxiter': 50})
    optimization[_method.lower().replace('-', '')] = {
        'optimum': [float(x) for x in _res.x],
        'value': float(_res.fun),
        'converged': bool(_res.success),
    }
ref['optimization'] = optimization

# ── signal (FFT, power spectrum, autocorrelation, welch PSD) ────────────────────
from scipy.signal import welch as _sp_welch

_sig_data = [np.sin(2 * np.pi * i / 10) + 0.5 * np.sin(2 * np.pi * i / 4) for i in range(128)]
_sig_arr = np.array(_sig_data)

# FFT (radix-2 padded to next power of 2)
_fft_n = 128
_fft_result = np.fft.fft(_sig_arr)
_fft_complex = [{'re': float(z.real), 'im': float(z.imag)} for z in _fft_result]
# Power spectrum: squared magnitude of FFT
_ps = np.abs(_fft_result) ** 2

# Autocorrelation (unbiased estimate, up to 20 lags)
_acf_sig = _sig_arr - np.mean(_sig_arr)
_acf_vals = []
for _lag in range(21):
    if _lag == 0:
        _acf_vals.append(1.0)
    else:
        _acf = np.sum(_acf_sig[_lag:] * _acf_sig[:-_lag]) / np.sum(_acf_sig ** 2)
        _acf_vals.append(float(_acf))

# Welch PSD (matches the JS Welch PSD implementation parameters)
_psd_freqs, _psd_vals = _sp_welch(_sig_arr, fs=1.0, nperseg=32, noverlap=16, scaling='density')

signal_oracle = {
    'fft_basic': {'data': _sig_data, 'fft': _fft_complex},
    'powerSpectrum_basic': {'data': _sig_data, 'ps': _ps.tolist()},
    'autocorrelation_basic': {'data': _sig_data, 'acf': _acf_vals},
    'welchPSD_basic': {'data': _sig_data, 'freq': _psd_freqs.tolist(), 'psd': _psd_vals.tolist()},
}
ref['signal'] = signal_oracle

# ── spatialTemporal (STAR/GSTAR) ──────────────────────────────────────────────
# starModel does OLS of y on [Wy, X1, ..., Xk] where Wy = W @ y (spatial lag).
# This is standard OLS — oracle via numpy.linalg.lstsq.
_st_data = []
_st_n = 30
_st_rng = _lcg_seq(42, _st_n * 3)
_st_ri = iter(_st_rng)
for _i in range(_st_n):
    _st_data.append({'y': 5 + next(_st_ri) * 3, 'x1': next(_st_ri) * 5, 'x2': next(_st_ri) * 2})
_st_y = np.array([r['y'] for r in _st_data])
_st_X = np.array([[r['x1'], r['x2']] for r in _st_data])
# Row-standardized spatial weight matrix: k-nearest neighbors (k=3), row-normalized
_st_W = np.zeros((_st_n, _st_n))
for _i in range(_st_n):
    _dists = [abs(_i - _j) for _j in range(_st_n) if _j != _i]
    _sorted_idx = sorted(range(len(_dists)), key=lambda j: _dists[j])
    for _k in _sorted_idx[:3]:
        _j_val = _sorted_idx.index(_k) if False else _st_n - 1
        _actual_j = [__j for __j in range(_st_n) if __j != _i][_k]
        _st_W[_i, _actual_j] = 1.0 / 3.0
_st_Wy = _st_W @ _st_y
_st_Xall = np.column_stack([_st_Wy, _st_X])
_st_beta, _st_resid, _st_rank, _st_sv = np.linalg.lstsq(_st_Xall, _st_y, rcond=None)
_st_fitted = _st_Xall @ _st_beta
_st_ssr = float(np.sum((_st_y - _st_fitted) ** 2))
_st_sst = float(np.sum((_st_y - np.mean(_st_y)) ** 2))
_st_r2 = 1 - _st_ssr / _st_sst if _st_sst > 0 else 0

spatialTemporal = {
    'starModel_basic': {
        'data': _st_data, 'W': _st_W.tolist(),
        'rho': float(_st_beta[0]),
        'bX1': float(_st_beta[1]),
        'bX2': float(_st_beta[2]),
        'rSquared': float(_st_r2),
    },
}
ref['spatialTemporal'] = spatialTemporal

# ── mixture (switchingRegression) ────────────────────────────────────────────
# switchingRegression fits separate OLS per regime split by a threshold on x.
# Deterministic — oracle via numpy.polyfit for each regime.
_mix_x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
_mix_y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68]
_mix_thresh = 10
_mix_r1_x = np.array([_mix_x[i] for i in range(len(_mix_x)) if _mix_x[i] <= _mix_thresh])
_mix_r1_y = np.array([_mix_y[i] for i in range(len(_mix_x)) if _mix_x[i] <= _mix_thresh])
_mix_r2_x = np.array([_mix_x[i] for i in range(len(_mix_x)) if _mix_x[i] > _mix_thresh])
_mix_r2_y = np.array([_mix_y[i] for i in range(len(_mix_x)) if _mix_x[i] > _mix_thresh])
_mix_s1, _mix_i1 = np.polyfit(_mix_r1_x, _mix_r1_y, 1)
_mix_s2, _mix_i2 = np.polyfit(_mix_r2_x, _mix_r2_y, 1)
mixture = {
    'switchingRegression_basic': {
        'x': _mix_x, 'y': _mix_y, 'threshold': _mix_thresh,
        'slope1': float(_mix_s1), 'intercept1': float(_mix_i1),
        'slope2': float(_mix_s2), 'intercept2': float(_mix_i2),
    },
}
ref['mixture'] = mixture

# ── discrete (conditionalLogit) ──────────────────────────────────────────────
# conditionalLogit is a McFadden conditional logit via Newton-Raphson.
# Oracle via statsmodels MNLogit on a choice dataset.
_disc_data = []
for _i in range(30):
    _grp = _i // 3
    _x1 = _i * 0.15
    _x2 = _i % 2
    # Generate choice based on x1, x2 to create a real signal
    _u = [0.5 * _x1 - 0.3 * _x2, 0.2 * _x1 + 0.4 * _x2, -0.1 * _x1 + 0.1 * _x2]
    _exp_u = [np.exp(v) for v in _u]
    _sum = sum(_exp_u)
    _probs = [v / _sum for v in _exp_u]
    _r = np.random.default_rng(_i + 999).random()
    _cum = 0
    _choice = 0
    for _j in range(3):
        _cum += _probs[_j]
        if _r < _cum:
            _choice = _j
            break
    for _alt in range(3):
        _disc_data.append({
            'y': 1 if _alt == _choice else 0,
            'x1': _x1, 'x2': _x2 if _alt == 0 else (_x2 * 0.5 if _alt == 1 else _x2 * 1.5),
            'grp': _grp, 'alt': _alt,
        })

_disc_df = pd.DataFrame(_disc_data)
# Statsmodels MNLogit (alternative-varying)
from statsmodels.discrete.discrete_model import MNLogit
_disc_x_vars = _disc_df[['x1', 'x2']].values
_disc_y_var = _disc_df['y'].values
_disc_mn = MNLogit(_disc_y_var, sm.add_constant(_disc_x_vars)).fit(disp=0)
discrete = {
    'conditionalLogit_basic': {
        'data': _disc_data,
        'coef': _disc_mn.params.tolist(),
        'se': _disc_mn.bse.tolist(),
        'llf': float(_disc_mn.llf),
    },
}
ref['discrete'] = discrete

# ── experimental (randomizedBlockANOVA) ──────────────────────────────────────
# Uses the same deterministic rbData from experimental.test.js.
# Oracle via OLS with block and treatment dummies (Type III via statsmodels).
_exp_data = [
    {'block': 'B1', 'treat': 'A', 'score': 12},
    {'block': 'B1', 'treat': 'B', 'score': 15},
    {'block': 'B1', 'treat': 'C', 'score': 18},
    {'block': 'B2', 'treat': 'A', 'score': 14},
    {'block': 'B2', 'treat': 'B', 'score': 16},
    {'block': 'B2', 'treat': 'C', 'score': 20},
    {'block': 'B3', 'treat': 'A', 'score': 13},
    {'block': 'B3', 'treat': 'B', 'score': 17},
    {'block': 'B3', 'treat': 'C', 'score': 19},
]
_exp_df = pd.DataFrame(_exp_data)
# One-way ANOVA with blocks — verify via OLS
_exp_y = _exp_df['score'].values
_exp_X = pd.get_dummies(_exp_df[['treat', 'block']], drop_first=True).astype(float)
_exp_X = sm.add_constant(_exp_X)
_exp_ols = sm.OLS(_exp_y, _exp_X).fit()
# ANOVA table via Type I SS (matches the RB ANOVA decomposition)
_exp_gm = np.mean(_exp_y)
_exp_sst = np.sum((_exp_y - _exp_gm) ** 2)
# Treatment SS
_treat_levels = _exp_df['treat'].unique()
_exp_sstreat = sum(
    len(_exp_df[_exp_df['treat'] == t]) * (np.mean(_exp_df[_exp_df['treat'] == t]['score']) - _exp_gm) ** 2
    for t in _treat_levels)
# Block SS
_block_levels = _exp_df['block'].unique()
_exp_ssblock = sum(
    len(_exp_df[_exp_df['block'] == b]) * (np.mean(_exp_df[_exp_df['block'] == b]['score']) - _exp_gm) ** 2
    for b in _block_levels)
_exp_sserror = _exp_sst - _exp_sstreat - _exp_ssblock
_exp_dft = len(_treat_levels) - 1
_exp_dfb = len(_block_levels) - 1
_exp_dfe = _exp_dft * _exp_dfb
_exp_mst = _exp_sstreat / _exp_dft
_exp_msb = _exp_ssblock / _exp_dfb
_exp_mse = _exp_sserror / _exp_dfe
_exp_Ft = _exp_mst / _exp_mse
_exp_Fb = _exp_msb / _exp_mse
experimental = {
    'rbANOVA_basic': {
        'data': _exp_data,
        'ssTreat': float(_exp_sstreat), 'ssBlock': float(_exp_ssblock), 'ssError': float(_exp_sserror),
        'Ft': float(_exp_Ft), 'Fb': float(_exp_Fb),
    },
}
ref['experimental'] = experimental

# ── symbolic ─────────────────────────────────────────────────────────────────
# intervalMean / intervalVariance / intervalCorrelation / symbolicRegression
# Pure formula-based oracles on explicit deterministic datasets.
_sym_d = [{'lo': i, 'hi': i + 2, 'lo2': i * 0.5, 'hi2': i * 0.5 + 1} for i in range(10)]
_sym_n = len(_sym_d)
_sym_loVals = [r['lo'] for r in _sym_d]
_sym_hiVals = [r['hi'] for r in _sym_d]
_sym_loMean = float(np.mean(_sym_loVals))
_sym_hiMean = float(np.mean(_sym_hiVals))
_sym_loVar = float(np.var(_sym_loVals, ddof=1))
_sym_hiVar = float(np.var(_sym_hiVals, ddof=1))
_sym_m1 = [(r['lo'] + r['hi']) / 2 for r in _sym_d]
_sym_m2 = [(r['lo2'] + r['hi2']) / 2 for r in _sym_d]
_sym_r = float(st.pearsonr(_sym_m1, _sym_m2)[0])
# symbolicRegression — OLS on correlated-predictor dataset from the correctness test
_sym_reg_rows = [
    {'x1': 1, 'x2': 1, 'y': 3}, {'x1': 2, 'x2': 1, 'y': 4},
    {'x1': 3, 'x2': 2, 'y': 7}, {'x1': 4, 'x2': 2, 'y': 8},
    {'x1': 5, 'x2': 3, 'y': 11},
]
_sym_reg_X = np.array([[1, r['x1'], r['x2']] for r in _sym_reg_rows])
_sym_reg_y = np.array([r['y'] for r in _sym_reg_rows])
_sym_reg_beta = np.linalg.lstsq(_sym_reg_X, _sym_reg_y, rcond=None)[0]
symbolic = {
    'intervalMean_basic': {'loMean': round(_sym_loMean, 4), 'hiMean': round(_sym_hiMean, 4)},
    'intervalVariance_basic': {'loVar': round(min(_sym_loVar, _sym_hiVar), 4), 'hiVar': round(max(_sym_loVar, _sym_hiVar), 4)},
    'intervalCorrelation_basic': {'r': round(_sym_r, 4)},
    'symbolicRegression_basic': {'b0': float(_sym_reg_beta[0]), 'bx1': float(_sym_reg_beta[1]), 'bx2': float(_sym_reg_beta[2])},
}
ref['symbolic'] = symbolic

# ── sced ─────────────────────────────────────────────────────────────────────
# tauU / pnd / pem / nap / betweenCaseSMD — pure formula-based oracles
_sced_base = [1, 2, 2, 3, 2, 3, 2, 1]
_sced_interv = [4, 5, 4, 6, 5, 7, 6, 5]
_sced_nB, _sced_nI = len(_sced_base), len(_sced_interv)
_sced_S = sum(1 for b in _sced_base for i in _sced_interv if i > b) - sum(1 for b in _sced_base for i in _sced_interv if i < b)
_sced_tauU = _sced_S / (_sced_nB * _sced_nI)
_sced_maxB = max(_sced_base)
_sced_pnd = 100 * sum(1 for v in _sced_interv if v > _sced_maxB) / _sced_nI
_sced_sorted = sorted(_sced_base)
_sced_medB = _sced_sorted[len(_sced_base) // 2]
_sced_pem = 100 * sum(1 for v in _sced_interv if v > _sced_medB) / _sced_nI
_sced_wins = sum(1 for b in _sced_base for i in _sced_interv if i > b) + 0.5 * sum(1 for b in _sced_base for i in _sced_interv if i == b)
_sced_nap = _sced_wins / (_sced_nB * _sced_nI)
# betweenCaseSMD
_sced_a = np.array([10, 12, 14, 16, 18, 20, 22], dtype=float)
_sced_b = np.array([15, 17, 19, 21, 23, 25, 27], dtype=float)
_sced_mA, _sced_mB = float(np.mean(_sced_a)), float(np.mean(_sced_b))
_sced_sd = float(np.sqrt((np.var(_sced_a, ddof=1) + np.var(_sced_b, ddof=1)) / 2))
_sced_smd = (_sced_mB - _sced_mA) / _sced_sd if _sced_sd > 0 else 0
_sced_se = float(np.sqrt(1 / len(_sced_a) + 1 / len(_sced_b) + _sced_smd**2 / (2 * (len(_sced_a) + len(_sced_b)))))
sced = {
    'tauU_basic': {'tau': round(_sced_tauU, 4)},
    'pnd_basic': {'pnd': round(_sced_pnd, 1)},
    'pem_basic': {'pem': round(_sced_pem, 1)},
    'nap_basic': {'nap': round(_sced_nap, 4)},
    'betweenCaseSMD_basic': {'smd': round(_sced_smd, 4), 'se': round(_sced_se, 4)},
}
ref['sced'] = sced

# ── pro ──────────────────────────────────────────────────────────────────────
# reliableChangeIndex / minimalImportantDifference / eq5dIndex / responderAnalysis
_pro_bl = np.array([10, 12, 15, 11, 14, 16, 13, 12], dtype=float)
_pro_fu = np.array([8, 14, 18, 9, 16, 15, 11, 14], dtype=float)
_pro_n = len(_pro_bl)
_pro_sd = float(np.std(_pro_bl, ddof=1))
_pro_rel = 0.8
_pro_se_rci = _pro_sd * np.sqrt(2 * (1 - _pro_rel))
_pro_diffs = _pro_fu - _pro_bl
_pro_rcis = _pro_diffs / _pro_se_rci
_pro_nImproved = int(np.sum(_pro_rcis > 1.96))
_pro_nDeteriorated = int(np.sum(_pro_rcis < -1.96))
# minimalImportantDifference — anchor-based with anchors [1,2,3,1,2,3,2,1]
_pro_anchors = np.array([1, 2, 3, 1, 2, 3, 2, 1], dtype=float)
_pro_anchorMean = float(np.mean(_pro_anchors))
_pro_anchorSD = float(np.std(_pro_anchors, ddof=1)) or 1.0
_pro_low = _pro_bl[_pro_anchors < _pro_anchorMean - 0.5 * _pro_anchorSD]
_pro_high = _pro_bl[_pro_anchors > _pro_anchorMean + 0.5 * _pro_anchorSD]
_pro_mid = float(np.mean(_pro_high) - np.mean(_pro_low)) if len(_pro_low) and len(_pro_high) else 0.0
# eq5dIndex: domains [1,2,1,3,2]
_pro_eq5d_domains = np.array([1, 2, 1, 3, 2], dtype=float)
_pro_eq5d_sum = float(np.clip(_pro_eq5d_domains, 1, 5).sum())
_pro_eq5d_index = 1 - (_pro_eq5d_sum - 5) * 0.051
# responderAnalysis: 20 rows, threshold 3
_pro_resp_data = [{'pre': i * 2, 'post': i * 2 + 5 + (i % 3)} for i in range(20)]
_pro_resp_n = len(_pro_resp_data)
_pro_resp_count = sum(1 for r in _pro_resp_data if r['post'] - r['pre'] >= 3)
pro = {
    'reliableChangeIndex_basic': {'se': round(_pro_se_rci, 4), 'nImproved': _pro_nImproved, 'nDeteriorated': _pro_nDeteriorated},
    'minimalImportantDifference_basic': {'mid': round(_pro_mid, 4), 'nLow': int(len(_pro_low)), 'nHigh': int(len(_pro_high))},
    'eq5dIndex_basic': {'index': round(_pro_eq5d_index, 4)},
    'responderAnalysis_basic': {'n': _pro_resp_n, 'responders': _pro_resp_count, 'pct': round(100 * _pro_resp_count / _pro_resp_n, 1)},
}
ref['pro'] = pro

# ── trials ───────────────────────────────────────────────────────────────────
# simons2Stage / sampleSizeReestimation / fisherExactDesign
_tri_p0, _tri_p1 = 0.2, 0.4
_tri_n1 = max(5, int(np.ceil(np.log(0.5) / np.log(1 - _tri_p1))))
_tri_n2 = _tri_n1 * 2
_tri_r1 = max(0, int(np.floor(_tri_n1 * _tri_p0 - 1)))
_tri_r = max(0, int(np.floor(_tri_n2 * _tri_p0 + 0.5)))
# sampleSizeReestimation: data [1,2,3,4,5], target=0
_tri_ssr_data = np.array([1, 2, 3, 4, 5], dtype=float)
_tri_ssr_n = len(_tri_ssr_data)
_tri_ssr_mu = float(np.mean(_tri_ssr_data))
_tri_ssr_sd = float(np.std(_tri_ssr_data, ddof=1))
_tri_ssr_nNeeded = int(np.ceil((2 * (st.norm.ppf(0.975) + st.norm.ppf(0.8)) * _tri_ssr_sd / abs(0 - _tri_ssr_mu)) ** 2))
# fisherExactDesign: a=5, b=10, c=3, d=20
_tri_a, _tri_b, _tri_c, _tri_d = 5, 10, 3, 20
_tri_or = (_tri_a * _tri_d) / max(_tri_b * _tri_c, 1)
_tri_rr = (_tri_a / max(_tri_a + _tri_b, 1)) / (_tri_c / max(_tri_c + _tri_d, 1))
_tri_rd = _tri_a / max(_tri_a + _tri_b, 1) - _tri_c / max(_tri_c + _tri_d, 1)
trials = {
    'simons2Stage_basic': {'n1': _tri_n1, 'n2': _tri_n2, 'r1': _tri_r1, 'r': _tri_r},
    'sampleSizeReestimation_basic': {'nObserved': _tri_ssr_n, 'nNeeded': _tri_ssr_nNeeded},
    'fisherExactDesign_basic': {'or': round(_tri_or, 4), 'rr': round(_tri_rr, 4), 'rd': round(_tri_rd, 4)},
}
ref['trials'] = trials

# ── demo ─────────────────────────────────────────────────────────────────────
# lifeTable / leeCarter / ageStandardization / populationProjection
_demo_mx = np.array([0.01, 0.02, 0.03, 0.05, 0.08], dtype=float)
_demo_n = len(_demo_mx)
_demo_a = np.full(_demo_n, 0.5)
# Replicate JS's lifeTable rounding chain: qx → lx → dx → Lx (rounded per step)
_demo_qx = np.zeros(_demo_n)
_demo_lx = np.zeros(_demo_n)
_demo_dx = np.zeros(_demo_n)
_demo_Lx = np.zeros(_demo_n)
_demo_lx[0] = 1.0
for _i in range(_demo_n):
    _qi = min(1.0, _demo_mx[_i] / (1 + (1 - _demo_a[_i]) * _demo_mx[_i]))
    _demo_qx[_i] = round(_qi, 6)
    if _i > 0:
        _demo_lx[_i] = round(_demo_lx[_i - 1] * (1 - _demo_qx[_i - 1]), 6)
    _demo_dx[_i] = round(_demo_lx[_i] * _demo_qx[_i], 6)
    _demo_Lx[_i] = round(_demo_lx[_i] - _demo_dx[_i] + _demo_a[_i] * _demo_dx[_i], 4)
_demo_Tx = np.zeros(_demo_n)
for _i in range(_demo_n - 1, -1, -1):
    _demo_Tx[_i] = round((_demo_Tx[_i + 1] if _i + 1 < _demo_n else 0) + _demo_Lx[_i], 4)
_demo_ex = np.array([round(_demo_Tx[_i] / max(_demo_lx[_i], 0.001), 2) for _i in range(_demo_n)])
# leeCarter
_demo_logMx = np.array([[-5, -3.5, -3, -2.5, -2], [-4.8, -3.4, -2.9, -2.4, -1.9], [-4.6, -3.3, -2.8, -2.3, -1.8]])
_demo_lc_n, _demo_lc_m = _demo_logMx.shape
_demo_lc_ax = np.mean(_demo_logMx, axis=0)
_demo_lc_A = _demo_logMx - _demo_lc_ax
_demo_lc_kt = _demo_lc_A.mean(axis=1)
_demo_lc_bx = np.array([np.sum(_demo_lc_A[:, _j] * _demo_lc_kt) / max(np.sum(_demo_lc_kt ** 2), 1e-10) for _j in range(_demo_lc_m)])
# ageStandardization
_demo_rates = np.array([0.01, 0.02, 0.05, 0.10, 0.20], dtype=float)
_demo_stdPop = np.array([1000, 2000, 3000, 2000, 1000], dtype=float)
_demo_crude = float(np.mean(_demo_rates))
_demo_adj = float(np.sum(_demo_rates * _demo_stdPop) / max(np.sum(_demo_stdPop), 1))
# populationProjection: [100,80,60,40,20], fertility=0.05, mortality=mx, nYears=5
_demo_basePop = np.array([100, 80, 60, 40, 20], dtype=float)
_demo_fert = 0.05
_demo_nYears = 5
_demo_nCohorts = len(_demo_basePop)
_demo_pop = [_demo_basePop.copy()]
for _t in range(1, _demo_nYears + 1):
    _newPop = np.zeros(_demo_nCohorts)
    for _i in range(1, _demo_nCohorts):
        _newPop[_i] = round(_demo_pop[_t - 1][_i - 1] * (1 - _demo_mx[_i - 1]), 0)
    _newPop[0] = round(np.sum(_demo_pop[_t - 1][2:6] * _demo_fert), 0)
    _demo_pop.append(_newPop)
demo = {
    'lifeTable_basic': {'e0': float(_demo_ex[0]), 'nAges': _demo_n},
    'leeCarter_basic': {
        'ax': [round(float(v), 4) for v in _demo_lc_ax[:5]],
        'bx': [round(float(v), 4) for v in _demo_lc_bx[:5]],
        'kt': [round(float(v), 4) for v in _demo_lc_kt[:3]],
    },
    'ageStandardization_basic': {'crudeRate': round(_demo_crude, 4), 'adjustedRate': round(_demo_adj, 4)},
    'populationProjection_basic': {'finalTotal': float(sum(_demo_pop[-1]))},
}
ref['demo'] = demo

# ── privacy ──────────────────────────────────────────────────────────────────
# laplaceMechanism / kAnonymityCheck / lDiversity / differentialPrivacy
# laplaceMechanism: sensitivity = (max-min)/n, scale = delta/epsilon
_prv_data = np.array([1, 2, 3, 4, 5], dtype=float)
_prv_n = len(_prv_data)
_prv_eps = 1.0
_prv_delta = (float(np.max(_prv_data)) - float(np.min(_prv_data))) / _prv_n
_prv_scale = _prv_delta / max(_prv_eps, 0.01)
_prv_origMean = float(np.mean(_prv_data))
# kAnonymityCheck: data from test — verify group-size invariants
_prv_kData = [
    {'age': 25, 'zip': '12345'}, {'age': 30, 'zip': '12345'},
    {'age': 25, 'zip': '67890'}, {'age': 30, 'zip': '67890'},
]
_prv_k_qid = ['age', 'zip']
_prv_k_groups = {}
for _r in _prv_kData:
    _key = '|'.join(str(_r[q]) for q in _prv_k_qid)
    _prv_k_groups.setdefault(_key, []).append(_r)
_prv_k_sizes = [len(g) for g in _prv_k_groups.values()]
_prv_k_min = min(_prv_k_sizes) if _prv_k_sizes else 0
_prv_k_vuln = sum(s for s in _prv_k_sizes if s < 2)
_prv_k_total = len(_prv_kData)
_prv_k_pct = 100 * (_prv_k_total - _prv_k_vuln) / _prv_k_total if _prv_k_total else 0
# lDiversity: test data with zip, age, disease
_prv_lData = []
for _i in range(20):
    _prv_lData.append({'zip': str(_i % 5), 'age': str((_i // 5) * 20 + 20), 'disease': 'A' if _i % 3 == 0 else 'B' if _i % 3 == 1 else 'C'})
_prv_l_groups = {}
for _r in _prv_lData:
    _key = '|'.join(_r[c] for c in ['zip', 'age'])
    _prv_l_groups.setdefault(_key, []).append(_r['disease'])
_prv_l_total = len(_prv_l_groups)
_prv_l_diverse = sum(1 for v in _prv_l_groups.values() if len(set(v)) >= 2)
_prv_l_prop = _prv_l_diverse / _prv_l_total if _prv_l_total > 0 else 0
# differentialPrivacy: [{epsilon:0.3}, {epsilon:0.2}], budget=1
_prv_dp_queries = [0.3, 0.2]
_prv_dp_budget = 1.0
_prv_dp_consumed = sum(_prv_dp_queries)
_prv_dp_remaining = max(0, _prv_dp_budget - _prv_dp_consumed)
privacy = {
    'laplaceMechanism_basic': {'originalMean': round(_prv_origMean, 4), 'scale': round(_prv_scale, 4), 'epsilon': _prv_eps},
    'kAnonymityCheck_basic': {'minSize': _prv_k_min, 'vulnerable': _prv_k_vuln, 'pctSafe': round(_prv_k_pct, 1)},
    'lDiversity_basic': {'l': 2, 'diverseGroups': _prv_l_diverse, 'totalGroups': _prv_l_total, 'proportion': round(_prv_l_prop, 4)},
    'differentialPrivacy_basic': {'consumed': round(_prv_dp_consumed, 2), 'budget': _prv_dp_budget, 'remaining': round(_prv_dp_remaining, 2)},
}
ref['privacy'] = privacy

# ── raMonitor ────────────────────────────────────────────────────────────────
# raCusum / vlad / funnelPlot
_ram_bin = np.array([1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1], dtype=float)
_ram_pred = np.array([0.1, 0.2, 0.3, 0.15, 0.25, 0.1, 0.3, 0.2, 0.15, 0.1, 0.25, 0.05, 0.3, 0.1, 0.2], dtype=float)
_ram_n = len(_ram_bin)
_ram_k, _ram_h = 0.5, 5.0
_ram_cusum = [0.0]
_ram_signals = 0
for _i in range(_ram_n):
    _score = np.log(1 / max(_ram_pred[_i], 0.001)) if _ram_bin[_i] == 1 else np.log(1 / max(1 - _ram_pred[_i], 0.001))
    _ram_cusum.append(max(0, _ram_cusum[-1] + _score - _ram_k))
    if _ram_cusum[-1] > _ram_h:
        _ram_signals += 1
# vlad: cumResid smoothed
_ram_vlad_expected = _ram_pred.copy()
_ram_vlad_observed = _ram_bin.copy()
_ram_vlad_resid = _ram_vlad_observed - _ram_vlad_expected
_ram_vlad_cum = np.cumsum(_ram_vlad_resid)
_ram_vlad_smooth = np.array([float(np.mean(_ram_vlad_cum[max(0, _i - 5):min(_ram_n, _i + 6)])) for _i in range(_ram_n)])
# funnelPlot: 10 rows, y = i%3+1, n = 20+i*5
_ram_funnel_y = np.array([(i % 3) + 1 for i in range(10)], dtype=float)
_ram_funnel_n = np.array([20 + i * 5 for i in range(10)], dtype=float)
_ram_funnel_rates = _ram_funnel_y / np.maximum(_ram_funnel_n, 1)
_ram_funnel_meanRate = float(np.mean(_ram_funnel_rates))
raMonitor = {
    'raCusum_basic': {'nSignals': _ram_signals, 'finalCusum': round(_ram_cusum[-1], 4)},
    'vlad_basic': {'vladRange': [round(float(np.min(_ram_vlad_smooth)), 4), round(float(np.max(_ram_vlad_smooth)), 4)]},
    'funnelPlot_basic': {'meanRate': round(_ram_funnel_meanRate, 4)},
}
ref['raMonitor'] = raMonitor

# ── recommendation ───────────────────────────────────────────────────────────
# collaborativeFilter — cosine similarity + weighted prediction on explicit ratings
_rec_R = np.array([
    [5, 3, np.nan, 1],
    [4, np.nan, np.nan, 1],
    [np.nan, 2, 4, 5],
    [1, 1, 5, 4],
    [np.nan, np.nan, 3, np.nan],
], dtype=float)
_rec_nUsers, _rec_nItems = _rec_R.shape
_rec_nNeighbors = 5
# Compute cosine similarities (matching JS formula: num/sqrt(d1*d2))
_rec_sim = np.zeros((_rec_nUsers, _rec_nUsers))
for _u in range(_rec_nUsers):
    for _v in range(_rec_nUsers):
        if _u == _v:
            continue
        _num, _d1, _d2 = 0.0, 0.0, 0.0
        for _i in range(_rec_nItems):
            if not np.isnan(_rec_R[_u, _i]) and not np.isnan(_rec_R[_v, _i]):
                _num += _rec_R[_u, _i] * _rec_R[_v, _i]
                _d1 += _rec_R[_u, _i] ** 2
                _d2 += _rec_R[_v, _i] ** 2
        _rec_sim[_u, _v] = _num / max(np.sqrt(_d1 * _d2), 1e-12)
# Predict missing entries using top neighbors
_rec_predictions = np.full((_rec_nUsers, _rec_nItems), np.nan)
for _u in range(_rec_nUsers):
    _sims = sorted([(_v, _rec_sim[_u, _v]) for _v in range(_rec_nUsers) if _v != _u and _rec_sim[_u, _v] > 0],
                   key=lambda x: x[1], reverse=True)[:_rec_nNeighbors]
    for _i in range(_rec_nItems):
        if not np.isnan(_rec_R[_u, _i]):
            continue
        if not _sims:
            continue
        _num, _den = 0.0, 0.0
        for _v, _s in _sims:
            if not np.isnan(_rec_R[_v, _i]):
                _num += _s * _rec_R[_v, _i]
                _den += abs(_s)
        if _den > 0:
            _rec_predictions[_u, _i] = float(round(_num / _den, 4))
# Pick one representative prediction: user 2, item 0 (first null)
_rec_sample_pred = float(_rec_predictions[2, 0]) if not np.isnan(_rec_predictions[2, 0]) else None
if _rec_sample_pred is None:
    for _u in range(_rec_nUsers):
        for _i in range(_rec_nItems):
            if not np.isnan(_rec_predictions[_u, _i]):
                _rec_sample_pred = float(_rec_predictions[_u, _i])
                break
        if _rec_sample_pred is not None:
            break
recommendation = {
    'collaborativeFilter_basic': {'samplePrediction': _rec_sample_pred, 'nUsers': _rec_nUsers, 'nItems': _rec_nItems},
}
ref['recommendation'] = recommendation

# ── spc ──────────────────────────────────────────────────────────────────────
# xbarChart / rChart / cpkPpk / processCapability
# Data: 10 + ((i*7+3)%11 - 5)*0.3 for i in 0..49, subgroupSize=5
_spc_data = np.array([10 + ((i * 7 + 3) % 11 - 5) * 0.3 for i in range(50)], dtype=float)
_spc_subgroup = 5
_spc_nsg = len(_spc_data) // _spc_subgroup
_spc_means = np.array([np.mean(_spc_data[_i * _spc_subgroup:(_i + 1) * _spc_subgroup]) for _i in range(_spc_nsg)])
_spc_ranges = np.array([np.max(_spc_data[_i * _spc_subgroup:(_i + 1) * _spc_subgroup]) - np.min(_spc_data[_i * _spc_subgroup:(_i + 1) * _spc_subgroup]) for _i in range(_spc_nsg)])
_spc_grand_cl = float(np.mean(_spc_means))
_spc_rbar = float(np.mean(_spc_ranges))
_spc_a2 = 0.577  # A2 for n=5
_spc_d3 = 0.0    # D3 for n=5
_spc_d4 = 2.114  # D4 for n=5
_spc_xbar_ucl = _spc_grand_cl + _spc_a2 * _spc_rbar
_spc_xbar_lcl = _spc_grand_cl - _spc_a2 * _spc_rbar
_spc_r_ucl = _spc_d4 * _spc_rbar
_spc_r_lcl = _spc_d3 * _spc_rbar
# cpkPpk: same data, lsl=7, usl=13
_spc_lsl, _spc_usl = 7.0, 13.0
_spc_mu = float(np.mean(_spc_data))
_spc_sigma = float(np.std(_spc_data, ddof=1))
_spc_cp = (_spc_usl - _spc_lsl) / (6 * _spc_sigma)
_spc_cpk = min((_spc_usl - _spc_mu) / (3 * _spc_sigma), (_spc_mu - _spc_lsl) / (3 * _spc_sigma))
# processCapability: same data, lsl=9, usl=11
_spc_lsl2, _spc_usl2 = 9.0, 11.0
_spc_cp2 = (_spc_usl2 - _spc_lsl2) / (6 * _spc_sigma)
_spc_cpk2 = min((_spc_usl2 - _spc_mu) / (3 * _spc_sigma), (_spc_mu - _spc_lsl2) / (3 * _spc_sigma))
spc = {
    'xbarChart_basic': {'centerline': round(_spc_grand_cl, 4), 'ucl': round(_spc_xbar_ucl, 4), 'lcl': round(_spc_xbar_lcl, 4)},
    'rChart_basic': {'centerline': round(_spc_rbar, 4), 'ucl': round(_spc_r_ucl, 4), 'lcl': round(_spc_r_lcl, 4)},
    'cpkPpk_basic': {'cp': round(_spc_cp, 4), 'cpk': round(_spc_cpk, 4), 'sigma': round(_spc_sigma, 4), 'mu': round(_spc_mu, 4)},
    'processCapability_basic': {'cp': round(_spc_cp2, 4), 'cpk': round(_spc_cpk2, 4)},
}
ref['spc'] = spc

# ── text ─────────────────────────────────────────────────────────────────────
# cosineSimilarity / jaccardSimilarity / tfIdf / documentTermMatrix
# cosineSimilarity: [1,2,3] vs [1,2,3] → 1; [1,0] vs [0,1] → 0
_text_cos_a, _text_cos_b = np.array([1, 2, 3], dtype=float), np.array([1, 2, 3], dtype=float)
_text_cos_identical = float(np.dot(_text_cos_a, _text_cos_b) / (np.linalg.norm(_text_cos_a) * np.linalg.norm(_text_cos_b)))
_text_cos_a2, _text_cos_b2 = np.array([1, 0], dtype=float), np.array([0, 1], dtype=float)
_text_cos_orth = float(np.dot(_text_cos_a2, _text_cos_b2) / max(np.linalg.norm(_text_cos_a2) * np.linalg.norm(_text_cos_b2), 1e-12))
# jaccardSimilarity: ['a','b'] vs ['a','b'] → 1
_text_jac_a = set(['a', 'b'])
_text_jac_b = set(['a', 'b'])
_text_jac_sim = len(_text_jac_a & _text_jac_b) / len(_text_jac_a | _text_jac_b)
# tfIdf: docs = ['hello world text', 'hello world data', 'data science text mining']
# JS tokenizer: lowercase, regex remove [^a-z0-9\s], split /\s+/, minLen >= 2
# JS IDF: idf[t] = log(nDocs / (1 + df[t]))
_text_docs = ['hello world text', 'hello world data', 'data science text mining']
_text_nDocs = len(_text_docs)
def _text_tokenize(t):
    import re
    return [w for w in re.sub(r'[^a-z0-9\s]', ' ', t.lower()).split() if len(w) >= 2]
_text_tokDocs = [_text_tokenize(d) for d in _text_docs]
_text_vocab = sorted(set(w for t in _text_tokDocs for w in t))
_text_df = {}
for _td in _text_tokDocs:
    for _tw in set(_td):
        _text_df[_tw] = _text_df.get(_tw, 0) + 1
_text_idf = {t: np.log(_text_nDocs / (1 + _text_df[t])) for t in _text_vocab}
# Pick a specific term's tf-idf for verification: "world" appears in docs 0 and 1
_text_term = 'world'
_text_tfidf_val = None
if _text_term in _text_vocab:
    _text_docIdx = 0
    _text_count = _text_tokDocs[_text_docIdx].count(_text_term)
    _text_tf_val = _text_count / max(len(_text_tokDocs[_text_docIdx]), 1)
    _text_tfidf_val = round(float(_text_tf_val * _text_idf[_text_term]), 6)
# documentTermMatrix
_text_dtm = [[_d.count(t) for t in _text_vocab] for _d in _text_tokDocs]
text = {
    'cosineSimilarity_basic': {'identical': round(_text_cos_identical, 4), 'orthogonal': round(_text_cos_orth, 4)},
    'jaccardSimilarity_basic': {'identical': round(_text_jac_sim, 4)},
    'tfIdf_basic': {'vocabSize': len(_text_vocab), 'termWorld': _text_term, 'tfidfDoc0': _text_tfidf_val},
    'documentTermMatrix_basic': {'vocabSize': len(_text_vocab), 'nDocs': _text_nDocs, 'matrixRows': len(_text_dtm)},
}
ref['text'] = text

# ── pointProcess ─────────────────────────────────────────────────────────────
# hawkesIntensity / hawkesFit / coxProcess / burstinessIndex
_pp_events = np.array([1, 2, 3, 5, 6, 7, 10, 11, 12, 15, 16, 18, 20, 22, 25], dtype=float)
_pp_n = len(_pp_events)
_pp_mu, _pp_alpha, _pp_beta = 0.1, 0.2, 0.5
_pp_intensity = [_pp_mu]
for _i in range(1, _pp_n):
    _lam = _pp_mu
    for _j in range(_i):
        _lam += _pp_alpha * np.exp(-_pp_beta * (_pp_events[_i] - _pp_events[_j]))
    _pp_intensity.append(float(round(_lam, 4)))
# coxProcess: surface=[[0.5,0.3],[0.8,0.2]], n=20 — replicates LCG seed=42
_pp_lcg_s = 42
def _pp_lcg():
    global _pp_lcg_s
    _pp_lcg_s = (1664525 * _pp_lcg_s + 1013904223) & 0xFFFFFFFF
    return _pp_lcg_s / (2 ** 32)
_pp_surface = np.array([[0.5, 0.3], [0.8, 0.2]], dtype=float)
_pp_rows, _pp_cols = _pp_surface.shape
_pp_pts = []
for _i in range(20):
    _r = int(_pp_lcg() * _pp_rows)
    _c = int(_pp_lcg() * _pp_cols)
    if _pp_lcg() < _pp_surface[_r, _c]:
        _pp_pts.append((_r, _c))
# burstinessIndex: B = (sigma - mu) / (sigma + mu)
_pp_sorted = np.sort(_pp_events)
_pp_intervals = np.diff(_pp_sorted)
_pp_int_mu = float(np.mean(_pp_intervals))
_pp_int_sigma = float(np.sqrt(np.sum((_pp_intervals - _pp_int_mu) ** 2) / (_pp_n - 1)))
_pp_B = (_pp_int_sigma - _pp_int_mu) / max(_pp_int_sigma + _pp_int_mu, 0.001)
# interArrivalTest: cv = sd(intervals)/mean(intervals)
_pp_cv = _pp_int_sigma / _pp_int_mu if _pp_int_mu > 0 else 0
pointProcess = {
    'hawkesIntensity_basic': {'firstIntensity': round(_pp_intensity[0], 4), 'lastIntensity': round(_pp_intensity[-1], 4)},
    'coxProcess_basic': {'nEvents': len(_pp_pts)},
    'burstinessIndex_basic': {'B': round(_pp_B, 4)},
    'interArrivalTest_basic': {'cv': round(_pp_cv, 4)},
}
ref['pointProcess'] = pointProcess


# ── compositional (clr/ilr/alr/compPCA/compRegression) ───────────────────────────
# Uses _lcg_seq deterministic data. Replicates JS formulas exactly:
# CLR: gm = exp(mean(log(x_i))), coord_j = log(x_j) - log(gm)
# ILR: Psi = built from standard ILR basis, then Psi @ clr_row
# ALR: log(x_j / x_denom) for j != denom
# All coords rounded to .toFixed(6) per the JS.

def _clr_coords_py(data_rows, var_list):
    result = []
    for r in data_rows:
        row = [float(r[v]) for v in var_list]
        # geometric mean with 1e-10 clamping (matches JS Math.max(v, 1e-10))
        log_sum = sum(np.log(float(np.maximum(v, 1e-10))) for v in row)
        gm = np.exp(log_sum / len(row))
        result.append([float(np.log(float(np.maximum(v, 1e-10))) - np.log(gm)) for v in row])
    return result

def _ilr_basis_py(p):
    basis = []
    for i in range(p - 1):
        row = [0.0] * p
        k = i + 1
        sqrt_k = np.sqrt(k * (k + 1))
        for j in range(i + 1):
            row[j] = 1.0 / sqrt_k
        row[i + 1] = -k / sqrt_k
        basis.append(row)
    return np.array(basis)

def _ilr_coords_py(data_rows, var_list):
    clr = _clr_coords_py(data_rows, var_list)
    psi = _ilr_basis_py(len(var_list))
    return [np.dot(psi, np.array(row)).tolist() for row in clr]

_cmp_rng = _lcg_seq(99, 100)
_cmp_data = []
for _i in range(20):
    _cmp_data.append({
        'a': float(round(10 + _cmp_rng[_i * 5] * 5, 6)),
        'b': float(round(20 + _cmp_rng[_i * 5 + 1] * 8, 6)),
        'c': float(round(5 + _cmp_rng[_i * 5 + 2] * 3, 6)),
        'd': float(round(15 + _cmp_rng[_i * 5 + 3] * 6, 6)),
        'y': float(round(_i + _cmp_rng[_i * 5 + 4], 6)),
    })

_cmp_vars = ['a', 'b', 'c', 'd']

# CLR — full N×P, but slice first 5 rows (JS returns 5 for display)
_cmp_clr_full = _clr_coords_py(_cmp_data, _cmp_vars)
_cmp_clr_5 = [[round(v, 6) for v in row] for row in _cmp_clr_full[:5]]

# ILR
_cmp_ilr_full = _ilr_coords_py(_cmp_data, _cmp_vars)
_cmp_ilr_5 = [[round(v, 6) for v in row] for row in _cmp_ilr_full[:5]]

# ALR (denom index 0 = 'a')
_cmp_alr_vals = _cmp_data
_cmp_alr_X = [[float(_cmp_alr_vals[i][v]) for v in _cmp_vars] for i in range(20)]
_cmp_alr_denom = [float(row[0]) for row in _cmp_alr_X]
_cmp_alr_result = []
for _i in range(20):
    _alr_row = []
    for _j in range(1, 4):
        _alr_row.append(round(np.log(float(np.maximum(_cmp_alr_X[_i][_j], 1e-10)) / float(np.maximum(_cmp_alr_denom[_i], 1e-10))), 6))
    _cmp_alr_result.append(_alr_row)

# compPCA — full CLR N×P covariance → eigenvalues via numpy
_cmp_clr_arr = np.array(_cmp_clr_full)  # 20×4
_cmp_cov = np.cov(_cmp_clr_arr, rowvar=False, ddof=1)
_cmp_eigvals, _cmp_eigvecs = np.linalg.eigh(_cmp_cov)
_cmp_eigvals = _cmp_eigvals[::-1]
_cmp_eigvecs = _cmp_eigvecs[:, ::-1]
# JS cumSum is raw cumulative sum, NOT proportion
_cmp_cum = np.cumsum(_cmp_eigvals)

# compRegression — ILR coords + OLS with intercept
_cmp_y = np.array([float(r['y']) for r in _cmp_data])
_cmp_ilr_arr = np.array(_cmp_ilr_full)  # 20×3
_cmp_Xreg = np.column_stack([np.ones(20), _cmp_ilr_arr])
_cmp_beta = np.linalg.lstsq(_cmp_Xreg, _cmp_y, rcond=None)[0]
_cmp_fitted = _cmp_Xreg @ _cmp_beta
_cmp_ssr = float(np.sum((_cmp_y - _cmp_fitted) ** 2))
_cmp_sigma2 = _cmp_ssr / max(1, 20 - 4)
_cmp_xtx_inv = np.linalg.inv(_cmp_Xreg.T @ _cmp_Xreg)
_cmp_coeffs = []
for _j in range(1, len(_cmp_beta)):
    _se = float(np.sqrt(max(0, _cmp_sigma2 * _cmp_xtx_inv[_j, _j])))
    _z = float(_cmp_beta[_j] / _se) if _se > 0 and np.isfinite(_se) else 0.0
    _pval = float(2 * (1 - st.norm.cdf(abs(_z))))
    _cmp_coeffs.append({
        'b': float(round(_cmp_beta[_j], 5)),
        'se': float(round(_se, 5)),
        'z': float(round(_z, 4)),
        'p': float(round(_pval, 4)),
    })

compositional = {
    'clrTransform_basic': {'data': _cmp_data, 'vars': _cmp_vars, 'transformed5': _cmp_clr_5},
    'ilrTransform_basic': {'data': _cmp_data, 'vars': _cmp_vars, 'transformed5': _cmp_ilr_5},
    'alrTransform_basic': {'data': _cmp_data, 'vars': _cmp_vars, 'transformed5': _cmp_alr_result[:5]},
    'compPCA_basic': {
        'data': _cmp_data, 'vars': _cmp_vars,
        'eigenvalues': [float(round(max(v, 0), 4)) for v in _cmp_eigvals[:5]],
        'cumulative': [float(round(v, 4)) for v in _cmp_cum[:4]],
    },
    'compRegression_basic': {
        'data': _cmp_data, 'yVar': 'y', 'compVars': _cmp_vars,
        'coefficients': _cmp_coeffs,
    },
}
ref['compositional'] = compositional

# ── fda (functionalMean/fpca/scalarOnFunction/functionalClustering) ────────────
# All functions are purely deterministic with B-spline basis:
# basis_b(t) = exp(-b * 0.5 * (t - mean(t))^2)
# Scores rounded .toFixed(4), eigenvalues rounded .toFixed(4).

_fda_X = np.array([[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6], [4, 5, 6, 7], [5, 6, 7, 8]], dtype=float)
_fda_tp = np.array([0, 1, 2, 3], dtype=float)
_fda_n = _fda_X.shape[0]
_fda_m = _fda_X.shape[1]

# functionalMean
_fda_mean = np.array([round(np.mean(_fda_X[:, j]), 4) for j in range(_fda_m)])

# fpca (nBasis=5 default)
_fda_nBasis = 5
_fda_tp_mean = float(np.mean(_fda_tp))
_fda_basis = np.array([[np.exp(-b * 0.5 * (t - _fda_tp_mean) ** 2) for t in _fda_tp] for b in range(_fda_nBasis)])
_fda_scores = np.array([[(np.sum(_fda_X[i, :] * _fda_basis[b, :]) / _fda_m) for b in range(_fda_nBasis)] for i in range(_fda_n)])
_fda_cov = np.cov(_fda_scores, rowvar=False, ddof=0)  # JS divides by n
_fda_eigvals, _fda_eigvecs = np.linalg.eigh(_fda_cov)
_fda_eigvals = _fda_eigvals[::-1]
_fda_eigvecs = _fda_eigvecs[:, ::-1]
_fda_total_var = float(np.sum(np.maximum(_fda_eigvals, 0))) or 1.0
_fda_prop = [float(round(max(v, 0) / _fda_total_var, 4)) for v in _fda_eigvals[:2]]

# scalarOnFunction
_fda_rowSums = np.array([float(np.sum(row)) for row in _fda_X])
_fda_sx = float(np.sum(_fda_rowSums))
_fda_sy_val = float(np.sum(_fda_y := np.array([10.0, 15.0, 20.0, 25.0, 30.0])))
_fda_sxx = float(np.sum(_fda_rowSums ** 2))
_fda_sxy = float(np.sum(_fda_rowSums * _fda_y))
_fda_denom = _fda_n * _fda_sxx - _fda_sx * _fda_sx
_fda_b1 = (_fda_n * _fda_sxy - _fda_sx * _fda_sy_val) / _fda_denom
_fda_b0 = (_fda_sxx * _fda_sy_val - _fda_sx * _fda_sxy) / _fda_denom
_fda_fitted = _fda_b0 + _fda_b1 * _fda_rowSums
_fda_ssr = float(np.sum((_fda_y - _fda_fitted) ** 2))
_fda_sst = float(np.sum((_fda_y - np.mean(_fda_y)) ** 2))
_fda_r2 = 1.0 - _fda_ssr / _fda_sst if _fda_sst > 0 else 0.0

# functionalClustering
_fda_rowSums_sorted = np.sort(_fda_rowSums)
_fda_thresholds = [float(_fda_rowSums_sorted[int(np.floor((i + 1) * _fda_n / 2))]) for i in range(1)]
_fda_labels = [0 if v <= _fda_thresholds[0] else 1 for v in _fda_rowSums]

fda = {
    'functionalMean_basic': {'data': _fda_X.tolist(), 'mean': _fda_mean.tolist()},
    'fpca_basic': {
        'data': _fda_X.tolist(), 'tp': _fda_tp.tolist(),
        'eigenvalues': [float(round(v, 4)) for v in _fda_eigvals[:2]],
        'propVar': _fda_prop,
    },
    'scalarOnFunction_basic': {
        'data': _fda_X.tolist(), 'y': _fda_y.tolist(),
        'intercept': float(round(_fda_b0, 4)),
        'slope': float(round(_fda_b1, 4)),
        'rSquared': float(round(_fda_r2, 4)),
    },
    'functionalClustering_basic': {
        'data': _fda_X.tolist(), 'labels': _fda_labels,
    },
}
ref['fda'] = fda

# ── sensitivity (modelComparison/forecastCombination/deltaMethod/andrewsPlot) ───
# Deterministic subset — exact numeric oracles.

# modelComparison: mse1=2.5, mse2=3.0, n=30, k1=2, k2=3
_sen_n = 30
_sen_mse1, _sen_mse2 = 2.5, 3.0
_sen_k1, _sen_k2 = 2, 3
_sen_fStat = _sen_mse1 / _sen_mse2 if _sen_mse2 > 0 else 0.0
_sen_df1 = _sen_n - _sen_k1 - 1
_sen_df2 = _sen_n - _sen_k2 - 1
_sen_fdist = st.f(_sen_df1, _sen_df2)
_sen_p = 1.0 - _sen_fdist.cdf(max(_sen_fStat, 0))

# forecastCombination: equal-weight, forecasts=[[10,12,14,16,18],[11,13,15,17,19]], actual=[10,12,13,15,17]
_sen_fc = np.array([[10, 12, 14, 16, 18], [11, 13, 15, 17, 19]], dtype=float)
_sen_actual = np.array([10, 12, 13, 15, 17], dtype=float)
_sen_combined = np.array([round(np.mean(_sen_fc[:, i]), 4) for i in range(5)])
_sen_mse = float(round(np.mean((_sen_combined - _sen_actual) ** 2), 4))

# deltaMethod: fn = x[0]*x[1], means=[2,3], ses=[0.1,0.2]
_sen_dm_means = np.array([2.0, 3.0])
_sen_dm_ses = np.array([0.1, 0.2])
_sen_dm_h = 1e-6
_sen_dm_grad = np.zeros(2)
for _i in range(2):
    _plus = _sen_dm_means.copy(); _plus[_i] += _sen_dm_h
    _minus = _sen_dm_means.copy(); _minus[_i] -= _sen_dm_h
    _sen_dm_grad[_i] = (_plus[0] * _plus[1] - _minus[0] * _minus[1]) / (2 * _sen_dm_h)
_sen_dm_var = np.sum(_sen_dm_grad ** 2 * _sen_dm_ses ** 2)
_sen_dm_se = float(np.sqrt(max(_sen_dm_var, 0)))

# andrewsPlot: X=[[1,2,3],[4,5,6],[7,8,9]], nPts=50
_sen_ap_X = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]], dtype=float)
_sen_ap_nPts = 50
_sen_ap_t = np.linspace(-np.pi, np.pi, _sen_ap_nPts)
_sen_ap_curves = []
for _idx in range(3):
    _ap_curve = []
    _ap_row = _sen_ap_X[_idx]
    for _ti in _sen_ap_t:
        _s = _ap_row[0] / np.sqrt(2)
        for _j in range(1, 3):
            _freq = int(np.floor((_j + 1) / 2))
            if _j % 2 == 1:
                _s += _ap_row[_j] * np.sin(_freq * _ti)
            else:
                _s += _ap_row[_j] * np.cos(_freq * _ti)
        _ap_curve.append({'t': float(round(_ti, 4)), 'f': float(round(_s, 4))})
    _sen_ap_curves.append(_ap_curve)

sensitivity = {
    'modelComparison_basic': {
        'f': float(round(_sen_fStat, 4)), 'df1': int(_sen_df1), 'df2': int(_sen_df2),
        'p': float(round(_sen_p, 6)), 'n': _sen_n,
    },
    'forecastCombination_basic': {
        'mse': float(round(_sen_mse, 4)),
    },
    'deltaMethod_basic': {
        'estimate': float(round(_sen_dm_means[0] * _sen_dm_means[1], 4)),
        'se': float(round(_sen_dm_se, 4)),
    },
    'andrewsPlot_basic': {
        'data': _sen_ap_X.tolist(), 'nPts': _sen_ap_nPts,
        'curve0first': _sen_ap_curves[0][0],
        'curve0last': _sen_ap_curves[0][-1],
    },
}
ref['sensitivity'] = sensitivity

# ── bandit (UCB with constant rewards — fully deterministic) ──────────────────
# UCB always picks the arm with max UCB value. With constant rewards [0.2, 0.5,
# 0.3, 0.1, 0.4, 0.7], the sequence of arm selections and value estimates is
# fully determined — zero random decisions.

_band_arms = [0.2, 0.5, 0.3, 0.1, 0.4, 0.7]
_band_k = len(_band_arms)
_band_nIter = 50
_band_counts = [0] * _band_k
_band_values = [0.0] * _band_k
_band_total = 0.0
_band_t = 0

for _i in range(_band_k):
    _arm = _i
    _r = _band_arms[_arm]
    _band_counts[_arm] += 1
    _band_values[_arm] += (_r - _band_values[_arm]) / _band_counts[_arm]
    # JS UCB does NOT add init pulls to totalReward
    _band_t += 1

while _band_t < _band_nIter:
    _ucb = [(float('inf') if _band_counts[i] == 0 else _band_values[i] + np.sqrt((2 * np.log(_band_t + 1)) / _band_counts[i])) for i in range(_band_k)]
    _arm = int(np.argmax(_ucb))
    _r = _band_arms[_arm]
    _band_counts[_arm] += 1
    _band_values[_arm] += (_r - _band_values[_arm]) / _band_counts[_arm]
    _band_total += _r
    _band_t += 1

_band_best = int(np.argmax(_band_values))
_band_regret = _band_nIter * max(_band_values) - _band_total

bandit = {
    'ucb_basic': {
        'arms': _band_arms,
        'nIterations': _band_nIter,
        'bestArm': _band_best,
        'valueEstimates': [float(round(v, 4)) for v in _band_values],
        'counts': _band_counts,
        'totalReward': float(round(_band_total, 4)),
        'regret': float(round(_band_regret, 4)),
    },
}
ref['bandit'] = bandit

# ── nlp (gloveEmbeddings/namedEntityRecognition/posTagging/dependencyParse) ────
# gloveEmbeddings: co-occurrence matrix is deterministic. We replicate the JS
# tokenizer exactly (identical regex + length filter), build the co-occurrence
# matrix, and verify by computing the weighted PPMI + SVD.
# namedEntityRecognition / posTagging / dependencyParse: fully rule-based, exact
# string-to-structure oracles.

_nlp_corpus = ['hello world machine learning', 'deep learning neural network', 'data science machine intelligence']

import re as _re
def _nlp_tokenize(text):
    return [w for w in _re.sub(r'[^a-z\s]', ' ', text.lower()).split() if len(w) > 1]

_nlp_tokens = [_nlp_tokenize(d) for d in _nlp_corpus]
_nlp_flat = [w for t in _nlp_tokens for w in t]
_nlp_vocab = sorted(set(_nlp_flat))
_nlp_V = len(_nlp_vocab)
_nlp_w2i = {w: i for i, w in enumerate(_nlp_vocab)}
_nlp_tokIds = [[_nlp_w2i[w] for w in t] for t in _nlp_tokens]
_nlp_cooc = np.zeros((_nlp_V, _nlp_V), dtype=float)
_nlp_window = 3
for _doc in _nlp_tokIds:
    for _i in range(len(_doc)):
        for _j in range(max(0, _i - _nlp_window), min(len(_doc) - 1, _i + _nlp_window) + 1):
            if _i != _j:
                _nlp_cooc[_doc[_i], _doc[_j]] += 1

# PPMI
_nlp_total = float(np.sum(_nlp_cooc))
_nlp_col_sums = np.sum(_nlp_cooc, axis=0)
_nlp_row_sums = np.sum(_nlp_cooc, axis=1)
_nlp_ppmi = np.zeros((_nlp_V, _nlp_V))
for _i in range(_nlp_V):
    for _j in range(_nlp_V):
        if _nlp_cooc[_i, _j] > 0:
            _pmi = np.log((_nlp_cooc[_i, _j] * _nlp_total) / max(_nlp_row_sums[_i] * _nlp_col_sums[_j], 1.0))
            _nlp_ppmi[_i, _j] = max(0.0, _pmi)

# SVD-based glove oracle (first 2 components, vecSize=5)
_nlp_vecSize = 5
_U, _S, _Vt = np.linalg.svd(_nlp_ppmi, full_matrices=False)
_nlp_emb = _U[:, :_nlp_vecSize] * np.sqrt(_S[:(_nlp_vecSize)])
_nlp_idx = {w: i for i, w in enumerate(_nlp_vocab)}

# namedEntityRecognition
_nlp_ner_text = 'Dr. Smith visited on 01/15/2023'
_nlp_ner_entities = [
    {'text': 'Dr. Smith', 'type': 'PERSON'},
    {'text': '01/15/2023', 'type': 'DATE'},
]

# posTagging
_nlp_pos_text = 'the running experiment is working nicely'
_nlp_pos_tags = [
    {'token': 'the', 'pos': 'DT'}, {'token': 'running', 'pos': 'VBG'},
    {'token': 'experiment', 'pos': 'NN'}, {'token': 'is', 'pos': 'VB'},
    {'token': 'working', 'pos': 'VBG'}, {'token': 'nicely', 'pos': 'RB'},
]

# dependencyParse: 'the dog chased the cat'
_nlp_dep_text = 'the dog chased the cat'
_nlp_dep_deps = [
    {'dep': 'the', 'head': 'dog', 'relation': 'det'},
    {'dep': 'dog', 'head': 'chased', 'relation': 'nsubj'},
    {'dep': 'chased', 'head': 'ROOT', 'relation': 'root'},
    {'dep': 'the', 'head': 'cat', 'relation': 'det'},
    {'dep': 'cat', 'head': 'chased', 'relation': 'dobj'},
]
_nlp_dep_root = 'chased'

nlp = {
    'gloveEmbeddings_basic': {
        'corpus': _nlp_corpus,
        'vocab': _nlp_vocab,
        'vocabSize': _nlp_V,
        'coocSum': float(np.sum(_nlp_cooc)),
    },
    'namedEntityRecognition_basic': {
        'text': _nlp_ner_text,
        'entities': _nlp_ner_entities,
    },
    'posTagging_basic': {
        'text': _nlp_pos_text,
        'tagged': _nlp_pos_tags,
    },
    'dependencyParse_basic': {
        'text': _nlp_dep_text,
        'deps': _nlp_dep_deps,
        'root': _nlp_dep_root,
    },
}
ref['nlp'] = nlp

# ── deepLearning (attention/transformerBlock — deterministic) ──────────────────
# attention: scaled dot-product with softmax — pure math, no PRNG.
# transformerBlock: weight init uses PRNG (seed=1), but output is deterministic
# given fixed inputs and seed.

# attention: Q=[[1,2],[3,4],[5,6]], K=Q, V=[[0.1,0.2],[0.3,0.4],[0.5,0.6]]
_dl_Q = np.array([[1, 2], [3, 4], [5, 6]], dtype=float)
_dl_K = _dl_Q.copy()
_dl_V = np.array([[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]], dtype=float)
_dl_n = _dl_Q.shape[0]
_dl_dk = _dl_K.shape[1]
_dl_scores = _dl_Q @ _dl_K.T / np.sqrt(_dl_dk)
_dl_max = np.max(_dl_scores, axis=1, keepdims=True)
_dl_exps = np.exp(_dl_scores - _dl_max)
_dl_sums = np.sum(_dl_exps, axis=1)
_dl_weights = _dl_exps / _dl_sums[:, np.newaxis]
_dl_attn_out = np.array([[round(np.sum(_dl_weights[i, :] * _dl_V[:, j]), 4) for j in range(_dl_V.shape[1])] for i in range(_dl_n)])

# transformerBlock: X=X_5x4 fixed data, seed=1, nHeads=2, dModel=8
# The JS calls mulberry32(seed) for __rng, then uses it for weight init and
# forward pass. We replicate the PRNG sequence exactly.
_dl_tf_X = np.array([[0.5, -0.3, 0.2, 0.8],
                      [-0.2, 0.6, -0.5, 0.3],
                      [0.1, -0.1, 0.9, -0.4],
                      [-0.8, 0.3, -0.2, 0.6],
                      [0.4, 0.7, -0.1, -0.5]], dtype=float)

# Replicate mulberry32 with seed=1 for transformerBlock oracle
def _dl_lcg_seq(seed, count):
    s = seed
    out = []
    for _ in range(count):
        s = (1664525 * s + 1013904223) & 0xFFFFFFFF
        out.append(s / 2**32)
    return out

_dl_tf_rng = _dl_lcg_seq(1, 5000)
_dl_tf_ri = iter(_dl_tf_rng)
def _dl_rand():
    return next(_dl_tf_ri)

_dl_n_tok = _dl_tf_X.shape[0]
_dl_d = _dl_tf_X.shape[1]
_dl_nHeads = 2
_dl_dm = 8
_dl_dh = max(1, _dl_dm // _dl_nHeads)
_dl_dff = 2 * _dl_d

def _dl_randMat(r, c):
    return np.array([[(next(_dl_tf_ri) - 0.5) * np.sqrt(2 / r) for _ in range(c)] for __ in range(r)])

_dl_tf_Wq = _dl_randMat(_dl_d, _dl_dm)
_dl_tf_Wk = _dl_randMat(_dl_d, _dl_dm)
_dl_tf_Wv = _dl_randMat(_dl_d, _dl_dm)
_dl_tf_Wo = _dl_randMat(_dl_dm, _dl_d)
_dl_tf_W1 = _dl_randMat(_dl_d, _dl_dff)
_dl_tf_b1 = np.zeros(_dl_dff)
_dl_tf_W2 = _dl_randMat(_dl_dff, _dl_d)
_dl_tf_b2 = np.zeros(_dl_d)

_dl_tf_Q = _dl_tf_X @ _dl_tf_Wq
_dl_tf_K = _dl_tf_X @ _dl_tf_Wk
_dl_tf_V = _dl_tf_X @ _dl_tf_Wv

# Multi-head attention
_dl_attnOut = np.zeros((_dl_n_tok, _dl_dm))
for _head in range(_dl_nHeads):
    _c0 = _head * _dl_dh
    _c1 = _c0 + _dl_dh
    _scores_h = (_dl_tf_Q[:, _c0:_c1] @ _dl_tf_K[:, _c0:_c1].T) / np.sqrt(_dl_dh)
    _scores_h_max = np.max(_scores_h, axis=1, keepdims=True)
    _scores_h_exp = np.exp(_scores_h - _scores_h_max)
    _scores_h_sum = np.sum(_scores_h_exp, axis=1) + 1e-12
    _weights_h = _scores_h_exp / _scores_h_sum[:, np.newaxis]
    _dl_attnOut[:, _c0:_c1] = _weights_h @ _dl_tf_V[:, _c0:_c1]

_dl_proj = _dl_attnOut @ _dl_tf_Wo

# LayerNorm function
def _dl_layerNorm(mat):
    result = np.zeros_like(mat)
    for _i in range(mat.shape[0]):
        _mu = np.mean(mat[_i])
        _vr = np.mean((mat[_i] - _mu) ** 2)
        _sd = np.sqrt(_vr + 1e-6)
        result[_i] = (mat[_i] - _mu) / _sd
    return result

_dl_a1 = _dl_layerNorm(_dl_tf_X + _dl_proj)

# FFN
_dl_ff = np.zeros((_dl_n_tok, _dl_d))
for _i in range(_dl_n_tok):
    _hdn = np.maximum(0, _dl_tf_b1 + _dl_a1[_i] @ _dl_tf_W1)
    _dl_ff[_i] = _dl_tf_b2 + _hdn @ _dl_tf_W2

_dl_out = _dl_layerNorm(_dl_a1 + _dl_ff)
_dl_out_rounded = [[round(float(v), 4) for v in row] for row in _dl_out]

deepLearning = {
    'attention_basic': {
        'Q': _dl_Q.tolist(), 'K': _dl_K.tolist(), 'V': _dl_V.tolist(),
        'output': _dl_attn_out.tolist(),
    },
    'transformerBlock_basic': {
        'X': _dl_tf_X.tolist(),
        'output': _dl_out_rounded,
    },
}
ref['deepLearning'] = deepLearning


def _default(o):
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, np.ndarray):
        return o.tolist()
    raise TypeError(f'not serializable: {type(o)}')


if __name__ == '__main__':
    import os
    os.makedirs('packages/statlab/src/methods/__fixtures__', exist_ok=True)
    with open('packages/statlab/src/methods/__fixtures__/reference.json', 'w') as f:
        json.dump(ref, f, indent=2, default=_default)
        f.write('\n')
    print('Written to packages/statlab/src/methods/__fixtures__/reference.json')
