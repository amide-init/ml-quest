import { describe, expect, it } from 'vitest'
import type { Metrics, StarRules } from '@/models'
import { checkCondition, evaluate } from './Evaluate'

const metrics = (overrides: Partial<Metrics> = {}): Metrics => ({
  steps: 10,
  moves: 0,
  test_loss: Number.NaN,
  loss_gap: Number.NaN,
  final_loss: 0.02,
  distance_to_global_min: 0.03,
  hints_used: 0,
  ...overrides,
})

// Roll Downhill: reach the valley in ≤ 15 steps; ≤ 10 for two stars; ≤ 7 and very close for three.
const RULES: StarRules = {
  pass: {
    all: [
      { metric: 'distance_to_global_min', op: '<=', value: 0.05 },
      { metric: 'steps', op: '<=', value: 15 },
    ],
  },
  two: { metric: 'steps', op: '<=', value: 10 },
  three: {
    all: [
      { metric: 'steps', op: '<=', value: 7 },
      { metric: 'distance_to_global_min', op: '<=', value: 0.02 },
    ],
  },
}

describe('checkCondition', () => {
  // Actual steps = 10 in every row.
  it.each([
    ['<', 11, true],
    ['<', 10, false],
    ['<=', 10, true],
    ['<=', 9, false],
    ['>', 9, true],
    ['>', 10, false],
    ['>=', 10, true],
    ['>=', 11, false],
    ['==', 10, true],
    ['==', 10.5, false],
  ] as const)('steps %s %s holds: %s', (op, value, holds) => {
    const failures = checkCondition({ metric: 'steps', op, value }, metrics({ steps: 10 }))
    expect(failures).toHaveLength(holds ? 0 : 1)
  })

  it('explains a failed leaf with the actual value', () => {
    expect(
      checkCondition({ metric: 'steps', op: '<=', value: 15 }, metrics({ steps: 18 })),
    ).toEqual([{ metric: 'steps', op: '<=', expected: 15, actual: 18 }])
  })

  it('requires every child of "all" and reports each failing one', () => {
    const failures = checkCondition(RULES.pass, metrics({ steps: 20, distance_to_global_min: 0.4 }))
    expect(failures.map((failure) => failure.metric)).toEqual(['distance_to_global_min', 'steps'])
  })

  it('accepts "any" when one child holds, and lists all alternatives when none do', () => {
    const condition = {
      any: [
        { metric: 'steps', op: '<=', value: 5 },
        { metric: 'final_loss', op: '<', value: 0.01 },
      ],
    } as const
    expect(checkCondition(condition, metrics({ steps: 4 }))).toEqual([])
    expect(checkCondition(condition, metrics())).toHaveLength(2)
  })

  it('fails every comparison against NaN (a diverged run can never pass)', () => {
    for (const op of ['<', '<=', '>', '>=', '=='] as const) {
      expect(
        checkCondition({ metric: 'final_loss', op, value: 1 }, metrics({ final_loss: Number.NaN })),
      ).toHaveLength(1)
    }
  })
})

describe('evaluate', () => {
  it('fails with 0 stars and explains why', () => {
    const result = evaluate(RULES, metrics({ distance_to_global_min: 0.3 }))
    expect(result).toMatchObject({ passed: false, stars: 0, cappedByHints: false })
    expect(result.failedConditions).toEqual([
      { metric: 'distance_to_global_min', op: '<=', expected: 0.05, actual: 0.3 },
    ])
    expect(result.nextStarConditions).toEqual(result.failedConditions)
  })

  it('awards 1 star and says what the second star needs', () => {
    const result = evaluate(RULES, metrics({ steps: 13 }))
    expect(result).toMatchObject({ passed: true, stars: 1 })
    expect(result.failedConditions).toEqual([])
    expect(result.nextStarConditions).toEqual([
      { metric: 'steps', op: '<=', expected: 10, actual: 13 },
    ])
  })

  it('awards 2 stars', () => {
    expect(evaluate(RULES, metrics({ steps: 9 })).stars).toBe(2)
  })

  it('awards 3 stars only when all tiers hold', () => {
    const result = evaluate(RULES, metrics({ steps: 6, distance_to_global_min: 0.01 }))
    expect(result).toMatchObject({ stars: 3, nextStarConditions: [] })
  })

  it('keeps stars cumulative: meeting "three" without "two" is not 3 stars', () => {
    const rules: StarRules = { ...RULES, two: { metric: 'final_loss', op: '<', value: 0.001 } }
    expect(evaluate(rules, metrics({ steps: 6, distance_to_global_min: 0.01 })).stars).toBe(1)
  })

  it('caps a 3-star result at 2 when a hint was used', () => {
    const result = evaluate(
      RULES,
      metrics({ steps: 6, distance_to_global_min: 0.01, hints_used: 1 }),
    )
    expect(result).toMatchObject({
      passed: true,
      stars: 2,
      cappedByHints: true,
      nextStarConditions: [],
    })
  })

  it('never lets hints block passing', () => {
    expect(evaluate(RULES, metrics({ steps: 14, hints_used: 3 })).stars).toBe(1)
  })
})
