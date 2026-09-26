import type {
  Comparison,
  Condition,
  ConditionFailure,
  EvalResult,
  Metrics,
  StarCount,
  StarRules,
} from '@/models'
import { assertNever } from '@/lib'

function compare(actual: number, op: Comparison, expected: number): boolean {
  switch (op) {
    case '<':
      return actual < expected
    case '<=':
      return actual <= expected
    case '>':
      return actual > expected
    case '>=':
      return actual >= expected
    case '==':
      return actual === expected
    default:
      return assertNever(op)
  }
}

/**
 * Check a condition against metrics. Returns the leaf conditions that failed.
 * For `any`, a failure lists every alternative, since meeting any one of them would do.
 * NaN (e.g. a diverged run) fails every comparison.
 */
export function checkCondition(condition: Condition, metrics: Metrics): ConditionFailure[] {
  if ('all' in condition) {
    return condition.all.flatMap((child) => checkCondition(child, metrics))
  }
  if ('any' in condition) {
    const failures = condition.any.map((child) => checkCondition(child, metrics))
    return failures.some((childFailures) => childFailures.length === 0) ? [] : failures.flat()
  }
  const actual = metrics[condition.metric]
  return compare(actual, condition.op, condition.value)
    ? []
    : [{ metric: condition.metric, op: condition.op, expected: condition.value, actual }]
}

/**
 * The only authority on pass/fail and stars (ARCHITECTURE §5.4).
 * Stars are cumulative (3 needs pass + two + three); any revealed hint caps at 2.
 */
export function evaluate(rules: StarRules, metrics: Metrics): EvalResult {
  const passFailures = checkCondition(rules.pass, metrics)
  const twoFailures = checkCondition(rules.two, metrics)
  const threeFailures = checkCondition(rules.three, metrics)

  let earned: StarCount = 0
  if (passFailures.length === 0) {
    earned = 1
    if (twoFailures.length === 0) {
      earned = threeFailures.length === 0 ? 3 : 2
    }
  }

  const cappedByHints = earned === 3 && metrics.hints_used > 0
  const stars: StarCount = cappedByHints ? 2 : earned

  const nextStarConditions =
    stars === 0
      ? passFailures
      : stars === 1
        ? twoFailures
        : stars === 2 && !cappedByHints
          ? threeFailures
          : []

  return {
    passed: stars > 0,
    stars,
    metrics,
    failedConditions: passFailures,
    nextStarConditions,
    cappedByHints,
  }
}
