import { describe, expect, it } from 'vitest'
import { generateRings } from '@/engine/data/Rings'
import { expandFeatures } from '@/engine/data/Polynomial'
import { createSeededRandom, distance, numericalGradient, vector } from '@/engine/math'
import { withL2Penalty } from './L2Penalty'
import { multiLogisticRegression } from './MultiLogisticRegression'

const data = expandFeatures(
  generateRings(
    {
      generator: 'rings',
      trainPerClass: 12,
      testPerClass: 4,
      innerRadius: 0.8,
      outerRadius: 1.9,
      spread: 0.2,
    },
    { train: createSeededRandom(7), test: createSeededRandom(8) },
  ).train,
  ['x1', 'x2', 'x1^2'],
)

describe('withL2Penalty', () => {
  it('adds strength/2 · ‖w‖² to the loss, without penalizing the bias', () => {
    const penalized = withL2Penalty(multiLogisticRegression, 0.4)
    const params = vector(1, -2, 0.5, 3)
    const base = multiLogisticRegression.loss(params, data)
    // 0.4 / 2 · (1 + 4 + 0.25) = 1.05; the bias (3) adds nothing.
    expect(penalized.loss(params, data)).toBeCloseTo(base + 1.05, 12)
  })

  it('matches a numerical gradient', () => {
    const penalized = withL2Penalty(multiLogisticRegression, 0.7)
    const params = vector(0.3, -0.8, 1.2, -0.4)
    const numeric = numericalGradient((p) => penalized.loss(p, data), params)
    expect(distance(penalized.gradient(params, data), numeric)).toBeLessThan(1e-6)
  })

  it('returns the algorithm unchanged at strength 0', () => {
    expect(withL2Penalty(multiLogisticRegression, 0)).toBe(multiLogisticRegression)
  })
})
