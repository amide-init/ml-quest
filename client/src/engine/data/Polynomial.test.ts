import { describe, expect, it } from 'vitest'
import { vector } from '@/engine/math'
import { expandPolynomial, polynomialTerms } from './Polynomial'

describe('polynomialTerms', () => {
  it('lists every term up to the degree, lowest degree first', () => {
    expect(polynomialTerms(1)).toEqual([
      [1, 0],
      [0, 1],
    ])
    expect(polynomialTerms(2)).toEqual([
      [1, 0],
      [0, 1],
      [2, 0],
      [1, 1],
      [0, 2],
    ])
  })

  it('grows quickly: degree 6 has 27 terms', () => {
    expect(polynomialTerms(6)).toHaveLength(27)
  })
})

describe('expandPolynomial', () => {
  it('computes each term for each point', () => {
    const data = expandPolynomial({ x1: vector(2), x2: vector(3), label: Uint8Array.of(1) }, 2)
    expect(data.columns.map((column) => column[0])).toEqual([2, 3, 4, 6, 9])
  })
})
