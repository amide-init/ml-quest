import type { Vector } from '@/models'
import { trainGradientDescent, type TrainOptions, type TrainResult } from './Train'

/** 10^0, 10^-1/8, 10^-2/8 … down to 10^-5: 41 learning rates spaced evenly on a log scale. */
export const LOG_LEARNING_RATES: readonly number[] = Array.from(
  { length: 41 },
  (_, k) => 10 ** (-k / 8),
)

export interface LearningRateSearch {
  readonly learningRate: number
  readonly result: TrainResult
}

/**
 * The fastest-converging learning rate among the candidates, or null if none converges.
 * Used for fair baselines: "the best anyone could do without feature scaling" (W1-L7).
 */
export function searchLearningRate<TData>(
  options: Omit<TrainOptions<TData>, 'learningRate'> & { readonly initial: Vector },
  candidates: readonly number[] = LOG_LEARNING_RATES,
): LearningRateSearch | null {
  let best: LearningRateSearch | null = null
  for (const learningRate of candidates) {
    const result = trainGradientDescent({ ...options, learningRate })
    const epochs = result.convergedAt
    if (epochs !== null && (best === null || epochs < (best.result.convergedAt ?? Infinity))) {
      best = { learningRate, result }
    }
  }
  return best
}
