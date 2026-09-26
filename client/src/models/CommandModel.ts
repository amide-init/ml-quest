import type { PolynomialFeature } from './DatasetModel'
import type { Point } from './LandscapeModel'

/** Hyperparameters a widget can set. Grows with later levels (lambda, threshold, degree…). */
export type HyperparameterName = 'learningRate' | 'slope' | 'threshold' | 'degree'

/**
 * Every player action is a serializable Command (ARCHITECTURE §3). Widgets emit commands,
 * the session records them, and the pass-bot replays them.
 */
export type Command =
  | {
      readonly type: 'set-hyperparameter'
      readonly name: HyperparameterName
      readonly value: number
    }
  | { readonly type: 'set-start'; readonly point: Point }
  | { readonly type: 'step' }
  | { readonly type: 'reset' }
  /** Set model parameters directly, e.g. dragging a line sets { w, b }. One command = one "move". */
  | { readonly type: 'set-params'; readonly values: Readonly<Record<string, number>> }
  /** The player asks to be judged (e.g. "Check my line"). */
  | { readonly type: 'check' }
  /** Run the optimizer with the current hyperparameters (e.g. "Train"). */
  | { readonly type: 'train' }
  /** Remove a training point, or put it back if it was removed (W1-L6 data cleaning). */
  | { readonly type: 'toggle-point'; readonly index: number }
  /** Turn feature scaling (standardization) on or off (W1-L7). */
  | { readonly type: 'set-scaling'; readonly enabled: boolean }
  /** Place a straight decision boundary through two points (W2-L1). */
  | { readonly type: 'set-boundary'; readonly p: Point; readonly q: Point }
  /** Swap which side of the boundary is which class. */
  | { readonly type: 'flip-sides' }
  /** Give the model a feature, or take it away (W2-L3 feature builder). */
  | { readonly type: 'toggle-feature'; readonly feature: PolynomialFeature }

export type CommandType = Command['type']
