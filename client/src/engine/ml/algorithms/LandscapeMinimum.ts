import type { Algorithm, LandscapeSpec, Vector } from '@/models'
import { vector } from '@/engine/math'
import { gradientDescentStep } from '@/engine/ml/optimizers/GradientDescent'

export interface LandscapeMinimum {
  readonly point: Vector
  readonly loss: number
}

const GRID_SIZE = 160
const REFINE_STEPS = 400
const REFINE_RATE = 1e-3

/**
 * The landscape's global minimum, used by the "distance to global minimum" metric.
 * A coarse grid search finds the right basin (so local minima can't fool it), then
 * small gradient steps polish the point. Deterministic: no randomness involved.
 */
export function findLandscapeMinimum(
  algorithm: Algorithm,
  bounds: LandscapeSpec['bounds'],
): LandscapeMinimum {
  const [minX, minY] = bounds.min
  const [maxX, maxY] = bounds.max
  let best = vector(minX, minY)
  let bestLoss = Number.POSITIVE_INFINITY

  for (let i = 0; i <= GRID_SIZE; i++) {
    for (let j = 0; j <= GRID_SIZE; j++) {
      const candidate = vector(
        minX + ((maxX - minX) * i) / GRID_SIZE,
        minY + ((maxY - minY) * j) / GRID_SIZE,
      )
      const loss = algorithm.loss(candidate)
      if (loss < bestLoss) {
        best = candidate
        bestLoss = loss
      }
    }
  }

  for (let step = 0; step < REFINE_STEPS; step++) {
    const result = gradientDescentStep(algorithm, best, undefined, REFINE_RATE)
    if (result.status === 'diverged' || result.loss > bestLoss) {
      break
    }
    best = result.params
    bestLoss = result.loss
  }

  return { point: best, loss: bestLoss }
}
