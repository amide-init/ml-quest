import type { Vector } from '@/models'
import { assert } from '@/lib'

/** Build a vector from numbers: vector(1, 2) → Float64Array [1, 2]. */
export function vector(...values: readonly number[]): Vector {
  return Float64Array.from(values)
}

/** Read a component with a bounds check (no silent undefined → NaN). */
export function component(v: Vector, index: number): number {
  const value = v[index]
  assert(value !== undefined, `Vector index ${index} out of range (length ${v.length})`)
  return value
}

/** Destructure a 2D vector safely. */
export function xy(v: Vector): readonly [number, number] {
  assert(v.length === 2, `Expected a 2D vector, got length ${v.length}`)
  return [component(v, 0), component(v, 1)]
}

function assertSameLength(a: Vector, b: Vector): void {
  assert(a.length === b.length, `Vector length mismatch: ${a.length} vs ${b.length}`)
}

export function add(a: Vector, b: Vector): Vector {
  assertSameLength(a, b)
  return a.map((value, i) => value + component(b, i))
}

export function subtract(a: Vector, b: Vector): Vector {
  assertSameLength(a, b)
  return a.map((value, i) => value - component(b, i))
}

export function scale(v: Vector, factor: number): Vector {
  return v.map((value) => value * factor)
}

export function dot(a: Vector, b: Vector): number {
  assertSameLength(a, b)
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += component(a, i) * component(b, i)
  }
  return sum
}

/** Euclidean length. */
export function norm(v: Vector): number {
  return Math.sqrt(dot(v, v))
}

export function distance(a: Vector, b: Vector): number {
  return norm(subtract(a, b))
}

export function isFiniteVector(v: Vector): boolean {
  return v.every(Number.isFinite)
}
