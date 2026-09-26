import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { hydrateStores } from './Bootstrap'
import { createServices } from './Container'

const cleanups: (() => void)[] = []

function renderApp(path = '/', storage: 'memory' | 'browser' = 'memory') {
  window.location.hash = `#${path}`
  const services = createServices({ storage })
  cleanups.push(hydrateStores(services))
  const view = render(<App services={services} />)
  cleanups.push(view.unmount)
  return services
}

async function playToTwoStars(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Start the level' }))
  fireEvent.change(screen.getByRole('slider', { name: 'Step size' }), { target: { value: '0.18' } })
  for (let i = 0; i < 7; i++) {
    await user.click(screen.getByRole('button', { name: 'Take a step' }))
  }
}

describe('App', () => {
  beforeEach(() => {
    delete document.documentElement.dataset['theme']
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
  })

  it('renders the home page with the main heading and navigation', () => {
    renderApp('/')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Learn machine learning by making it work.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })

  it('navigates to Settings and applies the chosen theme to the document', async () => {
    const user = userEvent.setup()
    const services = renderApp('/')

    await user.click(screen.getByRole('link', { name: 'Settings' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement.dataset['theme']).toBe('dark')
    expect(services.settings.getSettings().theme).toBe('dark')
  })

  it('shows the not-found page for unknown routes and out-of-range levels', () => {
    renderApp('/w/9/l/1')
    expect(screen.getByRole('heading', { level: 1, name: 'Nothing here' })).toBeInTheDocument()
  })

  it('shows the placeholder for a level that is not built yet', () => {
    renderApp('/w/2/l/1')
    expect(
      screen.getByRole('heading', { level: 1, name: 'This level is being built' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Level 2-1 – ML Quest')
  })

  it('plays Roll Downhill from briefing to debrief', async () => {
    const user = userEvent.setup()
    renderApp('/w/1/l/3')
    expect(screen.getByRole('heading', { level: 1, name: 'Roll Downhill' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Step size' }), {
      target: { value: '0.18' },
    })
    for (let i = 0; i < 7; i++) {
      await user.click(screen.getByRole('button', { name: 'Take a step' }))
    }

    expect(screen.getByRole('heading', { name: 'In the valley' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument()
    expect(screen.getByText('Next star: reach the valley in 5 steps or fewer.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'What you just did' })).toBeInTheDocument()
    expect(screen.getByText(/That was gradient descent/)).toBeInTheDocument()
    expect(screen.getByText(/New in your Codex: Gradient descent/)).toBeInTheDocument()
    expect(screen.getByText('New best for this level.')).toBeInTheDocument()
  })

  it('saves progress: after a reload the map shows the stars and the Codex shows the card', async () => {
    const user = userEvent.setup()
    renderApp('/w/1/l/3', 'browser')
    await playToTwoStars(user)
    cleanups.splice(0).forEach((cleanup) => cleanup())

    // A brand-new set of services reading the same browser storage, like a page reload.
    renderApp('/map', 'browser')
    expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Play again' })).toHaveAttribute('href', '#/w/1/l/3')

    await user.click(screen.getByRole('link', { name: 'Codex' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Gradient descent' })).toBeInTheDocument()
    expect(screen.getByText('Unlocked in Roll Downhill')).toBeInTheDocument()
  })

  it('lists every World 1 level on the map in order', () => {
    renderApp('/map')
    const levels = screen.getAllByRole('listitem').map((item) => item.textContent ?? '')
    const titles = [
      'Draw the Line',
      'Feel the Loss',
      'Roll Downhill',
      'Too Fast, Too Slow',
      'Bumpy Terrain',
    ]
    const positions = titles.map((title) => levels.findIndex((text) => text.includes(title)))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions.toSorted((a, b) => a - b)).toEqual(positions)
  })

  it('Draw the Line: explains a bad fit, then passes after moving the line with the keyboard', async () => {
    const user = userEvent.setup()
    renderApp('/w/1/l/1')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))

    await user.click(screen.getByRole('button', { name: 'Check my line' }))
    expect(screen.getByRole('heading', { name: 'Not a good fit yet' })).toBeInTheDocument()
    expect(
      screen.getByText(/mean squared error is 17\.\d+\. It needs to be below 5/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    const left = screen.getByRole('slider', { name: 'Left end of the line' })
    const right = screen.getByRole('slider', { name: 'Right end of the line' })
    // Starting line is flat at 10. Move the left end to 6 and the right end to 18.5.
    for (let i = 0; i < 2; i++) fireEvent.keyDown(left, { key: 'ArrowDown', shiftKey: true })
    fireEvent.blur(left)
    for (let i = 0; i < 4; i++) fireEvent.keyDown(right, { key: 'ArrowUp', shiftKey: true })
    fireEvent.keyDown(right, { key: 'ArrowUp' })
    fireEvent.blur(right)
    await waitFor(() => expect(right).toHaveAttribute('aria-valuenow', '18.5'))

    await user.click(screen.getByRole('button', { name: 'Check my line' }))
    expect(screen.getByRole('heading', { name: 'Good fit' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /of 3 stars/ })).toBeInTheDocument()
  })

  it('Feel the Loss: every move updates the loss meter and the move count', async () => {
    const user = userEvent.setup()
    renderApp('/w/1/l/2')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    expect(screen.getByText('Moves 0 of 20')).toBeInTheDocument()
    const before = screen.getByText('Loss (mean squared error)').nextElementSibling?.textContent

    // The starting line's left end sits far above the data (≈15.6 vs ≈5.7), so lowering it helps.
    const left = screen.getByRole('slider', { name: 'Left end of the line' })
    fireEvent.keyDown(left, { key: 'ArrowDown', shiftKey: true })
    fireEvent.blur(left)

    expect(screen.getByText('Moves 1 of 20')).toBeInTheDocument()
    const after = screen.getByText('Loss (mean squared error)').nextElementSibling?.textContent
    expect(Number(after)).toBeLessThan(Number(before))
  })

  it('Too Fast, Too Slow: a tiny rate is too slow, a huge one blows up, the sweet spot converges', async () => {
    const user = userEvent.setup()
    renderApp('/w/1/l/4')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    expect(screen.getByText('Press Train to see the loss curve.')).toBeInTheDocument()

    // Default rate 0.02: too slow.
    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(
      await screen.findByRole('heading', { name: 'Too slow' }, { timeout: 4000 }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Learning rate' }), {
      target: { value: '1.2' },
    })
    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(
      await screen.findByRole('heading', { name: 'Too fast: the loss blew up' }, { timeout: 4000 }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Learning rate' }), {
      target: { value: '0.6' },
    })
    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(
      await screen.findByRole('heading', { name: 'Converged' }, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeInTheDocument()
    expect(screen.getByText(/converged in 4 epochs/)).toBeInTheDocument()
  }, 15_000)

  it('Bumpy Terrain: the default start gets stuck; a start picked with the keyboard reaches the deepest valley', async () => {
    const user = userEvent.setup()
    renderApp('/w/1/l/5')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))

    await user.click(screen.getByRole('button', { name: 'Roll the ball' }))
    expect(
      await screen.findByRole('heading', { name: 'Stuck in a local minimum' }, { timeout: 4000 }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    const map = screen.getByRole('application')
    // Default start (-0.8, 0.5) → (0.4, -0.2): 24 steps right, 14 steps down (0.05 each).
    for (let i = 0; i < 24; i++) fireEvent.keyDown(map, { key: 'ArrowRight' })
    for (let i = 0; i < 14; i++) fireEvent.keyDown(map, { key: 'ArrowDown' })
    await user.click(screen.getByRole('button', { name: 'Roll the ball' }))

    expect(
      await screen.findByRole('heading', { name: 'Deepest valley' }, { timeout: 4000 }),
    ).toBeInTheDocument()
    // Second attempt: two stars, and the next star asks for a first-try success.
    expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument()
    expect(screen.getByText('Next star: get it on your first roll.')).toBeInTheDocument()
  }, 15_000)

  it('shows an unplayed level on the map and an empty Codex for a new player', async () => {
    const user = userEvent.setup()
    renderApp('/map')
    expect(screen.getAllByText('Not played yet')).toHaveLength(5)
    await user.click(screen.getByRole('link', { name: 'Codex' }))
    expect(screen.getByRole('link', { name: 'Go to the map' })).toBeInTheDocument()
  })

  it('explains a reckless run that flies off the map, then allows a free retry', async () => {
    const user = userEvent.setup()
    renderApp('/w/1/l/3')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Step size' }), {
      target: { value: '0.3' },
    })
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: 'Take a step' }))
    }
    expect(screen.getByRole('heading', { name: 'The ball flew off the map' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show a hint' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('Steps 0 of 15')).toBeInTheDocument()
  })
})
