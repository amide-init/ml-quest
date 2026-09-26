import { z } from 'zod'

/** Points for 1D regression: x and y columns of equal length. */
export interface RegressionData {
  readonly x: Float64Array
  readonly y: Float64Array
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
