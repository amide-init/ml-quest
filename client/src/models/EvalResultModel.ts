import type { Comparison, MetricId } from './ConditionModel'

export type StarCount = 0 | 1 | 2 | 3

export type Metrics = Readonly<Record<MetricId, number>>

/** A leaf condition that did not hold, with the actual value, so the UI can say what missed and by how much. */
export interface ConditionFailure {
  readonly metric: MetricId
  readonly op: Comparison
  readonly expected: number
  readonly actual: number
}

export interface EvalResult {
  readonly passed: boolean
  readonly stars: StarCount
  readonly metrics: Metrics
  /** Why the level was not passed (empty when passed). */
  readonly failedConditions: readonly ConditionFailure[]
  /** What stands between this result and the next star (empty at 3 stars). */
  readonly nextStarConditions: readonly ConditionFailure[]
  /** True when a hint was used and the result was capped at 2 stars. */
  readonly cappedByHints: boolean
}
