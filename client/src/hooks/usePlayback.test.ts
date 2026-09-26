import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlayback } from './usePlayback'

describe('usePlayback', () => {
  beforeEach(() =>
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] }),
  )
  afterEach(() => vi.useRealTimers())

  it('advances with elapsed time and stops at the end', () => {
    const source = {}
    const { result } = renderHook(() => usePlayback(source, 10, 1000, false))
    expect(result.current).toBe(0)
    act(() => vi.advanceTimersByTime(500))
    expect(result.current).toBeGreaterThanOrEqual(4)
    expect(result.current).toBeLessThanOrEqual(5)
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current).toBe(10)
  })

  it('restarts when the source changes', () => {
    const { result, rerender } = renderHook(({ source }) => usePlayback(source, 10, 1000, false), {
      initialProps: { source: {} as object },
    })
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current).toBe(10)
    rerender({ source: {} })
    expect(result.current).toBe(0)
  })

  it('jumps to the end with reduced motion', () => {
    const { result } = renderHook(() => usePlayback({}, 10, 1000, true))
    expect(result.current).toBe(10)
  })
})
