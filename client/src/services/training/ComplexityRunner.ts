import type {
  CheckedPoint,
  ClassificationData,
  Command,
  ComplexityScene,
  ComplexitySnapshot,
  DatasetSplit,
  EvalResult,
  LogisticLevelWith,
  SessionState,
  Vector,
} from '@/models'
import {
  applyStandardization,
  createSeededRandom,
  expandPolynomial,
  fitStandardization,
  generateClassification,
  hashSeed,
  multiLogisticRegression,
  polynomialTerms,
  tabularAccuracy,
  tabularScore,
  termValue,
  trainGradientDescent,
  type Standardization,
} from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'
import { borderOf, sampleRegions } from './Regions'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

interface TrainedModel {
  readonly degree: number
  readonly params: Vector
  readonly scaling: Standardization
}

/**
 * W2-L4 The Overfitter: a small, noisy dataset and a model-complexity slider (polynomial degree).
 * Train fits the model and shows the border with TRAINING accuracy only; Check judges on the hidden
 * set. High degrees memorize the training points (100%) and fail on new ones: the trap.
 */
export class ComplexityRunner implements LevelRunner {
  readonly scene: ComplexityScene
  readonly #level: LogisticLevelWith<'complexity'>
  readonly #evaluation: EvaluationService
  readonly #data: DatasetSplit<ClassificationData>
  #model: TrainedModel | null = null
  #snapshot: ComplexitySnapshot

  constructor(level: LogisticLevelWith<'complexity'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    this.#data = generateClassification(level.algorithm.dataset, {
      train: createSeededRandom(hashSeed(level.id, level.seed, 'train')),
      test: createSeededRandom(hashSeed(level.id, level.seed, 'test')),
    })
    const { x1, x2, label } = this.#data.train
    const { degree } = level.algorithm.optimizer
    this.scene = {
      kind: 'complexity',
      points: Array.from(x1, (x, i) => ({ x, y: x2[i] ?? 0, label: label[i] ?? 0 })),
      view: level.algorithm.view,
      degree,
    }
    this.#snapshot = { kind: 'complexity', degree: degree.initial, trained: null, checked: null }
  }

  get snapshot(): ComplexitySnapshot {
    return this.#snapshot
  }

  apply(command: Command): ComplexitySnapshot {
    const current = this.#snapshot
    switch (command.type) {
      case 'set-hyperparameter':
        if (command.name === 'degree') {
          const { min, max } = this.scene.degree
          this.#snapshot = {
            ...current,
            degree: Math.round(clamp(command.value, min, max)),
            checked: null,
          }
        }
        break
      case 'train':
        this.#model = this.#train(current.degree)
        this.#snapshot = { ...current, trained: this.#describe(this.#model), checked: null }
        break
      case 'check':
        // Checking an untrained (or changed) degree trains it first, so Check always judges what you chose.
        if (!this.#model || this.#model.degree !== current.degree) {
          this.#model = this.#train(current.degree)
          this.#snapshot = { ...this.#snapshot, trained: this.#describe(this.#model) }
        }
        // Check is always judged, so the hidden points may now be shown (D6).
        this.#snapshot = { ...this.#snapshot, checked: this.#checkedPoints(this.#model) }
        break
      case 'reset':
        this.#model = null
        this.#snapshot = { ...current, trained: null, checked: null }
        break
      case 'step':
      case 'set-start':
      case 'set-params':
      case 'set-scaling':
      case 'toggle-point':
      case 'set-boundary':
      case 'flip-sides':
      case 'toggle-feature':
        break
    }
    return this.#snapshot
  }

  /** Only Check is judged; Train is free exploration on the training data. */
  judge(command: Command, session: SessionState): EvalResult | null {
    const model = this.#model
    if (command.type !== 'check' || !model) {
      return null
    }
    const train = this.#prepare(this.#data.train, model)
    const test = this.#prepare(this.#data.test, model)
    return this.#evaluation.evaluate(this.#level, {
      algorithm: multiLogisticRegression,
      data: train,
      params: model.params,
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      attempt: session.attempt,
      trainAccuracy: tabularAccuracy(model.params, train),
      testAccuracy: tabularAccuracy(model.params, test),
      featureCount: polynomialTerms(model.degree).length,
    })
  }

  #checkedPoints(model: TrainedModel): CheckedPoint[] {
    const { x1, x2, label } = this.#data.test
    const prepared = this.#prepare(this.#data.test, model)
    return Array.from(x1, (x, i) => {
      const features = prepared.columns.map((column) => column[i] ?? 0)
      const predicted = tabularScore(model.params, features) > 0 ? 1 : 0
      const actual = label[i] ?? 0
      return { x, y: x2[i] ?? 0, label: actual, correct: predicted === actual }
    })
  }

  #prepare(data: ClassificationData, model: TrainedModel) {
    return applyStandardization(expandPolynomial(data, model.degree), model.scaling)
  }

  #train(degree: number): TrainedModel {
    const raw = expandPolynomial(this.#data.train, degree)
    const scaling = fitStandardization(raw)
    const data = applyStandardization(raw, scaling)
    const { learningRate, maxEpochs } = this.#level.algorithm.optimizer
    const size = data.columns.length + 1
    const result = trainGradientDescent({
      algorithm: multiLogisticRegression,
      data,
      initial: new Float64Array(size),
      learningRate,
      maxEpochs,
      isConverged: () => false,
    })
    return { degree, params: result.epochs.at(-1)?.params ?? new Float64Array(size), scaling }
  }

  #describe(model: TrainedModel): NonNullable<ComplexitySnapshot['trained']> {
    const terms = polynomialTerms(model.degree)
    const score = (x: number, y: number) =>
      tabularScore(
        model.params,
        terms.map(
          (term, i) =>
            (termValue(term, x, y) - (model.scaling.means[i] ?? 0)) /
            (model.scaling.deviations[i] ?? 1),
        ),
      )
    const total = this.#data.train.label.length
    return {
      degree: model.degree,
      featureCount: terms.length,
      regions: sampleRegions(this.scene.view, score),
      boundary: borderOf(this.scene.view, score),
      correct: Math.round(
        tabularAccuracy(model.params, this.#prepare(this.#data.train, model)) * total,
      ),
      total,
    }
  }
}
