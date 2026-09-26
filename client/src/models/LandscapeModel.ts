import { z } from 'zod'

export const pointSchema = z.tuple([z.number(), z.number()])
export type Point = z.infer<typeof pointSchema>

/**
 * A synthetic 2D loss surface for World 1 (Roll Downhill, Bumpy Terrain).
 * f(p) = bowl(p) − Σ wells(p) + ripple(p). The ball's position p = (x, y) is the parameter vector.
 */
export const landscapeSpecSchema = z.object({
  /** The playable map. Leaving it counts as divergence. */
  bounds: z.object({ min: pointSchema, max: pointSchema }),
  /** A rotated elliptical valley: ((u / rx)² + (v / ry)²), where (u, v) is p − center rotated by angleDeg. */
  bowl: z.object({
    center: pointSchema,
    radii: z.tuple([z.number().positive(), z.number().positive()]),
    angleDeg: z.number(),
  }),
  /** Gaussian dips: −depth · exp(−‖p − center‖² / (2 · width²)). Used for local minima. */
  wells: z
    .array(
      z.object({
        center: pointSchema,
        depth: z.number().positive(),
        width: z.number().positive(),
      }),
    )
    .default([]),
  /** Gentle terrain texture: amplitude · sin(frequency · x) · cos(frequency · y). */
  ripple: z
    .object({ amplitude: z.number().nonnegative(), frequency: z.number().positive() })
    .optional(),
})

export type LandscapeSpec = z.infer<typeof landscapeSpecSchema>
