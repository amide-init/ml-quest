import type { Services } from '@/services'
import { useProgressStore, useSettingsStore } from '@/stores'

/**
 * Loads persisted state into the stores before the first render (so the right theme shows
 * immediately), then keeps the progress store in sync with ProgressService.
 * Returns a cleanup function (used by tests; the app lives for the whole page).
 */
export function hydrateStores(services: Services): () => void {
  useSettingsStore.getState().setSettings(services.settings.getSettings())
  useProgressStore.getState().setProgress(services.progress.getProgress())
  return services.progress.subscribe(() =>
    useProgressStore.getState().setProgress(services.progress.getProgress()),
  )
}
