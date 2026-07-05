// src/tests/__fixtures__/helpers.js

/**
 * Asserts exact APA string match. Throws with a diff if it fails.
 * Use this in tests as: expectAPA(result, "t(9) = 2.26, p = .025, d = 0.71 [medium]")
 */
export function expectAPA(result, expected) {
  const got = result?.apa ?? '(no apa property)';
  if (got !== expected) {
    throw new Error(`APA mismatch\n  Got:      ${got}\n  Expected: ${expected}`);
  }
}

/** Assert every key exists on object (contract testing). */
export function expectKeys(obj, keys) {
  keys.forEach(k => {
    if (!(k in obj)) throw new Error(`missing key "${k}"`);
  });
}

/** Standard inference result: has test label and APA string. */
export function expectInferenceResult(r, { allowNull = false } = {}) {
  if (r == null) {
    if (allowNull) return;
    throw new Error('expected non-null result');
  }
  if (typeof r.test !== 'string' || !r.test.length) throw new Error('missing test label');
  if (r.apa != null && (typeof r.apa !== 'string' || !r.apa.length)) {
    throw new Error('invalid apa string');
  }
}

/** p-value in (0, 1] when present */
export function expectPInRange(p) {
  if (p == null) return;
  if (!(p > 0 && p <= 1)) throw new Error(`p out of range: ${p}`);
}
