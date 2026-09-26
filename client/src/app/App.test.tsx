import { render, screen } from '@testing-library/react'
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

  it('shows the level placeholder for a valid level', () => {
    renderApp('/w/1/l/3')
    expect(
      screen.getByRole('heading', { level: 1, name: 'This level is being built' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Level 1-3 – ML Quest')
  })
})
