/** Mulberry32 PRNG — deterministic when seeded */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
}

/** Standard normal draw from uniform rand() */
export function boxMullerN(rand) {
  const u = Math.max(rand(), 1e-15);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Bootstrap row indices in [0, n) */
export function bootstrapIndices(rand, n) {
  return Array.from({ length: n }, () => Math.floor(rand() * n));
}
