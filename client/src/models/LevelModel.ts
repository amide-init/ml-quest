import { z } from 'zod'
import { starRulesSchema } from './ConditionModel'
import { linearNoisySpecSchema } from './DatasetModel'
import { landscapeSpecSchema, pointSchema } from './LandscapeModel'

export const levelIdSchema = z.string().regex(/^w[1-6]-l[1-8]$/, 'Level ids look like "w1-l3"')
export type LevelId = z.infer<typeof levelIdSchema>

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
 * Which algorithm a level trains, its setup and its controls. A discriminated union, so each
 * algorithm declares exactly the fields it needs.
 */
export const levelAlgorithmSchema = z.discriminatedUnion('id', [
  z.object({
    id: z.literal('landscape-2d'),
    landscape: landscapeSpecSchema,
    /** Where the ball starts. */
    start: pointSchema,
    /** "In the valley" = within this distance of the global minimum. */
    targetRadius: z.number().positive(),
    /** Who moves the ball (ARCHITECTURE §3 "optimizer slot"). */
    optimizer: z.discriminatedUnion('id', [
      z.object({
        /** The player takes each step and picks its size (W1-L3 Roll Downhill). */
        id: z.literal('manual-steps'),
        learningRate: rangeControlSchema,
        /** The attempt ends (and is checked) after this many steps. */
        stepBudget: z.number().int().positive(),
      }),
      z.object({
        /** The player picks the start; gradient descent rolls the ball (W1-L5 Bumpy Terrain). */
        id: z.literal('auto-descent'),
        learningRate: z.number().positive(),
        maxSteps: z.number().int().positive().max(1000),
        /** The ball has settled when a step moves it less than this. */
        settleDistance: z.number().positive(),
      }),
    ]),
  }),
  z.object({
    id: z.literal('linear-regression'),
    dataset: linearNoisySpecSchema,
    /** The line the player (or the optimizer) starts from. */
    initial: z.object({ w: z.number(), b: z.number() }),
    /** Visible data window (also the drag range of the line's handles). */
    view: z.object({ xMin: z.number(), xMax: z.number(), yMin: z.number(), yMax: z.number() }),
    /** Who changes the parameters (ARCHITECTURE §3 "optimizer slot"). */
    optimizer: z.discriminatedUnion('id', [
      z.object({
        /** The player drags the line (W1-L1, W1-L2). */
        id: z.literal('manual'),
        /** Show the live loss meter (W1-L2) or only the residuals (W1-L1). */
        showLoss: z.boolean(),
        /** When set, the attempt is checked automatically after this many moves. */
        moveBudget: z.number().int().positive().optional(),
      }),
      z.object({
        /** The player picks the learning rate and presses Train (W1-L4). */
        id: z.literal('gradient-descent'),
        learningRate: rangeControlSchema,
        /** Training stops after this many epochs. */
        maxEpochs: z.number().int().positive().max(500),
        /** "Converged" = training loss within this much of the best possible loss. */
        convergenceGap: z.number().positive(),
      }),
    ]),
  }),
])
export type LevelAlgorithm = z.infer<typeof levelAlgorithmSchema>
export type AlgorithmId = LevelAlgorithm['id']

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

/** A level config narrowed to one algorithm, e.g. LevelOf<'linear-regression'>. */
export type LevelOf<Id extends AlgorithmId> = LevelConfig & {
  readonly algorithm: Extract<LevelAlgorithm, { id: Id }>
}

type LandscapeAlgorithm = Extract<LevelAlgorithm, { id: 'landscape-2d' }>
export type LandscapeOptimizerId = LandscapeAlgorithm['optimizer']['id']

/** A landscape level narrowed to one optimizer, e.g. LandscapeLevelWith<'auto-descent'>. */
export type LandscapeLevelWith<Id extends LandscapeOptimizerId> = LevelConfig & {
  readonly algorithm: LandscapeAlgorithm & {
    readonly optimizer: Extract<LandscapeAlgorithm['optimizer'], { id: Id }>
  }
}

type RegressionAlgorithm = Extract<LevelAlgorithm, { id: 'linear-regression' }>
export type OptimizerId = RegressionAlgorithm['optimizer']['id']

/** A linear-regression level narrowed to one optimizer, e.g. RegressionLevelWith<'gradient-descent'>. */
export type RegressionLevelWith<Id extends OptimizerId> = LevelConfig & {
  readonly algorithm: RegressionAlgorithm & {
    readonly optimizer: Extract<RegressionAlgorithm['optimizer'], { id: Id }>
  }
}
