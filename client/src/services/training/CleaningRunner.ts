import type {
  CleaningScene,
  CleaningSnapshot,
  Command,
  DatasetSplit,
  EvalResult,
  RegressionData,
  RegressionLevelWith,
  SessionState,
} from '@/models'
import { leastSquares, linearRegression, vector } from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'
import { prepareRegression } from './RegressionData'

/**
 * W1-L6 Dirty Data: the player removes training points; the line is refit exactly (least squares)
 * after every change, so each point's pull is visible. Check judges the cleaned fit on the
 * hidden, clean test set. Which points are outliers is ground truth kept here, never in the scene.
 */
export class CleaningRunner implements LevelRunner {
  readonly scene: CleaningScene
  readonly #level: RegressionLevelWith<'least-squares'>
  readonly #evaluation: EvaluationService
  readonly #data: DatasetSplit<RegressionData>
  #snapshot: CleaningSnapshot

  constructor(level: RegressionLevelWith<'least-squares'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    const prepared = prepareRegression(level)
    this.#data = prepared.split
    this.scene = {
      kind: 'cleaning',
      points: prepared.points,
      view: level.algorithm.view,
      minPoints: level.algorithm.optimizer.minPoints,
    }
    this.#snapshot = this.#fit([])
  }

  get snapshot(): CleaningSnapshot {
    return this.#snapshot
  }

  apply(command: Command): CleaningSnapshot {
    switch (command.type) {
      case 'toggle-point': {
        const { removed } = this.#snapshot
        const total = this.#data.train.x.length
        if (!Number.isInteger(command.index) || command.index < 0 || command.index >= total) {
          break
        }
        if (removed.includes(command.index)) {
          this.#snapshot = this.#fit(removed.filter((index) => index !== command.index))
        } else if (total - removed.length > this.scene.minPoints) {
          this.#snapshot = this.#fit([...removed, command.index])
        }
        break
      }
      case 'reset':
        this.#snapshot = this.#fit([])
        break
      case 'check':
      case 'train':
      case 'step':
      case 'set-start':
      case 'set-params':
      case 'set-hyperparameter':
        break
    }
    return this.#snapshot
  }

  judge(command: Command, session: SessionState): EvalResult | null {
    if (command.type !== 'check') {
      return null
    }
    const { w, b, removed } = this.#snapshot
    return this.#evaluation.evaluate(this.#level, {
      algorithm: linearRegression,
      data: this.#kept(removed),
      testData: this.#data.test,
      params: vector(w, b),
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      attempt: session.attempt,
      removedPoints: removed,
      outlierPoints: this.#data.outlierIndices,
    })
  }

  #kept(removed: readonly number[]): RegressionData {
    const { x, y } = this.#data.train
    const keep = Array.from(x.keys()).filter((index) => !removed.includes(index))
    return {
      x: Float64Array.from(keep, (index) => x[index] ?? 0),
      y: Float64Array.from(keep, (index) => y[index] ?? 0),
    }
  }

  #fit(removed: readonly number[]): CleaningSnapshot {
    const kept = this.#kept(removed)
    const { w, b } = leastSquares(kept)
    return { kind: 'cleaning', removed, w, b, loss: linearRegression.loss(vector(w, b), kept) }
  }
}
