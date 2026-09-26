import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HyperparameterControls } from './HyperparameterControls'

const setup = (disabled = false) => {
  const onCommand = vi.fn()
  render(
    <HyperparameterControls
      name="learningRate"
      label="Learning rate"
      hint="How big each step is."
      value={0.05}
      min={0.01}
      max={1.2}
      step={0.01}
      actionLabel="Train"
      action={{ type: 'train' }}
      disabled={disabled}
      onCommand={onCommand}
    />,
  )
  return onCommand
}

describe('HyperparameterControls', () => {
  it('shows a labelled slider with the current value and its hint', () => {
    setup()
    const slider = screen.getByRole('slider', { name: 'Learning rate' })
    expect(slider).toHaveValue('0.05')
    expect(slider).toHaveAccessibleDescription('How big each step is.')
    expect(screen.getByText('0.05')).toBeInTheDocument()
  })

  it('emits a set-hyperparameter command when the slider moves', () => {
    const onCommand = setup()
    fireEvent.change(screen.getByRole('slider', { name: 'Learning rate' }), {
      target: { value: '0.6' },
    })
    expect(onCommand).toHaveBeenCalledWith({
      type: 'set-hyperparameter',
      name: 'learningRate',
      value: 0.6,
    })
  })

  it('emits its action from the button', async () => {
    const onCommand = setup()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Train' }))
    expect(onCommand).toHaveBeenCalledWith({ type: 'train' })
  })

  it('disables both controls', () => {
    setup(true)
    expect(screen.getByRole('slider')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Train' })).toBeDisabled()
  })
})
