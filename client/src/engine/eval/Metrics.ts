import type { Algorithm, Confusion, MetricId, Metrics, TracedCommand, Vector } from '@/models'
import { distance } from '@/engine/math'

/**
 * The model's loss on some data, or NaN when the level's model has no loss (trees). Data may be
 * undefined on purpose: a loss landscape (World 1) needs none.
 */
const lossOn = <TData>(input: MetricInput<TData>, data: TData | undefined) =>
  input.algorithm && input.params ? input.algorithm.loss(input.params, data as TData) : Number.NaN

/** Share of class-1 points found (true positives over all real positives). NaN without positives. */
export const recallOf = (confusion: Confusion | undefined) =>
  confusion && confusion.truePositives + confusion.falseNegatives > 0
    ? confusion.truePositives / (confusion.truePositives + confusion.falseNegatives)
    : Number.NaN

/** Share of class-1 calls that were right (true positives over all positive calls). NaN if none. */
export const precisionOf = (confusion: Confusion | undefined) =>
  confusion && confusion.truePositives + confusion.falsePositives > 0
    ? confusion.truePositives / (confusion.truePositives + confusion.falsePositives)
    : Number.NaN

/**
 * F1 = 2·TP / (2·TP + FP + FN), the harmonic mean of precision and recall. Written this way it is
 * 0 (not NaN) for a model that finds nobody, which is exactly how bad that model is.
 */
export const f1Of = (confusion: Confusion | undefined) => {
  if (!confusion) return Number.NaN
  const { truePositives, falsePositives, falseNegatives } = confusion
  const denominator = 2 * truePositives + falsePositives + falseNegatives
  return denominator === 0 ? Number.NaN : (2 * truePositives) / denominator
}

/** Everything a metric may look at. Grows as later worlds add datasets and test splits. */
export interface MetricInput<TData = void> {
  /**
   * A gradient-based model, its training data and its parameters when the player pressed Check
   * (the ball's position in World 1). Absent for models without a loss, like decision trees:
   * the loss metrics are then NaN ("not measured").
   */
  readonly algorithm?: Algorithm<TData>
  readonly data?: TData
  readonly params?: Vector
  readonly trace: readonly TracedCommand[]
  readonly hintsRevealed: number
  /** Only for landscape levels: where the true valley floor is. */
  readonly globalMinimum?: Vector
  /** The hidden test set, when the level has one. Only metrics computed from it ever reach the UI. */
  readonly testData?: TData
  /** The best achievable training loss, when known (e.g. least squares), for "loss gap". */
  readonly optimalLoss?: number
  /** For training levels: the epoch at which training converged (null = never). */
  readonly convergedAt?: number | null
  /** Which attempt this is (1 = first try). */
  readonly attempt?: number
  /** Training points the player removed, and the ones that were really outliers (W1-L6). */
  readonly removedPoints?: readonly number[]
  readonly outlierPoints?: readonly number[]
  /** Epochs the best unscaled run needed, for "speedup" (W1-L7). */
  readonly baselineEpochs?: number
  /** Share of points classified correctly, on the training set and the hidden test set (World 2). */
  readonly trainAccuracy?: number
  readonly testAccuracy?: number
  /** The lowest probability any training point gets for its TRUE class (W2-L2). */
  readonly minConfidence?: number
  /** How many input features the model used (W2-L3). */
  readonly featureCount?: number
  /** Confusion counts (class 1 = positive) on the training and hidden test set (W2-L6+). */
  readonly trainConfusion?: Confusion
  readonly testConfusion?: Confusion
  /** Decision trees (World 3): leaves of the tree, weighted leaf Gini impurity, and the share of
   * hidden points on which trees grown from resampled data disagree. */
  readonly leafCount?: number
  readonly impurity?: number
  readonly instability?: number
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
  moves: {
    better: 'lower',
    compute: (input) => input.trace.filter((entry) => entry.command.type === 'set-params').length,
  },
  epochs_to_converge: {
    better: 'lower',
    // Never converged (too slow or diverged) = NaN, which fails every condition.
    compute: (input) => input.convergedAt ?? Number.NaN,
  },
  final_loss: {
    better: 'lower',
    compute: (input) => lossOn(input, input.data),
  },
  test_loss: {
    better: 'lower',
    compute: (input) => (input.testData === undefined ? Number.NaN : lossOn(input, input.testData)),
  },
  loss_gap: {
    better: 'lower',
    // How much worse than the best possible fit. 0 = optimal.
    compute: (input) =>
      input.optimalLoss === undefined ? Number.NaN : lossOn(input, input.data) - input.optimalLoss,
  },
  distance_to_global_min: {
    better: 'lower',
    // Without a known minimum the metric is undefined; NaN fails every comparison, so it can't pass by accident.
    compute: (input) =>
      input.globalMinimum && input.params
        ? distance(input.params, input.globalMinimum)
        : Number.NaN,
  },
  hints_used: {
    better: 'lower',
    compute: (input) => input.hintsRevealed,
  },
  attempt: {
    better: 'lower',
    compute: (input) => input.attempt ?? Number.NaN,
  },
  speedup: {
    better: 'higher',
    // How many times faster than the baseline; NaN if this run never converged.
    compute: (input) =>
      input.baselineEpochs === undefined || !input.convergedAt
        ? Number.NaN
        : input.baselineEpochs / input.convergedAt,
  },
  accuracy: {
    better: 'higher',
    compute: (input) => input.trainAccuracy ?? Number.NaN,
  },
  test_accuracy: {
    better: 'higher',
    compute: (input) => input.testAccuracy ?? Number.NaN,
  },
  leaf_count: {
    better: 'lower',
    compute: (input) => input.leafCount ?? Number.NaN,
  },
  split_count: {
    better: 'lower',
    // A binary tree with n leaves asks n - 1 questions.
    compute: (input) => (input.leafCount === undefined ? Number.NaN : input.leafCount - 1),
  },
  impurity: {
    better: 'lower',
    compute: (input) => input.impurity ?? Number.NaN,
  },
  instability: {
    better: 'lower',
    compute: (input) => input.instability ?? Number.NaN,
  },
  recall: {
    better: 'higher',
    compute: (input) => recallOf(input.trainConfusion),
  },
  precision: {
    better: 'higher',
    compute: (input) => precisionOf(input.trainConfusion),
  },
  test_precision: {
    better: 'higher',
    // W2-L7: of the people the model called class 1, how many really were.
    compute: (input) => precisionOf(input.testConfusion),
  },
  f1: {
    better: 'higher',
    compute: (input) => f1Of(input.trainConfusion),
  },
  test_f1: {
    better: 'higher',
    // W2-L8 boss: one number that needs both precision and recall (their harmonic mean).
    compute: (input) => f1Of(input.testConfusion),
  },
  test_recall: {
    better: 'higher',
    // W2-L6: how many of the rare class the model finds among people it has never seen.
    compute: (input) => recallOf(input.testConfusion),
  },
  accuracy_gap: {
    better: 'lower',
    // How far training and hidden accuracy are apart (W2-L5): a big gap means memorizing, not learning.
    compute: (input) =>
      input.trainAccuracy === undefined || input.testAccuracy === undefined
        ? Number.NaN
        : Math.abs(input.trainAccuracy - input.testAccuracy),
  },
  feature_count: {
    better: 'lower',
    compute: (input) => input.featureCount ?? Number.NaN,
  },
  min_confidence: {
    better: 'higher',
    compute: (input) => input.minConfidence ?? Number.NaN,
  },
  points_removed: {
    better: 'lower',
    compute: (input) => input.removedPoints?.length ?? Number.NaN,
  },
  good_points_removed: {
    better: 'lower',
    // Removing real data is a cost: only the planted outliers deserve to go.
    compute: (input) =>
      input.removedPoints === undefined
        ? Number.NaN
        : input.removedPoints.filter((index) => !input.outlierPoints?.includes(index)).length,
  },
}

export function computeMetrics<TData>(input: MetricInput<TData>): Metrics {
  const entries = Object.entries(METRICS).map(([id, metric]) => [id, metric.compute(input)])
  return Object.fromEntries(entries) as Record<MetricId, number>
}
