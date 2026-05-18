/** Parse string to number; use fallback only when result is not finite. */
export function parseFinite(str, fallback) {
  const v = parseFloat(str);
  return Number.isFinite(v) ? v : fallback;
}

/** Keep only finite numbers from mapped values. */
export function finiteNums(values) {
  return values.map(v => +v).filter(Number.isFinite);
}

/** Row has finite values for all named numeric columns. */
export function rowFinite(r, cols) {
  return cols.every(c => Number.isFinite(+r[c]));
}

/** Parse comma-separated numbers; drop non-finite. */
export function parseNumList(str) {
  return str.split(',').map(v => parseFloat(v.trim())).filter(Number.isFinite);
}

/** Safe bar chart scale: avoid NaN% when max count is 0. */
export function barHeightPct(count, maxCount) {
  const denom = Math.max(maxCount, 1);
  return `${(count / denom) * 100}%`;
}
