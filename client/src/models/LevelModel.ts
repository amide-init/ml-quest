import { z } from 'zod'
import { starRulesSchema } from './ConditionModel'
import { landscapeSpecSchema, pointSchema } from './LandscapeModel'

export const levelIdSchema = z.string().regex(/^w[1-6]-l[1-8]$/, 'Level ids look like "w1-l3"')
export type LevelId = z.infer<typeof levelIdSchema>

/** Which algorithm a level trains, and its setup. A discriminated union so each algorithm gets its own fields. */
export const levelAlgorithmSchema = z.discriminatedUnion('id', [
  z.object({
    id: z.literal('landscape-2d'),
    landscape: landscapeSpecSchema,
    /** Where the ball starts. */
    start: pointSchema,
    /** "In the valley" = within this distance of the global minimum. */
    targetRadius: z.number().positive(),
  }),
])
export type LevelAlgorithm = z.infer<typeof levelAlgorithmSchema>

const rangeControlSchema = z
  .object({
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    initial: z.number(),
  })
  .refine((c) => c.min < c.max && c.initial >= c.min && c.initial <= c.max, {
    message: 'Range control needs min < max and min ≤ initial ≤ max',
  })

/**
 * A level is data (ARCHITECTURE §5.5, RULES.md §3): no code, player-facing text as locale keys.
 * Pass and stars are decided only by `stars`, through the evaluator.
 */
export const levelConfigSchema = z
  .object({
    $schema: z.string().optional(),
    schemaVersion: z.literal(1),
    id: levelIdSchema,
    world: z.number().int().min(1).max(6),
    level: z.number().int().min(1).max(8),
    seed: z.number().int().nonnegative(),
    algorithm: levelAlgorithmSchema,
    controls: z.object({
      learningRate: rangeControlSchema,
      /** The attempt ends (and is checked) after this many steps. */
      stepBudget: z.number().int().positive(),
    }),
    stars: starRulesSchema,
    text: z.object({
      title: z.string(),
      mission: z.string(),
      hints: z.tuple([z.string(), z.string(), z.string()]),
      debrief: z.string(),
      concept: z.string(),
    }),
    authors: z.array(z.string()).default([]),
  })
  .refine((config) => config.id === `w${config.world}-l${config.level}`, {
    message: 'Level id must match world and level, e.g. world 1 level 3 → "w1-l3"',
  })

export type LevelConfig = z.infer<typeof levelConfigSchema>
