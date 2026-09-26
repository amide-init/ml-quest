import type { PolynomialFeature } from './DatasetModel'
import type { Point } from './LandscapeModel'
import type { ContourLine } from './MapModel'

/** What the UI renders for a landscape level at one moment (ARCHITECTURE §6). Plain data, easy to diff. */
export interface LandscapeSnapshot {
  readonly kind: 'landscape'
  /** The ball's position. */
  readonly position: Point
  /** Every position this attempt, starting point first (the trail). */
  readonly path: readonly Point[]
  readonly loss: number
  /** The slope at the ball. The step goes the opposite way. */
  readonly gradient: Point
  readonly learningRate: number
  /** Where the next step would land with the current step size. */
  readonly preview: Point
  readonly steps: number
  /** "diverged" once the ball has left the map. */
  readonly status: 'ok' | 'diverged'
}

/** A regression level's state: the player's line and how well it fits the visible data. */
export interface RegressionSnapshot {
  readonly kind: 'regression'
  readonly w: number
  readonly b: number
  /** Mean squared error on the training points. */
  readonly loss: number
  /** Lowest loss reached this attempt (the meter's "best" marker). */
  readonly bestLoss: number
  /** Number of set-params commands this attempt. */
  readonly moves: number
}

/** One recorded training run: the model after every epoch (index 0 = before training). */
export interface TrainingRun {
  readonly learningRate: number
  readonly epochs: readonly { readonly w: number; readonly b: number; readonly loss: number }[]
  /** converged = reached the target loss; diverged = loss blew up; too-slow = ran out of epochs. */
  readonly status: 'converged' | 'diverged' | 'too-slow'
  /** First epoch at which the target loss was reached, or null. */
  readonly convergedAt: number | null
}

/** A training level's state: the chosen learning rate and the latest run (W1-L4). */
export interface TrainingSnapshot {
  readonly kind: 'training'
  readonly learningRate: number
  /** Loss and parameters before training, so the plot has something to show at first. */
  readonly initial: { readonly w: number; readonly b: number; readonly loss: number }
  readonly run: TrainingRun | null
  /** Removed training points (only when the level allows cleaning). */
  readonly removed: readonly number[]
  /** Whether the feature is standardized for training (only when the level allows scaling). */
  readonly scaled: boolean
  /** "Converged" loss for the points currently kept: best possible on them + the level's gap. */
  readonly targetLoss: number
}

/** A data-cleaning level's state: which points are removed and the line refit on the rest (W1-L6). */
export interface CleaningSnapshot {
  readonly kind: 'cleaning'
  /** Indices of removed training points, in removal order. */
  readonly removed: readonly number[]
  /** Least-squares line on the points that remain. */
  readonly w: number
  readonly b: number
  /** Training loss on the points that remain. */
  readonly loss: number
}

/** A recorded run where only the loss per epoch matters (index 0 = before training). */
export interface LossRun {
  readonly learningRate: number
  readonly losses: readonly number[]
  readonly status: 'converged' | 'diverged' | 'too-slow'
  readonly convergedAt: number | null
}

/** A feature-scaling level's state (W1-L7). */
export interface ScalingSnapshot {
  readonly kind: 'scaling'
  readonly scaled: boolean
  readonly learningRate: number
  /** The latest run, with whether it used scaled features. */
  readonly run: (LossRun & { readonly scaled: boolean }) | null
}

/** A classification level's state: the boundary and how many training points it gets right (W2). */
export interface BoundarySnapshot {
  readonly kind: 'boundary'
  /** Two points the boundary passes through (the handles). */
  readonly p: Point
  readonly q: Point
  /** Which side is class 1: false = left of p→q. */
  readonly flipped: boolean
  /** Correctly classified training points, and the total. */
  readonly correct: number
  readonly total: number
  readonly moves: number
}

/** A 1D confidence level's state (W2-L2): the curve's slope and threshold, and how sure it is. */
export interface SigmoidSnapshot {
  readonly kind: 'sigmoid'
  readonly slope: number
  readonly threshold: number
  /** Probability of the TRUE class for each training point, in scene order. */
  readonly confidences: readonly number[]
  readonly minConfidence: number
}

/** Decision regions on a grid over the map: class (0/1) per cell, row by row from the top. */
export interface DecisionRegions {
  readonly cols: number
  readonly rows: number
  readonly classes: readonly number[]
}

/** A feature-builder level's state (W2-L3): chosen features and the latest trained model. */
export interface FeatureSnapshot {
  readonly kind: 'features'
  readonly selected: readonly PolynomialFeature[]
  readonly trained: {
    readonly features: readonly PolynomialFeature[]
    readonly regions: DecisionRegions
    /** The border: where the model's score is exactly 0. */
    readonly boundary: readonly ContourLine[]
    readonly correct: number
    readonly total: number
  } | null
}

export type LevelSnapshot =
  | LandscapeSnapshot
  | RegressionSnapshot
  | TrainingSnapshot
  | CleaningSnapshot
  | ScalingSnapshot
  | BoundarySnapshot
  | SigmoidSnapshot
  | FeatureSnapshot
