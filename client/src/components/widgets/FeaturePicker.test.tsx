import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FeaturePicker } from './FeaturePicker'

describe('FeaturePicker', () => {
  it('shows each feature as a checkbox and emits toggle-feature', async () => {
    const onCommand = vi.fn()
    render(
      <FeaturePicker
        available={['x1', 'x1^2']}
        selected={['x1']}
        disabled={false}
        onCommand={onCommand}
      />,
    )
    expect(screen.getByRole('checkbox', { name: 'x₁' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'x₁²' })).not.toBeChecked()
    await userEvent.setup().click(screen.getByRole('checkbox', { name: 'x₁²' }))
    expect(onCommand).toHaveBeenCalledWith({ type: 'toggle-feature', feature: 'x1^2' })
  })
})
