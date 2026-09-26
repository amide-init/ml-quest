/**
 * Browser adapters: storage availability, PWA updates, haptics, feature detection.
 * See ARCHITECTURE.md §4.
 */
export { getLocalStorage } from './BrowserStorage'
export { copyText } from './Clipboard'
export { playChime } from './Sound'
export { installUpdate, isUpdateReady, subscribeToUpdates, watchForUpdates } from './AppUpdate'
export type { RegisterServiceWorker } from './AppUpdate'
export { registerWithWorkbox } from './ServiceWorker'
