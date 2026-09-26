import type { Metrics } from '@/models'

/**
 * A complete Metrics object for tests. Every metric defaults to NaN ("not measured"), so tests
 * only spell out what they care about and never break when a new metric is added.
 */
export function makeMetrics(overrides: Partial<Metrics> = {}): Metrics {
  return {
    steps: Number.NaN,
    moves: Number.NaN,
    epochs_to_converge: Number.NaN,
    final_loss: Number.NaN,
    test_loss: Number.NaN,
    loss_gap: Number.NaN,
    distance_to_global_min: Number.NaN,
    hints_used: 0,
    attempt: 1,
    ...overrides,
  }
}
