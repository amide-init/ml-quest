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
    points_removed: Number.NaN,
    good_points_removed: Number.NaN,
    speedup: Number.NaN,
    accuracy: Number.NaN,
    test_accuracy: Number.NaN,
    min_confidence: Number.NaN,
    feature_count: Number.NaN,
    accuracy_gap: Number.NaN,
    recall: Number.NaN,
    test_recall: Number.NaN,
    precision: Number.NaN,
    test_precision: Number.NaN,
    f1: Number.NaN,
    test_f1: Number.NaN,
    leaf_count: Number.NaN,
    split_count: Number.NaN,
    impurity: Number.NaN,
    instability: Number.NaN,
    ...overrides,
  }
}
