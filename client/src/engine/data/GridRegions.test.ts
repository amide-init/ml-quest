import { describe, expect, it } from 'vitest'
import type { GridRegionsSpec } from '@/models'
import { createSeededRandom } from '@/engine/math'
import { generateGridRegions } from './GridRegions'

// An L-shape: class 1 everywhere except the bottom-left cell.
const spec: GridRegionsSpec = {
  generator: 'grid-regions',
  bounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 10 },
  xCuts: [4],
  yCuts: [6],
  cells: [
    [1, 1],
    [0, 1],
  ],
  trainCount: 200,
  testCount: 50,
  labelNoise: 0,
}
const rngs = () => ({ train: createSeededRandom(3), test: createSeededRandom(4) })

describe('generateGridRegions', () => {
  it('labels each point by the cell it falls in (rows from the top)', () => {
    const { train } = generateGridRegions(spec, rngs())
    expect(train.label).toHaveLength(200)
    train.label.forEach((label, i) => {
      const bottomLeft = (train.x1[i] ?? 0) < 4 && (train.x2[i] ?? 0) < 6
      expect(label).toBe(bottomLeft ? 0 : 1)
    })
  })

  it('flips about the requested share of labels, reproducibly', () => {
    const noisy = { ...spec, labelNoise: 0.2 }
    const a = generateGridRegions(noisy, rngs()).train
    const b = generateGridRegions(noisy, rngs()).train
    expect(Array.from(a.label)).toEqual(Array.from(b.label))
    let flipped = 0
    a.label.forEach((label, i) => {
      const bottomLeft = (a.x1[i] ?? 0) < 4 && (a.x2[i] ?? 0) < 6
      if (label !== (bottomLeft ? 0 : 1)) flipped++
    })
    expect(flipped / 200).toBeGreaterThan(0.12)
    expect(flipped / 200).toBeLessThan(0.28)
  })
})
