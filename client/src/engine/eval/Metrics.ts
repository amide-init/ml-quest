import type { Algorithm, MetricId, Metrics, TracedCommand, Vector } from '@/models'
import { distance } from '@/engine/math'

/** Everything a metric may look at. Grows as later worlds add datasets and test splits. */
export interface MetricInput<TData = void> {
  readonly algorithm: Algorithm<TData>
  readonly data: TData
  /** The model's parameters when the player pressed Check (the ball's position in World 1). */
  readonly params: Vector
  readonly trace: readonly TracedCommand[]
  readonly hintsRevealed: number
  /** Only for landscape levels: where the true valley floor is. */
  readonly globalMinimum?: Vector
}

export interface MetricDefinition {
  /** Which direction is better. Used to phrase feedback ("3 steps too many"). */
  readonly better: 'lower' | 'higher'
  readonly compute: <TData>(input: MetricInput<TData>) => number
}

/** Metric registry (ARCHITECTURE §5.4). Adding a metric = one entry here + its id in ConditionModel. */
export const METRICS: Readonly<Record<MetricId, MetricDefinition>> = {
  steps: {
    better: 'lower',
    compute: (input) => input.trace.filter((entry) => entry.command.type === 'step').length,
  },
  final_loss: {
    better: 'lower',
    compute: (input) => input.algorithm.loss(input.params, input.data),
  },
  distance_to_global_min: {
    better: 'lower',
    // Without a known minimum the metric is undefined; NaN fails every comparison, so it can't pass by accident.
    compute: (input) =>
      input.globalMinimum ? distance(input.params, input.globalMinimum) : Number.NaN,
  },
  hints_used: {
    better: 'lower',
    compute: (input) => input.hintsRevealed,
  },
}

export function computeMetrics<TData>(input: MetricInput<TData>): Metrics {
  const entries = Object.entries(METRICS).map(([id, metric]) => [id, metric.compute(input)])
  return Object.fromEntries(entries) as Record<MetricId, number>
}
