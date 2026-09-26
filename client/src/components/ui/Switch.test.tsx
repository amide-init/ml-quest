import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Switch } from './Switch'

describe('Switch', () => {
  it('is a labelled switch that reflects its state', () => {
    render(
      <Switch label="Sound effects" hint="Plays a chime" checked={false} onChange={() => {}} />,
    )
    const control = screen.getByRole('switch', { name: 'Sound effects' })
    expect(control).toHaveAttribute('aria-checked', 'false')
    expect(control).toHaveAccessibleDescription('Plays a chime')
  })

  it('toggles with a click and with the keyboard', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Switch label="Sound effects" checked={false} onChange={onChange} />)

    await user.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenLastCalledWith(true)

    await user.keyboard(' ')
    expect(onChange).toHaveBeenCalledTimes(2)
  })
})
