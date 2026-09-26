import { describe, expect, it } from 'vitest'
import { playChime } from './Sound'

describe('playChime', () => {
  it('reports false instead of throwing where there is no Web Audio', () => {
    // Node (like a locked-down browser) has no AudioContext.
    expect(playChime()).toBe(false)
  })
})
