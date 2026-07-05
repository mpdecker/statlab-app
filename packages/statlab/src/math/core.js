// ── Descriptive ───────────────────────────────────────────────────────────────
export const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
export const sampleVar = a => {
  if (a.length < 2) return 0;
  const m = avg(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
};
export const sampleSD = a => Math.sqrt(sampleVar(a));
export const popVar = a => {
  if (!a.length) return 0;
  const m = avg(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length;
};
export const popSD = a => Math.sqrt(popVar(a));
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const corr = (xs, ys) => {
  if (xs.length < 2) return 0;
  const mx = avg(xs), my = avg(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
    ys.reduce((s, y) => s + (y - my) ** 2, 0)
  );
  return den ? num / den : 0;
};
export const median = a => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y), n = s.length;
  return n % 2 ? s[Math.floor(n / 2)] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
export const winsorize = (a, p = 0.1) => {
  const s = [...a].sort((x, y) => x - y);
  const lo = s[Math.floor(p * a.length)];
  const hi = s[Math.ceil((1 - p) * a.length) - 1];
  return a.map(x => Math.max(lo, Math.min(hi, x)));
};
export const trimmedMean = (a, p = 0.2) => {
  const s = [...a].sort((x, y) => x - y);
  const k = Math.floor(p * a.length);
  if (k >= a.length - k) return NaN;
  return avg(s.slice(k, s.length - k));
};

// ── Ranking ───────────────────────────────────────────────────────────────────
export function rank(arr) {
  const idx = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const r = Array(arr.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j < idx.length && idx[j].v === idx[i].v) j++;
    const mr = (i + j + 1) / 2;
    for (let k = i; k < j; k++) r[idx[k].i] = mr;
    i = j;
  }
  return r;
}

// ── Effect size labels ────────────────────────────────────────────────────────
export const effD  = d => Math.abs(d) < .2 ? "negligible" : Math.abs(d) < .5 ? "small" : Math.abs(d) < .8 ? "medium" : "large";
export const effR  = r => Math.abs(r) < .1 ? "negligible" : Math.abs(r) < .3 ? "small" : Math.abs(r) < .5 ? "medium" : "large";
export const effEta = e => e < .01 ? "negligible" : e < .06 ? "small" : e < .14 ? "medium" : "large";
export const effV  = v => v < .1 ? "negligible" : v < .3 ? "small" : v < .5 ? "medium" : "large";

// ── p-value formatting ────────────────────────────────────────────────────────
export const fmtP = p => p < .001 ? "p < .001" : `p = ${p.toFixed(3).replace('0.', '.')}`;
export const sig  = (p, a = .05) => p < a;

// ── Descriptive stats object ──────────────────────────────────────────────────
export function computeStats(arr) {
  if (!arr?.length) return null;
  const n = arr.length, s = [...arr].sort((a, b) => a - b), m = avg(arr), sd = sampleSD(arr);
  const q = p => {
    const i = p * (n - 1), lo = Math.floor(i), hi = Math.ceil(i);
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
  };
  const sk = sd ? arr.reduce((a, x) => a + ((x - m) / sd) ** 3, 0) / n : 0;
  const ku = sd ? arr.reduce((a, x) => a + ((x - m) / sd) ** 4, 0) / n - 3 : 0;
  return {
    n,
    mean:   +m.toFixed(4),
    sd:     +sd.toFixed(4),
    se:     +(sd / Math.sqrt(n)).toFixed(4),
    min:    s[0],
    q1:     +q(.25).toFixed(4),
    median: +q(.5).toFixed(4),
    q3:     +q(.75).toFixed(4),
    max:    s[n - 1],
    skew:   +sk.toFixed(3),
    kurt:   +ku.toFixed(3),
  };
}
