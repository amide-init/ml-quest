import { describe, expect, it } from 'vitest'
import { crc32 } from './Crc32'

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32('123456789')).toBe('cbf43926')
  })

  it('is 8 hex digits, and changes when one character does', () => {
    expect(crc32('')).toBe('00000000')
    expect(crc32('MLQ1-abc')).not.toBe(crc32('MLQ1-abd'))
  })
})
