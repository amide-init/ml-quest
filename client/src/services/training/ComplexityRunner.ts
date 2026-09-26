import type {
  CheckedPoint,
  ClassificationData,
  Confusion,
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
  oversampleMinority,
  f1Of,
  precisionOf,
  recallOf,
  polynomialTerms,
  tabularConfusion,
  tabularScore,
  termValue,
  trainGradientDescent,
  withL2Penalty,
  type Standardization,
} from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'
import { borderOf, sampleRegions } from './Regions'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** What the player controls; a trained model remembers them so Check can tell if it is stale. */
interface Settings {
  readonly degree: number
  readonly regularization: number
  readonly oversample: number
}

/** The score above which a point is called class 1, for a threshold on p(class 1): its logit. */
const cutoffOf = (threshold: number) => Math.log(threshold / (1 - threshold))

const accuracyOf = (confusion: Confusion) =>
  (confusion.truePositives + confusion.trueNegatives) /
  (confusion.truePositives +
    confusion.trueNegatives +
    confusion.falsePositives +
    confusion.falseNegatives)

const sameSettings = (a: Settings, b: Settings) =>
  a.degree === b.degree && a.regularization === b.regularization && a.oversample === b.oversample

interface TrainedModel extends Settings {
  readonly params: Vector
  readonly scaling: Standardization
}

const sliderOf = (control: { min: number; max: number; step: number }) => ({
  min: control.min,
  max: control.max,
  step: control.step,
})

/**
 * W2-L4 The Overfitter: a small, noisy dataset and a model-complexity slider (polynomial degree).
 * Train fits the model and shows the border with TRAINING accuracy only; Check judges on the hidden
 * set. High degrees memorize the training points (100%) and fail on new ones: the trap.
 * W2-L5 Tame It fixes a high degree and adds an L2 regularization slider instead; W2-L6 Unfair
 * Data adds a minority-oversampling slider on imbalanced data; W2-L7 Read the Matrix comes
 * pre-trained and only moves the decision threshold (the border shifts; no retraining); the W2-L8
 * boss offers every control at once.
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
    const { degree, regularization, oversample, threshold } = level.algorithm.optimizer
    this.scene = {
      kind: 'complexity',
      points: Array.from(x1, (x, i) => ({ x, y: x2[i] ?? 0, label: label[i] ?? 0 })),
      view: level.algorithm.view,
      degree: typeof degree === 'number' ? null : sliderOf(degree),
      regularization: regularization ? sliderOf(regularization) : null,
      oversample: oversample ? sliderOf(oversample) : null,
      threshold: threshold ? sliderOf(threshold) : null,
    }
    this.#snapshot = {
      kind: 'complexity',
      degree: typeof degree === 'number' ? degree : degree.initial,
      regularization: regularization?.initial ?? 0,
      oversample: oversample?.initial ?? 1,
      threshold: threshold?.initial ?? 0.5,
      trained: null,
      checked: null,
    }
    if (threshold) {
      // Read the Matrix is about the threshold alone: the model is ready from the start.
      this.#model = this.#train(this.#snapshot)
      this.#snapshot = { ...this.#snapshot, trained: this.#describe(this.#model) }
    }
  }

  get snapshot(): ComplexitySnapshot {
    return this.#snapshot
  }

  apply(command: Command): ComplexitySnapshot {
    const current = this.#snapshot
    switch (command.type) {
      case 'set-hyperparameter':
        if (command.name === 'degree' && this.scene.degree) {
          const { min, max } = this.scene.degree
          this.#snapshot = {
            ...current,
            degree: Math.round(clamp(command.value, min, max)),
            checked: null,
          }
        }
        if (command.name === 'regularization' && this.scene.regularization) {
          const { min, max } = this.scene.regularization
          this.#snapshot = {
            ...current,
            regularization: clamp(command.value, min, max),
            checked: null,
          }
        }
        if (command.name === 'threshold' && this.scene.threshold) {
          const { min, max } = this.scene.threshold
          this.#snapshot = { ...current, threshold: clamp(command.value, min, max), checked: null }
          // Moving the threshold re-reads the same model: new border and matrix, no retraining.
          if (this.#model) {
            this.#snapshot = { ...this.#snapshot, trained: this.#describe(this.#model) }
          }
        }
        if (command.name === 'oversample' && this.scene.oversample) {
          const { min, max } = this.scene.oversample
          this.#snapshot = {
            ...current,
            oversample: Math.round(clamp(command.value, min, max)),
            checked: null,
          }
        }
        break
      case 'train':
        this.#model = this.#train(current)
        this.#snapshot = { ...current, trained: this.#describe(this.#model), checked: null }
        break
      case 'check':
        // Checking untrained (or changed) settings trains them first, so Check always judges what you chose.
        if (!this.#model || !sameSettings(this.#model, current)) {
          this.#model = this.#train(current)
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
    const cutoff = cutoffOf(this.#snapshot.threshold)
    const trainConfusion = tabularConfusion(model.params, train, cutoff)
    const testConfusion = tabularConfusion(model.params, test, cutoff)
    return this.#evaluation.evaluate(this.#level, {
      algorithm: multiLogisticRegression,
      data: train,
      params: model.params,
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      attempt: session.attempt,
      trainAccuracy: accuracyOf(trainConfusion),
      testAccuracy: accuracyOf(testConfusion),
      featureCount: polynomialTerms(model.degree).length,
      trainConfusion,
      testConfusion,
    })
  }

  #checkedPoints(model: TrainedModel): CheckedPoint[] {
    const { x1, x2, label } = this.#data.test
    const prepared = this.#prepare(this.#data.test, model)
    const cutoff = cutoffOf(this.#snapshot.threshold)
    return Array.from(x1, (x, i) => {
      const features = prepared.columns.map((column) => column[i] ?? 0)
      const predicted = tabularScore(model.params, features) > cutoff ? 1 : 0
      const actual = label[i] ?? 0
      return { x, y: x2[i] ?? 0, label: actual, correct: predicted === actual }
    })
  }

  #perClass(confusion: Confusion): NonNullable<ComplexitySnapshot['trained']>['perClass'] {
    return [
      {
        correct: confusion.trueNegatives,
        total: confusion.trueNegatives + confusion.falsePositives,
      },
      {
        correct: confusion.truePositives,
        total: confusion.truePositives + confusion.falseNegatives,
      },
    ]
  }

  #prepare(data: ClassificationData, model: TrainedModel) {
    return applyStandardization(expandPolynomial(data, model.degree), model.scaling)
  }

  #train({ degree, regularization, oversample }: Settings): TrainedModel {
    const raw = expandPolynomial(this.#data.train, degree)
    // Scaling is fitted on the real points; oversampling only changes how much each one weighs.
    const scaling = fitStandardization(raw)
    const data = oversampleMinority(applyStandardization(raw, scaling), oversample)
    const { learningRate, maxEpochs } = this.#level.algorithm.optimizer
    const size = data.columns.length + 1
    const result = trainGradientDescent({
      algorithm: withL2Penalty(multiLogisticRegression, regularization),
      data,
      initial: new Float64Array(size),
      learningRate,
      maxEpochs,
      isConverged: () => false,
    })
    return {
      degree,
      regularization,
      oversample,
      params: result.epochs.at(-1)?.params ?? new Float64Array(size),
      scaling,
    }
  }

  #describe(model: TrainedModel): NonNullable<ComplexitySnapshot['trained']> {
    const terms = polynomialTerms(model.degree)
    const cutoff = cutoffOf(this.#snapshot.threshold)
    const confusion = tabularConfusion(model.params, this.#prepare(this.#data.train, model), cutoff)
    // Shifted by the cutoff, so the regions and the border (score 0) follow the threshold.
    const score = (x: number, y: number) =>
      -cutoff +
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
      regularization: model.regularization,
      oversample: model.oversample,
      perClass: this.#perClass(confusion),
      confusion,
      recall: recallOf(confusion),
      precision: precisionOf(confusion),
      f1: f1Of(confusion),
      featureCount: terms.length,
      regions: sampleRegions(this.scene.view, score),
      boundary: borderOf(this.scene.view, score),
      correct: confusion.truePositives + confusion.trueNegatives,
      total,
    }
  }
}
