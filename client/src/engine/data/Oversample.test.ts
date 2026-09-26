import { describe, expect, it } from 'vitest'
import { oversampleMinority } from './Oversample'

const data = {
  columns: [Float64Array.of(1, 2, 3), Float64Array.of(10, 20, 30)],
  y: Float64Array.of(0, 1, 0),
}

describe('oversampleMinority', () => {
  it('repeats every class-1 row, in place, and leaves the rest', () => {
    const result = oversampleMinority(data, 3)
    expect(Array.from(result.y)).toEqual([0, 1, 1, 1, 0])
    expect(Array.from(result.columns[0] ?? [])).toEqual([1, 2, 2, 2, 3])
    expect(Array.from(result.columns[1] ?? [])).toEqual([10, 20, 20, 20, 30])
  })

  it('returns the data unchanged at 1×', () => {
    expect(oversampleMinority(data, 1)).toBe(data)
  })
})
