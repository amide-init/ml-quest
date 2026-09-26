import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    const github = screen.getByRole('list', { name: 'ML Quest on GitHub' })
    const star = within(github).getByRole('link', { name: /^Star ML Quest on GitHub/ })
    expect(star).toHaveAttribute('href', 'https://github.com/amide-init/ml-quest')
    expect(within(github).getByRole('link', { name: /^Fork ML Quest on GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/amide-init/ml-quest/fork',
    )
    expect(star).toHaveAttribute('rel', 'noopener noreferrer')
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
    renderApp('/w/2/l/8')
    expect(
      screen.getByRole('heading', { level: 1, name: 'This level is being built' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Level 2-8 – ML Quest')
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

  it('Dirty Data: keeping the outliers fails; removing exactly them earns three stars', async () => {
    const user = userEvent.setup()
    renderApp('/w/1/l/6')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    expect(screen.getByText('Removed 0 of 26 points')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Check against new data' }))
    expect(screen.getByRole('heading', { name: 'The fit is still off' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    // The four planted outliers sit at the right end, far below the trend.
    for (const name of [
      'Point at x 8.2, y 8.1',
      'Point at x 7.6, y 8.2',
      'Point at x 7.8, y 7.3',
      'Point at x 9.1, y 8.2',
    ]) {
      await user.click(screen.getByRole('checkbox', { name }))
    }
    expect(screen.getByText('Removed 4 of 26 points')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Check against new data' }))
    expect(screen.getByRole('heading', { name: 'Clean fit' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeInTheDocument()
  })

  it('Scale Matters: no scaling is 1× at best; scaling plus a bigger learning rate is far faster', async () => {
    const user = userEvent.setup()
    renderApp('/w/1/l/7')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    expect(screen.getByText(/Best without scaling: \d+ epochs/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(
      await screen.findByRole('heading', { name: /^Only 0\.\d× faster$/ }, { timeout: 5000 }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await user.click(screen.getByRole('switch', { name: 'Scale the features' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Learning rate' }), {
      target: { value: '0.5' },
    })
    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(
      await screen.findByRole('heading', { name: /^\d+\.\d× faster$/ }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeInTheDocument()
  }, 20_000)

  it('Boss: each missing skill fails for its own reason; all three together win', async () => {
    const user = userEvent.setup()
    renderApp('/w/1/l/8')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))

    // As is: the unscaled feature makes every rate blow up.
    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(
      await screen.findByRole('heading', { name: 'Too fast: the loss blew up' }, { timeout: 5000 }),
    ).toBeInTheDocument()

    // Scaled, but the broken points are kept: converges onto the wrong line.
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await user.click(screen.getByRole('switch', { name: 'Scale the feature' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Learning rate' }), {
      target: { value: '0.5' },
    })
    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(
      await screen.findByRole(
        'heading',
        { name: 'Trained, but on broken data' },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()

    // Clean + scale + rate 0.5: three stars. (Retry starts a clean attempt, so set everything again.)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await user.click(screen.getByRole('switch', { name: 'Scale the feature' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Learning rate' }), {
      target: { value: '0.5' },
    })
    for (const name of [
      'Point at x 88.4, y 11.9',
      'Point at x 78.5, y 8.9',
      'Point at x 77.6, y 9.7',
      'Point at x 99.6, y 10.4',
    ]) {
      await user.click(screen.getByRole('checkbox', { name }))
    }
    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(
      await screen.findByRole('heading', { name: 'Converged' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeInTheDocument()
  }, 25_000)

  it('Split the Kingdom: the starting border fails; the diagonal, placed by keyboard, wins', async () => {
    const user = userEvent.setup()
    renderApp('/w/2/l/1')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    await user.click(screen.getByRole('button', { name: 'Check the border' }))
    expect(screen.getByRole('heading', { name: 'Too many on the wrong side' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    // Handle 1 from (-2.5, -2) to (-2, 2); handle 2 from (-2.5, 2) to (2, -2).
    const first = screen.getByRole('button', { name: /Border handle 1/ })
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    for (let i = 0; i < 4; i++) fireEvent.keyDown(first, { key: 'ArrowRight' })
    for (let i = 0; i < 8; i++) fireEvent.keyDown(first, { key: 'ArrowUp', shiftKey: true })
    fireEvent.blur(first)
    const second = screen.getByRole('button', { name: /Border handle 2/ })
    for (let i = 0; i < 9; i++) fireEvent.keyDown(second, { key: 'ArrowRight', shiftKey: true })
    for (let i = 0; i < 8; i++) fireEvent.keyDown(second, { key: 'ArrowDown', shiftKey: true })
    fireEvent.blur(second)
    // The border now runs from (-2, 2) to (2, -2): the diagonal between the two kingdoms.
    await waitFor(() => expect(screen.getByText('39 of 40 on the right side')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Check the border' }))
    expect(screen.getByRole('heading', { name: 'Kingdom split' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeInTheDocument()
  })

  it('Confidence: too gentle fails, too steep is overconfident, the sweet spot earns three stars', async () => {
    const user = userEvent.setup()
    renderApp('/w/2/l/2')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    const threshold = screen.getByRole('slider', { name: 'Threshold' })
    const slope = screen.getByRole('slider', { name: 'Slope' })

    fireEvent.change(threshold, { target: { value: '0.5' } })
    fireEvent.change(slope, { target: { value: '3' } })
    await user.click(screen.getByRole('button', { name: 'Check the confidence' }))
    expect(screen.getByRole('heading', { name: 'Not sure enough' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Threshold' }), {
      target: { value: '0.5' },
    })
    fireEvent.change(screen.getByRole('slider', { name: 'Slope' }), { target: { value: '12' } })
    await user.click(screen.getByRole('button', { name: 'Check the confidence' }))
    expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeInTheDocument()
    expect(screen.getByText(/less overconfident/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Threshold' }), {
      target: { value: '0.5' },
    })
    fireEvent.change(screen.getByRole('slider', { name: 'Slope' }), { target: { value: '6' } })
    await user.click(screen.getByRole('button', { name: 'Check the confidence' }))
    expect(screen.getByRole('heading', { name: 'Confident' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeInTheDocument()
  })

  it('Not a Straight Line: straight features fail; x1² and x2² alone split the rings for three stars', async () => {
    const user = userEvent.setup()
    renderApp('/w/2/l/3')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(screen.getByRole('heading', { name: 'Still not split' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    for (const name of ['x₁', 'x₂', 'x₁²', 'x₂²']) {
      await user.click(screen.getByRole('checkbox', { name }))
    }
    expect(screen.getByText('2 features selected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(screen.getByRole('heading', { name: 'Split' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeInTheDocument()
  })

  it('The Overfitter: 100% on training is the trap; the simple model generalizes', async () => {
    const user = userEvent.setup()
    renderApp('/w/2/l/4')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    expect(screen.getByText('27 inputs to the model')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(screen.getByText('Degree 6: 20 of 20 training points right')).toBeInTheDocument()
    // The new people stay hidden until they have been checked (D6)...
    expect(screen.queryByText(/Hollow marks/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Check on new people' }))
    expect(screen.getByRole('heading', { name: 'Overfitted' })).toBeInTheDocument()
    // ...then appear on the map, with the misclassified ones crossed out (77% of 120 right).
    expect(
      screen.getByText(
        'Hollow marks are the 120 new people. The 28 crossed out landed on the wrong side of your border.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.queryByText(/Hollow marks/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider', { name: 'Complexity (polynomial degree)' }), {
      target: { value: '1' },
    })
    await user.click(screen.getByRole('button', { name: 'Check on new people' }))
    expect(screen.getByRole('heading', { name: 'It generalizes' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument()
    expect(screen.getByText('Next star: get it on your first check.')).toBeInTheDocument()
  }, 20_000)

  it('Tame It: no penalty memorizes, too much underfits, the right strength closes the gap', async () => {
    const user = userEvent.setup()
    renderApp('/w/2/l/5')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    expect(screen.getByText('Degree 6: 27 inputs to the model')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(screen.getByText('Degree 6: 23 of 24 training points right')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Check on new people' }))
    expect(screen.getByRole('heading', { name: 'Still memorizing' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Regularization strength (λ)' }), {
      target: { value: '0.3' },
    })
    await user.click(screen.getByRole('button', { name: 'Check on new people' }))
    expect(screen.getByRole('heading', { name: 'Too tame' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Regularization strength (λ)' }), {
      target: { value: '0.02' },
    })
    await user.click(screen.getByRole('button', { name: 'Check on new people' }))
    expect(screen.getByRole('heading', { name: 'Tamed' })).toBeInTheDocument()
    expect(screen.getByText('Training 88%, new people 88%: a gap of 0 points.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument()
    expect(screen.getByText('Next star: get it within 2 checks.')).toBeInTheDocument()
  }, 30_000)

  it('Unfair Data: 94% accuracy hides the missed minority; weighting it finds them', async () => {
    const user = userEvent.setup()
    renderApp('/w/2/l/6')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))

    await user.click(screen.getByRole('button', { name: 'Train' }))
    expect(
      screen.getByText('Training: found 5 of 9 hill folk, 87 of 90 lowlanders right'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Check on new people' }))
    expect(screen.getByRole('heading', { name: 'Accuracy lied' })).toBeInTheDocument()
    expect(
      screen.getByText(
        '94% of new people right, but it found only 40% of the hill folk; you need at least 80%.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Weight of each hill-clan point' }), {
      target: { value: '15' },
    })
    await user.click(screen.getByRole('button', { name: 'Check on new people' }))
    expect(screen.getByRole('heading', { name: 'Hill folk found' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Next star: flag fewer lowlanders by mistake: keep at least 86% of everyone right.',
      ),
    ).toBeInTheDocument()
  }, 30_000)

  it('Read the Matrix: the threshold trades recall for precision, read off the matrix', async () => {
    const user = userEvent.setup()
    renderApp('/w/2/l/7')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    // The model comes trained: the matrix is there before any button is pressed.
    expect(
      screen.getByRole('table', { name: 'The 300 training people at this threshold' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Train' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Check on new people' }))
    expect(screen.getByRole('heading', { name: 'Elders left out' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Only 67% of the new hill folk were invited; you need 75%. (Precision: 78%.)',
      ),
    ).toBeInTheDocument()

    const threshold = 'Invite when the model is at least this sure'
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.change(screen.getByRole('slider', { name: threshold }), { target: { value: '0.15' } })
    await user.click(screen.getByRole('button', { name: 'Check on new people' }))
    expect(screen.getByRole('heading', { name: 'Riders wasted' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    fireEvent.change(screen.getByRole('slider', { name: threshold }), { target: { value: '0.3' } })
    await user.click(screen.getByRole('button', { name: 'Check on new people' }))
    expect(screen.getByRole('heading', { name: 'Council called' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeInTheDocument()
    expect(screen.getByText('Next star: get it within 2 checks.')).toBeInTheDocument()
  }, 30_000)

  it('shows an unplayed level on the map and an empty Codex for a new player', async () => {
    const user = userEvent.setup()
    renderApp('/map')
    expect(screen.getAllByText('Not played yet')).toHaveLength(15)
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
