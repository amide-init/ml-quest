import type { Point } from './LandscapeModel'

/** What the UI renders for a landscape level at one moment (ARCHITECTURE §6). Plain data, easy to diff. */
export interface LandscapeSnapshot {
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
