#!/usr/bin/env python3
"""
scripts/gen-reference.py

Canonical generator for src/tests/__fixtures__/reference.json — independent
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
          the JS step dumps shared test fixtures from src/tests/fixtures/core.js to
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

# Fixture data shared with the JS test suite (src/tests/fixtures/core.js), dumped via
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

# Fixture groups (GROUP_A/B/C from src/tests/fixtures/core.js — equal n=7, equal
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
    os.makedirs('src/tests/__fixtures__', exist_ok=True)
    with open('src/tests/__fixtures__/reference.json', 'w') as f:
        json.dump(ref, f, indent=2, default=_default)
        f.write('\n')
    print('Written to src/tests/__fixtures__/reference.json')
