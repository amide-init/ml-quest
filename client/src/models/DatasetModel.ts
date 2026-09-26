import { z } from 'zod'

/** Points for 1D regression: x and y columns of equal length. */
export interface RegressionData {
  readonly x: Float64Array
  readonly y: Float64Array
}

/** Several input features (one column each) and a target: y ≈ w₁x₁ + w₂x₂ + … + b. */
export interface TabularData {
  readonly columns: readonly Float64Array[]
  readonly y: Float64Array
}

/** Points in 2D with a class label (0 or 1), for classification (World 2). */
export interface ClassificationData {
  readonly x1: Float64Array
  readonly x2: Float64Array
  /** 0 or 1 per point. */
  readonly label: Uint8Array
}

/** Every dataset comes as a visible training set and a hidden test set (ARCHITECTURE D6). */
export interface DatasetSplit<TData> {
  readonly train: TData
  /** Never rendered or sent to UI components; only metrics computed from it are shown. */
  readonly test: TData
  /** Indices of deliberately corrupted training points (W1-L6). Ground truth for scoring only. */
  readonly outlierIndices: readonly number[]
}

/** y = slope · x + intercept + Gaussian noise, x uniform in [xMin, xMax]. */
export const linearNoisySpecSchema = z
  .object({
    generator: z.literal('linear-noisy'),
    trainCount: z.number().int().min(2).max(500),
    testCount: z.number().int().min(1).max(500),
    slope: z.number(),
    intercept: z.number(),
    noise: z.number().nonnegative(),
    xMin: z.number(),
    xMax: z.number(),
    /**
     * Extra corrupted points added to the TRAINING set only (the test set stays clean): each sits
     * `offset` away from the true line (± 25% jitter). A signed offset pulls the fit one way.
     * Their x values are drawn from [outlierXMin, outlierXMax] so they can be placed for leverage.
     */
    outliers: z
      .object({
        count: z.number().int().min(1).max(50),
        offset: z.number(),
        xMin: z.number(),
        xMax: z.number(),
      })
      .optional(),
  })
  .refine((spec) => spec.xMin < spec.xMax, { message: 'xMin must be below xMax' })
export type LinearNoisySpec = z.infer<typeof linearNoisySpecSchema>

/** y = Σ weightᵢ · xᵢ + intercept + Gaussian noise, each xᵢ uniform in its own range (W1-L7). */
export const linearMultiSpecSchema = z.object({
  generator: z.literal('linear-multi'),
  trainCount: z.number().int().min(3).max(500),
  testCount: z.number().int().min(1).max(500),
  weights: z.array(z.number()).min(1).max(8),
  intercept: z.number(),
  noise: z.number().nonnegative(),
  /** One [min, max] per feature, in the same order as weights. Uneven ranges are the point of W1-L7. */
  ranges: z
    .array(z.tuple([z.number(), z.number()]))
    .min(1)
    .max(8),
})
export type LinearMultiSpec = z.infer<typeof linearMultiSpecSchema>

/** Two Gaussian clusters, one per class (W2 "Split the Kingdom"). Overlap sets how hard the split is. */
export const twoBlobsSpecSchema = z.object({
  generator: z.literal('two-blobs'),
  /** Points per class in the training set; the test set is the same size per class. */
  trainPerClass: z.number().int().min(2).max(250),
  /** Up to 400 so an imbalanced level still has enough minority points to measure recall. */
  testPerClass: z.number().int().min(1).max(400),
  /** Cluster centres for class 0 and class 1. */
  centers: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
  /** Standard deviation of each cluster. */
  spread: z.number().positive(),
  /**
   * Class 1 gets this share of class 0's count in both splits (W2-L6 Unfair Data: 0.1 = one
   * minority point per ten). Absent = balanced.
   */
  minorityShare: z.number().gt(0).lt(1).optional(),
})
export type TwoBlobsSpec = z.infer<typeof twoBlobsSpecSchema>

/** A disc of one class inside a ring of the other (W2 "Not a Straight Line"): no straight line splits it. */
export const ringsSpecSchema = z.object({
  generator: z.literal('rings'),
  trainPerClass: z.number().int().min(2).max(250),
  testPerClass: z.number().int().min(1).max(400),
  /** Mean radius of the inner disc (class 1) and the outer ring (class 0). */
  innerRadius: z.number().positive(),
  outerRadius: z.number().positive(),
  /** Radial spread of each band. */
  spread: z.number().positive(),
  /** The disc (class 1) gets this share of the ring's count (W2-L8 boss). Absent = balanced. */
  minorityShare: z.number().gt(0).lt(1).optional(),
})
export type RingsSpec = z.infer<typeof ringsSpecSchema>

const classSchema = z.union([z.literal(0), z.literal(1)])

/**
 * Axis-aligned regions (World 3, decision trees): the map is cut into cells at `xCuts` and
 * `yCuts`, each cell has a class, points fall uniformly, and `labelNoise` flips a share of labels.
 * Cuts can sit anywhere, so the right split is rarely "the middle".
 */
export const gridRegionsSpecSchema = z
  .object({
    generator: z.literal('grid-regions'),
    bounds: z.object({ xMin: z.number(), xMax: z.number(), yMin: z.number(), yMax: z.number() }),
    xCuts: z.array(z.number()),
    yCuts: z.array(z.number()),
    /** Class of each cell, rows from the top (largest y) down, columns left to right. */
    cells: z.array(z.array(classSchema).min(1)).min(1),
    trainCount: z.number().int().min(4).max(500),
    testCount: z.number().int().min(1).max(1000),
    labelNoise: z.number().min(0).max(0.5),
  })
  .refine(
    (spec) =>
      spec.cells.length === spec.yCuts.length + 1 &&
      spec.cells.every((row) => row.length === spec.xCuts.length + 1),
    { message: 'cells must have yCuts + 1 rows of xCuts + 1 columns' },
  )
export type GridRegionsSpec = z.infer<typeof gridRegionsSpecSchema>

/** Features a player can give a 2D classifier: the raw inputs and their degree-2 combinations. */
export const polynomialFeatureSchema = z.enum(['x1', 'x2', 'x1^2', 'x2^2', 'x1*x2'])
export type PolynomialFeature = z.infer<typeof polynomialFeatureSchema>
