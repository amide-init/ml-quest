import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegressionScene } from '@/models'
import { LineFitPlot } from './LineFitPlot'

const scene: RegressionScene = {
  kind: 'regression',
  points: [
    [1, 4],
    [5, 12],
    [9, 20],
  ],
  view: { xMin: 0, xMax: 10, yMin: 0, yMax: 24 },
  showLoss: false,
  moveBudget: null,
  initialLoss: 10,
}

describe('LineFitPlot', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('exposes both line ends as labelled sliders at the line height', () => {
    render(<LineFitPlot scene={scene} w={2} b={1} disabled={false} onCommand={() => {}} />)
    // Handles sit at x = 1.5 and x = 8.5 → heights 4 and 18.
    expect(screen.getByRole('slider', { name: 'Left end of the line' })).toHaveAttribute(
      'aria-valuenow',
      '4',
    )
    expect(screen.getByRole('slider', { name: 'Right end of the line' })).toHaveAttribute(
      'aria-valuenow',
      '18',
    )
  })

  it('turns a burst of arrow presses into one set-params move', () => {
    const onCommand = vi.fn()
    render(<LineFitPlot scene={scene} w={2} b={1} disabled={false} onCommand={onCommand} />)
    const right = screen.getByRole('slider', { name: 'Right end of the line' })
    fireEvent.keyDown(right, { key: 'ArrowUp' })
    fireEvent.keyDown(right, { key: 'ArrowUp' })
    expect(onCommand).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(700))
    // Right end 18 → 19, left end stays 4: slope 15/7, through (1.5, 4).
    expect(onCommand).toHaveBeenCalledTimes(1)
    expect(onCommand).toHaveBeenCalledWith({
      type: 'set-params',
      values: { w: 2.1429, b: 0.7857 },
    })
  })

  it('ignores input while disabled', () => {
    const onCommand = vi.fn()
    render(<LineFitPlot scene={scene} w={2} b={1} disabled onCommand={onCommand} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Left end of the line' }), {
      key: 'ArrowUp',
    })
    act(() => vi.advanceTimersByTime(700))
    expect(onCommand).not.toHaveBeenCalled()
  })

  it('lets points be removed and restored by click and by keyboard', async () => {
    vi.useRealTimers()
    const onTogglePoint = vi.fn()
    render(
      <LineFitPlot
        scene={scene}
        w={2}
        b={1}
        disabled={false}
        readOnly
        removed={[1]}
        onTogglePoint={onTogglePoint}
        onCommand={() => {}}
      />,
    )
    const kept = screen.getByRole('checkbox', { name: 'Point at x 1.0, y 4.0' })
    const removed = screen.getByRole('checkbox', { name: 'Point at x 5.0, y 12.0' })
    expect(kept).toHaveAttribute('aria-checked', 'true')
    expect(removed).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(kept)
    expect(onTogglePoint).toHaveBeenLastCalledWith(0)
    fireEvent.keyDown(removed, { key: 'Enter' })
    expect(onTogglePoint).toHaveBeenLastCalledWith(1)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })
})
