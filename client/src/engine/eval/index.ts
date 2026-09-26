/**
 * Metrics registry, condition DSL, and the pass/star evaluator.
 * See ARCHITECTURE.md §4 and §5.4.
 */
export { checkCondition, evaluate } from './Evaluate'
export { computeMetrics, METRICS, precisionOf, recallOf } from './Metrics'
export type { MetricDefinition, MetricInput } from './Metrics'
