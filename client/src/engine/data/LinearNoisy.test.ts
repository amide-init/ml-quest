import { describe, expect, it } from 'vitest'
import type { LinearNoisySpec } from '@/models'
import { createSeededRandom } from '@/engine/math'
import { gaussian, generateLinearNoisy } from './LinearNoisy'

const SPEC: LinearNoisySpec = {
  generator: 'linear-noisy',
  trainCount: 30,
  testCount: 20,
  slope: 2,
  intercept: 3,
  noise: 1.5,
  xMin: 0,
  xMax: 10,
}

const generate = (trainSeed: number, testSeed: number) =>
  generateLinearNoisy(SPEC, {
    train: createSeededRandom(trainSeed),
    test: createSeededRandom(testSeed),
  })

describe('gaussian', () => {
  it('has mean ≈ 0 and standard deviation ≈ 1', () => {
    const rng = createSeededRandom(5)
    const samples = Array.from({ length: 20_000 }, () => gaussian(rng))
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length
    expect(mean).toBeCloseTo(0, 1)
    expect(Math.sqrt(variance)).toBeCloseTo(1, 1)
  })
})

describe('generateLinearNoisy', () => {
  it('produces the requested sizes inside the x range', () => {
    const { train, test } = generate(1, 2)
    expect(train.x).toHaveLength(30)
    expect(test.y).toHaveLength(20)
    expect(Math.min(...train.x)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...train.x)).toBeLessThanOrEqual(10)
  })

  it('is deterministic for the same seeds', () => {
    expect(generate(1, 2)).toEqual(generate(1, 2))
  })

  it('draws train and test from independent streams', () => {
    const { train, test } = generate(1, 2)
    expect(test.x.slice(0, 5)).not.toEqual(train.x.slice(0, 5))
  })

  it('scatters points around the true line with the given noise', () => {
    const { train } = generate(9, 10)
    const residuals = [...train.x].map((x, i) => (train.y[i] ?? 0) - (2 * x + 3))
    const rms = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / residuals.length)
    expect(rms).toBeGreaterThan(0.8)
    expect(rms).toBeLessThan(2.4)
  })

  it('adds outliers to the training set only, and reports which points they are', () => {
    const split = generateLinearNoisy(
      { ...SPEC, outliers: { count: 4, offset: -8, xMin: 7, xMax: 10 } },
      { train: createSeededRandom(1), test: createSeededRandom(2) },
    )
    expect(split.train.x).toHaveLength(34)
    expect(split.test.x).toHaveLength(20)
    expect(split.outlierIndices).toEqual([30, 31, 32, 33])
    for (const index of split.outlierIndices) {
      const x = split.train.x[index] ?? 0
      const residual = (split.train.y[index] ?? 0) - (2 * x + 3)
      expect(x).toBeGreaterThanOrEqual(7)
      expect(residual).toBeLessThan(-5)
    }
  })

  it('reports no outliers when none are requested', () => {
    expect(generate(1, 2).outlierIndices).toEqual([])
  })
})
