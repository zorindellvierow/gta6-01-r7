// Crescent Bay — random (r7 fresh)
// PRNG deterministik: FNV-1a string seed + mulberry32. ES module, tanpa dependensi.

// Hash string menjadi uint32 (FNV-1a 32-bit). Deterministik untuk input yang sama.
export function hashStringSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: kembalikan fungsi pengacak yang menghasilkan [0, 1).
// seed harus uint32 (pakai hashStringSeed untuk string).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bilangan float acak dalam [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Bilangan bulat acak dalam [min, max] (inklusif kedua ujung).
export function int(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// Satu elemen acak dari array (undefined jika array kosong).
export function pick(rng, arr) {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

// true dengan probabilitas p (0..1).
export function chance(rng, p) {
  return rng() < p;
}
