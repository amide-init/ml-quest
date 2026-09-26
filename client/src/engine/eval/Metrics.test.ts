import { describe, expect, it } from 'vitest'
import type { LandscapeSpec, TracedCommand } from '@/models'
import { vector } from '@/engine/math'
import { createLandscape2D } from '@/engine/ml'
import { computeMetrics } from './Metrics'

const SPEC: LandscapeSpec = {
  bounds: { min: [-1, -1], max: [1, 1] },
  bowl: { center: [0, 0], radii: [1, 1], angleDeg: 0 },
  wells: [],
}

const trace: TracedCommand[] = [
  { command: { type: 'set-hyperparameter', name: 'learningRate', value: 0.3 }, at: 0 },
  { command: { type: 'step' }, at: 100 },
  { command: { type: 'step' }, at: 200 },
  { command: { type: 'reset' }, at: 300 },
  { command: { type: 'step' }, at: 400 },
]

describe('computeMetrics', () => {
  it('computes every registered metric from the session and the model', () => {
    const metrics = computeMetrics({
      algorithm: createLandscape2D(SPEC),
      data: undefined,
      params: vector(0.3, 0.4),
      trace,
      hintsRevealed: 1,
      globalMinimum: vector(0, 0),
    })
    expect(metrics.steps).toBe(3)
    expect(metrics.hints_used).toBe(1)
    expect(metrics.distance_to_global_min).toBeCloseTo(0.5, 12)
    expect(metrics.final_loss).toBeCloseTo(0.25, 12)
  })

  it('reports NaN distance when the level has no known minimum', () => {
    const metrics = computeMetrics({
      algorithm: createLandscape2D(SPEC),
      data: undefined,
      params: vector(0, 0),
      trace: [],
      hintsRevealed: 0,
    })
    expect(metrics.distance_to_global_min).toBeNaN()
    expect(metrics.steps).toBe(0)
  })
})
