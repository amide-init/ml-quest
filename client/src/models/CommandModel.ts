import type { Point } from './LandscapeModel'

/** Hyperparameters a widget can set. Grows with later levels (lambda, threshold, degree…). */
export type HyperparameterName = 'learningRate'

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

export type CommandType = Command['type']
