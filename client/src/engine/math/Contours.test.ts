import { describe, expect, it } from 'vitest'
import { contourLines } from './Contours'

const bowl = ([x, y]: readonly [number, number]) => x * x + y * y

describe('contourLines', () => {
  it('traces a closed circle for a round bowl', () => {
    const [line, ...rest] = contourLines(
      bowl,
      { min: [-1, -1], max: [1, 1], resolution: 60 },
      [0.25],
    )
    expect(rest).toHaveLength(0)
    expect(line?.closed).toBe(true)
    for (const [x, y] of line?.points ?? []) {
      expect(Math.hypot(x, y)).toBeCloseTo(0.5, 2)
    }
  })

  it('returns one line per level, tagged with the level index', () => {
    const lines = contourLines(bowl, { min: [-1, -1], max: [1, 1], resolution: 40 }, [0.1, 0.4])
    expect(lines.map((line) => line.levelIndex)).toEqual([0, 1])
  })

  it('leaves contours open where they run off the grid', () => {
    const [line] = contourLines(bowl, { min: [0, 0], max: [1, 1], resolution: 40 }, [0.25])
    expect(line?.closed).toBe(false)
  })

  it('returns nothing for levels the surface never reaches', () => {
    expect(contourLines(bowl, { min: [-1, -1], max: [1, 1], resolution: 20 }, [5])).toEqual([])
  })
})
