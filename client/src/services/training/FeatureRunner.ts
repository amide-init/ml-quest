import type {
  ClassificationData,
  Command,
  DatasetSplit,
  EvalResult,
  FeatureScene,
  FeatureSnapshot,
  LogisticLevelWith,
  PolynomialFeature,
  SessionState,
  Vector,
} from '@/models'
import {
  applyStandardization,
  createSeededRandom,
  expandFeatures,
  featureValue,
  fitStandardization,
  generateClassification,
  hashSeed,
  multiLogisticRegression,
  tabularAccuracy,
  tabularScore,
  trainGradientDescent,
  type Standardization,
} from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'
import { borderOf, sampleRegions } from './Regions'

interface TrainedModel {
  readonly features: readonly PolynomialFeature[]
  readonly params: Vector
  readonly scaling: Standardization
}

/**
 * W2-L3 Not a Straight Line: the player chooses which features a logistic-regression model sees
 * (x1, x2, x1², x2², x1·x2) and trains it. A linear model on squared features draws a curved
 * border in the original plane. Every Train press is judged.
 */
export class FeatureRunner implements LevelRunner {
  readonly scene: FeatureScene
  readonly #level: LogisticLevelWith<'feature-builder'>
  readonly #evaluation: EvaluationService
  readonly #data: DatasetSplit<ClassificationData>
  #model: TrainedModel | null = null
  #snapshot: FeatureSnapshot

  constructor(level: LogisticLevelWith<'feature-builder'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    this.#data = generateClassification(level.algorithm.dataset, {
      train: createSeededRandom(hashSeed(level.id, level.seed, 'train')),
      test: createSeededRandom(hashSeed(level.id, level.seed, 'test')),
    })
    const { x1, x2, label } = this.#data.train
    this.scene = {
      kind: 'features',
      points: Array.from(x1, (x, i) => ({ x, y: x2[i] ?? 0, label: label[i] ?? 0 })),
      view: level.algorithm.view,
      available: level.algorithm.optimizer.available,
    }
    this.#snapshot = {
      kind: 'features',
      selected: level.algorithm.optimizer.initial,
      trained: null,
    }
  }

  get snapshot(): FeatureSnapshot {
    return this.#snapshot
  }

  apply(command: Command): FeatureSnapshot {
    const current = this.#snapshot
    switch (command.type) {
      case 'toggle-feature': {
        if (!this.scene.available.includes(command.feature)) break
        const selected = current.selected.includes(command.feature)
          ? current.selected.filter((feature) => feature !== command.feature)
          : // Keep the features in the order they're offered, so results don't depend on click order.
            this.scene.available.filter(
              (feature) => feature === command.feature || current.selected.includes(feature),
            )
        this.#snapshot = { ...current, selected }
        break
      }
      case 'train':
        this.#model = this.#train(current.selected)
        this.#snapshot = { ...current, trained: this.#describe(this.#model) }
        break
      case 'reset':
        this.#model = null
        this.#snapshot = { ...current, trained: null }
        break
      case 'check':
      case 'step':
      case 'set-start':
      case 'set-params':
      case 'set-hyperparameter':
      case 'set-scaling':
      case 'toggle-point':
      case 'set-boundary':
      case 'flip-sides':
        break
    }
    return this.#snapshot
  }

  judge(command: Command, session: SessionState): EvalResult | null {
    const model = this.#model
    if (command.type !== 'train' || !model) {
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
      featureCount: model.features.length,
    })
  }

  #prepare(data: ClassificationData, model: TrainedModel) {
    return applyStandardization(expandFeatures(data, model.features), model.scaling)
  }

  #train(features: readonly PolynomialFeature[]): TrainedModel {
    const raw = expandFeatures(this.#data.train, features)
    // Standardize so gradient descent behaves whatever the player picks (squares are much bigger).
    const scaling = fitStandardization(raw)
    const data = applyStandardization(raw, scaling)
    const { learningRate, maxEpochs } = this.#level.algorithm.optimizer
    const result = trainGradientDescent({
      algorithm: multiLogisticRegression,
      data,
      initial: new Float64Array(features.length + 1),
      learningRate,
      maxEpochs,
      isConverged: () => false,
    })
    return {
      features,
      params: result.epochs.at(-1)?.params ?? new Float64Array(features.length + 1),
      scaling,
    }
  }

  /** The model's score at a map point, in the same standardized feature space it was trained in. */
  #score(model: TrainedModel, x: number, y: number): number {
    const values = model.features.map((feature, i) => {
      const mean = model.scaling.means[i] ?? 0
      const deviation = model.scaling.deviations[i] ?? 1
      return (featureValue(feature, x, y) - mean) / deviation
    })
    return tabularScore(model.params, values)
  }

  #describe(model: TrainedModel): NonNullable<FeatureSnapshot['trained']> {
    const score = (x: number, y: number) => this.#score(model, x, y)
    const regions = sampleRegions(this.scene.view, score)
    const boundary = borderOf(this.scene.view, score)
    const train = this.#prepare(this.#data.train, model)
    const total = this.#data.train.label.length
    return {
      features: model.features,
      regions,
      boundary,
      correct: Math.round(tabularAccuracy(model.params, train) * total),
      total,
    }
  }
}
