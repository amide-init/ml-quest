import type { LandscapeMap, LevelConfig, LevelOf, Point } from '@/models'
import { contourLines, createLandscape2D, findLandscapeMinimum, xy } from '@/engine'
import { assertNever } from '@/lib'
import type { EvaluationService } from './EvaluationService'
import { BoundaryRunner } from './training/BoundaryRunner'
import { CleaningRunner } from './training/CleaningRunner'
import { DescentRunner } from './training/DescentRunner'
import { FeatureRunner } from './training/FeatureRunner'
import { GradientDescentRunner } from './training/GradientDescentRunner'
import { LandscapeRunner } from './training/LandscapeRunner'
import type { LevelRunner } from './training/LevelRunner'
import { RegressionRunner } from './training/RegressionRunner'
import { ScalingRunner } from './training/ScalingRunner'
import { SigmoidRunner } from './training/SigmoidRunner'

const CONTOUR_LEVELS = [
  0.02, 0.06, 0.12, 0.2, 0.3, 0.42, 0.56, 0.72, 0.9, 1.1, 1.35, 1.65, 2, 2.45, 3,
]
const CONTOUR_RESOLUTION = 90

/**
 * The app's only entry point for running an algorithm (ARCHITECTURE §6.1). Picks the runner for a
 * level's algorithm. Every current level is cheap enough to run inline; training loops (W1-L4)
 * will add a WorkerRunner behind the same LevelRunner interface.
 */
export class TrainingService {
  readonly #evaluation: EvaluationService
  readonly #maps = new Map<string, LandscapeMap>()

  constructor(evaluation: EvaluationService) {
    this.#evaluation = evaluation
  }

  createRunner(level: LevelConfig): LevelRunner {
    const algorithm = level.algorithm
    switch (algorithm.id) {
      case 'landscape-2d': {
        const map = this.#landscapeMap({ ...level, algorithm })
        const optimizer = algorithm.optimizer
        switch (optimizer.id) {
          case 'manual-steps':
            return new LandscapeRunner(
              { ...level, algorithm: { ...algorithm, optimizer } },
              map,
              this.#evaluation,
            )
          case 'auto-descent':
            return new DescentRunner(
              { ...level, algorithm: { ...algorithm, optimizer } },
              map,
              this.#evaluation,
            )
          default:
            return assertNever(optimizer)
        }
      }
      case 'linear-regression': {
        const optimizer = algorithm.optimizer
        switch (optimizer.id) {
          case 'manual':
            return new RegressionRunner(
              { ...level, algorithm: { ...algorithm, optimizer } },
              this.#evaluation,
            )
          case 'gradient-descent':
            return new GradientDescentRunner(
              { ...level, algorithm: { ...algorithm, optimizer } },
              this.#evaluation,
            )
          case 'least-squares':
            return new CleaningRunner(
              { ...level, algorithm: { ...algorithm, optimizer } },
              this.#evaluation,
            )
          default:
            return assertNever(optimizer)
        }
      }
      case 'multi-linear-regression':
        return new ScalingRunner({ ...level, algorithm }, this.#evaluation)
      case 'logistic-regression': {
        const optimizer = algorithm.optimizer
        switch (optimizer.id) {
          case 'manual-boundary':
            return new BoundaryRunner(
              { ...level, algorithm: { ...algorithm, optimizer } },
              this.#evaluation,
            )
          case 'manual-sigmoid':
            return new SigmoidRunner(
              { ...level, algorithm: { ...algorithm, optimizer } },
              this.#evaluation,
            )
          case 'feature-builder':
            return new FeatureRunner(
              { ...level, algorithm: { ...algorithm, optimizer } },
              this.#evaluation,
            )
          default:
            return assertNever(optimizer)
        }
      }
      default:
        return assertNever(algorithm)
    }
  }

  /** Contours and the global minimum are costly to compute, so they are cached per level. */
  #landscapeMap(level: LevelOf<'landscape-2d'>): LandscapeMap {
    const cached = this.#maps.get(level.id)
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
    this.#maps.set(level.id, map)
    return map
  }
}
