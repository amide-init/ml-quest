import { describe, expect, it } from 'vitest'
import { deflateRaw, inflateRaw } from './Deflate'

describe('deflateRaw / inflateRaw', () => {
  it('round-trips and shrinks repetitive text', async () => {
    const text = JSON.stringify({
      levels: Object.fromEntries(
        [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`w1-l${n}`, { bestStars: 3 }]),
      ),
    })
    const bytes = new TextEncoder().encode(text)
    const packed = await deflateRaw(bytes)
    expect(packed).not.toBeNull()
    expect(packed!.length).toBeLessThan(bytes.length / 2)
    expect(new TextDecoder().decode((await inflateRaw(packed!))!)).toBe(text)
  })

  it('rejects data that is not deflate', async () => {
    await expect(inflateRaw(Uint8Array.of(0xff, 0xff, 0xff))).rejects.toThrow()
  })
})
