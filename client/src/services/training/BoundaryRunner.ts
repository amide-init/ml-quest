import type {
  BoundaryScene,
  BoundarySnapshot,
  ClassificationData,
  Command,
  DatasetSplit,
  EvalResult,
  LevelOf,
  Point,
  SessionState,
} from '@/models'
import {
  accuracy,
  boundaryThrough,
  createSeededRandom,
  generateTwoBlobs,
  hashSeed,
  logisticRegression,
} from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'

/**
 * W2-L1 Split the Kingdom: the player places a straight decision boundary by dragging two
 * handles, and may swap which side is which class. Check judges accuracy on the training points,
 * and the hidden test set for the third star.
 */
export class BoundaryRunner implements LevelRunner {
  readonly scene: BoundaryScene
  readonly #level: LevelOf<'logistic-regression'>
  readonly #evaluation: EvaluationService
  readonly #data: DatasetSplit<ClassificationData>
  #snapshot: BoundarySnapshot

  constructor(level: LevelOf<'logistic-regression'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    this.#data = generateTwoBlobs(level.algorithm.dataset, {
      train: createSeededRandom(hashSeed(level.id, level.seed, 'train')),
      test: createSeededRandom(hashSeed(level.id, level.seed, 'test')),
    })
    const { x1, x2, label } = this.#data.train
    this.scene = {
      kind: 'boundary',
      points: Array.from(x1, (x, i) => ({ x, y: x2[i] ?? 0, label: label[i] ?? 0 })),
      view: level.algorithm.view,
    }
    const { p, q } = level.algorithm.optimizer.initial
    this.#snapshot = this.#place(p, q, false, 0)
  }

  get snapshot(): BoundarySnapshot {
    return this.#snapshot
  }

  apply(command: Command): BoundarySnapshot {
    const current = this.#snapshot
    switch (command.type) {
      case 'set-boundary':
        // Two identical points don't define a line; ignore rather than produce a degenerate boundary.
        if (command.p[0] !== command.q[0] || command.p[1] !== command.q[1]) {
          this.#snapshot = this.#place(command.p, command.q, current.flipped, current.moves + 1)
        }
        break
      case 'flip-sides':
        this.#snapshot = this.#place(current.p, current.q, !current.flipped, current.moves + 1)
        break
      case 'reset': {
        const { p, q } = this.#level.algorithm.optimizer.initial
        this.#snapshot = this.#place(p, q, false, current.moves)
        break
      }
      case 'check':
      case 'step':
      case 'train':
      case 'set-start':
      case 'set-params':
      case 'set-hyperparameter':
      case 'set-scaling':
      case 'toggle-point':
        break
    }
    return this.#snapshot
  }

  judge(command: Command, session: SessionState): EvalResult | null {
    if (command.type !== 'check') {
      return null
    }
    const params = this.#params()
    return this.#evaluation.evaluate(this.#level, {
      algorithm: logisticRegression,
      data: this.#data.train,
      params,
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      attempt: session.attempt,
      trainAccuracy: accuracy(params, this.#data.train),
      testAccuracy: accuracy(params, this.#data.test),
    })
  }

  #params() {
    const { p, q, flipped } = this.#snapshot
    return boundaryThrough(p, q, flipped)
  }

  #place(p: Point, q: Point, flipped: boolean, moves: number): BoundarySnapshot {
    const total = this.#data.train.label.length
    const correct = Math.round(accuracy(boundaryThrough(p, q, flipped), this.#data.train) * total)
    return { kind: 'boundary', p, q, flipped, correct, total, moves }
  }
}
