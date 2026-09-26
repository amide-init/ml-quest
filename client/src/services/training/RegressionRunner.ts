import type {
  Command,
  DatasetSplit,
  EvalResult,
  RegressionData,
  RegressionLevelWith,
  RegressionScene,
  RegressionSnapshot,
  SessionState,
} from '@/models'
import { linearRegression, vector } from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'
import { prepareRegression } from './RegressionData'

/**
 * Runs a linear-regression level where the player sets the line directly (the "manual" optimizer):
 * W1-L1 Draw the Line and W1-L2 Feel the Loss. The hidden test set stays inside this class.
 */
export class RegressionRunner implements LevelRunner {
  readonly scene: RegressionScene
  readonly #level: RegressionLevelWith<'manual'>
  readonly #evaluation: EvaluationService
  readonly #data: DatasetSplit<RegressionData>
  readonly #optimalLoss: number
  #snapshot: RegressionSnapshot

  constructor(level: RegressionLevelWith<'manual'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    const prepared = prepareRegression(level)
    this.#data = prepared.split
    this.#optimalLoss = prepared.optimalLoss

    const { w, b } = level.algorithm.initial
    const initialLoss = this.#loss(w, b)
    this.scene = {
      kind: 'regression',
      points: prepared.points,
      view: level.algorithm.view,
      showLoss: level.algorithm.optimizer.showLoss,
      moveBudget: level.algorithm.optimizer.moveBudget ?? null,
      initialLoss,
    }
    this.#snapshot = {
      kind: 'regression',
      w,
      b,
      loss: initialLoss,
      bestLoss: initialLoss,
      moves: 0,
    }
  }

  get snapshot(): RegressionSnapshot {
    return this.#snapshot
  }

  apply(command: Command): RegressionSnapshot {
    const current = this.#snapshot
    switch (command.type) {
      case 'set-params': {
        const w = command.values['w'] ?? current.w
        const b = command.values['b'] ?? current.b
        const loss = this.#loss(w, b)
        this.#snapshot = {
          kind: 'regression',
          w,
          b,
          loss,
          bestLoss: Math.min(current.bestLoss, loss),
          moves: current.moves + 1,
        }
        break
      }
      case 'reset': {
        const { w, b } = this.#level.algorithm.initial
        this.#snapshot = { ...current, w, b, loss: this.#loss(w, b) }
        break
      }
      case 'check':
      case 'toggle-point':
      case 'set-scaling':
      case 'set-boundary':
      case 'flip-sides':
      case 'toggle-feature':
      case 'set-hyperparameter':
      case 'set-start':
      case 'step':
      case 'train':
        break
    }
    return this.#snapshot
  }

  /** Ends when the player presses Check, or automatically when the move budget runs out. */
  judge(command: Command, session: SessionState): EvalResult | null {
    const budget = this.#level.algorithm.optimizer.moveBudget
    const outOfMoves = budget !== undefined && this.#snapshot.moves >= budget
    if (command.type !== 'check' && !(command.type === 'set-params' && outOfMoves)) {
      return null
    }
    return this.#evaluation.evaluate(this.#level, {
      algorithm: linearRegression,
      data: this.#data.train,
      testData: this.#data.test,
      optimalLoss: this.#optimalLoss,
      params: vector(this.#snapshot.w, this.#snapshot.b),
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
    })
  }

  #loss(w: number, b: number): number {
    return linearRegression.loss(vector(w, b), this.#data.train)
  }
}
