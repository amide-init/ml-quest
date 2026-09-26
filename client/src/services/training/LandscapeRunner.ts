import type { Command, LandscapeSnapshot, LevelConfig, Point } from '@/models'
import { createLandscape2D, gradientDescentStep, vector, xy } from '@/engine'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * Runs a landscape level on the main thread (the "InlineRunner" of ARCHITECTURE §6.1):
 * each step is a single gradient evaluation, so a worker round-trip would only add latency.
 * Applies commands and produces immutable snapshots for the UI.
 */
export class LandscapeRunner {
  readonly #algorithm
  readonly #level: LevelConfig
  #snapshot: LandscapeSnapshot

  constructor(level: LevelConfig) {
    this.#level = level
    this.#algorithm = createLandscape2D(level.algorithm.landscape)
    this.#snapshot = this.#snapshotAt(level.algorithm.start, [level.algorithm.start], {
      learningRate: level.controls.learningRate.initial,
      steps: 0,
      status: 'ok',
    })
  }

  get snapshot(): LandscapeSnapshot {
    return this.#snapshot
  }

  /** Applies one command and returns the new snapshot (the previous one is never mutated). */
  apply(command: Command): LandscapeSnapshot {
    const current = this.#snapshot
    switch (command.type) {
      case 'set-hyperparameter': {
        // Game rule, not math clamping: the slider's range is part of the level design.
        const { min, max } = this.#level.controls.learningRate
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
    }
    return this.#snapshot
  }

  #snapshotAt(
    position: Point,
    path: readonly Point[],
    rest: Pick<LandscapeSnapshot, 'learningRate' | 'steps' | 'status'>,
  ): LandscapeSnapshot {
    const params = vector(...position)
    const [gx, gy] = xy(this.#algorithm.gradient(params))
    return {
      position,
      path,
      loss: this.#algorithm.loss(params),
      gradient: [gx, gy],
      preview: [position[0] - rest.learningRate * gx, position[1] - rest.learningRate * gy],
      ...rest,
    }
  }
}
