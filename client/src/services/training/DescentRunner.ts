import type {
  Command,
  EvalResult,
  LandscapeLevelWith,
  LandscapeMap,
  LandscapeSnapshot,
  Point,
  SessionState,
} from '@/models'
import { createLandscape2D, distance, trainGradientDescent, vector, xy } from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * W1-L5 Bumpy Terrain: the player picks where the ball starts, then gradient descent rolls it
 * until it settles. The whole roll is computed at once and replayed by the UI. One roll = one
 * attempt: it is judged immediately, so a retry is a fresh attempt from a new start.
 */
export class DescentRunner implements LevelRunner {
  readonly scene: LandscapeMap
  readonly #level: LandscapeLevelWith<'auto-descent'>
  readonly #evaluation: EvaluationService
  readonly #algorithm
  #snapshot: LandscapeSnapshot
  #settledAt: number | null = null

  constructor(
    level: LandscapeLevelWith<'auto-descent'>,
    scene: LandscapeMap,
    evaluation: EvaluationService,
  ) {
    this.#level = level
    this.scene = scene
    this.#evaluation = evaluation
    this.#algorithm = createLandscape2D(level.algorithm.landscape)
    this.#snapshot = this.#snapshotAt([level.algorithm.start], 0, 'ok')
  }

  get snapshot(): LandscapeSnapshot {
    return this.#snapshot
  }

  apply(command: Command): LandscapeSnapshot {
    switch (command.type) {
      case 'set-start': {
        if (this.#snapshot.steps > 0) {
          break // the ball has already rolled this attempt
        }
        // Keep the start on the map (a UI rule: the picker can't place the ball outside it).
        const { min, max } = this.#level.algorithm.landscape.bounds
        const start: Point = [
          clamp(command.point[0], min[0], max[0]),
          clamp(command.point[1], min[1], max[1]),
        ]
        this.#snapshot = this.#snapshotAt([start], 0, 'ok')
        break
      }
      case 'train': {
        if (this.#snapshot.steps > 0) {
          break
        }
        const { learningRate, maxSteps, settleDistance } = this.#level.algorithm.optimizer
        const result = trainGradientDescent({
          algorithm: this.#algorithm,
          data: undefined,
          initial: vector(...this.#snapshot.position),
          learningRate,
          maxEpochs: maxSteps,
          isConverged: (_loss, params, previous) =>
            params !== previous && distance(params, previous) < settleDistance,
        })
        this.#settledAt = result.convergedAt
        const path = result.epochs.map(({ params }) => xy(params))
        this.#snapshot = this.#snapshotAt(
          path,
          path.length - 1,
          result.status === 'diverged' ? 'diverged' : 'ok',
        )
        break
      }
      case 'reset':
        this.#settledAt = null
        this.#snapshot = this.#snapshotAt([this.#level.algorithm.start], 0, 'ok')
        break
      case 'step':
      case 'set-hyperparameter':
      case 'set-params':
      case 'check':
        break
    }
    return this.#snapshot
  }

  /** A roll is judged as soon as it happens. */
  judge(command: Command, session: SessionState): EvalResult | null {
    if (command.type !== 'train' || this.#snapshot.steps === 0) {
      return null
    }
    return this.#evaluation.evaluate(this.#level, {
      algorithm: this.#algorithm,
      data: undefined,
      params: vector(...this.#snapshot.position),
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      globalMinimum: vector(...this.scene.minimum),
      convergedAt: this.#settledAt,
      attempt: session.attempt,
    })
  }

  #snapshotAt(
    path: readonly Point[],
    steps: number,
    status: LandscapeSnapshot['status'],
  ): LandscapeSnapshot {
    const position = path.at(-1) ?? this.#level.algorithm.start
    const params = vector(...position)
    const [gx, gy] = xy(this.#algorithm.gradient(params))
    return {
      kind: 'landscape',
      position,
      path,
      loss: this.#algorithm.loss(params),
      gradient: [gx, gy],
      learningRate: this.#level.algorithm.optimizer.learningRate,
      preview: position,
      steps,
      status,
    }
  }
}
