import { describe, expect, it } from 'vitest'
import type { RegressionData } from '@/models'
import { createSeededRandom, distance, norm, numericalGradient, vector } from '@/engine/math'
import { generateLinearNoisy } from '@/engine/data'
import { gradientDescentStep } from '@/engine/ml/optimizers/GradientDescent'
import { leastSquares, linearRegression } from './LinearRegression'

const data: RegressionData = generateLinearNoisy(
  {
    generator: 'linear-noisy',
    trainCount: 40,
    testCount: 10,
    slope: 1.5,
    intercept: 4,
    noise: 1,
    xMin: 0,
    xMax: 10,
  },
  { train: createSeededRandom(11), test: createSeededRandom(12) },
).train

describe('linearRegression', () => {
  it('has zero loss on points that lie exactly on the line', () => {
    const exact: RegressionData = { x: vector(0, 1, 2), y: vector(1, 3, 5) }
    expect(linearRegression.loss(vector(2, 1), exact)).toBe(0)
  })

  it('computes mean squared error', () => {
    const points: RegressionData = { x: vector(0, 1), y: vector(0, 0) }
    // predictions 1 and 3 → errors 1 and 3 → (1 + 9) / 2
    expect(linearRegression.loss(vector(2, 1), points)).toBe(5)
  })

  it('matches a numerical gradient', () => {
    const rng = createSeededRandom(3)
    for (let i = 0; i < 20; i++) {
      const params = vector(rng() * 6 - 3, rng() * 20 - 10)
      const numeric = numericalGradient((p) => linearRegression.loss(p, data), params)
      expect(distance(linearRegression.gradient(params, data), numeric)).toBeLessThan(1e-4)
    }
  })

  it('treats non-finite parameters as out of domain', () => {
    expect(linearRegression.inDomain(vector(1, 2))).toBe(true)
    expect(linearRegression.inDomain(vector(Number.NaN, 2))).toBe(false)
  })
})

describe('leastSquares', () => {
  it('finds the line where the gradient is zero', () => {
    const { w, b } = leastSquares(data)
    expect(norm(linearRegression.gradient(vector(w, b), data))).toBeLessThan(1e-9)
  })

  it('recovers the true line from noisy data', () => {
    const { w, b } = leastSquares(data)
    expect(w).toBeCloseTo(1.5, 0)
    expect(b).toBeCloseTo(4, 0)
  })

  it('is what gradient descent converges to', () => {
    let params = vector(0, 0)
    for (let i = 0; i < 5000; i++) {
      params = gradientDescentStep(linearRegression, params, data, 0.01).params
    }
    const { w, b } = leastSquares(data)
    expect(distance(params, vector(w, b))).toBeLessThan(1e-3)
  })
})
