import type { Algorithm, Vector } from '@/models'
import { gradientDescentStep } from './optimizers/GradientDescent'

export interface TrainOptions<TData> {
  readonly algorithm: Algorithm<TData>
  readonly data: TData
  readonly initial: Vector
  readonly learningRate: number
  readonly maxEpochs: number
  /** Stop early once this returns true for an epoch's loss. */
  readonly isConverged: (loss: number) => boolean
}

export interface TrainResult {
  /** Parameters and loss after each epoch; index 0 is the starting point. */
  readonly epochs: readonly { readonly params: Vector; readonly loss: number }[]
  readonly status: 'converged' | 'diverged' | 'too-slow'
  readonly convergedAt: number | null
}

/** Loss growing past this multiple of the starting loss counts as divergence (the run is stopped). */
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
  if (isConverged(startLoss)) {
    return { epochs, status: 'converged', convergedAt: 0 }
  }

  let params = initial
  for (let epoch = 1; epoch <= maxEpochs; epoch++) {
    const step = gradientDescentStep(algorithm, params, data, learningRate)
    params = step.params
    epochs.push({ params, loss: step.loss })
    if (step.status === 'diverged' || step.loss > startLoss * DIVERGENCE_FACTOR) {
      return { epochs, status: 'diverged', convergedAt: null }
    }
    if (isConverged(step.loss)) {
      return { epochs, status: 'converged', convergedAt: epoch }
    }
  }
  return { epochs, status: 'too-slow', convergedAt: null }
}
