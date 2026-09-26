/** A flat numeric vector. Parameters, gradients and points all use this shape (ARCHITECTURE §5.2). */
export type Vector = Float64Array

/** A seeded random source returning numbers in [0, 1). Always injected, never Math.random(). */
export type Rng = () => number

/**
 * An ML algorithm ("model" in ML terms). Named Algorithm to avoid clashing with domain models.
 * TData is whatever the algorithm learns from; the loss-landscape algorithm needs none (void).
 */
export interface Algorithm<TData = void> {
  /** Registry id, e.g. "landscape-2d" or "linear-regression". */
  readonly id: string
  /** Names of each parameter, in vector order, so widgets can bind to them (e.g. ["x", "y"], ["w", "b"]). */
  readonly paramNames: readonly string[]
  loss(params: Vector, data: TData): number
  gradient(params: Vector, data: TData): Vector
  /** False when params have left the region where the algorithm is defined (the ball flew off the map). */
  inDomain(params: Vector): boolean
}

/** Outcome of one optimizer step. "diverged" is gameplay (too large a step), not an error (RULES.md §2). */
export type StepStatus = 'ok' | 'diverged'

export interface StepResult {
  readonly params: Vector
  readonly loss: number
  /** The gradient at the starting point, i.e. the direction the step was taken against. */
  readonly gradient: Vector
  readonly status: StepStatus
}

/** Confusion counts with class 1 as "positive" (the class the level asks you to find, W2-L6+). */
export interface Confusion {
  readonly truePositives: number
  readonly falsePositives: number
  readonly trueNegatives: number
  readonly falseNegatives: number
}
