import { describe, expect, it } from 'vitest'
import { AssertionError, assert, assertNever } from './Assert'

describe('assert', () => {
  it('does nothing when the condition is truthy', () => {
    expect(() => assert(1, 'unused')).not.toThrow()
  })

  it('throws an AssertionError with the message when the condition is falsy', () => {
    expect(() => assert(0, 'must be positive')).toThrow(new AssertionError('must be positive'))
  })

  it('narrows the type after the call', () => {
    const value: string | undefined = 'ml'
    assert(value !== undefined, 'value is defined')
    expect(value.toUpperCase()).toBe('ML')
  })
})

describe('assertNever', () => {
  it('throws for values that escaped an exhaustive switch', () => {
    expect(() => assertNever('unexpected' as never)).toThrow(AssertionError)
  })
})
