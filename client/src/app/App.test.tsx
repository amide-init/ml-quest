import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { hydrateStores } from './Bootstrap'
import { createServices } from './Container'

function renderApp(path = '/') {
  window.location.hash = `#${path}`
  const services = createServices({ storage: 'memory' })
  hydrateStores(services)
  render(<App services={services} />)
  return services
}

describe('App', () => {
  beforeEach(() => {
    delete document.documentElement.dataset['theme']
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
