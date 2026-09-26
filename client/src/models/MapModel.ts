import type { Point } from './LandscapeModel'

/** One contour line of a loss surface, in the surface's own coordinates. */
export interface ContourLine {
  /** Index into the contour levels (0 = lowest loss). */
  readonly levelIndex: number
  readonly points: readonly Point[]
  readonly closed: boolean
}

/** Everything needed to draw a landscape level's map. Computed once per level by LevelService. */
export interface LandscapeMap {
  readonly bounds: { readonly min: Point; readonly max: Point }
  readonly contours: readonly ContourLine[]
  readonly levelCount: number
  /** The valley floor (global minimum). */
  readonly minimum: Point
  /** The ball must end within this distance of the minimum (drawn as the target ring). */
  readonly targetRadius: number
}
