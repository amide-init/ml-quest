import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BoundaryScene } from '@/models'
import { BoundaryPlot } from './BoundaryPlot'

const scene: BoundaryScene = {
  kind: 'boundary',
  points: [
    { x: -1, y: -1, label: 0 },
    { x: 1, y: 1, label: 1 },
  ],
  view: { xMin: -3, xMax: 3, yMin: -2, yMax: 2 },
}

describe('BoundaryPlot', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('labels both handles with their position', () => {
    render(
      <BoundaryPlot
        scene={scene}
        p={[-2, 2]}
        q={[2, -2]}
        flipped={false}
        disabled={false}
        onCommand={() => {}}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Border handle 1, at x -2.0, y 2.0' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Border handle 2, at x 2.0, y -2.0' }),
    ).toBeInTheDocument()
  })

  it('turns a burst of arrow presses into one set-boundary move', () => {
    const onCommand = vi.fn()
    render(
      <BoundaryPlot
        scene={scene}
        p={[-2, 2]}
        q={[2, -2]}
        flipped={false}
        disabled={false}
        onCommand={onCommand}
      />,
    )
    const handle = screen.getByRole('button', { name: /Border handle 1/ })
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    fireEvent.keyDown(handle, { key: 'ArrowDown', shiftKey: true })
    expect(onCommand).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(700))
    expect(onCommand).toHaveBeenCalledTimes(1)
    expect(onCommand).toHaveBeenCalledWith({ type: 'set-boundary', p: [-1.9, 1.5], q: [2, -2] })
  })

  it('keeps handles inside the map', () => {
    const onCommand = vi.fn()
    render(
      <BoundaryPlot
        scene={scene}
        p={[-2.95, 2]}
        q={[2, -2]}
        flipped={false}
        disabled={false}
        onCommand={onCommand}
      />,
    )
    fireEvent.keyDown(screen.getByRole('button', { name: /Border handle 1/ }), {
      key: 'ArrowLeft',
      shiftKey: true,
    })
    act(() => vi.advanceTimersByTime(700))
    expect(onCommand).toHaveBeenCalledWith({ type: 'set-boundary', p: [-3, 2], q: [2, -2] })
  })

  it('ignores input while disabled', () => {
    const onCommand = vi.fn()
    render(
      <BoundaryPlot
        scene={scene}
        p={[-2, 2]}
        q={[2, -2]}
        flipped={false}
        disabled
        onCommand={onCommand}
      />,
    )
    fireEvent.keyDown(screen.getByRole('button', { name: /Border handle 1/ }), {
      key: 'ArrowRight',
    })
    act(() => vi.advanceTimersByTime(700))
    expect(onCommand).not.toHaveBeenCalled()
  })
})
