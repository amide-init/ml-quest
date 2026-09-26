import type { LandscapeMap, LevelOf, Point } from '@/models'
import { contourLines, createLandscape2D, findLandscapeMinimum, xy } from '@/engine'
import { assertNever } from '@/lib'
import type { EvaluationService } from '@/services/EvaluationService'
import { DescentRunner } from './DescentRunner'
import { LandscapeRunner } from './LandscapeRunner'
import type { LevelRunner } from './LevelRunner'

const CONTOUR_LEVELS = [
  0.02, 0.06, 0.12, 0.2, 0.3, 0.42, 0.56, 0.72, 0.9, 1.1, 1.35, 1.65, 2, 2.45, 3,
]
const CONTOUR_RESOLUTION = 90

/** Runners for loss-landscape levels (W1-L3 step by step, W1-L5 roll from a start). */
export function landscapeRunners(
  level: LevelOf<'landscape-2d'>,
  evaluation: EvaluationService,
  maps: Map<string, LandscapeMap>,
): () => LevelRunner {
  const map = landscapeMap(level, maps)
  const { algorithm } = level
  const optimizer = algorithm.optimizer
  switch (optimizer.id) {
    case 'manual-steps': {
      const narrowed = { ...level, algorithm: { ...algorithm, optimizer } }
      return () => new LandscapeRunner(narrowed, map, evaluation)
    }
    case 'auto-descent': {
      const narrowed = { ...level, algorithm: { ...algorithm, optimizer } }
      return () => new DescentRunner(narrowed, map, evaluation)
    }
    default:
      return assertNever(optimizer)
  }
}

/** Contours and the global minimum are costly to compute, so they are cached per level. */
function landscapeMap(level: LevelOf<'landscape-2d'>, maps: Map<string, LandscapeMap>) {
  const cached = maps.get(level.id)
  if (cached) {
    return cached
  }
  const { landscape, targetRadius, optimizer } = level.algorithm
  const algorithm = createLandscape2D(landscape)
  const minimum = findLandscapeMinimum(algorithm, landscape.bounds)
  const loss = (point: Point) => algorithm.loss(Float64Array.from(point))
  const map: LandscapeMap = {
    kind: 'landscape',
    bounds: landscape.bounds,
    contours: contourLines(
      loss,
      { ...landscape.bounds, resolution: CONTOUR_RESOLUTION },
      CONTOUR_LEVELS.map((value) => minimum.loss + value),
    ),
    levelCount: CONTOUR_LEVELS.length,
    minimum: xy(minimum.point),
    targetRadius,
    play:
      optimizer.id === 'manual-steps'
        ? {
            mode: 'manual-steps',
            stepBudget: optimizer.stepBudget,
            learningRate: optimizer.learningRate,
          }
        : { mode: 'auto-descent', maxSteps: optimizer.maxSteps },
  }
  maps.set(level.id, map)
  return map
}
