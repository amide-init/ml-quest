import type { RegisterServiceWorker } from './AppUpdate'

/**
 * Registers the generated service worker (vite-plugin-pwa writes `sw.js` at the base path) with
 * workbox-window, loaded lazily so it stays out of the first-load bundle. A new version waits
 * until the player asks for it; then the waiting worker takes over and the page reloads.
 */
export const registerWithWorkbox: RegisterServiceWorker = ({ onNeedRefresh }) => {
  const base = import.meta.env.BASE_URL
  const workbox = import('workbox-window').then(({ Workbox }) => {
    const worker = new Workbox(`${base}sw.js`, { scope: base })
    worker.addEventListener('waiting', () => onNeedRefresh?.())
    void worker.register()
    return worker
  })
  return async (reloadPage = true) => {
    const worker = await workbox
    if (reloadPage) {
      worker.addEventListener('controlling', () => window.location.reload())
    }
    worker.messageSkipWaiting()
  }
}
