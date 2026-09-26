import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FieldNotes } from './FieldNotes'

describe('FieldNotes', () => {
  it('starts closed and opens to the idea, the controls and how to read the result', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <FieldNotes
        term="Regularization"
        idea="Idea text"
        controls="Controls text"
        reading="Reading text"
      />,
    )
    const details = container.querySelector('details')!
    expect(details.open).toBe(false)

    await user.click(screen.getByText('Field notes: Regularization'))
    expect(details.open).toBe(true)
    for (const heading of ['The idea', 'Your controls', 'Reading the result']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.getByText('Reading text')).toBeVisible()
  })
})
