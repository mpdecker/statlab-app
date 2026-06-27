/** Mulberry32 PRNG — deterministic when seeded */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let z = Math.imul(s ^ s >>> 15, 1 | s);
    z ^= z + Math.imul(z ^ z >>> 7, 61 | z);
    return ((z ^ z >>> 14) >>> 0) / 4294967296;
  };
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
