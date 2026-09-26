import { describe, expect, it } from 'vitest'
import type { ClassificationData } from '@/models'
import { createSeededRandom, distance, numericalGradient, vector } from '@/engine/math'
import { generateTwoBlobs } from '@/engine/data/TwoBlobs'
import { trainGradientDescent } from '@/engine/ml/Train'
import { accuracy, boundaryThrough, logisticRegression, sigmoid } from './LogisticRegression'

const data: ClassificationData = generateTwoBlobs(
  {
    generator: 'two-blobs',
    trainPerClass: 20,
    testPerClass: 5,
    centers: [
      [-1, -0.5],
      [1, 0.6],
    ],
    spread: 0.6,
  },
  { train: createSeededRandom(41), test: createSeededRandom(42) },
).train

describe('sigmoid', () => {
  it('maps scores to probabilities', () => {
    expect(sigmoid(0)).toBe(0.5)
    expect(sigmoid(10)).toBeGreaterThan(0.9999)
    expect(sigmoid(-10)).toBeLessThan(0.0001)
  })
})

describe('logisticRegression', () => {
  it('matches a numerical gradient', () => {
    const rng = createSeededRandom(9)
    for (let i = 0; i < 10; i++) {
      const params = vector(rng() * 4 - 2, rng() * 4 - 2, rng() * 2 - 1)
      const numeric = numericalGradient((p) => logisticRegression.loss(p, data), params)
      expect(distance(logisticRegression.gradient(params, data), numeric)).toBeLessThan(1e-6)
    }
  })

  it('has log(2) loss when it knows nothing (all scores 0)', () => {
    expect(logisticRegression.loss(vector(0, 0, 0), data)).toBeCloseTo(Math.log(2), 12)
  })

  it('stays finite for extreme scores (numerically stable)', () => {
    expect(Number.isFinite(logisticRegression.loss(vector(1e6, 1e6, 0), data))).toBe(true)
  })

  it('learns to separate two clusters with gradient descent', () => {
    const result = trainGradientDescent({
      algorithm: logisticRegression,
      data,
      initial: vector(0, 0, 0),
      learningRate: 0.5,
      maxEpochs: 500,
      isConverged: () => false,
    })
    const last = result.epochs.at(-1)?.params ?? vector(0, 0, 0)
    expect(accuracy(last, data)).toBeGreaterThanOrEqual(0.9)
  })
})

describe('accuracy and boundaryThrough', () => {
  it('scores points left of p→q as class 1, and flipping swaps the sides', () => {
    const points: ClassificationData = {
      x1: vector(0, 0),
      x2: vector(1, -1),
      label: Uint8Array.of(1, 0),
    }
    // Horizontal line y = 0 drawn left to right: "left" is up (y > 0).
    const boundary = boundaryThrough([-1, 0], [1, 0], false)
    expect(accuracy(boundary, points)).toBe(1)
    expect(accuracy(boundaryThrough([-1, 0], [1, 0], true), points)).toBe(0)
  })
})
