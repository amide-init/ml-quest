import { z } from 'zod'

/** Metrics a level can be judged on. Each id has an implementation in engine/eval/Metrics.ts. */
export const metricIdSchema = z.enum([
  'steps',
  'final_loss',
  'distance_to_global_min',
  'hints_used',
])
export type MetricId = z.infer<typeof metricIdSchema>

export const comparisonSchema = z.enum(['<', '<=', '>', '>=', '=='])
export type Comparison = z.infer<typeof comparisonSchema>

const leafConditionSchema = z.object({
  metric: metricIdSchema,
  op: comparisonSchema,
  value: z.number(),
})
export type LeafCondition = z.infer<typeof leafConditionSchema>

/** The condition DSL (ARCHITECTURE §5.4): a leaf comparison, or all/any of nested conditions. Data only. */
export type Condition =
  LeafCondition | { readonly all: readonly Condition[] } | { readonly any: readonly Condition[] }

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    leafConditionSchema,
    z.object({ all: z.array(conditionSchema).min(1) }),
    z.object({ any: z.array(conditionSchema).min(1) }),
  ]),
)

/**
 * Star tiers. Stars are cumulative: 2 stars needs pass + two; 3 stars needs all three.
 * Using any hint caps the result at 2 stars (PRD "Hints").
 */
export const starRulesSchema = z.object({
  pass: conditionSchema,
  two: conditionSchema,
  three: conditionSchema,
})
export type StarRules = z.infer<typeof starRulesSchema>
