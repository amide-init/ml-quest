import type { LandscapeMap, LevelConfig, Point } from '@/models'
import { contourLines, createLandscape2D, findLandscapeMinimum, xy } from '@/engine'
import type { LevelRepository } from '@/repositories'
import type { EvaluationService } from './EvaluationService'
import { PlaySession } from './PlaySession'
import type { TrainingService } from './TrainingService'

const CONTOUR_LEVELS = [
  0.02, 0.06, 0.12, 0.2, 0.3, 0.42, 0.56, 0.72, 0.9, 1.1, 1.35, 1.65, 2, 2.45, 3,
]
const CONTOUR_RESOLUTION = 90

/** Finds levels and starts play sessions. Map geometry is computed once per level and cached. */
export class LevelService {
  readonly #levels: LevelRepository
  readonly #training: TrainingService
  readonly #evaluation: EvaluationService
  readonly #now: () => number
  readonly #maps = new Map<string, LandscapeMap>()

  constructor(
    levels: LevelRepository,
    training: TrainingService,
    evaluation: EvaluationService,
    now: () => number,
  ) {
    this.#levels = levels
    this.#training = training
    this.#evaluation = evaluation
    this.#now = now
  }

  getLevel(id: string): LevelConfig | null {
    return this.#levels.get(id)
  }

  /** Starts a fresh session, or returns null when the level doesn't exist (yet). */
  startSession(id: string): PlaySession | null {
    const level = this.#levels.get(id)
    if (!level) {
      return null
    }
    return new PlaySession(
      level,
      this.getMap(level),
      () => this.#training.createRunner(level),
      this.#evaluation,
      this.#now,
    )
  }

  getMap(level: LevelConfig): LandscapeMap {
    const cached = this.#maps.get(level.id)
    if (cached) {
      return cached
    }
    const { landscape, targetRadius } = level.algorithm
    const algorithm = createLandscape2D(landscape)
    const minimum = findLandscapeMinimum(algorithm, landscape.bounds)
    const loss = (point: Point) => algorithm.loss(Float64Array.from(point))
    const map: LandscapeMap = {
      bounds: landscape.bounds,
      contours: contourLines(
        loss,
        { ...landscape.bounds, resolution: CONTOUR_RESOLUTION },
        CONTOUR_LEVELS.map((value) => minimum.loss + value),
      ),
      levelCount: CONTOUR_LEVELS.length,
      minimum: xy(minimum.point),
      targetRadius,
    }
    this.#maps.set(level.id, map)
    return map
  }
}
