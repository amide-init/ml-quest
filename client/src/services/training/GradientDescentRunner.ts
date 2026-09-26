import type {
  Command,
  DatasetSplit,
  EvalResult,
  RegressionData,
  RegressionLevelWith,
  SessionState,
  TrainingScene,
  TrainingSnapshot,
} from '@/models'
import { linearRegression, trainGradientDescent, vector, xy } from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'
import { prepareRegression } from './RegressionData'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * W1-L4 Too Fast, Too Slow: the player picks a learning rate and presses Train; gradient descent
 * trains the line. The whole run is computed at once (microseconds for this data, so inline per
 * ARCHITECTURE §6.1) and recorded epoch by epoch for the UI to replay.
 */
export class GradientDescentRunner implements LevelRunner {
  readonly scene: TrainingScene
  readonly #level: RegressionLevelWith<'gradient-descent'>
  readonly #evaluation: EvaluationService
  readonly #data: DatasetSplit<RegressionData>
  readonly #optimalLoss: number
  #snapshot: TrainingSnapshot

  constructor(level: RegressionLevelWith<'gradient-descent'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    const prepared = prepareRegression(level)
    this.#data = prepared.split
    this.#optimalLoss = prepared.optimalLoss
    const { optimizer, initial, view } = level.algorithm
    const initialLoss = prepared.loss(initial.w, initial.b)

    this.scene = {
      kind: 'training',
      points: prepared.points,
      view,
      learningRate: optimizer.learningRate,
      maxEpochs: optimizer.maxEpochs,
      targetLoss: prepared.optimalLoss + optimizer.convergenceGap,
      initialLoss,
    }
    this.#snapshot = {
      kind: 'training',
      learningRate: optimizer.learningRate.initial,
      initial: { ...initial, loss: initialLoss },
      run: null,
    }
  }

  get snapshot(): TrainingSnapshot {
    return this.#snapshot
  }

  apply(command: Command): TrainingSnapshot {
    const { optimizer, initial } = this.#level.algorithm
    switch (command.type) {
      case 'set-hyperparameter': {
        // Game rule, not math clamping: the slider's range is part of the level design.
        const { min, max } = optimizer.learningRate
        this.#snapshot = { ...this.#snapshot, learningRate: clamp(command.value, min, max) }
        break
      }
      case 'train': {
        const learningRate = this.#snapshot.learningRate
        const result = trainGradientDescent({
          algorithm: linearRegression,
          data: this.#data.train,
          initial: vector(initial.w, initial.b),
          learningRate,
          maxEpochs: optimizer.maxEpochs,
          isConverged: (loss) => loss - this.#optimalLoss <= optimizer.convergenceGap,
        })
        this.#snapshot = {
          ...this.#snapshot,
          run: {
            learningRate,
            epochs: result.epochs.map(({ params, loss }) => {
              const [w, b] = xy(params)
              return { w, b, loss }
            }),
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
      case 'toggle-point':
        break
    }
    return this.#snapshot
  }

  /** Every Train press is one experiment: it is judged immediately. */
  judge(command: Command, session: SessionState): EvalResult | null {
    const run = this.#snapshot.run
    if (command.type !== 'train' || !run) {
      return null
    }
    const last = run.epochs.at(-1)
    return this.#evaluation.evaluate(this.#level, {
      algorithm: linearRegression,
      data: this.#data.train,
      testData: this.#data.test,
      optimalLoss: this.#optimalLoss,
      params: vector(last?.w ?? Number.NaN, last?.b ?? Number.NaN),
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      convergedAt: run.convergedAt,
    })
  }
}
