import type { Rng } from '@/models'

/**
 * mulberry32: a tiny, fast 32-bit PRNG. Good enough for datasets and weight init,
 * and identical in every JS runtime, which is what makes levels reproducible.
 */
export function createSeededRandom(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Derive a 32-bit seed from parts, e.g. hashSeed('w1-l3', 42, 'dataset').
 * Separate purposes get independent streams, so adding a random draw for one purpose
 * never shifts the numbers used by another (FNV-1a).
 */
export function hashSeed(...parts: readonly (string | number)[]): number {
  let hash = 0x811c9dc5
  for (const char of parts.join('\u0000')) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
