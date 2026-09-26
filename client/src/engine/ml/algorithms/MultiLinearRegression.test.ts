import { describe, expect, it } from 'vitest'
import type { TabularData } from '@/models'
import { createSeededRandom, distance, norm, numericalGradient, vector } from '@/engine/math'
import { applyStandardization, fitStandardization } from '@/engine/data/Standardize'
import { generateLinearMulti } from '@/engine/data/LinearMulti'
import { trainGradientDescent } from '@/engine/ml/Train'
import { multiLinearRegression, solveLeastSquares } from './MultiLinearRegression'

const data: TabularData = generateLinearMulti(
  {
    generator: 'linear-multi',
    trainCount: 30,
    testCount: 5,
    weights: [3, 0.4],
    intercept: 5,
    noise: 1,
    ranges: [
      [0, 1],
      [0, 10],
    ],
  },
  { train: createSeededRandom(31), test: createSeededRandom(32) },
).train

describe('multiLinearRegression', () => {
  it('matches a numerical gradient', () => {
    const rng = createSeededRandom(4)
    for (let i = 0; i < 10; i++) {
      const params = vector(rng() * 6, rng() * 2, rng() * 10)
      const numeric = numericalGradient((p) => multiLinearRegression.loss(p, data), params)
      expect(distance(multiLinearRegression.gradient(params, data), numeric)).toBeLessThan(1e-4)
    }
  })

  it('is exact on noiseless data', () => {
    const exact: TabularData = {
      columns: [vector(0, 1, 2, 3), vector(1, 0, 2, 5)],
      y: vector(4, 3, 11, 22),
    }
    // y = 2·x1 + 3·x2 + 1
    expect([...solveLeastSquares(exact)].map((v) => Number(v.toFixed(9)))).toEqual([2, 3, 1])
    expect(multiLinearRegression.loss(vector(2, 3, 1), exact)).toBe(0)
  })
})

describe('solveLeastSquares', () => {
  it('finds the point where the gradient vanishes, and recovers the true weights', () => {
    const best = solveLeastSquares(data)
    expect(norm(multiLinearRegression.gradient(best, data))).toBeLessThan(1e-8)
    // Feature 1 spans only 0–1, so with noise 1 and 30 points its weight is known to about ±0.6.
    expect(Math.abs((best[0] ?? 0) - 3)).toBeLessThan(1.5)
    expect(best[1]).toBeCloseTo(0.4, 1)
  })
})

describe('standardization', () => {
  it('gives every feature mean 0 and spread 1, and leaves the target alone', () => {
    const scaled = applyStandardization(data, fitStandardization(data))
    for (const column of scaled.columns) {
      const mean = column.reduce((a, b) => a + b, 0) / column.length
      const spread = Math.sqrt(column.reduce((a, b) => a + (b - mean) ** 2, 0) / column.length)
      expect(mean).toBeCloseTo(0, 10)
      expect(spread).toBeCloseTo(1, 10)
    }
    expect(scaled.y).toBe(data.y)
  })

  it('does not change the best achievable loss', () => {
    const scaled = applyStandardization(data, fitStandardization(data))
    const raw = multiLinearRegression.loss(solveLeastSquares(data), data)
    expect(multiLinearRegression.loss(solveLeastSquares(scaled), scaled)).toBeCloseTo(raw, 10)
  })

  it('makes gradient descent converge much faster (the lesson of W1-L7)', () => {
    const optimal = multiLinearRegression.loss(solveLeastSquares(data), data)
    const epochs = (set: TabularData, learningRate: number) =>
      trainGradientDescent({
        algorithm: multiLinearRegression,
        data: set,
        initial: vector(0, 0, 0),
        learningRate,
        maxEpochs: 3000,
        isConverged: (loss) => loss - optimal <= 0.05,
      }).convergedAt ?? Infinity
    const scaled = applyStandardization(data, fitStandardization(data))
    expect(epochs(scaled, 0.5) * 10).toBeLessThan(epochs(data, 0.03))
  })
})
