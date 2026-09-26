import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/unbounded/index.css'
import '@fontsource-variable/atkinson-hyperlegible-next/index.css'
import './index.css'
import { App } from '@/app/App'
import { hydrateStores } from '@/app/Bootstrap'
import { createServices } from '@/app/Container'
import { registerWithWorkbox, watchForUpdates } from '@/platform'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found in index.html')
}

// Development opens every level, drafts included, so a new one can be tried straight away;
// players get the one-by-one unlocks (PRD F1) and only released levels.
const services = createServices({
  storage: 'browser',
  unlocks: import.meta.env.DEV ? 'all' : 'sequential',
  drafts: import.meta.env.DEV,
})
hydrateStores(services)

createRoot(rootElement).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
)

// Offline play: production builds only (dev and tests have no service worker).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  watchForUpdates(registerWithWorkbox)
}
