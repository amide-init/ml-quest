import { describe, expect, it } from 'vitest'
import { createSeededRandom } from '@/engine/math'
import { generateTwoBlobs } from './TwoBlobs'

const spec = {
  generator: 'two-blobs' as const,
  trainPerClass: 40,
  testPerClass: 100,
  centers: [
    [0, 0],
    [1, 1],
  ] as [[number, number], [number, number]],
  spread: 0.5,
}
const rngs = () => ({ train: createSeededRandom(1), test: createSeededRandom(2) })
const count = (labels: Uint8Array, cls: number) => labels.filter((label) => label === cls).length

describe('generateTwoBlobs', () => {
  it('is balanced by default', () => {
    const { train, test } = generateTwoBlobs(spec, rngs())
    expect([count(train.label, 0), count(train.label, 1)]).toEqual([40, 40])
    expect([count(test.label, 0), count(test.label, 1)]).toEqual([100, 100])
  })

  it('shrinks class 1 to the minority share in both splits (W2-L6)', () => {
    const { train, test } = generateTwoBlobs({ ...spec, minorityShare: 0.1 }, rngs())
    expect([count(train.label, 0), count(train.label, 1)]).toEqual([40, 4])
    expect([count(test.label, 0), count(test.label, 1)]).toEqual([100, 10])
  })
})
