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
