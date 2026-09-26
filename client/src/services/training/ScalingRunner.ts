import type {
  Command,
  DatasetSplit,
  EvalResult,
  LevelOf,
  ScalingScene,
  ScalingSnapshot,
  SessionState,
  TabularData,
} from '@/models'
import {
  applyStandardization,
  createSeededRandom,
  fitStandardization,
  generateLinearMulti,
  hashSeed,
  multiLinearRegression,
  searchLearningRate,
  solveLeastSquares,
  trainGradientDescent,
} from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * W1-L7 Scale Matters: two features on very different scales. The player may standardize them,
 * picks a learning rate and presses Train. The bar to beat is the fastest convergence ANY learning
 * rate achieves without scaling (found by a search), so tuning the rate alone can never pass.
 */
export class ScalingRunner implements LevelRunner {
  readonly scene: ScalingScene
  readonly #level: LevelOf<'multi-linear-regression'>
  readonly #evaluation: EvaluationService
  readonly #raw: DatasetSplit<TabularData>
  readonly #scaled: TabularData
  readonly #optimalLoss: number
  #snapshot: ScalingSnapshot

  constructor(level: LevelOf<'multi-linear-regression'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    const { dataset, featureLabels, optimizer } = level.algorithm
    this.#raw = generateLinearMulti(dataset, {
      train: createSeededRandom(hashSeed(level.id, level.seed, 'train')),
      test: createSeededRandom(hashSeed(level.id, level.seed, 'test')),
    })
    const standardization = fitStandardization(this.#raw.train)
    this.#scaled = applyStandardization(this.#raw.train, standardization)
    this.#optimalLoss = multiLinearRegression.loss(
      solveLeastSquares(this.#raw.train),
      this.#raw.train,
    )

    const baseline = searchLearningRate({
      algorithm: multiLinearRegression,
      data: this.#raw.train,
      initial: this.#zeros(),
      maxEpochs: optimizer.maxEpochs,
      isConverged: (loss) => loss - this.#optimalLoss <= optimizer.convergenceGap,
    })
    if (!baseline) {
      throw new Error(
        `Level ${level.id}: no learning rate converges without scaling; raise maxEpochs`,
      )
    }

    this.scene = {
      kind: 'scaling',
      features: this.#raw.train.columns.map((column, feature) => {
        const scaled = this.#scaled.columns[feature] ?? column
        return {
          label: featureLabels[feature] ?? '',
          min: Math.min(...column),
          max: Math.max(...column),
          scaledMin: Math.min(...scaled),
          scaledMax: Math.max(...scaled),
        }
      }),
      learningRate: optimizer.learningRate,
      maxEpochs: optimizer.maxEpochs,
      targetLoss: this.#optimalLoss + optimizer.convergenceGap,
      initialLoss: multiLinearRegression.loss(this.#zeros(), this.#raw.train),
      baseline: {
        learningRate: baseline.learningRate,
        epochs: baseline.result.convergedAt ?? optimizer.maxEpochs,
        losses: baseline.result.epochs.map(({ loss }) => loss),
      },
    }
    this.#snapshot = {
      kind: 'scaling',
      scaled: false,
      learningRate: optimizer.learningRate.initial,
      run: null,
    }
  }

  get snapshot(): ScalingSnapshot {
    return this.#snapshot
  }

  apply(command: Command): ScalingSnapshot {
    const { optimizer } = this.#level.algorithm
    switch (command.type) {
      case 'set-scaling':
        this.#snapshot = { ...this.#snapshot, scaled: command.enabled }
        break
      case 'set-hyperparameter': {
        const { min, max } = optimizer.learningRate
        this.#snapshot = { ...this.#snapshot, learningRate: clamp(command.value, min, max) }
        break
      }
      case 'train': {
        const { scaled, learningRate } = this.#snapshot
        const result = trainGradientDescent({
          algorithm: multiLinearRegression,
          data: scaled ? this.#scaled : this.#raw.train,
          initial: this.#zeros(),
          learningRate,
          maxEpochs: optimizer.maxEpochs,
          isConverged: (loss) => loss - this.#optimalLoss <= optimizer.convergenceGap,
        })
        this.#snapshot = {
          ...this.#snapshot,
          run: {
            scaled,
            learningRate,
            losses: result.epochs.map(({ loss }) => loss),
            status: result.status,
            convergedAt: result.convergedAt,
          },
        }
        break
      }
      case 'reset':
        this.#snapshot = { ...this.#snapshot, run: null }
        break
      case 'step':
      case 'set-start':
      case 'set-params':
      case 'check':
      case 'set-boundary':
      case 'flip-sides':
      case 'toggle-feature':
      case 'toggle-point':
        break
    }
    return this.#snapshot
  }

  /** Every Train press is one experiment, judged against the best unscaled baseline. */
  judge(command: Command, session: SessionState): EvalResult | null {
    const run = this.#snapshot.run
    if (command.type !== 'train' || !run) {
      return null
    }
    return this.#evaluation.evaluate(this.#level, {
      algorithm: multiLinearRegression,
      data: this.#raw.train,
      params: this.#zeros(),
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      attempt: session.attempt,
      convergedAt: run.convergedAt,
      baselineEpochs: this.scene.baseline.epochs,
    })
  }

  #zeros(): Float64Array {
    return new Float64Array(this.#level.algorithm.dataset.weights.length + 1)
  }
}
