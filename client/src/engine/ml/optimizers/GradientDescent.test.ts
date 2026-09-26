import { describe, expect, it } from 'vitest'
import type { LandscapeSpec } from '@/models'
import { vector, xy } from '@/engine/math'
import { createLandscape2D } from '@/engine/ml/algorithms/Landscape2D'
import { gradientDescentStep } from './GradientDescent'

const VALLEY: LandscapeSpec = {
  bounds: { min: [-1, -1], max: [1, 1] },
  bowl: { center: [0, 0], radii: [0.8, 0.8], angleDeg: 0 },
  wells: [],
}
const landscape = createLandscape2D(VALLEY)
const start = vector(-0.6, 0.6)

describe('gradientDescentStep', () => {
  it('moves downhill with a sensible learning rate', () => {
    const result = gradientDescentStep(landscape, start, undefined, 0.1)
    expect(result.status).toBe('ok')
    expect(result.loss).toBeLessThan(landscape.loss(start))
  })

  it('steps against the gradient and reports the gradient it used', () => {
    const result = gradientDescentStep(landscape, start, undefined, 0.1)
    const [gx, gy] = xy(result.gradient)
    const [x, y] = xy(result.params)
    expect(x).toBeCloseTo(-0.6 - 0.1 * gx, 12)
    expect(y).toBeCloseTo(0.6 - 0.1 * gy, 12)
  })

  it('does not mutate the input parameters', () => {
    const params = vector(-0.6, 0.6)
    gradientDescentStep(landscape, params, undefined, 0.1)
    expect(xy(params)).toEqual([-0.6, 0.6])
  })

  it('converges over repeated small steps', () => {
    let params = start
    for (let i = 0; i < 60; i++) {
      params = gradientDescentStep(landscape, params, undefined, 0.2).params
    }
    expect(landscape.loss(params)).toBeLessThan(1e-4)
  })

  it('overshoots with a huge learning rate and is marked diverged, not clamped', () => {
    const result = gradientDescentStep(landscape, start, undefined, 5)
    expect(result.status).toBe('diverged')
    expect(landscape.inDomain(result.params)).toBe(false)
  })

  it('reports NaN as diverged', () => {
    const result = gradientDescentStep(landscape, start, undefined, Number.NaN)
    expect(result.status).toBe('diverged')
  })
})
