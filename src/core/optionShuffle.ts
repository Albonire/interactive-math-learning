/**
 * Display-order shuffling for multiple-choice items (R-OM rule).
 *
 * The data files store the correct answer at a fixed index (often 0). Showing options in that
 * stored order lets a learner pass by position alone. These helpers produce a seeded permutation
 * of the *display* order while answers keep being recorded by their original (data) index, so
 * scoring logic and the data files stay untouched.
 */

/** FNV-1a 32-bit hash of a string, used to turn a stable key into a PRNG seed. */
export function hashStringSeed(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32: tiny, fast, well-distributed 32-bit PRNG returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a permutation of [0, n) where `order[displayPosition] = originalIndex`.
 * The same key always yields the same order (stable across re-renders); a different key
 * (for example, a new attempt number) yields a fresh order.
 */
export function shuffledOptionOrder(n: number, key: string): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const rand = mulberry32(hashStringSeed(key));
  // Fisher-Yates
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** A per-browser-session salt so the order is not identical for every learner and every visit. */
export function createSessionSalt(): string {
  try {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0].toString(36);
  } catch {
    return Math.floor(Math.random() * 2 ** 32).toString(36);
  }
}
