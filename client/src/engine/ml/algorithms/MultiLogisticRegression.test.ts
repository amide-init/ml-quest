import { describe, expect, it } from 'vitest'
import { applyStandardization, fitStandardization } from '@/engine/data/Standardize'
import { expandFeatures } from '@/engine/data/Polynomial'
import { generateRings } from '@/engine/data/Rings'
import { createSeededRandom, distance, numericalGradient, vector } from '@/engine/math'
import { trainGradientDescent } from '@/engine/ml/Train'
import {
  multiLogisticRegression,
  tabularAccuracy,
  tabularConfusion,
} from './MultiLogisticRegression'

const rings = generateRings(
  {
    generator: 'rings',
    trainPerClass: 30,
    testPerClass: 10,
    innerRadius: 0.8,
    outerRadius: 1.9,
    spread: 0.2,
  },
  { train: createSeededRandom(51), test: createSeededRandom(52) },
).train

const trainOn = (features: Parameters<typeof expandFeatures>[1]) => {
  const raw = expandFeatures(rings, features)
  const data = applyStandardization(raw, fitStandardization(raw))
  const result = trainGradientDescent({
    algorithm: multiLogisticRegression,
    data,
    initial: new Float64Array(features.length + 1),
    learningRate: 0.5,
    maxEpochs: 400,
    isConverged: () => false,
  })
  return tabularAccuracy(
    result.epochs.at(-1)?.params ?? new Float64Array(features.length + 1),
    data,
  )
}

describe('multiLogisticRegression', () => {
  it('matches a numerical gradient', () => {
    const data = expandFeatures(rings, ['x1', 'x2', 'x1^2'])
    const rng = createSeededRandom(6)
    for (let i = 0; i < 8; i++) {
      const params = vector(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1)
      const numeric = numericalGradient((p) => multiLogisticRegression.loss(p, data), params)
      expect(distance(multiLogisticRegression.gradient(params, data), numeric)).toBeLessThan(1e-6)
    }
  })

  it('cannot separate rings with straight lines, but can with squared features (the lesson of W2-L3)', () => {
    expect(trainOn(['x1', 'x2'])).toBeLessThan(0.75)
    expect(trainOn(['x1^2', 'x2^2'])).toBeGreaterThanOrEqual(0.95)
  })
})

describe('expandFeatures', () => {
  it('computes each engineered column', () => {
    const data = expandFeatures(
      { x1: vector(2, 3), x2: vector(5, -1), label: Uint8Array.of(0, 1) },
      ['x1', 'x2', 'x1^2', 'x2^2', 'x1*x2'],
    )
    expect(data.columns.map((column) => [...column])).toEqual([
      [2, 3],
      [5, -1],
      [4, 9],
      [25, 1],
      [10, -3],
    ])
    expect([...data.y]).toEqual([0, 1])
  })

  it('counts the confusion matrix with class 1 as positive', () => {
    // One feature, score = x: positive when x > 0.
    const data = { columns: [Float64Array.of(1, 2, -1, -2, 3)], y: Float64Array.of(1, 0, 1, 0, 1) }
    expect(tabularConfusion(Float64Array.of(1, 0), data)).toEqual({
      truePositives: 2,
      falsePositives: 1,
      trueNegatives: 1,
      falseNegatives: 1,
    })
  })
})
