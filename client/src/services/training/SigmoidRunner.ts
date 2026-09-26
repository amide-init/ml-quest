import type {
  ClassificationData,
  Command,
  DatasetSplit,
  EvalResult,
  LogisticLevelWith,
  SessionState,
  SigmoidScene,
  SigmoidSnapshot,
} from '@/models'
import {
  accuracy,
  createSeededRandom,
  generateTwoBlobs,
  hashSeed,
  logisticRegression,
  sigmoid,
} from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * W2-L2 Confidence: a 1D classifier p(class 1) = sigmoid(slope · (x − threshold)). The player tunes
 * both. It maps onto logistic regression as w = [slope, 0], b = −slope · threshold, so the hidden
 * test set's log loss punishes an overconfident, too-steep curve.
 */
export class SigmoidRunner implements LevelRunner {
  readonly scene: SigmoidScene
  readonly #level: LogisticLevelWith<'manual-sigmoid'>
  readonly #evaluation: EvaluationService
  readonly #data: DatasetSplit<ClassificationData>
  #snapshot: SigmoidSnapshot

  constructor(level: LogisticLevelWith<'manual-sigmoid'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    this.#data = generateTwoBlobs(level.algorithm.dataset, {
      train: createSeededRandom(hashSeed(level.id, level.seed, 'train')),
      test: createSeededRandom(hashSeed(level.id, level.seed, 'test')),
    })
    const { x1, label } = this.#data.train
    const { view, optimizer } = level.algorithm
    this.scene = {
      kind: 'sigmoid',
      points: Array.from(x1, (x, i) => ({ x, label: label[i] ?? 0 })),
      xMin: view.xMin,
      xMax: view.xMax,
      slope: optimizer.slope,
      threshold: optimizer.threshold,
    }
    this.#snapshot = this.#tune(optimizer.slope.initial, optimizer.threshold.initial)
  }

  get snapshot(): SigmoidSnapshot {
    return this.#snapshot
  }

  apply(command: Command): SigmoidSnapshot {
    const { slope, threshold } = this.#level.algorithm.optimizer
    const current = this.#snapshot
    switch (command.type) {
      case 'set-hyperparameter':
        if (command.name === 'slope') {
          this.#snapshot = this.#tune(clamp(command.value, slope.min, slope.max), current.threshold)
        } else if (command.name === 'threshold') {
          this.#snapshot = this.#tune(
            current.slope,
            clamp(command.value, threshold.min, threshold.max),
          )
        }
        break
      case 'reset':
        this.#snapshot = this.#tune(slope.initial, threshold.initial)
        break
      case 'check':
      case 'step':
      case 'train':
      case 'set-start':
      case 'set-params':
      case 'set-scaling':
      case 'toggle-point':
      case 'set-boundary':
      case 'flip-sides':
        break
    }
    return this.#snapshot
  }

  judge(command: Command, session: SessionState): EvalResult | null {
    if (command.type !== 'check') {
      return null
    }
    const params = this.#params(this.#snapshot.slope, this.#snapshot.threshold)
    return this.#evaluation.evaluate(this.#level, {
      algorithm: logisticRegression,
      data: this.#data.train,
      testData: this.#data.test,
      params,
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      attempt: session.attempt,
      trainAccuracy: accuracy(params, this.#data.train),
      testAccuracy: accuracy(params, this.#data.test),
      minConfidence: this.#snapshot.minConfidence,
    })
  }

  #params(slope: number, threshold: number) {
    return Float64Array.of(slope, 0, -slope * threshold)
  }

  #tune(slope: number, threshold: number): SigmoidSnapshot {
    const { x1, label } = this.#data.train
    const confidences = Array.from(x1, (x, i) => {
      const p1 = sigmoid(slope * (x - threshold))
      return label[i] === 1 ? p1 : 1 - p1
    })
    return {
      kind: 'sigmoid',
      slope,
      threshold,
      confidences,
      minConfidence: Math.min(...confidences),
    }
  }
}
