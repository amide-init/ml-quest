import type { Algorithm, Vector } from '@/models'
import { gradientDescentStep } from './optimizers/GradientDescent'

export interface TrainOptions<TData> {
  readonly algorithm: Algorithm<TData>
  readonly data: TData
  readonly initial: Vector
  readonly learningRate: number
  readonly maxEpochs: number
  /**
   * Stop early once this returns true. Gets the epoch's loss, its parameters and the previous
   * parameters, so "converged" can mean a loss target (W1-L4) or "stopped moving" (W1-L5).
   */
  readonly isConverged: (loss: number, params: Vector, previous: Vector) => boolean
}

export interface TrainResult {
  /** Parameters and loss after each epoch; index 0 is the starting point. */
  readonly epochs: readonly { readonly params: Vector; readonly loss: number }[]
  readonly status: 'converged' | 'diverged' | 'too-slow'
  readonly convergedAt: number | null
}

/**
 * A loss whose size grows past this multiple of the starting loss's size counts as divergence
 * (the run is stopped). Compared by magnitude: loss surfaces can be negative (landscape wells).
 */
const DIVERGENCE_FACTOR = 1e4

/**
 * Full-batch gradient descent, one step per epoch, recording every epoch so the UI can replay it.
 * Divergence (NaN, Infinity or a runaway loss) ends the run with status "diverged": it is the
 * lesson of W1-L4, never an error (RULES.md §2).
 */
export function trainGradientDescent<TData>(options: TrainOptions<TData>): TrainResult {
  const { algorithm, data, initial, learningRate, maxEpochs, isConverged } = options
  const startLoss = algorithm.loss(initial, data)
  const epochs: { params: Vector; loss: number }[] = [{ params: initial, loss: startLoss }]
  if (isConverged(startLoss, initial, initial)) {
    return { epochs, status: 'converged', convergedAt: 0 }
  }

  const divergenceLimit = Math.max(Math.abs(startLoss), 1) * DIVERGENCE_FACTOR
  let params = initial
  for (let epoch = 1; epoch <= maxEpochs; epoch++) {
    const step = gradientDescentStep(algorithm, params, data, learningRate)
    const previous = params
    params = step.params
    epochs.push({ params, loss: step.loss })
    if (step.status === 'diverged' || Math.abs(step.loss) > divergenceLimit) {
      return { epochs, status: 'diverged', convergedAt: null }
    }
    if (isConverged(step.loss, params, previous)) {
      return { epochs, status: 'converged', convergedAt: epoch }
    }
  }
  return { epochs, status: 'too-slow', convergedAt: null }
}
