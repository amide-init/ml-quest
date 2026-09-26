import type { Point } from './LandscapeModel'

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

export type LevelSnapshot =
  LandscapeSnapshot | RegressionSnapshot | TrainingSnapshot | CleaningSnapshot
