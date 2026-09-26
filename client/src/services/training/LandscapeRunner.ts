import type {
  Command,
  EvalResult,
  LandscapeMap,
  LandscapeSnapshot,
  LandscapeLevelWith,
  Point,
  SessionState,
} from '@/models'
import { createLandscape2D, gradientDescentStep, vector, xy } from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * Runs a landscape level on the main thread (the "InlineRunner" of ARCHITECTURE §6.1):
 * each step is one gradient evaluation, so a worker round-trip would only add latency.
 */
export class LandscapeRunner implements LevelRunner {
  readonly scene: LandscapeMap
  readonly #algorithm
  readonly #level: LandscapeLevelWith<'manual-steps'>
  readonly #evaluation: EvaluationService
  #snapshot: LandscapeSnapshot

  constructor(
    level: LandscapeLevelWith<'manual-steps'>,
    scene: LandscapeMap,
    evaluation: EvaluationService,
  ) {
    this.#level = level
    this.scene = scene
    this.#evaluation = evaluation
    this.#algorithm = createLandscape2D(level.algorithm.landscape)
    this.#snapshot = this.#snapshotAt(level.algorithm.start, [level.algorithm.start], {
      learningRate: level.algorithm.optimizer.learningRate.initial,
      steps: 0,
      status: 'ok',
    })
  }

  get snapshot(): LandscapeSnapshot {
    return this.#snapshot
  }

  apply(command: Command): LandscapeSnapshot {
    const current = this.#snapshot
    switch (command.type) {
      case 'set-hyperparameter': {
        // Game rule, not math clamping: the slider's range is part of the level design.
        const { min, max } = this.#level.algorithm.optimizer.learningRate
        const learningRate = clamp(command.value, min, max)
        this.#snapshot = this.#snapshotAt(current.position, current.path, {
          ...current,
          learningRate,
        })
        break
      }
      case 'step': {
        if (current.status === 'diverged') {
          break
        }
        const result = gradientDescentStep(
          this.#algorithm,
          vector(...current.position),
          undefined,
          current.learningRate,
        )
        const position = xy(result.params)
        this.#snapshot = this.#snapshotAt(position, [...current.path, position], {
          learningRate: current.learningRate,
          steps: current.steps + 1,
          status: result.status,
        })
        break
      }
      case 'set-start': {
        this.#snapshot = this.#snapshotAt(command.point, [command.point], {
          ...current,
          steps: 0,
          status: 'ok',
        })
        break
      }
      case 'reset': {
        const start = this.#level.algorithm.start
        this.#snapshot = this.#snapshotAt(start, [start], { ...current, status: 'ok' })
        break
      }
      case 'set-params':
      case 'check':
      case 'toggle-point':
      case 'set-scaling':
      case 'set-boundary':
      case 'flip-sides':
      case 'toggle-feature':
      case 'train':
        // Not used by landscape levels: the ball only moves by gradient steps.
        break
    }
    return this.#snapshot
  }

  /** Checked after every step: ends on reaching the valley, leaving the map, or running out of steps. */
  judge(command: Command, session: SessionState): EvalResult | null {
    if (command.type !== 'step') {
      return null
    }
    const snapshot = this.#snapshot
    const result = this.#evaluation.evaluate(this.#level, {
      algorithm: this.#algorithm,
      data: undefined,
      params: vector(...snapshot.position),
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      globalMinimum: vector(...this.scene.minimum),
    })
    const outOfSteps = snapshot.steps >= this.#level.algorithm.optimizer.stepBudget
    return result.passed || snapshot.status === 'diverged' || outOfSteps ? result : null
  }

  #snapshotAt(
    position: Point,
    path: readonly Point[],
    rest: Pick<LandscapeSnapshot, 'learningRate' | 'steps' | 'status'>,
  ): LandscapeSnapshot {
    const params = vector(...position)
    const [gx, gy] = xy(this.#algorithm.gradient(params))
    return {
      kind: 'landscape',
      position,
      path,
      loss: this.#algorithm.loss(params),
      gradient: [gx, gy],
      preview: [position[0] - rest.learningRate * gx, position[1] - rest.learningRate * gy],
      learningRate: rest.learningRate,
      steps: rest.steps,
      status: rest.status,
    }
  }
}
