/** The service-worker registration (vite-plugin-pwa's `registerSW`), injected for testing. */
export type RegisterServiceWorker = (options: {
  readonly onNeedRefresh?: () => void
}) => (reloadPage?: boolean) => Promise<void>

type Listener = () => void

const listeners = new Set<Listener>()
let updateReady = false
let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null

/**
 * Registers the service worker that makes the game work offline, and records when a new version
 * has downloaded. The update is never applied on its own (ARCHITECTURE §11): the map offers it,
 * so a reload can't interrupt a level. Call once, from main.tsx, in production builds.
 */
export function watchForUpdates(register: RegisterServiceWorker): void {
  applyUpdate = register({
    onNeedRefresh() {
      updateReady = true
      for (const listener of listeners) listener()
    },
  })
}

export const isUpdateReady = (): boolean => updateReady

export function subscribeToUpdates(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Switches to the new version: the waiting service worker takes over and the page reloads. */
export async function installUpdate(): Promise<void> {
  await applyUpdate?.(true)
}
