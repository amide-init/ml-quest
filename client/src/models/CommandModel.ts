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

export type CommandType = Command['type']
