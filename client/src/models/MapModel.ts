import type { PolynomialFeature } from './DatasetModel'
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

/** A labelled point in feature space. */
export interface LabelledPoint {
  readonly x: number
  readonly y: number
  /** 0 or 1. */
  readonly label: number
}

/** A hidden test point, revealed only after it has been judged (D6): was the model right about it? */
export interface CheckedPoint extends LabelledPoint {
  readonly correct: boolean
}

/** A classification level (World 2): training points only, never the hidden test set. */
export interface BoundaryScene {
  readonly kind: 'boundary'
  readonly points: readonly LabelledPoint[]
  readonly view: RegressionScene['view']
}

/** A 1D confidence level (W2-L2): labelled training points along x and the slider ranges. */
export interface SigmoidScene {
  readonly kind: 'sigmoid'
  readonly points: readonly { readonly x: number; readonly label: number }[]
  readonly xMin: number
  readonly xMax: number
  readonly slope: { readonly min: number; readonly max: number; readonly step: number }
  readonly threshold: { readonly min: number; readonly max: number; readonly step: number }
}

/** A feature-builder level (W2-L3): labelled training points and the features on offer. */
export interface FeatureScene {
  readonly kind: 'features'
  readonly points: readonly LabelledPoint[]
  readonly view: RegressionScene['view']
  readonly available: readonly PolynomialFeature[]
}

/** A model-complexity level (W2-L4): labelled training points and the degree range. */
export interface ComplexityScene {
  readonly kind: 'complexity'
  readonly points: readonly LabelledPoint[]
  readonly view: RegressionScene['view']
  /** The degree slider, or null when the level fixes the degree. */
  readonly degree: { readonly min: number; readonly max: number; readonly step: number } | null
  /** The L2 strength slider (W2-L5), or null when the level has none. */
  readonly regularization: {
    readonly min: number
    readonly max: number
    readonly step: number
  } | null
  /** The minority-oversampling slider (W2-L6), or null when the level has none. */
  readonly oversample: { readonly min: number; readonly max: number; readonly step: number } | null
  /** The decision-threshold slider (W2-L7), or null: the model is then trained by the player. */
  readonly threshold: { readonly min: number; readonly max: number; readonly step: number } | null
}

export type LevelScene =
  | LandscapeMap
  | RegressionScene
  | TrainingScene
  | CleaningScene
  | ScalingScene
  | BoundaryScene
  | SigmoidScene
  | FeatureScene
  | ComplexityScene
