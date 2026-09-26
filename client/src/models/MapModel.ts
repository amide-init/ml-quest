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
  /** How this landscape is played: the player steps (W1-L3), or picks a start and rolls (W1-L5). */
  readonly play:
    | {
        readonly mode: 'manual-steps'
        readonly stepBudget: number
        readonly learningRate: { readonly min: number; readonly max: number; readonly step: number }
      }
    | { readonly mode: 'auto-descent'; readonly maxSteps: number }
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

/** A training level: the training points plus the controls and the loss target for the curve. */
export interface TrainingScene {
  readonly kind: 'training'
  readonly points: readonly Point[]
  readonly view: RegressionScene['view']
  readonly learningRate: { readonly min: number; readonly max: number; readonly step: number }
  readonly maxEpochs: number
  readonly initialLoss: number
  /** Extra tools some training levels allow (the W1-L8 boss combines them). */
  readonly allowCleaning: boolean
  readonly allowScaling: boolean
  readonly minPoints: number
}

/** A data-cleaning level: all training points (outliers included, unmarked) and the removal limit. */
export interface CleaningScene {
  readonly kind: 'cleaning'
  readonly points: readonly Point[]
  readonly view: RegressionScene['view']
  readonly minPoints: number
}

/** One input feature's range before and after scaling (for the feature-range panel). */
export interface FeatureRange {
  /** Locale key of the feature's name. */
  readonly label: string
  readonly min: number
  readonly max: number
  readonly scaledMin: number
  readonly scaledMax: number
}

/** A feature-scaling level (W1-L7): feature ranges, controls, and the best unscaled baseline. */
export interface ScalingScene {
  readonly kind: 'scaling'
  readonly features: readonly FeatureRange[]
  readonly learningRate: { readonly min: number; readonly max: number; readonly step: number }
  readonly maxEpochs: number
  readonly targetLoss: number
  readonly initialLoss: number
  /** The fastest any learning rate converges WITHOUT scaling: the bar to beat. */
  readonly baseline: {
    readonly learningRate: number
    readonly epochs: number
    readonly losses: readonly number[]
  }
}

export type LevelScene =
  LandscapeMap | RegressionScene | TrainingScene | CleaningScene | ScalingScene
