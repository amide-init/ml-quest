import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

describe('SegmentedControl', () => {
  it('exposes a labelled radio group with the current value checked', () => {
    render(<SegmentedControl legend="Theme" value="dark" options={OPTIONS} onChange={() => {}} />)
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Light' })).not.toBeChecked()
  })

  it('reports the chosen value by click and by keyboard', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SegmentedControl legend="Theme" value="light" options={OPTIONS} onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(onChange).toHaveBeenLastCalledWith('dark')

    screen.getByRole('radio', { name: 'Light' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('dark')
  })
})
