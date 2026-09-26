/** Thrown when an internal invariant is violated (a bug, not a user error). */
export class AssertionError extends Error {
  override name = 'AssertionError'
}

/**
 * Narrow `condition` to truthy or throw. Use for invariants that should never fail;
 * validate external input with Zod instead.
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message)
  }
}

/** Exhaustiveness check for discriminated unions: `default: return assertNever(x)`. */
export function assertNever(value: never): never {
  throw new AssertionError(`Unexpected value: ${JSON.stringify(value)}`)
}
