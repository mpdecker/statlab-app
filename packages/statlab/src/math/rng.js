/** Mulberry32 PRNG — deterministic when seeded. @param {number} seed @returns {() => number} a U(0,1) generator. */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let z = Math.imul(s ^ s >>> 15, 1 | s);
    z ^= z + Math.imul(z ^ z >>> 7, 61 | z);
    return ((z ^ z >>> 14) >>> 0) / 4294967296;
  };
}

/** Standard normal draw from a uniform rand(). @param {() => number} rand @returns {number} */
export function boxMullerN(rand) {
  const u = Math.max(rand(), 1e-15);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Bootstrap row indices in [0, n). @param {() => number} rand @param {number} n @returns {number[]} */
export function bootstrapIndices(rand, n) {
  return Array.from({ length: n }, () => Math.floor(rand() * n));
}

/** Gamma(shape, 1) variate via Marsaglia–Tsang; `rand` is a U(0,1) source. @param {() => number} rand @param {number} shape @returns {number} */
export function randGamma(rand, shape) {
  if (shape < 1) return randGamma(rand, shape + 1) * Math.pow(Math.max(rand(), 1e-15), 1 / shape);
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = boxMullerN(rand); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(Math.max(u, 1e-15)) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Beta(a, b) variate as G(a)/(G(a)+G(b)). @param {() => number} rand @param {number} a @param {number} b @returns {number} */
export function randBeta(rand, a, b) {
  const x = randGamma(rand, a), y = randGamma(rand, b);
  return x + y > 0 ? x / (x + y) : 0.5;
}
