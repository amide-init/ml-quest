import { describe, expect, it } from 'vitest'
import type { RegressionData } from '@/models'
import { createSeededRandom, vector } from '@/engine/math'
import { generateLinearNoisy } from '@/engine/data'
import { leastSquares, linearRegression } from './algorithms/LinearRegression'
import { trainGradientDescent } from './Train'

const data: RegressionData = generateLinearNoisy(
  {
    generator: 'linear-noisy',
    trainCount: 24,
    testCount: 5,
    slope: 4,
    intercept: 10,
    noise: 1.2,
    xMin: -1,
    xMax: 1,
  },
  { train: createSeededRandom(21), test: createSeededRandom(22) },
).train
const best = leastSquares(data)
const optimal = linearRegression.loss(vector(best.w, best.b), data)

const train = (learningRate: number, maxEpochs = 60) =>
  trainGradientDescent({
    algorithm: linearRegression,
    data,
    initial: vector(0, 0),
    learningRate,
    maxEpochs,
    isConverged: (loss) => loss - optimal <= 0.05,
  })

describe('trainGradientDescent', () => {
  it('converges with a sensible learning rate and stops at that epoch', () => {
    const result = train(0.5)
    expect(result.status).toBe('converged')
    expect(result.convergedAt).toBe(result.epochs.length - 1)
    expect(result.epochs.at(-1)?.loss).toBeLessThanOrEqual(optimal + 0.05)
  })

  it('records the starting point as epoch 0', () => {
    expect(train(0.5).epochs[0]?.loss).toBe(linearRegression.loss(vector(0, 0), data))
  })

  it('is too slow with a tiny learning rate', () => {
    const result = train(0.01)
    expect(result).toMatchObject({ status: 'too-slow', convergedAt: null })
    expect(result.epochs).toHaveLength(61)
  })

  it('diverges with a huge learning rate, and stops early instead of running away', () => {
    const result = train(1.5)
    expect(result.status).toBe('diverged')
    expect(result.epochs.length).toBeLessThan(61)
  })

  it('takes more epochs when the rate is lower (but still stable)', () => {
    const slow = train(0.2).convergedAt ?? Infinity
    const fast = train(0.6).convergedAt ?? Infinity
    expect(fast).toBeLessThan(slow)
  })
})
