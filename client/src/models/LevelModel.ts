import { z } from 'zod'
import { starRulesSchema } from './ConditionModel'
import {
  linearMultiSpecSchema,
  linearNoisySpecSchema,
  polynomialFeatureSchema,
  ringsSpecSchema,
  twoBlobsSpecSchema,
} from './DatasetModel'
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
        /** Let the player remove training points before training (W1-L8 boss). */
        allowCleaning: z.boolean().default(false),
        /** Let the player standardize the feature before training (W1-L8 boss). */
        allowScaling: z.boolean().default(false),
        /** With cleaning on, at least this many points must remain. */
        minPoints: z.number().int().min(2).default(5),
      }),
      z.object({
        /** The line is refit exactly after every data change; the player edits the data (W1-L6). */
        id: z.literal('least-squares'),
        /** The player can't remove points below this count (a line needs at least 2). */
        minPoints: z.number().int().min(2),
      }),
    ]),
  }),
  z.object({
    /** Several features, one weight each (W1-L7 Scale Matters). */
    id: z.literal('multi-linear-regression'),
    dataset: linearMultiSpecSchema,
    /** Locale keys naming each feature, in dataset order. */
    featureLabels: z.array(z.string()).min(1),
    optimizer: z.object({
      /** The player picks the learning rate, may scale the features, and presses Train. */
      id: z.literal('gradient-descent'),
      learningRate: rangeControlSchema,
      maxEpochs: z.number().int().positive().max(2000),
      /** "Converged" = training loss within this much of the best possible loss. */
      convergenceGap: z.number().positive(),
    }),
  }),
  z.object({
    /** Classification with a straight boundary (World 2). */
    id: z.literal('logistic-regression'),
    dataset: z.discriminatedUnion('generator', [twoBlobsSpecSchema, ringsSpecSchema]),
    /** Visible window of the 2D feature space. */
    view: z.object({ xMin: z.number(), xMax: z.number(), yMin: z.number(), yMax: z.number() }),
    optimizer: z.discriminatedUnion('id', [
      z.object({
        /** The player places the boundary by dragging two handles (W2-L1 Split the Kingdom). */
        id: z.literal('manual-boundary'),
        initial: z.object({ p: pointSchema, q: pointSchema }),
      }),
      z.object({
        /**
         * 1D: p(class 1) = sigmoid(slope · (x − threshold)); the player tunes both (W2-L2 Confidence).
         * Only the first feature is used.
         */
        id: z.literal('manual-sigmoid'),
        slope: rangeControlSchema,
        threshold: rangeControlSchema,
      }),
      z.object({
        /**
         * The player picks which features the model sees (x1, x2, x1², …), then trains it with
         * gradient descent on standardized features (W2-L3 Not a Straight Line).
         */
        id: z.literal('feature-builder'),
        available: z.array(polynomialFeatureSchema).min(1),
        initial: z.array(polynomialFeatureSchema),
        learningRate: z.number().positive(),
        maxEpochs: z.number().int().positive().max(2000),
      }),
      z.object({
        /**
         * The player picks the polynomial degree (every term up to it), trains to see the border, and
         * checks when happy; only Check reveals hidden accuracy (W2-L4 The Overfitter).
         */
        id: z.literal('complexity'),
        /** A slider (W2-L4), or a fixed degree when the level is about something else (W2-L5). */
        degree: z.union([rangeControlSchema, z.number().int().min(1).max(8)]),
        /** L2 strength slider (W2-L5 Tame It). Absent = no regularization. */
        regularization: rangeControlSchema.optional(),
        /** Minority oversampling slider, ×1 upward (W2-L6 Unfair Data). Absent = no rebalancing. */
        oversample: rangeControlSchema.optional(),
        /**
         * Decision-threshold slider on p(class 1) (W2-L7 Read the Matrix). When present the model
         * comes pre-trained and the player only moves the threshold. Absent = 0.5.
         */
        threshold: rangeControlSchema
          .refine((control) => control.min > 0 && control.max < 1, {
            message: 'A probability threshold must stay strictly between 0 and 1',
          })
          .optional(),
        learningRate: z.number().positive(),
        maxEpochs: z.number().int().positive().max(5000),
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
      /** Optional reading on the level screen (Field notes): the idea, the controls, the result. */
      notes: z.object({ idea: z.string(), controls: z.string(), reading: z.string() }),
    }),
    authors: z.array(z.string()).default([]),
    /** Still being built: shown in development and tested in CI, hidden on the live site. */
    draft: z.boolean().optional(),
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

type LogisticAlgorithm = Extract<LevelAlgorithm, { id: 'logistic-regression' }>

/** A logistic-regression level narrowed to one optimizer, e.g. LogisticLevelWith<'manual-sigmoid'>. */
export type LogisticLevelWith<Id extends LogisticAlgorithm['optimizer']['id']> = LevelConfig & {
  readonly algorithm: LogisticAlgorithm & {
    readonly optimizer: Extract<LogisticAlgorithm['optimizer'], { id: Id }>
  }
}
