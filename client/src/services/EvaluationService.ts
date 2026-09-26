import type { EvalResult, LandscapeSnapshot, LevelConfig, Point, SessionState } from '@/models'
import { computeMetrics, createLandscape2D, evaluate, vector } from '@/engine'

/** Wraps the engine's evaluator: the only place a pass/fail or star count is produced (ARCHITECTURE §5.4). */
export class EvaluationService {
  evaluateLandscape(
    level: LevelConfig,
    snapshot: LandscapeSnapshot,
    session: SessionState,
    minimum: Point,
  ): EvalResult {
    const metrics = computeMetrics({
      algorithm: createLandscape2D(level.algorithm.landscape),
      data: undefined,
      params: vector(...snapshot.position),
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      globalMinimum: vector(...minimum),
    })
    return evaluate(level.stars, metrics)
  }
}
