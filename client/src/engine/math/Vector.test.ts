import { describe, expect, it } from 'vitest'
import { AssertionError } from '@/lib'
import {
  add,
  component,
  distance,
  dot,
  isFiniteVector,
  norm,
  scale,
  subtract,
  vector,
  xy,
} from './Vector'

describe('Vector', () => {
  it('does element-wise arithmetic without mutating inputs', () => {
    const a = vector(1, 2)
    const b = vector(3, 5)
    expect([...add(a, b)]).toEqual([4, 7])
    expect([...subtract(b, a)]).toEqual([2, 3])
    expect([...scale(a, -2)]).toEqual([-2, -4])
    expect([...a]).toEqual([1, 2])
  })

  it('computes dot product, norm and distance', () => {
    expect(dot(vector(1, 2, 3), vector(4, 5, 6))).toBe(32)
    expect(norm(vector(3, 4))).toBe(5)
    expect(distance(vector(1, 1), vector(4, 5))).toBe(5)
  })

  it('rejects mismatched lengths and out-of-range reads', () => {
    expect(() => add(vector(1), vector(1, 2))).toThrow(AssertionError)
    expect(() => component(vector(1), 3)).toThrow(AssertionError)
    expect(() => xy(vector(1, 2, 3))).toThrow(AssertionError)
  })

  it('detects non-finite components', () => {
    expect(isFiniteVector(vector(1, 2))).toBe(true)
    expect(isFiniteVector(vector(1, Number.NaN))).toBe(false)
    expect(isFiniteVector(vector(Number.POSITIVE_INFINITY))).toBe(false)
  })
})
