import { describe, expect, it } from 'vitest'
import { fromBase64Url, toBase64Url } from './Base64Url'

describe('base64url', () => {
  it('round-trips every byte value, without padding or + and /', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i)
    const text = toBase64Url(bytes)
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(fromBase64Url(text)).toEqual(bytes)
  })

  it('handles lengths that would need padding', () => {
    for (const length of [1, 2, 3, 4]) {
      const bytes = Uint8Array.from({ length }, (_, i) => 250 + i)
      expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes)
    }
  })

  it('rejects characters outside the alphabet', () => {
    expect(() => fromBase64Url('abc$')).toThrow()
  })
})
