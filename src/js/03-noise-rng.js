/* ───────────────────────── Noise & RNG ───────────────────────── */

let rngState = 1;
function seedRng(s) { // mix the seed first: xorshift's early draws are tiny for small seeds like 42
  let x = (s >>> 0) || 1;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x ^= x >>> 16;
  rngState = (x >>> 0) || 1;
  for (let k = 0; k < 3; k++) rand();
}
function rand() {
  let x = rngState;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  rngState = x >>> 0;
  return rngState / 4294967296;
}
function hash2(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function smooth(t) { return t * t * (3 - 2 * t); }
function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = smooth(x - xi), fy = smooth(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
function fbm(x, y, seed, octaves) {
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    v += valueNoise(x * f, y * f, seed + o * 101) * amp;
    norm += amp; amp *= 0.5; f *= 2;
  }
  return v / norm;
}

