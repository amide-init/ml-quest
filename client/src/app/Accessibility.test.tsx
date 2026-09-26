import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { hydrateStores } from './Bootstrap'
import { createServices } from './Container'

const cleanups: (() => void)[] = []
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()))

async function renderAt(path: string) {
  window.location.hash = `#${path}`
  const services = createServices({ storage: 'memory', unlocks: 'all' })
  cleanups.push(hydrateStores(services))
  cleanups.push(render(<App services={services} />).unmount)
  await waitFor(() => expect(screen.queryByText('Loading the level…')).not.toBeInTheDocument())
}

/** WCAG 2.1 A/AA rules axe can check without layout. Colour contrast needs a real browser. */
async function violations() {
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  return result.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(' '))
        .join(', ')})`,
  )
}

const LEVELS = [1, 2].flatMap((world) => [1, 2, 3, 4, 5, 6, 7, 8].map((level) => [world, level]))

describe('accessibility (axe, WCAG 2.1 A/AA)', () => {
  for (const path of ['/', '/map', '/codex', '/settings']) {
    it(`${path} has no violations`, async () => {
      await renderAt(path)
      expect(await violations()).toEqual([])
    })
  }

  for (const [world, level] of LEVELS) {
    it(`level ${world}-${level} has no violations while playing, field notes open`, async () => {
      const user = userEvent.setup()
      await renderAt(`/w/${world}/l/${level}`)
      await user.click(screen.getByRole('button', { name: 'Start the level' }))
      await user.click(screen.getByText(/^Field notes:/))
      expect(await violations()).toEqual([])
    })
  }

  it('removes and restores a point with the keyboard alone (Dirty Data)', async () => {
    const user = userEvent.setup()
    await renderAt('/w/1/l/6')
    await user.click(screen.getByRole('button', { name: 'Start the level' }))
    // Each point is a checkbox: checked = kept in the data.
    const point = screen.getAllByRole('checkbox')[0]!
    point.focus()
    expect(point).toHaveAttribute('aria-checked', 'true')

    await user.keyboard(' ')
    expect(point).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(/^Removed 1 of \d+ points$/)).toBeInTheDocument()

    await user.keyboard('{Enter}')
    expect(point).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/^Removed 0 of \d+ points$/)).toBeInTheDocument()
  })
})
