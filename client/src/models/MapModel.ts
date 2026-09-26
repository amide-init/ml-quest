import type { Point } from './LandscapeModel'

/** One contour line of a loss surface, in the surface's own coordinates. */
export interface ContourLine {
  /** Index into the contour levels (0 = lowest loss). */
  readonly levelIndex: number
  readonly points: readonly Point[]
  readonly closed: boolean
}

/** Everything needed to draw a landscape level's map. Computed once per level. */
export interface LandscapeMap {
  readonly kind: 'landscape'
  readonly bounds: { readonly min: Point; readonly max: Point }
  readonly contours: readonly ContourLine[]
  readonly levelCount: number
  /** The valley floor (global minimum). */
  readonly minimum: Point
  /** The ball must end within this distance of the minimum (drawn as the target ring). */
  readonly targetRadius: number
  readonly stepBudget: number
  readonly learningRate: { readonly min: number; readonly max: number; readonly step: number }
}

/** Everything needed to draw a regression level. Contains ONLY the training points (ARCHITECTURE D6). */
export interface RegressionScene {
  readonly kind: 'regression'
  readonly points: readonly Point[]
  readonly view: {
    readonly xMin: number
    readonly xMax: number
    readonly yMin: number
    readonly yMax: number
  }
  readonly showLoss: boolean
  readonly moveBudget: number | null
  /** Loss of the starting line, so the meter has a sensible scale. */
  readonly initialLoss: number
}

export type LevelScene = LandscapeMap | RegressionScene
