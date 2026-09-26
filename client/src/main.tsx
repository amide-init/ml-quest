import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/unbounded/index.css'
import '@fontsource-variable/atkinson-hyperlegible-next/index.css'
import './index.css'
import { App } from '@/app/App'
import { hydrateStores } from '@/app/Bootstrap'
import { createServices } from '@/app/Container'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found in index.html')
}

const services = createServices()
hydrateStores(services)

createRoot(rootElement).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
)
