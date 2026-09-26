import { describe, expect, it } from 'vitest'
import { createSeededRandom, hashSeed } from './SeededRandom'

const take = (rng: () => number, count: number) => Array.from({ length: count }, rng)

describe('createSeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    expect(take(createSeededRandom(42), 5)).toEqual(take(createSeededRandom(42), 5))
  })

  it('produces different sequences for different seeds', () => {
    expect(take(createSeededRandom(1), 5)).not.toEqual(take(createSeededRandom(2), 5))
  })

  it('stays in [0, 1) and is roughly uniform', () => {
    const values = take(createSeededRandom(7), 10_000)
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...values)).toBeLessThan(1)
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    expect(mean).toBeCloseTo(0.5, 1)
  })

  it('is stable across releases (golden values)', () => {
    expect(take(createSeededRandom(12345), 3).map((v) => v.toFixed(6))).toMatchInlineSnapshot(`
      [
        "0.979728",
        "0.306752",
        "0.484205",
      ]
    `)
  })
})

describe('hashSeed', () => {
  it('is deterministic and separates purposes', () => {
    expect(hashSeed('w1-l3', 42, 'dataset')).toBe(hashSeed('w1-l3', 42, 'dataset'))
    expect(hashSeed('w1-l3', 42, 'dataset')).not.toBe(hashSeed('w1-l3', 42, 'init'))
  })

  it('does not confuse part boundaries', () => {
    expect(hashSeed('ab', 'c')).not.toBe(hashSeed('a', 'bc'))
  })
})
