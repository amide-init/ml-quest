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
import { leastSquares, linearRegression, trainGradientDescent, vector, xy } from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'
import { prepareRegression } from './RegressionData'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

interface Prepared {
  /** The data gradient descent actually sees (kept points, standardized x if scaling is on). */
  readonly train: RegressionData
  /** Turn trained (possibly scaled) parameters back into a line in the original units. */
  readonly toRaw: (w: number, b: number) => { readonly w: number; readonly b: number }
  /** Best possible loss on the kept points. */
  readonly optimalLoss: number
  readonly kept: RegressionData
}

/**
 * Gradient descent on a line, with a player-chosen learning rate and a Train button.
 * W1-L4 Too Fast, Too Slow uses it as is. The W1-L8 boss also lets the player remove points and
 * standardize the feature before training. The whole run is computed at once (microseconds, so
 * inline per ARCHITECTURE §6.1) and recorded epoch by epoch, always in original units, for the UI.
 */
export class GradientDescentRunner implements LevelRunner {
  readonly scene: TrainingScene
  readonly #level: RegressionLevelWith<'gradient-descent'>
  readonly #evaluation: EvaluationService
  readonly #data: DatasetSplit<RegressionData>
  #snapshot: TrainingSnapshot

  constructor(level: RegressionLevelWith<'gradient-descent'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    const prepared = prepareRegression(level)
    this.#data = prepared.split
    const { optimizer, initial, view } = level.algorithm
    const initialLoss = prepared.loss(initial.w, initial.b)

    this.scene = {
      kind: 'training',
      points: prepared.points,
      view,
      learningRate: optimizer.learningRate,
      maxEpochs: optimizer.maxEpochs,
      initialLoss,
      allowCleaning: optimizer.allowCleaning,
      allowScaling: optimizer.allowScaling,
      minPoints: optimizer.minPoints,
    }
    this.#snapshot = {
      kind: 'training',
      learningRate: optimizer.learningRate.initial,
      initial: { ...initial, loss: initialLoss },
      run: null,
      removed: [],
      scaled: false,
      targetLoss: this.#prepare([], false).optimalLoss + optimizer.convergenceGap,
    }
  }

  get snapshot(): TrainingSnapshot {
    return this.#snapshot
  }

  apply(command: Command): TrainingSnapshot {
    const { optimizer, initial } = this.#level.algorithm
    const current = this.#snapshot
    switch (command.type) {
      case 'set-hyperparameter': {
        // Game rule, not math clamping: the slider's range is part of the level design.
        const { min, max } = optimizer.learningRate
        this.#snapshot = { ...current, learningRate: clamp(command.value, min, max) }
        break
      }
      case 'set-scaling':
        if (optimizer.allowScaling) {
          this.#snapshot = { ...current, scaled: command.enabled, run: null }
        }
        break
      case 'toggle-point': {
        if (!optimizer.allowCleaning) break
        const total = this.#data.train.x.length
        const { removed } = current
        const index = command.index
        if (!Number.isInteger(index) || index < 0 || index >= total) break
        const next = removed.includes(index)
          ? removed.filter((value) => value !== index)
          : total - removed.length > optimizer.minPoints
            ? [...removed, index]
            : removed
        this.#snapshot = {
          ...current,
          removed: next,
          run: null,
          targetLoss: this.#prepare(next, current.scaled).optimalLoss + optimizer.convergenceGap,
        }
        break
      }
      case 'train': {
        const prepared = this.#prepare(current.removed, current.scaled)
        const start = current.scaled
          ? this.#toScaled(initial.w, initial.b, current.removed)
          : initial
        const result = trainGradientDescent({
          algorithm: linearRegression,
          data: prepared.train,
          initial: vector(start.w, start.b),
          learningRate: current.learningRate,
          maxEpochs: optimizer.maxEpochs,
          isConverged: (loss) => loss - prepared.optimalLoss <= optimizer.convergenceGap,
        })
        this.#snapshot = {
          ...current,
          run: {
            learningRate: current.learningRate,
            epochs: result.epochs.map(({ params, loss }) => {
              const [w, b] = xy(params)
              return { ...prepared.toRaw(w, b), loss }
            }),
            status: result.status,
            convergedAt: result.convergedAt,
          },
        }
        break
      }
      case 'reset':
        this.#snapshot = { ...current, run: null }
        break
      case 'step':
      case 'set-start':
      case 'set-params':
      case 'check':
        break
    }
    return this.#snapshot
  }

  /** Every Train press is one experiment: it is judged immediately. */
  judge(command: Command, session: SessionState): EvalResult | null {
    const { run, removed, scaled } = this.#snapshot
    if (command.type !== 'train' || !run) {
      return null
    }
    const prepared = this.#prepare(removed, scaled)
    const last = run.epochs.at(-1)
    return this.#evaluation.evaluate(this.#level, {
      algorithm: linearRegression,
      data: prepared.kept,
      testData: this.#data.test,
      optimalLoss: prepared.optimalLoss,
      params: vector(last?.w ?? Number.NaN, last?.b ?? Number.NaN),
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      attempt: session.attempt,
      convergedAt: run.convergedAt,
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

  #stats(data: RegressionData): { readonly mean: number; readonly deviation: number } {
    const n = data.x.length
    const mean = data.x.reduce((sum, value) => sum + value, 0) / n
    const variance = data.x.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n
    return { mean, deviation: Math.sqrt(variance) || 1 }
  }

  /** The starting line expressed in scaled units (so scaled and unscaled runs start from the same line). */
  #toScaled(w: number, b: number, removed: readonly number[]) {
    const { mean, deviation } = this.#stats(this.#kept(removed))
    return { w: w * deviation, b: b + w * mean }
  }

  #prepare(removed: readonly number[], scaled: boolean): Prepared {
    const kept = this.#kept(removed)
    const best = leastSquares(kept)
    const optimalLoss = linearRegression.loss(vector(best.w, best.b), kept)
    if (!scaled) {
      return { train: kept, toRaw: (w, b) => ({ w, b }), optimalLoss, kept }
    }
    const { mean, deviation } = this.#stats(kept)
    return {
      train: { x: kept.x.map((value) => (value - mean) / deviation), y: kept.y },
      // ŷ = w_s · (x − mean) / deviation + b_s  ⇒  w = w_s / deviation, b = b_s − w_s · mean / deviation
      toRaw: (w, b) => ({ w: w / deviation, b: b - (w * mean) / deviation }),
      optimalLoss,
      kept,
    }
  }
}
