import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StepControls } from './StepControls'

const setup = (disabled = false) => {
  const onCommand = vi.fn()
  render(
    <StepControls
      learningRate={0.05}
      min={0.02}
      max={0.3}
      step={0.01}
      disabled={disabled}
      onCommand={onCommand}
    />,
  )
  return onCommand
}

describe('StepControls', () => {
  it('shows a labelled slider with the current step size', () => {
    setup()
    expect(screen.getByRole('slider', { name: 'Step size' })).toHaveValue('0.05')
    expect(screen.getByText('0.05')).toBeInTheDocument()
  })

  it('emits a set-hyperparameter command when the slider moves', () => {
    const onCommand = setup()
    fireEvent.change(screen.getByRole('slider', { name: 'Step size' }), {
      target: { value: '0.18' },
    })
    expect(onCommand).toHaveBeenCalledWith({
      type: 'set-hyperparameter',
      name: 'learningRate',
      value: 0.18,
    })
  })

  it('emits a step command from the button', async () => {
    const onCommand = setup()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take a step' }))
    expect(onCommand).toHaveBeenCalledWith({ type: 'step' })
  })

  it('disables both controls when the attempt is over', () => {
    setup(true)
    expect(screen.getByRole('slider')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Take a step' })).toBeDisabled()
  })
})
