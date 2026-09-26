import { describe, expect, it } from 'vitest'
import type { LandscapeSpec } from '@/models'
import { createSeededRandom, distance, numericalGradient, vector, xy } from '@/engine/math'
import { createLandscape2D } from './Landscape2D'
import { findLandscapeMinimum } from './LandscapeMinimum'

const BOUNDS: LandscapeSpec['bounds'] = { min: [-1, -1], max: [1, 1] }

const BOWL_ONLY: LandscapeSpec = {
  bounds: BOUNDS,
  bowl: { center: [0.3, -0.2], radii: [0.9, 0.4], angleDeg: 30 },
  wells: [],
}

const BUMPY: LandscapeSpec = {
  bounds: BOUNDS,
  bowl: { center: [0, 0], radii: [1.2, 1.2], angleDeg: 0 },
  wells: [
    { center: [-0.5, 0.5], depth: 0.3, width: 0.15 },
    { center: [0.55, -0.45], depth: 0.9, width: 0.2 },
  ],
  ripple: { amplitude: 0.03, frequency: 9 },
}

describe('createLandscape2D', () => {
  it('has zero loss and zero gradient at the centre of a plain bowl', () => {
    const landscape = createLandscape2D(BOWL_ONLY)
    const center = vector(0.3, -0.2)
    expect(landscape.loss(center)).toBeCloseTo(0, 12)
    expect(xy(landscape.gradient(center))).toEqual([0, 0])
  })

  it.each([
    ['bowl only', BOWL_ONLY],
    ['wells and ripple', BUMPY],
  ])('matches a numerical gradient everywhere on the map (%s)', (_name, spec) => {
    const landscape = createLandscape2D(spec)
    const rng = createSeededRandom(2024)
    for (let i = 0; i < 50; i++) {
      const p = vector(rng() * 1.8 - 0.9, rng() * 1.8 - 0.9)
      const analytic = landscape.gradient(p)
      const numeric = numericalGradient((q) => landscape.loss(q), p)
      expect(distance(analytic, numeric)).toBeLessThan(1e-6)
    }
  })

  it('knows where the map ends', () => {
    const landscape = createLandscape2D(BOWL_ONLY)
    expect(landscape.inDomain(vector(1, -1))).toBe(true)
    expect(landscape.inDomain(vector(1.01, 0))).toBe(false)
  })
})

describe('findLandscapeMinimum', () => {
  it('finds the centre of a plain bowl', () => {
    const minimum = findLandscapeMinimum(createLandscape2D(BOWL_ONLY), BOUNDS)
    expect(distance(minimum.point, vector(0.3, -0.2))).toBeLessThan(1e-3)
    expect(minimum.loss).toBeCloseTo(0, 5)
  })

  it('picks the deepest well, not a shallower local minimum', () => {
    const landscape = createLandscape2D(BUMPY)
    const minimum = findLandscapeMinimum(landscape, BOUNDS)
    expect(distance(minimum.point, vector(0.55, -0.45))).toBeLessThan(0.1)
    expect(minimum.loss).toBeLessThan(landscape.loss(vector(-0.5, 0.5)))
  })
})
