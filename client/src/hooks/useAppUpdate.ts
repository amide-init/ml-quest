import { useSyncExternalStore } from 'react'
import { installUpdate, isUpdateReady, subscribeToUpdates } from '@/platform'

export interface UseAppUpdate {
  /** A new version has downloaded and is waiting for the player. */
  readonly ready: boolean
  /** Switch to it (reloads the page). */
  readonly install: () => void
}

/** Offers a downloaded update (shown on the map only, never mid-level). */
export function useAppUpdate(): UseAppUpdate {
  const ready = useSyncExternalStore(subscribeToUpdates, isUpdateReady)
  return { ready, install: () => void installUpdate() }
}
